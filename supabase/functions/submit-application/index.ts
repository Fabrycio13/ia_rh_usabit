import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { stripHtml, sanitizeText, validateField, validateUploadedFile } from "../_shared/validation.ts";
import { safeEdgeError } from '../_shared/safe-logger.ts'
import {
  buildApplicationInsert,
  isResumePathForContext,
  normalizeResumeStoragePath,
} from '../_shared/public-contracts.ts'

const ALLOWED_ORIGINS = ['https://rh.usabitspace.com', 'http://localhost:5173', 'http://localhost:4173'];

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': (origin && ALLOWED_ORIGINS.includes(origin)) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

interface ApplicationPayload {
  vaga_id: string
  candidate_name: string
  candidate_email: string
  candidate_phone?: string | null
  candidate_location?: string | null
  candidate_linkedin?: string | null
  candidate_gender?: string | null
  candidate_age?: string | null
  resume_url: string
  resume_file_name: string
  answers?: Record<string, unknown>
}

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000
const TEXT_MAX = 1000
const EMAIL_MAX = 320
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/


serve(async (req) => {
  const origin = req.headers.get("Origin")
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown'

  try {
    const body: ApplicationPayload = await req.json()

    if (!body.vaga_id || !body.candidate_email || !body.candidate_name || !body.resume_url || !body.resume_file_name) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: vaga_id, candidate_email, candidate_name, resume_url, resume_file_name' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!EMAIL_RE.test(body.candidate_email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const errs = [
      validateField('candidate_name', body.candidate_name, TEXT_MAX),
      validateField('candidate_email', body.candidate_email, EMAIL_MAX),
      body.candidate_phone ? validateField('candidate_phone', body.candidate_phone, 50) : null,
      body.candidate_location ? validateField('candidate_location', body.candidate_location, 255) : null,
      body.candidate_linkedin ? validateField('candidate_linkedin', body.candidate_linkedin, 500) : null,
      validateField('resume_file_name', body.resume_file_name, 255),
    ].filter(Boolean)
    if (errs.length > 0) {
      return new Response(JSON.stringify({ error: errs[0] }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    body.candidate_name = sanitizeText(stripHtml(body.candidate_name))
    if (body.candidate_phone) body.candidate_phone = sanitizeText(stripHtml(body.candidate_phone))
    if (body.candidate_location) body.candidate_location = sanitizeText(stripHtml(body.candidate_location))
    if (body.candidate_linkedin) body.candidate_linkedin = sanitizeText(stripHtml(body.candidate_linkedin))
    body.resume_file_name = sanitizeText(stripHtml(body.resume_file_name))

    if (body.answers && JSON.stringify(body.answers).length > 50_000) {
      return new Response(JSON.stringify({ error: 'Respostas excedem o limite permitido' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuração de banco de dados ausente na Função')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    // 1. Rate limit por IP
    const allowed = await checkRateLimit(
      supabaseAdmin,
      `ip:${clientIp}`,
      'submit-application',
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS,
    )
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 429,
      })
    }

    // 2. Validar vaga e derivar organization_id no servidor
    const { data: vaga, error: vagaError } = await supabaseAdmin
      .from('vagas_white_label')
      .select('id, organization_id, status, is_active, is_accepting_applications, custom_questions')
      .eq('id', body.vaga_id)
      .single()

    if (vagaError || !vaga) {
      return new Response(JSON.stringify({ error: 'Vaga não encontrada' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 404,
      })
    }
    if (!vaga.is_active || !['aberta', 'invisivel'].includes(vaga.status)) {
      return new Response(JSON.stringify({ error: 'Vaga não está mais disponível' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    if (vaga.is_accepting_applications === false) {
      return new Response(JSON.stringify({ error: 'Vaga não está aceitando candidaturas no momento' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    // 3. Validar vínculo do path antes de ler o Storage
    const bucket = 'job-applications'
    const path = normalizeResumeStoragePath(body.resume_url)
    if (!path || !isResumePathForContext(path, { jobId: body.vaga_id })) {
      console.error(`[submit-application] Path inválido: resume_url="${body.resume_url}" path="${path}" vaga_id="${body.vaga_id}"`)
      return new Response(JSON.stringify({ error: 'Arquivo não vinculado a esta vaga' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 4. Validar arquivo enviado (magic bytes + tamanho)
    console.log(`[submit-application] Validando arquivo: bucket="${bucket}" path="${path}"`)
    const fileMetaPreCheck = await supabaseAdmin.storage.from(bucket).info(path)
    console.log(`[submit-application] File info:`, JSON.stringify({ exists: !!fileMetaPreCheck.data, metadata: fileMetaPreCheck.data?.metadata }))
    const fileCheck = await validateUploadedFile(supabaseAdmin, bucket, path)
    if (!fileCheck.valid) {
      return new Response(JSON.stringify({ error: fileCheck.error }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 5. Inserir candidatura
    const { data, error } = await supabaseAdmin
      .from('vagas_candidaturas')
      .insert(buildApplicationInsert(
        body as unknown as Record<string, unknown>,
        { id: vaga.id, organization_id: vaga.organization_id },
        Array.isArray(vaga.custom_questions) ? vaga.custom_questions : [],
      ))
      .select('id')
      .single()

    if (error) {
      safeEdgeError('submit-application', 'Erro no insert de candidatura', error)
      return new Response(JSON.stringify({ error: 'Erro ao salvar candidatura' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ id: data.id, success: true }), {
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    safeEdgeError('submit-application', 'Erro não tratado', error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

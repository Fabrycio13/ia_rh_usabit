import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApplicationPayload {
  vaga_id: string
  organization_id: string
  candidate_name: string
  candidate_email: string
  candidate_phone?: string | null
  candidate_location?: string | null
  candidate_linkedin?: string | null
  candidate_gender?: string | null
  candidate_age?: string | null
  resume_url: string
  resume_file_name: string
  match_score?: number
  status?: string
  source?: string
  answers?: Record<string, unknown>
}

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000
const TEXT_MAX = 1000
const EMAIL_MAX = 320
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function stripHtml(v: string): string {
  return v.replace(/<[^>]*>/g, '').trim()
}

function sanitizeText(v: string): string {
  // eslint-disable-next-line no-control-regex
  return v.normalize('NFKC').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u200B-\u200F\uFEFF]/g, '').trim()
}

function validateField(label: string, value: unknown, maxLen: number): string | null {
  if (value == null || String(value).trim() === '') return null
  const s = String(value)
  if (s.length > maxLen) return `Campo '${label}' excede ${maxLen} caracteres`
  return null
}

async function checkRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  key: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs).toISOString()
  const { count } = await supabaseAdmin
    .from('rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('key', key)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart)
  if ((count ?? 0) >= maxRequests) return false
  await supabaseAdmin.from('rate_limits').insert({ key, endpoint })
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown'

  try {
    const body: ApplicationPayload = await req.json()

    if (!body.vaga_id || !body.organization_id || !body.candidate_email || !body.candidate_name) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: vaga_id, organization_id, candidate_email, candidate_name' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!EMAIL_RE.test(body.candidate_email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const errs = [
      validateField('candidate_name', body.candidate_name, TEXT_MAX),
      validateField('candidate_email', body.candidate_email, EMAIL_MAX),
      validateField('candidate_phone', body.candidate_phone, 50),
      validateField('candidate_location', body.candidate_location, 255),
      validateField('candidate_linkedin', body.candidate_linkedin, 500),
    ].filter(Boolean)
    if (errs.length > 0) {
      return new Response(JSON.stringify({ error: errs[0] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    body.candidate_name = sanitizeText(stripHtml(body.candidate_name))
    if (body.candidate_phone) body.candidate_phone = sanitizeText(stripHtml(body.candidate_phone))
    if (body.candidate_location) body.candidate_location = sanitizeText(stripHtml(body.candidate_location))
    if (body.candidate_linkedin) body.candidate_linkedin = sanitizeText(stripHtml(body.candidate_linkedin))

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      })
    }

    // 2. Validar vaga (existe, organization_id bate)
    const { data: vaga, error: vagaError } = await supabaseAdmin
      .from('vagas_white_label')
      .select('id, organization_id, status')
      .eq('id', body.vaga_id)
      .single()

    if (vagaError || !vaga) {
      return new Response(JSON.stringify({ error: 'Vaga não encontrada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }
    if (vaga.organization_id !== body.organization_id) {
      return new Response(JSON.stringify({ error: 'Vaga não pertence à organização' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 3. Inserir candidatura
    const { data, error } = await supabaseAdmin
      .from('vagas_candidaturas')
      .insert({
        vaga_id: body.vaga_id,
        organization_id: body.organization_id,
        candidate_name: body.candidate_name,
        candidate_email: body.candidate_email,
        candidate_phone: body.candidate_phone || null,
        candidate_location: body.candidate_location || null,
        candidate_linkedin: body.candidate_linkedin || null,
        candidate_gender: body.candidate_gender || null,
        candidate_age: body.candidate_age || null,
        resume_url: body.resume_url,
        resume_file_name: body.resume_file_name,
        status: body.status || 'pending',
        match_score: body.match_score || 0,
        source: body.source || 'public_link',
        answers: body.answers || {},
      })
      .select('id')
      .single()

    if (error) {
      console.error('Erro no insert de candidatura:', error.message, error.details, error.hint)
      return new Response(JSON.stringify({ error: 'Erro ao salvar candidatura' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ id: data.id, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro na função submit-application:', (error as Error).message)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

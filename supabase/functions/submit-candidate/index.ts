import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { stripHtml, sanitizeText, validateField } from "../_shared/validation.ts";
import { safeEdgeError } from '../_shared/safe-logger.ts'

const ALLOWED_ORIGINS = ['https://rh.usabitspace.com', 'http://localhost:5173', 'http://localhost:4173'];

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': (origin && ALLOWED_ORIGINS.includes(origin)) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';


interface CandidatePayload {
  email: string
  organization_id: string
  name: string
  phone?: string | null
  location?: string | null
  linkedin?: string | null
  resume_url?: string | null
  resume_file_name?: string | null
  gender?: string | null
  age?: string | number | null
  address?: string | null
  portfolio?: string | null
  cep?: string | null
  address_number?: string | null
  complement?: string | null
  vaga_id?: string | null
  // Campos internos (ignorados do cliente, definidos server-side):
  // status, source, skills, experience, analysis
}

// Campos que o cliente pode enviar — qualquer campo fora desta lista é ignorado
const ALLOWED_FIELDS = new Set([
  'email', 'organization_id', 'name', 'phone', 'location', 'linkedin',
  'resume_url', 'resume_file_name', 'gender', 'age', 'address',
  'portfolio', 'cep', 'address_number', 'complement', 'vaga_id',
])

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
    const body: CandidatePayload = await req.json()

    if (!body.email || !body.organization_id || !body.name) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: email, organization_id, name' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!EMAIL_RE.test(body.email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const errs = [
      validateField('name', body.name, TEXT_MAX),
      validateField('email', body.email, EMAIL_MAX),
      validateField('phone', body.phone, 50),
      validateField('location', body.location, 255),
      validateField('linkedin', body.linkedin, 500),
    ].filter(Boolean)
    if (errs.length > 0) {
      return new Response(JSON.stringify({ error: errs[0] }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    body.name = sanitizeText(stripHtml(body.name))
    if (body.phone) body.phone = sanitizeText(stripHtml(body.phone))
    if (body.location) body.location = sanitizeText(stripHtml(body.location))
    if (body.linkedin) body.linkedin = sanitizeText(stripHtml(body.linkedin))

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
      'submit-candidate',
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS,
    )
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 429,
      })
    }

    // 2. Validar que a organização existe
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('id', body.organization_id)
      .maybeSingle();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organização não encontrada' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // 3. Se informou vaga_id, validar que ela existe e pertence à org
    if (body.vaga_id) {
      const { data: vaga, error: vagaError } = await supabaseAdmin
        .from('vagas_white_label')
        .select('id, organization_id, is_active, status')
        .eq('id', body.vaga_id)
        .single();

      if (vagaError || !vaga) {
        return new Response(JSON.stringify({ error: 'Vaga não encontrada' }), {
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
          status: 404,
        })
      }
      if (!vaga.is_active || vaga.status !== 'aberta') {
        return new Response(JSON.stringify({ error: 'Vaga não está mais disponível' }), {
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      if (vaga.organization_id !== body.organization_id) {
        return new Response(JSON.stringify({ error: 'Vaga não pertence à organização' }), {
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    }

    // 4. Insert na candidatura do Pool (vagas_candidaturas com vaga_id NULL se sponsored)
    //    Usa apenas campos da allowlist — campos internos são setados server-side
    const candidaturaData: Record<string, unknown> = {
      vaga_id: body.vaga_id || null,
      organization_id: body.organization_id,
      candidate_name: body.name,
      candidate_email: body.email,
      candidate_phone: body.phone || null,
      candidate_location: body.location || null,
      candidate_linkedin: body.linkedin || null,
      resume_url: body.resume_url || null,
      resume_file_name: body.resume_file_name || null,
      candidate_gender: body.gender || null,
      candidate_age: body.age != null ? String(body.age) : null,
      address: body.address || null,
      portfolio: body.portfolio || null,
      cep: body.cep || null,
      address_number: body.address_number || null,
      complement: body.complement || null,
      // Campos internos (definidos server-side, ignorados do cliente)
      status: 'pending',
      source: 'spontaneous',
      skills: null,
      experience: null,
      analysis: null,
    };

    const { data, error } = await supabaseAdmin
      .from('vagas_candidaturas')
      .insert(candidaturaData)
      .select('id')
      .single()

    if (error) {
      safeEdgeError('Erro no upsert de candidato:', error)
      return new Response(JSON.stringify({ error: 'Erro ao salvar candidato' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // 5. Enviar email de confirmação (best-effort, não bloqueia)
    const candidateFirstName = body.name.split(' ')[0];
    sendConfirmationEmail(candidateFirstName, body.email);

    return new Response(JSON.stringify({ id: data.id, success: true }), {
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    safeEdgeError('Erro na função submit-candidate:', (error as Error).message)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// ─── Helpers (server-side, nunca expostos ao frontend) ─────────────────────

// ponytail: fire-and-forget, sem await — usuário já recebeu 200
function sendConfirmationEmail(firstName: string, email: string) {
  if (!RESEND_API_KEY) return;
  // ponytail: busca nome da org mas nao espera
  const subject = 'Currículo recebido com sucesso!';
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#04070c;font-family:Inter,sans-serif;color:#fff"><div style="max-width:600px;margin:0 auto;background:#0b111a;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:40px 24px;text-align:left"><h2 style="color:#2C58FD;font-family:'Space Grotesk',sans-serif;font-size:26px;margin:0 0 16px">Olá, ${firstName}!</h2><p style="font-size:17px;line-height:1.6;color:#94a3b8;margin:0 0 24px">Recebemos seu currículo com sucesso! Seu perfil foi incluído em nosso Banco de Talentos e poderá ser considerado para futuras oportunidades.</p><p style="font-size:14px;color:#64748b;margin:0">Atenciosamente,<br><strong style="color:#fff">Usabit people</strong></p></div></body></html>`;

  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: 'Usabit people <noreply@space.pro.br>', to: [email], subject, html }),
  }).catch(() => {}); // ponytail: falha silenciosa, candidato já está no banco
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  status?: string
  source?: string | null
  skills?: string | null
  experience?: string | null
  analysis?: Record<string, unknown> | null
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
  return v.normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\uFEFF]/g, '').trim()
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
    const body: CandidatePayload = await req.json()

    if (!body.email || !body.organization_id || !body.name) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: email, organization_id, name' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!EMAIL_RE.test(body.email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const errs = [
      validateField('name', body.name, TEXT_MAX),
      validateField('email', body.email, EMAIL_MAX),
      validateField('phone', body.phone, 50),
      validateField('location', body.location, 255),
      validateField('linkedin', body.linkedin, 500),
      validateField('skills', body.skills, TEXT_MAX),
      validateField('experience', body.experience, TEXT_MAX),
    ].filter(Boolean)
    if (errs.length > 0) {
      return new Response(JSON.stringify({ error: errs[0] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    body.name = sanitizeText(stripHtml(body.name))
    if (body.phone) body.phone = sanitizeText(stripHtml(body.phone))
    if (body.location) body.location = sanitizeText(stripHtml(body.location))
    if (body.linkedin) body.linkedin = sanitizeText(stripHtml(body.linkedin))
    if (body.skills) body.skills = sanitizeText(stripHtml(body.skills))
    if (body.experience) body.experience = sanitizeText(stripHtml(body.experience))

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      })
    }

    // 2. Upsert do candidato
    const { data, error } = await supabaseAdmin
      .from('candidates')
      .upsert({
        email: body.email,
        organization_id: body.organization_id,
        name: body.name,
        phone: body.phone || null,
        location: body.location || null,
        linkedin: body.linkedin || null,
        resume_url: body.resume_url || null,
        resume_file_name: body.resume_file_name || null,
        gender: body.gender || null,
        age: body.age != null ? String(body.age) : null,
        address: body.address || null,
        portfolio: body.portfolio || null,
        cep: body.cep || null,
        address_number: body.address_number || null,
        complement: body.complement || null,
        vaga_id: body.vaga_id || null,
        status: body.status || 'pending',
        source: body.source || null,
        skills: body.skills || null,
        experience: body.experience || null,
        analysis: body.analysis || null,
      }, { onConflict: 'email,organization_id' })
      .select('id')
      .single()

    if (error) {
      console.error('Erro no upsert de candidato:', error.message, error.details, error.hint)
      return new Response(JSON.stringify({ error: 'Erro ao salvar candidato' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ id: data.id, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro na função submit-candidate:', (error as Error).message)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

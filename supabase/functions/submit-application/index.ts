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
  turnstileToken?: string
}

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) {
    console.error('[submit-application] TURNSTILE_SECRET_KEY não configurado')
    return false
  }
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    })
    const data = await res.json()
    return data.success === true
  } catch (err) {
    console.error('[submit-application] Erro ao verificar Turnstile:', err)
    return false
  }
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuração de banco de dados ausente na Função')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    // 1. Validar Turnstile
    if (!body.turnstileToken) {
      return new Response(JSON.stringify({ error: 'Verificação de segurança ausente' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }
    const turnstileOk = await verifyTurnstile(body.turnstileToken, clientIp)
    if (!turnstileOk) {
      return new Response(JSON.stringify({ error: 'Verificação de segurança falhou' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // 2. Rate limit por IP
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

    // 3. Validar vaga (existe, organization_id bate)
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

    // 4. Inserir candidatura
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
      return new Response(JSON.stringify({ error: error.message, details: error.details }), {
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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

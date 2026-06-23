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
    console.error('Erro na função submit-candidate:', (error as Error).message)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

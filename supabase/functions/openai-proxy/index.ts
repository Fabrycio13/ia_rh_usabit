import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_ROLES = ['rh', 'gestor', 'owner']
const RATE_LIMIT_MAX = 60
const RATE_LIMIT_WINDOW_MS = 60_000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Método não permitido' })
  }

  // 1. Validar JWT
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return jsonResponse(401, { error: 'Token não fornecido' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) {
    return jsonResponse(401, { error: 'Token inválido' })
  }

  // 2. Verificar role
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (!profile || !ALLOWED_ROLES.includes(profile.user_role)) {
    return jsonResponse(403, { error: 'Permissão insuficiente' })
  }

  // 3. Rate limit por usuário
  const allowed = await checkRateLimit(
    supabaseAdmin,
    `user:${user.id}`,
    'openai-proxy',
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
  )
  if (!allowed) {
    return jsonResponse(429, { error: 'Muitas requisições. Tente novamente em 1 minuto.' })
  }

  // 4. Processar requisição OpenAI
  let body: {
    messages?: unknown
    model?: string
    max_tokens?: number
    tools?: unknown
    tool_choice?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { error: 'Body JSON inválido' })
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return jsonResponse(400, { error: 'Campo "messages" é obrigatório e deve ser um array' })
  }

  const { messages, model = 'gpt-4o', max_tokens = 8192, tools, tool_choice } = body
  const openaiBody: Record<string, unknown> = { model, messages, max_tokens }
  if (tools) openaiBody.tools = tools
  if (tool_choice) openaiBody.tool_choice = tool_choice

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(openaiBody),
  })

  const data = await response.json()

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

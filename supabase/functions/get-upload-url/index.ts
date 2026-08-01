import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { safeEdgeError } from '../_shared/safe-logger.ts'

const ALLOWED_ORIGINS = ['https://rh.usabitspace.com', 'http://localhost:5173', 'http://localhost:4173'];
const ALLOWED_BUCKET = 'job-applications'
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': (origin && ALLOWED_ORIGINS.includes(origin)) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

serve(async (req) => {
  const origin = req.headers.get('Origin')

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error('Configuração de banco de dados ausente na Função')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const allowed = await checkRateLimit(
      supabaseAdmin,
      `ip:${clientIp}`,
      'get-upload-url',
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS,
    )
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 429,
      })
    }

    const body: { bucket?: unknown; jobId?: unknown; orgId?: unknown } = await req.json()
    const bucket = typeof body.bucket === 'string' ? body.bucket : ALLOWED_BUCKET

    if (bucket !== ALLOWED_BUCKET) {
      return new Response(JSON.stringify({ error: 'Bucket não permitido' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const jobId = typeof body.jobId === 'string' ? body.jobId : null
    const orgId = typeof body.orgId === 'string' ? body.orgId : null

    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    let callerUserId: string | null = null
    let callerOrgId: string | null = null

    if (token) {
      const supabaseUser = createClient(supabaseUrl, anonKey)
      const { data: { user } } = await supabaseUser.auth.getUser(token)

      if (user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .eq('status', 'active')
          .maybeSingle()

        if (!profile) {
          return new Response(JSON.stringify({ error: 'Conta desativada' }), {
            headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
            status: 403,
          })
        }

        callerUserId = user.id
        callerOrgId = profile.organization_id
      }
    }

    let filePath: string
    const uniqueSuffix = `${Date.now()}_${crypto.randomUUID()}.pdf`

    // jobId e orgId são EXPLÍCITOS do caller — sempre têm prioridade sobre
    // o path de usuário autenticado, que é fallback para uploads internos.
    if (jobId) {
      const { data: job } = await supabaseAdmin
        .from('vagas_white_label')
        .select('id')
        .eq('id', jobId)
        .eq('is_active', true)
        .eq('is_accepting_applications', true)
        .in('status', ['aberta', 'invisivel'])
        .maybeSingle()

      if (!job) {
        return new Response(JSON.stringify({ error: 'Vaga não encontrada ou indisponível' }), {
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      filePath = `resumes/${jobId}/${uniqueSuffix}`
    } else if (orgId) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('id', orgId)
        .maybeSingle()

      if (!org) {
        return new Response(JSON.stringify({ error: 'Organização não encontrada' }), {
          headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      filePath = `resumes/spontaneous/${orgId}/${uniqueSuffix}`
    } else if (callerUserId) {
      const scope = callerOrgId || `internal/${callerUserId}`
      filePath = `resumes/${scope}/${uniqueSuffix}`
    } else {
      return new Response(JSON.stringify({ error: 'Informe jobId ou orgId, ou faça autenticação' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { data, error } = await supabaseAdmin.storage
      .from(ALLOWED_BUCKET)
      .createSignedUploadUrl(filePath, { upsert: false })

    if (error) {
      safeEdgeError('get-upload-url', 'Erro ao gerar signed upload URL', error)
      return new Response(JSON.stringify({ error: 'Erro ao gerar URL de upload' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ signedUrl: data.signedUrl, path: filePath }), {
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    safeEdgeError('get-upload-url', 'Erro não tratado', error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { safeEdgeError } from '../_shared/safe-logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_BUCKET = 'job-applications'
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuração de banco de dados ausente na Função')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    // Rate limit por IP
    const allowed = await checkRateLimit(supabaseAdmin, `ip:${clientIp}`, 'get-upload-url', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      })
    }

    const body = await req.json()
    const bucket = body.bucket || ALLOWED_BUCKET

    // Validar bucket
    if (bucket !== ALLOWED_BUCKET) {
      return new Response(JSON.stringify({ error: 'Bucket não permitido' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Gerar path no servidor — NUNCA aceitar path livre do cliente
    let filePath: string

    // Tentar extrair caller de requests autenticados
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    let callerOrgId: string | null = null

    if (token && token !== 'undefined') {
      const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '')
      const { data: { user } } = await supabaseUser.auth.getUser(token)
      if (user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .eq('status', 'active')
          .single()
        if (!profile) {
          return new Response(JSON.stringify({ error: 'Conta desativada' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          })
        }
        if (profile.organization_id) {
          callerOrgId = profile.organization_id
        }
      }
    }

    if (callerOrgId) {
      // Fluxo autenticado: path scoped pela org do caller
      const uuid = crypto.randomUUID().substring(0, 12)
      filePath = `resumes/${callerOrgId}/${Date.now()}_${uuid}.pdf`
    } else if (body.jobId) {
      // Fluxo público: candidatura a uma vaga específica
      const { data: job } = await supabaseAdmin
        .from('vagas_white_label')
        .select('id')
        .eq('id', body.jobId)
        .maybeSingle()

      if (!job) {
        return new Response(JSON.stringify({ error: 'Vaga não encontrada' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      filePath = `resumes/${body.jobId}/${Date.now()}_secure.pdf`
    } else if (body.orgId) {
      // Fluxo público: candidatura espontânea para uma organização
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('id', body.orgId)
        .maybeSingle()

      if (!org) {
        return new Response(JSON.stringify({ error: 'Organização não encontrada' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      filePath = `resumes/spontaneous/${body.orgId}/${Date.now()}_secure.pdf`
    } else {
      return new Response(JSON.stringify({ error: 'Informe jobId (público) ou faça autenticação' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Gerar signed upload URL (5 min de expiração para uploads grandes)
    const { data, error } = await supabaseAdmin.storage
      .from(ALLOWED_BUCKET)
      .createSignedUploadUrl(filePath, { upsert: false })

    if (error) {
      safeEdgeError('get-upload-url', 'Erro ao gerar signed upload URL:', error.message)
      return new Response(JSON.stringify({ error: 'Erro ao gerar URL de upload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ signedUrl: data.signedUrl, path: filePath }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    safeEdgeError('get-upload-url', 'Erro inesperado:', (err as Error).message)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const body: { bucket: string; path: string } = await req.json()

    if (!body.bucket || !body.path) {
      return new Response(JSON.stringify({ error: 'bucket e path são obrigatórios' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (body.bucket !== ALLOWED_BUCKET) {
      return new Response(JSON.stringify({ error: 'Bucket não permitido' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Anti path traversal + formato esperado: resumes/<...>/<timestamp>_secure.pdf
    if (!body.path.startsWith('resumes/') || body.path.includes('..')) {
      return new Response(JSON.stringify({ error: 'Formato de path inválido' }), {
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

    // Rate limit por IP
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
    const { count } = await supabaseAdmin
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('key', `ip:${clientIp}`)
      .eq('endpoint', 'get-upload-url')
      .gte('window_start', windowStart)

    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      })
    }

    await supabaseAdmin.from('rate_limits').insert({
      key: `ip:${clientIp}`,
      endpoint: 'get-upload-url',
    })

    // Gerar signed upload URL (60s de expiração)
    const { data, error } = await supabaseAdmin.storage
      .from(ALLOWED_BUCKET)
      .createSignedUploadUrl(body.path)

    if (error) {
      console.error('Erro ao gerar signed upload URL:', error.message)
      return new Response(JSON.stringify({ error: 'Erro ao gerar URL de upload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ signedUrl: data.signedUrl, path: body.path }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error('Erro inesperado na função get-upload-url:', (err as Error).message)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

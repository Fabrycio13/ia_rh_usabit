import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { checkRateLimit } from '../_shared/rate-limit.ts';
import { safeEdgeError } from '../_shared/safe-logger.ts'

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

const ALLOWED_ORIGINS = ['https://usabit.github.io', 'http://localhost:5173', 'http://localhost:4173'];

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': (origin && ALLOWED_ORIGINS.includes(origin)) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  // Lidar com requisições OPTIONS (CORS Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) })
  }

  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId');

    if (!orgId) {
      return new Response(JSON.stringify({ error: 'Parâmetro orgId é obrigatório' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Usamos a SUPABASE_SERVICE_ROLE_KEY para que a API consiga ler os dados (bypassando o RLS de usuários anônimos)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''; // Chave de Servidor Administrador

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuração de banco de dados ausente na Função');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Rate limit por IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('cf-connecting-ip')
      || 'unknown';
    const allowed = await checkRateLimit(supabaseAdmin, `ip:${clientIp}`, 'public-jobs', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }), {
        status: 429, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // 1. Busca detalhes visuais e config da Organização
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name, logo_url, cover_image_url, primary_color, about_text, font_family, font_color, logo_scale, cover_fit, background_fit, header_padding, page_background_url')
      .eq('id', orgId)
      .single();

    if (orgError || !orgData) {
      return new Response(JSON.stringify({ error: 'Organização não encontrada ou sem acesso.' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 404
      });
    }

    // 2. Busca Vagas abertas (is_active = true AND status = 'aberta')
    const { data: vagasData, error: vagasError } = await supabaseAdmin
      .from('vagas_white_label')
      .select('id, title, public_hash, has_salary_range, salary_min, salary_max, contract_type, work_regime, is_pcd, has_location, location, work_model, created_at, category, company_name')
      .eq('organization_id', orgId)
      .eq('status', 'aberta')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (vagasError) {
      throw vagasError;
    }

    // Montar a resposta
    const responsePayload = {
      orgInfo: orgData,
      vagas: vagasData || []
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    safeEdgeError('Erro na API public-jobs:', error.message);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar vagas' }), {
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      status: 500
    });
  }
})

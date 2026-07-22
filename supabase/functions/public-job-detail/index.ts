import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { checkRateLimit } from '../_shared/rate-limit.ts';

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

const ALLOWED_ORIGINS = ['https://rh.usabitspace.com', 'http://localhost:5173', 'http://localhost:4173'];

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': (origin && ALLOWED_ORIGINS.includes(origin)) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  // Tratar requisições OPTIONS (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) })
  }

  try {
    const url = new URL(req.url);
    const hash = url.searchParams.get('hash');

    if (!hash) {
      return new Response(JSON.stringify({ error: 'Parâmetro hash é obrigatório' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''; // Ignora RLS para leitura pública

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuração de banco de dados ausente na Função');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Rate limit por IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('cf-connecting-ip')
      || 'unknown';
    const allowed = await checkRateLimit(supabaseAdmin, `ip:${clientIp}`, 'public-job-detail', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }), {
        status: 429, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // AUDITORIA DE SEGURANÇA: Nunca usar select('*') com a Service Role Key em uma API pública.
    // Selecionamos de forma estrita apenas os dados visíveis da Vaga para evitar vazar anotações internas do RH ou orçamentos.
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('vagas_white_label')
      .select('id, organization_id, title, public_hash, description, responsibilities, requirements, differentials, additional_info, has_salary_range, salary_min, salary_max, contract_type, work_regime, is_pcd, has_location, location, work_model, created_at, category, company_name, company_logo, show_company_name, application_deadline, vaga_primary_color, vaga_gradient_end, vaga_bg_color, vaga_bg_image, is_accepting_applications, custom_questions')
      .eq('public_hash', hash)
      .eq('is_active', true)
      // PROTEÇÃO IDOR (Broken Object Level Authorization) APLICADA PELO PEN-TESTER:
      // Garante que vagas marcadas como "Invisível" (Invisível) ou "Aberta" sejam acessíveis
      // via link direto, mas outras (Pausada, Fechada, Cancelada) permaneçam 404.
      .in('status', ['aberta', 'invisivel'])
      .single();

    if (jobError || !jobData) {
      return new Response(JSON.stringify({ error: 'Vaga não encontrada, pausada ou inválida.' }), {
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
        status: 404
      });
    }

    // Retorna todos os dados para montar a View gigante da vaga
    return new Response(JSON.stringify({ job: jobData }), {
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Erro na API public-job-detail:', error.message);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar a requisição' }), {
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      status: 500
    });
  }
})

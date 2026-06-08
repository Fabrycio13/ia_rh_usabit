import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://usabit.github.io/rh-ia-v2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function gotrueHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
  };
}

function baseUrl() {
  return SUPABASE_URL!.replace(/\/+$/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, name, role } = await req.json();

    if (!email || !name || !role) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!SUPABASE_URL) return new Response(JSON.stringify({ error: 'SUPABASE_URL not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!SUPABASE_SERVICE_ROLE_KEY) return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const redirectTo = APP_URL + '/#/set-password';
    const headers = gotrueHeaders();

    // Step 1: Create user with random password + auto-confirm
    const randomPassword = crypto.randomUUID() + 'Aa1!';
    const createRes = await fetch(baseUrl() + '/auth/v1/admin/users', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password: randomPassword, email_confirm: true, user_metadata: { full_name: name, user_role: role } }),
    });
    const createJson = await createRes.json();

    if (!createRes.ok && createJson?.error_code !== 'email_exists') {
      return new Response(JSON.stringify({ error: 'Create user error', code: createJson?.error_code || createRes.status, body: createJson }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 2: Generate recovery link (action_link is at ROOT level, not properties)
    const linkRes = await fetch(baseUrl() + '/auth/v1/admin/generate_link', {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'recovery', email, redirect_to: redirectTo }),
    });
    const linkJson = await linkRes.json();

    if (!linkRes.ok) {
      return new Response(JSON.stringify({ error: 'Generate link error', code: linkJson?.error_code || linkRes.status, body: linkJson }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const actionLink = linkJson?.action_link || '';
    const userId = linkJson?.id || createJson?.id;

    if (!actionLink) {
      return new Response(JSON.stringify({ error: 'No action_link in response', keys: Object.keys(linkJson) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: 'No userId' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 3: Send email via Resend
    if (RESEND_API_KEY) {
      const html = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2>Convite de Acesso - ${name}</h2>
          <p>Você foi convidado para a plataforma de RH.</p>
          <p>Clique no link abaixo para criar sua senha:</p>
          <a href="${actionLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">Criar minha senha</a>
          <p style="color:#666;font-size:14px">Ou faça login com Google/GitHub.</p>
        </div>
      `;
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({ from: 'Equipe de Talentos Usabit <noreply@space.pro.br>', to: [email], subject: `Convite de Acesso - ${name}`, html }),
      });
      if (!emailRes.ok) {
        const err = await emailRes.json();
        return new Response(JSON.stringify({ error: 'Resend error', details: err, userId, link: actionLink }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ success: true, userId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

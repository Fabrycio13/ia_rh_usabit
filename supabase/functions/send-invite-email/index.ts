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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, name, role } = await req.json();

    if (!email || !name || !role) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!SUPABASE_URL) {
      return new Response(JSON.stringify({ error: 'SUPABASE_URL not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const redirectTo = APP_URL + '/#/set-password';

    // DEBUG: Return full GoTrue responses for both calls
    const gotrueUrl = SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/admin/generate_link';
    const headers = gotrueHeaders();

    const inviteRes = await fetch(gotrueUrl, { method: 'POST', headers, body: JSON.stringify({ type: 'invite', email, data: { full_name: name, user_role: role }, redirect_to: redirectTo }) });
    const inviteJson = await inviteRes.json();

    const recoveryRes = await fetch(gotrueUrl, { method: 'POST', headers, body: JSON.stringify({ type: 'recovery', email, redirect_to: redirectTo }) });
    const recoveryJson = await recoveryRes.json();

    return new Response(JSON.stringify({
      invite: { status: inviteRes.status, body: inviteJson },
      recovery: { status: recoveryRes.status, body: recoveryJson },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Step 3: Send email via Resend
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: true, userId, link: actionLink, warning: 'No Resend key' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Convite de Acesso - ${name}</h2>
        <p>Você foi convidado para a plataforma de RH.</p>
        <p>Clique no link abaixo para criar sua senha e acessar o sistema:</p>
        <a href="${actionLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">Criar minha senha</a>
        <p style="color: #666; font-size: 14px;">Ou, se preferir, faça login com Google/GitHub após criar sua conta.</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">Se você não esperava este convite, ignore este email.</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Equipe de Talentos Usabit <noreply@space.pro.br>',
        to: [email],
        subject: `Convite de Acesso - ${name}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return new Response(JSON.stringify({ error: 'Resend error', details: err, userId: userId, link: actionLink }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, userId: userId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

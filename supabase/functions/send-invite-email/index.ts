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

    const redirectTo = APP_URL;
    const headers = gotrueHeaders();

    // Step 1: Don't create user — let generateLink do it via invite
    // invite creates user auto-confirmed + returns action_link at root level

    // Step 2: Generate invite link
    const linkRes = await fetch(baseUrl() + '/auth/v1/admin/generate_link', {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'invite', email, data: { full_name: name, user_role: role }, redirect_to: redirectTo }),
    });
    const linkJson = await linkRes.json();

    if (!linkRes.ok) {
      return new Response(JSON.stringify({ error: 'Generate link error', code: linkJson?.error_code || linkRes.status, body: linkJson }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const actionLink = linkJson?.action_link || '';
    const userId = linkJson?.id;

    if (!actionLink) {
      return new Response(JSON.stringify({ error: 'No action_link in response', keys: Object.keys(linkJson) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: 'No userId' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 3: Send email via Resend
    if (RESEND_API_KEY) {
      const html = `
        <div style="background:#0f111a;padding:40px 20px;font-family:'Segoe UI',system-ui,sans-serif">
          <div style="max-width:480px;margin:0 auto;background:#1a1d27;border-radius:16px;overflow:hidden;border:1px solid rgba(59,130,246,0.15)">
            <div style="background:linear-gradient(135deg,#3b82f6,#2563eb);padding:32px;text-align:center">
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">RH - Usabit</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">Plataforma de Talentos</p>
            </div>
            <div style="padding:32px">
              <h2 style="margin:0 0 8px;color:#fff;font-size:20px">Olá, ${name}!</h2>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6">
                Você foi convidado para fazer parte da plataforma de RH da Usabit.
                Clique no botão abaixo para criar sua senha e acessar o sistema.
              </p>
              <div style="text-align:center;margin:0 0 24px">
                <a href="${actionLink}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600">ACEITAR CONVITE</a>
              </div>
              <p style="margin:0 0 8px;color:#64748b;font-size:13px">Ou se preferir, faça login com Google/GitHub após criar sua conta.</p>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0" />
              <p style="margin:0;color:#64748b;font-size:12px">Se você não esperava este convite, ignore este email.</p>
            </div>
          </div>
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

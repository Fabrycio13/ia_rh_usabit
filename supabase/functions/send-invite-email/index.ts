import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://usabit.github.io/rh-ia-v2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Step 1: Call GoTrue API to generate invite link
    const gotrueUrl = SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/admin/generate_link';
    const linkRes = await fetch(gotrueUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ type: 'invite', email, redirect_to: APP_URL }),
    });

    if (!linkRes.ok) {
      const body = await linkRes.text();
      return new Response(JSON.stringify({ error: 'GoTrue error', status: linkRes.status, body }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const linkJson = await linkRes.json();
    const actionUrl = linkJson?.properties?.action_link || linkJson?.properties?.url || '';
    if (!actionUrl) {
      return new Response(JSON.stringify({ error: 'No link', data: linkJson }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 2: Send email via Resend
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'No Resend key', linkGenerated: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const html = `<a href="${actionUrl}">Definir Minha Senha</a>`;

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
      return new Response(JSON.stringify({ error: 'Resend error', details: err, linkGenerated: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

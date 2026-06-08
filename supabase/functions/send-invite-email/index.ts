import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://usabit.github.io/rh-ia-v2';

const LOGO_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAHEAAAAgCAYAAAAlrJeCAAAACXBIWXMAAAsTAAALEwEAmpwYAAAHBElEQVR4nO1beaydQxS/RbW09l1iT+xSjYgillhCIqUaiSWKaGjUWpSGoEGiQkrUVkKJEBo7KapUirak1KuotZWmWqrbffeb3znndnkj597vvXd778z3zXfvfa/62kkm949v5pwz5zdn5ixzc7ktLQesOb4gckRXqsKY4kBApgFcMCSLDfF4a22/LepvloJJ7gCJNZAZEfPpzVZsFEV7gWS58qjqzzebV25zBxFxN8STW1tbd2sW/YjocgeA1oAja+1WzeKzWTdDMrpGwSSLrbV9mkOfrvCAyNbabVxziGi/ZvDebC0RcbfW9m8GfSLa34BN7Ubh9xJkmm1IZhEVL7HW9mqGHD26mS4GURsgg0Hydwd9yGfGmH0SZJrdabEyoyByeLNk6ZHNdAOI2qy1W4vIoVEU7RkgUweIZdC5AMiQZsrT4+9EkNjl1u6wEWXaEMRS55aNJc//vpktIGZrq1fbnQGcEDGfRUSnFUSO9Hlooc1a20/vDCI6JaZ7IjMfEuq++0BcYe2O1Q4KIBcBfK06HER0krW2dyOyN8USDWRBTSd5IoDJU465X7rG6kIBvgHEPxhwm8PVhoF8AfCNhUJhj5BFWmu3B+RmQD434DUeF96UsyQyKukeMiS3J4EYRcWjS3QcY0C80pBMyOftron6AktNJ3m647vha0AysaIvc/GqGjPRkDyZ8yz+9TQlGuI3a+fJoupxAPYF8Vy3AtyKNyT3pAXPhmRJKE2U6RZ147k2SRKIRHSqbrIAHv8mZXs8czoyNqrzLOupjDW7FERr7bYg/jGzcJDpLp4aLwE8rp7FonM35w3z8BAQNacKcGuWDUhEJ/coEAEeUZeiwY+6ecqYxgCUTlmJrkwDUa+H7EqVha7E9qYLIvEUB+21CoZWDZj5oNJxRTLGQGa2jyEqXlqjBGCQzvXIC0BeVgsDZKgCBPADIP7Ov1HkljQQK+ivA2QSIBeqvBEVL9NsS8ImHJsVRIAfAvGc9u7M8ICpckx5nMzsakuc71DeS16apjgAJB9pQOxQwsduRfA8Zj7YT1POawREVVzEfIaTNvNwp6NGsqTa404DsSHvtIst0WEJPCVrLjCKikd5lLDCGLN30tx83u7SkCWCRybqAfyaa1418JsuiJBXnPSJ32oVOSwX2CKS2zxAjEqbGwKij76B/JkWw2pM6l6j3N0jQIyYz0w4ptaXHAfw9Wm5REP8vmN+W0hMmW8ARIAfCcmHlu+qGvne6BEgxsI84z2qOvmt1WPWGD7XLWNtnGkgf6TJ2Bmn1gtiWMIZ4J8dc6dtCiC+HQKipr4MyX2+rIpj8Z9U33NaoHXwcmaHqpum9eoFMbT849xkxN92G4gu5erzhFTBIVNDQGxv6kFqOs/z1qSazoLK5xFK1zFmRpqM2gC5oF4Q05ymJPkA+bT7LNGVkYBMTRecf80C4oZ5VBkM8KuuWKhChheSj1P+LY2XNoAfrBfEVavsTrmUppvNFWbo+rrPEkn+cgyekyR4oVDYvRQA1wFijQLK1uk60qFJ7rKM/K7j+/o0x8aW03TzuxJErWiEeM51gDjLgcs892BnaonzSa41IDd5jsFMIFbQm+Sip/dZvKA7nfxIRqfQHZJg6R0gEsmt9YBord1Oj36nbKY4oBEQNX/s0O/vvsEvehY5NMHb+ycURA0zDPPVSbU9gO/3KGKgfjemeKxbRm6NouIxvjvYJ2coiER0gE9ma21fQ/yOe3PxNzVrzGyJtWk9vX6c9UtDNMzDYJkWWTdUNgYB/ItPMdUg6nEHkqWxdbcY5qu0KOxItS11HZca43WMg3zt5st5tci4CNxHn/rFtcuVXgADQYzLYhOM4XO0IKyyM/OBcW72pwTa5zcKohYBXHO0DOe7mCUBmIWqQP1NVEoViKX...';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, name, role, createdBy } = await req.json();

    if (!email || !name || !role || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Supabase env vars not set', url: !!SUPABASE_URL, key: !!SUPABASE_SERVICE_ROLE_KEY }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gotrueUrl = SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1/admin/generate_link';
    const linkRes = await fetch(gotrueUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        type: 'invite',
        email,
        redirect_to: APP_URL,
      }),
    });

    if (!linkRes.ok) {
      const body = await linkRes.text();
      console.error('[send-invite-email] GoTrue error:', linkRes.status, body);
      return new Response(
        JSON.stringify({ error: 'GoTrue error', status: linkRes.status, body }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const linkJson = await linkRes.json();
    const actionUrl = linkJson?.properties?.action_link || linkJson?.properties?.url;
    if (!actionUrl) {
      console.error('[send-invite-email] No link:', JSON.stringify(linkJson));
      return new Response(
        JSON.stringify({ error: 'No link', data: linkJson }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roleLabels: Record<string, string> = {
      admin: 'Administrador', rh: 'RH', gestor: 'Gestor', convidado: 'Convidado',
    };
    const roleLabel = roleLabels[role] || role;

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Convite de Acesso</title></head>
<body style="margin:0;padding:0;background:#04070c;font-family:Inter,sans-serif;color:#fff;">
<div style="background:#04070c;padding:32px 16px;text-align:center;min-height:100%">
<div style="max-width:600px;margin:0 auto;background:#0b111a;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:40px 24px;text-align:left">
<div style="text-align:center;margin-bottom:32px">
<img src="cid:logo" alt="Usabit" style="height:32px;width:auto;display:block;margin:0 auto" /></div>
<div style="background:linear-gradient(135deg,rgba(44,88,253,.15),transparent);border-radius:20px;padding:2px;margin-bottom:32px">
<div style="background:#0b111a;border-radius:18px;padding:32px">
<h2 style="color:#2C58FD;font-size:26px;margin:0 0 16px">Ol\u00e1, ${name}!</h2>
<p style="font-size:17px;line-height:1.6;color:#fff;margin:0">Voc\u00ea foi convidado(a) a fazer parte da plataforma de recrutamento com Intelig\u00eancia Artificial.</p>
</div></div>
<div style="color:#94a3b8;font-size:16px;line-height:1.7;margin-bottom:40px">
<div style="display:inline-block;padding:6px 16px;border-radius:20px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);margin-bottom:28px">
<span style="font-size:12px;font-weight:600;text-transform:uppercase;color:#22c55e">Perfil: </span>
<span style="font-size:15px;font-weight:700;color:#fff">${roleLabel}</span></div>
<p style="margin:0 0 24px">Para come\u00e7ar, clique no bot\u00e3o abaixo e defina sua senha:</p>
<div style="text-align:center;margin:32px 0">
<a href="${actionUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#fff;text-decoration:none;border-radius:12px;background:#2C58FD">Definir Minha Senha</a></div>
<p style="margin:0;font-size:14px;color:#64748b">Convite enviado a pedido de <strong style="color:#94a3b8">${createdBy || 'um administrador'}</strong>.</p>
<p style="margin:16px 0 0;font-size:14px;color:#64748b">Se n\u00e3o esperava, ignore este email.</p></div>
<div style="margin-top:48px;padding-top:32px;border-top:1px solid rgba(255,255,255,.1);text-align:center">
<p style="font-size:14px;color:#64748b;margin:0 0 4px;text-transform:uppercase">Atenciosamente,</p>
<p style="font-size:18px;font-weight:700;color:#fff;margin:0">Equipe de Talentos<br/><span style="color:#2C58FD">Usabit</span></p></div></div>
<div style="text-align:center;margin-top:8px;color:#5C636D;font-size:12px">
<p style="margin:0 0 4px">&copy; 2026 Usabit. Todos os direitos reservados.</p>
<p style="margin:0">Powered by <strong style="color:#C3C7CD">Space Talent</strong></p></div></div></body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Equipe de Talentos Usabit <noreply@space.pro.br>',
        to: [email],
        subject: `Convite de Acesso - ${name}`,
        html,
        attachments: [{
          filename: 'usabit-logo-email.png',
          content: LOGO_BASE64,
          type: 'image/png',
          content_id: 'logo',
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('[send-invite-email] Resend error:', err);
      return new Response(
        JSON.stringify({ error: 'Resend failed', details: err }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[send-invite-email] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import { buildEmailHtml } from '../_shared/email-templates.ts';
import { safeEdgeError } from '../_shared/safe-logger.ts';

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

const LOGO_BASE64 = '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';

const ALLOWED_ORIGINS = ['https://rh.usabitspace.com', 'http://localhost:5173', 'http://localhost:4173'];

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': (origin && ALLOWED_ORIGINS.includes(origin)) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(origin) });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Rate limit por IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const allowed = await checkRateLimit(supabase, `pwreset:ip:${clientIp}`, 'send-password-reset-email', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!allowed) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // 2. Parse body
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // 3. Gerar link de recuperação via GoTrue Admin API
    const gotrueRes = await fetch(
      SUPABASE_URL!.replace(/\/+$/, '') + '/auth/v1/admin/generate_link',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        body: JSON.stringify({
          type: 'recovery',
          email,
          redirect_to: APP_URL,
        }),
      }
    );

    if (!gotrueRes.ok) {
      const errText = await gotrueRes.text();
      safeEdgeError('send-password-reset-email', 'GoTrue generate_link falhou', errText);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    const gotrueJson = await gotrueRes.json();
    const recoveryLink = gotrueJson?.action_link || '';

    if (!recoveryLink) {
      safeEdgeError('send-password-reset-email', 'generate_link success sem action_link', JSON.stringify(gotrueJson).slice(0, 300));
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
      });
    }

    // 4. Buscar nome do perfil (opcional)
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('email', email)
      .maybeSingle();

    // 5. Enviar email padronizado via Resend
    const emailHtml = buildEmailHtml({
      title: 'Redefinição de senha — Usabit people',
      greetingName: profile?.name || email.split('@')[0],
      contentHtml: `
        <p style="font-size: 16px; color: rgba(255,255,255,0.85); margin: 0 0 24px; line-height: 1.6;">
          Recebemos uma solicitação de redefinição de senha para sua conta.
        </p>
        <p style="font-size: 16px; color: rgba(255,255,255,0.85); margin: 0 0 32px; line-height: 1.6;">
          Clique no botão abaixo para criar uma nova senha:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${recoveryLink}"
             style="display: inline-block; background: linear-gradient(135deg, #2C58FD 0%, #1a3eb5 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 16px; padding: 16px 48px; border-radius: 12px;">
            Redefinir senha
          </a>
        </div>
        <p style="font-size: 14px; color: rgba(255,255,255,0.5); margin: 24px 0 0; line-height: 1.5;">
          Se você não solicitou esta redefinição, ignore este email.
        </p>
        <p style="font-size: 14px; color: rgba(255,255,255,0.5); margin: 8px 0 0; line-height: 1.5;">
          O link expira em 1 hora.
        </p>
      `,
    });

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Usabit people <noreply@space.pro.br>',
        to: email,
        subject: 'Redefinição de senha — Usabit people',
        html: emailHtml,
        ...(LOGO_BASE64 ? {
          attachments: [{
            filename: 'logo.png',
            content: LOGO_BASE64,
            content_id: 'logo',
            disposition: 'inline',
          }],
        } : {}),
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      safeEdgeError('send-password-reset-email', 'Resend error', errText);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
    });

  } catch (error) {
    safeEdgeError('send-password-reset-email', 'Unhandled error', error);
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
    });
  }
});

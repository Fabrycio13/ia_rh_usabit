// Edge Function: send-invite-email
// Envia email de convite HTML bonito para novos usuários criados pelo admin

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const { userId, email, name, role, createdBy } = await req.json();

    if (!userId || !email || !name || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Gerar link de confirmação mágico
    const { data: { session } } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${APP_URL}/login`,
      },
    });

    const confirmLink = session?.url || `${APP_URL}/login`;

    // Mapear perfis para labels bonitas
    const roleLabels: Record<string, string> = {
      admin: 'Administrador',
      rh: 'RH',
      gestor: 'Gestor',
      convidado: 'Convidado',
    };

    const roleLabel = roleLabels[role] || role;

    // HTML do email bonito
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite - Space Talent</title>
</head>
<body style="margin:0;padding:0;background:#0f111a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f111a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#1a1c27;border-radius:16px;overflow:hidden;border:1px solid #1f2332;max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 30px;text-align:center;background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);">
              <div style="font-size:48px;margin-bottom:10px;">🚀</div>
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;">Bem-vindo ao Space Talent!</h1>
              <p style="margin:10px 0 0;font-size:16px;color:rgba(255,255,255,0.8);">Recrutamento inteligente com IA</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#e2e8f0;">Olá <strong style="color:#ffffff;">${name}</strong>!</p>
              
              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Você foi convidado(a) a fazer parte do <strong style="color:#e2e8f0;">Space Talent</strong>, nossa plataforma de recrutamento com Inteligência Artificial.
              </p>

              <!-- Role Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#22c55e10;border:1px solid #22c55e40;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#22c55e;">SEU PERFIL DE ACESSO</p>
                    <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${roleLabel}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Para começar a usar a plataforma, basta clicar no botão abaixo e definir sua senha:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <tr>
                  <td align="center" style="border-radius:12px;background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);">
                    <a href="${confirmLink}" target="_blank" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">
                      Ativar Minha Conta →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f59e0b10;border:1px solid #f59e0b40;border-radius:10px;margin:28px 0;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;font-size:13px;color:#fbbf24;line-height:1.5;">
                      ⚠️ Este link expira em <strong>3 dias</strong>. Após esse prazo, sua conta será desativada automaticamente.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#64748b;">
                Se você não esperava este convite, pode ignorar este email com segurança.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background:#141520;text-align:center;border-top:1px solid #1f2332;">
              <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#e2e8f0;">Space Talent</p>
              <p style="margin:0;font-size:12px;color:#64748b;">IA Recruitment Platform · Powered by usabit</p>
              <p style="margin:12px 0 0;font-size:11px;color:#475569;">Este email foi enviado para ${email} a pedido de ${createdBy || 'um administrador'}.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Enviar email via Resend (ou outro serviço)
    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Space Talent <convite@seudominio.com>',
          to: [email],
          subject: '🚀 Você foi convidado(a) para o Space Talent!',
          html,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error('Resend error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to send email', details: error }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Sem Resend configurado - log apenas para debug
      console.log('[send-invite-email] Email não enviado (RESEND_API_KEY não configurada)');
      console.log('[send-invite-email] Link de confirmação:', confirmLink);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Invite email sent' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-invite-email] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

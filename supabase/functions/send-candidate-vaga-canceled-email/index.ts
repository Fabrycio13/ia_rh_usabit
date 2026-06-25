// Edge Function: send-candidate-vaga-canceled-email
// Envia e-mail de notificação para candidatos quando a vaga é cancelada/suspensa

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const LOGO_BASE64 = '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';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { candidateName, candidateEmail, jobTitle }: { candidateName: string; candidateEmail: string; jobTitle: string } = await req.json();

    if (!candidateEmail || !candidateName || !jobTitle) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      console.log('[send-candidate-vaga-canceled-email] Email não enviado (RESEND_API_KEY não configurada)');
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const candidateFirstName = candidateName.split(' ')[0];

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Atualização sobre a vaga</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #04070c; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
    <div style="background-color: #04070c; background-image: radial-gradient(circle at top right, #1a3597 0%, #04070c 100%); padding: 32px 16px; text-align: center; min-height: 100%;">
        <div style="max-width: 600px; width: 100%; margin: 0 auto; background: #0b111a; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 40px 24px; text-align: left; box-sizing: border-box;">
            
            <!-- Header/Logo -->
            <div style="text-align: center; margin-bottom: 32px;">
                <img src="cid:logo" alt="Usabit people" style="height: 32px; width: auto; display: block; margin: 0 auto;" />
            </div>
            
            <!-- Content Card -->
            <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, transparent 100%); border-radius: 20px; padding: 2px; margin-bottom: 32px;">
                <div style="background: #0b111a; border-radius: 18px; padding: 32px;">
                    <h2 style="color: #6366f1; font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.02em;">Olá, ${candidateFirstName}!</h2>
                    <p style="font-size: 17px; line-height: 1.6; color: #ffffff; margin: 0; font-weight: 500;">
                        Agradecemos sua participação no processo seletivo para a vaga
                        <span style="display: block; margin-top: 8px; color: #94a3b8; font-size: 18px; font-weight: 700;">${jobTitle}</span>
                    </p>
                </div>
            </div>

            <!-- Message -->
            <div style="color: #94a3b8; font-size: 16px; line-height: 1.7; margin-bottom: 40px;">
                <p style="margin: 0 0 20px;">
                    Informamos que, por decisão interna e alinhamento estratégico da empresa, esta oportunidade foi cancelada e o processo seletivo foi encerrado.
                </p>
                <p style="margin: 0 0 20px;">
                    Agradecemos seu interesse e o tempo dedicado durante esta etapa. Seu perfil poderá ser considerado para futuras oportunidades compatíveis com sua experiência. Em caso de reabertura desta posição, entraremos em contato.
                </p>
                <p style="margin: 0; color: #ffffff; font-weight: 600;">
                    Desejamos muito sucesso em sua trajetória profissional!
                </p>
            </div>
            
            <div style="margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
                <p style="font-size: 14px; color: #64748b; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Atenciosamente,</p>
                <p style="font-size: 18px; font-weight: 700; color: #ffffff; margin: 0; font-family: 'Space Grotesk', sans-serif;">
                    Usabit people
                </p>
            </div>
        </div>

        <!-- Branding Footer -->
        <!-- Footer (Landing Page style) -->
        <div style="max-width: 600px; width: 100%; margin: 48px auto 0; padding: 0 24px 24px; box-sizing: border-box;">
            <img src="cid:logo" alt="Usabit people" style="height: 28px; width: auto; display: block; margin: 0 auto 16px;" />
            <p style="font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.5; margin: 0 0 28px; text-align: center;">
                Conectando talentos com inteligência — a junção entre humano e máquina
            </p>
            <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent); margin: 0 0 24px;"></div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
                <p style="font-size: 12px; color: rgba(255,255,255,0.3); margin: 0;">&copy; 2026 Usabit. Todos os direitos reservados.</p>
                <p style="font-size: 12px; color: rgba(255,255,255,0.2); margin: 0;">Powered by <strong style="color: rgba(255,255,255,0.45); font-weight: 700;">Usabit people</strong></p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Usabit people <noreply@space.pro.br>',
        to: [candidateEmail],
        subject: `Atualização sobre a vaga de ${jobTitle}`,
        html,
        attachments: [
          {
            filename: 'usabit-people-logo.png',
            content: LOGO_BASE64,
            type: 'image/png',
            content_id: 'logo',
          },
        ],
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('Resend error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Canceled email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[send-candidate-vaga-canceled-email] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


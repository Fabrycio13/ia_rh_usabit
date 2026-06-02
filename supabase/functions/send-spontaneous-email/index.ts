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
    const { candidateName, candidateEmail, orgName }: { candidateName: string; candidateEmail: string; orgName: string } = await req.json();

    if (!candidateEmail || !candidateName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      console.log('[send-spontaneous-email] Email não enviado (RESEND_API_KEY não configurada)');
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const displayName = orgName || 'nossa equipe';
    const candidateFirstName = candidateName.split(' ')[0];

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Currículo Recebido</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #04070c; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
    <div style="background-color: #04070c; background-image: radial-gradient(circle at top right, #1a3597 0%, #04070c 100%); padding: 60px 20px; text-align: center; min-height: 100%;">
        <div style="max-width: 600px; margin: 0 auto; background: #0b111a; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 48px 40px; text-align: left; box-shadow: 0 20px 50px rgba(0,0,0,0.6);">
            
            <div style="text-align: center; margin-bottom: 48px;">
                <img src="cid:logo" alt="Usabit Global" style="height: 32px; width: auto; display: block; margin: 0 auto;" />
            </div>
            
            <div style="background: linear-gradient(135deg, rgba(44, 88, 253, 0.15) 0%, transparent 100%); border-radius: 20px; padding: 2px; margin-bottom: 32px;">
                <div style="background: #0b111a; border-radius: 18px; padding: 32px;">
                    <h2 style="color: #2C58FD; font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.02em;">Olá, ${candidateFirstName}!</h2>
                    <p style="font-size: 17px; line-height: 1.6; color: #ffffff; margin: 0; font-weight: 500;">
                        Recebemos seu currículo com sucesso!
                    </p>
                </div>
            </div>
            
            <div style="color: #94a3b8; font-size: 16px; line-height: 1.7; margin-bottom: 40px;">
                <p style="margin: 0 0 20px;">
                    Agradecemos pelo envio do seu currículo.
                </p>
                
                <p style="margin: 0 0 20px;">
                    Seu perfil foi incluído em nosso Banco de Talentos e poderá ser considerado para futuras oportunidades compatíveis com sua experiência e qualificações.
                </p>
                
                <p style="margin: 0 0 20px;">
                    Sempre que surgirem vagas aderentes ao seu perfil, nossa equipe poderá entrar em contato.
                </p>
                
                <p style="margin: 0; color: #ffffff; font-weight: 600;">
                    Agradecemos pelo seu interesse em fazer parte da ${displayName}!
                </p>
            </div>
            
            <!-- Signature -->
            <div style="margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
                <p style="font-size: 14px; color: #64748b; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Atenciosamente,</p>
                <p style="font-size: 18px; font-weight: 700; color: #ffffff; margin: 0 0 32px; font-family: 'Space Grotesk', sans-serif;">
                    Equipe de Talentos<br/>
                    <span style="color: #2C58FD;">${displayName}</span>
                </p>

                <!-- Tagline -->
                <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px; line-height: 1.5;">
                    Impulsionando crescimento de negócios através da tecnologia
                </p>

                <!-- Social -->
                <div style="margin-bottom: 24px;">
                    <a href="https://br.linkedin.com/company/usabit" target="_blank" style="display: inline-block; margin: 0 6px; padding: 8px 14px; border-radius: 8px; background: rgba(44, 88, 253, 0.12); border: 1px solid rgba(44, 88, 253, 0.25); color: #2C58FD; text-decoration: none; font-size: 12px; font-weight: 600;">LinkedIn</a>
                    <a href="https://www.instagram.com/usabitglobal/" target="_blank" style="display: inline-block; margin: 0 6px; padding: 8px 14px; border-radius: 8px; background: rgba(44, 88, 253, 0.12); border: 1px solid rgba(44, 88, 253, 0.25); color: #2C58FD; text-decoration: none; font-size: 12px; font-weight: 600;">Instagram</a>
                    <a href="https://www.facebook.com/usabitdigital" target="_blank" style="display: inline-block; margin: 0 6px; padding: 8px 14px; border-radius: 8px; background: rgba(44, 88, 253, 0.12); border: 1px solid rgba(44, 88, 253, 0.25); color: #2C58FD; text-decoration: none; font-size: 12px; font-weight: 600;">Facebook</a>
                    <a href="https://www.youtube.com/@UsabitGlobal" target="_blank" style="display: inline-block; margin: 0 6px; padding: 8px 14px; border-radius: 8px; background: rgba(44, 88, 253, 0.12); border: 1px solid rgba(44, 88, 253, 0.25); color: #2C58FD; text-decoration: none; font-size: 12px; font-weight: 600;">YouTube</a>
                </div>

                <!-- WhatsApp -->
                <div style="margin-bottom: 32px;">
                    <a href="https://wa.me/5511999999999" target="_blank" style="display: inline-block; padding: 10px 20px; border-radius: 10px; background: #2C58FD; color: #fff; text-decoration: none; font-size: 14px; font-weight: 700;">Fale conosco</a>
                </div>
            </div>
        </div>

        <!-- Branding Footer -->
        <div style="text-align: center; margin-top: 8px; color: #5C636D; font-size: 12px;">
            <p style="margin: 0 0 4px;">&copy; 2026 ${displayName}. Todos os direitos reservados.</p>
            <p style="margin: 0;">Powered by <strong style="color: #C3C7CD;">Space Talent</strong></p>
        </div>
    </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Equipe de Talentos Usabit <noreply@space.pro.br>',
        to: [candidateEmail],
        subject: `Cadastro realizado com sucesso - ${displayName}`,
        html,
        attachments: [
          {
            filename: 'usabit-logo-email.png',
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
      JSON.stringify({ success: true, message: 'Spontaneous application email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[send-spontaneous-email] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

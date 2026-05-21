import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

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
                <img src="https://raw.githubusercontent.com/Fabrycio13/ia_rh_usabit/fix/remediation-sprint/public/logos/usabit-logo.svg" alt="Usabit Global" style="height: 32px; width: auto; display: block; margin: 0 auto;" />
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
                    Agradecemos pelo seu interesse em fazer parte da <strong>${displayName}</strong>. Seu currículo já está com nossa equipe de recrutamento e será analisado com atenção.
                </p>
                
                <p style="margin: 0 0 20px;">
                    Assim que identificarmos uma oportunidade compatível com seu perfil, entraremos em contato para agendar os próximos passos.
                </p>
                
                <p style="margin: 0; color: #ffffff; font-weight: 600;">
                    Desejamos muito sucesso em sua jornada!
                </p>
            </div>
            
            <div style="margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <p style="font-size: 14px; color: #64748b; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.05em;">Atenciosamente,</p>
                <p style="font-size: 18px; font-weight: 700; color: #ffffff; margin: 0; font-family: 'Space Grotesk', sans-serif;">
                    Equipe de Talentos<br/>
                    <span style="color: #2C58FD;">${displayName}</span>
                </p>
            </div>
        </div>
        
        <div style="margin-top: 40px; color: #475569; font-size: 13px;">
            <p style="margin: 0; font-weight: 500;">Powered by <span style="color: #94a3b8;">Space Talent</span></p>
            <p style="margin: 10px 0 0;">&copy; 2026 ${displayName}. Todos os direitos reservados.</p>
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
        from: 'Equipe de Carreiras <noreply@space.pro.br>',
        to: [candidateEmail],
        subject: `Recebemos seu curr\u00edculo \u2014 ${displayName}`,
        html,
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

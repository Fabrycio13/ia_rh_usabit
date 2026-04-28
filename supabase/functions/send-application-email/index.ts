// Edge Function: send-application-email
// Envia e-mail de confirmação de recebimento de currículo para o candidato

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { candidateName, candidateEmail, jobTitle } = await req.json();

    if (!candidateEmail || !jobTitle || !candidateName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      console.log('[send-application-email] Email não enviado (RESEND_API_KEY não configurada)');
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const candidateFirstName = candidateName.split(' ')[0];

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <p style="margin-top: 0;">Olá, <strong>${candidateFirstName}</strong>!</p>
          
          <p>Recebemos sua candidatura para a vaga <strong>${jobTitle}</strong> e agradecemos pelo seu interesse em fazer parte da nossa equipe.</p>
          
          <p>Seu currículo já foi recebido pela nossa equipe de RH e será analisado com atenção, de acordo com os critérios e requisitos da oportunidade.</p>
          
          <p>Caso o seu perfil tenha aderência à vaga, entraremos em contato em breve para dar continuidade às próximas etapas do processo seletivo.</p>
          
          <p>A participação nas etapas seguintes dependerá da análise do currículo e da compatibilidade com o perfil buscado para a posição.</p>
          
          <p>Agradecemos novamente pelo seu interesse e desejamos boa sorte!</p>
          
          <p style="margin-bottom: 0;">Atenciosamente,<br/><br/><strong>Equipe de Recrutamento e Seleção - Usabit Global</strong></p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Equipe de Carreiras <noreply@space.pro.br>',
        to: [candidateEmail],
        subject: `Recebemos sua candidatura para a vaga ${jobTitle}`,
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
      JSON.stringify({ success: true, message: 'Application email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[send-application-email] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

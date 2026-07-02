// Edge Function: enrich-candidate
// IA básica: lê PDF do storage → extrai skills/experiência/formação → UPDATE candidate
// Disparada internamente (fire-and-forget) por submit-candidate, AddCandidateModal, etc.
// NUNCA exposta ao frontend público.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import pdfParse from "npm:pdf-parse@1.1.1";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

serve(async (req) => {
  try {
    const { candidateId } = await req.json();
    if (!candidateId) {
      return new Response(JSON.stringify({ error: 'candidateId obrigatório' }), { status: 400 });
    }
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY não configurada' }), { status: 500 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Buscar candidato
    const { data: candidate, error: candidateErr } = await supabaseAdmin
      .from('candidates')
      .select('id, name, resume_url, is_analyzed')
      .eq('id', candidateId)
      .single();

    if (candidateErr || !candidate) {
      return new Response(JSON.stringify({ error: 'Candidato não encontrado' }), { status: 404 });
    }
    if (candidate.is_analyzed) {
      return new Response(JSON.stringify({ skipped: true, reason: 'já analisado' }), { status: 200 });
    }
    if (!candidate.resume_url) {
      return new Response(JSON.stringify({ skipped: true, reason: 'sem currículo' }), { status: 200 });
    }

    // 2. Baixar PDF
    const bucket = 'job-applications';
    const path = candidate.resume_url.replace(`${bucket}/`, '');
    const { data: pdfBlob, error: downloadErr } = await supabaseAdmin.storage.from(bucket).download(path);
    if (downloadErr || !pdfBlob) {
      return new Response(JSON.stringify({ error: 'Erro ao baixar PDF' }), { status: 500 });
    }

    // 3. Extrair texto
    const pdfBuffer = new Uint8Array(await pdfBlob.arrayBuffer());
    let extractedText = '';
    try {
      const pdfData = await pdfParse(pdfBuffer);
      extractedText = (pdfData.text || '').slice(0, 8000);
    } catch {
      return new Response(JSON.stringify({ error: 'PDF ilegível' }), { status: 500 });
    }
    if (!extractedText.trim()) {
      return new Response(JSON.stringify({ skipped: true, reason: 'PDF sem texto' }), { status: 200 });
    }

    // 4. Chamar OpenAI
    const prompt = `Analise o currículo abaixo e retorne APENAS um JSON estrito (sem markdown, sem texto adicional) no formato:
{
  "skills": ["skill1", "skill2", ...],
  "experience": "Resumo da experiência profissional (ex: '5 anos em desenvolvimento web fullstack')",
  "education": "Formação principal (ex: 'Ciência da Computação - USP - 2018')",
  "summary": "Resumo profissional do candidato em 2-3 linhas",
  "feedback": "Análise geral do perfil: pontos fortes e áreas de atuação em 3-5 linhas"
}
Use string vazia ("") se um campo não for identificável.

CURRÍCULO:
${extractedText}`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 600, temperature: 0 }),
    });
    if (!aiRes.ok) {
      return new Response(JSON.stringify({ error: `OpenAI erro ${aiRes.status}` }), { status: 500 });
    }

    const aiData = await aiRes.json();
    const content = aiData?.choices?.[0]?.message?.content || '';
    let parsed: Record<string, unknown> = {};
    try {
      const cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      return new Response(JSON.stringify({ error: 'Resposta IA inválida' }), { status: 500 });
    }

    // 5. Montar analysis JSONB + updates — NÃO sobrescreve dados do form
    const analysis: Record<string, unknown> = {};
    if (parsed.summary) analysis.summary = parsed.summary;
    if (parsed.feedback) {
      analysis.general_analysis = parsed.feedback;
      analysis.feedback = parsed.feedback;
    }

    const skillsArr = Array.isArray(parsed.skills) ? parsed.skills as string[] : [];
    const updates: Record<string, unknown> = {
      raw_text: extractedText,
      is_analyzed: true,
      analysis,
    };
    if (skillsArr.length) {
      updates.skills = skillsArr.join(', ');
      updates.tags = skillsArr.map((s: string) => s.toLowerCase().trim());
    }
    if (parsed.experience) updates.experience = parsed.experience;
    if (parsed.education) updates.education = parsed.education;

    const { error: updateErr } = await supabaseAdmin.from('candidates').update(updates).eq('id', candidateId);
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, candidateId }), { status: 200 });

  } catch (err) {
    console.error('[enrich-candidate] Erro:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
});

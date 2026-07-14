// Edge Function: match-analysis
// IA com vaga: compara candidato com vaga → score, strengths, gaps, recommendation
// Disparada internamente por submit-application ou vinculação de vaga.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import pdfParse from "npm:pdf-parse@1.1.1";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

serve(async (req) => {
  try {
    const { candidateId, vagaId } = await req.json();
    if (!candidateId || !vagaId) {
      return new Response(JSON.stringify({ error: 'candidateId e vagaId obrigatórios' }), { status: 400 });
    }
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY não configurada' }), { status: 500 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Buscar candidatura + vaga
    const [{ data: candidate, error: candidateErr }, { data: vaga, error: vagaErr }] = await Promise.all([
      supabaseAdmin.from('vagas_candidaturas').select('id, candidate_name, resume_url, raw_text, skills, experience, education').eq('id', candidateId).single(),
      supabaseAdmin.from('vagas_white_label').select('id, title, description, requirements, responsibilities, differentials').eq('id', vagaId).single(),
    ]);

    if (candidateErr || !candidate) {
      return new Response(JSON.stringify({ error: 'Candidato não encontrado' }), { status: 404 });
    }
    if (vagaErr || !vaga) {
      return new Response(JSON.stringify({ error: 'Vaga não encontrada' }), { status: 404 });
    }

    // 2. Obter texto do currículo (usa raw_text se já extraído, senão baixa PDF)
    let resumeText = candidate.raw_text || '';
    if (!resumeText && candidate.resume_url) {
      const bucket = 'job-applications';
      const path = candidate.resume_url.replace(`${bucket}/`, '');
      const { data: pdfBlob } = await supabaseAdmin.storage.from(bucket).download(path);
      if (pdfBlob) {
        try {
          const pdfBuffer = new Uint8Array(await pdfBlob.arrayBuffer());
          const pdfData = await pdfParse(pdfBuffer);
          resumeText = (pdfData.text || '').slice(0, 6000);
        } catch { /* sem texto, prossegue com dados existentes */ }
      }
    }

    // 3. Montar dados do candidato para o prompt
    const candidateProfile = [
      `Nome: ${candidate.candidate_name || 'Não informado'}`,
      candidate.skills ? `Skills: ${candidate.skills}` : '',
      candidate.experience ? `Experiência: ${candidate.experience}` : '',
      candidate.education ? `Formação: ${candidate.education}` : '',
      resumeText ? `Currículo: ${resumeText}` : '',
    ].filter(Boolean).join('\n');

    // 4. Chamar OpenAI para match
    const prompt = `Você é um recrutador sênior. Compare o candidato com a vaga abaixo e retorne APENAS um JSON estrito (sem markdown, sem texto adicional) no formato:
{
  "score": número 0-100,
  "classification": "FORTE" | "MÉDIO" | "NÃO ADERENTE",
  "strengths": ["ponto forte 1", "ponto forte 2", ...],
  "gaps": ["gap 1", "gap 2", ...],
  "recommendation": "Avançar" | "Manter em banco" | "Não recomendado",
  "summary": "Resumo da análise em 3-5 linhas explicando o score"
}

Regras de classificação:
- FORTE: score >= 70
- MÉDIO: score 40-69
- NÃO ADERENTE: score < 40

VAGA:
Título: ${vaga.title}
Descrição: ${vaga.description || ''}
Requisitos: ${vaga.requirements || ''}
Responsabilidades: ${vaga.responsibilities || ''}
Diferenciais: ${vaga.differentials || ''}

CANDIDATO:
${candidateProfile}`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], max_tokens: 800, temperature: 0 }),
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

    // 5. Montar analysis JSONB de match
    const matchAnalysis: Record<string, unknown> = {};
    if (parsed.score != null) matchAnalysis.match_score = parsed.score;
    if (parsed.classification) matchAnalysis.classification = parsed.classification;
    if (parsed.summary) matchAnalysis.summary = parsed.summary;
    if (Array.isArray(parsed.strengths)) matchAnalysis.strengths = parsed.strengths;
    if (Array.isArray(parsed.gaps)) matchAnalysis.gaps = parsed.gaps;
    if (parsed.recommendation) matchAnalysis.recommendation = parsed.recommendation;

    // 6. Atualizar vagas_candidaturas com score + analysis de match
    const { error: updateErr } = await supabaseAdmin
      .from('vagas_candidaturas')
      .update({
        match_score: typeof parsed.score === 'number' ? parsed.score : 0,
        analysis_vs_vaga: matchAnalysis,
      })
      .eq('id', candidateId);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, candidateId, vagaId }), { status: 200 });

  } catch (err) {
    console.error('[match-analysis] Erro:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
});

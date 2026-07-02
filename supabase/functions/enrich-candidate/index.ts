// Edge Function: enrich-candidate
// IA básica: lê PDF do storage → extrai skills/experiência/formação → UPDATE candidate
// Disparada internamente por submit-candidate, AddCandidateModal, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

// ponytail: extrai texto do content stream do PDF via regex, sem dependências externas
function extractTextFromPdfBytes(buffer: Uint8Array): string {
  try {
    const decoder = new TextDecoder('latin1')
    const raw = decoder.decode(buffer)
    const matches = raw.match(/\(([^()\\]{2,200})\)/g) || []
    const texts = matches
      .map(m => m.slice(1, -1))
      .filter(t => /[a-zA-ZÀ-ÿ]{3,}/.test(t))
      .map(t => t.replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 10))))
    return texts.join(' ').slice(0, 8000)
  } catch {
    return ''
  }
}

serve(async (req) => {
  console.log('[enrich-candidate] request received')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization') || ''
  if (!SUPABASE_SERVICE_ROLE_KEY || !authHeader.includes(SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('[enrich-candidate] Auth falhou')
    return json({ error: 'Não autorizado' }, 401)
  }

  try {
    const { candidateId } = await req.json()
    console.log('[enrich-candidate] Iniciando para', candidateId)

    if (!candidateId) {
      return json({ error: 'candidateId obrigatório' }, 400)
    }
    if (!OPENAI_API_KEY) {
      return json({ error: 'OPENAI_API_KEY não configurada' }, 500)
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: candidate, error: candidateErr } = await supabaseAdmin
      .from('candidates')
      .select('id, name, resume_url, is_analyzed, skills, experience, education')
      .eq('id', candidateId)
      .single()

    if (candidateErr || !candidate) {
      console.error('[enrich-candidate] Candidato não encontrado:', candidateErr?.message)
      return json({ error: 'Candidato não encontrado' }, 404)
    }

    if (candidate.is_analyzed) {
      console.log('[enrich-candidate] Já analisado, pulando')
      return json({ skipped: true, reason: 'já analisado' })
    }
    if (!candidate.resume_url) {
      console.log('[enrich-candidate] Sem currículo, pulando')
      return json({ skipped: true, reason: 'sem currículo' })
    }

    const bucket = 'job-applications'
    const path = candidate.resume_url.replace(`${bucket}/`, '')
    console.log('[enrich-candidate] Baixando PDF:', path)
    const { data: pdfBlob, error: downloadErr } = await supabaseAdmin.storage.from(bucket).download(path)
    if (downloadErr || !pdfBlob) {
      console.error('[enrich-candidate] Erro ao baixar PDF:', downloadErr?.message)
      return json({ error: 'Erro ao baixar PDF' }, 500)
    }
    console.log('[enrich-candidate] PDF baixado:', pdfBlob.size, 'bytes')

    const pdfBuffer = new Uint8Array(await pdfBlob.arrayBuffer())
    const extractedText = extractTextFromPdfBytes(pdfBuffer)
    console.log('[enrich-candidate] Texto extraído:', extractedText.length, 'chars')
    if (!extractedText.trim()) {
      console.warn('[enrich-candidate] Sem texto extraído do PDF')
      return json({ skipped: true, reason: 'PDF sem texto' })
    }

    console.log('[enrich-candidate] Chamando OpenAI,', extractedText.length, 'chars')
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
${extractedText}`

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 600, temperature: 0 }),
    })
    if (!aiRes.ok) {
      const errBody = await aiRes.text().catch(() => '')
      console.error('[enrich-candidate] OpenAI erro:', aiRes.status, errBody.slice(0, 200))
      return json({ error: `OpenAI erro ${aiRes.status}` }, 500)
    }

    const aiData = await aiRes.json()
    const content = aiData?.choices?.[0]?.message?.content || ''
    console.log('[enrich-candidate] OpenAI respondeu:', content.length, 'chars')
    let parsed: Record<string, unknown> = {}
    try {
      const cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      parsed = JSON.parse(cleanContent)
    } catch (e) {
      console.error('[enrich-candidate] Erro parse:', (e as Error).message, '| content:', content.slice(0, 200))
      return json({ error: 'Resposta IA inválida' }, 500)
    }

    const analysis: Record<string, unknown> = {}
    if (parsed.summary) analysis.summary = parsed.summary
    if (parsed.feedback) {
      analysis.general_analysis = parsed.feedback
      analysis.feedback = parsed.feedback
    }

    const skillsArr = Array.isArray(parsed.skills) ? parsed.skills as string[] : []
    const updates: Record<string, unknown> = {
      raw_text: extractedText,
      is_analyzed: true,
      analysis,
    }
    if (skillsArr.length) {
      updates.skills = skillsArr.join(', ')
      updates.tags = skillsArr.map((s: string) => s.toLowerCase().trim())
    }
    if (parsed.experience && !candidate.experience) updates.experience = parsed.experience
    if (parsed.education && !candidate.education) updates.education = parsed.education

    const { error: updateErr } = await supabaseAdmin.from('candidates').update(updates).eq('id', candidateId)
    if (updateErr) {
      console.error('[enrich-candidate] Erro update:', updateErr.message)
      return json({ error: updateErr.message }, 500)
    }

    console.log('[enrich-candidate] Sucesso:', candidateId, '| skills:', skillsArr.length)
    return json({ success: true, candidateId })

  } catch (err) {
    console.error('[enrich-candidate] Erro geral:', (err as Error).message, (err as Error).stack)
    return json({ error: 'Erro interno', detail: (err as Error).message }, 500)
  }
})
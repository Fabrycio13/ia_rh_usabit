// Edge Function: enrich-candidate
// IA básica: lê PDF do storage → extrai skills/experiência/formação → UPDATE candidate
// Disparada internamente por submit-candidate, AddCandidateModal, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''

// ponytail: extração simples via regex do content stream do PDF (fallback se pdf-parse falhar)
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

async function extractPdfText(buffer: Uint8Array): Promise<string> {
  try {
    const { default: pdfParse } = await import("npm:pdf-parse@1.1.1")
    const pdfData = await pdfParse(buffer)
    const text = (pdfData.text || '').slice(0, 8000)
    if (text.trim()) {
      console.log('[enrich-candidate] pdf-parse OK,', text.length, 'chars')
      return text
    }
  } catch (e) {
    console.warn('[enrich-candidate] pdf-parse falhou:', (e as Error).message)
  }
  const text = extractTextFromPdfBytes(buffer)
  console.log('[enrich-candidate] fallback regex extraiu', text.length, 'chars')
  return text
}

serve(async (req) => {
  const authHeader = req.headers.get('Authorization') || ''
  if (!SUPABASE_SERVICE_ROLE_KEY || !authHeader.includes(SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('[enrich-candidate] Auth falhou')
    return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 })
  }

  try {
    const { candidateId } = await req.json()
    if (!candidateId) {
      return new Response(JSON.stringify({ error: 'candidateId obrigatório' }), { status: 400 })
    }
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY não configurada' }), { status: 500 })
    }

    console.log('[enrich-candidate] Iniciando para', candidateId)

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: candidate, error: candidateErr } = await supabaseAdmin
      .from('candidates')
      .select('id, name, resume_url, is_analyzed, skills, experience, education')
      .eq('id', candidateId)
      .single()

    if (candidateErr || !candidate) {
      console.error('[enrich-candidate] Candidato não encontrado:', candidateErr?.message)
      return new Response(JSON.stringify({ error: 'Candidato não encontrado' }), { status: 404 })
    }
    if (candidate.is_analyzed) {
      console.log('[enrich-candidate] Já analisado, pulando')
      return new Response(JSON.stringify({ skipped: true, reason: 'já analisado' }), { status: 200 })
    }
    if (!candidate.resume_url) {
      console.log('[enrich-candidate] Sem currículo, pulando')
      return new Response(JSON.stringify({ skipped: true, reason: 'sem currículo' }), { status: 200 })
    }

    const bucket = 'job-applications'
    const path = candidate.resume_url.replace(`${bucket}/`, '')
    const { data: pdfBlob, error: downloadErr } = await supabaseAdmin.storage.from(bucket).download(path)
    if (downloadErr || !pdfBlob) {
      console.error('[enrich-candidate] Erro ao baixar PDF:', downloadErr?.message)
      return new Response(JSON.stringify({ error: 'Erro ao baixar PDF' }), { status: 500 })
    }
    console.log('[enrich-candidate] PDF baixado:', pdfBlob.size, 'bytes')

    const pdfBuffer = new Uint8Array(await pdfBlob.arrayBuffer())
    const extractedText = await extractPdfText(pdfBuffer)
    if (!extractedText.trim()) {
      console.warn('[enrich-candidate] Sem texto extraído do PDF')
      return new Response(JSON.stringify({ skipped: true, reason: 'PDF sem texto' }), { status: 200 })
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
      console.error('[enrich-candidate] OpenAI erro:', aiRes.status)
      return new Response(JSON.stringify({ error: `OpenAI erro ${aiRes.status}` }), { status: 500 })
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
      return new Response(JSON.stringify({ error: 'Resposta IA inválida' }), { status: 500 })
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
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 })
    }

    console.log('[enrich-candidate] Sucesso:', candidateId, '| skills:', skillsArr.length)
    return new Response(JSON.stringify({ success: true, candidateId }), { status: 200 })

  } catch (err) {
    console.error('[enrich-candidate] Erro geral:', (err as Error).message)
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 })
  }
})
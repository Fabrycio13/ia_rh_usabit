// Edge Function: enrich-candidate
// IA básica: lê PDF do storage → extrai skills/experiência/formação → UPDATE candidate
// Disparada internamente por submit-candidate, AddCandidateModal, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { sanitizeAIInput } from '../_shared/sanitize-ai-input.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''

const ALLOWED_ROLES = ['rh', 'supervisor', 'administrador', 'gestor', 'owner']

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

// ponytail: extração de texto de PDF — tenta pdfjs-dist (npm), fallback regex no raw
async function extractTextFromPdfBytes(buffer: Uint8Array): Promise<string> {
  // Tenta pdfjs-dist (funciona em Deno moderno)
  try {
    const { getDocument } = await import("npm:pdfjs-dist@4.0.379")
    const pdf = await getDocument({ data: buffer.buffer }).promise
    let text = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map((item: { str?: string }) => item.str || '').join(' ') + ' '
    }
    if (text.trim().length > 50) return text.slice(0, 8000)
  } catch {
    console.warn('[enrich-candidate] pdfjs-dist falhou, fallback regex')
  }

  // Fallback: regex no raw bytes (PDFs sem compressão)
  try {
    const raw = new TextDecoder('latin1').decode(buffer)
    const texts: string[] = []
    const parenMatches = raw.match(/\(([^()\\]{2,200})\)/g) || []
    for (const m of parenMatches) {
      const t = m.slice(1, -1).replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 10)))
      if (/[a-zA-ZÀ-ÿ]{3,}/.test(t)) texts.push(t)
    }
    const hexMatches = raw.match(/<([0-9A-Fa-f]{4,})>\s*Tj/g) || []
    for (const m of hexMatches) {
      const hex = m.replace(/[<>]/g, '').replace(/\s/g, '').replace(/Tj$/, '').trim()
      if (hex.length >= 4) {
        const t = hex.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join('') || ''
        if (/[a-zA-ZÀ-ÿ]{3,}/.test(t)) texts.push(t)
      }
    }
    return texts.join(' ').slice(0, 8000)
  } catch {
    return ''
  }
}

// Remove caracteres de controle que quebram JSON no PostgreSQL
function sanitizeText(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, '').trim()
}

serve(async (req) => {
  console.log('[enrich-candidate] request received')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth: aceita service_role (chamadas internas) OU JWT de usuário logado
  const authHeader = req.headers.get('Authorization') || ''
  if (SUPABASE_SERVICE_ROLE_KEY && authHeader.includes(SUPABASE_SERVICE_ROLE_KEY)) {
    // service_role — chamada interna (ex: submit-candidate)
    console.log('[enrich-candidate] auth via service_role')
  } else {
    // JWT de usuário — validar token e role
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return json({ error: 'Não autorizado' }, 401)
    }
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token)
    if (userError || !user) {
      console.error('[enrich-candidate] Token inválido')
      return json({ error: 'Não autorizado' }, 401)
    }
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single()
    if (!profile || !ALLOWED_ROLES.includes(profile.user_role)) {
      console.error('[enrich-candidate] Permissão insuficiente:', profile?.user_role)
      return json({ error: 'Não autorizado' }, 401)
    }
    console.log('[enrich-candidate] auth via JWT, role:', profile.user_role)
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Rate limit por IP
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const allowed = await checkRateLimit(supabaseAdmin, `enrich:${ip}`, 'enrich-candidate', 30, 60000)
  if (!allowed) return json({ error: 'Muitas requisições. Tente novamente mais tarde.' }, 429)

  try {
    const body = await req.json()
    const candidateId = body.candidateId
    const source = body.source || 'candidates'  // 'candidates' (Banco) ou 'pool' (vagas_candidaturas)
    const rawTextFromClient = body.rawText as string | undefined  // texto extraído no frontend (pdfjs-dist funciona lá)
    console.log('[enrich-candidate] Iniciando para', candidateId, '| source:', source, '| rawText:', rawTextFromClient?.length || 0, 'chars')

    if (!candidateId) {
      return json({ error: 'candidateId obrigatório' }, 400)
    }
    if (!OPENAI_API_KEY) {
      console.error('[enrich-candidate] OPENAI_API_KEY não configurada')
      return json({ error: 'Erro de configuração do servidor' }, 500)
    }

    // source='pool' → lê de vagas_candidaturas (campos candidate_*)
    // source='candidates' (default) → lê de candidates (Banco de Talentos)
    let candidate: Record<string, unknown> | null = null
    if (source === 'pool') {
      const { data, error: candidateErr } = await supabaseAdmin
        .from('vagas_candidaturas')
        .select('id, candidate_name, resume_url, is_analyzed, skills, experience, education, raw_text')
        .eq('id', candidateId)
        .single()
      if (candidateErr || !data) {
        console.error('[enrich-candidate] Candidatura não encontrada:', candidateErr?.message)
        return json({ error: 'Candidato não encontrado' }, 404)
      }
      candidate = data as Record<string, unknown>
    } else {
      const { data, error: candidateErr } = await supabaseAdmin
        .from('candidates')
        .select('id, name, resume_url, is_analyzed, skills, experience, education, raw_text')
        .eq('id', candidateId)
        .single()
      if (candidateErr || !data) {
        console.error('[enrich-candidate] Candidato não encontrado:', candidateErr?.message)
        return json({ error: 'Candidato não encontrado' }, 404)
      }
      candidate = data as Record<string, unknown>
    }

    if (!candidate) {
      return json({ error: 'Candidato não encontrado' }, 404)
    }

    // Usar texto extraído do frontend (rawTextFromClient) ou raw_text já salvo no banco
    // NÃO tentar extrair PDF no Deno — pdfjs-dist não funciona aqui
    let extractedText = rawTextFromClient || (candidate.raw_text as string | undefined) || ''
    extractedText = sanitizeAIInput(extractedText)

    // Se ainda não tem texto, tentar baixar e extrair no Deno (fallback — pode não funcionar)
    if (!extractedText) {
      const resumeUrl = candidate.resume_url as string | null
      if (!resumeUrl) {
        console.log('[enrich-candidate] Sem currículo, pulando')
        return json({ skipped: true, reason: 'sem currículo' })
      }
      const bucket = 'job-applications'
      const path = resumeUrl.replace(`${bucket}/`, '')
      console.log('[enrich-candidate] Fallback: baixando PDF no Deno:', path)
      const { data: pdfBlob, error: downloadErr } = await supabaseAdmin.storage.from(bucket).download(path)
      if (downloadErr || !pdfBlob) {
        console.error('[enrich-candidate] Erro ao baixar PDF:', downloadErr?.message)
        return json({ skipped: true, reason: 'erro ao baixar PDF' })
      }
      const pdfBuffer = new Uint8Array(await pdfBlob.arrayBuffer())
      extractedText = await extractTextFromPdfBytes(pdfBuffer)
    }

    // Receber imagens do body (PDF escaneado/imagem → vision)
    const images = body.images as string[] | undefined

    // Se tem texto, usa prompt de texto. Se tem imagens, usa vision.
    let aiRes: Response
    const systemPrompt = `Analise o currículo e retorne APENAS um JSON estrito (sem markdown, sem texto adicional) no formato:
{
  "skills": ["skill1", "skill2", ...],
  "experience": "Resumo da experiência profissional (ex: '5 anos em desenvolvimento web fullstack')",
  "education": "Formação principal (ex: 'Ciência da Computação - USP - 2018')",
  "summary": "Resumo profissional do candidato em 2-3 linhas",
  "feedback": "Análise geral do perfil: pontos fortes e áreas de atuação em 3-5 linhas"
}
Use string vazia ("") se um campo não for identificável.`

    if (extractedText.trim()) {
      // PDF de texto — prompt normal
      console.log('[enrich-candidate] Chamando OpenAI (texto),', extractedText.length, 'chars')
      aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: `${systemPrompt}\n\nCURRÍCULO:\n${extractedText}` }],
          max_tokens: 600, temperature: 0,
        }),
      })
    } else if (images && images.length > 0) {
      // PDF de imagem — vision (gpt-4o-mini suporta imagens)
      console.log('[enrich-candidate] Chamando OpenAI (vision),', images.length, 'imagens')
      const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [{ type: 'text', text: systemPrompt }]
      for (const img of images.slice(0, 5)) {  // máx 5 imagens pra não estourar limite
        content.push({ type: 'image_url', image_url: { url: img } })
      }
      aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content }],
          max_tokens: 800, temperature: 0,
        }),
      })
    } else {
      console.warn('[enrich-candidate] Sem texto e sem imagens')
      return json({ skipped: true, reason: 'PDF sem texto' })
    }
    if (!aiRes.ok) {
      const errBody = await aiRes.text().catch(() => '')
      console.error('[enrich-candidate] OpenAI erro:', aiRes.status)
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
      console.error('[enrich-candidate] Erro parse:', (e as Error).message)
      return json({ error: 'Resposta IA inválida' }, 500)
    }

    const analysis: Record<string, unknown> = {}
    if (parsed.summary) analysis.summary = sanitizeText(parsed.summary as string)
    if (parsed.feedback) {
      analysis.general_analysis = sanitizeText(parsed.feedback as string)
      analysis.feedback = sanitizeText(parsed.feedback as string)
    }

    const skillsArr = Array.isArray(parsed.skills) ? parsed.skills as string[] : []
    // Salvar skills/experience/education TAMBÉM no JSONB analysis — o CandidatePanel lê de lá
    if (skillsArr.length) {
      analysis.skills = skillsArr.map(s => sanitizeText(s))
    }
    if (parsed.experience) analysis.experience = sanitizeText(parsed.experience as string)
    if (parsed.education) analysis.education = sanitizeText(parsed.education as string)

    const updates: Record<string, unknown> = {
      raw_text: sanitizeText(extractedText),
      is_analyzed: true,
      analysis,
    }
    if (skillsArr.length) {
      updates.skills = skillsArr.map(s => sanitizeText(s)).join(', ')
      updates.tags = skillsArr.map((s: string) => sanitizeText(s).toLowerCase())
    }
    const existingExperience = source === 'pool' ? candidate.experience : candidate.experience
    const existingEducation = source === 'pool' ? candidate.education : candidate.education
    if (parsed.experience && !existingExperience) updates.experience = sanitizeText(parsed.experience as string)
    if (parsed.education && !existingEducation) updates.education = sanitizeText(parsed.education as string)

    // Update na tabela certa conforme source
    const tableName = source === 'pool' ? 'vagas_candidaturas' : 'candidates'
    const { error: updateErr } = await supabaseAdmin.from(tableName).update(updates).eq('id', candidateId)
    if (updateErr) {
      console.error('[enrich-candidate] Erro update:', updateErr.message)
      return json({ error: 'Erro ao processar candidato' }, 500)
    }

    console.log('[enrich-candidate] Sucesso:', candidateId, '| skills:', skillsArr.length)
    return json({ success: true, candidateId })

  } catch (err) {
    console.error('[enrich-candidate] Erro geral:', (err as Error).message)
    return json({ error: 'Erro interno' }, 500)
  }
})
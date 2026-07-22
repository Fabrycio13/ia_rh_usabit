import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { buildScoringMessages } from './prompts/scoring.ts'
import { buildJobMatchingMessages } from './prompts/job-matching.ts'
import { buildExtractionMessages } from './prompts/extraction.ts'
import { buildResumeMessages } from './prompts/resume.ts'
import { AI_SYSTEM_PROMPT } from './prompts/chat-system.ts'
import { TEXT_GUARDRAILS } from './prompts/guardrails.ts'
import type { OpenAIMessage } from './prompts/types.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || ''
const DEEPSEEK_BASE_URL = Deno.env.get('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ALLOWED_ROLES = ['rh', 'supervisor', 'administrador', 'gestor', 'owner']
const RATE_LIMIT_MAX = 60
const RATE_LIMIT_WINDOW_MS = 60_000

const ALLOWED_ORIGINS = ['https://rh.usabitspace.com', 'http://localhost:5173', 'http://localhost:4173'];

function getCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': (origin && ALLOWED_ORIGINS.includes(origin)) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  })
}


// ponytail: map operation type to default model
const DEFAULT_MODELS: Record<string, string> = {
  chat: 'gpt-4o-mini',
  scoring: 'gpt-4o',
  'job-matching': 'gpt-4o',
  extraction: 'gpt-4o',
  resume: 'gpt-4o',
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Método não permitido' }, origin)
  }

  // 1. Validar JWT
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return jsonResponse(401, { error: 'Token não fornecido' }, origin)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) {
    return jsonResponse(401, { error: 'Token inválido' }, origin)
  }

  // 2. Verificar role
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (!profile || !ALLOWED_ROLES.includes(profile.user_role)) {
    return jsonResponse(403, { error: 'Permissão insuficiente' }, origin)
  }

  // 3. Rate limit por usuário
  const allowed = await checkRateLimit(
    supabaseAdmin,
    `user:${user.id}`,
    'openai-proxy',
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
  )
  if (!allowed) {
    return jsonResponse(429, { error: 'Muitas requisições. Tente novamente em 1 minuto.' }, origin)
  }

  // 4. Processar requisição OpenAI
  let body: {
    messages?: unknown          // formato antigo (compatibilidade)
    type?: string               // formato novo: 'scoring'|'job-matching'|'extraction'|'chat'|'resume'
    data?: Record<string, unknown>
    model?: string
    max_tokens?: number
    tools?: unknown
    tool_choice?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { error: 'Body JSON inválido' }, origin)
  }

  let messages: OpenAIMessage[]

  // Detectar formato: novo (type) vs antigo (messages)
  if (body.type && body.data) {
    // ── Formato novo: monta prompt server-side ──
    const d = body.data
    try {
      switch (body.type) {
        case 'chat': {
          const conversation = (d.messages as OpenAIMessage[]) || []
          messages = [
            { role: 'system', content: AI_SYSTEM_PROMPT },
            ...conversation,
          ]
          break
        }
        case 'scoring':
          messages = buildScoringMessages(
            d.jobTitle as string,
            d.jobDescription as string,
            (d.currentIndex as number) ?? 1,
            (d.totalCount as number) ?? 1,
            d.fileText as string | undefined,
            d.images as string[] | undefined,
          )
          break
        case 'job-matching':
          messages = buildJobMatchingMessages(
            d.jobTitle as string,
            d.jobDescription as string,
            (d.formAnswers as Record<string, string>) || {},
            d.fileText as string | undefined,
            d.images as string[] | undefined,
          )
          break
        case 'extraction':
          messages = buildExtractionMessages(
            d.fileText as string | undefined,
            d.images as string[] | undefined,
          )
          break
        case 'resume':
          messages = buildResumeMessages(
            d.fileText as string | undefined,
            d.images as string[] | undefined,
          )
          break
        case 'batch-scoring': {
          const candidates = (d.candidates as Array<{ id: string; name: string; rawText: string }>) || []
          const jobTitle = d.jobTitle as string
          const jobDescription = d.jobDescription as string
          const now = new Date().toLocaleString('pt-BR')

          const candidateSection = candidates.map((c, i) => {
            return `## CANDIDATO ${i + 1}: ${c.name}\nID: ${c.id}\nCURRÍCULO:\n${c.rawText}`
          }).join('\n\n---\n\n')

          const prompt = `Você é um recrutador sênior especializado em avaliar candidatos para vagas.

## VAGA
Título: ${jobTitle}
Descrição: ${jobDescription}

## INSTRUÇÕES
Abaixo estão ${candidates.length} candidato(s). Para cada um:

1. Leia o currículo.
2. Avalie a aderência à vaga (0-100).
3. Extraia skills, experiência, formação.
4. Classifique: FORTE (≥70), MÉDIO (40-69), NÃO ADERENTE (<40).

HOJE É: ${now}

## CANDIDATOS
${candidateSection}

${TEXT_GUARDRAILS}

## FORMATO DE SAÍDA (JSON ESTRITO)
Retorne APENAS um array JSON, sem texto adicional:
[
  {
    "candidateId": "ID do candidato",
    "score": número 0-100,
    "classification": "FORTE | MÉDIO | NÃO ADERENTE",
    "skills": ["Skill1", "Skill2"],
    "experience": "X anos e Y meses",
    "education": "Formação1 | Formação2",
    "summary": "2-3 linhas explicando o score",
    "strengths": ["ponto forte 1", "ponto forte 2"],
    "gaps": ["gap 1", "gap 2"],
    "recommendation": "Avançar | Manter em banco | Não recomendado",
    "status": "PROCESSADO | CURRICULO_INCOMPLETO"
  }
]
Mantenha a ORDEM dos candidatos.`;
          messages = [{ role: 'user', content: prompt }]
          break
        }
        default:
          return jsonResponse(400, { error: `Tipo desconhecido: ${body.type}` }, origin)
      }
    } catch (err) {
      return jsonResponse(400, { error: `Erro ao montar prompt: ${(err as Error).message}` }, origin)
    }
  } else if (body.messages && Array.isArray(body.messages)) {
    // ── Formato antigo: compatibilidade ──
    messages = body.messages as OpenAIMessage[]
  } else {
    return jsonResponse(400, { error: 'Envie "messages" (formato antigo) ou "type"+"data" (formato novo)' }, origin)
  }

  const model = body.model || DEFAULT_MODELS[body.type || ''] || 'gpt-4o'
  const max_tokens = body.max_tokens ?? 8192
  const { tools, tool_choice } = body

  const openaiBody: Record<string, unknown> = { model, messages, max_tokens }
  if (tools) openaiBody.tools = tools
  if (tool_choice) openaiBody.tool_choice = tool_choice

  // ponytail: fallback chain — tenta OpenAI primeiro, se der 429/5xx tenta DeepSeek.
  // DeepSeek usa API compatível com OpenAI, só muda a URL base e o modelo.
  async function callProvider(openaiBody: Record<string, unknown>): Promise<{ response: Response; provider: string; model: string }> {
    // 1. Tenta OpenAI
    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(openaiBody),
    })
    if (openaiResp.ok) {
      return { response: openaiResp, provider: 'openai', model: String(openaiBody.model) }
    }

    // 2. Fallback DeepSeek se OpenAI retornar 429 (rate limit) ou 5xx (server error)
    const shouldFallback = openaiResp.status === 429 || openaiResp.status >= 500
    if (!shouldFallback || !DEEPSEEK_API_KEY) {
      return { response: openaiResp, provider: 'openai', model: String(openaiBody.model) }
    }

    console.warn(`[openai-proxy] OpenAI ${openaiResp.status}, fallback para DeepSeek`)

    // Mapeia modelo OpenAI para DeepSeek equivalente
    const deepseekModel = String(openaiBody.model).startsWith('gpt-') ? 'deepseek-chat' : String(openaiBody.model)
    const deepseekBody = { ...openaiBody, model: deepseekModel }

    const deepseekResp = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(deepseekBody),
    })
    return { response: deepseekResp, provider: 'deepseek', model: deepseekModel }
  }

  const response = await callProvider(openaiBody)

  const data = await response.response.json()
  // Marca no response qual provider respondeu (útil pra debug)
  ;(data as Record<string, unknown>)._provider = response.provider
  ;(data as Record<string, unknown>)._model = response.model

  return new Response(JSON.stringify(data), {
    status: response.response.status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  })
})

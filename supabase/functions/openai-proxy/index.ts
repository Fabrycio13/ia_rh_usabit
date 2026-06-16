import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const ALLOWED_ORIGINS = ['https://spacetalent.com.br', 'https://usabit.github.io', 'http://localhost:5173']

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin') || ''
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  const origin = req.headers.get('origin') || ''
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages, model = 'gpt-4o', max_tokens = 8192, tools, tool_choice } = await req.json()

  const openaiBody: Record<string, unknown> = { model, messages, max_tokens }
  if (tools) openaiBody.tools = tools
  if (tool_choice) openaiBody.tool_choice = tool_choice

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(openaiBody),
  })

  const data = await response.json()

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
})
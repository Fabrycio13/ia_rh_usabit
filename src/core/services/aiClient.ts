import { supabase } from './supabase';

const OPENAI_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-proxy`;

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callOpenAI(messages: OpenAIMessage[], model = 'gpt-4o') {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(OPENAI_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ messages, model }),
  });
  if (!response.ok) throw new Error(`OpenAI proxy error: ${response.status}`);
  return response.json();
}
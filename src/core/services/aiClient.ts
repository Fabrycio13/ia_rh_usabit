import { supabase } from './supabase';

const OPENAI_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-proxy`;

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
  tool_call_id?: string;
}

export async function callOpenAI(messages: OpenAIMessage[], model = 'gpt-4o') {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(OPENAI_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ messages, model, max_tokens: 8192 }),
  });
  if (!response.ok) throw new Error(`OpenAI proxy error: ${response.status}`);
  return response.json();
}
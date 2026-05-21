import { supabase } from '../supabase';
import type { OpenAIMessage } from './types';
import { logAI } from './logger';

const OPENAI_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-proxy`;

interface CallOptions {
  model?: string;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callOpenAI(
  messages: OpenAIMessage[],
  options?: CallOptions
) {
  const model = options?.model ?? 'gpt-4o';
  const maxTokens = options?.maxTokens ?? 8192;
  const timeout = options?.timeout ?? 30000;
  const maxRetries = options?.retries ?? 3;

  const { data: { session } } = await supabase.auth.getSession();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const startTime = Date.now();
    try {
      if (attempt > 0) {
        const backoff = attempt === 1 ? 1000 : 4000;
        await new Promise(r => setTimeout(r, backoff));
      }

      const response = await fetchWithTimeout(OPENAI_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ messages, model, max_tokens: maxTokens }),
      }, timeout);

      if (!response.ok) {
        throw new Error(`OpenAI proxy error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("A IA não retornou conteúdo.");

      const outputTokens = data.usage?.completion_tokens ?? 0;

      // Proxy cold-start: se retornou muito poucos tokens (< 30) para um modelo que deveria
      // gerar resposta longa, trata como falha transitória e retenta
      if (outputTokens > 0 && outputTokens < 30 && model !== 'gpt-4o-mini') {
        throw new Error(`Proxy retornou resposta curta (${outputTokens} tokens) — possível cold start`);
      }

      logAI({
        operation: 'scoring',
        success: true,
        latencyMs: Date.now() - startTime,
        model,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens,
      });

      return { content, usage: data.usage };

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      logAI({
        operation: 'scoring',
        success: false,
        latencyMs: Date.now() - startTime,
        model,
        error: lastError.message,
      });

      if (attempt === maxRetries - 1) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error('Falha inesperada na chamada OpenAI');
}

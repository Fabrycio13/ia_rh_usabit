import { supabase } from '../supabase';
import type { OpenAIMessage } from './types';
import { logAI } from './logger';

const OPENAI_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-proxy`;

export async function callOpenAI(
  messages: OpenAIMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    timeout?: number;
    retries?: number;
    operation?: string;
  }
) {
  const model = options?.model ?? 'gpt-4o';
  const maxTokens = options?.maxTokens ?? 8192;
  const timeout = options?.timeout ?? 60000;
  const maxRetries = options?.retries ?? 5;
  const operation = options?.operation ?? 'scoring';

  const { data: { session } } = await supabase.auth.getSession();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const startTime = Date.now();
    try {
      if (attempt > 0) {
        const backoff = attempt === 1 ? 8000 : 15000;
        await new Promise(r => setTimeout(r, backoff));
      }

      const response = await fetch(OPENAI_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ messages, model, max_tokens: maxTokens }),
        signal: AbortSignal.timeout(timeout),
      });

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
        operation,
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
        operation,
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

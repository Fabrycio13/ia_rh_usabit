interface AILogData {
  operation: string;
  success: boolean;
  latencyMs: number;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  error?: string | null;
}

export function logAI(data: AILogData): void {
  const entry = {
    timestamp: new Date().toISOString(),
    ...data,
  };
  console.log('[AI]', JSON.stringify(entry));
}

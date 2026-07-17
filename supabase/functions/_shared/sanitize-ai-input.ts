// Shared sanitizer for AI inputs — same logic as src/core/services/sanitizer.ts
// Prevents prompt injection attacks in Edge Functions

export function sanitizeAIInput(text: string): string {
  if (!text) return ''

  // 1. NFKC normalization (unicode poisoning)
  let clean = text.normalize('NFKC')

  // 2. Remove control chars except \n, \t, \r
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // 3. Known prompt injection patterns (case insensitive)
  const patterns = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|commands|directions|rules)/gi,
    /forget\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|commands|directions|rules)/gi,
    /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|commands|directions|rules)/gi,
    /you\s+(are\s+)?(now|must\s+act\s+as|will\s+act\s+as)\s+/gi,
    /act\s+as\s+if\s+/gi,
    /DAN|do\s+anything\s+now/gi,
    /your\s+(new|primary|main|only)\s+(goal|task|purpose|mission|directive)\s+is/gi,
    /STOP\s+(everything|what\s+you(\'|´)re\s+doing|all\s+previous)/gi,
    /NEW\s+(INSTRUCTIONS|RULES|PROMPT|MODE|TASK)/gi,
    /<|im_start|im_end|im_sep>/gi,
    /system\s*(instruction|prompt|message)/gi,
  ]

  for (const p of patterns) {
    clean = clean.replace(p, '[REMOVIDO]')
  }

  // 4. Strip extremely long repeated chars (flooding)
  clean = clean.replace(/(.)\1{100,}/g, '$1')

  // 5. Limit length
  return clean.slice(0, 32000)
}

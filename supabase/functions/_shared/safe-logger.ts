// safe-logger.ts (Deno / Supabase Edge Functions)
//
// Logger seguro para Supabase Edge Functions. Filtra mensagens brutas
// que possam vazar chaves, tokens ou info de usuário antes de imprimir.
//
// Filosofia:
//  - server-side (console.error vai pro Supabase Logs, não pro browser)
//  - mas mesmo server-side pode ter sessão de admin logada junto, então:
//  - nunca loga: api keys, JWTs inteiros, reset passwords tokens, magic links

const SENSITIVE_PATTERNS = [
    /(?:api|anon|service)[_-]?key/i,
    /bearer\s+[a-z0-9._-]{20,}/i,
    /eyJ[a-z0-9_-]{20,}\.[a-z0-9_-]{20,}\.[a-z0-9_-]{20,}/i, // JWT-like
    /reset[_/-]?(?:password|token|link)/i,
    /invite[_/-]?(?:token|link)/i,
    /magic[_/-]?link/i,
    /password["']?\s*[:=]\s*["'][^"']{6,}/i,
    /authorization:\s*bearer\s+/i,
];

const REPLACEMENT = '[REDACTED]';

/**
 * Sanitiza uma string removendo tokens/api keys/links sensíveis.
 */
function sanitize(raw: string): string {
    let out = raw;
    for (const pattern of SENSITIVE_PATTERNS) {
        out = out.replace(pattern, REPLACEMENT);
    }
    return out;
}

/**
 * Helper de console.error seguro para Edge Functions.
 *
 * @example
 *   safeEdgeError('send-password-reset-email', 'GoTrue falhou', errText);
 */
export function safeEdgeError(scope: string, message: string, detail?: unknown): void {
    const detailStr = typeof detail === 'string'
        ? detail
        : detail instanceof Error
            ? detail.message
            : (() => {
                  try { return JSON.stringify(detail); }
                  catch { return String(detail); }
              })();
    const sanitizedDetail = sanitize(detailStr || '');
    const sanitizedMessage = sanitize(message);
    console.error(`[${scope}] ${sanitizedMessage}`, sanitizedDetail);
}

/**
 * Helper de console.warn seguro.
 */
export function safeEdgeWarn(scope: string, message: string, detail?: unknown): void {
    const detailStr = typeof detail === 'string' ? detail : detail instanceof Error ? detail.message : '';
    console.warn(`[${scope}] ${sanitize(message)}`, sanitize(detailStr || ''));
}

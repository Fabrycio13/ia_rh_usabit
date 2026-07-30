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
    /authorization:\s*Bearer/i,
];

const REPLACEMENT = '[REDACTED]';

/** Normaliza qualquer valor para string, sem lançar erro */
function toString(val: unknown): string {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return '';
    if (val instanceof Error) return val.message;
    try { return JSON.stringify(val); }
    catch { return String(val); }
}

/** Sanitiza uma string removendo tokens/api keys/links sensíveis. */
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
 * Aceita `message` como qualquer tipo (normaliza internamente),
 * `detail` como unknown opcional.
 *
 * @example
 *   safeEdgeError('send-password-reset-email', 'GoTrue falhou', errText);
 *   safeEdgeError('enrich-candidate', 'Erro update', updateErr.message);
 */
export function safeEdgeError(scope: string, message: unknown, detail?: unknown): void {
    const msg = sanitize(toString(message));
    const det = detail !== undefined ? sanitize(toString(detail)) : undefined;
    if (det) {
        console.error(`[${scope}] ${msg}`, det);
    } else {
        console.error(`[${scope}] ${msg}`);
    }
}

/**
 * Helper de console.warn seguro.
 */
export function safeEdgeWarn(scope: string, message: unknown, detail?: unknown): void {
    const msg = sanitize(toString(message));
    const det = detail !== undefined ? sanitize(toString(detail)) : undefined;
    if (det) {
        console.warn(`[${scope}] ${msg}`, det);
    } else {
        console.warn(`[${scope}] ${msg}`);
    }
}

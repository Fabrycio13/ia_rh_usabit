// safeLogger.ts
// Logger seguro para casos onde mensagens internas do servidor
// podem vazar informações sensíveis (ex.: confirma se user existe,
// detalhes de auth, etc.).
//
// Filosofia: nunca logar a mensagem bruta do servidor em ambiente
// público. Em DEV, loga tudo; em PROD, loga só categoria + hint.

const isDev = import.meta.env.DEV;

/**
 * Lista de substrings "seguras" — mensagens que não vazam dados
 * sensíveis e podem ser logadas em qualquer ambiente.
 */
const SAFE_SUBSTRINGS = [
    'invalid login credentials',
    'invalid credentials',
    'invalid_grant',
    'invalid_request',
    'user already registered',
    'signup_disabled',
    'email_address_invalid',
    'over_email_send_rate_limit',
    'rate limit exceeded',
];

/**
 * Sanitiza uma mensagem de erro vinda do backend.
 * - Em DEV: retorna a mensagem original (útil pra debugar).
 * - Em PROD: classifica em categoria genérica + retorna ID curto.
 */
export function sanitizeAuthError(raw: string | null | undefined): string {
    if (!raw) return 'unknown_error';

    const lower = raw.toLowerCase();

    // 1. Mensagens seguras → libera direto
    if (isDev) return raw;
    if (SAFE_SUBSTRINGS.some(s => lower.includes(s))) {
        // Em prod, mesmo assim troca pra mensagem genérica
        return 'Authentication failed';
    }

    // 2. Categorias que vazam info (user enumeration, status de email, etc.)
    if (lower.includes('already') && lower.includes('registered')) {
        return 'Generic auth error'; // vaza enumeração
    }
    if (lower.includes('email') && (lower.includes('not') || lower.includes('invalid'))) {
        return 'Generic auth error';
    }
    if (lower.includes('rate') || lower.includes('limit')) {
        return 'Rate limit reached';
    }
    if (lower.includes('jwt') || lower.includes('token') || lower.includes('apikey')) {
        // Chave/tokens expostos — NUNCA repassar
        return 'Internal auth error';
    }

    // 3. Fallback: nunca repassa a mensagem bruta
    return 'Authentication failed';
}

/**
 * Helper de console.error seguro para a área de auth.
 * Usage:
 *   import { safeAuthError } from '../../core/services/safeLogger';
 *   safeAuthError('[Login] signInWithPassword falhou', error);
 */
export function safeAuthError(scope: string, err: unknown): void {
    let raw = '';
    if (err instanceof Error) {
        raw = err.message;
    } else if (typeof err === 'object' && err !== null && 'message' in err) {
        raw = String((err as { message: unknown }).message);
    } else {
        raw = String(err);
    }
    const safe = sanitizeAuthError(raw);
    if (isDev) {
        console.error(scope, '→ raw:', raw, '| sanitized:', safe);
    } else {
        console.error(scope, '→', safe);
    }
}

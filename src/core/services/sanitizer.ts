/**
 * Filtra termos comuns usados em ataques de Prompt Injection
 */
export function sanitizeAIInput(text: string): string {
    if (!text) return '';
    
    const patterns = [
        /ignore as instruções/gi,
        /ignore logic/gi,
        /ignore previous/gi,
        /ignore all instructions/gi,
        /system prompt/gi,
        /delete all/gi,
        /set admin/gi,
        /output only/gi,
        /você agora é/gi,
        /pare de extrair/gi
    ];
    
    let sanitized = text;
    patterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[REMOVIDO POR SEGURANÇA]');
    });
    
    return sanitized;
}
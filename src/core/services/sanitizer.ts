/**
 * Filtra termos comuns usados em ataques de Prompt Injection
 */
export function sanitizeAIInput(text: string): string {
    if (!text) return '';

    // ponytail: NFKC colapsa homoglyphs (ex: letras cirílicas visualmente idênticas a latinas)
    let sanitized = text.normalize('NFKC');

    // ponytail: remove caracteres de controle e zero-width (usados pra ofuscar patterns)
    sanitized = sanitized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\uFEFF]/g, '');

    const patterns = [
        // Originals (PT/EN)
        /ignore as instruções/gi,
        /ignore logic/gi,
        /ignore previous/gi,
        /ignore all instructions/gi,
        /system prompt/gi,
        /delete all/gi,
        /set admin/gi,
        /output only/gi,
        /você agora é/gi,
        /pare de extrair/gi,
        // Portuguese variants
        /ignor(a|e|ar)\s+(as\s+)?(instruções?|comandos?|regras?|diretrizes)/gi,
        /desconsider(a|e|ar)\s+(as\s+)?(instruções?|comandos?|regras?|tudo|anteriores)/gi,
        /não\s+sig(a|e|ar)\s+(as\s+)?(instruções?|comandos?|regras?)/gi,
        /a\s+partir\s+de\s+agora\s+(você|voce|vc)/gi,
        /daqui\s+em\s+diante\s+(você|voce|vc)/gi,
        /esqueça\s+(tudo|as\s+instruções|o\s+que\s+eu\s+disse)/gi,
        /redefin(a|e|ir)\s+(suas?\s+)?(instruções?|regras?|regras|função)/gi,
        /mude\s+(suas?\s+)?(instruções?|regras?|comportamento|função)/gi,
        /nova\s+(instrução|regra|diretriz|fase)/gi,
        /mostre\s+(o\s+)?(system\s+)?(prompt|instrução|config)/gi,
        /revele\s+(o\s+)?(system\s+)?(prompt|instrução|config)/gi,
        /exiba\s+(o\s+)?(system\s+)?(prompt|instrução|config)/gi,
        /quais\s+são\s+(suas?\s+)?(instruções|regras|diretrizes)/gi,
        /como\s+funciona\s+(o\s+)?(sistema|sistema|seu\s+funcionamento)/gi,
        /você\s+(vai|deve|precisa|tem\s+que)\s+(obedecer|seguir|atender)/gi,
        /a\s+partir\s+de\s+agora\s+(você|voce)\s+(é|será|vai)/gi,
        // English variants
        /disregard\s+(all\s+)?(previous|prior|above|instructions)/gi,
        /ignore\s+(all\s+)?(previous|prior|above|instructions|everything|rules)/gi,
        /forget\s+(all\s+)?(instructions|rules|everything|context)/gi,
        /you\s+(are\s+)?(now|will)\s+(act\s+as|be|become|are)/gi,
        /new\s+(instruction|rule|phase|mode|session)/gi,
        /reveal\s+(your\s+)?(system\s+)?(prompt|instructions)/gi,
        /show\s+(your\s+)?(system\s+)?(prompt|instructions|configuration)/gi,
        /print\s+(your\s+)?(system\s+)?(prompt|instructions)/gi,
        /output\s+(your\s+)?(system\s+)?(prompt|instructions)/gi,
        /what\s+(are\s+)?(your\s+)?(instructions|rules|system\s+prompt)/gi,
        /how\s+(do\s+)?(you\s+)?(work|operate|function)/gi,
        /DAN|jailbreak|bypass\s+(restrictions?|filter|guard)/gi,
        /act\s+as\s+(if\s+you\s+are|though\s+you\s+were)/gi,
        /you\s+don'?t\s+(need|have\s+to)\s+(follow|obey)/gi,
        /override\s+(your\s+)?(instructions|rules|settings)/gi,
        // Delimiters & markdown-based injection (usam formatação pra se passar por instrução do sistema)
        /###\s*(instructions?|regras?|comandos?|system|sistema|nova\s+fase)/gi,
        /---\s*(instructions?|regras?|comandos?|system|sistema)/gi,
        /\[system\]|\[assistant\]|\[user\]|\[instructions?\]/gi,
        /```(instructions?|regras?|comandos?|system)/gi,
        /<\s*(system|assistant|instructions?)\s*>[\s\S]*?<\s*\/\s*(system|assistant|instructions?)\s*>/gi,
        // Ofuscação — base64, hex, HTML entities com palavras-chave
        /(?:base64|hex)\s*(?:decode|decodif|criptograf|encode)?[^.!?\n]*?(?:ignore|instru[çcç][ãa]o|desconsidera|system\s*prompt)/gi,
        /(?:&#\d{2,4};|\\x[0-9a-f]{2}|\\u[0-9a-f]{4}).{0,20}(?:ignore|instru[çcç][ãa]o|regras?)/gi,
    ];

    patterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[REMOVIDO POR SEGURANÇA]');
    });

    return sanitized;
}
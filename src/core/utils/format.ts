// Helper: extrai iniciais de um nome (primeira letra de até 2 palavras).
export function initials(name: string | null | undefined): string {
    if (!name) return '';
    return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

// Helper: cor do score (>=70 verde, >=40 amarelo, <40 vermelho, 0 cinza).
export function scoreColor(score: number | null | undefined): string {
    if (!score) return '#64748b';
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
}

// Helper: formata data ISO em pt-BR. Opções: showTime (adiciona hora), longMonth (mês por extenso).
export function formatDate(iso: string | null | undefined, opts?: { showTime?: boolean; longMonth?: boolean }): string {
    if (!iso) return '-';
    const d = new Date(iso);
    if (opts?.longMonth) {
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    if (opts?.showTime) {
        return d.toLocaleDateString('pt-BR') + ' - ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('pt-BR');
}

// Helper: converte texto de skills em array de chips.
export function parseSkills(raw: string | string[] | null | undefined): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map((s) => s.trim()).filter((s) => s.length > 1);

    const cleaned = raw
        .replace(/experiência em/gi, '')
        .replace(/conhecimento em/gi, '')
        .replace(/domínio de/gi, '')
        .replace(/habilidade em/gi, '')
        .replace(/proficiência em/gi, '');
    const parts = cleaned.split(/,|;|\se\/ou\s|\sou\s|\se\s|\//);
    return parts
        .map((s) => s.replace(/[.]/g, '').trim())
        .filter((s) => s.length > 1 && s.length < 60);
}

// Helper: converte unknown em string legível ou null.
export function toStr(v: unknown): string | null {
    if (v == null) return null;
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
}


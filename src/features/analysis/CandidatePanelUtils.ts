// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface Candidate {
    id: string;
    name: string;
    email: string;
    location: string | null;
    address: string | null;
    age: string | null;
    gender: string | null;
    score: number | null;
    vagas: string[];
    interview_eligible: boolean;
    is_blacklisted?: boolean;
}

export interface Application {
    jobId: string;
    jobName: string;
    score: number;
    appliedAt: string;
    skills?: string | null;
    experience?: string | null;
    education?: string | null;
    redFlags?: string | null;
}

export interface CandidateDetail extends Candidate {
    phone: string | null;
    skills: string | null;
    experience: string | null;
    education: string | null;
    redFlags: string | null;
    applications: Application[];
    pipelineCards?: Array<{ id: string; jobId?: string; jobName?: string; score?: number; pipelineName?: string }>;
    notes: string | null;
    resume_url?: string | null;
    enriched: boolean;
    conversations?: any[];
}

export interface Comment {
    id: string;
    text: string;
    createdAt: string;
    liked: boolean;
    reaction?: string;
    author?: { name: string; avatarUrl?: string; initials: string; };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function initials(name: string) {
    if (!name) return '';
    return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

export function scoreColor(s: number) {
    return s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444';
}

export function formatDate(iso: string) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR');
}

/** Separa qualquer texto de skills em chips individuais */
export function parseSkills(raw: string | null | undefined): string[] {
    if (!raw) return [];
    let cleaned = raw
        .replace(/experiência em/gi, '')
        .replace(/conhecimento em/gi, '')
        .replace(/domínio de/gi, '')
        .replace(/habilidade em/gi, '')
        .replace(/proficiência em/gi, '');
    const parts = cleaned.split(/,|;|\se\/ou\s|\sou\s|\se\s|\//);
    return parts
        .map(s => s.replace(/[.]/g, '').trim())
        .filter(s => s.length > 1 && s.length < 60);
}

export function parseComments(raw: string | null): Comment[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === 'string' && parsed.trim()) {
            return [{ id: Date.now().toString(), text: parsed, createdAt: new Date().toISOString(), liked: false }];
        }
    } catch {
        if (raw.trim()) return [{ id: Date.now().toString(), text: raw, createdAt: new Date().toISOString(), liked: false }];
    }
    return [];
}

export function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    return new Date(iso).toLocaleDateString('pt-BR');
}

export function toStr(v: any): string | null {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
}

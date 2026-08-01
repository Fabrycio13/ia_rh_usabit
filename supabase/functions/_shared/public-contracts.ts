type UnknownRecord = Record<string, unknown>;

export interface PublicJobContext {
    id: string;
    organization_id: string;
}

export interface ResumeContext {
    jobId?: string;
    orgId?: string;
}

export interface InviteProfileContract {
    status: string | null;
    organization_id: string | null;
    user_role: string | null;
}

export interface InviteRequestContract {
    organization_id: string | null;
    user_role: string;
}

const RESUME_BUCKET_PREFIX = 'job-applications/';

export function normalizeResumeStoragePath(value: unknown): string | null {
    if (typeof value !== 'string' || !value.startsWith(RESUME_BUCKET_PREFIX)) return null;

    const path = value.slice(RESUME_BUCKET_PREFIX.length);
    if (!path || path.startsWith('/') || path.includes('://')) return null;

    return path;
}

export function hasPdfMagicBytes(bytes: Uint8Array): boolean {
    return bytes.length >= 4
        && bytes[0] === 0x25
        && bytes[1] === 0x50
        && bytes[2] === 0x44
        && bytes[3] === 0x46;
}

export interface PublicQuestionContract {
    id: string;
    type?: 'text' | 'paragraph' | 'choice';
    options?: string[];
    required?: boolean;
    hasComplementary?: boolean;
}

const LEGACY_ANSWER_KEYS = new Set([
    'portfolio',
    'cep',
    'address',
    'address_number',
    'complement',
]);

function cleanAnswers(value: unknown, questions: PublicQuestionContract[]): UnknownRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    const allowedKeys = new Set(LEGACY_ANSWER_KEYS);
    for (const question of questions) {
        if (!question || typeof question.id !== 'string' || !question.id) continue;
        allowedKeys.add(question.id);
        if (question.hasComplementary) allowedKeys.add(`${question.id}_extra`);
    }

    return Object.fromEntries(
        Object.entries(value as UnknownRecord).filter(([key, answer]) => (
            allowedKeys.has(key)
            && typeof answer === 'string'
            && answer.length <= 5_000
        )),
    );
}

export function buildApplicationInsert(
    input: UnknownRecord,
    job: PublicJobContext,
    questions: PublicQuestionContract[] = [],
): UnknownRecord {
    return {
        vaga_id: job.id,
        organization_id: job.organization_id,
        candidate_name: input.candidate_name,
        candidate_email: input.candidate_email,
        candidate_phone: input.candidate_phone ?? null,
        candidate_location: input.candidate_location ?? null,
        candidate_linkedin: input.candidate_linkedin ?? null,
        candidate_gender: input.candidate_gender ?? null,
        candidate_age: input.candidate_age ?? null,
        resume_url: input.resume_url,
        resume_file_name: input.resume_file_name,
        status: 'pending',
        match_score: 0,
        source: 'public_link',
        answers: cleanAnswers(input.answers, questions),
    };
}

export function buildSpontaneousCandidateInsert(input: UnknownRecord, organizationId: string): UnknownRecord {
    return {
        organization_id: organizationId,
        candidate_email: input.email,
        candidate_name: input.name,
        candidate_phone: input.phone ?? null,
        candidate_location: input.location ?? null,
        candidate_linkedin: input.linkedin ?? null,
        resume_url: input.resume_url,
        resume_file_name: input.resume_file_name,
        candidate_gender: input.gender ?? null,
        candidate_age: input.age == null ? null : String(input.age),
        address: input.address ?? null,
        portfolio: input.portfolio ?? null,
        cep: input.cep ?? null,
        address_number: input.address_number ?? null,
        complement: input.complement ?? null,
        status: 'pending',
        source: 'spontaneous',
        skills: [],
        experience: null,
        education: null,
        analysis: null,
        viewed_at: null,
    };
}

export function isResumePathForContext(path: unknown, context: ResumeContext): boolean {
    if (typeof path !== 'string' || path.includes('..') || path.includes('\\')) return false;

    const parts = path.split('/');
    const fileName = parts[parts.length - 1] ?? '';
    if (!/^[A-Za-z0-9._-]+\.pdf$/i.test(fileName)) return false;

    if (context.jobId) {
        return parts.length === 3
            && parts[0] === 'resumes'
            && parts[1] === context.jobId;
    }

    if (context.orgId) {
        return parts.length === 4
            && parts[0] === 'resumes'
            && parts[1] === 'spontaneous'
            && parts[2] === context.orgId;
    }

    return false;
}

export function filterPublicJob<T extends UnknownRecord>(job: T): UnknownRecord {
    const dto: UnknownRecord = { ...job };

    if (job.show_company_name !== true) {
        dto.company_name = null;
        dto.company_logo = null;
    }

    if (job.has_salary_range !== true) {
        dto.salary_min = null;
        dto.salary_max = null;
    }

    return dto;
}

export function canResendPendingInvite(
    existing: InviteProfileContract,
    requested: InviteRequestContract,
): boolean {
    return existing.status === 'pending'
        && existing.organization_id === requested.organization_id
        && existing.user_role === requested.user_role;
}

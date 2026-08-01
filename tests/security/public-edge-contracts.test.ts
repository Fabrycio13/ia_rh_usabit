import { describe, expect, it } from 'vitest';
import {
    buildApplicationInsert,
    buildSpontaneousCandidateInsert,
    canResendPendingInvite,
    filterPublicJob,
    hasPdfMagicBytes,
    isResumePathForContext,
    normalizeResumeStoragePath,
} from '../../supabase/functions/_shared/public-contracts';

describe('contratos das Edge Functions públicas', () => {
    it('ignora campos internos enviados na candidatura e deriva organização/status no servidor', () => {
        const insert = buildApplicationInsert({
            vaga_id: 'job-1',
            organization_id: 'org-atacante',
            candidate_name: 'Maria',
            candidate_email: 'maria@example.com',
            resume_url: 'resumes/job-1/curriculo.pdf',
            resume_file_name: 'curriculo.pdf',
            status: 'hired',
            match_score: 100,
            source: 'manual_add',
            answers: {
                q1: 'Resposta',
                portfolio: 'https://portfolio.example',
                unknown: 'não deve persistir',
                _ai_analysis: { score: 100 },
            },
        }, {
            id: 'job-1',
            organization_id: 'org-real',
        }, [{ id: 'q1', type: 'text', required: true }]);

        expect(insert).toMatchObject({
            vaga_id: 'job-1',
            organization_id: 'org-real',
            candidate_name: 'Maria',
            candidate_email: 'maria@example.com',
            status: 'pending',
            match_score: 0,
            source: 'public_link',
            answers: {
                q1: 'Resposta',
                portfolio: 'https://portfolio.example',
            },
        });
        expect(insert).not.toHaveProperty('analysis');
    });

    it('ignora vaga e campos internos na candidatura espontânea', () => {
        const insert = buildSpontaneousCandidateInsert({
            email: 'maria@example.com',
            organization_id: 'org-atacante',
            name: 'Maria',
            resume_url: 'resumes/spontaneous/org-real/curriculo.pdf',
            resume_file_name: 'curriculo.pdf',
            vaga_id: 'job-atacante',
            status: 'hired',
            source: 'manual_add',
            skills: ['admin'],
            analysis: { score: 100 },
        }, 'org-real');

        expect(insert).toMatchObject({
            candidate_email: 'maria@example.com',
            organization_id: 'org-real',
            candidate_name: 'Maria',
            status: 'pending',
            source: 'spontaneous',
            skills: [],
            experience: null,
            education: null,
            analysis: null,
        });
        expect(insert).not.toHaveProperty('vaga_id');
        expect(insert).not.toHaveProperty('email');
    });

    it('aceita apenas path PDF vinculado à vaga ou à organização esperada', () => {
        expect(isResumePathForContext('resumes/job-1/file.pdf', { jobId: 'job-1' })).toBe(true);
        expect(isResumePathForContext('resumes/job-2/file.pdf', { jobId: 'job-1' })).toBe(false);
        expect(isResumePathForContext('resumes/spontaneous/org-1/file.pdf', { orgId: 'org-1' })).toBe(true);
        expect(isResumePathForContext('resumes/spontaneous/org-2/file.pdf', { orgId: 'org-1' })).toBe(false);
        expect(isResumePathForContext('resumes/job-1/file.exe', { jobId: 'job-1' })).toBe(false);
        expect(isResumePathForContext('resumes/job-1/../file.pdf', { jobId: 'job-1' })).toBe(false);
    });

    it('normaliza somente paths do bucket de candidaturas', () => {
        expect(normalizeResumeStoragePath('job-applications/resumes/job-1/file.pdf'))
            .toBe('resumes/job-1/file.pdf');
        expect(normalizeResumeStoragePath('resumes/job-1/file.pdf')).toBeNull();
        expect(normalizeResumeStoragePath('other/resumes/job-1/file.pdf')).toBeNull();
        expect(normalizeResumeStoragePath('https://example.com/job-applications/resumes/job-1/file.pdf'))
            .toBeNull();
    });

    it('valida os quatro magic bytes de PDF sem depender de texto ou Range', () => {
        expect(hasPdfMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
        expect(hasPdfMagicBytes(new Uint8Array([0x25, 0x50, 0x44]))).toBe(false);
        expect(hasPdfMagicBytes(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBe(false);
    });

    it('remove empresa e salário quando a vaga configura esses campos como ocultos', () => {
        const dto = filterPublicJob({
            id: 'job-1',
            title: 'Pessoa Desenvolvedora',
            company_name: 'Empresa Secreta',
            company_logo: 'https://example.com/logo.png',
            show_company_name: false,
            salary_min: 10_000,
            salary_max: 20_000,
            has_salary_range: false,
        });

        expect(dto.title).toBe('Pessoa Desenvolvedora');
        expect(dto.company_name).toBeNull();
        expect(dto.company_logo).toBeNull();
        expect(dto.salary_min).toBeNull();
        expect(dto.salary_max).toBeNull();
    });

    it('só permite reenviar convite para perfil pending da mesma organização e role', () => {
        const requested = { organization_id: 'org-1', user_role: 'rh' };

        expect(canResendPendingInvite({ status: 'pending', ...requested }, requested)).toBe(true);
        expect(canResendPendingInvite({ status: 'active', ...requested }, requested)).toBe(false);
        expect(canResendPendingInvite({ status: 'pending', organization_id: 'org-2', user_role: 'rh' }, requested)).toBe(false);
        expect(canResendPendingInvite({ status: 'pending', organization_id: 'org-1', user_role: 'administrador' }, requested)).toBe(false);
    });
});

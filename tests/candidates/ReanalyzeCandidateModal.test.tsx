/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Mock do supabase (builder thenable, mesmo padrão do TalentTransferModal.test) ──
const calls: Array<{ table: string; op: string; args: any[] }> = [];
const mockChain: any = {};
let nextResults: Record<string, any[]> = {};

function makeChain(table: string): any {
    const chain: any = {};
    const track = (op: string) => (...args: any[]) => {
        calls.push({ table, op, args });
        return chain;
    };
    chain.select = track('select');
    chain.eq = track('eq');
    chain.is = track('is');
    chain.in = track('in');
    chain.limit = track('limit');
    chain.order = track('order');
    chain.single = vi.fn(async () => {
        calls.push({ table, op: 'single', args: [] });
        if (chain._result) return chain._result;
        return { data: (nextResults[`${table}:single`] ?? null), error: null };
    });
    chain.maybeSingle = vi.fn(async () => {
        calls.push({ table, op: 'maybeSingle', args: [] });
        if (chain._result) return chain._result;
        return { data: (nextResults[`${table}:maybeSingle`] ?? null), error: null };
    });
    const setWriteResult = (op: string) => (v: any) => {
        calls.push({ table, op, args: [v] });
        const result = nextResults[`${table}:${op}`] ?? { id: op === 'insert' ? 'new-id' : 'master-1' };
        chain._result = { data: result, error: null };
        return chain;
    };
    chain.insert = vi.fn(setWriteResult('insert'));
    chain.update = vi.fn(setWriteResult('update'));
    chain.delete = vi.fn(setWriteResult('delete'));
    chain.then = (onFulfilled?: (v: any) => any) => {
        const result = chain._result ?? { data: (nextResults[`${table}:select`] ?? []), error: null };
        return Promise.resolve(result).then(onFulfilled);
    };
    chain.finally = (cb: () => void) => Promise.resolve(chain._result ?? { data: (nextResults[`${table}:select`] ?? []), error: null }).finally(cb);
    chain.catch = (cb: (e: unknown) => any) => Promise.resolve(chain._result ?? { data: (nextResults[`${table}:select`] ?? []), error: null }).catch(cb);
    return chain;
}

vi.mock('../../src/core/services/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        },
        from: vi.fn((table: string) => makeChain(table)),
        channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })) })),
        removeChannel: vi.fn(),
    },
}));

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

vi.mock('../../src/core/services/jobAnalyzer', () => ({
    analyzeJobApplicationText: vi.fn(async () => ({
        score: 82,
        summary: 'Bom fit com a vaga de Back-end',
        skills: ['Node.js', 'PostgreSQL'],
        experience: '4 anos com Node',
        education: 'Ciência da Computação',
        strengths: ['APIs REST'],
        gaps: ['Sem experiência com AWS'],
        classification: 'FORTE',
    })),
    analyzeJobApplication: vi.fn(async () => ({
        score: 82,
        summary: 'Bom fit com a vaga de Back-end',
        skills: ['Node.js', 'PostgreSQL'],
        experience: '4 anos com Node',
        education: 'Ciência da Computação',
        strengths: ['APIs REST'],
        gaps: ['Sem experiência com AWS'],
        classification: 'FORTE',
    })),
}));

vi.mock('../../src/core/utils/storage', () => ({
    downloadResume: vi.fn(async () => new File(['%PDF'], 'cv.pdf')),
}));

import { ReanalyzeCandidateModal } from '../../src/features/candidates/components/ReanalyzeCandidateModal';

const baseCandidate: any = {
    id: 'master-1',
    name: 'Rhenan Oliveira',
    email: 'rhenan@teste.com',
    phone: '11999990000',
    raw_text: 'Currículo do Rhenan com experiência em Back-end e Node.js suficiente para análise',
    resume_url: 'resumes/job-9/cv.pdf',
    analysis: {
        history: [
            { job_id: 'job-9', job_title: 'Vaga Antiga', job_code: 'VA-09', summary: 'Análise antiga', score: 85 },
        ],
    },
};

const renderModal = () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn(async () => {});
    render(
        <ReanalyzeCandidateModal
            candidate={baseCandidate}
            organizationId="org-1"
            userId="user-1"
            onClose={onClose}
            onSuccess={onSuccess}
        />
    );
    return { onClose, onSuccess };
};

describe('ReanalyzeCandidateModal — history padronizado (regressão "Vaga Desconhecida")', () => {
    beforeEach(() => {
        calls.length = 0;
        nextResults = {};
        vi.clearAllMocks();
    });

    it('grava history com campos PADRONIZADOS job_id/job_title/job_code/summary (o que o CandidateBank lê)', async () => {
        // Vaga disponível para reanálise
        nextResults = {
            'vagas_white_label:select': [
                { id: 'job-2', title: 'Back-end Developer', job_code: 'VA-02', status: 'aberta', pipeline_id: null },
            ],
            'vagas_white_label:single': { description: 'Vaga de Back-end com Node', custom_questions: [] },
        };
        renderModal();

        // Selecionar a vaga na lista
        const vagaOption = await screen.findByText('Back-end Developer');
        fireEvent.click(vagaOption);

        // Iniciar análise
        const analyzeBtn = await screen.findByRole('button', { name: /analisar|reanalisar/i });
        fireEvent.click(analyzeBtn);

        // Confirmar salvamento — botão do step preview
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /adicionar à vaga/i })).toBeInTheDocument();
        });
        const saveBtn = screen.getByRole('button', { name: /adicionar à vaga/i });
        fireEvent.click(saveBtn);

        await waitFor(() => {
            // 1. INSERT em vagas_candidaturas com source talent_bank_reanalysis
            const vcInsert = calls.find(c => c.table === 'vagas_candidaturas' && c.op === 'insert');
            expect(vcInsert).toBeTruthy();
            const vcPayload = vcInsert.args[0] as any;
            expect(vcPayload.source).toBe('talent_bank_reanalysis');
            expect(vcPayload.status).toBe('reviewed');
            expect(vcPayload.candidate_id).toBe('master-1');

            // 2. UPDATE em candidates com history contendo os campos padronizados
            const candUpdate = calls.find(c => c.table === 'candidates' && c.op === 'update');
            expect(candUpdate).toBeTruthy();
            const analysis = (candUpdate.args[0] as any).analysis;
            const newEntry = analysis.history[analysis.history.length - 1];

            // O CandidateBank lê exatamente estes nomes:
            expect(newEntry).toHaveProperty('job_id', 'job-2');
            expect(newEntry).toHaveProperty('job_title', 'Back-end Developer');
            expect(newEntry).toHaveProperty('job_code', 'VA-02');
            expect(newEntry).toHaveProperty('summary', 'Bom fit com a vaga de Back-end');
            expect(newEntry).toHaveProperty('score', 82);
            expect(newEntry).toHaveProperty('type', 'reanalysis');
            // A vaga antiga continua no history (não foi sobrescrita)
            expect(analysis.history[0].job_id).toBe('job-9');
            expect(analysis.history).toHaveLength(2);
        });
    });

    it('preserva history antigo e adiciona nova entrada (não apaga análises anteriores)', async () => {
        nextResults = {
            'vagas_white_label:select': [
                { id: 'job-2', title: 'Back-end Developer', job_code: 'VA-02', status: 'aberta', pipeline_id: null },
            ],
            'vagas_white_label:single': { description: 'Vaga de Back-end com Node', custom_questions: [] },
        };
        renderModal();

        const vagaOption = await screen.findByText('Back-end Developer');
        fireEvent.click(vagaOption);
        const analyzeBtn = await screen.findByRole('button', { name: /analisar|reanalisar/i });
        fireEvent.click(analyzeBtn);
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /adicionar à vaga/i })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: /adicionar à vaga/i }));

        await waitFor(() => {
            const candUpdate = calls.find(c => c.table === 'candidates' && c.op === 'update');
            const analysis = (candUpdate.args[0] as any).analysis;
            expect(analysis.history).toHaveLength(2);
            // Ordem preservada: antiga primeiro, nova por último
            expect(analysis.history[0].job_id).toBe('job-9');
            expect(analysis.history[1].job_id).toBe('job-2');
        });
    });
});

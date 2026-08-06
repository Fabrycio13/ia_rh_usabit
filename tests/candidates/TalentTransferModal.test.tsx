/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock do supabase com builder encadeável que guarda as chamadas
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
    chain.limit = track('limit');
    chain.order = track('order');
    // Terminais: single/maybeSingle resolvem com o resultado configurado
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
    // Escritas retornam o MESMO builder (thenable) — como o supabase-js real,
    // permitindo .insert(...).select().single() e await direto
    const setWriteResult = (op: string) => (v: any) => {
        calls.push({ table, op, args: [v] });
        const result = nextResults[`${table}:${op}`] ?? { id: op === 'insert' ? 'new-master-id' : 'master-1' };
        chain._result = { data: result, error: null };
        return chain;
    };
    chain.insert = vi.fn(setWriteResult('insert'));
    chain.update = vi.fn(setWriteResult('update'));
    chain.delete = vi.fn(setWriteResult('delete'));
    // Thenable: await no builder resolve para { data, error }
    chain.then = (onFulfilled?: (v: any) => any) => {
        const result = chain._result ?? { data: null, error: null };
        return Promise.resolve(result).then(onFulfilled);
    };
    chain.finally = (cb: () => void) => Promise.resolve(chain._result ?? { data: null, error: null }).finally(cb);
    chain.catch = (cb: (e: unknown) => any) => Promise.resolve(chain._result ?? { data: null, error: null }).catch(cb);
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

vi.mock('../../src/core/contexts/UserContext', () => ({
    useUser: () => ({
        profile: {
            userId: 'user-1', userName: 'Admin', firstName: 'Admin',
            email: 'admin@test.com', user_role: 'rh', loaded: true,
            organization_id: 'org-1', organization_name: 'Org Teste',
            isPremium: false, brandName: '', brandColor: '', brandFont: '',
            onboarding_completed: true, notificationsEnabled: false,
            plan: 'active', status: 'active', account_type: 'trial', trial_ends_at: null,
        },
        refetch: vi.fn(),
        updateProfile: vi.fn(),
    }),
}));

vi.mock('../../src/core/services/logger', () => ({
    logActivity: vi.fn(),
    logScreening: vi.fn(),
}));

import { TalentTransferModal } from '../../src/features/candidates/components/TalentTransferModal';

const baseCandidate = {
    id: 'cand-1',
    name: 'Maria Silva',
    email: 'MARIA@Teste.com', // case misto — deve normalizar para maria@teste.com
    phone: '+55 (21) 99999-0000',
    location: 'Rio',
    resume_url: 'resumes/job-1/arquivo.pdf',
    match_score: 85,
};

const baseJob = {
    id: 'job-1',
    title: 'Desenvolvedor React',
    job_code: 'VA-01',
    organization_id: 'org-1',
};

const renderModal = (overrides?: any) => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(
        <TalentTransferModal
            candidate={{ ...baseCandidate, ...overrides?.candidate }}
            job={{ ...baseJob, ...overrides?.job }}
            onClose={onClose}
            onSuccess={onSuccess}
        />
    );
    return { onClose, onSuccess };
};

// Helper: encontrar chamada update em candidates com análise mesclada
function findCandidatesUpdate() {
    return calls.find(c => c.table === 'candidates' && c.op === 'update');
}

// Helper: navega pelo fluxo até disparar a transferência (sem pipeline)
async function clickTransfer() {
    const proceedBtn = await screen.findByRole('button', { name: /sim, prosseguir/i });
    fireEvent.click(proceedBtn);
    const transferBtn = await screen.findByRole('button', { name: /apenas mover para banco de talentos/i });
    fireEvent.click(transferBtn);
}

describe('TalentTransferModal — identidade do master (regressão)', () => {
    beforeEach(() => {
        calls.length = 0;
        nextResults = {};
        vi.clearAllMocks();
    });

    it('busca master por EMAIL NORMALIZADO (lowercase) — não pelo email cru', async () => {
        nextResults = {
            'pipelines:select': [],
            'candidates:maybeSingle': null, // não existe por email
        };
        renderModal();

        // Dispara o fluxo de transferência
        await clickTransfer();

        await waitFor(() => {
            // A busca de existência deve ter usado email_normalizado com o valor NORMALIZADO
            const emailQuery = calls.filter(c => c.table === 'candidates' && c.op === 'eq' && c.args[0] === 'email_normalizado');
            expect(emailQuery.length).toBeGreaterThan(0);
            expect(emailQuery.some(c => c.args[1] === 'maria@teste.com')).toBe(true);
            // Nunca deve buscar pelo email cru com maiúsculas
            expect(emailQuery.some(c => c.args[1] === 'MARIA@Teste.com')).toBe(false);
        });
    });

    it('usa telefone normalizado como FALLBACK quando email não encontra master', async () => {
        nextResults = {
            'pipelines:select': [],
            'candidates:maybeSingle': null, // email não achou
        };
        renderModal();

        await clickTransfer();

        await waitFor(() => {
            // Deve ter buscado por phone_normalizado com só dígitos
            const phoneQuery = calls.filter(c => c.table === 'candidates' && c.op === 'eq' && c.args[0] === 'phone_normalizado');
            expect(phoneQuery.length).toBeGreaterThan(0);
            expect(phoneQuery.some(c => c.args[1] === '5521999990000')).toBe(true);
            // Nunca com o formato cru com parênteses/space
            expect(phoneQuery.some(c => c.args[1] === '+55 (21) 99999-0000')).toBe(false);
        });
    });

    it('cria master NOVO quando email e telefone não encontram nada', async () => {
        nextResults = {
            'pipelines:select': [],
            'candidates:maybeSingle': null, // nem email nem telefone acham
        };
        renderModal();

        await clickTransfer();

        await waitFor(() => {
            const inserts = calls.filter(c => c.table === 'candidates' && c.op === 'insert');
            expect(inserts.length).toBe(1);
            const payload = inserts[0].args[0] as any;
            expect(payload.source).toBe('talent_bank');
            expect(payload.organization_id).toBe('org-1');
            // History começa com o primeiro item
            expect(payload.analysis.history).toHaveLength(1);
            expect(payload.analysis.history[0].job_id).toBe('job-1');
            expect(payload.analysis.history[0].job_title).toBe('Desenvolvedor React');
            expect(payload.analysis.history[0].job_code).toBe('VA-01');
        });
    });

    it('MESCLA history no master existente SEM duplicar a mesma vaga (job_id)', async () => {
        // Master existe com history de 2 vagas, uma delas é a job-1
        nextResults = {
            'pipelines:select': [],
            'candidates:maybeSingle': {
                id: 'master-1',
                analysis: {
                    history: [
                        { job_id: 'job-1', job_title: 'Desenvolvedor React', score: 70 },
                        { job_id: 'job-9', job_title: 'Outra Vaga', score: 55 },
                    ],
                },
            },
            'candidates:single': {
                id: 'master-1',
                analysis: {
                    history: [
                        { job_id: 'job-1', job_title: 'Desenvolvedor React', score: 70 },
                        { job_id: 'job-9', job_title: 'Outra Vaga', score: 55 },
                    ],
                },
            },
            'candidates:update': { id: 'master-1' },
        };
        renderModal();

        await clickTransfer();

        await waitFor(() => {
            const upd = findCandidatesUpdate();
            expect(upd).toBeTruthy();
            const payload = upd.args[0] as any;
            // A job-1 NÃO pode aparecer duplicada: foi substituída pela análise nova
            const job1Entries = payload.analysis.history.filter((h: any) => h.job_id === 'job-1');
            expect(job1Entries).toHaveLength(1);
            // A outra vaga continua preservada
            expect(payload.analysis.history.some((h: any) => h.job_id === 'job-9')).toBe(true);
            // Score novo entrou (85)
            expect(payload.analysis.history.find((h: any) => h.job_id === 'job-1').score).toBe(85);
            expect(payload.analysis.history).toHaveLength(2);
        });
    });
});

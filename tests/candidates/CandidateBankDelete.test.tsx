/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const calls: Array<{ table: string; op: string; args: any[] }> = [];
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
        const result = nextResults[`${table}:${op}`] ?? { id: 'master-1' };
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

vi.mock('../../src/core/contexts/ThemeContext', () => ({
    useTheme: () => ({
        theme: 'dark',
        bgTheme: 'simple',
        setBgTheme: vi.fn(),
        toggleTheme: vi.fn(),
        planetMode: false,
        togglePlanetMode: vi.fn(),
        customPrimaryColor: null,
        setCustomPrimaryColor: vi.fn(),
        customTextColor: null,
        setCustomTextColor: vi.fn(),
    }),
}));

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

vi.mock('../../src/features/analysis/CandidatePanel', () => ({
    CandidatePanel: () => null,
}));

vi.mock('../../src/features/candidates/components/ReanalyzeCandidateModal', () => ({
    ReanalyzeCandidateModal: () => null,
}));

vi.mock('../../src/features/candidates/components/TalentTransferModal', () => ({
    TalentTransferModal: () => null,
}));

import { CandidateBank } from '../../src/pages/candidates/CandidateBank';

describe('CandidateBank — excluir do banco (regressão: não apaga candidaturas, reverte status)', () => {
    beforeEach(() => {
        calls.length = 0;
        nextResults = {};
        vi.clearAllMocks();
    });

    it('ao excluir: faz UPDATE status→reviewed nas candidaturas vinculadas e DEPOIS deleta só o master', async () => {
        // Um candidato na lista do banco
        nextResults = {
            'candidates:select': [
                {
                    id: 'master-1',
                    name: 'Maria Silva',
                    email: 'maria@teste.com',
                    user_role: 'rh',
                    analysis: { history: [] },
                    created_at: '2026-07-01T00:00:00Z',
                },
            ],
        };
        render(<MemoryRouter><CandidateBank /></MemoryRouter>);

        // Abrir o menu de ações do candidato e clicar excluir
        const moreBtn = await screen.findByRole('button', { name: /excluir|delete|remover/i });
        fireEvent.click(moreBtn);

        // Confirmar no modal
        const confirmBtn = await screen.findByRole('button', { name: /sim, excluir/i });
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            // 1. UPDATE em vagas_candidaturas com status reviewed (reverter talent_bank)
            const vcUpdate = calls.find(c => c.table === 'vagas_candidaturas' && c.op === 'update');
            expect(vcUpdate).toBeTruthy();
            expect((vcUpdate.args[0] as any).status).toBe('reviewed');

            // 2. DELETE apenas em candidates (master) — NUNCA em vagas_candidaturas
            const candDelete = calls.filter(c => c.table === 'candidates' && c.op === 'delete');
            const vcDelete = calls.filter(c => c.table === 'vagas_candidaturas' && c.op === 'delete');
            expect(candDelete.length).toBe(1);
            expect(vcDelete.length).toBe(0); // ← regressão: antes apagava as candidaturas junto
        });
    });
});

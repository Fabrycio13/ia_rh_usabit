/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type */
import { describe, it, expect, vi, beforeEach } from 'vitest';

if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = vi.fn(() => ({
        observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
    })) as unknown as typeof globalThis.ResizeObserver;
}

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
});

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockProfile = vi.hoisted(() => ({
    userId: 'u1', loaded: true, organization_id: 'org-1', user_role: 'rh',
    firstName: 'Admin', email: 'admin@test.com',
}));

const mockData = vi.hoisted(() => ({
    vagas_white_label: [] as any[],
    vagas_candidaturas: [] as any[],
}));

vi.mock('../../src/core/services/supabase', () => ({
    supabase: {
        auth: { signOut: vi.fn(), getSession: vi.fn(), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
        from: vi.fn((table: string) => {
            const chain: any = () => chain;
            chain.select = vi.fn(() => chain);
            chain.eq = vi.fn(() => chain);
            chain.or = vi.fn(() => chain);
            chain.in = vi.fn(() => chain);
            chain.order = vi.fn(() => chain);
            chain.range = vi.fn(() => Promise.resolve({ data: [], error: null }));
            chain.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
            chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
            chain.then = (resolve: Function) => resolve({ data: (mockData as any)[table] ?? [], error: null });
            return chain;
        }),
        channel: vi.fn(() => {
            const ch: any = { on: vi.fn(() => ch), subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) };
            return ch;
        }),
        removeChannel: vi.fn(),
    },
}));

vi.mock('../../src/core/contexts/UserContext', () => ({ useUser: () => ({ profile: mockProfile }) }));
vi.mock('../../src/core/contexts/ThemeContext', () => ({ useTheme: () => ({ bgTheme: 'spatial', theme: 'dark' }) }));

import { Dashboard } from '../../src/pages/dashboard/Dashboard';

describe('Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockData.vagas_white_label = [];
        mockData.vagas_candidaturas = [];
    });

    it('renderiza estado vazio quando não há dados', async () => {
        render(<MemoryRouter><Dashboard /></MemoryRouter>);
        expect(await screen.findByText('Nenhuma vaga encontrada')).toBeInTheDocument();
        expect(screen.getByText('Criar Vaga')).toBeInTheDocument();
    });

    it('exibe KPIs com dados mockados', async () => {
        mockData.vagas_white_label = [{ id: 'v1', title: 'Vaga Teste', created_at: '2025-01-02', organization_id: 'org-1' }];
        mockData.vagas_candidaturas = [{ vaga_id: 'v1', match_score: 90 }];

        render(<MemoryRouter><Dashboard /></MemoryRouter>);

        await waitFor(() => {
            expect(screen.getByText('Vagas Totais')).toBeInTheDocument();
            expect(screen.getByText('Candidatos Avaliados')).toBeInTheDocument();
            expect(screen.getByText('Melhores Candidatos')).toBeInTheDocument();
            expect(screen.getByText('Taxa de Aprovação')).toBeInTheDocument();
        });
    });

    it('exibe Dashboard como título principal', async () => {
        render(<MemoryRouter><Dashboard /></MemoryRouter>);
        expect(await screen.findByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Visão geral')).toBeInTheDocument();
    });
});

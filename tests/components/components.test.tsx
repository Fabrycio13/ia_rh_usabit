/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { parseComments, relativeTime } from '../../src/features/analysis/CandidatePanelUtils';

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
});

vi.mock('../../src/core/services/supabase', () => ({
    supabase: {
        auth: { signOut: vi.fn(() => Promise.resolve({ error: null })), getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })),
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            insert: vi.fn(() => ({ error: null, select: vi.fn() })),
        })),
        channel: vi.fn(() => ({
            on: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })),
        })),
        removeChannel: vi.fn(),
    }
}));

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

vi.mock('../../src/core/contexts/UserContext', () => ({
    useUser: () => ({
        profile: {
            userId: 'u1', userName: 'Admin', firstName: 'Admin', avatarUrl: '', initials: 'A',
            email: 'admin@test.com', user_role: 'owner', loaded: true,
            organization_id: 'org-1', isPremium: true, brandName: '', brandColor: '', brandFont: '',
            onboarding_completed: true, notificationsEnabled: false, plan: 'active', status: 'active',
            account_type: 'active', trial_ends_at: null, organization_name: 'Org',
        },
        refetch: vi.fn(),
        updateProfile: vi.fn(),
    }),
}));

vi.mock('../../src/core/contexts/LangContext', () => ({
    useLang: () => ({ lang: 'pt', setLang: vi.fn(), t: (k: string) => k === 'dashboard' ? 'Dashboard' : k === 'vagas' ? 'Vagas' : k === 'candidateBank' ? 'Banco de Talentos' : k }),
    LangProvider: ({ children }: any) => children,
}));

vi.mock('../../src/core/contexts/AnalysisContext', () => ({
    useAnalysis: () => ({ analyzing: false, result: null, error: null, jobName: '', jobDescription: '', setJobDescription: vi.fn(), startAnalysis: vi.fn(), clearAnalysis: vi.fn(), setError: vi.fn(), progress: { current: 0, total: 0 } }),
}));

vi.mock('../../src/core/config/permissions', () => ({
    hasPermission: () => true,
}));

describe('Sidebar', () => {
    beforeEach(() => { vi.clearAllMocks(); for (const k in store) delete store[k]; });

    it('renderiza links de navegação', async () => {
        const { Sidebar } = await import('../../src/layouts/Sidebar');
        render(<MemoryRouter><Sidebar /></MemoryRouter>);
        expect(await screen.findByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Vagas')).toBeInTheDocument();
        expect(screen.getByText('Banco de Talentos')).toBeInTheDocument();
    });
});

describe('CandidatePanelUtils', () => {
    describe('parseComments', () => {
        it('retorna array vazio para null/undefined', () => {
            expect(parseComments(null)).toEqual([]);
            expect(parseComments(undefined)).toEqual([]);
        });

        it('parse JSON array', () => {
            const result = parseComments('[{"text": "Bom candidato"}, {"text": "Agendar entrevista"}]');
            expect(result).toHaveLength(2);
            expect(result[0].text).toBe('Bom candidato');
        });

        it('converte string simples em comentário único', () => {
            const result = parseComments('Candidato promissor');
            expect(result).toHaveLength(1);
            expect(result[0].text).toBe('Candidato promissor');
        });
    });

    describe('relativeTime', () => {
        it('retorna "agora" para timestamp recente', () => {
            expect(relativeTime(new Date().toISOString())).toBe('agora');
        });

        it('retorna minutos para < 1h', () => {
            const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
            expect(relativeTime(fiveMinAgo)).toBe('5min');
        });

        it('retorna horas para < 24h', () => {
            const twoHAgo = new Date(Date.now() - 2 * 3600000).toISOString();
            expect(relativeTime(twoHAgo)).toBe('2h');
        });
    });
});

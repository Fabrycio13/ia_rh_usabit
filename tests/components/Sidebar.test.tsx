import { describe, it, expect, vi, beforeEach } from 'vitest';

const localStorageMock = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() };
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
    mockProfile: { user_role: 'rh', firstName: 'Ana RH', email: 'ana@test.com', isPremium: false, loaded: true, userId: 'u1', avatar: null, initials: 'AR', plan: 'trial' },
    mockLang: { lang: 'pt', setLang: vi.fn(), t: (s: string) => s },
    mockAnalysis: { analyzing: false, progress: { current: 0, total: 0 }, jobName: '' },
    mockSignOut: vi.fn(),
}));

vi.mock('../src/core/services/supabase', () => ({
    supabase: {
        auth: { signOut: mocks.mockSignOut, getSession: vi.fn(), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
        channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })) })),
        removeChannel: vi.fn(),
    },
}));

vi.mock('../src/core/contexts/UserContext', () => ({ useUser: () => ({ profile: mocks.mockProfile }) }));
vi.mock('../src/core/contexts/LangContext', () => ({ useLang: () => mocks.mockLang }));
vi.mock('../src/core/contexts/AnalysisContext', () => ({ useAnalysis: () => mocks.mockAnalysis }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { Sidebar } from '../../src/layouts/Sidebar';

const renderSidebar = () => render(<MemoryRouter><Sidebar onToggleChat={vi.fn()} /></MemoryRouter>);

describe('Sidebar', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('renderiza links de navegação', () => {
        renderSidebar();
        expect(screen.getByRole('link', { name: 'dashboard' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'vagas' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'candidateBank' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Pipeline' })).toBeInTheDocument();
    });

    it('não renderiza link admin para perfil rh', () => {
        renderSidebar();
        expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
    });

    it('mostra nome e email do usuário', () => {
        renderSidebar();
        expect(screen.getByText('Ana RH')).toBeInTheDocument();
        expect(screen.getByText('planTrial')).toBeInTheDocument();
    });

    it('abre dropdown com email ao clicar no card', async () => {
        const user = userEvent.setup();
        renderSidebar();
        await user.click(screen.getByRole('button', { name: /planTrial/i }));
        expect(screen.getByText('ana@test.com')).toBeInTheDocument();
        expect(screen.getByText('logout')).toBeInTheDocument();
    });

    it('renderiza toggle do assistente', () => {
        renderSidebar();
        expect(screen.getByRole('button', { name: 'Assistente IA' })).toBeInTheDocument();
    });
});

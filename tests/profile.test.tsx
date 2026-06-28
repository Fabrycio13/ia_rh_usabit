import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
});

vi.mock('../src/core/services/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } }, error: null })),
            updateUser: vi.fn(() => Promise.resolve({ data: {}, error: null })),
            getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'user-1', user_metadata: {} } } }, error: null })),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
                    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                })),
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
            insert: vi.fn(() => ({ error: null })),
        })),
        storage: {
            from: vi.fn(() => ({
                upload: vi.fn(() => ({ error: null })),
                getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://test.com/avatar.jpg' } })),
            }))
        },
        channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })) })),
        removeChannel: vi.fn(),
    }
}));

vi.mock('react-hot-toast', () => ({
    default: { error: vi.fn(), success: vi.fn() }
}));

vi.mock('../src/core/services/logger', () => ({
    logActivity: vi.fn(() => Promise.resolve())
}));

vi.mock('../src/core/contexts/ThemeContext', () => ({
    useTheme: () => ({ bgTheme: 'spatial', theme: 'dark', toggleTheme: vi.fn(), planetMode: false, setBgTheme: vi.fn(), togglePlanetMode: vi.fn(), customPrimaryColor: null, setCustomPrimaryColor: vi.fn(), customTextColor: null, setCustomTextColor: vi.fn(), customColors: {}, setCustomColors: vi.fn() }),
}));

vi.mock('../src/core/contexts/UserContext', () => ({
    useUser: () => ({
        profile: {
            userId: 'user-1', userName: 'João', avatarUrl: '', user_role: 'rh',
            loaded: true, organization_id: 'org-1', organization_name: 'Empresa',
            brandName: '', brandColor: '', brandFont: '', onboarding_completed: true,
            isPremium: false, plan: 'trial', email: 'joao@test.com', initials: 'J',
            notificationsEnabled: false, status: 'active', account_type: 'trial',
            trial_ends_at: null, firstName: 'João',
        },
        refetch: vi.fn(),
        updateProfile: vi.fn(),
    }),
}));

vi.mock('../src/pages/settings/OwnerPanels', () => ({
    OwnerAdminApiPanel: () => null,
    OwnerAdminPlanPanel: () => null,
}));

vi.mock('../../common/constants/roleDefinitions', () => ({
    roleDefinitions: {},
}));

describe('Configuracoes - Profile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        for (const k in store) delete store[k];
    });

    it('renderiza aba perfil com campos', async () => {
        const { Configuracoes } = await import('../src/pages/settings/Configuracoes');
        render(<MemoryRouter><Configuracoes /></MemoryRouter>);
        expect(await screen.findByText('Informações Pessoais')).toBeInTheDocument();
        expect(screen.getByText('Nome completo')).toBeInTheDocument();
        expect(screen.getByText('E-mail')).toBeInTheDocument();
    });
});

describe('Configuracoes - Password validation', () => {
    function validatePassword(newPass: string, confirmPass: string): string | null {
        if (!newPass) return 'Digite a nova senha.';
        if (newPass !== confirmPass) return 'As senhas não coincidem.';
        if (newPass.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
        return null;
    }

    it('rejeita senha vazia', () => {
        expect(validatePassword('', '')).toBe('Digite a nova senha.');
    });

    it('rejeita senhas que não conferem', () => {
        expect(validatePassword('abc123', 'abc456')).toBe('As senhas não coincidem.');
    });

    it('rejeita senha muito curta', () => {
        expect(validatePassword('12', '12')).toBe('A senha deve ter pelo menos 6 caracteres.');
    });

    it('aceita senha válida', () => {
        expect(validatePassword('nova@123', 'nova@123')).toBeNull();
    });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getVisibleTabs, validatePassword } from '../../src/pages/settings/Configuracoes';

vi.mock('../../src/core/services/supabase', () => {
    const mockSelect = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(() => Promise.resolve({ data: { name: 'Test', email: 'test@test.com', organization_id: 'org-1', organization_name: 'Org' }, error: null })), single: vi.fn(() => Promise.resolve({ data: { id: 'user-1', name: 'Test' }, error: null })) })) }));
    const mockUpdate = vi.fn(() => Promise.resolve({ error: null }));
    return {
        supabase: {
            auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: 'tok' } }, error: null })) },
            from: vi.fn((table: string) => {
                if (table === 'profiles') {
                    return { select: mockSelect, update: mockUpdate, insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null, error: null })) })) })) };
                }
                return { select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })) };
            }),
            storage: { from: vi.fn(() => ({ upload: vi.fn(() => Promise.resolve({ error: null })), getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://ex.com/avatar.jpg' } })) })) },
            channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })) })),
            removeChannel: vi.fn(),
        }
    };
});

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('../../src/core/services/logger', () => ({ logActivity: vi.fn(() => Promise.resolve()) }));

vi.mock('../../src/core/contexts/ThemeContext', () => ({
    useTheme: () => ({
        theme: 'dark', bgTheme: 'simple', bgCustomUrl: '', customPrimaryColor: '', customTextColor: '',
        toggleTheme: vi.fn(), setBgTheme: vi.fn(), setBgCustomUrl: vi.fn(),
        setCustomPrimaryColor: vi.fn(), setCustomTextColor: vi.fn(), resetToDefaults: vi.fn(),
    }),
    ThemeProvider: ({ children }: any) => children,
}));

let mockRole = 'rh';
vi.mock('../../src/core/contexts/UserContext', () => ({
    useUser: () => ({
        profile: {
            userId: 'user-1', userName: 'Usuário', firstName: 'Usuário', avatarUrl: '', initials: 'U',
            email: 'user@test.com', user_role: mockRole, loaded: true,
            organization_id: 'org-1', organization_name: 'Org Teste',
            isPremium: false, brandName: '', brandColor: '', brandFont: '',
            onboarding_completed: true, notificationsEnabled: false,
            plan: 'active', status: 'active', account_type: 'trial', trial_ends_at: null,
        },
        refetch: vi.fn(),
        updateProfile: vi.fn(),
    }),
}));

describe('Configuracoes - abas por role', () => {
    const tabKeys = (role: string) => getVisibleTabs(role).map(t => t.key);

    beforeEach(() => { vi.clearAllMocks(); mockRole = 'rh'; });

    it('abas base visiveis para todos os perfis', () => {
        expect(tabKeys('rh')).toEqual(['perfil', 'seguranca', 'aparencia']);
        expect(tabKeys('administrador')).toEqual(['perfil', 'seguranca', 'aparencia']);
        expect(tabKeys('supervisor')).toEqual(['perfil', 'seguranca', 'aparencia']);
        expect(tabKeys('convidado')).toEqual(['perfil', 'seguranca', 'aparencia']);
    });

    it('owner tem abas extras API e Plano', () => {
        const tabs = tabKeys('owner');
        expect(tabs).toContain('api');
        expect(tabs).toContain('plano');
        expect(tabs).toHaveLength(5);
    });

    it('rh nao tem API nem Plano', () => {
        const tabs = tabKeys('rh');
        expect(tabs).not.toContain('api');
        expect(tabs).not.toContain('plano');
        expect(tabs).toHaveLength(3);
    });

    it('administrador nao tem API nem Plano', () => {
        const tabs = tabKeys('administrador');
        expect(tabs).not.toContain('api');
        expect(tabs).not.toContain('plano');
    });

    it('supervisor nao tem API nem Plano', () => {
        const tabs = tabKeys('supervisor');
        expect(tabs).not.toContain('api');
        expect(tabs).not.toContain('plano');
    });

    it('convidado nao tem API nem Plano', () => {
        const tabs = tabKeys('convidado');
        expect(tabs).not.toContain('api');
        expect(tabs).not.toContain('plano');
    });
});

describe('Configuracoes - senha', () => {
    it('rejeita senha com menos de 12 caracteres', () => {
        expect(validatePassword('12345678901', '12345678901')).toBe('A senha deve ter pelo menos 12 caracteres.');
    });

    it('aceita senha com 12 ou mais caracteres', () => {
        expect(validatePassword('senha-segura', 'senha-segura')).toBeNull();
    });
});

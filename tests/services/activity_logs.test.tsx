/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEq = vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })) }));
const mockOrder = vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) }));

vi.mock('../../src/core/services/supabase', () => ({
    supabase: {
        auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
        from: vi.fn(() => ({
            select: vi.fn(() => ({ eq: mockEq, order: mockOrder })),
        })),
        channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })) })),
        removeChannel: vi.fn(),
    }
}));

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const mockRole = 'owner';
const mockOrgId = 'org-1';
vi.mock('../../src/core/contexts/UserContext', () => ({
    useUser: () => ({
        profile: {
            userId: 'user-1', userName: 'Admin', firstName: 'Admin',
            email: 'admin@test.com', user_role: mockRole, loaded: true,
            organization_id: mockOrgId, organization_name: 'Org Teste',
            isPremium: false, brandName: '', brandColor: '', brandFont: '',
            onboarding_completed: true, notificationsEnabled: false,
            plan: 'active', status: 'active', account_type: 'trial', trial_ends_at: null,
        },
        refetch: vi.fn(),
        updateProfile: vi.fn(),
    }),
}));

import { logActivity, logScreening } from '../../src/core/services/logger';

describe('logger - logActivity', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('logActivity chama supabase.from com tabela activity_logs', async () => {
        const mockFrom = vi.fn(() => ({
            insert: vi.fn(() => Promise.resolve({ error: null })),
        }));
        const supabaseModule = await import('../src/core/services/supabase');
        (supabaseModule.supabase as any).from = mockFrom;

        await logActivity('user-1', 'Fez alterações no perfil', { field: 'nome' }, null, 'org-1');

        expect(mockFrom).toHaveBeenCalledWith('activity_logs');
    });

    it('logScreening chama supabase.from com candidate_screening_logs', async () => {
        const mockFrom = vi.fn(() => ({
            insert: vi.fn(() => Promise.resolve({ error: null })),
        }));
        const supabaseModule = await import('../src/core/services/supabase');
        (supabaseModule.supabase as any).from = mockFrom;

        await logScreening('user-1', 'candidate-1', 'move');

        expect(mockFrom).toHaveBeenCalledWith('candidate_screening_logs');
    });
});

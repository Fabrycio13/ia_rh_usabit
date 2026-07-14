import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Vagas } from '../src/pages/vagas/Vagas';

const mockVagas = [
    { id: 'vaga-1', title: 'Dev Frontend', public_hash: 'abc123', status: 'aberta', is_active: true, is_accepting_applications: true, location: 'Remoto', contract_type: 'clt', application_count: 5, created_at: '2025-01-15T10:00:00Z', organization_id: 'org-456', is_pcd: 'no', is_third_party: false, company_name: null, company_logo: null, show_company_name: true, job_code: 'DEV-001', pipeline_id: null },
    { id: 'vaga-2', title: 'Dev Backend', public_hash: 'def456', status: 'aberta', is_active: true, is_accepting_applications: true, location: 'Híbrido', contract_type: 'pj', application_count: 3, created_at: '2025-02-01T10:00:00Z', organization_id: 'org-456', is_pcd: 'no', is_third_party: false, company_name: null, company_logo: null, show_company_name: true, job_code: 'DEV-002', pipeline_id: null },
];

const makeVagaQuery = (data: unknown) => {
    const queryBase = () => Promise.resolve({ data, error: null });
    const mockOr = vi.fn(() => queryBase());
    const mockOrder = vi.fn(() => ({ or: mockOr, then: undefined }));
    const mockEq = vi.fn(() => ({ order: mockOrder, or: mockOr }));
    const mockSelect = vi.fn(() => ({ eq: mockEq, order: mockOrder, or: mockOr }));
    return { select: mockSelect, mockEq, mockOrder, mockOr };
};

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
});

const mockUpdate = vi.fn(() => Promise.resolve({ error: null }));
const mockDelete = vi.fn(() => Promise.resolve({ error: null }));
const mockFromProfiles = vi.fn(() => ({
    select: vi.fn(() => ({
        eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { user_role: 'rh', organization_id: 'org-456' }, error: null })),
        })),
    })),
}));

let mockFromVagas: ReturnType<typeof vi.fn>;

vi.mock('../src/core/services/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } }, error: null })),
            getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'user-123' } } } })),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        },
        from: vi.fn((table: string) => {
            if (table === 'profiles') return mockFromProfiles();
            return mockFromVagas();
        }),
        channel: vi.fn(() => ({
            on: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })),
        })),
        removeChannel: vi.fn(),
    }
}));

vi.mock('react-hot-toast', () => ({
    default: { error: vi.fn(), success: vi.fn() }
}));

vi.mock('../src/core/services/logger', () => ({
    logActivity: vi.fn(() => Promise.resolve())
}));

vi.mock('../src/core/contexts/LangContext', () => ({
    useLang: () => ({ lang: 'pt', setLang: vi.fn(), t: (s: string) => s }),
}));

describe('Vagas - listagem e gerenciamento', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        for (const k in store) delete store[k];

        const vagasQuery = makeVagaQuery(mockVagas);
        mockFromVagas = vi.fn(() => ({
            select: vagasQuery.select,
            update: mockUpdate,
            delete: mockDelete,
        }));
    });

    it('renderiza lista de vagas', async () => {
        render(<MemoryRouter><Vagas /></MemoryRouter>);
        expect(await screen.findByText('Dev Frontend')).toBeInTheDocument();
        expect(screen.getByText('Dev Backend')).toBeInTheDocument();
    });

    it('altera status para pausada', async () => {
        const user = userEvent.setup();
        render(<MemoryRouter><Vagas /></MemoryRouter>);
        await screen.findByText('Dev Frontend');

        const statusBtns = screen.getAllByRole('button', { name: /Aberta/ });
        const firstStatusBtn = statusBtns.find(b => b.closest('[style*="display: grid"]')) || statusBtns[0];
        await user.click(firstStatusBtn);

        await user.click(screen.getByRole('button', { name: /Pausada/ }));

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'pausada', is_accepting_applications: false })
            );
        });
    });

    it('altera status para fechada', async () => {
        const user = userEvent.setup();
        render(<MemoryRouter><Vagas /></MemoryRouter>);
        await screen.findByText('Dev Frontend');

        const statusBtns = screen.getAllByRole('button', { name: /Aberta/ });
        const firstStatusBtn = statusBtns.find(b => b.closest('[style*="display: grid"]')) || statusBtns[0];
        await user.click(firstStatusBtn);

        await user.click(screen.getByRole('button', { name: /Fechada/ }));

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'fechada', is_accepting_applications: false })
            );
        });
    });

    it('altera status para invisivel', async () => {
        const user = userEvent.setup();
        render(<MemoryRouter><Vagas /></MemoryRouter>);
        await screen.findByText('Dev Frontend');

        const statusBtns = screen.getAllByRole('button', { name: /Aberta/ });
        const firstStatusBtn = statusBtns.find(b => b.closest('[style*="display: grid"]')) || statusBtns[0];
        await user.click(firstStatusBtn);

        await user.click(screen.getByRole('button', { name: /Invisível/ }));

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'invisivel', is_accepting_applications: true })
            );
        });
    });

    it('abre modal de exclusao e confirma', async () => {
        const user = userEvent.setup();
        render(<MemoryRouter><Vagas /></MemoryRouter>);
        await screen.findByText('Dev Frontend');

        const deleteBtn = screen.getAllByRole('button', { name: 'Excluir' })[0];
        await user.click(deleteBtn);

        await screen.findByText('Desativar Vaga?');
        await user.click(screen.getByRole('button', { name: /Sim, Excluir/ }));

        await waitFor(() => {
            expect(mockDelete).toHaveBeenCalled();
        });
    });
});

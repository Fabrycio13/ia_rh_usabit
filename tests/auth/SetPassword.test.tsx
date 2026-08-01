import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
    mockGetSession: vi.fn(),
    mockUpdateUser: vi.fn(),
    mockSignOut: vi.fn(),
    mockFrom: vi.fn(),
    mockMaybeSingle: vi.fn(),
    mockRpc: vi.fn(),
    mockNavigate: vi.fn(),
    mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../src/core/services/supabase', () => ({
    supabase: {
        auth: {
            getSession: mocks.mockGetSession,
            updateUser: mocks.mockUpdateUser,
            signOut: mocks.mockSignOut,
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        },
        from: mocks.mockFrom,
        rpc: mocks.mockRpc,
        channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })) })),
        removeChannel: vi.fn(),
    },
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mocks.mockNavigate };
});

vi.mock('react-hot-toast', () => ({
    default: mocks.mockToast,
}));

import { SetPassword } from '../../src/pages/auth/SetPassword';

const renderSetPassword = () => render(<MemoryRouter><SetPassword /></MemoryRouter>);

describe('SetPassword', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
        mocks.mockUpdateUser.mockResolvedValue({ error: null });
        mocks.mockSignOut.mockResolvedValue({ error: null });
        mocks.mockMaybeSingle.mockResolvedValue({ data: { status: 'active' }, error: null });
        mocks.mockRpc.mockResolvedValue({ data: true, error: null });
        mocks.mockFrom.mockReturnValue({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({ maybeSingle: mocks.mockMaybeSingle })),
            })),
        });
    });

    it('renderiza formulário após carregar sessão', async () => {
        renderSetPassword();
        expect(await screen.findByText('Criar Nova Senha')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Mínimo 12 caracteres')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Repita a nova senha')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /definir senha/i })).toBeInTheDocument();
    });

    it('rejeita senhas que não conferem', async () => {
        const user = userEvent.setup();
        renderSetPassword();
        await screen.findByText('Criar Nova Senha');
        await user.type(screen.getByPlaceholderText('Mínimo 12 caracteres'), 'senha-segura-1');
        await user.type(screen.getByPlaceholderText('Repita a nova senha'), '654321');
        await user.click(screen.getByRole('button', { name: /definir senha/i }));
        expect(await screen.findByText(/as senhas não conferem/i)).toBeInTheDocument();
    });

    it('rejeita senha curta', async () => {
        const user = userEvent.setup();
        renderSetPassword();
        await screen.findByText('Criar Nova Senha');
        await user.type(screen.getByPlaceholderText('Mínimo 12 caracteres'), '12345678901');
        await user.type(screen.getByPlaceholderText('Repita a nova senha'), '12345678901');
        await user.click(screen.getByRole('button', { name: /definir senha/i }));
        expect(await screen.findByText(/pelo menos 12 caracteres/i)).toBeInTheDocument();
    });

    it('chama updateUser com senha correta', async () => {
        const user = userEvent.setup();
        renderSetPassword();
        await screen.findByText('Criar Nova Senha');
        await user.type(screen.getByPlaceholderText('Mínimo 12 caracteres'), 'minha-senha-segura');
        await user.type(screen.getByPlaceholderText('Repita a nova senha'), 'minha-senha-segura');
        await user.click(screen.getByRole('button', { name: /definir senha/i }));
        await waitFor(() => {
            expect(mocks.mockUpdateUser).toHaveBeenCalledWith({ password: 'minha-senha-segura' });
        });
        expect(mocks.mockRpc).not.toHaveBeenCalled();
    });

    it('ativa perfil pending somente pela RPC', async () => {
        mocks.mockMaybeSingle.mockResolvedValue({ data: { status: 'pending' }, error: null });
        const user = userEvent.setup();
        renderSetPassword();
        await screen.findByText('Criar Nova Senha');
        await user.type(screen.getByPlaceholderText('Mínimo 12 caracteres'), 'senha-pending-segura');
        await user.type(screen.getByPlaceholderText('Repita a nova senha'), 'senha-pending-segura');
        await user.click(screen.getByRole('button', { name: /definir senha/i }));

        await waitFor(() => {
            expect(mocks.mockRpc).toHaveBeenCalledWith('activate_my_pending_profile');
        });
        expect(mocks.mockToast.success).toHaveBeenCalled();
    });

    it('bloqueia perfil inactive antes de alterar senha', async () => {
        mocks.mockMaybeSingle.mockResolvedValue({ data: { status: 'inactive' }, error: null });
        renderSetPassword();

        await waitFor(() => {
            expect(mocks.mockSignOut).toHaveBeenCalled();
            expect(mocks.mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
        });
        expect(mocks.mockUpdateUser).not.toHaveBeenCalled();
    });

    it('não mostra sucesso quando a ativação pending falha', async () => {
        mocks.mockMaybeSingle.mockResolvedValue({ data: { status: 'pending' }, error: null });
        mocks.mockRpc.mockResolvedValue({ data: false, error: null });
        const user = userEvent.setup();
        renderSetPassword();
        await screen.findByText('Criar Nova Senha');
        await user.type(screen.getByPlaceholderText('Mínimo 12 caracteres'), 'senha-pending-segura');
        await user.type(screen.getByPlaceholderText('Repita a nova senha'), 'senha-pending-segura');
        await user.click(screen.getByRole('button', { name: /definir senha/i }));

        expect(await screen.findByText(/não foi possível ativar/i)).toBeInTheDocument();
        expect(mocks.mockToast.success).not.toHaveBeenCalled();
    });

    it('mostra erro do updateUser', async () => {
        mocks.mockUpdateUser.mockResolvedValue({ error: { message: 'Token expirado' } });
        const user = userEvent.setup();
        renderSetPassword();
        await screen.findByText('Criar Nova Senha');
        await user.type(screen.getByPlaceholderText('Mínimo 12 caracteres'), 'senha-segura-1');
        await user.type(screen.getByPlaceholderText('Repita a nova senha'), 'senha-segura-1');
        await user.click(screen.getByRole('button', { name: /definir senha/i }));
        expect(await screen.findByText(/não foi possível definir a senha/i)).toBeInTheDocument();
    });

    it('redireciona se não há sessão', async () => {
        mocks.mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
        renderSetPassword();
        await waitFor(() => {
            expect(mocks.mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
        });
    });
});

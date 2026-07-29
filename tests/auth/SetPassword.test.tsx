import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
    mockGetSession: vi.fn(),
    mockUpdateUser: vi.fn(),
    mockSignOut: vi.fn(),
    mockFrom: vi.fn(),
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
        mocks.mockFrom.mockReturnValue({ update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) });
    });

    it('renderiza formulário após carregar sessão', async () => {
        renderSetPassword();
        expect(await screen.findByText('Criar Nova Senha')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Mínimo 6 caracteres')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Repita a nova senha')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /definir senha/i })).toBeInTheDocument();
    });

    it('rejeita senhas que não conferem', async () => {
        const user = userEvent.setup();
        renderSetPassword();
        await screen.findByText('Criar Nova Senha');
        await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), '123456');
        await user.type(screen.getByPlaceholderText('Repita a nova senha'), '654321');
        await user.click(screen.getByRole('button', { name: /definir senha/i }));
        expect(await screen.findByText(/as senhas não conferem/i)).toBeInTheDocument();
    });

    it('rejeita senha curta', async () => {
        const user = userEvent.setup();
        renderSetPassword();
        await screen.findByText('Criar Nova Senha');
        await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), '123');
        await user.type(screen.getByPlaceholderText('Repita a nova senha'), '123');
        await user.click(screen.getByRole('button', { name: /definir senha/i }));
        expect(await screen.findByText(/pelo menos 6 caracteres/i)).toBeInTheDocument();
    });

    it('chama updateUser com senha correta', async () => {
        const user = userEvent.setup();
        renderSetPassword();
        await screen.findByText('Criar Nova Senha');
        await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'minha-senha-segura');
        await user.type(screen.getByPlaceholderText('Repita a nova senha'), 'minha-senha-segura');
        await user.click(screen.getByRole('button', { name: /definir senha/i }));
        await waitFor(() => {
            expect(mocks.mockUpdateUser).toHaveBeenCalledWith({ password: 'minha-senha-segura' });
        });
    });

    it('mostra erro do updateUser', async () => {
        mocks.mockUpdateUser.mockResolvedValue({ error: { message: 'Token expirado' } });
        const user = userEvent.setup();
        renderSetPassword();
        await screen.findByText('Criar Nova Senha');
        await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), '123456');
        await user.type(screen.getByPlaceholderText('Repita a nova senha'), '123456');
        await user.click(screen.getByRole('button', { name: /definir senha/i }));
        // Mensagem genérica (segura) — testa só que o erro aparece
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

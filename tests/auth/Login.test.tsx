import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockResetPassword: vi.fn(),
}));

vi.mock('../../src/core/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.mockSignIn,
      resetPasswordForEmail: mocks.mockResetPassword,
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })) })),
    removeChannel: vi.fn(),
  },
}));

import { Login } from '../../src/pages/auth/Login';

const renderLogin = () => render(<MemoryRouter><Login /></MemoryRouter>);

describe('Login', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renderiza formulário com campos email e senha', () => {
    renderLogin();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('chama signInWithPassword ao submeter', async () => {
    mocks.mockSignIn.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('E-mail'), 'test@test.com');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(mocks.mockSignIn).toHaveBeenCalledWith({ email: 'test@test.com', password: '123456' });
  });

  it('mostra erro do signInWithPassword', async () => {
    mocks.mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } });
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('E-mail'), 'test@test.com');
    await user.type(screen.getByLabelText('Senha'), 'wrong');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('chama resetPasswordForEmail ao clicar Recuperar senha', async () => {
    mocks.mockResetPassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('E-mail'), 'test@test.com');
    await user.click(screen.getByRole('button', { name: /recuperar senha/i }));
    expect(mocks.mockResetPassword).toHaveBeenCalledWith('test@test.com', expect.objectContaining({ redirectTo: expect.any(String) }));
  });

  it('mostra erro se Recuperar senha sem email', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: /recuperar senha/i }));
    expect(await screen.findByText(/insira seu e-mail primeiro/i)).toBeInTheDocument();
  });
});

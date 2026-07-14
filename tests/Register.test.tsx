import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockProfileUpdate: vi.fn(),
}));

vi.mock('../src/core/services/supabase', () => ({
  supabase: {
    auth: {
      signUp: mocks.mockSignUp,
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    })),
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })) })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../src/core/constants/disposableEmails', () => ({
  isDisposableEmail: vi.fn(() => false),
}));

import { Register } from '../src/pages/auth/Register';

const renderRegister = () => render(<MemoryRouter><Register /></MemoryRouter>);

describe('Register', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renderiza formulário com campos nome, email e senhas', () => {
    renderRegister();
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument();
  });

  it('rejeita senhas que não coincidem', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByLabelText('Nome completo'), 'Test User');
    await user.type(screen.getByLabelText('E-mail'), 'test@test.com');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.type(screen.getByLabelText('Confirmar senha'), '654321');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(await screen.findByText(/senhas não coincidem/i)).toBeInTheDocument();
    expect(mocks.mockSignUp).not.toHaveBeenCalled();
  });

  it('chama signUp com dados corretos', async () => {
    mocks.mockSignUp.mockResolvedValue({ data: { session: null }, error: null });
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByLabelText('Nome completo'), 'Test User');
    await user.type(screen.getByLabelText('E-mail'), 'test@test.com');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.type(screen.getByLabelText('Confirmar senha'), '123456');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(mocks.mockSignUp).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: '123456',
      options: expect.objectContaining({
        data: { full_name: 'Test User', name: 'Test User', organization_name: '' },
      }),
    });
  });

  it('mostra erro do signUp', async () => {
    mocks.mockSignUp.mockResolvedValue({ data: null, error: { message: 'Email already registered' } });
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByLabelText('Nome completo'), 'Test User');
    await user.type(screen.getByLabelText('E-mail'), 'existing@test.com');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.type(screen.getByLabelText('Confirmar senha'), '123456');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));
    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
  });
});

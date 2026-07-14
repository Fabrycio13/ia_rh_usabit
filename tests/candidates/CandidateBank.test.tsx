/* eslint-disable @typescript-eslint/no-explicit-any */
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

const queryBuilder = vi.hoisted(() => () => {
  const builder: any = () => builder;
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.range = vi.fn(() => Promise.resolve({ data: [], error: null }));
  builder.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  builder.select = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.delete = vi.fn(() => builder);
  return builder;
});

vi.mock('../../src/core/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: queryBuilder,
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })) })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../../src/core/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    bgTheme: 'simple',
    setBgTheme: vi.fn(),
    toggleTheme: vi.fn(),
    planetMode: false,
    togglePlanetMode: vi.fn(),
    customPrimaryColor: null,
    setCustomPrimaryColor: vi.fn(),
    customTextColor: null,
    setCustomTextColor: vi.fn(),
  }),
}));

vi.mock('../../src/core/contexts/UserContext', () => ({
  useUser: () => ({
    profile: {
      userId: 'user-1', userName: 'Admin', firstName: 'Admin',
      email: 'admin@test.com', user_role: 'rh', loaded: true,
      organization_id: 'org-1', organization_name: 'Org Teste',
      isPremium: false, brandName: '', brandColor: '', brandFont: '',
      onboarding_completed: true, notificationsEnabled: false,
      plan: 'active', status: 'active', account_type: 'trial', trial_ends_at: null,
    },
    refetch: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

vi.mock('../../src/features/analysis/CandidatePanel', () => ({
  CandidatePanel: () => null,
}));

vi.mock('../../src/features/candidates/components/ReanalyzeCandidateModal', () => ({
  ReanalyzeCandidateModal: () => null,
}));

import { CandidateBank } from '../../src/pages/candidates/CandidateBank';

const renderBank = () => render(<MemoryRouter><CandidateBank /></MemoryRouter>);

describe('CandidateBank', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k in store) delete store[k];
  });

  it('renderiza busca e filtros', async () => {
    renderBank();
    expect(await screen.findByPlaceholderText(/buscar/i)).toBeInTheDocument();
    expect(screen.getByText(/todos/i)).toBeInTheDocument();
  });

  it('mostra contagem zerada com dados vazios', async () => {
    renderBank();
    expect(await screen.findByText(/0 candidatos? encontrados?/i)).toBeInTheDocument();
  });

  it('renderiza tabs de filtro', async () => {
    renderBank();
    expect(await screen.findByRole('button', { name: /todos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /candidatos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /blacklist/i })).toBeInTheDocument();
  });
});

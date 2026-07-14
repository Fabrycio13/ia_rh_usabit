import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JobApplication } from '../../src/pages/vagas/JobApplication';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.stubGlobal('import.meta', {
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    BASE_URL: '/',
  }
});

vi.mock('../src/core/services/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://example.com/file.pdf' } }))
      }))
    },
    functions: { invoke: vi.fn() },
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })) }
  }
}));

vi.mock('../src/core/services/jobAnalyzer', () => ({
  analyzeJobApplication: vi.fn(),
  type: {}
}));

vi.mock('../src/core/utils/security', () => ({
  sanitizeHtml: vi.fn((s: string) => s)
}));

describe('JobApplication', () => {
  beforeAll(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        job: {
          id: '123',
          title: 'Vaga Teste',
          company_name: 'Empresa Teste',
          has_location: true,
          location: 'São Paulo, SP',
          work_model: 'Remoto',
          is_accepting_applications: true,
          custom_questions: [
            { id: 'q1', label: 'Pergunta Teste', type: 'paragraph', required: true }
          ]
        }
      })
    });
  });

  it('deve carregar e exibir o título da vaga', async () => {
    render(
      <MemoryRouter initialEntries={['/v/hash-teste/candidatar']}>
        <Routes>
          <Route path="/v/:hash/candidatar" element={<JobApplication />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Vaga Teste')).toBeInTheDocument();
    expect(screen.getByText('Candidate-se à Vaga')).toBeInTheDocument();
  });

  it('deve exibir os steps do formulário', async () => {
    render(
      <MemoryRouter initialEntries={['/v/hash-teste/candidatar']}>
        <Routes>
          <Route path="/v/:hash/candidatar" element={<JobApplication />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('Vaga Teste');
    expect(screen.getByText('Seu nome')).toBeInTheDocument();
    expect(screen.getByText('Contato')).toBeInTheDocument();
    expect(screen.getByText('Currículo')).toBeInTheDocument();
  });
});

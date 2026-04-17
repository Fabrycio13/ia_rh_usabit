import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JobApplication } from '../src/pages/vagas/JobApplication';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock Supabase
vi.mock('../src/core/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: '123',
                title: 'Vaga Teste',
                company_name: 'Empresa Teste',
                has_location: true,
                location: 'São Paulo, SP',
                work_model: 'Remoto',
                is_accepting_applications: true,
                custom_questions: [
                  {
                    id: 'q1',
                    label: 'Pergunta Teste',
                    type: 'paragraph',
                    required: true
                  }
                ]
              },
              error: null
            }))
          }))
        }))
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://example.com/file.pdf' } }))
      }))
    }
  }
}));

describe('JobApplication UI Alignment', () => {
  it('should render the personal info card and custom questions card as separate entities', async () => {
    render(
      <MemoryRouter initialEntries={['/v/hash-teste/candidatar']}>
        <Routes>
          <Route path="/v/:hash/candidatar" element={<JobApplication />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for data to load
    const title = await screen.findByText(/Vaga Teste/i);
    expect(title).toBeInTheDocument();

    // Check personal info header
    expect(screen.getByText('Informações Pessoais')).toBeInTheDocument();
    
    // Check custom questions header
    expect(screen.getByText('Perguntas Adicionais')).toBeInTheDocument();

    // Verification of styles/layout is better done via integration/browser tests,
    // but we can check if the paragraph textarea has the corrected padding style.
    const textarea = await screen.findByPlaceholderText('Sua resposta detalhada');
    const style = window.getComputedStyle(textarea);
    
    // In JSDOM, computed style for paddingLeft might not perfectly reflect React's inline styles 
    // especially with the spread operator, but let's check the element's style property directly.
    expect(textarea.style.paddingLeft).toBe('16px');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { extractCandidateData } from '../../src/core/services/cvAnalyzer';

vi.mock('../../src/core/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } }))
    }
  }
}));

describe('cvAnalyzer - Extração de dados', () => {
  it('deve extrair nome do candidato do texto', async () => {
    const result = await extractCandidateData('Nome: João Silva\nEmail: joao@test.com\nTelefone: 11999999999');
    expect(result.name).toBe('João Silva');
  });

  it('deve retornar email como null se ausente', async () => {
    const result = await extractCandidateData('Nome: João Silva');
    expect(result.email).toBeNull();
  });
});
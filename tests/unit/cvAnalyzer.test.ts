import { describe, it, expect, vi } from 'vitest';
import { extractCandidateData } from '../../src/core/services/cvAnalyzer';

const mockCallOpenAI = vi.hoisted(() => vi.fn());

vi.mock('../../src/core/services/ai/client', () => ({
  callOpenAI: mockCallOpenAI
}));

vi.mock('../../src/core/services/ai/logger', () => ({
  logAI: vi.fn()
}));

describe('cvAnalyzer - Extração de dados', () => {
  it('deve extrair nome do candidato do texto', async () => {
    mockCallOpenAI.mockResolvedValueOnce({
      content: JSON.stringify({
        name: 'João Silva',
        email: 'joao@test.com',
        phone: '11999999999',
        location: 'São Paulo',
        age: '30',
        gender: 'Masculino',
        linkedin: null,
        portfolio: null,
        skills: ['React', 'Node.js', 'TypeScript'],
        experience: '5 anos como desenvolvedor',
        education: 'Ciência da Computação'
      }),
      usage: { prompt_tokens: 50, completion_tokens: 80 }
    });

    const result = await extractCandidateData('Nome: João Silva\nEmail: joao@test.com\nTelefone: 11999999999');
    expect(result.name).toBe('João Silva');
    expect(result.email).toBe('joao@test.com');
  });

  it('deve retornar email como null se ausente', async () => {
    mockCallOpenAI.mockResolvedValueOnce({
      content: JSON.stringify({
        name: 'João Silva',
        phone: null,
        location: null,
        age: null,
        gender: 'Não identificado',
        linkedin: null,
        portfolio: null,
        skills: [],
        experience: 'Não informado',
        education: 'Não informado'
      }),
      usage: { prompt_tokens: 30, completion_tokens: 40 }
    });

    const result = await extractCandidateData('Nome: João Silva');
    expect(result.email).toBeNull();
  });
});

import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/core/services/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [
                    { id: '1', name: 'Vaga Frontend', created_at: '2025-01-01' },
                    { id: '2', name: 'Vaga Backend', created_at: '2025-01-02' },
                ], error: null })),
                ilike: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({ data: [
                        { id: 'c1', name: 'João', email: 'joao@t.com', location: 'SP', score: 85, job_candidates: [] }
                    ], error: null })),
                })),
                eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: { id: 'c1', name: 'João', skills: 'React', experience: '5 anos' }, error: null })),
                })),
            })),
            ilike: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
        })),
    }
}));

describe('aiTools - tool definitions', () => {
    it('toolDefinitions tem 5 tools com nome e descrição', async () => {
        const { toolDefinitions } = await import('../src/core/services/aiTools');
        expect(toolDefinitions).toHaveLength(5);
        toolDefinitions.forEach(t => {
            expect(t.name).toBeTruthy();
            expect(t.description).toBeTruthy();
            expect(t.parameters.type).toBe('OBJECT');
        });
    });

    it('openAiToolDefinitions tem 5 tools com formato OpenAI function calling', async () => {
        const { openAiToolDefinitions } = await import('../src/core/services/aiTools');
        expect(openAiToolDefinitions).toHaveLength(5);
        openAiToolDefinitions.forEach(t => {
            expect(t.type).toBe('function');
            expect(t.function.name).toBeTruthy();
            expect(t.function.description).toBeTruthy();
            expect(t.function.parameters.type).toBe('object');
        });
    });

    it('search_candidates precisa de candidateId em get_candidate_details', async () => {
        const { toolDefinitions } = await import('../src/core/services/aiTools');
        const getDetails = toolDefinitions.find(t => t.name === 'get_candidate_details')!;
        expect(getDetails.parameters.required).toContain('candidateId');
    });
});

describe('aiTools - assistant functions', () => {
    it('list_jobs retorna vagas ordenadas', async () => {
        const { get_assistant_tools } = await import('../src/core/services/aiTools');
        const tools = get_assistant_tools();
        const result = await tools.list_jobs();
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Vaga Frontend');
    });

    it('search_candidates filtra por query', async () => {
        const { get_assistant_tools } = await import('../src/core/services/aiTools');
        const tools = get_assistant_tools();
        const result = await tools.search_candidates({ query: 'João' });
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('João');
    });

    it('get_candidate_details retorna dados do candidato', async () => {
        const { get_assistant_tools } = await import('../src/core/services/aiTools');
        const tools = get_assistant_tools();
        const result = await tools.get_candidate_details({ candidateId: 'c1' });
        expect(result.name).toBe('João');
        expect(result.skills).toBe('React');
    });
});

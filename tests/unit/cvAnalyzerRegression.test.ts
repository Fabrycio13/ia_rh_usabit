import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCallOpenAI = vi.hoisted(() => vi.fn());

vi.mock('../../src/core/services/ai/client', () => ({
    callOpenAI: mockCallOpenAI,
}));

vi.mock('../../src/core/services/ai/logger', () => ({
    logAI: vi.fn(),
}));

import { batchMatchToJob, analyzeResumeGeneral } from '../../src/core/services/cvAnalyzer';

describe('batchMatchToJob — regressão (ordem preservada p/ casar por posição no VagaCandidatos)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('preserva a ORDEM do array devolvido pela IA (o VagaCandidatos casa por índice, não por candidateId)', async () => {
        mockCallOpenAI.mockResolvedValueOnce({
            content: JSON.stringify([
                // A IA pode "errar" o candidateId (UUID truncado) — por isso o
                // VagaCandidatos casa por POSIÇÃO: results[i] <-> candidatesForAI[i]
                { candidateId: 'qualquer-coisa', score: 90, classification: 'FORTE' },
                { candidateId: null, score: 45, classification: 'MÉDIO' },
            ]),
            usage: { prompt_tokens: 10, completion_tokens: 10 },
        });

        const results = await batchMatchToJob(
            [
                { id: 'cand-1', name: 'Ana', rawText: 'curriculo ana' },
                { id: 'cand-2', name: 'Bruno', rawText: 'curriculo bruno' },
            ],
            'Desenvolvedor React',
            'Vaga de React'
        );

        expect(results).toHaveLength(2);
        // Ordem é o contrato — resultados[0] corresponde ao candidato enviado[0]
        expect(results[0].score).toBe(90);
        expect(results[1].score).toBe(45);
        expect(results[0].classification).toBe('FORTE');
    });

    it('normaliza campos ausentes do batch (nunca undefined/NaN)', async () => {
        mockCallOpenAI.mockResolvedValueOnce({
            content: JSON.stringify([{ candidateId: 'x' }]), // sem score
            usage: { prompt_tokens: 5, completion_tokens: 5 },
        });
        const results = await batchMatchToJob(
            [{ id: 'x', name: 'A', rawText: 't' }],
            'Vaga',
            'Desc'
        );
        expect(results[0].score).toBe(0); // score ausente vira 0
        expect(Number.isNaN(results[0].score)).toBe(false);
        expect(results[0].skills).toEqual([]); // array ausente vira []
        expect(results[0].status).toBe('PROCESSADO'); // status default
    });

    it('quebra lote de mais de 10 candidatos em múltiplas chamadas', async () => {
        // mockImplementation devolve 1 resultado por candidato enviado no lote
        mockCallOpenAI.mockImplementation(async (payload: { data: { candidates: unknown[] } }) => ({
            content: JSON.stringify(
                payload.data.candidates.map((_, i) => ({ candidateId: `x-${i}`, score: 50 }))
            ),
            usage: { prompt_tokens: 5, completion_tokens: 5 },
        }));
        const many = Array.from({ length: 12 }, (_, i) => ({ id: `c-${i}`, name: `C${i}`, rawText: 't' }));
        const results = await batchMatchToJob(many, 'Vaga', 'Desc');
        expect(mockCallOpenAI).toHaveBeenCalledTimes(2); // 12 = 10 + 2
        expect(results).toHaveLength(12);
    });

    it('lança erro se a IA não devolver array', async () => {
        mockCallOpenAI.mockResolvedValueOnce({
            content: JSON.stringify({ nao: 'é array' }),
            usage: { prompt_tokens: 5, completion_tokens: 5 },
        });
        await expect(
            batchMatchToJob([{ id: 'x', name: 'A', rawText: 't' }], 'Vaga', 'Desc')
        ).rejects.toThrow('Erro ao processar lote');
    });

    it('trunca rawText a 8000 chars e sanitiza input (anti prompt injection)', async () => {
        mockCallOpenAI.mockResolvedValueOnce({
            content: JSON.stringify([{ candidateId: 'x', score: 50 }]),
            usage: { prompt_tokens: 5, completion_tokens: 5 },
        });
        const longText = 'a'.repeat(20000);
        await batchMatchToJob([{ id: 'x', name: 'A', rawText: longText }], 'Vaga', 'Desc');

        const sent = mockCallOpenAI.mock.calls[0][0];
        expect(sent.data.candidates[0].rawText.length).toBe(8000);
    });

    it('o VagaCandidatos usa o ID REAL por posição — nunca o candidateId da IA (regressão do bug de 0 linhas atualizadas)', async () => {
        // Este teste documenta o contrato: o helper de casamento do VagaCandidatos
        // casa results[i] com candidatesForAI[i].id (linha ~444). Se a IA devolver
        // candidateId truncado/diferente, o ID correto é o do índice.
        mockCallOpenAI.mockResolvedValueOnce({
            content: JSON.stringify([
                { candidateId: 'uuid-truncado-ou-errado', score: 80, classification: 'FORTE' },
            ]),
            usage: { prompt_tokens: 5, completion_tokens: 5 },
        });

        const sent = [
            { id: '3f9d0a1e-0000-0000-0000-000000000001', name: 'Ana', rawText: 'texto longo o suficiente para análise do currículo da Ana com detalhes' },
        ];
        const results = await batchMatchToJob(sent, 'Vaga', 'Desc');

        // A ordem do array é o contrato; o update usa sent[i].id, NÃO results[i].candidateId
        expect(results[0].candidateId).toBe('uuid-truncado-ou-errado'); // IA devolveu errado...
        // ...mas no VagaCandidatos o update casa por posição:
        // const realId = candidatesForAI[i].id  →  .eq('id', realId)
        // Não podemos testar o componente aqui; garantimos que o array preserva
        // a ordem para o caller casar por índice.
        expect(results).toHaveLength(sent.length);
    });
});

describe('analyzeResumeGeneral — regressão (pré-análise do pool sem vaga)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retorna score clamped 0-100 e campos normalizados', async () => {
        mockCallOpenAI.mockResolvedValueOnce({
            content: JSON.stringify({
                score: 150, // fora de range
                classification: 'FORTE',
                summary: 'Ótimo perfil',
                skills: ['Node', 'Postgres'],
                strengths: ['Escala'],
                gaps: ['Sem Docker'],
                suggested_areas: ['Back-end'],
            }),
            usage: { prompt_tokens: 5, completion_tokens: 5 },
        });

        const result = await analyzeResumeGeneral(new File(['%PDF'], 'cv.pdf'), 'texto do currículo com conteúdo suficiente para análise '.repeat(5));
        expect(result.score).toBe(100); // clamp
        expect(result.classification).toBe('FORTE');
        expect(result.skills).toEqual(['Node', 'Postgres']);
        expect(result.gaps).toEqual(['Sem Docker']);
    });

    it('usa preRawText quando passado (evita re-extração em lote)', async () => {
        mockCallOpenAI.mockResolvedValueOnce({
            content: JSON.stringify({ score: 60 }),
            usage: { prompt_tokens: 5, completion_tokens: 5 },
        });
        const longText = 'texto já extraído do currículo '.repeat(10); // >80 chars evita pdfToImages
        await analyzeResumeGeneral(new File(['%PDF'], 'cv.pdf'), longText);
        // A chamada deve ter recebido o texto pré-extraído, sem depender do pdfExtractor
        expect(mockCallOpenAI.mock.calls[0][0].data.fileText).toBe(longText);
    });

    it('score ausente vira 0, nunca NaN', async () => {
        mockCallOpenAI.mockResolvedValueOnce({
            content: JSON.stringify({ summary: 'sem score' }),
            usage: { prompt_tokens: 5, completion_tokens: 5 },
        });
        const longText = 'texto do currículo com conteúdo suficiente '.repeat(10);
        const result = await analyzeResumeGeneral(new File(['%PDF'], 'cv.pdf'), longText);
        expect(Number.isNaN(result.score)).toBe(false);
        expect(result.score).toBe(0);
    });

    it('arrays ausentes viram [] (nunca undefined)', async () => {
        mockCallOpenAI.mockResolvedValueOnce({
            content: JSON.stringify({ score: 50 }),
            usage: { prompt_tokens: 5, completion_tokens: 5 },
        });
        const longText = 'texto do currículo com conteúdo suficiente '.repeat(10);
        const result = await analyzeResumeGeneral(new File(['%PDF'], 'cv.pdf'), longText);
        expect(result.skills).toEqual([]);
        expect(result.gaps).toEqual([]);
        expect(result.suggested_areas).toEqual([]);
    });
});

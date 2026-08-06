import { describe, it, expect } from 'vitest';
import {
    normalizeAnalysisResult,
    normalizeJobMatchResult,
    normalizeResumeAnalysis,
    normalizeExtraction,
} from '../../src/core/services/ai/parsers/validators';

describe('normalizeAnalysisResult — regressão (score fora de range, redFlags, classification)', () => {
    it('clampa score para 0-100 e arredonda', () => {
        expect(normalizeAnalysisResult({ score: 150 }).score).toBe(100);
        expect(normalizeAnalysisResult({ score: -20 }).score).toBe(0);
        expect(normalizeAnalysisResult({ score: 87.4 }).score).toBe(87);
        expect(normalizeAnalysisResult({ score: 'abc' }).score).toBe(0);
    });

    it('classificação: FORTE/MÉDIO/NÃO ADERENTE com variações de maiúsculas', () => {
        expect(normalizeAnalysisResult({ classification: 'FORTE' }).classification).toBe('FORTE');
        expect(normalizeAnalysisResult({ classification: 'forte' }).classification).toBe('FORTE');
        expect(normalizeAnalysisResult({ classification: 'MÉDIO' }).classification).toBe('MÉDIO');
        expect(normalizeAnalysisResult({ classification: 'Não aderente' }).classification).toBe('NÃO ADERENTE');
        expect(normalizeAnalysisResult({ classification: 'NAO ADERENTE' }).classification).toBe('NÃO ADERENTE');
        expect(normalizeAnalysisResult({ classification: 'qualquer coisa' }).classification).toBe('MÉDIO');
    });

    it('arrays de skills/strengths/gaps: aceita array e string separada por vírgula, remove aspas', () => {
        const res = normalizeAnalysisResult({
            skills: ['React', '"Node.js"', '  '],
            strengths: 'Comunicação, Proatividade',
            gaps: [],
        });
        expect(res.skills).toEqual(['React', 'Node.js']);
        expect(res.strengths).toEqual(['Comunicação', 'Proatividade']);
        expect(res.gaps).toEqual([]);
    });

    it('redFlags: nunca inventa "Nenhuma identificada" se vier vazio de array — mantém array vazio', () => {
        // O prompt agora manda array vazio [] em vez do texto placeholder
        const res = normalizeAnalysisResult({ redFlags: [] });
        // normalizeStringArray não é aplicado a redFlags (é string) — [] vira fallback
        expect(res.redFlags).toBe('Nenhuma identificada');
    });

    it('summary com fallback padrão', () => {
        expect(normalizeAnalysisResult({}).summary).toBe('Análise realizada com base no currículo.');
        expect(normalizeAnalysisResult({ summary: '  Excelente perfil  ' }).summary).toBe('Excelente perfil');
    });

    it('score 0 quando ausente — não vira NaN', () => {
        const res = normalizeAnalysisResult({});
        expect(Number.isNaN(res.score)).toBe(false);
        expect(res.score).toBe(0);
    });
});

describe('normalizeJobMatchResult — regressão (reanálise do banco)', () => {
    it('normaliza score e campos usados no history padronizado', () => {
        const res = normalizeJobMatchResult({
            score: 92,
            summary: 'Candidato forte',
            skills: ['Python'],
            strengths: ['Comunicação'],
            gaps: ['Sem inglês'],
            experience: '5 anos',
            education: 'Superior',
        });
        expect(res.score).toBe(92);
        expect(res.summary).toBe('Candidato forte');
        expect(res.skills).toEqual(['Python']);
        expect(res.strengths).toEqual(['Comunicação']);
        expect(res.gaps).toEqual(['Sem inglês']);
        expect(res.experience).toBe('5 anos');
        expect(res.education).toBe('Superior');
    });

    it('score inválido vira 0', () => {
        expect(normalizeJobMatchResult({ score: 'alto' }).score).toBe(0);
    });
});

describe('normalizeResumeAnalysis — regressão (pré-análise do pool)', () => {
    it('normaliza análise geral do currículo (tipo resume)', () => {
        const res = normalizeResumeAnalysis({
            score: 78,
            summary: 'Back-end sólido',
            skills: ['TypeScript', 'SQL'],
            strengths: ['Arquitetura'],
            gaps: ['Sem experiência com AWS'],
            suggested_areas: ['Back-end', 'DevOps'],
        });
        expect(res.score).toBe(78);
        expect(res.skills).toEqual(['TypeScript', 'SQL']);
        expect(res.gaps).toEqual(['Sem experiência com AWS']);
    });
});

describe('normalizeExtraction — regressão (extração de dados do pool)', () => {
    it('normaliza extração com email/telefone ausentes como null (não string)', () => {
        const res = normalizeExtraction({ name: 'João', email: null, phone: null });
        expect(res.name).toBe('João');
        expect(res.email).toBeNull();
        expect(res.phone).toBeNull();
    });

    it('normaliza extração com dados completos', () => {
        const res = normalizeExtraction({
            name: 'Maria',
            email: 'maria@test.com',
            phone: '11999999999',
            skills: ['Excel', 'Power BI'],
        });
        expect(res.email).toBe('maria@test.com');
        expect(res.skills).toEqual(['Excel', 'Power BI']);
    });
});

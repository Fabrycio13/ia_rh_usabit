import * as XLSX from 'xlsx';
import { sanitizeAIInput } from './sanitizer';
import { extractTextFromPDF, pdfToImages } from './pdfExtractor';
import { callOpenAI } from './ai/client';
import { buildExtractionMessages } from './ai/prompts/extraction';
import { buildScoringMessages } from './ai/prompts/scoring';
import { parseJSON } from './ai/parsers';
import { normalizeAnalysisResult, normalizeExtraction } from './ai/parsers/validators';
import { logAI } from './ai/logger';
import type { AnalysisResult, CandidateExtraction } from './ai/types';

export type { CandidateExtraction, AnalysisResult };

function erroExtracao(err: unknown): Error {
    return new Error(`Extraction error: ${(err as Error).message}`);
}

function erroIA(err: unknown): Error {
    return new Error(`AI error: ${(err as Error).message}`);
}

function erroExcel(err: unknown): Error {
    return new Error(`Excel read error: ${(err as Error).message}`);
}

function erroPdf(nomeArquivo: string, err: unknown): Error {
    return new Error(`PDF "${nomeArquivo}" has no extractable text and image analysis failed: ${(err as Error).message}`);
}

/**
 * Extrai dados do candidato de um currículo (sem scoring)
 */
export async function extractCandidateData(
    fileText: string,
    images?: string[],
    lang: 'pt' | 'en' = 'pt'
): Promise<CandidateExtraction> {
    const startTime = Date.now();
    try {
        const sanitizedText = sanitizeAIInput(fileText);
        const messages = buildExtractionMessages(sanitizedText, images, lang);
        const data = await callOpenAI(messages, { retries: 3, timeout: 30000 });
        const parsed = parseJSON<CandidateExtraction>(data.content);
        const normalized = normalizeExtraction(parsed as unknown as Record<string, unknown>);

        logAI({ operation: 'extraction', success: true, latencyMs: Date.now() - startTime });
        return normalized;
    } catch (err: unknown) {
        logAI({ operation: 'extraction', success: false, latencyMs: Date.now() - startTime, error: (err as Error).message });
        console.error('Erro na extração de dados do candidato:', err);
        throw erroExtracao(err);
    }
}

/**
 * Analisa um currículo usando OpenAI (Texto ou Visão) com scoring
 */
export async function analyzeCV(
    jobTitle: string,
    jobDescription: string,
    currentIndex: number,
    totalCount: number,
    fileText?: string,
    images?: string[],
    lang: 'pt' | 'en' = 'pt'
): Promise<AnalysisResult> {
    const startTime = Date.now();
    try {
        const sanitizedText = fileText ? sanitizeAIInput(fileText) : undefined;
        const messages = buildScoringMessages(jobTitle, jobDescription, currentIndex, totalCount, sanitizedText, images, lang);
        const data = await callOpenAI(messages, { retries: 3, timeout: 30000 });
        const parsed = parseJSON<AnalysisResult>(data.content);
        const normalized = normalizeAnalysisResult(parsed as unknown as Record<string, unknown>);

        logAI({ operation: 'scoring', success: true, latencyMs: Date.now() - startTime });
        console.log('[CV Analyzer] Parsed Result:', {
            name: normalized.name,
            skills: normalized.skills,
            skillsIsArray: Array.isArray(normalized.skills),
            skillsLength: normalized.skills.length,
            experience: normalized.experience,
            education: normalized.education,
        });

        return normalized;
    } catch (err: unknown) {
        logAI({ operation: 'scoring', success: false, latencyMs: Date.now() - startTime, error: (err as Error).message });
        console.error('Erro na chamada da OpenAI:', err);
        throw erroIA(err);
    }
}

/**
 * Processa múltiplos arquivos e retorna sucessos e erros
 */
export async function processFiles(
    files: File[],
    jobTitle: string,
    jobDescription: string,
    uploadMode: 'pdf' | 'excel',
    lang: 'pt' | 'en' = 'pt',
    onProgress?: (current: number, total: number) => void,
    onCandidateProcessed?: (result: AnalysisResult, index: number) => Promise<void>,
    onCandidateError?: (error: string, index: number) => void
): Promise<{ candidates: AnalysisResult[], errors: string[] }> {
    const results: AnalysisResult[] = [];
    const errors: string[] = [];

    if (uploadMode === 'excel') {
        try {
            const file = files[0];
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as Record<string, unknown>[];

            const total = data.length;
            for (let i = 0; i < total; i++) {
                const row = data[i];
                const formattedText = `
NOME COMPLETO: ${row['Nome Completo'] || row['Nome'] || 'Não informado'}
EMAIL: ${row['Email'] || row['E-mail'] || 'Não informado'}
WHATSAPP: ${row['WhatsApp'] || row['Celular'] || row['Telefone'] || 'Não informado'}
EXPERIÊNCIA: ${row['Experiência'] || row['Experiencia'] || 'Não informado'}
FORMAÇÃO/EDUCAÇÃO: ${row['Formação/Educação'] || row['Formação'] || row['Educação'] || 'Não informado'}
`.trim();

                try {
                    console.log(`[cvAnalyzer] Analisando linha Excel ${i + 1}/${total}...`);
                    const res = await analyzeCV(jobTitle, jobDescription, i + 1, total, formattedText, undefined, lang);
                    results.push(res);
                    if (onCandidateProcessed) {
                        console.log(`[cvAnalyzer] Chamando callback para linha ${i + 1}`);
                        await onCandidateProcessed(res, i);
                    }
                } catch (e: unknown) {
                    const msg = (e as Error).message || 'Erro desconhecido';
                    errors.push(`Linha ${i + 1}: ${msg}`);
                    if (onCandidateError) onCandidateError(msg, i);
                }
                if (onProgress) onProgress(i + 1, total);
            }
        } catch (err: unknown) {
            throw erroExcel(err);
        }
    } else {
        const total = files.length;
        for (let i = 0; i < total; i++) {
            try {
                const text = await extractTextFromPDF(files[i]);
                let res: AnalysisResult;

                if (!text) {
                    console.log(`[cvAnalyzer] PDF "${files[i].name}" (${i + 1}/${total}) parece imagem. Usando Visão...`);
                    const images = await pdfToImages(files[i]);
                    try {
                        res = await analyzeCV(jobTitle, jobDescription, i + 1, total, undefined, images, lang);
                    } catch (visionErr) {
                        console.warn(`[cvAnalyzer] Visão falhou para "${files[i].name}", sem fallback de texto disponível:`, (visionErr as Error).message);
                        throw erroPdf(files[i].name, visionErr);
                    }
                } else {
                    res = await analyzeCV(jobTitle, jobDescription, i + 1, total, text, undefined, lang);
                }

                results.push(res);
                if (onCandidateProcessed) {
                    await onCandidateProcessed(res, i);
                }
            } catch (err: unknown) {
                console.error(`Erro no arquivo ${files[i].name}:`, err);
                const msg = (err as Error).message || 'Erro desconhecido';
                errors.push(`${files[i].name}: ${msg}`);
                if (onCandidateError) onCandidateError(msg, i);
            }
            if (onProgress) onProgress(i + 1, total);
        }
    }

    return { candidates: results, errors };
}

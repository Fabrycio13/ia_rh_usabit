import { sanitizeAIInput } from './sanitizer';
import { extractTextFromPDF, pdfToImages } from './pdfExtractor';
import { callOpenAI } from './ai/client';
import { buildJobMatchingMessages } from './ai/prompts/job-matching';
import { parseJSON } from './ai/parsers';
import { normalizeJobMatchResult } from './ai/parsers/validators';
import { logAI } from './ai/logger';
import type { JobMatchResult } from './ai/types';

export type { JobMatchResult };

/**
 * Função principal de Análise que processa o PDF (Texto ou Visão) e cruza os dados
 */
export async function analyzeJobApplication(
    file: File,
    jobTitle: string,
    jobDescription: string,
    formAnswers: Record<string, string>
): Promise<JobMatchResult> {
    const startTime = Date.now();
    try {
        const text = await extractTextFromPDF(file);
        let images: string[] = [];

        if (!text || text.length < 80) {
            console.log("[Job Analyzer] PDF sem texto legível detectado, usando Modelo de Visão...");
            images = await pdfToImages(file);
        }

        const sanitizedText = text ? sanitizeAIInput(text) : undefined;
        const sanitizedAnswers = Object.fromEntries(
            Object.entries(formAnswers).map(([k, v]) => [k, sanitizeAIInput(v)])
        );
        const messages = buildJobMatchingMessages(jobTitle, jobDescription, sanitizedAnswers, sanitizedText, images);
        const data = await callOpenAI(messages, { retries: 3, timeout: 30000 });
        const parsed = parseJSON<JobMatchResult>(data.content);
        const normalized = normalizeJobMatchResult(parsed as unknown as Record<string, unknown>);

        logAI({ operation: 'job-matching', success: true, latencyMs: Date.now() - startTime });
        console.log("[Job Analyzer] Resumo do Match:", normalized);

        return normalized;

    } catch (err: unknown) {
        logAI({ operation: 'job-matching', success: false, latencyMs: Date.now() - startTime, error: (err as Error).message });
        console.error('Erro na análise da candidatura:', err);
        throw new Error(`Erro na IA: ${(err as Error).message}`);
    }
}

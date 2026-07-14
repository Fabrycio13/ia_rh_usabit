import { extractTextFromPDF, pdfToImages } from '../pdfExtractor';
import { sanitizeAIInput } from '../sanitizer';
import { callOpenAI } from '../ai/client';
import { buildResumeMessages } from '../ai/prompts/resume';
import { parseJSON } from '../ai/parsers';
import { normalizeResumeAnalysis } from '../ai/parsers/validators';
import { logAI } from '../ai/logger';
import type { ResumeAnalysis } from '../ai/types';

export type { ResumeAnalysis };

export async function analyzeResume(file: File, lang: 'pt' | 'en' = 'pt'): Promise<ResumeAnalysis> {
    const startTime = Date.now();
    try {
        const text = await extractTextFromPDF(file);
        let images: string[] = [];

        if (!text || text.length < 80) {
            console.log("[Resume Analyzer] PDF sem texto legível detectado, usando Modelo de Visão...");
            images = await pdfToImages(file);
        }

        const sanitizedText = text ? sanitizeAIInput(text) : undefined;
        const messages = buildResumeMessages(sanitizedText, images, lang);
        const data = await callOpenAI(messages, { retries: 3, timeout: 30000 });
        const parsed = parseJSON<ResumeAnalysis>(data.content);
        const normalized = normalizeResumeAnalysis(parsed as unknown as Record<string, unknown>);

        logAI({ operation: 'resume', success: true, latencyMs: Date.now() - startTime });
        console.log("[Resume Analyzer] Análise:", normalized);

        return normalized;

    } catch (err: unknown) {
        logAI({ operation: 'resume', success: false, latencyMs: Date.now() - startTime, error: (err as Error).message });
        console.error('Erro na análise do currículo:', err);
        throw new Error(`Erro na IA: ${(err as Error).message}`);
    }
}

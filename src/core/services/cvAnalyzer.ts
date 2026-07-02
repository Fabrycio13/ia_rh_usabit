import * as XLSX from 'xlsx';
import { sanitizeAIInput } from './sanitizer';
import { extractTextFromPDF, pdfToImages } from './pdfExtractor';
import { callOpenAI } from './ai/client';
import { parseJSON } from './ai/parsers';
import { normalizeAnalysisResult, normalizeExtraction } from './ai/parsers/validators';
import { logAI } from './ai/logger';
import type { AnalysisResult, CandidateExtraction } from './ai/types';

export type { CandidateExtraction, AnalysisResult };

// ----- FUNÇÕES NOVAS (POOL OTIMIZADO) -----

/**
 * Extrai texto + dados estruturados de um PDF usando gpt-4o-mini.
 * Retorna raw_text (cache) + extractedData (para salvar no banco).
 */
export async function extractTextAndData(file: File): Promise<{ rawText: string; extractedData: CandidateExtraction }> {
  const startTime = Date.now();
  try {
    const rawText = await extractTextFromPDF(file);
    let images: string[] | undefined;

    if (!rawText || rawText.length < 80) {
      images = await pdfToImages(file);
    }

    const sanitizedText = rawText ? sanitizeAIInput(rawText) : undefined;
    const data = await callOpenAI(
      { type: 'extraction', data: { fileText: sanitizedText, images } },
      { model: 'gpt-4o-mini', retries: 3, timeout: 30000, operation: 'extraction' }
    );
    const parsed = parseJSON<CandidateExtraction>(data.content);
    const normalized = normalizeExtraction(parsed as unknown as Record<string, unknown>);

    return { rawText: rawText || '', extractedData: normalized };
  } catch (err: unknown) {
    logAI({ operation: 'extraction', success: false, latencyMs: Date.now() - startTime, error: (err as Error).message });
    throw new Error(`Erro na extração: ${(err as Error).message}`);
  }
}

export interface BatchMatchResult {
  candidateId: string;
  score: number;
  classification: string;
  skills: string[];
  experience: string;
  education: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  status: string;
}

/**
 * Avalia lote de candidatos contra uma vaga usando gpt-4o.
 * candidates: array com { id, name, rawText } (rawText truncado a 8k char cada)
 * Retorna array de resultados na mesma ordem, cada um com candidateId + score.
 */
export async function batchMatchToJob(
  candidates: Array<{ id: string; name: string; rawText: string }>,
  jobTitle: string,
  jobDescription: string
): Promise<BatchMatchResult[]> {
  const startTime = Date.now();
  const batches: Array<typeof candidates> = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    batches.push(candidates.slice(i, i + BATCH_SIZE));
  }

  const allResults: BatchMatchResult[] = [];

  for (const batch of batches) {
    const sanitizedBatch = batch.map(c => ({
      id: c.id,
      name: sanitizeAIInput(c.name),
      rawText: sanitizeAIInput(c.rawText).slice(0, 8000),
    }));

    const data = await callOpenAI(
      { type: 'batch-scoring', data: { candidates: sanitizedBatch, jobTitle, jobDescription } },
      { model: 'gpt-4o', retries: 3, timeout: 60000, operation: 'batch-scoring' }
    );
    const parsed = parseJSON<BatchMatchResult[]>(data.content);

    if (!Array.isArray(parsed)) {
      throw new Error('batchMatchToJob: resposta não é um array');
    }

    for (const r of parsed) {
      allResults.push({
        candidateId: r.candidateId,
        score: typeof r.score === 'number' ? r.score : 0,
        classification: r.classification || '',
        skills: Array.isArray(r.skills) ? r.skills : [],
        experience: r.experience || '',
        education: r.education || '',
        summary: r.summary || '',
        strengths: Array.isArray(r.strengths) ? r.strengths : [],
        gaps: Array.isArray(r.gaps) ? r.gaps : [],
        recommendation: r.recommendation || '',
        status: r.status || 'PROCESSADO',
      });
    }
  }

  logAI({ operation: 'batch-scoring', success: true, latencyMs: Date.now() - startTime, model: 'gpt-4o' });
  return allResults;
}

/**
 * Extrai dados do candidato de um currículo (sem scoring)
 */
export async function extractCandidateData(
    fileText: string,
    images?: string[]
): Promise<CandidateExtraction> {
    const startTime = Date.now();
    try {
        const sanitizedText = sanitizeAIInput(fileText);
        const data = await callOpenAI(
          { type: 'extraction', data: { fileText: sanitizedText, images } },
          { retries: 3, timeout: 30000, operation: 'extraction' }
        );
        const parsed = parseJSON<CandidateExtraction>(data.content);
        const normalized = normalizeExtraction(parsed as unknown as Record<string, unknown>);

        return normalized;
    } catch (err: unknown) {
        logAI({ operation: 'extraction', success: false, latencyMs: Date.now() - startTime, error: (err as Error).message });
        console.error('Erro na extração de dados do candidato:', err);
        throw new Error(`Erro na extração: ${(err as Error).message}`);
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
    images?: string[]
): Promise<AnalysisResult> {
    const startTime = Date.now();
    try {
        const sanitizedText = fileText ? sanitizeAIInput(fileText) : undefined;
        const data = await callOpenAI(
          { type: 'scoring', data: { jobTitle, jobDescription, currentIndex, totalCount, fileText: sanitizedText, images } },
          { retries: 3, timeout: 30000, operation: 'scoring' }
        );
        const parsed = parseJSON<AnalysisResult>(data.content);
        const normalized = normalizeAnalysisResult(parsed as unknown as Record<string, unknown>);
        console.log('[CV Analyzer] Análise concluída com sucesso');

        return normalized;
    } catch (err: unknown) {
        logAI({ operation: 'scoring', success: false, latencyMs: Date.now() - startTime, error: (err as Error).message });
        console.error('Erro na chamada da OpenAI:', err);
        throw new Error(`Erro na IA: ${(err as Error).message}`);
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
                    const res = await analyzeCV(jobTitle, jobDescription, i + 1, total, formattedText);
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
            throw new Error(`Erro ao ler arquivo Excel: ${(err as Error).message}`);
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
                        res = await analyzeCV(jobTitle, jobDescription, i + 1, total, undefined, images);
                    } catch (visionErr) {
                        console.warn(`[cvAnalyzer] Visão falhou para "${files[i].name}", sem fallback de texto disponível:`, (visionErr as Error).message);
                        throw new Error(`PDF "${files[i].name}" não possui texto extraível e a análise por imagem falhou: ${(visionErr as Error).message}`);
                    }
                } else {
                    res = await analyzeCV(jobTitle, jobDescription, i + 1, total, text);
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

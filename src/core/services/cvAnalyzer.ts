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
    throw new Error('Erro ao processar o currículo. Tente novamente.');
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

export interface ResumeGeneralResult {
  score: number;
  classification: string;
  skills: string[];
  experience: string;
  education: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  suggested_areas: string[];
}

/**
 * Análise GERAL do currículo (sem vaga específica) — tipo 'resume' do proxy.
 * Retorna score, summary, strengths, gaps e suggested_areas. Usada pelo
 * Pool de Talentos para dar uma breve análise ao anexar currículos.
 * @param file Arquivo do currículo
 * @param preRawText Texto já extraído (evita re-extração em fluxos de lote)
 */
export async function analyzeResumeGeneral(file: File, preRawText?: string): Promise<ResumeGeneralResult> {
  const startTime = Date.now();
  try {
    let rawText = preRawText ?? '';
    let images: string[] | undefined;

    if (!rawText) {
      rawText = await extractTextFromPDF(file);
    }
    if (!rawText || rawText.length < 80) {
      images = await pdfToImages(file);
    }

    const sanitizedText = rawText ? sanitizeAIInput(rawText) : undefined;
    const data = await callOpenAI(
      { type: 'resume', data: { fileText: sanitizedText, images } },
      { model: 'gpt-4o', retries: 3, timeout: 60000, operation: 'resume' }
    );
    const parsed = parseJSON<Record<string, unknown>>(data.content);

    const result: ResumeGeneralResult = {
      score: typeof parsed.score === 'number' ? Math.round(Math.min(100, Math.max(0, parsed.score))) : 0,
      classification: String(parsed.classification || ''),
      skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
      experience: String(parsed.experience || ''),
      education: String(parsed.education || ''),
      summary: String(parsed.summary || ''),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps.map(String) : [],
      suggested_areas: Array.isArray(parsed.suggested_areas) ? parsed.suggested_areas.map(String) : [],
    };

    logAI({ operation: 'resume', success: true, latencyMs: Date.now() - startTime, model: 'gpt-4o' });
    return result;
  } catch (err: unknown) {
    logAI({ operation: 'resume', success: false, latencyMs: Date.now() - startTime, error: (err as Error).message });
    throw new Error(`Erro na análise: ${(err as Error).message}`);
  }
}

export interface BatchMatchJobContext {
  responsibilities?: string;
  requirements?: string;
  differentials?: string;
  additionalInfo?: string;
  candidateAnswers?: string;
}

/**
 * Avalia lote de candidatos contra uma vaga usando gpt-4o.
 * candidates: array com { id, name, rawText } (rawText truncado a 8k char cada)
 * Retorna array de resultados na mesma ordem, cada um com candidateId + score.
 */
export async function batchMatchToJob(
  candidates: Array<{ id: string; name: string; rawText: string }>,
  jobTitle: string,
  jobDescription: string,
  jobContext?: BatchMatchJobContext
): Promise<BatchMatchResult[]> {
  const startTime = Date.now();
  const batches: Array<typeof candidates> = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    batches.push(candidates.slice(i, i + BATCH_SIZE));
  }

  const allResults: BatchMatchResult[] = [];

  const batchResults = await Promise.allSettled(
    batches.map(async (batch) => {
      const sanitizedBatch = batch.map(c => ({
        id: c.id,
        name: sanitizeAIInput(c.name),
        rawText: sanitizeAIInput(c.rawText).slice(0, 8000),
      }));
      const data = await callOpenAI(
        { type: 'batch-scoring', data: { candidates: sanitizedBatch, jobTitle, jobDescription, ...(jobContext || {}) } },
        { model: 'gpt-4o', retries: 3, timeout: 60000, operation: 'batch-scoring' }
      );
      const parsed = parseJSON<BatchMatchResult[]>(data.content);
      if (!Array.isArray(parsed)) {
        throw new Error('Erro ao processar lote de candidatos. Tente novamente.');
      }
      return parsed;
    })
  );

  for (const result of batchResults) {
    if (result.status === 'rejected') {
      throw new Error('Erro ao processar lote de candidatos. Tente novamente.');
    }
    for (const r of result.value) {
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
        throw new Error('Erro ao processar o currículo. Tente novamente.');
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
        throw new Error('Erro ao analisar currículo. Tente novamente.');
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
                    errors.push(`Linha ${i + 1}: Erro ao processar candidato`);
                    if (onCandidateError) onCandidateError(msg, i);
                }
                if (onProgress) onProgress(i + 1, total);
            }
        } catch {
            throw new Error('Erro ao ler arquivo Excel. Verifique o formato.');
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
                        throw new Error(`Não foi possível analisar o arquivo "${files[i].name}". Tente outro formato.`);
                    }
                } else {
                    res = await analyzeCV(jobTitle, jobDescription, i + 1, total, text);
                }

                results.push(res);
                if (onCandidateProcessed) {
                    await onCandidateProcessed(res, i);
                }
        } catch (e: unknown) {
                console.error(`Erro no arquivo índice ${i}:`, (e as Error).message);
                errors.push(`${files[i].name}: Erro ao processar arquivo`);
                if (onCandidateError) onCandidateError('Erro ao processar arquivo', i);
            }
            if (onProgress) onProgress(i + 1, total);
        }
    }

    return { candidates: results, errors };
}

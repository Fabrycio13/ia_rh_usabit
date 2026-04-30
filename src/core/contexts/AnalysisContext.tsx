import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { processFiles } from '../services/cvAnalyzer';
import { useUser } from './UserContext';
import toast from 'react-hot-toast';
import { logActivity } from '../services/logger';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface Candidate {
    id: string;
    name: string;
    age: string | null;
    location: string | null;
    gender: string | null;
    email: string | null;
    phone: string | null;
    score: number;
    skills: string | null;
    experience: string | null;
    education: string | null;
    attention_points: string | null;
    source: 'pdf' | 'excel';
    resumeUrl: string | null;
    resume_file_name?: string | null;
    dbId: string | null;
    isBlacklisted?: boolean;
}

export interface AnalysisResult {
    summary: string;
    candidates: Candidate[];
}

interface AnalysisContextType {
    analyzing: boolean;
    progress: { current: number; total: number };
    result: AnalysisResult | null;
    error: string | null;
    jobName: string;
    jobDescription: string;
    setJobDescription: (desc: string) => void;
    startAnalysis: (files: File[], name: string, desc: string, mode: 'pdf' | 'excel') => Promise<void>;
    clearAnalysis: () => void;
    setError: (err: string | null) => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseSkills(raw: string | null | undefined): string[] {
    if (!raw) return [];
    let cleaned = raw
        .replace(/experiência em/gi, '')
        .replace(/conhecimento em/gi, '')
        .replace(/domínio de/gi, '')
        .replace(/habilidade em/gi, '')
        .replace(/proficiência em/gi, '');
    const parts = cleaned.split(/,|;|\se\/ou\s|\sou\s|\se\s|\//);
    return parts
        .map(s => s.replace(/[.]/g, '').trim())
        .filter(s => s.length > 1 && s.length < 60);
}

const cleanEmail = (email: string | null | undefined): string | null => {
    if (!email) return null;
    let cleaned = email.replace(/\s+/g, '').toLowerCase(); // Remove TODOS os espaços
    if (cleaned === 'nãoinformado' || cleaned === 'n/a' || cleaned === 'desconhecido' || cleaned === '—') return null;
    return cleaned;
};

const isMissing = (val: string | null | undefined): boolean => {
    if (!val) return true;
    const v = val.trim().toLowerCase();
    return ['não informado', 'não informado.', 'n/a', 'desconhecido', '—', 'não identificado'].includes(v);
};

/** Normaliza o nome do estado para abreviação padrão (ex: "Minas Gerais" → "MG") */
function normalizeLocation(raw: string | null | undefined): string | null {
    if (!raw) return null;

    // Se for apenas número-UF (ex: 21-RJ), tenta converter o número (DDD) para a capital
    const dddMatch = raw.match(/^(\d{2})-(.+)$/);
    if (dddMatch) {
        const ddd = dddMatch[1];
        const uf = dddMatch[2].toUpperCase();
        if (ddd === '21' || ddd === '22' || ddd === '24') return `Rio de Janeiro-${uf}`;
        if (ddd === '11') return `São Paulo-${uf}`;
        if (ddd === '31') return `Belo Horizonte-${uf}`;
    }

    const stateMap: Record<string, string> = {
        'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
        'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF',
        'Espírito Santo': 'ES', 'Goiás': 'GO', 'Maranhão': 'MA',
        'Mato Grosso do Sul': 'MS', 'Mato Grosso': 'MT', 'Minas Gerais': 'MG',
        'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR', 'Pernambuco': 'PE',
        'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
        'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR',
        'Santa Catarina': 'SC', 'São Paulo': 'SP', 'Sergipe': 'SE',
        'Tocantins': 'TO',
    };

    let result = raw;

    // Corrige "-Brasil" -> "-RJ" (assumindo RJ como padrão se vier de DDD 21/22 ou mantendo se já tiver UF)
    result = result.replace(/-Brasil$/i, '');

    for (const [fullName, abbr] of Object.entries(stateMap)) {
        result = result.replace(new RegExp(`[,\\-]?\\s*${fullName}\\s*$`, 'i'), `-${abbr}`);
    }

    // Se a string não tiver hífen e for um dos estados, adiciona o hífen e a cidade capital fictícia ou apenas UF
    // Mas o ideal é que a IA já envie Cidade-UF. 

    result = result.replace(/--+/g, '-').replace(/\s*-\s*/g, '-').trim();

    // Fallback: se terminar em "Brasil", tenta inferir a UF ou remove
    if (result.endsWith('-Brasil')) {
        result = result.replace('-Brasil', '-RJ'); // Fallback agressivo para o caso do usuário
    }

    return result;
}

export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile } = useUser();
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [jobName, setJobName] = useState('');
    const [jobDescription, setJobDescription] = useState('');

    // Persistence: load state on mount
    React.useEffect(() => {
        const stored = localStorage.getItem('active_analysis');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.result) setResult(data.result);
                if (data.analyzing) setAnalyzing(data.analyzing);
                if (data.progress) setProgress(data.progress);
                if (data.jobName) setJobName(data.jobName);
                if (data.jobDescription) setJobDescription(data.jobDescription);
                if (data.error) setError(data.error);
            } catch (e) {
                localStorage.removeItem('active_analysis');
            }
        }
    }, []);

    // Persistence: save state on changes
    React.useEffect(() => {
        if (analyzing || result || error || jobName) {
            localStorage.setItem('active_analysis', JSON.stringify({
                analyzing, progress, jobName, jobDescription, result, error
            }));
        } else {
            localStorage.removeItem('active_analysis');
        }
    }, [analyzing, progress, jobName, jobDescription, result, error]);

    const clearAnalysis = useCallback(() => {
        setResult(null);
        setError(null);
        setAnalyzing(false);
        setProgress({ current: 0, total: 0 });
        setJobName('');
        setJobDescription('');
        localStorage.removeItem('active_analysis');
    }, []);

    const startAnalysis = async (files: File[], name: string, desc: string, mode: 'pdf' | 'excel') => {
        setAnalyzing(true);
        setError(null);
        setResult(null);
        setJobName(name);
        setJobDescription(desc);
        setProgress({ current: 0, total: mode === 'pdf' ? files.length : 0 });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada. Faça login novamente.');

            const batchId = crypto.randomUUID();
            console.log(`[Analysis] Iniciando análise de lote: ${batchId}`);
            
            // Log de início - sem await para não travar a UI se o logger demorar
            logActivity(session.user.id, `Criou e iniciou análise da vaga: "${name}"`, { mode, files_count: files.length }).catch(console.error);

            // 1. Criar a vaga IMEDIATAMENTE antes de começar o processamento
            const { data: jobData, error: jobError } = await supabase
                .from('jobs')
                .insert({
                    user_id: session.user.id,
                    organization_id: profile.organization_id,
                    name: name,
                    description: desc,
                    filters: { total: mode === 'pdf' ? files.length : 0 },
                    upload_mode: mode,
                    batch_id: batchId
                })
                .select()
                .single();

            if (jobError || !jobData) {
                const msg = jobError ? jobError.message : 'Não foi possível criar o registro da vaga no banco de dados.';
                throw new Error(`Erro ao criar registro da análise: ${msg}`);
            }


            // 2. Processar arquivos chamando a IA e salvando NO BANCO UM POR UM
            const processResult = await processFiles(
                files,
                name,
                desc,
                mode,
                (current, total) => setProgress({ current, total }),
                async (c, idx) => {
                    // --- Este código roda para CADA CURRÍCULO assim que a IA termina ---
                    console.log(`[Analysis] IA processou candidato ${idx + 1}: ${c.name}`);
                    try {
                        // Limpeza e normalização básica
                        const cleanName = c.name.trim();
                        const normalizedName = cleanName.toLowerCase().replace(/\s+/g, ' ');

                        let resumeUrl: string | null = null;
                        let uploadId: string | null = null;

                        // Se for PDF, faz upload agora
                        if (mode === 'pdf' && files[idx]) {
                            const file = files[idx];
                            console.log(`[Analysis] Fazendo upload do arquivo: ${file.name}`);
                            const path = `${session.user.id}/${Date.now()}-${idx}-${file.name.replace(/\s+/g, '_')}`;
                            const { error: uploadError } = await supabase.storage.from('resumes').upload(path, file, { upsert: true });
                            if (uploadError) {
                                console.error(`[Analysis] Erro no upload de ${file.name}:`, uploadError);
                                toast.error(`Erro ao salvar PDF de ${file.name}. Verifique as permissões de armazenamento.`);
                                resumeUrl = null;
                            } else {
                                const { data: { publicUrl } } = supabase.storage.from('resumes').getPublicUrl(path);
                                resumeUrl = publicUrl;
                                console.log(`[Analysis] Upload concluído: ${resumeUrl}`);
                            }

                            // Registro no resume_uploads
                            if (resumeUrl) {
                                const { data: insUpload } = await supabase.from('resume_uploads').insert({
                                    user_id: session.user.id,
                                    job_id: jobData.id,
                                    original_filename: file.name,
                                    file_path: path,
                                    file_size: file.size,
                                    status: 'completed'
                                }).select().single();
                                if (insUpload) uploadId = insUpload.id;
                            }
                        }

                        // Normalização (converte o AnalysisResult da IA para o nosso tipo Candidate)
                        const combinedExperience = c.summary || c.experience || '';
                        const gapsPart = c.gaps?.length ? c.gaps.join(', ') : '';
                        const redFlagsPart = (typeof c.redFlags === 'string' && !['nenhuma identificada', 'nenhuma', 'n/a'].includes(c.redFlags.toLowerCase())) ? c.redFlags : '';
                        let combinedAttentionPoints = [gapsPart, redFlagsPart].filter(Boolean).join('\n');
                        if (!combinedAttentionPoints) combinedAttentionPoints = "Não existem pontos de atenção no candidato.";

                        const normalizedCandidate: Candidate = {
                            id: `local-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
                            name: c.name,
                            email: cleanEmail(c.email),
                            phone: !isMissing(c.phone) ? c.phone : null,
                            location: normalizeLocation(c.location),
                            age: !isMissing(c.age) ? c.age : null,
                            gender: !isMissing(c.gender) ? c.gender : null,
                            score: typeof c.score === 'number' ? c.score : parseInt(String(c.score || 0)),
                            skills: Array.isArray(c.skills) ? parseSkills(c.skills.join(', ')).join(', ') : parseSkills(c.skills).join(', '),
                            experience: combinedExperience,
                            education: c.education,
                            attention_points: combinedAttentionPoints,
                            source: mode,
                            resumeUrl: resumeUrl,
                            resume_file_name: mode === 'pdf' ? files[idx].name : null,
                            dbId: null,
                            isBlacklisted: false
                        };

                        // --- VERIFICAÇÃO DE BLACKLIST ---
                        let existingBlacklisted = false;
                        if (normalizedCandidate.email) {
                            const { data: blEmail } = await supabase.from('candidates')
                                .select('is_blacklisted')
                                .eq('user_id', session.user.id)
                                .eq('email', normalizedCandidate.email)
                                .eq('is_blacklisted', true)
                                .maybeSingle();
                            if (blEmail) existingBlacklisted = true;
                        }
                        if (!existingBlacklisted && normalizedCandidate.phone) {
                            const { data: blPhone } = await supabase.from('candidates')
                                .select('is_blacklisted')
                                .eq('user_id', session.user.id)
                                .ilike('name', normalizedCandidate.name)
                                .eq('phone', normalizedCandidate.phone)
                                .eq('is_blacklisted', true)
                                .maybeSingle();
                            if (blPhone) existingBlacklisted = true;
                        }
                        normalizedCandidate.isBlacklisted = existingBlacklisted;

                        // Adiciona ao estado PROGRESSIVAMENTE (sem duplicar por ID)
                        setResult(prev => {
                            const existing = prev?.candidates ?? [];
                            // Nunca adicionar se já existe um candidato com mesmo ID
                            if (existing.some(can => can.id === normalizedCandidate.id)) return prev;
                            const newCandidates = [...existing, normalizedCandidate];
                            const bestCount = newCandidates.filter(can => (can.score || 0) >= 70).length;
                            const midCount = newCandidates.filter(can => (can.score || 0) >= 40 && (can.score || 0) < 70).length;
                            const worstCount = newCandidates.filter(can => (can.score || 0) < 40).length;
                            const newSummary = `Analisando... ${newCandidates.length} currículos. (${bestCount} Melhores, ${midCount} Intermediários, ${worstCount} Baixos)`;
                            return { summary: newSummary, candidates: newCandidates };
                        });

                        console.log(`[Analysis] Candidato ${idx + 1} adic. ao estado PROGRESSIVO: ${normalizedCandidate.name}`);

                        // DEDUPLICAÇÃO E SALVAMENTO NO BANCO
                        // ... (rest of the DB logic) ...
                        const analysisData = {
                            skills: normalizedCandidate.skills,
                            experience: normalizedCandidate.experience,
                            education: normalizedCandidate.education,
                            redFlags: normalizedCandidate.attention_points,
                            score: normalizedCandidate.score,
                            job_id: jobData.id,
                            job_name: name,
                            analyzed_at: new Date().toISOString()
                        };

                        const candidateRow: any = {
                            user_id: session.user.id,
                            name: normalizedCandidate.name,
                            email: normalizedCandidate.email,
                            phone: normalizedCandidate.phone,
                            location: normalizedCandidate.location,
                            age: normalizedCandidate.age,
                            gender: normalizedCandidate.gender,
                            // Regra de Ouro: O score na tabela de candidatos representa a análise MAIS RECENTE.
                            score: normalizedCandidate.score,
                            resume_url: resumeUrl,
                            resume_file_name: mode === 'pdf' ? files[idx].name : null,
                            resume_upload_id: uploadId,
                            // O campo analysis na raiz conterá os dados da ÚLTIMA análise para compatibilidade,
                            // mas a fonte de verdade para cada vaga será o array history dentro dele.
                            analysis: {
                                ...analysisData,
                                history: [] // Será preenchido abaixo
                            }
                        };

                        let existingId: string | null = null;

                        // 1. Tentar por EMAIL (se existir e não for nulo)
                        if (normalizedCandidate.email) {
                            const { data, error: eEmail } = await supabase.from('candidates')
                                .select('id')
                                .eq('user_id', session.user.id)
                                .eq('email', normalizedCandidate.email)
                                .maybeSingle();
                            if (eEmail) console.error('[Analysis] Erro ao buscar por email:', eEmail);
                            if (data) {
                                existingId = data.id;
                                console.log(`[Analysis] Encontrado por email: ${existingId}`);
                            }
                        }

                        // 2. Se não achou, tentar por NOME NORMALIZADO + TELEFONE (se fone existir)
                        if (!existingId && normalizedCandidate.phone) {
                            const { data } = await supabase.from('candidates')
                                .select('id')
                                .eq('user_id', session.user.id)
                                .ilike('name', normalizedName)
                                .eq('phone', normalizedCandidate.phone)
                                .maybeSingle();
                            if (data) {
                                existingId = data.id;
                                console.log(`[Analysis] Encontrado por nome+fone: ${existingId}`);
                            }
                        }

                        // 3. Se ainda não achou, tentar por NOME NORMALIZADO IGUAL (MUITO RÍGIDO)
                        if (!existingId) {
                            const { data } = await supabase.from('candidates')
                                .select('id, email, phone')
                                .eq('user_id', session.user.id)
                                .ilike('name', normalizedName)
                                .maybeSingle();

                            // Só assume que é o mesmo se não tiver dados conflitantes (email ou fone diferentes)
                            if (data) {
                                const conflictEmail = data.email && normalizedCandidate.email && data.email !== normalizedCandidate.email;
                                const conflictPhone = data.phone && normalizedCandidate.phone && data.phone !== normalizedCandidate.phone;

                                if (!conflictEmail && !conflictPhone) {
                                    existingId = data.id;
                                    console.log(`[Analysis] Encontrado por nome rígido: ${existingId}`);
                                }
                            }
                        }

                        let dbRecord: any;
                        const currentHistoryEntry = { ...analysisData };

                        if (existingId) {
                            console.log(`[Analysis] Candidato existente! Buscando análise atual de ${existingId}...`);
                            const { data: current, error: eHist } = await supabase.from('candidates').select('analysis').eq('id', existingId).single();
                            if (eHist) console.error('[Analysis] Erro ao carregar histórico:', eHist);
                            const history = Array.isArray(current?.analysis?.history) ? current.analysis.history : [];

                            candidateRow.analysis = {
                                ...analysisData,
                                history: [...history.filter((h: any) => h.job_id !== jobData.id), currentHistoryEntry]
                            };

                            // IMPORTANTE: Ao atualizar um candidato existente, NUNCA sobrescrevemos 
                            // dados básicos se eles já existirem e o novo for "não informado"
                            const { data: currentFull } = await supabase.from('candidates').select('*').eq('id', existingId).single();
                            if (currentFull) {
                                if (!candidateRow.location || candidateRow.location === 'não informado') candidateRow.location = currentFull.location;
                                if (!candidateRow.phone || candidateRow.phone === 'não informado') candidateRow.phone = currentFull.phone;
                                if (!candidateRow.age || candidateRow.age === 'não informado') candidateRow.age = currentFull.age;
                                if (!candidateRow.gender || candidateRow.gender === 'Não identificado') candidateRow.gender = currentFull.gender;
                            }

                            console.log(`[Analysis] Atualizando candidato ${existingId}...`);
                            
                            // PREVENÇÃO DE OVERWRITE: Se o novo resumeUrl for nulo mas o antigo existia, mantém o antigo
                            if (!candidateRow.resume_url && currentFull?.resume_url) {
                                console.log(`[Analysis] Mantendo resume_url anterior para ${existingId}:`, currentFull.resume_url);
                                candidateRow.resume_url = currentFull.resume_url;
                                candidateRow.resume_file_name = currentFull.resume_file_name;
                                candidateRow.resume_upload_id = currentFull.resume_upload_id;
                                resumeUrl = currentFull.resume_url; // ATUALIZA A VARIÁVEL LOCAL PARA O STATE
                            }

                            const { data: upd, error: e4 } = await supabase.from('candidates').update(candidateRow).eq('id', existingId).select().single();
                            if (e4) {
                                console.error('[Analysis] Erro ao atualizar candidato no Supabase:', e4);
                                toast.error(`Erro ao atualizar ${normalizedCandidate.name}: ${e4.message}`);
                            }
                            dbRecord = upd;
                            if (dbRecord) {
                                console.log(`[Analysis] Atualização bem-sucedida para ID: ${dbRecord.id}`);
                                // Sincroniza o resumeUrl final do DB de volta para a variável local para o setResult
                                resumeUrl = dbRecord.resume_url;
                            }
                        } else {
                            candidateRow.analysis = {
                                ...analysisData,
                                history: [currentHistoryEntry]
                            };
                            console.log(`[Analysis] Inserindo novo candidato: ${normalizedCandidate.name}`);
                            const { data: ins, error: e5 } = await supabase.from('candidates').insert(candidateRow).select().single();
                            if (e5) {
                                console.error('[Analysis] Erro ao inserir candidato no Supabase:', e5);
                                toast.error(`Erro ao salvar ${normalizedCandidate.name}: ${e5.message}`);
                            }
                            dbRecord = ins;
                            if (dbRecord) {
                                console.log(`[Analysis] Inserção bem-sucedida para ID: ${dbRecord.id}`);
                                // Sincroniza o resumeUrl final do DB de volta para a variável local para o setResult
                                resumeUrl = dbRecord.resume_url;
                            }
                        }

                        if (dbRecord) {
                            console.log(`[Analysis] Persistido no DB com ID: ${dbRecord.id}`);
                            normalizedCandidate.dbId = dbRecord.id;

                            // Atualizar o estado React com o dbId real (a mutação local não é refletida no state)
                            setResult(prev => {
                                if (!prev) return prev;
                                return {
                                    ...prev,
                                    candidates: prev.candidates.map(can =>
                                        can.id === normalizedCandidate.id
                                            ? { ...can, dbId: dbRecord.id, resumeUrl: resumeUrl, resume_file_name: dbRecord.resume_file_name }
                                            : can
                                    )
                                };
                            });

                            // Vincular na junction table JÁ (Pode "duplicar" a análise mas o link é único)
                            const { error: jErr } = await supabase.from('job_candidates').upsert({
                                candidate_id: dbRecord.id,
                                job_id: jobData.id,
                                user_id: session.user.id,
                                score: normalizedCandidate.score
                            }, { onConflict: 'candidate_id,job_id' });
                            if (jErr) {
                                console.error('[Analysis] Erro ao vincular job_candidates:', jErr);
                            } else {
                                console.log('[Analysis] Vinculado à vaga com sucesso.');
                            }

                            // O talent_pool foi removido para simplificar a arquitetura e eliminar erros de RLS,
                            // já que o score agora vive em 'candidates' e 'job_candidates'.
                        } else {
                            // Se não salvou no banco, mostramos um aviso discreto mas deixamos no localCandidates
                            console.warn(`[Analysis] Candidato ${normalizedCandidate.name} NÃO foi persistido.`);
                        }

                    } catch (innerErr: any) {
                        console.error(`Erro ao processar/salvar candidato ${idx}:`, innerErr);
                        toast.error(`Atenção: Erro ao tratar candidato ${idx + 1}: ${innerErr.message || 'Erro desconhecido'}`);
                    }
                },
                (err, idx) => {
                    console.error(`[Analysis] Erro no currículo ${idx + 1}:`, err);
                    toast.error(`Erro no currículo ${idx + 1}: ${err}`, { duration: 6000, id: `err-${idx}` });
                }
            );

            const { errors: analysisErrors } = processResult;

            // Conta candidatos realmente salvos e atualiza o job com total correto
            try {
                const { count } = await supabase
                    .from('job_candidates')
                    .select('*', { count: 'exact', head: true })
                    .eq('job_id', jobData.id);

                const savedCount = count ?? 0;
                const finalCandidates = (() => {
                    let c: any[] = [];
                    setResult(prev => { c = prev?.candidates ?? []; return prev; });
                    return c;
                })();

                const bestCount = finalCandidates.filter((c: any) => (c.score || 0) >= 70).length;

                await supabase.from('jobs').update({
                    filters: { total: savedCount, best: bestCount },
                    updated_at: new Date().toISOString()
                }).eq('id', jobData.id);

                console.log(`[Analysis] Job atualizado: ${savedCount} candidatos salvos, ${bestCount} melhores.`);
                await logActivity(session.user.id, `Concluiu análise para vaga "${name}"`, { 
                    job_id: jobData.id, 
                    total_candidates: savedCount, 
                    best_candidates: bestCount 
                });
            } catch (e) {
                console.error('[Analysis] Erro ao atualizar contagem do job:', e);
            }

            // Finaliza o estado com o sumário definitivo usando o que está no context
            setResult(prev => {
                if (!prev || prev.candidates.length === 0) return prev;

                const finalCandidates = prev.candidates;
                const bestCount = finalCandidates.filter(c => (c.score || 0) >= 70).length;
                const midCount = finalCandidates.filter(c => (c.score || 0) >= 40 && (c.score || 0) < 70).length;
                const worstCount = finalCandidates.filter(c => (c.score || 0) < 40).length;

                let summary = `Análise concluída para "${name}". Total: ${finalCandidates.length}. (${bestCount} Melhores, ${midCount} Intermediários, ${worstCount} Baixos).`;
                if (analysisErrors.length > 0) summary += ` (⚠️ ${analysisErrors.length} falhas)`;

                return { summary, candidates: finalCandidates };
            });

            setAnalyzing(false);
            toast.success(`Análise concluída: ${name}`);

            // 3. Disparar Notificação de Navegador
            console.log('[Analysis] Verificando notificações:', {
                enabled: profile.notificationsEnabled,
                permission: Notification.permission
            });

            if (profile.notificationsEnabled && Notification.permission === 'granted') {
                try {
                    const notification = new Notification('Análise concluída!', {
                        body: `A análise para a vaga "${name}" foi finalizada com sucesso.`,
                        icon: '/favicon.ico',
                        tag: 'analysis-complete',
                        requireInteraction: true // Mantém a notificação visível até o usuário interagir
                    });

                    notification.onclick = () => {
                        window.focus();
                        notification.close();
                    };
                } catch (e) {
                    console.error('[Analysis] Erro ao disparar notificação:', e);
                }
            } else if (profile.notificationsEnabled && Notification.permission !== 'granted') {
                console.warn('[Analysis] Notificações ativadas mas permissão do navegador não concedida:', Notification.permission);
            }

        } catch (err: any) {
            console.error('Análise interrompida por erro:', err);
            setError(err.message);
            setAnalyzing(false);
            if (profile.userId) {
                logActivity(profile.userId, `Erro na análise para vaga: ${name}`, {}, err.message);
            }
            toast.error(err.message);
        }
    };

    return (
        <AnalysisContext.Provider value={{
            analyzing,
            progress,
            result,
            error,
            jobName,
            jobDescription,
            setJobDescription,
            startAnalysis,
            clearAnalysis,
            setError
        }}>
            {children}
        </AnalysisContext.Provider>
    );
};

export const useAnalysis = () => {
    const context = useContext(AnalysisContext);
    if (!context) throw new Error('useAnalysis deve ser usado dentro de um AnalysisProvider');
    return context;
};

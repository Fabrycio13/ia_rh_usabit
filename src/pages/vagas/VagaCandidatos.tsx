import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import { ArrowLeft, UserPlus, User, FileText, Zap, Loader, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleViewResume } from '../../core/utils/storage';
import { downloadResume } from '../../core/utils/storage';
import { extractTextFromPDF, pdfToImages } from '../../core/services/pdfExtractor';
import { batchMatchToJob } from '../../core/services/cvAnalyzer';
import { CandidatePanel } from '../../features/analysis/CandidatePanel';
import { type CandidateDetail } from '../../features/analysis/CandidatePanelUtils';
import { TalentTransferModal } from '../../features/candidates/components/TalentTransferModal';

interface Vaga {
    id: string;
    title: string;
    company_name: string | null;
    application_count: number;
    is_pcd: string;
    custom_questions?: {
        id: string;
        label: string;
        type: string;
    }[];
    organization_id: string | null;
    job_code: string | null;
}

interface AIAnalysis { skills?: string; experience?: string; summary?: string; education?: string; redFlags?: string; gaps?: string; attention_points?: string; habilidades?: string; formacao?: string }
interface CustomQuestion { id: string; label: string }

interface Candidato {
    id: string;
    candidate_name: string;
    candidate_email: string;
    candidate_phone: string | null;
    candidate_location: string | null;
    candidate_linkedin: string | null;
    resume_url: string | null;
    resume_file_name: string | null;
    applied_at: string;
    status: string;
    match_score?: number | null;
    candidate_gender?: string | null;
    candidate_age?: string | null;
    answers?: Record<string, unknown> | null;
    internal_notes?: string | null;
    analysis?: AIAnalysis;
    analysis_vs_vaga?: Record<string, unknown> | null;
}

const getMatchColor = (score: number) => {
    if (score >= 70) return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '#10b981' };
    if (score >= 40) return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '#f59e0b' };
    return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '#ef4444' };
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { 
        pending: 'Pendente', 
        reviewed: 'Analisado', 
        shortlisted: 'Pré-selecionado', 
        rejected: 'Rejeitado', 
        hired: 'Contratado',
        talent_bank: 'No Banco'
    };
    return labels[status] || status;
};

const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
        pending: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
        reviewed: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
        shortlisted: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },
        rejected: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
        hired: { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' },
        talent_bank: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
    };
    return colors[status] || { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748b' };
};

export const VagaCandidatos = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [vaga, setVaga] = useState<Vaga | null>(null);
    const [candidatos, setCandidatos] = useState<Candidato[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandDetail, setSelectedCandDetail] = useState<CandidateDetail | null>(null);
    const [transferringCand, setTransferringCand] = useState<Candidato | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [showAIConfirm, setShowAIConfirm] = useState(false);
    const [aiCandidate, setAiCandidate] = useState<Candidato | null>(null);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchSelectedIds, setBatchSelectedIds] = useState<Set<string>>(new Set());
    const [batchLoading, setBatchLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<Candidato | null>(null);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const check = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
        check(mq);
        mq.addEventListener('change', check);
        return () => mq.removeEventListener('change', check);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const { data: vagaData, error: vagaError } = await supabase
                    .from('vagas_white_label')
                    .select('id, title, company_name, application_count, is_pcd, custom_questions, organization_id, job_code')
                    .eq('id', id)
                    .single();
                if (vagaError) throw vagaError;
                setVaga(vagaData);

                const { data: candData, error: candError } = await supabase
                    .from('vagas_candidaturas')
.select('id, candidate_name, candidate_email, candidate_phone, candidate_location, candidate_linkedin, resume_url, resume_file_name, applied_at, status, match_score, candidate_gender, candidate_age, answers, internal_notes, analysis, analysis_vs_vaga')
    .eq('vaga_id', id)
    .order('match_score', { ascending: false });

if (candError) throw candError;
setCandidatos(candData || []);
            } catch (err) {
                console.error('Erro ao carregar dados:', err);
                toast.error('Erro ao carregar dados da vaga');
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // ─── Realtime Subscription ──────────────────────────────────────────────
        if (!id) return;

        const channel = supabase
            .channel(`vaga-candidatos-${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'vagas_candidaturas',
                    filter: `vaga_id=eq.${id}`
                },
                (payload) => {
                    const newCand = payload.new as Candidato;
                    // Prevenir duplicatas caso o fetch e o realtime ocorram quase juntos
                    setCandidatos(prev => {
                        if (prev.find(c => c.id === newCand.id)) return prev;
                        
                        // Adicionar e reordenar por score (ou o que preferir)
                        const updated = [newCand, ...prev].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
                        return updated;
                    });
                    
                    // Atualizar contagem da vaga
                    setVaga(prev => prev ? { ...prev, application_count: prev.application_count + 1 } : prev);
                    
                    toast.success(`Novo candidato: ${newCand.candidate_name}`, {
                        icon: '🔔',
                        duration: 5000,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    const handleTransferSuccess = () => {
        if (id) {
            supabase.from('vagas_candidaturas')
.select('id, candidate_name, candidate_email, candidate_phone, candidate_location, candidate_linkedin, resume_url, resume_file_name, applied_at, status, match_score, candidate_gender, candidate_age, answers, internal_notes, analysis, analysis_vs_vaga')
    .eq('vaga_id', id)
    .order('match_score', { ascending: false })
    .then(({ data }) => {
                    if (data) {
                        setCandidatos(data);
                        setVaga(prev => prev ? { ...prev, application_count: data.length } : prev);
                    }
                });
        }
    };

    const handleAIAnalyze = async (candidateId: string) => {
        const candidate = candidatos.find(c => c.id === candidateId);
        if (candidate) {
            setAiCandidate(candidate);
            setShowAIConfirm(true);
        }
    };

    const confirmAIAnalyze = async () => {
        if (!aiCandidate) return;
        setShowAIConfirm(false);
        setAiAnalyzing(true);
        try {
            if (!aiCandidate.resume_url) {
                toast.error('Candidato sem currículo');
                setAiAnalyzing(false);
                return;
            }

            const isLegibleText = (text: string): boolean => {
                if (!text || text.length < 50) return false;
                const words = text.match(/[a-zA-Z]{3,}/g) || [];
                return words.length >= 5;
            };

            const file = await downloadResume(aiCandidate.resume_url, aiCandidate.resume_file_name || 'curriculo.pdf');

            let fileText: string | undefined;
            let images: string[] | undefined;

            const extracted = await extractTextFromPDF(file);
            if (isLegibleText(extracted)) {
                fileText = extracted;
                supabase.from('vagas_candidaturas').update({ raw_text: extracted }).eq('id', aiCandidate.id).then(() => {}, () => {});
            } else {
                images = await pdfToImages(file);
            }

            if (!fileText && (!images || images.length === 0)) {
                toast.error('Não foi possível extrair texto ou imagens do PDF. O arquivo pode estar corrompido ou ser um PDF escaneado incompatível.');
                setAiAnalyzing(false);
                return;
            }

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
            const { data: { session } } = await supabase.auth.getSession();
            const authToken = session?.access_token || anonKey;

            // Análise completa (scoring): retorna score + summary + strengths + gaps.
            // 'extraction' só devolvia skills/experience/education (feedback parcial).
            const jobTitle = vaga?.title || '';
            const { data: vagaFull } = await supabase.from('vagas_white_label').select('description').eq('id', id!).single();
            const jobDesc = vagaFull?.description || '';

            const openaiRes = await fetch(`${supabaseUrl}/functions/v1/openai-proxy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': anonKey,
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ type: 'scoring', data: { jobTitle, jobDescription: jobDesc, currentIndex: 1, totalCount: 1, fileText, images } }),
            });

            if (!openaiRes.ok) {
                const errText = await openaiRes.text();
                console.error('[VagaCandidatos] openai-proxy HTTP', openaiRes.status, errText);
                throw new Error('Falha temporária no serviço de análise');
            }

            const aiResult = await openaiRes.json();
            if (!aiResult?.choices?.[0]?.message?.content) throw new Error('Resposta vazia da IA');

            let parsed: Record<string, unknown> = {};
            try {
                const content = aiResult.choices[0].message.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                parsed = JSON.parse(content);
            } catch {
                toast.error('Erro ao processar resposta da IA');
                setAiAnalyzing(false);
                return;
            }

            const skillsArr = Array.isArray(parsed.skills) ? parsed.skills as string[] : [];
            const analysis: Record<string, unknown> = {};
            if (parsed.experience) analysis.experience = parsed.experience;
            if (parsed.education) analysis.education = parsed.education;
            if (skillsArr.length) analysis.skills = skillsArr;
            // Campos completos do scoring — o CandidatePanel renderiza esses blocos
            if (parsed.summary) analysis.summary = parsed.summary;
            if (parsed.general_analysis) analysis.general_analysis = parsed.general_analysis;
            if (parsed.feedback) analysis.feedback = parsed.feedback;
            if (parsed.strengths) analysis.strengths = parsed.strengths;
            if (parsed.gaps) analysis.gaps = parsed.gaps;
            if (parsed.redFlags) analysis.redFlags = parsed.redFlags;
            if (parsed.classification) analysis.classification = parsed.classification;
            if (parsed.recommendation) analysis.recommendation = parsed.recommendation;

            const updates: Record<string, unknown> = { is_analyzed: true, analysis };
            const scoreNum = Number(parsed.score);
            if (Number.isFinite(scoreNum) && scoreNum > 0) updates.match_score = Math.round(Math.min(100, Math.max(0, scoreNum)));
            if (skillsArr.length) { updates.skills = skillsArr.join(', '); updates.tags = skillsArr.map(s => s.toLowerCase()); }
            if (parsed.experience) updates.experience = parsed.experience;
            if (parsed.education) updates.education = parsed.education;

            const { error: updateErr } = await supabase.from('vagas_candidaturas').update(updates).eq('id', aiCandidate.id);
            if (updateErr) throw new Error(updateErr.message);

            setSelectedCandDetail(null);
            const { data: updated } = await supabase.from('vagas_candidaturas')
                .select('id, candidate_name, candidate_email, candidate_phone, candidate_location, candidate_linkedin, resume_url, resume_file_name, applied_at, status, match_score, candidate_gender, candidate_age, answers, internal_notes, analysis, analysis_vs_vaga')
                .eq('id', aiCandidate.id).single();
            if (updated) {
                setCandidatos(prev => prev.map(c => c.id === updated.id ? updated : c));
                fetchCandidateDetail(updated);
            }
            toast.success('Currículo analisado com sucesso!');
        } catch (e) {
            console.error('Erro ao analisar currículo:', e);
            toast.error('Não foi possível concluir a análise agora. Tente novamente em instantes.');
        } finally {
            setAiAnalyzing(false);
            setAiCandidate(null);
        }
    };

    const handleDeleteCandidate = (candidate: Candidato) => {
        setDeleteConfirm(candidate);
    };

    const confirmDelete = async () => {
        const candidate = deleteConfirm;
        if (!candidate) return;
        setDeleteConfirm(null);
        try {
            const { error: deleteErr } = await supabase.from('vagas_candidaturas').delete().eq('id', candidate.id);
            if (deleteErr) {
                console.error('Erro ao remover candidato:', deleteErr);
                toast.error(`Não foi possível remover: ${deleteErr.message}`);
                return;
            }
            toast.success('Candidato removido');
            setCandidatos(prev => prev.filter(c => c.id !== candidate.id));
            setVaga(prev => prev ? { ...prev, application_count: Math.max(0, prev.application_count - 1) } : prev);
            setSelectedCandDetail(null);
        } catch (err) {
            console.error('Erro ao remover candidato:', err);
            toast.error('Erro ao remover candidato');
        }
    };

    const toggleBatchSelect = (id: string) => {
        setBatchSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleBatchAnalyze = async () => {
        if (batchSelectedIds.size === 0) return;
        setShowBatchModal(false);
        setBatchLoading(true);
        try {
            const selected = candidatos.filter(c => batchSelectedIds.has(c.id));
            const candidatesForAI: Array<{ id: string; name: string; rawText: string }> = [];
            for (const c of selected) {
                let rawText = '';
                if (c.resume_url) {
                    try {
                        const file = await downloadResume(c.resume_url, c.resume_file_name || 'curriculo.pdf');
                        rawText = await extractTextFromPDF(file);
                    } catch { /* skip */ }
                }
                candidatesForAI.push({ id: c.id, name: c.candidate_name, rawText });
            }
            const jobTitle = vaga?.title || '';
            const { data: vagaFull } = await supabase.from('vagas_white_label').select('description').eq('id', id!).single();
            const jobDesc = vagaFull?.description || '';
            const results = await batchMatchToJob(candidatesForAI, jobTitle, jobDesc);
            for (const r of results) {
                await supabase.from('vagas_candidaturas').update({
                    match_score: r.score,
                    analysis_vs_vaga: r as unknown as Record<string, unknown>,
                }).eq('id', r.candidateId);
            }
            // Refresh list
            const { data: refreshed } = await supabase.from('vagas_candidaturas')
                .select('id, candidate_name, candidate_email, candidate_phone, candidate_location, candidate_linkedin, resume_url, resume_file_name, applied_at, status, match_score, candidate_gender, candidate_age, answers, internal_notes, analysis, analysis_vs_vaga')
                .eq('vaga_id', id!).order('match_score', { ascending: false });
            if (refreshed) setCandidatos(refreshed);
            toast.success(`${results.length} candidato(s) analisado(s)!`);
            setBatchSelectedIds(new Set());
        } catch (err) {
            console.error('Erro na análise em lote:', err);
            toast.error('Não foi possível concluir as análises agora. Tente novamente em instantes.');
        } finally {
            setBatchLoading(false);
        }
    };

    function optStr(v: unknown): string | null {
        return v != null ? String(v) : null;
    }

    const fetchCandidateDetail = async (c: Candidato) => {
        try {
            const answersRaw = (typeof c.answers === 'string' ? JSON.parse(c.answers) : c.answers) ?? {};
            const aiRaw = (c.analysis ?? {}) as Record<string, unknown>;
            const aiFromAnswersRaw = answersRaw['_ai_analysis'];
            const aiFromAnswers = (typeof aiFromAnswersRaw === 'string' ? JSON.parse(aiFromAnswersRaw) : aiFromAnswersRaw) as Record<string, unknown> | undefined;

            console.log('[DEBUG] fetchCandidateDetail:', {
                hasAnswers: !!c.answers,
                answersType: typeof c.answers,
                answersKeys: typeof c.answers === 'object' && c.answers ? Object.keys(c.answers) : 'n/a',
                hasAiFromAnswers: !!aiFromAnswers,
                aiFromAnswersKeys: aiFromAnswers && typeof aiFromAnswers === 'object' ? Object.keys(aiFromAnswers) : 'n/a',
                hasAiRaw: Object.keys(aiRaw).length > 0,
                match_score: c.match_score
            });

            const detail: CandidateDetail = {
                id: c.id, 
                name: c.candidate_name,
                email: c.candidate_email,
                phone: c.candidate_phone,
                location: c.candidate_location,
                address: String(answersRaw.address ?? ''),
                linkedin: c.candidate_linkedin,
                age: c.candidate_age ?? null,
                gender: c.candidate_gender ?? null,
                score: c.match_score ?? null,
                portfolio: optStr(answersRaw['portfolio']),
                cep: optStr(answersRaw['cep']),
                address_number: optStr(answersRaw['address_number']),
                complement: optStr(answersRaw['complement']),
                vagas: [],
                interview_eligible: false,
                is_blacklisted: false,
                skills: optStr(aiRaw['skills'] ?? aiFromAnswers?.['skills'] ?? aiRaw['habilidades']),
                experience: optStr(aiRaw['experience'] ?? aiFromAnswers?.['experience'] ?? aiRaw['summary'] ?? aiFromAnswers?.['summary']),
                education: optStr(aiRaw['education'] ?? aiFromAnswers?.['education'] ?? aiRaw['formacao']),
                redFlags: optStr(aiRaw['redFlags'] ?? aiFromAnswers?.['redFlags'] ?? aiRaw['gaps'] ?? aiFromAnswers?.['gaps'] ?? aiRaw['attention_points']),
                applications: [],
                pipelineCards: [],
                notes: c.internal_notes || null,
                resume_url: c.resume_url,
                enriched: true,
                analysis: (aiFromAnswers && typeof aiFromAnswers === 'object' && Object.keys(aiFromAnswers).length > 0) ? aiFromAnswers : (aiRaw || null),
                conversations: [],
                hideBankButton: c.status === 'talent_bank',
                isVagaView: true,
                status: c.status,
                answers: answersRaw as Record<string, string> | null,
                questionLabels: (vaga?.custom_questions || []).reduce((acc: Record<string, string>, q: CustomQuestion) => {
                    acc[q.id] = q.label;
                    return acc;
                }, {})
            };

            setSelectedCandDetail(detail);
        } catch (err) {
            console.error('[Fetch Detail] Error:', err);
            toast.error('Erro ao carregar detalhes do candidato');
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Carregando candidatos...</p>
            </div>
        );
    }

    if (!vaga) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Vaga não encontrada</p>
            </div>
        );
    }

    const gridColumns = '50px 1.3fr 1.1fr 0.5fr 0.7fr 0.7fr 0.6fr 0.4fr 0.6fr';
    const isUnanalyzed = (c: Candidato) => (c.match_score ?? 0) === 0 && !c.analysis && !c.analysis_vs_vaga;

    return (
        <div style={{ fontFamily: 'Inter, sans-serif', padding: isMobile ? '16px' : '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: isMobile ? 20 : 32 }}>

                {isMobile ? (
                    /* ── Mobile: botão Voltar em cima ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <button
                            onClick={() => navigate('/vagas')}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 8,
                                color: '#94a3b8', fontSize: 14, padding: 0,
                                transition: 'color 0.2s', alignSelf: 'flex-start',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                        >
                            <ArrowLeft size={18} />
                            <span>Voltar</span>
                        </button>
                        <div>
                            <h1 style={{ color: 'var(--text-main)', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                {vaga.title}
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <User size={14} /> {vaga.company_name}
                                    </span>
                                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)' }} />
                                    <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{vaga.application_count} Candidatos</span>
                                </div>
                                {candidatos.some(c => isUnanalyzed(c)) && (
                                    <button onClick={() => setShowBatchModal(true)}
                                        style={{ padding: '8px 16px', background: '#6366f1', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(99,102,241,0.35)', transition: 'all 0.2s' }}
                                        onMouseOver={e => { e.currentTarget.style.background = '#5558e3'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                        onMouseOut={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                        <Zap size={15} /> Analisar em lote
                                    </button>
                                )}
                                </div>
                        </div>
                    </div>
                ) : (
                    /* ── Desktop: breadcrumb + título ── */
                    <div>
                        {/* Breadcrumb */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13 }}>
                            <button
                                onClick={() => navigate('/vagas')}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--primary)', fontWeight: 500, padding: 0,
                                    transition: 'color 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--primary)'}
                            >
                                Vagas
                            </button>
                            <span style={{ color: 'var(--border)', fontWeight: 300 }}>/</span>
                            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{vaga.title}</span>
                            <span style={{ color: 'var(--border)', fontWeight: 300 }}>/</span>
                            <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Candidatos</span>
                        </div>

                        {/* Título + meta */}
                        <h1 style={{ color: 'var(--text-main)', fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                            {vaga.title}
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <User size={14} /> {vaga.company_name}
                                </span>
                                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)' }} />
                                <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{vaga.application_count} Candidatos</span>
                            </div>
                            {candidatos.some(c => isUnanalyzed(c)) && (
                                <button onClick={() => setShowBatchModal(true)}
                                    style={{ padding: '8px 18px', background: '#6366f1', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(99,102,241,0.35)', transition: 'all 0.2s' }}
                                    onMouseOver={e => { e.currentTarget.style.background = '#5558e3'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                    onMouseOut={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                    <Zap size={15} /> Analisar em lote
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {candidatos.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                            Nenhum candidato inscrito nesta vaga.
                        </div>
                    ) : (
                        candidatos.map((candidato, index) => {
                            const hasScore = (candidato.match_score ?? 0) > 0 || !!(candidato.analysis || candidato.analysis_vs_vaga);
                            const matchColors = hasScore ? getMatchColor(candidato.match_score ?? 0) : { bg: 'rgba(100,116,139,0.08)', color: '#64748b', border: '#64748b' };
                            const statusColors = getStatusColor(candidato.status);
                            return (
                                <div key={candidato.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px' }}>
                                    <div onClick={() => fetchCandidateDetail(candidato)} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: index < 3 ? 'var(--primary)' : 'var(--bg-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: index < 3 ? '#fff' : 'var(--text-dim)' }}>
                                                    {index + 1}
                                                </div>
                                                <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                                                    {candidato.candidate_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>{candidato.candidate_name}</div>
                                                </div>
                                            </div>
                                            <div style={{ padding: '4px 10px', background: matchColors.bg, border: `1px solid ${matchColors.border}33`, borderRadius: '8px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: matchColors.color }}>{hasScore ? `${candidato.match_score}%` : '—'}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: 10 }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                <span>{candidato.candidate_location || '-'}</span>
                                                {candidato.candidate_age && <><span style={{ opacity: 0.5 }}>•</span><span>{candidato.candidate_age} anos</span></>}
                                                {candidato.candidate_gender && <><span style={{ opacity: 0.5 }}>•</span><span>{candidato.candidate_gender}</span></>}
                                            </div>
                                            <span style={{ alignSelf: 'flex-start', display: 'inline-block', padding: '2px 8px', background: statusColors.bg, color: statusColors.color, borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                                                {getStatusLabel(candidato.status)}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                        {candidato.resume_url || candidato.resume_file_name ? (
                                            <button onClick={(e) => { e.stopPropagation(); handleViewResume(candidato.resume_url!); }} title="Ver currículo" style={{ minWidth: 44, minHeight: 44, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileText size={16} />
                                            </button>
                                        ) : null}
                                        <button onClick={(e) => { e.stopPropagation(); setTransferringCand(candidato); }} title="Mover para Banco de Talentos" style={{ minWidth: 44, minHeight: 44, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <UserPlus size={16} />
                                        </button>
                                        <button onClick={() => fetchCandidateDetail(candidato)} title="Ver detalhes" style={{ minWidth: 44, minHeight: 44, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={16} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCandidate(candidato); }} title="Excluir candidato" style={{ minWidth: 44, minHeight: 44, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: gridColumns, padding: '12px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                        {['Rank', 'Candidato', 'Localização', 'Idade', 'Gênero', 'Status', 'Score', 'Currículo', 'Ações'].map((h, i) => (
                            <div key={h} style={{ 
                                fontSize: 10, 
                                fontWeight: 700, 
                                color: 'var(--text-dim)', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.06em', 
                                textAlign: [0, 3, 4, 5, 6, 7, 8].includes(i) ? 'center' : 'left'
                            }}>
                                {h}
                            </div>
                        ))}
                    </div>

                    {candidatos.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Nenhum candidato inscrito nesta vaga.
                        </div>
                    ) : (
                        <div>
                            {candidatos.map((candidato, index) => {
                                const hasScore = (candidato.match_score ?? 0) > 0 || !!(candidato.analysis || candidato.analysis_vs_vaga);
                                const matchColors = hasScore ? getMatchColor(candidato.match_score ?? 0) : { bg: 'rgba(100,116,139,0.08)', color: '#64748b', border: '#64748b' };
                                const statusColors = getStatusColor(candidato.status);
                                return (
                                    <div key={candidato.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <div
                                            onClick={() => fetchCandidateDetail(candidato)}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: gridColumns,
                                                padding: '14px 24px',
                                                background: 'var(--bg-card)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                alignItems: 'center'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--row-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: index < 3 ? 'var(--primary)' : 'var(--bg-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: index < 3 ? '#fff' : 'var(--text-dim)' }}>
                                                    {index + 1}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                                                    {candidato.candidate_name.charAt(0)}
                                                </div>
                                                <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {candidato.candidate_name}
                                                </div>
                                            </div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {candidato.candidate_location || '-'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{candidato.candidate_age ? `${candidato.candidate_age} anos` : '-'}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {candidato.candidate_gender ? (
                                                    <span style={{ display: 'inline-block', padding: '2px 10px', background: candidato.candidate_gender?.toLowerCase().includes('fem') ? 'rgba(236,72,153,0.15)' : candidato.candidate_gender?.toLowerCase().includes('masc') ? 'rgba(59,130,246,0.15)' : 'rgba(100,116,139,0.1)', color: candidato.candidate_gender?.toLowerCase().includes('fem') ? '#ec4899' : candidato.candidate_gender?.toLowerCase().includes('masc') ? '#3b82f6' : '#64748b', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: `1px solid ${candidato.candidate_gender?.toLowerCase().includes('fem') ? '#ec489933' : candidato.candidate_gender?.toLowerCase().includes('masc') ? '#3b82f633' : '#64748b33'}` }}>
                                                        {candidato.candidate_gender}
                                                    </span>
                                                ) : (<span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-</span>)}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ display: 'inline-block', padding: '4px 10px', background: statusColors.bg, color: statusColors.color, borderRadius: '8px', fontSize: '11px', fontWeight: 600 }}>
                                                    {getStatusLabel(candidato.status)}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <div style={{ padding: '4px 10px', background: matchColors.bg, border: `1px solid ${matchColors.border}33`, borderRadius: '8px', textAlign: 'center', minWidth: '50px' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: matchColors.color }}>{hasScore ? `${candidato.match_score}%` : '—'}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {(candidato.resume_url || candidato.resume_file_name) ? (
                                                    <button title={candidato.resume_file_name || 'Ver currículo'} onClick={(e) => { e.stopPropagation(); handleViewResume(candidato.resume_url!); }} style={{ width: 32, height: 32, padding: '0', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = 'var(--primary)'; }}
                                                    >
                                                        <FileText size={15} />
                                                    </button>
                                                ) : (<span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-</span>)}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <button title="Mover para Banco de Talentos" onClick={(e) => { e.stopPropagation(); setTransferringCand(candidato); }} style={{ width: 32, height: 32, padding: '0', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.color = '#10b981'; }}
                                                >
                                                    <UserPlus size={14} />
                                                </button>
                                                <button title="Excluir candidato" onClick={(e) => { e.stopPropagation(); handleDeleteCandidate(candidato); }} style={{ width: 32, height: 32, padding: '0', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#ef4444'; }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <>
                    <div onClick={() => setDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        zIndex: 401, width: isMobile ? '90%' : '400px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 20, fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{ padding: '24px 24px 16px' }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>Excluir candidato</h2>
                            <p style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                                Tem certeza que deseja remover <strong style={{ color: 'var(--text-main)' }}>{deleteConfirm.candidate_name}</strong> da vaga? Esta ação não pode ser desfeita.
                            </p>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button onClick={() => setDeleteConfirm(null)}
                                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button onClick={confirmDelete}
                                style={{ padding: '10px 24px', background: '#ef4444', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                Sim, excluir
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* AI Confirmation Modal */}
            {showAIConfirm && aiCandidate && (
                <>
                    <div onClick={() => { setShowAIConfirm(false); setAiCandidate(null); }} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        zIndex: 401, width: isMobile ? '95%' : 'clamp(380px, 35vw, 500px)',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 20, fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{ padding: isMobile ? '16px 16px 12px' : '24px 24px 16px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: 'var(--text-main)' }}>Analisar currículo com IA</h2>
                        </div>
                        <div style={{ padding: isMobile ? '16px' : '20px 24px' }}>
                            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-main)', lineHeight: '1.6' }}>
                                Deseja analisar o currículo de <strong>{aiCandidate.candidate_name}</strong> com IA?
                            </p>
                            <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: '1.5' }}>
                                A IA vai extrair skills, experiência e formação do currículo e preencher automaticamente os dados do candidato.
                            </p>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowAIConfirm(false); setAiCandidate(null); }}
                                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button onClick={confirmAIAnalyze}
                                style={{ padding: '10px 24px', background: '#a855f7', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Zap size={16} /> Sim, analisar
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Batch Analysis Modal */}
            {showBatchModal && (
                <>
                    <div onClick={() => { setShowBatchModal(false); setBatchSelectedIds(new Set()); }} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        zIndex: 401, width: isMobile ? '95%' : '500px', maxHeight: '80vh',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 20, fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column',
                    }}>
                        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>Analisar currículos em lote</h2>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>
                                Selecione até 20 candidatos para analisar com IA
                            </p>
                        </div>
                        <div style={{ padding: '16px 24px', overflow: 'auto', flex: 1 }}>
                            {candidatos.filter(c => isUnanalyzed(c)).length === 0 ? (
                                <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>Todos já foram analisados.</p>
                            ) : (
                                candidatos.filter(c => isUnanalyzed(c)).slice(0, 20).map(c => (
                                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={batchSelectedIds.has(c.id)} onChange={() => toggleBatchSelect(c.id)}
                                            style={{ width: 18, height: 18, accentColor: '#6366f1', cursor: 'pointer' }} />
                                        <span style={{ fontSize: 14, color: 'var(--text-main)' }}>{c.candidate_name}</span>
                                        <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>{c.candidate_email}</span>
                                    </label>
                                ))
                            )}
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{batchSelectedIds.size} selecionado(s)</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => { setShowBatchModal(false); setBatchSelectedIds(new Set()); }}
                                    style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button onClick={handleBatchAnalyze} disabled={batchSelectedIds.size === 0}
                                    style={{ padding: '10px 24px', background: batchSelectedIds.size > 0 ? '#6366f1' : 'var(--border)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 700, cursor: batchSelectedIds.size > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Zap size={16} /> Analisar
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Batch Loading overlay */}
            {batchLoading && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                    <Loader size={48} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
                    <p style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: 0 }}>Analisando {batchSelectedIds.size} currículo(s)…</p>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>Isso pode levar alguns segundos</p>
                </div>
            )}

            {/* AI Loading overlay */}
            {aiAnalyzing && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                    <Loader size={48} style={{ animation: 'spin 1s linear infinite', color: '#a855f7' }} />
                    <p style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: 0 }}>Analisando currículo com IA…</p>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>Extraindo skills, experiência e formação</p>
                </div>
            )}

            {selectedCandDetail && (
                isMobile ? (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--bg-main)', overflow: 'auto', padding: '16px' }}>
                        <CandidatePanel 
                            c={selectedCandDetail} 
                            onClose={() => setSelectedCandDetail(null)}
                            navigate={navigate}
                            onEnrich={handleAIAnalyze}
                            onTransferSuccess={handleTransferSuccess}
                            currentJobContext={{ id: id!, title: vaga?.title || '' }}
                            onNotesChange={(cid, notes) => {
                                setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, notes } : prev);
                                setCandidatos(prev => prev.map(cand => cand.id === cid ? { ...cand, internal_notes: notes } : cand));
                            }}
                            onFieldChange={(cid: string, field: string, val: unknown) => {
                                setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, [field]: val } : prev);
                                setCandidatos(prev => prev.map(cand => {
                                    if (cand.id !== cid) return cand;
                                    const directMap: Record<string, string> = {
                                        email: 'candidate_email',
                                        phone: 'candidate_phone',
                                        linkedin: 'candidate_linkedin',
                                        location: 'candidate_location',
                                        gender: 'candidate_gender',
                                        age: 'candidate_age',
                                    };
                                    if (directMap[field]) {
                                        return { ...cand, [directMap[field]]: typeof val === 'string' ? val : null };
                                    }
                                    const answers = { ...(cand.answers as Record<string, unknown> ?? {}) };
                                    if (val === null || val === undefined) {
                                        delete answers[field];
                                    } else {
                                        answers[field] = val;
                                    }
                                    return { ...cand, answers };
                                }));
                            }}
                            onBlacklistChange={(cid: string, val: boolean) => {
                                setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, is_blacklisted: val } : prev);
                            }}
                            onDeleteFromBank={async (id) => {
                                const cand = candidatos.find(c => c.id === id);
                                if (cand) handleDeleteCandidate(cand);
                            }}
                        />
                    </div>
                ) : (
                <CandidatePanel 
                    c={selectedCandDetail} 
                    onClose={() => setSelectedCandDetail(null)}
                    navigate={navigate}
                    onEnrich={handleAIAnalyze}
                    onTransferSuccess={handleTransferSuccess}
                    currentJobContext={{ id: id!, title: vaga?.title || '' }}
                    onNotesChange={(cid, notes) => {
                        setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, notes } : prev);
                        setCandidatos(prev => prev.map(cand => cand.id === cid ? { ...cand, internal_notes: notes } : cand));
                    }}
                    onFieldChange={(cid: string, field: string, val: unknown) => {
                        setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, [field]: val } : prev);
                        setCandidatos(prev => prev.map(cand => {
                            if (cand.id !== cid) return cand;
                            const directMap: Record<string, string> = {
                                email: 'candidate_email',
                                phone: 'candidate_phone',
                                linkedin: 'candidate_linkedin',
                                location: 'candidate_location',
                                gender: 'candidate_gender',
                                age: 'candidate_age',
                            };
                            if (directMap[field]) {
                                return { ...cand, [directMap[field]]: typeof val === 'string' ? val : null };
                            }
                            const answers = { ...(cand.answers as Record<string, unknown> ?? {}) };
                            if (val === null || val === undefined) {
                                delete answers[field];
                            } else {
                                answers[field] = val;
                            }
                            return { ...cand, answers };
                        }));
                    }}
                    onBlacklistChange={(cid: string, val: boolean) => {
                        setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, is_blacklisted: val } : prev);
                    }}
                    onDeleteFromBank={async (id) => {
                        const cand = candidatos.find(c => c.id === id);
                        if (cand) handleDeleteCandidate(cand);
                    }}
                    />
            ))}

            {transferringCand && vaga && (
                <TalentTransferModal
                    candidate={{
                        id: transferringCand.id,
                        name: transferringCand.candidate_name,
                        email: transferringCand.candidate_email,
                        phone: transferringCand.candidate_phone,
                        location: transferringCand.candidate_location,
                        linkedin: transferringCand.candidate_linkedin,
                        resume_url: transferringCand.resume_url,
                        age: transferringCand.candidate_age,
                        gender: transferringCand.candidate_gender,
                        address: (transferringCand.answers as Record<string, string | null | undefined>)?.address ?? null,
                        portfolio: (transferringCand.answers as Record<string, string | null | undefined>)?.portfolio ?? null,
                        cep: (transferringCand.answers as Record<string, string | null | undefined>)?.cep ?? null,
                        address_number: (transferringCand.answers as Record<string, string | null | undefined>)?.address_number ?? null,
                        complement: (transferringCand.answers as Record<string, string | null | undefined>)?.complement ?? null,
                        match_score: transferringCand.match_score ?? undefined,
                        answers: (transferringCand.answers as Record<string, string>) ?? null
                    }}
                    job={{
                        id: id!,
                        title: vaga?.title || '',
                        job_code: vaga?.job_code || null,
                        organization_id: vaga?.organization_id
                    }}
                    onClose={() => setTransferringCand(null)}
                    onSuccess={handleTransferSuccess}
                />
            )}
        </div>
    );
};

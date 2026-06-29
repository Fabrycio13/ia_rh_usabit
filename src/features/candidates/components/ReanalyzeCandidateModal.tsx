import { useState, useEffect } from 'react';
import { Search, X, Loader, FileText, Check, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../core/services/supabase';
import { analyzeJobApplication } from '../../../core/services/jobAnalyzer';
import { type CandidateDetail } from '../../analysis/CandidatePanelUtils';
import type { JobMatchResult } from '../../../core/services/ai/types';
import { downloadResume } from '../../../core/utils/storage';

interface VagaRow {
    id: string;
    title: string;
    job_code: string | null;
    status: string;
    pipeline_id: string | null;
}

type Step = 'select' | 'analyzing' | 'preview' | 'pipeline' | 'saving' | 'done';

interface Props {
    candidate: CandidateDetail;
    organizationId: string;
    userId: string;
    onClose: () => void;
    onSuccess: () => Promise<void>;
}

export function ReanalyzeCandidateModal({ candidate, organizationId, userId, onClose, onSuccess }: Props) {
    const [step, setStep] = useState<Step>('select');
    const [vagas, setVagas] = useState<VagaRow[]>([]);
    const [selectedVagaId, setSelectedVagaId] = useState<string | null>(null);
    const [vagaSearch, setVagaSearch] = useState('');
    const [loadingVagas, setLoadingVagas] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<JobMatchResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Pipeline state
    const [pipelineName, setPipelineName] = useState('');
    const [currentPipelineName, setCurrentPipelineName] = useState('');
    const [pipelineId, setPipelineId] = useState<string | null>(null);
    const [hasOtherPipeline, setHasOtherPipeline] = useState(false);

    useEffect(() => {
        (async () => {
            setLoadingVagas(true);
            try {
                const { data } = await supabase
                    .from('vagas_white_label')
                    .select('id, title, job_code, status, pipeline_id')
                    .eq('organization_id', organizationId)
                    .eq('is_active', true)
                    .in('status', ['aberta', 'invisivel'])
                    .order('title');
                setVagas(data || []);
            } catch {
                toast.error('Erro ao carregar vagas');
            } finally {
                setLoadingVagas(false);
            }
        })();
    }, [organizationId]);

    async function runAnalysis() {
        if (!selectedVagaId) return;
        const vaga = vagas.find(v => v.id === selectedVagaId);
        if (!vaga) return;

        setAnalyzing(true);
        setStep('analyzing');
        setError(null);

        try {
            const { data: vagaFull } = await supabase
                .from('vagas_white_label')
                .select('description, custom_questions')
                .eq('id', selectedVagaId)
                .single();

            const jobDesc = vagaFull?.description || '';
            const customQuestions = (vagaFull?.custom_questions || []) as { id: string; label: string }[];
            const formAnswers: Record<string, string> = {};
            customQuestions.forEach(q => {
                formAnswers[q.id] = `[${q.label}] não respondido (reanálise sem formulário)`;
            });

            let result: JobMatchResult | null = null;
            if (candidate.resume_url) {
                const resumeFile = await downloadResume(
                    candidate.resume_url,
                    'curriculo.pdf'
                );
                result = await analyzeJobApplication(resumeFile, vaga.title, jobDesc, formAnswers);
            }

            if (!result) {
                throw new Error('Não foi possível analisar o currículo');
            }

            setAiResult(result);
            setStep('preview');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao analisar';
            setError(msg);
            toast.error(msg);
        } finally {
            setAnalyzing(false);
        }
    }

    async function confirmSave() {
        if (!selectedVagaId || !aiResult) return;
        const vaga = vagas.find(v => v.id === selectedVagaId);
        if (!vaga) return;

        setStep('saving');
        setError(null);

        try {
            const aiData = aiResult as unknown as Record<string, unknown>;

            await supabase.from('vagas_candidaturas').insert({
                vaga_id: vaga.id,
                organization_id: organizationId,
                candidate_name: candidate.name,
                candidate_email: candidate.email,
                candidate_phone: candidate.phone,
                candidate_location: candidate.location,
                candidate_linkedin: candidate.linkedin,
                candidate_gender: candidate.gender,
                candidate_age: candidate.age,
                resume_url: candidate.resume_url,
                status: 'reviewed',
                match_score: aiResult.score ?? 0,
                source: 'talent_bank_reanalysis',
                answers: { _ai_analysis: aiData }
            });

            await supabase.from('job_candidates').upsert({
                candidate_id: candidate.id,
                vaga_id: vaga.id,
                user_id: userId,
                score: aiResult.score ?? 0,
                status: 'reviewed'
            }, { onConflict: 'candidate_id,vaga_id' });

            const oldAnalysis = (candidate.analysis || {}) as Record<string, unknown>;
            const oldHistory = (oldAnalysis.history || []) as unknown as Record<string, unknown>[];
            const newHistory = [...oldHistory];
            newHistory.push({
                type: 'reanalysis',
                vaga_id: vaga.id,
                vaga_title: vaga.title,
                date: new Date().toISOString(),
                score: aiResult.score ?? null,
                match_rationale: aiResult.summary || null,
                skills: aiResult.skills,
                experience: aiResult.experience,
                strengths: aiResult.strengths,
                gaps: aiResult.gaps
            });

            await supabase.from('candidates').update({
                analysis: {
                    ...oldAnalysis,
                    history: newHistory
                }
            }).eq('id', candidate.id);

            // Check pipeline
            if (vaga.pipeline_id) {
                const { data: pipe } = await supabase
                    .from('pipelines')
                    .select('id, name')
                    .eq('id', vaga.pipeline_id)
                    .single();

                if (pipe) {
                    const { data: existingCards } = await supabase
                        .from('pipeline_cards')
                        .select('id, pipeline_id')
                        .eq('candidate_id', candidate.id);

                    const otherCard = (existingCards ?? []).find(c => c.pipeline_id !== vaga.pipeline_id);
                    setPipelineId(pipe.id);
                    setPipelineName(pipe.name);

                    if (otherCard) {
                        const { data: otherPipe } = await supabase
                            .from('pipelines')
                            .select('name')
                            .eq('id', otherCard.pipeline_id)
                            .single();
                        setCurrentPipelineName(otherPipe?.name || 'outro pipeline');
                        setHasOtherPipeline(true);
                        setStep('pipeline');
                    } else if (!existingCards || existingCards.length === 0) {
                        setHasOtherPipeline(false);
                        setStep('pipeline');
                    } else {
                        toast.success(`Análise salva! Candidato já está no pipeline "${pipe.name}".`);
                        setStep('done');
                    }
                    return;
                }
            }

            toast.success(`Análise do candidato salva para a vaga "${vaga.title}"`);
            setStep('done');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao salvar análise';
            setError(msg);
            toast.error(msg);
            setStep('preview');
        }
    }

    async function handlePipelineDecision(addToPipeline: boolean) {
        if (!pipelineId || !selectedVagaId) return;
        const vaga = vagas.find(v => v.id === selectedVagaId);
        if (!vaga) return;

        try {
            if (addToPipeline && hasOtherPipeline) {
                const { data: cards } = await supabase
                    .from('pipeline_cards')
                    .select('id')
                    .eq('candidate_id', candidate.id);
                if (cards && cards.length > 0) {
                    await supabase.from('pipeline_cards').delete().in('id', cards.map(c => c.id));
                }
                await supabase.from('candidates').update({ interview_eligible: false }).eq('id', candidate.id);
            }

            if (addToPipeline) {
                const { data: columns } = await supabase
                    .from('pipeline_columns')
                    .select('id')
                    .eq('pipeline_id', pipelineId)
                    .order('position', { ascending: true })
                    .limit(1);

                const firstColumnId = columns?.[0]?.id;
                if (firstColumnId) {
                    const { count } = await supabase
                        .from('pipeline_cards')
                        .select('*', { count: 'exact', head: true })
                        .eq('column_id', firstColumnId);

                    await supabase.from('pipeline_cards').insert({
                        user_id: userId,
                        column_id: firstColumnId,
                        candidate_id: candidate.id,
                        position: count ?? 0,
                        pipeline_id: pipelineId,
                        notes: JSON.stringify({
                            selected_job_id: vaga.id,
                            selected_job_name: vaga.title,
                            selected_job_score: aiResult?.score ?? 0
                        })
                    });

                    await supabase.from('candidates').update({ interview_eligible: true }).eq('id', candidate.id);
                    toast.success(`Candidato adicionado ao pipeline "${pipelineName}"`);
                }
            }

            const msg = addToPipeline
                ? hasOtherPipeline
                    ? `Análise salva e candidato movido para "${pipelineName}"`
                    : `Análise salva e candidato adicionado ao pipeline "${pipelineName}"`
                : `Análise salva para a vaga "${vaga.title}"`;
            toast.success(msg);
            setStep('done');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao gerenciar pipeline';
            toast.error(msg);
            setStep('done');
        }
    }

    function handleClose() {
        if (step === 'analyzing' || step === 'saving') return;
        onClose();
    }

    const filteredVagas = vagas.filter(v => v.title.toLowerCase().includes(vagaSearch.toLowerCase()));

    return (
        <>
            <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
            <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                zIndex: 401, width: 'clamp(400px, 42vw, 620px)',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 20, fontFamily: 'Inter, sans-serif',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', maxHeight: '85vh'
            }}>
                {/* Header */}
                <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>
                            Reanalisar Candidato
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>{candidate.name}</p>
                    </div>
                    <button onClick={handleClose} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: 8, cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-main)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: step === 'preview' ? '16px 24px' : 0 }}>

                    {/* STEP: select */}
                    {step === 'select' && (
                        <>
                            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
                                    <Search size={16} color="var(--text-dim)" />
                                    <input value={vagaSearch} onChange={e => setVagaSearch(e.target.value)} placeholder="Buscar vaga..."
                                        style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif' }} />
                                </div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                                {loadingVagas ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <Loader size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                                        <p style={{ fontSize: 13, margin: 0 }}>Carregando vagas...</p>
                                    </div>
                                ) : filteredVagas.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <p style={{ fontSize: 13, margin: 0 }}>Nenhuma vaga disponível.</p>
                                    </div>
                                ) : (
                                    filteredVagas.map(vaga => (
                                        <div key={vaga.id} onClick={() => setSelectedVagaId(vaga.id)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', cursor: 'pointer',
                                                background: selectedVagaId === vaga.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                                                borderLeft: selectedVagaId === vaga.id ? '3px solid var(--primary)' : '3px solid transparent',
                                                transition: 'all 0.15s' }}
                                            onMouseEnter={e => { if (selectedVagaId !== vaga.id) e.currentTarget.style.background = 'var(--bg-main)'; }}
                                            onMouseLeave={e => { if (selectedVagaId !== vaga.id) e.currentTarget.style.background = 'transparent'; }}>
                                            <div>
                                                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {vaga.title}
                                                    {vaga.job_code && <span style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{vaga.job_code}</span>}
                                                </p>
                                                <span style={{ fontSize: 11, fontWeight: 600, marginTop: 4, display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                                                    background: vaga.status === 'aberta' ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)',
                                                    color: vaga.status === 'aberta' ? '#22c55e' : '#a855f7' }}>
                                                    {vaga.status === 'aberta' ? 'Ativa' : 'Invisível'}
                                                </span>
                                            </div>
                                            {selectedVagaId === vaga.id && (
                                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}

                    {/* STEP: analyzing */}
                    {step === 'analyzing' && (
                        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                            <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', margin: '0 auto' }} />
                            <p style={{ marginTop: 16, fontSize: 14, color: 'var(--text-dim)' }}>Analisando currículo...</p>
                            <p style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>A IA está avaliando o candidato para a vaga selecionada</p>
                        </div>
                    )}

                    {/* STEP: preview */}
                    {step === 'preview' && aiResult && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <FileText size={20} color="var(--primary)" />
                                    <div>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>Resultado da Análise</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>
                                            {vagas.find(v => v.id === selectedVagaId)?.title}
                                        </p>
                                    </div>
                                </div>
                                <div style={{
                                    background: aiResult.score >= 70 ? 'rgba(16,185,129,0.12)' : aiResult.score >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                                    border: `1px solid ${aiResult.score >= 70 ? 'rgba(16,185,129,0.3)' : aiResult.score >= 40 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                    borderRadius: 12, padding: '8px 16px', textAlign: 'center'
                                }}>
                                    <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: aiResult.score >= 70 ? '#10b981' : aiResult.score >= 40 ? '#f59e0b' : '#ef4444' }}>{aiResult.score}%</p>
                                    <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>MATCH</p>
                                </div>
                            </div>

                            {aiResult.summary && (
                                <div>
                                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resumo</p>
                                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5 }}>{aiResult.summary}</p>
                                </div>
                            )}

                            {aiResult.strengths && aiResult.strengths.length > 0 && (
                                <div>
                                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pontos Fortes</p>
                                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {(Array.isArray(aiResult.strengths) ? aiResult.strengths : [aiResult.strengths]).map((s, i) => (
                                            <p key={i} style={{ margin: 0, fontSize: 13, color: 'var(--text-main)' }}>• {s}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {aiResult.gaps && aiResult.gaps.length > 0 && (
                                <div>
                                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pontos de Atenção</p>
                                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {(Array.isArray(aiResult.gaps) ? aiResult.gaps : [aiResult.gaps]).map((g, i) => (
                                            <p key={i} style={{ margin: 0, fontSize: 13, color: 'var(--text-main)' }}>• {g}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {aiResult.experience && (
                                <div>
                                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Experiência</p>
                                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5 }}>{aiResult.experience}</p>
                                </div>
                            )}

                            {error && (
                                <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10 }}>
                                    <p style={{ margin: 0, fontSize: 13, color: '#ef4444' }}>{error}</p>
                                </div>
                            )}

                            <div style={{ padding: '16px 0', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button onClick={() => { setStep('select'); setAiResult(null); setError(null); }}
                                    style={{ padding: '12px 28px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-dim)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}>
                                    <ArrowLeft size={16} />
                                    Voltar
                                </button>
                                <button onClick={confirmSave}
                                    style={{ padding: '12px 28px', background: '#22c55e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Check size={18} />
                                    Adicionar à Vaga
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP: pipeline */}
                    {step === 'pipeline' && (
                        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                            </div>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                                {hasOtherPipeline
                                    ? `Candidato já está em "${currentPipelineName}"`
                                    : `Vaga possui pipeline ativo`}
                            </h3>
                            <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                                {hasOtherPipeline
                                    ? `Deseja remover "${candidate.name}" de "${currentPipelineName}" e adicionar ao pipeline "${pipelineName}"?`
                                    : `Deseja adicionar "${candidate.name}" ao pipeline "${pipelineName}"?`}
                            </p>

                            <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => handlePipelineDecision(false)}
                                    style={{ padding: '12px 28px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-dim)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}>
                                    {hasOtherPipeline ? 'Só salvar análise' : 'Não'}
                                </button>
                                <button onClick={() => handlePipelineDecision(true)}
                                    style={{ padding: '12px 28px', background: 'var(--primary)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Check size={18} />
                                    {hasOtherPipeline ? 'Trocar Pipeline' : 'Sim, adicionar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP: saving */}
                    {step === 'saving' && (
                        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                            <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                            <p style={{ marginTop: 16, fontSize: 14, color: 'var(--text-dim)' }}>Salvando análise...</p>
                        </div>
                    )}

                    {/* STEP: done */}
                    {step === 'done' && (
                        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Check size={28} color="#22c55e" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>Análise salva com sucesso!</h3>
                            <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text-dim)' }}>
                                A nova vaga aparecerá na lista de vagas analisadas do candidato.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {(step === 'select') && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button onClick={onClose}
                            style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            Cancelar
                        </button>
                        <button onClick={runAnalysis} disabled={!selectedVagaId || analyzing}
                            style={{ padding: '10px 24px', background: selectedVagaId && !analyzing ? 'var(--primary)' : 'var(--border)', border: 'none', borderRadius: 12, color: selectedVagaId && !analyzing ? '#fff' : 'var(--text-dim)', fontSize: 13, fontWeight: 700, cursor: selectedVagaId && !analyzing ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {analyzing ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analisando...</> : <>Analisar</>}
                        </button>
                    </div>
                )}

                {(step === 'done') && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
                        <button onClick={() => { onClose(); onSuccess(); }}
                            style={{ padding: '12px 32px', background: 'var(--primary)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                            Fechar
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

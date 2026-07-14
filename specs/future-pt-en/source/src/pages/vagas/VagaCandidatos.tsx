import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import { ArrowLeft, UserPlus, User, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLang } from '../../core/contexts/LangContext';
import { handleViewResume } from '../../core/utils/storage';
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
    match_score: number;
    candidate_gender: string | null;
    candidate_age: string | null;
    answers?: Record<string, unknown> | null;
    internal_notes?: string | null;
    ai_analysis?: AIAnalysis;
}

const getMatchColor = (score: number) => {
    if (score >= 70) return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '#10b981' };
    if (score >= 40) return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '#f59e0b' };
    return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '#ef4444' };
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
    const { t } = useLang();
    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = { 
            pending: t('pendente'), 
            reviewed: t('analisado'), 
            shortlisted: t('preSelecionado'), 
            rejected: t('rejeitado'), 
            hired: t('contratado'),
            talent_bank: t('noBanco')
        };
        return labels[status] || status;
    };
    const [vaga, setVaga] = useState<Vaga | null>(null);
    const [candidatos, setCandidatos] = useState<Candidato[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandDetail, setSelectedCandDetail] = useState<CandidateDetail | null>(null);
    const [transferringCand, setTransferringCand] = useState<Candidato | null>(null);
    const [isMobile, setIsMobile] = useState(false);

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
                    .select('*')
                    .eq('vaga_id', id)
                    .order('match_score', { ascending: false });
                
                if (candError) throw candError;
                setCandidatos(candData || []);
            } catch (err) {
                console.error('Erro ao carregar dados:', err);
                toast.error(t('erroCarregarVaga'));
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
                        const updated = [newCand, ...prev].sort((a, b) => b.match_score - a.match_score);
                        return updated;
                    });
                    
                    // Atualizar contagem da vaga
                    setVaga(prev => prev ? { ...prev, application_count: prev.application_count + 1 } : prev);
                    
                    toast.success(t('candidatoAdicionado'), {
                        icon: '🔔',
                        duration: 5000,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleTransferSuccess = () => {
        if (id) {
            supabase.from('vagas_candidaturas')
                .select('*')
                .eq('vaga_id', id)
                .order('match_score', { ascending: false })
                .then(({ data }) => {
                    if (data) setCandidatos(data);
                });
        }
    };

    function optStr(v: unknown): string | null {
        return v != null ? String(v) : null;
    }

    const fetchCandidateDetail = async (c: Candidato) => {
        try {
            const answersRaw = (typeof c.answers === 'string' ? JSON.parse(c.answers) : c.answers) ?? {};
            const aiRaw = (c.ai_analysis ?? {}) as Record<string, unknown>;
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
                age: c.candidate_age,
                gender: c.candidate_gender,
                score: c.match_score,
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
            toast.error(t('erroCarregarCandidatos'));
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>{t('carregando')}</p>
            </div>
        );
    }

    if (!vaga) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>{t('vagaNaoEncontrada')}</p>
            </div>
        );
    }

    const gridColumns = '50px 1.3fr 1.1fr 0.5fr 0.7fr 0.7fr 0.6fr 0.4fr 0.4fr';

    return (
        <div style={{ fontFamily: 'Inter, sans-serif', padding: isMobile ? '16px' : '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: isMobile ? 20 : 32 }}>
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 8 : 12, flexDirection: isMobile ? 'column' : 'row' }}>
                    <button 
                        onClick={() => navigate('/vagas')}
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 8, 
                            color: '#94a3b8', 
                            fontSize: isMobile ? 14 : 16, 
                            padding: 0,
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                        <ArrowLeft size={isMobile ? 18 : 20} />
                        <span>{t('voltar')}</span>
                    </button>
                    <div style={{ width: isMobile ? '100%' : 'auto' }}>
                        <h1 style={{ color: 'var(--text-main)', fontSize: isMobile ? 22 : 32, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                            {vaga.title}
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={14} /> {vaga.company_name}
                            </span>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)' }} />
                            <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{vaga.application_count} {t('candidatos')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {candidatos.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                            {t('nenhumCandidato')}
                        </div>
                    ) : (
                        candidatos.map((candidato, index) => {
                            const matchColors = getMatchColor(candidato.match_score);
                            const statusColors = getStatusColor(candidato.status);
                            return (
                                <div key={candidato.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px' }}>
                                    <div onClick={() => fetchCandidateDetail(candidato)} style={{ cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: index < 3 ? 'var(--primary)' : 'var(--bg-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: index < 3 ? '#fff' : 'var(--text-dim)' }}>
                                                    {index + 1}
                                                </div>
                                                <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary), #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                                                    {candidato.candidate_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>{candidato.candidate_name}</div>
                                                </div>
                                            </div>
                                            <div style={{ padding: '4px 10px', background: matchColors.bg, border: `1px solid ${matchColors.border}33`, borderRadius: '8px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: matchColors.color }}>{candidato.match_score}%</div>
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
                                            <button onClick={(e) => { e.stopPropagation(); handleViewResume(candidato.resume_url!); }} title={t('curriculo')} style={{ minWidth: 44, minHeight: 44, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileText size={16} />
                                            </button>
                                        ) : null}
                                        <button onClick={(e) => { e.stopPropagation(); setTransferringCand(candidato); }} title={t('transferirParaTalento')} style={{ minWidth: 44, minHeight: 44, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <UserPlus size={16} />
                                        </button>
                                        <button onClick={() => fetchCandidateDetail(candidato)} title={t('visualizar')} style={{ minWidth: 44, minHeight: 44, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={16} />
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
                        {[t('rank'), t('candidato'), t('localizacao'), t('idade'), t('genero'), t('status'), t('score'), t('curriculo'), t('acoes')].map((h, i) => (
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
                            {t('nenhumCandidato')}
                        </div>
                    ) : (
                        <div>
                            {candidatos.map((candidato, index) => {
                                const matchColors = getMatchColor(candidato.match_score);
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
                                                <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary), #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
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
                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: matchColors.color }}>{candidato.match_score}%</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {(candidato.resume_url || candidato.resume_file_name) ? (
                                                    <button title={candidato.resume_file_name || t('curriculo')} onClick={(e) => { e.stopPropagation(); handleViewResume(candidato.resume_url!); }} style={{ width: 34, height: 34, padding: '0', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = 'var(--primary)'; }}
                                                    >
                                                        <FileText size={15} />
                                                    </button>
                                                ) : (<span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-</span>)}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <button title={t('transferirParaTalento')} onClick={(e) => { e.stopPropagation(); setTransferringCand(candidato); }} style={{ width: 34, height: 34, padding: '0', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.color = '#10b981'; }}
                                                >
                                                    <UserPlus size={15} />
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

            {selectedCandDetail && (
                isMobile ? (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--bg-main)', overflow: 'auto', padding: '16px' }}>
                        <CandidatePanel 
                            c={selectedCandDetail} 
                            onClose={() => setSelectedCandDetail(null)}
                            navigate={navigate}
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
                        />
                    </div>
                ) : (
                <CandidatePanel 
                    c={selectedCandDetail} 
                    onClose={() => setSelectedCandDetail(null)}
                    navigate={navigate}
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
                        match_score: transferringCand.match_score,
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { downloadResume } from '../../core/utils/storage';
import { FileText, Target, Search, X, Loader, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleViewResume } from '../../core/utils/storage';
import { CandidatePanel } from '../../features/analysis/CandidatePanel';
import { type CandidateDetail } from '../../features/analysis/CandidatePanelUtils';
import { PoolAddCandidate } from '../../features/candidates/components/PoolAddCandidate';
import DatePicker from '../../common/components/ui/DatePicker';
import { analyzeJobApplication } from '../../core/services/jobAnalyzer';
import { formatDate } from '../../core/utils/format';

interface Candidate {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    location: string | null;
    linkedin: string | null;
    resume_url: string | null;
    resume_file_name: string | null;
    created_at: string;
    status: string;
    gender: string | null;
    age: string | null;
    address: string | null;
    portfolio: string | null;
    cep: string | null;
    address_number: string | null;
    complement: string | null;
    skills: string | null;
    experience: string | null;
    education: string | null;
    analysis: Record<string, unknown> | null;
    viewed_at: string | null;
}

interface VagaItem {
    id: string;
    title: string;
    job_code?: string | null;
    status: string;
    candidate_count?: number;
}

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

export const PoolTalentos = () => {
    const { profile } = useUser();
    const navigate = useNavigate();
    const [candidatos, setCandidatos] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCandDetail, setSelectedCandDetail] = useState<CandidateDetail | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [analyzingCandidate, setAnalyzingCandidate] = useState<Candidate | null>(null);
    const [vagas, setVagas] = useState<VagaItem[]>([]);
    const [loadingVagas, setLoadingVagas] = useState(false);
    const [selectedVagaId, setSelectedVagaId] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [vagaSearch, setVagaSearch] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const check = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
        check(mq);
        mq.addEventListener('change', check);
        return () => mq.removeEventListener('change', check);
    }, []);

    useEffect(() => { setPage(1); }, [startDate, endDate]);

    useEffect(() => {
        const fetchData = async () => {
            if (!profile.organization_id) return;
            try {
                const { data, error } = await supabase
                    .from('candidates')
                    .select('*')
                    .or('source.eq.spontaneous,source.eq.manual_add,analysis->>source.eq.spontaneous,analysis->>source.eq.manual_add')
                    .eq('organization_id', profile.organization_id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setCandidatos(data || []);
            } catch (err) {
                console.error('Erro ao carregar pool de talentos:', err);
                toast.error('Erro ao carregar candidatos');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [profile.organization_id]);

    const filteredCandidatos = candidatos.filter(c => {
        if (!c.created_at) return !startDate && !endDate;
        const createdMs = new Date(c.created_at).getTime();
        const startMs = startDate ? new Date(startDate + 'T00:00:00').getTime() : -Infinity;
        const endMs = endDate ? new Date(endDate + 'T23:59:59.999').getTime() : Infinity;
        return createdMs >= startMs && createdMs <= endMs;
    });

    const totalPages = Math.max(1, Math.ceil(filteredCandidatos.length / PAGE_SIZE));
    const paginated = filteredCandidatos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

    function optStr(v: unknown): string | null {
        return v != null ? String(v) : null;
    }

    const fetchCandidateDetail = async (c: Candidate) => {
        try {
            // Mark as viewed
            if (!c.viewed_at) {
                supabase
                    .from('candidates')
                    .update({ viewed_at: new Date().toISOString() })
                    .eq('id', c.id)
                    .then(() => {
                        setCandidatos(prev => prev.map(p => p.id === c.id ? { ...p, viewed_at: new Date().toISOString() } : p));
                    });
            }

            const aiRaw = (c.analysis || {}) as unknown as Record<string, unknown>;

            const { data: jcData } = await supabase
                .from('job_candidates')
                .select('job_id, vaga_id')
                .eq('candidate_id', c.id);

            const validJobIds = new Set<string>();
            (jcData ?? []).forEach((jc: { job_id?: string; vaga_id?: string }) => {
                if (jc.job_id) validJobIds.add(jc.job_id);
                if (jc.vaga_id) validJobIds.add(jc.vaga_id);
            });

            const rawHistory = (aiRaw['history'] || []) as unknown as Record<string, unknown>[];
            const validHistory = rawHistory.filter(h => {
                const entry = h as Record<string, unknown>;
                const jobId = entry['job_id'] as string | undefined;
                const vagaId = entry['vaga_id'] as string | undefined;
                return (jobId || vagaId) && validJobIds.has(jobId || vagaId || '');
            });

            const vagaTitles = new Map<string, string>();
            const ids = Array.from(validJobIds);
            if (ids.length > 0) {
                const { data: vagas } = await supabase
                    .from('vagas_white_label')
                    .select('id, title')
                    .in('id', ids);
                (vagas ?? []).forEach(v => vagaTitles.set(v.id, v.title));
            }

            const applications = validHistory.map(h => {
                const entry = h as Record<string, unknown>;
                const jobId = (entry['job_id'] || entry['vaga_id'] || '') as string;
                return {
                    jobId,
                    jobName: (entry['job_name'] || entry['job_title'] || vagaTitles.get(jobId) || 'Vaga Desconhecida') as string,
                    jobCode: (entry['job_code'] || entry['code'] || '') as string,
                    score: (entry['score'] ?? entry['match_score'] ?? 0) as number,
                    appliedAt: (entry['analyzed_at'] || entry['date'] || entry['created_at'] || '') as string,
                    skills: optStr(entry['skills'] ?? entry['habilidades']),
                    experience: optStr(entry['summary'] ?? entry['experience'] ?? entry['experiencia']),
                    positivePoints: optStr(entry['strengths'] ?? entry['positivePoints'] ?? entry['pontos_positivos'] ?? entry['positive_points']),
                    education: optStr(entry['education'] ?? entry['formacao']),
                    redFlags: optStr(entry['gaps'] ?? entry['redFlags'] ?? entry['pontos_atencao'] ?? entry['attention_points']),
                    resume_url: (entry['resume_url'] as string | undefined) ?? null
                };
            });

            const detail: CandidateDetail = {
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                location: c.location,
                address: c.address || '',
                linkedin: c.linkedin,
                age: c.age,
                gender: c.gender,
                score: Number(aiRaw['score']) || 0,
                portfolio: c.portfolio,
                cep: c.cep,
                address_number: c.address_number,
                complement: c.complement,
                vagas: Array.from(vagaTitles.values()),
                interview_eligible: false,
                is_blacklisted: false,
                skills: optStr(aiRaw['skills'] || c.skills),
                experience: optStr(aiRaw['experience'] || c.experience),
                education: optStr(aiRaw['education'] || c.education),
                redFlags: optStr(aiRaw['gaps'] || aiRaw['redFlags'] || aiRaw['attention_points']),
                applications,
                pipelineCards: [],
                notes: null,
                resume_url: c.resume_url,
                enriched: true,
                analysis: aiRaw || null,
                conversations: [],
                hideBankButton: c.status === 'talent_bank',
                isVagaView: false,
                status: c.status,
                answers: null,
                questionLabels: {}
            };

            setSelectedCandDetail(detail);
        } catch (err) {
            console.error('[Fetch Detail] Error:', err);
            toast.error('Erro ao carregar detalhes do candidato');
        }
    };

    const fetchVagas = async () => {
        if (!profile.organization_id) return;
        setLoadingVagas(true);
        try {
            const { data } = await supabase
                .from('vagas_white_label')
                .select('id, title, job_code, status')
                .eq('organization_id', profile.organization_id)
                .eq('is_active', true)
                .in('status', ['aberta', 'invisivel'])
                .order('title');
            setVagas(data || []);
        } finally {
            setLoadingVagas(false);
        }
    };

    const openConfirmModal = (candidate: Candidate) => {
        setConfirmCandidate(candidate);
        setShowConfirm(true);
    };

    const closeConfirmModal = () => {
        setShowConfirm(false);
        setConfirmCandidate(null);
    };

    const openAnalyzeModal = () => {
        if (!confirmCandidate) return;
        setAnalyzingCandidate(confirmCandidate);
        setSelectedVagaId(null);
        setVagaSearch('');
        setShowConfirm(false);
        fetchVagas();
    };

    const closeAnalyzeModal = () => {
        setAnalyzingCandidate(null);
        setSelectedVagaId(null);
        setAnalyzing(false);
        setVagaSearch('');
        setShowConfirm(false);
        setConfirmCandidate(null);
    };

    const handleConfirmAnalyze = async () => {
        if (!analyzingCandidate || !selectedVagaId || analyzing) return;
        setAnalyzing(true);
        const vaga = vagas.find(v => v.id === selectedVagaId);
        if (!vaga) { toast.error('Vaga não encontrada'); setAnalyzing(false); return; }

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
                formAnswers[q.id] = `[${q.label}] não respondido (candidato do pool, reanálise sem formulário)`;
            });

            let result: Awaited<ReturnType<typeof analyzeJobApplication>> | null = null;

            if (analyzingCandidate.resume_url) {
                const resumeFile = await downloadResume(
                    analyzingCandidate.resume_url,
                    analyzingCandidate.resume_file_name || 'curriculo.pdf'
                );
                result = await analyzeJobApplication(resumeFile, vaga.title, jobDesc, formAnswers);
            }

            if (!result) {
                toast.error('Não foi possível analisar o currículo. Tente novamente.');
                setAnalyzing(false);
                return;
            }

            const aiData = result || {};

            await supabase.from('vagas_candidaturas').insert({
                vaga_id: vaga.id,
                organization_id: profile.organization_id,
                candidate_name: analyzingCandidate.name,
                candidate_email: analyzingCandidate.email,
                candidate_phone: analyzingCandidate.phone,
                candidate_location: analyzingCandidate.location,
                candidate_linkedin: analyzingCandidate.linkedin,
                candidate_gender: analyzingCandidate.gender,
                candidate_age: analyzingCandidate.age,
                resume_url: analyzingCandidate.resume_url,
                resume_file_name: analyzingCandidate.resume_file_name,
                status: 'reviewed',
                match_score: (aiData as unknown as Record<string, unknown>)?.score ?? 0,
                source: 'transferred_from_pool',
                answers: { _ai_analysis: aiData }
            });

            await supabase.from('job_candidates').upsert({
                candidate_id: analyzingCandidate.id,
                vaga_id: vaga.id,
                user_id: profile.userId,
                score: (aiData as unknown as Record<string, unknown>)?.score ?? 0,
                status: 'reviewed'
            }, { onConflict: 'candidate_id,vaga_id' });

            const oldAnalysis = (analyzingCandidate.analysis || {}) as Record<string, unknown>;
            await supabase.from('candidates').update({
                source: null,
                analysis: {
                    ...oldAnalysis,
                    source: 'transferred'
                }
            }).eq('id', analyzingCandidate.id);

            toast.success(`Candidato analisado para a vaga "${vaga.title}"`);
            closeAnalyzeModal();
            setSelectedCandDetail(null);
            if (profile.organization_id) {
                const { data } = await supabase
                    .from('candidates')
                    .select('*')
                    .or('source.eq.spontaneous,source.eq.manual_add,analysis->>source.eq.spontaneous,analysis->>source.eq.manual_add')
                    .eq('organization_id', profile.organization_id)
                    .order('created_at', { ascending: false });
                if (data) setCandidatos(data);
            }
        } catch (err) {
            console.error('[Pool] Erro ao reanalisar candidato:', err);
            toast.error('Erro ao reanalisar candidato');
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Carregando candidatos...</p>
            </div>
        );
    }

    const gridColumns = '50px 1.5fr 1fr 0.8fr 0.8fr 0.5fr 0.5fr';

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>

            <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, marginBottom: 24, flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}>Período:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>De:</span>
                        <DatePicker compact value={startDate} onChange={(v) => { setStartDate(v); setPage(1); }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>Até:</span>
                        <DatePicker compact value={endDate} onChange={(v) => { setEndDate(v); setPage(1); }} />
                    </div>
                    {(startDate || endDate) && (
                        <button onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                            style={{ padding: isMobile ? '10px 16px' : '10px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <X size={14} /> Limpar
                        </button>
                    )}
                </div>
                <button onClick={() => setShowAddModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary)', border: 'none', borderRadius: 10, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
                    <Plus size={16} /> Adicionar
                </button>
            </div>

            {paginated.length === 0 ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum candidato no pool de talentos.
                </div>
            ) : isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {paginated.map((candidato) => {
                        const statusColors = getStatusColor(candidato.status);
                        return (
                            <div key={candidato.id} onClick={() => fetchCandidateDetail(candidato)}
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 600, flexShrink: 0 }}>
                                        {candidato.name?.charAt(0) || '?'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {!candidato.viewed_at && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
                                            <span style={{ color: 'var(--text-main)', fontWeight: candidato.viewed_at ? 500 : 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candidato.name}</span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{candidato.email}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                        {(candidato.resume_url || candidato.resume_file_name) ? (
                                            <button onClick={(e) => { e.stopPropagation(); handleViewResume(candidato.resume_url!); }}
                                                style={{ width: 44, height: 44, padding: 0, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileText size={18} />
                                            </button>
                                        ) : null}
                                        <button onClick={(e) => { e.stopPropagation(); openConfirmModal(candidato); }}
                                            style={{ width: 44, height: 44, padding: 0, background: 'rgba(99,102,241,0.1)', border: '1px solid var(--primary)', borderRadius: 8, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Target size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                    {candidato.location && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>📍 {candidato.location}</span>}
                                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>· {formatDate(candidato.created_at)}</span>
                                    <div style={{ marginLeft: 'auto' }}>
                                        <span style={{ display: 'inline-block', padding: '4px 10px', background: statusColors.bg, color: statusColors.color, borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                                            {getStatusLabel(candidato.status)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {totalPages > 1 && (
                        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>{page} de {totalPages}</span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button onClick={() => goTo(page - 1)} disabled={page === 1}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: page === 1 ? 'var(--text-muted)' : 'var(--text-dim)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                                    <ChevronLeft size={15} /> Anterior
                                </button>
                                <button onClick={() => goTo(page + 1)} disabled={page === totalPages}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-dim)', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                                    Próximo <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: gridColumns, padding: '12px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                        {['Rank', 'Candidato', 'Localização', 'Data de Entrada', 'Gênero', 'Status', 'Ações'].map((h, i) => (
                            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: [0, 3, 4, 5, 6].includes(i) ? 'center' : 'left' }}>
                                {h}
                            </div>
                        ))}
                    </div>
                    <div>
                        {paginated.map((candidato, index) => {
                            const statusColors = getStatusColor(candidato.status);
                            return (
                                <div key={candidato.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <div onClick={() => fetchCandidateDetail(candidato)}
                                        style={{ display: 'grid', gridTemplateColumns: gridColumns, padding: '14px 24px', background: 'var(--bg-card)', cursor: 'pointer', transition: 'all 0.2s', alignItems: 'center' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--row-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: index < 3 ? 'var(--primary)' : 'var(--bg-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: index < 3 ? '#fff' : 'var(--text-dim)' }}>
                                                {index + 1}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                                                {candidato.name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {!candidato.viewed_at && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
                                                    <div style={{ color: 'var(--text-main)', fontWeight: candidato.viewed_at ? 500 : 700, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {candidato.name}
                                                    </div>
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{candidato.email}</div>
                                            </div>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {candidato.location || '-'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                            {formatDate(candidato.created_at)}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {candidato.gender ? (
                                                <span style={{ display: 'inline-block', padding: '2px 10px', background: candidato.gender?.toLowerCase().includes('fem') ? 'rgba(236,72,153,0.15)' : candidato.gender?.toLowerCase().includes('masc') ? 'rgba(59,130,246,0.15)' : 'rgba(100,116,139,0.1)', color: candidato.gender?.toLowerCase().includes('fem') ? '#ec4899' : candidato.gender?.toLowerCase().includes('masc') ? '#3b82f6' : '#64748b', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: `1px solid ${candidato.gender?.toLowerCase().includes('fem') ? '#ec489933' : candidato.gender?.toLowerCase().includes('masc') ? '#3b82f633' : '#64748b33'}` }}>
                                                    {candidato.gender}
                                                </span>
                                            ) : (<span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-</span>)}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ display: 'inline-block', padding: '4px 10px', background: statusColors.bg, color: statusColors.color, borderRadius: '8px', fontSize: '11px', fontWeight: 600 }}>
                                                {getStatusLabel(candidato.status)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                            {(candidato.resume_url || candidato.resume_file_name) ? (
                                                <button title={candidato.resume_file_name || 'Ver currículo'} onClick={(e) => { e.stopPropagation(); handleViewResume(candidato.resume_url!); }}
                                                    style={{ width: 34, height: 34, padding: '0', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = 'var(--primary)'; }}>
                                                    <FileText size={15} />
                                                </button>
                                            ) : (<span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-</span>)}
                                            <button title="Analisar para uma Vaga" onClick={(e) => { e.stopPropagation(); openConfirmModal(candidato); }}
                                                style={{ width: 34, height: 34, padding: '0', background: 'rgba(99,102,241,0.1)', border: '1px solid var(--primary)', borderRadius: '8px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = 'var(--primary)'; }}>
                                                <Target size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 13, color: '#64748b' }}>Página {page} de {totalPages} · {filteredCandidatos.length} candidatos</span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button onClick={() => goTo(page - 1)} disabled={page === 1}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', color: page === 1 ? 'var(--text-muted)' : 'var(--text-dim)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                                    <ChevronLeft size={15} /> Anterior
                                </button>
                                <button onClick={() => goTo(page + 1)} disabled={page === totalPages}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-dim)', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                                    Próximo <ChevronRight size={15} />
                                </button>
                            </div>
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
                            onTransferSuccess={() => {
                                setSelectedCandDetail(null);
                                if (profile.organization_id) {
                                    supabase
                                        .from('candidates')
                                        .select('*')
                                        .or('source.eq.spontaneous,source.eq.manual_add,analysis->>source.eq.spontaneous,analysis->>source.eq.manual_add')
                                        .eq('organization_id', profile.organization_id)
                                        .order('created_at', { ascending: false })
                                        .then(({ data }) => {
                                            if (data) setCandidatos(data);
                                        });
                                }
                            }}
                            onNotesChange={(cid, notes) => {
                                setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, notes } : prev);
                            }}
                            onFieldChange={(cid: string, field: string, val: unknown) => {
                                setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, [field]: val } : prev);
                                setCandidatos(prev => prev.map(cand => cand.id === cid ? { ...cand, [field]: val } : cand));
                            }}
                            onBlacklistChange={(cid: string, val: boolean) => {
                                setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, is_blacklisted: val } : prev);
                            }}
                            onDeleteFromBank={async (id) => {
                                await Promise.all([
                                    supabase.from('candidates').delete().eq('id', id),
                                    supabase.from('job_candidates').delete().eq('candidate_id', id)
                                ]);
                                setSelectedCandDetail(null);
                                if (profile.organization_id) {
                                    const { data } = await supabase
                                        .from('candidates')
                                        .select('*')
                                        .or('source.eq.spontaneous,source.eq.manual_add,analysis->>source.eq.spontaneous,analysis->>source.eq.manual_add')
                                        .eq('organization_id', profile.organization_id)
                                        .order('created_at', { ascending: false });
                                    if (data) setCandidatos(data);
                                }
                            }}
                            hidePipelineAndBlacklist={true}
                            showAnalyzeWithVagas={true}
                            onAnalyzeWithVagas={(cid) => {
                                const cand = candidatos.find(c => c.id === cid);
                                if (cand) openConfirmModal(cand);
                            }}
                        />
                    </div>
                ) : (
                <CandidatePanel
                    c={selectedCandDetail}
                    onClose={() => setSelectedCandDetail(null)}
                    navigate={navigate}
                    onTransferSuccess={() => {
                        setSelectedCandDetail(null);
                        if (profile.organization_id) {
                            supabase
                                .from('candidates')
                                .select('*')
                                .or('source.eq.spontaneous,source.eq.manual_add,analysis->>source.eq.spontaneous,analysis->>source.eq.manual_add')
                                .eq('organization_id', profile.organization_id)
                                .order('created_at', { ascending: false })
                                .then(({ data }) => {
                                    if (data) setCandidatos(data);
                                });
                        }
                    }}
                    onNotesChange={(cid, notes) => {
                        setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, notes } : prev);
                    }}
                    onFieldChange={(cid: string, field: string, val: unknown) => {
                        setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, [field]: val } : prev);
                        setCandidatos(prev => prev.map(cand => cand.id === cid ? { ...cand, [field]: val } : cand));
                    }}
                    onBlacklistChange={(cid: string, val: boolean) => {
                        setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, is_blacklisted: val } : prev);
                    }}
                    onDeleteFromBank={async (id) => {
                        await Promise.all([
                            supabase.from('candidates').delete().eq('id', id),
                            supabase.from('job_candidates').delete().eq('candidate_id', id)
                        ]);
                        setSelectedCandDetail(null);
                        if (profile.organization_id) {
                            const { data } = await supabase
                                .from('candidates')
                                .select('*')
                                .or('source.eq.spontaneous,source.eq.manual_add,analysis->>source.eq.spontaneous,analysis->>source.eq.manual_add')
                                .eq('organization_id', profile.organization_id)
                                .order('created_at', { ascending: false });
                            if (data) setCandidatos(data);
                        }
                    }}
                    hidePipelineAndBlacklist={true}
                    showAnalyzeWithVagas={true}
                    onAnalyzeWithVagas={(cid) => {
                        const cand = candidatos.find(c => c.id === cid);
                        if (cand) openConfirmModal(cand);
                    }}
                />
            ))}

            {analyzingCandidate && (
                <>
                    <div onClick={closeAnalyzeModal} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        zIndex: 401, width: isMobile ? '95%' : 'clamp(400px, 40vw, 600px)',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 20, fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        display: 'flex', flexDirection: 'column', maxHeight: isMobile ? '90vh' : '80vh'
                    }}>
                        <div style={{ padding: isMobile ? '16px 16px 12px' : '24px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: 'var(--text-main)' }}>
                                Selecionar vaga para reanálise
                            </h2>
                            <button onClick={closeAnalyzeModal} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: 8, cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}>
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
                                <Search size={16} color="var(--text-dim)" />
                                <input
                                    value={vagaSearch}
                                    onChange={e => setVagaSearch(e.target.value)}
                                    placeholder="Buscar vaga..."
                                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif' }}
                                />
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                            {loadingVagas ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Loader size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                                    <p style={{ fontSize: 13, margin: 0 }}>Carregando vagas...</p>
                                </div>
                            ) : vagas.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <p style={{ fontSize: 13, margin: 0 }}>Nenhuma vaga disponível.</p>
                                </div>
                            ) : (
                                vagas
                                    .filter(v => v.title.toLowerCase().includes(vagaSearch.toLowerCase()))
                                    .map(vaga => (
                                        <div
                                            key={vaga.id}
                                            onClick={() => setSelectedVagaId(vaga.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '12px 24px', cursor: 'pointer',
                                                background: selectedVagaId === vaga.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                                                borderLeft: selectedVagaId === vaga.id ? '3px solid var(--primary)' : '3px solid transparent',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => { if (selectedVagaId !== vaga.id) e.currentTarget.style.background = 'var(--bg-main)'; }}
                                            onMouseLeave={e => { if (selectedVagaId !== vaga.id) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <div>
                                                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {vaga.title}
                                                    {vaga.job_code && <span style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{vaga.job_code}</span>}
                                                </p>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 600, marginTop: 4, display: 'inline-block',
                                                    padding: '2px 8px', borderRadius: 6,
                                                    background: vaga.status === 'aberta' ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)',
                                                    color: vaga.status === 'aberta' ? '#22c55e' : '#a855f7'
                                                }}>
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

                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                                onClick={closeAnalyzeModal}
                                style={{
                                    padding: '10px 20px', background: 'transparent',
                                    border: '1px solid var(--border)', borderRadius: 12,
                                    color: 'var(--text-dim)', fontSize: 13, fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmAnalyze}
                                disabled={!selectedVagaId || analyzing}
                                style={{
                                    padding: '10px 24px',
                                    background: selectedVagaId && !analyzing ? 'var(--primary)' : 'var(--border)',
                                    border: 'none', borderRadius: 12,
                                    color: selectedVagaId && !analyzing ? '#fff' : 'var(--text-dim)',
                                    fontSize: 13, fontWeight: 700,
                                    cursor: selectedVagaId && !analyzing ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {analyzing ? (
                                    <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analisando...</>
                                ) : (
                                    <>Analisar</>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {showConfirm && confirmCandidate && (
                <>
                    <div onClick={closeConfirmModal} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        zIndex: 401, width: isMobile ? '95%' : 'clamp(380px, 35vw, 500px)',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 20, fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ padding: isMobile ? '16px 16px 12px' : '24px 24px 16px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: 'var(--text-main)' }}>
                                Confirmar análise
                            </h2>
                        </div>
                        <div style={{ padding: isMobile ? '16px' : '20px 24px' }}>
                            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-main)', lineHeight: '1.6' }}>
                                Deseja analisar <strong>{confirmCandidate.name}</strong> para uma vaga?
                            </p>
                            <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: '1.5' }}>
                                Isso vai consumir uma análise via IA e remover o candidato do Pool de Talentos.
                            </p>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                                onClick={closeConfirmModal}
                                style={{
                                    padding: '10px 20px', background: 'transparent',
                                    border: '1px solid var(--border)', borderRadius: 12,
                                    color: 'var(--text-dim)', fontSize: 13, fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={openAnalyzeModal}
                                style={{
                                    padding: '10px 24px',
                                    background: 'var(--primary)',
                                    border: 'none', borderRadius: 12,
                                    color: '#fff', fontSize: 13, fontWeight: 700,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                            >
                                Sim, analisar
                            </button>
                        </div>
                    </div>
                </>
            )}

            {showAddModal && (
                <PoolAddCandidate
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        if (profile.organization_id) {
                            supabase
                                .from('candidates')
                                .select('*')
                                .or('source.eq.spontaneous,source.eq.manual_add,analysis->>source.eq.spontaneous,analysis->>source.eq.manual_add')
                                .eq('organization_id', profile.organization_id)
                                .order('created_at', { ascending: false })
                                .then(({ data }) => {
                                    if (data) setCandidatos(data);
                                });
                        }
                    }}
                />
            )}


        </div>
    );
};
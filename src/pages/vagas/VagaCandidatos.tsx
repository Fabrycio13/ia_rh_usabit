import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import { ArrowLeft, UserPlus, User, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
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
                        const updated = [newCand, ...prev].sort((a, b) => b.match_score - a.match_score);
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
            const answersRaw = c.answers ?? {};
            const aiRaw = (c.ai_analysis ?? {}) as Record<string, unknown>;
            const aiFromAnswers = answersRaw['_ai_analysis'] as Record<string, unknown> | undefined;

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
                analysis: aiRaw || aiFromAnswers || null,
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

    const gridColumns = '50px 1.3fr 1.1fr 0.5fr 0.7fr 0.7fr 0.6fr 0.4fr 0.4fr';

    return (
        <div style={{ fontFamily: 'Inter, sans-serif', padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                            fontSize: 16, 
                            padding: 0,
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                        <ArrowLeft size={20} />
                        <span>Voltar</span>
                    </button>
                    <span style={{ color: 'var(--border)', fontSize: 24, fontWeight: 300 }}>|</span>
                    <div>
                        <h1 style={{ color: 'var(--text-main)', fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                            {vaga.title}
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                            <span style={{ fontSize: 14, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={16} /> {vaga.company_name}
                            </span>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)' }} />
                            <span style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>{vaga.application_count} Candidatos</span>
                        </div>
                    </div>
                </div>
            </div>


            {/* Table */}
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
                                            <div style={{ 
                                                width: 26, height: 26, borderRadius: '50%', 
                                                background: index < 3 ? 'var(--primary)' : 'var(--bg-main)', 
                                                border: '1px solid var(--border)', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                fontSize: 11, fontWeight: 700, 
                                                color: index < 3 ? '#fff' : 'var(--text-dim)' 
                                            }}>
                                                {index + 1}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '8px',
                                                background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0
                                            }}>
                                                {candidato.candidate_name.charAt(0)}
                                            </div>
                                            <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {candidato.candidate_name}
                                            </div>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {candidato.candidate_location || '-'}
                                        </div>
                                        {/* Idade */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                                {candidato.candidate_age ? `${candidato.candidate_age} anos` : '-'}
                                            </span>
                                        </div>
                                        {/* Gênero */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {candidato.candidate_gender ? (
                                                <span style={{
                                                    display: 'inline-block', padding: '2px 10px',
                                                    background: candidato.candidate_gender?.toLowerCase().includes('fem') 
                                                        ? 'rgba(236,72,153,0.15)' 
                                                        : candidato.candidate_gender?.toLowerCase().includes('masc') 
                                                            ? 'rgba(59,130,246,0.15)'
                                                            : 'rgba(100,116,139,0.1)',
                                                    color: candidato.candidate_gender?.toLowerCase().includes('fem') 
                                                        ? '#ec4899' 
                                                        : candidato.candidate_gender?.toLowerCase().includes('masc') 
                                                            ? '#3b82f6'
                                                            : '#64748b',
                                                    borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                                    border: `1px solid ${
                                                        candidato.candidate_gender?.toLowerCase().includes('fem') 
                                                            ? '#ec489933' 
                                                            : candidato.candidate_gender?.toLowerCase().includes('masc') 
                                                                ? '#3b82f633'
                                                                : '#64748b33'
                                                    }`
                                                }}>
                                                    {candidato.candidate_gender}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-</span>
                                            )}
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
                                                <button
                                                    title={candidato.resume_file_name || 'Ver currículo'}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewResume(candidato.resume_url!);
                                                    }}
                                                    style={{ 
                                                        width: 34, height: 34,
                                                        padding: '0', 
                                                        background: 'rgba(99,102,241,0.08)', 
                                                        border: '1px solid rgba(99,102,241,0.3)', 
                                                        borderRadius: '8px', 
                                                        color: 'var(--primary)', 
                                                        cursor: 'pointer', 
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = 'var(--primary)'; }}
                                                >
                                                    <FileText size={15} />
                                                </button>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <button
                                                title="Mover para Banco de Talentos"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTransferringCand(candidato);
                                                }}
                                                style={{ 
                                                    width: 34, height: 34,
                                                    padding: '0', 
                                                    background: 'rgba(16, 185, 129, 0.1)', 
                                                    border: '1px solid #10b981', 
                                                    borderRadius: '8px', 
                                                    color: '#10b981', 
                                                    cursor: 'pointer', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                    transition: 'all 0.2s' 
                                                }}
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

            {selectedCandDetail && (
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
                    }}
                    onBlacklistChange={(cid: string, val: boolean) => {
                        setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, is_blacklisted: val } : prev);
                    }}
                />
            )}

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

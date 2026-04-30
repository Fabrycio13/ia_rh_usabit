import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import { ArrowLeft, UserPlus, Check } from 'lucide-react';
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
}

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
    answers?: Record<string, any> | null;
}

const getMatchColor = (score: number) => {
    if (score >= 85) return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '#22c55e' };
    if (score >= 70) return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '#3b82f6' };
    if (score >= 50) return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '#f59e0b' };
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
                    .select('id, title, company_name, application_count, is_pcd, custom_questions')
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

    const fetchCandidateDetail = async (c: Candidato) => {
        try {
            // Usamos apenas os dados da inscrição (vagas_candidaturas).
            // O candidato só vira "Talent Bank" após o clique no botão de transferência.
            const detail: CandidateDetail = {
                id: c.id, 
                name: c.candidate_name,
                email: c.candidate_email,
                phone: c.candidate_phone,
                location: c.candidate_location,
                address: null,
                linkedin: c.candidate_linkedin,
                age: c.candidate_age,
                gender: c.candidate_gender,
                score: c.match_score,
                portfolio: null,
                cep: null,
                address_number: null,
                complement: null,
                vagas: [],
                interview_eligible: false,
                is_blacklisted: false,
                skills: (c as any).ai_analysis?.skills || c.answers?._ai_analysis?.skills || null,
                experience: (c as any).ai_analysis?.experience || c.answers?._ai_analysis?.experience || null,
                education: (c as any).ai_analysis?.education || c.answers?._ai_analysis?.education || null,
                redFlags: (c as any).ai_analysis?.redFlags || c.answers?._ai_analysis?.redFlags || null,
                applications: [],
                pipelineCards: [],
                notes: null,
                resume_url: c.resume_url,
                enriched: true,
                analysis: (c as any).ai_analysis || c.answers?._ai_analysis || null,
                conversations: [],
                hideBankButton: false
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

    const gridColumns = '60px 2fr 1.5fr 1fr 0.8fr 110px 80px';

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
                <div style={{ display: 'grid', gridTemplateColumns: gridColumns, padding: '16px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                    {['Rank', 'Candidato', 'Localização', 'Status', 'Score', 'Currículo', 'Ações'].map((h, i) => (
                        <div key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i >= 3 && i <= 5 ? 'center' : 'left' }}>
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
                                            padding: '16px 24px',
                                            background: 'var(--bg-card)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            alignItems: 'center'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--row-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: index < 3 ? 'var(--primary)' : 'var(--bg-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: index < 3 ? '#fff' : 'var(--text-dim)' }}>
                                                {index + 1}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 36, height: 36, borderRadius: '10px',
                                                background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#fff', fontSize: 14, fontWeight: 600, flexShrink: 0
                                            }}>
                                                {candidato.candidate_name.charAt(0)}
                                            </div>
                                            <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '14px' }}>
                                                {candidato.candidate_name}
                                            </div>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                            {candidato.candidate_location || '-'}
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
                                                    style={{ padding: '6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <FileText size={14} />
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
                                                style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.color = '#10b981'; }}
                                            >
                                                <UserPlus size={16} />
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
                    onNotesChange={(cid, notes) => {
                        setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, notes } : prev);
                    }}
                    onEligibleChange={async (_cid, val) => {
                        // Logic handled within CandidatePanel or via parent refresh
                        toast.success(val ? 'Candidato marcado como apto' : 'Candidato removido de aptos');
                    }}
                    onRemoveCard={async (cardId, cid) => {
                        await supabase.from('pipeline_cards').delete().eq('id', cardId);
                        setSelectedCandDetail(prev => {
                            if (!prev || prev.id !== cid) return prev;
                            const filtered = (prev.pipelineCards || []).filter(p => p.id !== cardId);
                            return { ...prev, pipelineCards: filtered };
                        });
                        toast.success('Removido do processo com sucesso');
                    }}
                    onFieldChange={(cid, field, val) => {
                        setSelectedCandDetail(prev => prev && prev.id === cid ? { ...prev, [field]: val } : prev);
                    }}
                    onBlacklistChange={(cid, val) => {
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
                        address: transferringCand.answers?.address,
                        portfolio: transferringCand.answers?.portfolio,
                        cep: transferringCand.answers?.cep,
                        address_number: transferringCand.answers?.address_number,
                        complement: transferringCand.answers?.complement,
                        match_score: transferringCand.match_score,
                        answers: transferringCand.answers
                    }}
                    job={{
                        id: vaga.id,
                        title: vaga.title
                    }}
                    onClose={() => setTransferringCand(null)}
                    onSuccess={handleTransferSuccess}
                />
            )}
        </div>
    );
};

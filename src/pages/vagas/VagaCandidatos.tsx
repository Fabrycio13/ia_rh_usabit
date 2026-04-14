import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import { ArrowLeft, User, Phone, FileText, Star, ExternalLink, TrendingUp, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Vaga {
    id: string;
    title: string;
    company_name: string | null;
    application_count: number;
    is_pcd: boolean;
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
}

// Dados mockados para demonstração
const mockCandidatos: Candidato[] = [
    { id: '1', candidate_name: 'Ana Silva', candidate_email: 'ana.silva@email.com', candidate_phone: '(11) 98765-4321', candidate_location: 'São Paulo, SP', candidate_linkedin: 'https://linkedin.com/in/anasilva', resume_url: null, resume_file_name: 'curriculo_ana.pdf', applied_at: '2026-04-08T10:30:00Z', status: 'pending', match_score: 95 },
    { id: '2', candidate_name: 'Carlos Oliveira', candidate_email: 'carlos.oliveira@email.com', candidate_phone: '(21) 97654-3210', candidate_location: 'Rio de Janeiro, RJ', candidate_linkedin: 'https://linkedin.com/in/carlosoliveira', resume_url: null, resume_file_name: 'cv_carlos.pdf', applied_at: '2026-04-07T14:20:00Z', status: 'pending', match_score: 88 },
    { id: '3', candidate_name: 'Mariana Santos', candidate_email: 'mariana.santos@email.com', candidate_phone: '(31) 96543-2109', candidate_location: 'Belo Horizonte, MG', candidate_linkedin: null, resume_url: null, resume_file_name: 'curriculo_mariana.pdf', applied_at: '2026-04-06T09:15:00Z', status: 'reviewed', match_score: 82 },
    { id: '4', candidate_name: 'Pedro Costa', candidate_email: 'pedro.costa@email.com', candidate_phone: null, candidate_location: 'Curitiba, PR', candidate_linkedin: 'https://linkedin.com/in/pedrocosta', resume_url: null, resume_file_name: 'cv_pedro.pdf', applied_at: '2026-04-05T16:45:00Z', status: 'pending', match_score: 75 },
    { id: '5', candidate_name: 'Juliana Lima', candidate_email: 'juliana.lima@email.com', candidate_phone: '(41) 95432-1098', candidate_location: 'Florianópolis, SC', candidate_linkedin: 'https://linkedin.com/in/julianalima', resume_url: null, resume_file_name: 'curriculo_juliana.pdf', applied_at: '2026-04-04T11:00:00Z', status: 'shortlisted', match_score: 70 },
    { id: '6', candidate_name: 'Roberto Almeida', candidate_email: 'roberto.almeida@email.com', candidate_phone: '(51) 94321-0987', candidate_location: 'Porto Alegre, RS', candidate_linkedin: null, resume_url: null, resume_file_name: 'cv_roberto.pdf', applied_at: '2026-04-03T08:30:00Z', status: 'pending', match_score: 62 },
    { id: '7', candidate_name: 'Fernanda Souza', candidate_email: 'fernanda.souza@email.com', candidate_phone: '(61) 93210-9876', candidate_location: 'Brasília, DF', candidate_linkedin: 'https://linkedin.com/in/fernandasouza', resume_url: null, resume_file_name: 'curriculo_fernanda.pdf', applied_at: '2026-04-02T13:20:00Z', status: 'rejected', match_score: 45 },
];

const getMatchColor = (score: number) => {
    if (score >= 85) return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '#22c55e' };
    if (score >= 70) return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '#3b82f6' };
    if (score >= 50) return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '#f59e0b' };
    return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '#ef4444' };
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { pending: 'Pendente', reviewed: 'Analisado', shortlisted: 'Pré-selecionado', rejected: 'Rejeitado', hired: 'Contratado' };
    return labels[status] || status;
};

const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
        pending: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
        reviewed: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
        shortlisted: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },
        rejected: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
        hired: { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' },
    };
    return colors[status] || { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748b' };
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const VagaCandidatos = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [vaga, setVaga] = useState<Vaga | null>(null);
    const [candidatos, setCandidatos] = useState<Candidato[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCandidatoId, setExpandedCandidatoId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const { data: vagaData, error: vagaError } = await supabase
                    .from('vagas_white_label')
                    .select('id, title, company_name, application_count, is_pcd')
                    .eq('id', id)
                    .single();
                if (vagaError) throw vagaError;
                setVaga(vagaData);
                setCandidatos(mockCandidatos.sort((a, b) => b.match_score - a.match_score));
            } catch (err) {
                console.error('Erro ao carregar dados:', err);
                toast.error('Erro ao carregar dados da vaga');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

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

    // Grid columns MUST be identical between header and rows
    const gridColumns = '60px 2fr 1.5fr 1.2fr 1fr 0.8fr 110px 150px';

    return (
        <div className="text-[var(--text-main)]">
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                    <button
                        onClick={() => navigate('/vagas')}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '8px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s'
                        }}
                    >
                        <ArrowLeft size={16} />
                        Voltar para Vagas
                    </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                    <User size={32} style={{ color: 'var(--primary)' }} />
                    <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {vaga.title}
                        {vaga.is_pcd && (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                background: 'rgba(236, 72, 153, 0.15)',
                                borderRadius: '12px',
                                color: '#ec4899',
                                fontSize: '12px',
                                fontWeight: 700
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="10" cy="4" r="2.5" />
                                    <path d="M10 6.5 L10 11 L13 11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                                    <path d="M10 8 L13 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                    <circle cx="12" cy="14" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
                                    <path d="M8 11 L14 11" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                    <path d="M8 11 L8 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                    <path d="M14 11 L16 13 L15 14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Vaga PcD
                            </span>
                        )}
                    </h1>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                    {vaga.application_count} {vaga.application_count === 1 ? 'candidatura recebida' : 'candidaturas recebidas'}
                </p>
            </div>

            {/* Stats Cards */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px', marginBottom: '32px'
            }}>
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={20} style={{ color: 'var(--primary)' }} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>Total</p>
                            <p style={{ color: 'var(--text-main)', fontSize: '24px', fontWeight: 700, margin: 0 }}>{candidatos.length}</p>
                        </div>
                    </div>
                </div>
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Star size={20} style={{ color: '#22c55e' }} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>Match Alto</p>
                            <p style={{ color: '#22c55e', fontSize: '24px', fontWeight: 700, margin: 0 }}>{candidatos.filter(c => c.match_score >= 85).length}</p>
                        </div>
                    </div>
                </div>
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Clock size={20} style={{ color: '#f59e0b' }} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>Pendentes</p>
                            <p style={{ color: '#f59e0b', fontSize: '24px', fontWeight: 700, margin: 0 }}>{candidatos.filter(c => c.status === 'pending').length}</p>
                        </div>
                    </div>
                </div>
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={20} style={{ color: '#3b82f6' }} />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>Média Match</p>
                            <p style={{ color: '#3b82f6', fontSize: '24px', fontWeight: 700, margin: 0 }}>{Math.round(candidatos.reduce((acc, c) => acc + c.match_score, 0) / candidatos.length)}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Candidatos List */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                overflow: 'hidden'
            }}>
                {candidatos.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <User size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p style={{ fontSize: '16px', marginBottom: '8px' }}>Nenhum candidato encontrado</p>
                        <p style={{ fontSize: '14px' }}>Ainda não há candidaturas para esta vaga</p>
                    </div>
                ) : (
                    <div>
                        {/* Table Header */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: gridColumns,
                            padding: '16px 24px',
                            borderBottom: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            fontSize: '12px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            <div style={{ textAlign: 'center' }}>Rank</div>
                            <div>Candidato</div>
                            <div>Localização</div>
                            <div>Contato</div>
                            <div style={{ textAlign: 'center' }}>Status</div>
                            <div style={{ textAlign: 'center' }}>Match</div>
                            <div style={{ textAlign: 'center' }}>Currículo</div>
                            <div style={{ textAlign: 'center' }}>Data</div>
                        </div>

                        {/* Table Rows */}
                        {candidatos.map((candidato, index) => {
                            const matchColors = getMatchColor(candidato.match_score);
                            const statusColors = getStatusColor(candidato.status);
                            const isExpanded = expandedCandidatoId === candidato.id;

                            return (
                                <div key={candidato.id}>
                                    <div
                                        onClick={() => setExpandedCandidatoId(isExpanded ? null : candidato.id)}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: gridColumns,
                                            padding: '16px 24px',
                                            borderBottom: '1px solid var(--border)',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
                                            background: isExpanded ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                                        }}
                                        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'; }}
                                        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        {/* Rank */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '8px',
                                                background: index < 3 ? 'linear-gradient(135deg, var(--primary), #7c3aed)' : 'var(--bg-main)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: index < 3 ? '#fff' : 'var(--text-muted)',
                                                fontSize: '14px',
                                                fontWeight: 700
                                            }}>
                                                {index + 1}
                                            </div>
                                        </div>

                                        {/* Candidato */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                flexShrink: 0
                                            }}>
                                                {candidato.candidate_name.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '14px' }}>
                                                    {candidato.candidate_name}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                            {candidato.candidate_location || '-'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '14px', overflow: 'hidden' }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candidato.candidate_email}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 10px',
                                                background: statusColors.bg,
                                                color: statusColors.color,
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                fontWeight: 600
                                            }}>
                                                {getStatusLabel(candidato.status)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{
                                                padding: '6px 12px',
                                                background: matchColors.bg,
                                                border: `1px solid ${matchColors.border}33`,
                                                borderRadius: '10px',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: '16px', fontWeight: 700, color: matchColors.color }}>{candidato.match_score}%</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {candidato.resume_file_name ? (
                                                <button
                                                    title="Ver currículo"
                                                    style={{
                                                        padding: '6px',
                                                        background: 'transparent',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '6px',
                                                        color: 'var(--primary)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <FileText size={14} />
                                                </button>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-</span>
                                            )}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                                            {formatDate(candidato.applied_at)}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div style={{
                                            padding: '20px 24px',
                                            background: 'var(--bg-main)',
                                            borderBottom: '1px solid var(--border)',
                                            animation: 'fadeIn 0.3s ease-out'
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                                {candidato.candidate_phone && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                                                        <Phone size={16} style={{ color: 'var(--primary)' }} />
                                                        {candidato.candidate_phone}
                                                    </div>
                                                )}
                                                {candidato.candidate_linkedin && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                                                        <ExternalLink size={16} style={{ color: 'var(--primary)' }} />
                                                        <a href={candidato.candidate_linkedin} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>LinkedIn</a>
                                                    </div>
                                                )}
                                                {candidato.resume_file_name && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                                                        <FileText size={16} style={{ color: 'var(--primary)' }} />
                                                        {candidato.resume_file_name}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Match Breakdown (Mock) */}
                                            <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                                <h4 style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>Análise de Match (IA)</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Requisitos Técnicos</span>
                                                        <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>92%</span>
                                                    </div>
                                                    <div style={{ height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: '92%', height: '100%', background: '#22c55e', borderRadius: '3px' }} />
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Experiência</span>
                                                        <span style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 600 }}>85%</span>
                                                    </div>
                                                    <div style={{ height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: '85%', height: '100%', background: '#3b82f6', borderRadius: '3px' }} />
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Formação</span>
                                                        <span style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 600 }}>78%</span>
                                                    </div>
                                                    <div style={{ height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: '78%', height: '100%', background: '#f59e0b', borderRadius: '3px' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

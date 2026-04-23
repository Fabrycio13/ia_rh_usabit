import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import { ArrowLeft, User, Phone, FileText, Star, ExternalLink, TrendingUp, Clock, Bot, Mail, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleViewResume } from '../../core/utils/storage';

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
    answers?: Record<string, any> | null;
}

// Estilos para facilitar personalização dinâmica

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
                // Fetch Vaga
                const { data: vagaData, error: vagaError } = await supabase
                    .from('vagas_white_label')
                    .select('id, title, company_name, application_count, is_pcd, custom_questions')
                    .eq('id', id)
                    .single();
                if (vagaError) throw vagaError;
                setVaga(vagaData);

                // Fetch Real Candidates
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
                        {vaga.is_pcd && vaga.is_pcd !== 'no' && (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                background: vaga.is_pcd === 'exclusive' 
                                    ? 'rgba(236, 72, 153, 0.15)' 
                                    : 'rgba(59, 130, 246, 0.15)',
                                borderRadius: '12px',
                                color: vaga.is_pcd === 'exclusive' ? '#ec4899' : '#3b82f6',
                                fontSize: '11px',
                                fontWeight: 700,
                                marginLeft: '8px'
                            }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="10" cy="4" r="2.5" />
                                    <path d="M10 6.5 L10 11 L13 11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                                    <path d="M10 8 L13 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                    <circle cx="12" cy="14" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
                                    <path d="M8 11 L14 11" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                    <path d="M8 11 L8 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                    <path d="M14 11 L16 13 L15 14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {vaga.is_pcd === 'exclusive' ? 'Exclusiva PcD' : 'Inclusiva'}
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewResume(candidato.resume_url!);
                                                    }}
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
                                            <div style={{ marginBottom: '24px' }}>
                                                <h4 style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <User size={18} style={{ color: 'var(--primary)' }} />
                                                    Informações de Contato e Endereço
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                                    {candidato.candidate_phone && (
                                                        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                                                <Phone size={16} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Telefone</div>
                                                                <div style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>{candidato.candidate_phone}</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                                            <Mail size={16} />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>E-mail</div>
                                                            <div style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>{candidato.candidate_email}</div>
                                                        </div>
                                                    </div>
                                                    {candidato.candidate_linkedin && (
                                                        <a href={candidato.candidate_linkedin} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                                                <ExternalLink size={16} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>LinkedIn</div>
                                                                <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 600 }}>Acessar Perfil</div>
                                                            </div>
                                                        </a>
                                                    )}
                                                    {candidato.answers?.portfolio && (
                                                        <a href={candidato.answers.portfolio} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                                                <ExternalLink size={16} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Portfólio</div>
                                                                <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 600 }}>Ver Projetos</div>
                                                            </div>
                                                        </a>
                                                    )}
                                                </div>

                                                {candidato.answers?.cep && (
                                                    <div style={{ marginTop: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                                                            <MapPin size={16} />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Endereço Residencial</span>
                                                                <div style={{ height: '4px', width: '4px', borderRadius: '50%', background: 'var(--border)', opacity: 0.5 }} />
                                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>CEP: {candidato.answers.cep}</span>
                                                            </div>
                                                            <div style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 600, lineHeight: 1.4 }}>
                                                                {candidato.answers.address}, {candidato.answers.address_number} 
                                                                {candidato.answers.complement && (
                                                                    <span style={{ color: 'var(--primary)', marginLeft: '6px' }}>({candidato.answers.complement})</span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                {candidato.candidate_location}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Custom Answers */}
                                            {vaga.custom_questions && vaga.custom_questions.length > 0 && (
                                                <div style={{ marginTop: '16px', padding: '20px', background: 'rgba(99, 102, 241, 0.03)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                                                    <h4 style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                                                        Perguntas Adicionais da Vaga
                                                    </h4>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                                        {vaga.custom_questions.map(q => (
                                                            <div key={q.id}>
                                                                <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                    {q.label}
                                                                </p>
                                                                <p style={{ color: 'var(--text-main)', fontSize: '14px', margin: 0, lineHeight: '1.5', background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                                    {candidato.answers?.[q.id] || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Não respondido</span>}
                                                                    {candidato.answers?.[`${q.id}_extra`] && (
                                                                        <span style={{ 
                                                                            display: 'block', 
                                                                            marginTop: '8px', 
                                                                            paddingTop: '8px', 
                                                                            borderTop: '1px solid var(--border)', 
                                                                            fontSize: '13px', 
                                                                            color: 'var(--text-main)',
                                                                            fontStyle: 'italic'
                                                                        }}>
                                                                            <span style={{ color: 'var(--primary)', fontWeight: 600, fontStyle: 'normal' }}>Complemento:</span> {candidato.answers[`${q.id}_extra`]}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* AI Feedback */}
                                            {candidato.answers?._ai_analysis?.summary && (
                                                <div style={{ marginTop: '16px', padding: '20px', background: 'rgba(16, 185, 129, 0.03)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                                    <h4 style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)' }}>
                                                            <Bot size={16} />
                                                        </div>
                                                        Feedback da IA (Motivo do Score)
                                                    </h4>
                                                    <p style={{ color: 'var(--text-main)', fontSize: '14px', margin: 0, lineHeight: '1.6' }}>
                                                        {candidato.answers._ai_analysis.summary}
                                                    </p>
                                                    {candidato.answers._ai_analysis.gaps && candidato.answers._ai_analysis.gaps.length > 0 && (
                                                        <div style={{ marginTop: '12px' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pontos de Atenção:</span>
                                                            <ul style={{ margin: '8px 0 0', paddingLeft: '20px', color: '#ef4444', fontSize: '13px' }}>
                                                                {candidato.answers._ai_analysis.gaps.map((gap: string, i: number) => <li key={i}>{gap}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {candidato.answers._ai_analysis.strengths && candidato.answers._ai_analysis.strengths.length > 0 && (
                                                        <div style={{ marginTop: '12px' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pontos Fortes:</span>
                                                            <ul style={{ margin: '8px 0 0', paddingLeft: '20px', color: '#10b981', fontSize: '13px' }}>
                                                                {candidato.answers._ai_analysis.strengths.map((str: string, i: number) => <li key={i}>{str}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

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

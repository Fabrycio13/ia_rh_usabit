import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import {
    MapPin, DollarSign, Clock, Star, Target,
    Award, Info, ArrowRight, AlertCircle, ArrowLeft
} from 'lucide-react';

interface Job {
    id: string;
    public_hash: string;
    title: string;
    description: string | null;
    has_salary_range: boolean;
    salary_min: string | null;
    salary_max: string | null;
    salary_currency: string;
    contract_type: string | null;
    has_location: boolean;
    location: string | null;
    work_model: string | null;
    responsibilities: string | null;
    requirements: string | null;
    differentials: string | null;
    additional_info: string | null;
    company_name: string | null;
    company_logo: string | null;
    application_count: number;
    is_accepting_applications: boolean;
    work_regime: string | null;
    application_deadline: string | null;
    created_at: string;
    is_pcd: boolean;
}

export const PublicJobPage = () => {
    const { hash } = useParams<{ hash: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchJob = async () => {
            if (!hash) {
                setError('Vaga não encontrada');
                setLoading(false);
                return;
            }

            try {
                const { data, error: err } = await supabase
                    .from('vagas_white_label')
                    .select('*')
                    .eq('public_hash', hash)
                    .eq('is_active', true)
                    .eq('is_accepting_applications', true)
                    .single();

                if (err) {
                    setError('Vaga não encontrada');
                    return;
                }

                setJob(data as Job);
            } catch (err) {
                setError('Erro ao carregar vaga');
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
    }, [hash]);

    const formatCurrency = (value: string | null) => {
        if (!value) return '';
        const num = parseFloat(value);
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getContractTypeLabel = (type: string | null) => {
        const labels: Record<string, string> = {
            clt: 'CLT',
            pj: 'PJ',
            estagio: 'Estágio',
            freelancer: 'Freelancer'
        };
        return type ? labels[type] || type : '';
    };

    const getWorkModelLabel = (model: string | null) => {
        const labels: Record<string, string> = {
            remote: 'Remoto',
            hybrid: 'Híbrido',
            onsite: 'Presencial'
        };
        return model ? labels[model] || model : '';
    };

    const getWorkRegimeLabel = (regime: string | null) => {
        const labels: Record<string, string> = {
            'full-time': 'Tempo Integral',
            'part-time': 'Meio Período',
            'hourly': 'Horista'
        };
        return regime ? labels[regime] || regime : '';
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleApply = () => {
        if (job) {
            navigate(`/v/${hash}/candidatar`);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#0B1020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid rgba(99, 102, 241, 0.2)',
                        borderTopColor: 'var(--primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }} />
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>Carregando vaga...</p>
                </div>
            </div>
        );
    }

    if (error || !job || !job.is_accepting_applications) {
        return (
            <div style={{ minHeight: '100vh', background: '#0B1020', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <div style={{ textAlign: 'center', maxWidth: '500px' }}>
                    <AlertCircle size={64} style={{ color: '#ef4444', margin: '0 auto 24px' }} />
                    <h1 style={{ color: '#f1f5f9', fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
                        Vaga não encontrada
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '32px' }}>
                        Esta vaga pode ter sido removida ou o link pode estar inválido.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            padding: '14px 32px',
                            background: 'var(--primary)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: 600
                        }}
                    >
                        Voltar ao início
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0B1020' }}>
            {/* CSS Animations */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
            `}</style>

            {/* Back Button */}
            <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                zIndex: 10
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)'}
                >
                    <ArrowLeft size={16} />
                    Voltar
                </button>
            </div>

            {/* Header with company info or gradient */}
            <div style={{
                background: job.company_logo
                    ? `linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(124, 58, 237, 0.9)), url(${job.company_logo})`
                    : 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                padding: '48px 40px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-100px',
                    right: '-100px',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)'
                }} />

                <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' }}>
                    {job.company_name && (
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {job.company_name}
                        </p>
                    )}
                    <h1 style={{ color: '#fff', fontSize: '36px', fontWeight: 700, margin: '0 0 16px', lineHeight: 1.2 }}>
                        {job.title}
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '16px', margin: 0, lineHeight: 1.6 }}>
                        {job.description || 'Confira os detalhes desta oportunidade.'}
                    </p>

                    {/* Quick Info Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px' }}>
                        {job.contract_type && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '20px',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: 500
                            }}>
                                <Clock size={14} />
                                {getContractTypeLabel(job.contract_type)}
                            </div>
                        )}
                        {job.work_regime && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                background: 'rgba(59, 130, 246, 0.25)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '20px',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: 500
                            }}>
                                <Clock size={14} />
                                {getWorkRegimeLabel(job.work_regime)}
                            </div>
                        )}
                        {job.is_pcd && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                background: 'rgba(236, 72, 153, 0.35)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '20px',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: 600
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="10" cy="4" r="2.5" />
                                    <path d="M10 6.5 L10 11 L13 11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                                    <path d="M10 8 L13 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                    <circle cx="12" cy="14" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
                                    <path d="M8 11 L14 11" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                    <path d="M8 11 L8 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                    <path d="M14 11 L16 13 L15 14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Vaga PcD
                            </div>
                        )}
                        {job.has_location && job.location && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                background: 'rgba(255, 255, 255, 0.15)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '20px',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: 500
                            }}>
                                <MapPin size={14} />
                                {job.location} {job.work_model && `• ${getWorkModelLabel(job.work_model)}`}
                            </div>
                        )}
                        {job.has_salary_range && job.salary_min && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                background: 'rgba(16, 185, 129, 0.3)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '20px',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: 600
                            }}>
                                <DollarSign size={14} />
                                {formatCurrency(job.salary_min)} {job.salary_max && `- ${formatCurrency(job.salary_max)}`}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px' }}>
                    {/* Main Content */}
                    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                        {/* Responsabilidades */}
                        {job.responsibilities && (
                            <div style={{
                                background: '#1a1c2d',
                                borderRadius: '16px',
                                border: '1px solid #1f2332',
                                padding: '28px',
                                marginBottom: '24px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Target size={18} style={{ color: '#fff' }} />
                                    </div>
                                    <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, margin: 0 }}>Responsabilidades</h2>
                                </div>
                                <div style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                                    {job.responsibilities}
                                </div>
                            </div>
                        )}

                        {/* Requisitos */}
                        {job.requirements && (
                            <div style={{
                                background: '#1a1c2d',
                                borderRadius: '16px',
                                border: '1px solid #1f2332',
                                padding: '28px',
                                marginBottom: '24px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Award size={18} style={{ color: '#fff' }} />
                                    </div>
                                    <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, margin: 0 }}>Requisitos</h2>
                                </div>
                                <div style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                                    {job.requirements}
                                </div>
                            </div>
                        )}

                        {/* Diferenciais */}
                        {job.differentials && (
                            <div style={{
                                background: '#1a1c2d',
                                borderRadius: '16px',
                                border: '1px solid #1f2332',
                                padding: '28px',
                                marginBottom: '24px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Star size={18} style={{ color: '#fff' }} />
                                    </div>
                                    <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, margin: 0 }}>Diferenciais</h2>
                                </div>
                                <div style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                                    {job.differentials}
                                </div>
                            </div>
                        )}

                        {/* Informações Adicionais */}
                        {job.additional_info && (
                            <div style={{
                                background: '#1a1c2d',
                                borderRadius: '16px',
                                border: '1px solid #1f2332',
                                padding: '28px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #ec4899, #db2777)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Info size={18} style={{ color: '#fff' }} />
                                    </div>
                                    <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, margin: 0 }}>Informações Adicionais</h2>
                                </div>
                                <div style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                                    {job.additional_info}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div style={{ animation: 'fadeIn 0.5s ease-out 0.2s both' }}>
                        {/* Apply Card */}
                        <div style={{
                            background: '#1a1c2d',
                            borderRadius: '16px',
                            border: '1px solid #1f2332',
                            padding: '28px',
                            position: 'sticky',
                            top: '40px'
                        }}>
                            <h3 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
                                Interessado nesta vaga?
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 24px', lineHeight: 1.5 }}>
                                Candidate-se agora e envie sua candidatura para esta oportunidade.
                            </p>

                            <button
                                onClick={handleApply}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.3s',
                                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(99, 102, 241, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(99, 102, 241, 0.4)';
                                }}
                            >
                                Candidate-se agora
                                <ArrowRight size={18} />
                            </button>

                            {/* Stats */}
                            {job.application_count > 0 && (
                                <div style={{
                                    marginTop: '20px',
                                    padding: '16px',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    borderRadius: '10px',
                                    textAlign: 'center'
                                }}>
                                    <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                                        {job.application_count} {job.application_count === 1 ? 'candidatura enviada' : 'candidaturas enviadas'}
                                    </p>
                                </div>
                            )}

                            {/* Deadline */}
                            {job.application_deadline && (
                                <div style={{
                                    marginTop: '12px',
                                    padding: '16px',
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    borderRadius: '10px',
                                    textAlign: 'center'
                                }}>
                                    <p style={{ color: '#f59e0b', fontSize: '12px', margin: 0, fontWeight: 600 }}>
                                        Prazo até {formatDate(job.application_deadline)}
                                    </p>
                                </div>
                            )}

                            {/* Published date */}
                            <p style={{ color: '#64748b', fontSize: '11px', textAlign: 'center', marginTop: '16px', marginBottom: 0 }}>
                                Vaga publicada em {formatDate(job.created_at)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

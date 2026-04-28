import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRight, AlertCircle, ArrowLeft
} from 'lucide-react';
import { formatSalary } from '../../core/utils/jobFormatter';

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
    show_company_name: boolean;
    application_count: number;
    is_accepting_applications: boolean;
    work_regime: string | null;
    application_deadline: string | null;
    created_at: string;
    is_pcd: string;
    vaga_primary_color: string | null;
    vaga_gradient_end: string | null;
    vaga_bg_color: string | null;
    vaga_bg_image: string | null;
}

export const PublicJobPage = () => {
    const { hash } = useParams<{ hash: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchJob = async () => {
            if (!hash) {
                setError('Vaga não encontrada');
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-job-detail?hash=${hash}`, {
                    headers: { 
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    }
                });

                if (!response.ok) {
                    setError('Vaga não encontrada');
                    return;
                }

                const { job: jobData } = await response.json();
                setJob(jobData as Job);
            } catch (err) {
                setError('Erro ao carregar vaga');
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
    }, [hash]);

    // Removido formatCurrency local para usar o do jobFormatter

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
                        {error || 'Esta vaga pode ter sido removida ou o link pode estar inválido.'}
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
        <div style={{
            minHeight: '100vh',
            background: '#04070c',
            fontFamily: `'Manrope', sans-serif`,
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Gradient SVG - Ultra Soft & Large (LEFT SIDE) */}
            <div style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '70%', 
                height: '100%', 
                pointerEvents: 'none', 
                zIndex: 0, 
                overflow: 'hidden',
                background: 'radial-gradient(53.74% 45.93% at 0% 50%, rgba(44, 88, 253, 0.15) 0%, rgba(26, 53, 151, 0) 100%)',
                filter: 'blur(40px)'
            }}>
                <svg width="2122" height="1434" viewBox="0 0 2122 1434" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: 0, left: '-20%', height: '120%', width: 'auto', opacity: 0.4 }}>
                    <path d="M-1304.14 405.498C-1197.64 48.9343 -644.279 -100.653 -68.1689 71.3844C507.941 243.422 888.637 671.939 782.139 1028.5C675.642 1385.07 122.279 1534.65 -453.831 1362.62C-1029.94 1190.58 -1410.64 762.061 -1304.14 405.498Z" fill="url(#paint0_radial_job_ultra)"/>
                    <defs>
                        <radialGradient id="paint0_radial_job_ultra" cx="0" cy="0" r="1" gradientTransform="matrix(192.831 -645.616 1043.14 311.502 -261 717)" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#2C58FD"/>
                            <stop offset="1" stopColor="#1A3597" stopOpacity="0"/>
                        </radialGradient>
                    </defs>
                </svg>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
                
                body {
                    font-family: 'Inter', sans-serif !important;
                    color: #C3C7CD !important;
                    line-height: 24px !important;
                    letter-spacing: 0.16px !important;
                    background: #04070c;
                }

                h1, h2, h3, h4 { 
                    font-family: 'Space Grotesk', sans-serif !important; 
                    color: #ffffff !important;
                    margin: 0;
                }

                .job-content-section {
                    margin-bottom: 48px;
                    animation: fadeIn 0.6s ease-out both;
                }

                .section-title {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 24px;
                    color: #ffffff;
                }

                .rich-text-content {
                    font-size: 16px;
                    color: #C3C7CD;
                    line-height: 1.6;
                }

                .rich-text-content ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .rich-text-content li {
                    position: relative;
                    padding-left: 28px;
                    margin-bottom: 12px;
                }

                .rich-text-content li::before {
                    content: '✓';
                    position: absolute;
                    left: 0;
                    color: #2C58FD;
                    font-weight: 900;
                    font-size: 18px;
                }

                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
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

            {/* Header Section - Figma Style */}
            <div style={{ 
                maxWidth: '1200px', 
                margin: '0 auto', 
                padding: isMobile ? '80px 24px 40px' : '100px 64px 60px',
                position: 'relative',
                zIndex: 1,
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'flex-end',
                gap: '32px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                marginBottom: '48px'
            }}>
                <div style={{ flex: 1 }}>
                    <p style={{ 
                        color: '#2C58FD', 
                        fontSize: '12px', 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.1em',
                        marginBottom: '12px',
                        fontFamily: "'Space Grotesk', sans-serif"
                    }}>
                        {job.company_name && job.show_company_name !== false ? job.company_name : 'Vaga Aberta'}
                    </p>
                    <h1 style={{ 
                        fontSize: isMobile ? '36px' : '56px', 
                        fontWeight: 700, 
                        marginBottom: '16px',
                        lineHeight: 1.1,
                        letterSpacing: '-0.03em',
                        color: '#ffffff'
                    }}>
                        {job.title}
                    </h1>
                    
                    <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '12px', 
                        alignItems: 'center',
                        color: '#C3C7CD',
                        fontSize: '16px',
                        marginBottom: '16px',
                        fontFamily: "'Inter', sans-serif"
                    }}>
                        {job.work_model && <span>{getWorkModelLabel(job.work_model)}</span>}
                        <span>•</span>
                        {job.location && <span>{job.location}</span>}
                        <span>•</span>
                        {job.contract_type && <span>{getContractTypeLabel(job.contract_type)}</span>}
                    </div>

                    {job.has_salary_range && job.salary_min && (
                        <div style={{ 
                            fontSize: '24px', 
                            fontWeight: 600, 
                            color: '#2C58FD',
                            fontFamily: "'Space Grotesk', sans-serif"
                        }}>
                            {formatSalary(job.salary_min, job.salary_max)}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <button 
                        onClick={handleApply}
                        style={{
                            background: '#2C58FD',
                            color: '#ffffff',
                            border: 'none',
                            padding: '16px 32px',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.3s',
                            boxShadow: '0 10px 30px rgba(44, 88, 253, 0.3)',
                            fontFamily: "'Inter', sans-serif"
                        }}
                    >
                        Quero me candidatar
                        <ArrowRight size={20} />
                    </button>
                    <p style={{ 
                        color: '#64748b', 
                        fontSize: '13px', 
                        margin: 0,
                        fontFamily: "'Inter', sans-serif",
                        textAlign: 'center'
                    }}>
                        Vaga publicada em {formatDate(job.created_at)}
                    </p>
                </div>
            </div>

            {/* Content Sections */}
            <div style={{ 
                maxWidth: '1200px', 
                margin: '0 auto', 
                padding: isMobile ? '0 24px 80px' : '0 64px 100px',
                position: 'relative',
                zIndex: 1
            }}>
                <div style={{ maxWidth: '900px' }}>
                    {job.description && (
                        <div className="job-content-section">
                            <h2 className="section-title">Sobre a vaga</h2>
                            <div className="rich-text-content">
                                <ul>
                                    {job.description.split('\n').filter(l => l.trim()).map((line, i) => (
                                        <li key={i}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {job.responsibilities && (
                        <div className="job-content-section">
                            <h2 className="section-title">Responsabilidades</h2>
                            <div className="rich-text-content">
                                <ul>
                                    {job.responsibilities.split('\n').filter(l => l.trim()).map((line, i) => (
                                        <li key={i}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {job.requirements && (
                        <div className="job-content-section">
                            <h2 className="section-title">Requisitos</h2>
                            <div className="rich-text-content">
                                <ul>
                                    {job.requirements.split('\n').filter(l => l.trim()).map((line, i) => (
                                        <li key={i}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {job.differentials && (
                        <div className="job-content-section">
                            <h2 className="section-title">Diferenciais</h2>
                            <div className="rich-text-content">
                                <ul>
                                    {job.differentials.split('\n').filter(l => l.trim()).map((line, i) => (
                                        <li key={i}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {job.additional_info && (
                        <div className="job-content-section">
                            <h2 className="section-title">Informações Adicionais</h2>
                            <div className="rich-text-content">
                                <ul>
                                    {job.additional_info.split('\n').filter(l => l.trim()).map((line, i) => (
                                        <li key={i}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Section: Trabalhe Conosco */}
                <div style={{ 
                    marginTop: '120px', 
                    textAlign: 'center', 
                    padding: '80px 0',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '24px'
                }}>
                    <div style={{ width: '64px', height: '64px', opacity: 0.8, marginBottom: '8px' }}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L14.8 8.5H22L16.5 12.5L18.5 20L12 16L5.5 20L7.5 12.5L2 8.5H9.2L12 2Z" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="0.5" opacity="0.3"/>
                            <circle cx="12" cy="12" r="6" stroke="#ffffff" strokeWidth="0.5" opacity="0.5"/>
                        </svg>
                    </div>
                    <h2 style={{ 
                        fontSize: isMobile ? '32px' : '48px', 
                        fontWeight: 700, 
                        lineHeight: isMobile ? '38px' : '56px',
                        fontFamily: "'Space Grotesk', sans-serif",
                        color: '#ffffff',
                        margin: 0,
                        textAlign: 'center'
                    }}>
                        Trabalhe conosco
                    </h2>
                    <p style={{ 
                        maxWidth: '600px', 
                        fontSize: '18px', 
                        color: '#C3C7CD', 
                        lineHeight: '1.6',
                        margin: 0,
                        fontFamily: "'Inter', sans-serif"
                    }}>
                        Cadastre seu currículo e informações e entraremos em contato caso haja alguma oportunidade de trabalhar com Usabit ou com nossos parceiros.
                    </p>
                    <button 
                        onClick={handleApply}
                        style={{
                            background: '#2C58FD',
                            color: '#ffffff',
                            border: 'none',
                            padding: '16px 32px',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginTop: '16px',
                            transition: 'all 0.3s',
                            boxShadow: '0 10px 30px rgba(44, 88, 253, 0.3)',
                            fontFamily: "'Inter', sans-serif"
                        }}
                    >
                        Quero me candidatar
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

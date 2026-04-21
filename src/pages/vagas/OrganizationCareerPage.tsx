import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Briefcase, MapPin, Loader2, Building2, Clock, DollarSign } from 'lucide-react';
import { formatSalary } from '../../core/utils/jobFormatter';

interface Vaga {
    id: string;
    title: string;
    public_hash: string;
    has_salary_range: boolean;
    salary_min: number;
    salary_max: number;
    contract_type: string;
    work_regime: string;
    is_pcd: string;
    has_location: boolean;
    location: string;
    work_model: string;
    category: string;
    created_at: string;
    company_name: string | null;
}

interface OrgInfo {
    name: string;
    logo_url: string;
    cover_image_url: string;
    primary_color: string;
    about_text: string;
    font_family: string;
    font_color: string;
    logo_scale: number;
    cover_fit: 'cover' | 'contain';
    background_fit: 'cover' | 'contain';
    header_padding: number;
    page_background_url: string;
}

export const OrganizationCareerPage = () => {
    const { orgId } = useParams<{ orgId: string }>();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
    const [vagas, setVagas] = useState<Vaga[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (orgInfo?.name) {
            document.title = `Oportunidades | ${orgInfo.name}`;
        }
        return () => {
            document.title = 'Space Talent';
        }
    }, [orgInfo]);

    useEffect(() => {
        const fetchCareerPageData = async () => {
            if (!orgId) return;
            setLoading(true);
            try {
                // Nova abordagem: consumir API via Edge Function
                const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-jobs?orgId=${orgId}`;
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                    }
                });

                if (!response.ok) {
                    const errPayload = await response.json().catch(() => ({}));
                    throw new Error(errPayload.error || 'Erro na API: Função não implementada ou fora do ar. Leia o guia na aba ao lado para fazer o Deploy.');
                }

                const { orgInfo, vagas } = await response.json();
                
                if (!orgInfo) throw new Error('Organização não encontrada na resposta da API');

                setOrgInfo({
                    name: orgInfo.name,
                    logo_url: orgInfo.logo_url || '',
                    cover_image_url: orgInfo.cover_image_url || '',
                    primary_color: orgInfo.primary_color || '#3b82f6',
                    about_text: orgInfo.about_text || '',
                    font_family: orgInfo.font_family || 'Inter',
                    font_color: orgInfo.font_color || '#0f172a',
                    logo_scale: orgInfo.logo_scale ?? 1.0,
                    cover_fit: orgInfo.cover_fit as any || 'cover',
                    background_fit: orgInfo.background_fit as any || 'cover',
                    header_padding: orgInfo.header_padding ?? 24,
                    page_background_url: orgInfo.page_background_url || '',
                });

                setVagas(vagas || []);
            } catch (err: any) {
                console.error('Erro ao carregar página de carreiras da API:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCareerPageData();
    }, [orgId]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <Loader2 style={{ width: 48, height: 48, color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (error || !orgInfo) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>Página não encontrada</h1>
                <p style={{ color: '#64748b' }}>A página de carreiras solicitada não existe ou foi removida.</p>
            </div>
        );
    }

    const primaryColor = orgInfo.primary_color || '#3b82f6';
    
    const categories = ['Todos', ...Array.from(new Set(vagas.map(v => v.category || 'Outros'))).sort()];

    const filteredVagas = vagas.filter(v => {
        const matchesSearch = v.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'Todos' || (v.category || 'Outros') === activeCategory;
        return matchesSearch && matchesCategory;
    });

    // Removido formatCurrency local para usar o do jobFormatter

    const getContractTypeLabel = (type: string | null | undefined) => {
        if (!type) return 'N/A';
        const types: Record<string, string> = { 'clt': 'CLT', 'pj': 'PJ', 'estagio': 'Estágio', 'freelancer': 'Freelancer' };
        return types[type.toLowerCase()] || type;
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: orgInfo.page_background_url ? `url(${orgInfo.page_background_url}) center/${orgInfo.background_fit} no-repeat fixed` : '#f8fafc', 
            backgroundSize: orgInfo.background_fit,
            fontFamily: `'${orgInfo.font_family}', sans-serif`,
            color: orgInfo.font_color,
            paddingBottom: '40px'
        }}>
            {/* Header / Cover */}
            <div style={{ 
                height: orgInfo.cover_image_url ? (isMobile ? '160px' : `${orgInfo.header_padding + 180}px`) : (isMobile ? '120px' : `${orgInfo.header_padding + 100}px`), 
                background: orgInfo.cover_image_url ? `url(${orgInfo.cover_image_url}) center/${orgInfo.cover_fit} no-repeat` : primaryColor,
                position: 'relative',
                borderBottom: `4px solid ${primaryColor}`,
                transition: 'all 0.3s ease'
            }}>
                <div style={{ 
                    position: 'absolute', inset: 0, 
                    background: orgInfo.cover_image_url ? 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' : 'none' 
                }} />
                
                <div style={{ 
                    maxWidth: '1000px', 
                    margin: '0 auto', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'flex-end', 
                    padding: `0 24px`,
                    position: 'relative',
                    zIndex: 2
                }}>
                    {/* Logo Container - Reposicionado para consistência */}
                    <div style={{ 
                        width: isMobile ? '90px' : '120px', 
                        height: isMobile ? '90px' : '120px', 
                        background: '#fff', 
                        borderRadius: isMobile ? '15px' : '20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                        padding: isMobile ? '10px' : '16px',
                        transform: `translateY(${isMobile ? '45px' : '60px'})`,
                        border: '1px solid #e2e8f0',
                        flexShrink: 0
                    }}>
                        {orgInfo.logo_url ? (
                            <img src={orgInfo.logo_url} alt={orgInfo.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transform: `scale(${orgInfo.logo_scale})` }} />
                        ) : (
                            <Building2 size={48} color={primaryColor} />
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: `${isMobile ? '70px' : '90px'} 24px 60px` }}>
                <div style={{ marginBottom: isMobile ? '24px' : '40px' }}>
                    <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 800, color: orgInfo.font_color, margin: '0 0 16px', lineHeight: 1.2 }}>Vagas na {orgInfo.name}</h1>
                    {orgInfo.about_text && (
                        <p style={{ color: orgInfo.font_color, opacity: 0.8, fontSize: '16px', lineHeight: '1.6', maxWidth: '800px', whiteSpace: 'pre-wrap' }}>
                            {orgInfo.about_text}
                        </p>
                    )}
                </div>

                {/* Filtro/Busca */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ position: 'relative', maxWidth: '500px' }}>
                        <Briefcase size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input 
                            type="text" 
                            placeholder="Buscar por cargo ou palavra-chave..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '14px 14px 14px 48px', 
                                borderRadius: '12px', 
                                border: '1px solid #e2e8f0', 
                                background: 'rgba(255, 255, 255, 0.8)', 
                                backdropFilter: 'blur(5px)',
                                fontSize: '15px', 
                                color: orgInfo.font_color,
                                outline: 'none',
                                transition: 'all 0.2s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                        />
                    </div>
                </div>

                {/* Filtro por Categoria (Tabs) */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '24px', 
                    marginBottom: '32px', 
                    borderBottom: '1px solid #e2e8f0',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}>
                    {categories.map(cat => {
                        const isActive = activeCategory === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                style={{
                                    padding: '12px 4px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: `2px solid ${isActive ? primaryColor : 'transparent'}`,
                                    color: isActive ? primaryColor : '#64748b',
                                    fontSize: '15px',
                                    fontWeight: isActive ? 700 : 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {cat === 'Todos' && <Briefcase size={16} />}
                                {cat}
                                <span style={{ 
                                    fontSize: '11px', 
                                    background: isActive ? `${primaryColor}20` : 'rgba(241, 245, 249, 0.5)', 
                                    padding: '2px 6px', 
                                    borderRadius: '10px',
                                    marginLeft: '4px',
                                    backdropFilter: 'blur(4px)'
                                }}>
                                    {vagas.filter(v => cat === 'Todos' || (v.category || 'Outros') === cat).length}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', 
                    gap: isMobile ? '16px' : '20px' 
                }}>
                    {filteredVagas.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid rgba(226, 232, 240, 0.5)' }}>
                            <Briefcase size={40} style={{ color: orgInfo.font_color, opacity: 0.3, margin: '0 auto 16px' }} />
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: orgInfo.font_color, margin: '0 0 8px' }}>Nenhuma vaga encontrada</h3>
                            <p style={{ color: orgInfo.font_color, opacity: 0.6, margin: 0 }}>Tente outros termos ou remova os filtros.</p>
                        </div>
                    ) : (
                        filteredVagas.map((vaga) => (
                            <div 
                                key={vaga.id}
                                onClick={() => navigate(`/v/${vaga.public_hash}`)}
                                style={{ 
                                    background: 'rgba(255, 255, 255, 0.9)', 
                                    backdropFilter: 'blur(12px)',
                                    borderRadius: '16px', 
                                    padding: '24px', 
                                    border: '1px solid rgba(226, 232, 240, 0.5)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(0,0,0,0.1)';
                                    e.currentTarget.style.borderColor = primaryColor;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.5)';
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: orgInfo.font_color, margin: 0, lineHeight: '1.2' }}>{vaga.title}</h3>
                                    {vaga.company_name && (
                                        <p style={{ margin: 0, fontSize: '13px', color: primaryColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            na {vaga.company_name}
                                        </p>
                                    )}
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {vaga.has_salary_range && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: orgInfo.font_color, fontSize: '14px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: `${primaryColor}10`, border: `1px solid ${primaryColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <DollarSign size={13} style={{ color: primaryColor }} />
                                            </div>
                                            <span style={{ fontWeight: 500, opacity: 0.8 }}>
                                                {formatSalary(vaga.salary_min, vaga.salary_max)}
                                            </span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: orgInfo.font_color, fontSize: '14px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: `${primaryColor}10`, border: `1px solid ${primaryColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Building2 size={13} style={{ color: primaryColor }} />
                                        </div>
                                        <span style={{ fontWeight: 500, opacity: 0.8 }}>{getContractTypeLabel(vaga.contract_type)}</span>
                                    </div>
                                    
                                    {(vaga.has_location || vaga.work_model) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: orgInfo.font_color, fontSize: '14px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: `${primaryColor}10`, border: `1px solid ${primaryColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <MapPin size={13} style={{ color: primaryColor }} />
                                            </div>
                                            <span style={{ fontWeight: 500, opacity: 0.8 }}>
                                                {vaga.location ? vaga.location : 'Remoto'}
                                                {vaga.work_model && ` (${vaga.work_model})`}
                                            </span>
                                        </div>
                                    )}

                                    {vaga.work_regime && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: orgInfo.font_color, fontSize: '14px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: `${primaryColor}10`, border: `1px solid ${primaryColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Clock size={13} style={{ color: primaryColor }} />
                                            </div>
                                            <span style={{ fontWeight: 500, opacity: 0.8 }}>Regime: {vaga.work_regime === 'full-time' ? 'Tempo Integral' : vaga.work_regime === 'part-time' ? 'Meio Período' : 'Por hora'}</span>
                                        </div>
                                    )}

                                    {vaga.is_pcd && vaga.is_pcd !== 'no' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                            <span style={{ 
                                                background: vaga.is_pcd === 'exclusive' ? '#fdf2f8' : `${primaryColor}15`, 
                                                color: vaga.is_pcd === 'exclusive' ? '#db2777' : primaryColor, 
                                                padding: '4px 10px', 
                                                borderRadius: '20px', 
                                                fontSize: '11px', 
                                                fontWeight: 700, 
                                                textTransform: 'uppercase', 
                                                letterSpacing: '0.05em',
                                                border: vaga.is_pcd === 'exclusive' ? 'none' : `1px solid ${primaryColor}30`,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px'
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
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <footer style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', borderTop: '1px solid #e2e8f0' }}>
                <p>Powered by <strong>Space Talent</strong></p>
            </footer>
        </div>
    );
};

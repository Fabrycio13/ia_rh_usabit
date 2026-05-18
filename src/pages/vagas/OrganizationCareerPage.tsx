import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
    const [searchTerm] = useState('');
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
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
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
                <p style={{ color: '#64748b', maxWidth: '400px', textAlign: 'center' }}>{error || 'A página de carreiras solicitada não existe ou foi removida.'}</p>
                <button 
                    onClick={() => navigate('/')}
                    style={{ marginTop: '24px', padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                    Voltar ao início
                </button>
            </div>
        );
    }


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
            background: '#04070c',
            fontFamily: `'Manrope', sans-serif`,
            color: '#ffffff',
            paddingBottom: '80px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Gradient SVG - Ultra Soft & Large */}
            <div style={{ 
                position: 'absolute', 
                top: 0, 
                right: 0, 
                width: '70%', 
                height: '100%', 
                pointerEvents: 'none', 
                zIndex: 0, 
                overflow: 'hidden',
                background: 'radial-gradient(53.74% 45.93% at 100% 50%, rgba(44, 88, 253, 0.15) 0%, rgba(26, 53, 151, 0) 100%)',
                filter: 'blur(40px)'
            }}>
                <svg width="2122" height="1434" viewBox="-1350 0 2122 1434" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: 0, right: '-20%', height: '120%', width: 'auto', opacity: 0.4 }}>
                    <path d="M-1304.14 405.498C-1197.64 48.9343 -644.279 -100.653 -68.1689 71.3844C507.941 243.422 888.637 671.939 782.139 1028.5C675.642 1385.07 122.279 1534.65 -453.831 1362.62C-1029.94 1190.58 -1410.64 762.061 -1304.14 405.498Z" fill="url(#paint0_radial_career_ultra)"/>
                    <defs>
                        <radialGradient id="paint0_radial_career_ultra" cx="0" cy="0" r="1" gradientTransform="matrix(192.831 -645.616 1043.14 311.502 -261 717)" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#2C58FD"/>
                            <stop offset="1" stop-color="#1A3597" stop-opacity="0"/>
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
                }

                h1, h2, h3, h4 { 
                    font-family: 'Space Grotesk', sans-serif !important; 
                    color: #ffffff !important;
                }
                
                .category-tab {
                    position: relative;
                    padding: 12px 24px;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    alignItems: center;
                    gap: 8px;
                }
                
                .category-tab.active {
                    color: #ffffff;
                }
                
                .category-tab.active::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: #2C58FD;
                }

                .category-count {
                    font-size: 11px;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                    margin-left: 6px;
                }

                .job-card {
                    background: #080c14;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    padding: 32px;
                    transition: all 0.3s;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .job-card:hover {
                    border-color: rgba(44, 88, 253, 0.3);
                    background: #0d121d;
                }
            `}</style>
            {/* Header / Cover */}
            <div style={{ 
                height: isMobile ? '280px' : '400px', 
                background: 'transparent',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '0 24px',
                zIndex: 1
            }}>
                <div style={{ maxWidth: '800px' }}>
                    <h1 style={{ fontSize: isMobile ? '36px' : '64px', fontWeight: 800, color: '#fff', margin: '0 0 24px', lineHeight: 1.1 }}>
                        {orgInfo.name === 'Usabit' ? 'Vagas abertas' : `Vagas na ${orgInfo.name}`}
                    </h1>
                    <p style={{ fontSize: isMobile ? '16px' : '18px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                        Venha transformar negócios com tecnologia, estratégia e design.
                    </p>
                </div>
            </div>

            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
                {/* Tabs de Categoria */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: isMobile ? '10px' : '40px', 
                    marginBottom: '60px', 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    overflowX: 'auto',
                    scrollbarWidth: 'none'
                }}>
                    {categories.map(cat => {
                        const isActive = activeCategory === cat;
                        const count = vagas.filter(v => cat === 'Todos' || (v.category || 'Outros') === cat).length;
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`category-tab ${isActive ? 'active' : ''}`}
                            >
                                {cat}
                                <span className="category-count">{count}</span>
                            </button>
                        );
                    })}
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
                    gap: '24px' 
                }}>
                    {filteredVagas.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', padding: '80px 40px', textAlign: 'center' }}>
                            <p style={{ color: '#64748b', margin: 0 }}>Nenhuma vaga encontrada.</p>
                        </div>
                    ) : (
                        filteredVagas.map((vaga) => (
                            <div 
                                key={vaga.id}
                                className="job-card"
                                onClick={() => navigate(`/v/${vaga.public_hash}`)}
                            >
                                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 }}>{vaga.title}</h3>
                                
                                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                    {vaga.work_regime === 'part-time' ? 'Part time' : 'Full time'} · {vaga.location || 'Remoto'} · {getContractTypeLabel(vaga.contract_type)}
                                </p>

                                {vaga.has_salary_range && (
                                    <p style={{ fontSize: '16px', fontWeight: 700, color: '#2C58FD', margin: '8px 0 0' }}>
                                        {formatSalary(vaga.salary_min, vaga.salary_max)}
                                    </p>
                                )}

                                <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                                    Ver mais detalhes
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="7" y1="17" x2="17" y2="7"></line>
                                        <polyline points="7 7 17 7 17 17"></polyline>
                                    </svg>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>


            <footer style={{ padding: '60px 24px 24px', textAlign: 'center', color: '#475569', fontSize: '13px', position: 'relative', zIndex: 1 }}>
                <p>Powered by <strong>Space Talent</strong></p>
            </footer>
        </div>
    );
};

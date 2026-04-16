import { MapPin, Building2, Search } from 'lucide-react';

interface PortalPreviewProps {
    logoUrl?: string;
    coverImageUrl?: string;
    pageBackgroundUrl?: string;
    primaryColor?: string;
    aboutText?: string;
    orgName?: string;
    fontFamily?: string;
    fontColor?: string;
    logoScale?: number;
    coverFit?: 'cover' | 'contain';
    backgroundFit?: 'cover' | 'contain';
    headerPadding?: number;
}

export const PortalPreview = ({ 
    logoUrl, 
    coverImageUrl, 
    pageBackgroundUrl,
    primaryColor = '#3b82f6', 
    aboutText, 
    orgName = 'Sua Empresa',
    fontFamily = 'Inter',
    fontColor = '#0f172a',
    logoScale = 1.0,
    coverFit = 'cover',
    backgroundFit = 'cover',
    headerPadding = 24
}: PortalPreviewProps) => {
    
    const sampleVagas = [
        {
            id: '1',
            title: 'Desenvolvedor Full Stack',
            category: 'Tecnologia',
            location: 'São Paulo, SP',
            work_model: 'Remoto',
            contract_type: 'pj',
            salary_min: 8000,
            salary_max: 12000,
            has_salary_range: true
        },
        {
            id: '2',
            title: 'Analista de RH Sênior',
            category: 'RH',
            location: 'Curitiba, PR',
            work_model: 'Híbrido',
            contract_type: 'clt',
            has_salary_range: false
        }
    ];

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div style={{ 
            width: '100%', 
            minHeight: '600px', 
            background: pageBackgroundUrl ? `url(${pageBackgroundUrl}) center/${backgroundFit} no-repeat` : '#f8fafc',
            backgroundSize: backgroundFit,
            fontFamily: `'${fontFamily}', sans-serif`,
            color: fontColor,
            overflowY: 'auto',
            maxHeight: '700px',
            position: 'relative',
            borderRadius: '12px'
        }}>
            {/* Header / Cover */}
            <div style={{ 
                height: coverImageUrl ? `${120 + headerPadding}px` : `${80 + headerPadding}px`, 
                background: coverImageUrl ? `url(${coverImageUrl}) center/${coverFit} no-repeat` : primaryColor,
                position: 'relative',
                borderBottom: `4px solid ${primaryColor}`,
                transition: 'all 0.3s ease'
            }}>
                <div style={{ 
                    position: 'absolute', inset: 0, 
                    background: coverImageUrl ? 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' : 'none' 
                }} />
                
                <div style={{ 
                    maxWidth: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'flex-end', 
                    padding: '0 24px',
                    position: 'relative',
                    zIndex: 2
                }}>
                    {/* Logo Container */}
                    <div style={{ 
                        width: '100px', 
                        height: '100px', 
                        background: '#fff', 
                        borderRadius: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                        padding: '12px',
                        transform: 'translateY(50px)',
                        border: '1px solid #e2e8f0',
                        flexShrink: 0
                    }}>
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transform: `scale(${logoScale})` }} />
                        ) : (
                            <Building2 size={32} color={primaryColor} />
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div style={{ padding: '80px 24px 40px' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '32px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 800, color: fontColor, marginBottom: '8px', lineHeight: 1.2 }}>
                            Vagas na {orgName}
                        </h1>
                        <p style={{ color: fontColor, opacity: 0.8, fontSize: '15px', maxWidth: '600px', whiteSpace: 'pre-wrap' }}>
                            {aboutText || 'Sua descrição aparecerá aqui...'}
                        </p>
                    </div>

                    {/* Search Bar Mock */}
                    <div style={{ marginBottom: '32px', position: 'relative', maxWidth: '450px' }}>
                        <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                        <div style={{ 
                            width: '100%', 
                            padding: '12px 12px 12px 48px', 
                            borderRadius: '12px', 
                            border: '1px solid #e2e8f0', 
                            background: '#fff', 
                            color: '#94a3b8', 
                            fontSize: '14px' 
                        }}>
                            Buscar por cargo ou palavra-chave...
                        </div>
                    </div>

                    {/* Tabs Mock */}
                    <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #e2e8f0', marginBottom: '32px', overflowX: 'auto' }}>
                        {['Todos', 'Tecnologia', 'RH'].map((cat, i) => (
                            <div key={cat} style={{ 
                                padding: '12px 4px', 
                                borderBottom: i === 0 ? `3px solid ${primaryColor}` : 'none',
                                color: i === 0 ? primaryColor : '#64748b',
                                fontWeight: i === 0 ? 700 : 500,
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                whiteSpace: 'nowrap'
                            }}>
                                {cat}
                                <span style={{ fontSize: '11px', background: i === 0 ? `${primaryColor}15` : '#f1f5f9', padding: '2px 6px', borderRadius: '10px' }}>
                                    {i === 0 ? '2' : '1'}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Job Cards Mock */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {sampleVagas.map(vaga => (
                            <div key={vaga.id} style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: fontColor, marginBottom: '16px', lineHeight: 1.2 }}>{vaga.title}</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {vaga.has_salary_range && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                                            <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                💰
                                            </div>
                                            <span style={{ fontWeight: 600, color: '#475569' }}>
                                                {formatCurrency(vaga.salary_min || 0)} - {formatCurrency(vaga.salary_max || 0)}
                                            </span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Building2 size={12} color={primaryColor} />
                                        </div>
                                        <span>Contrato: {vaga.contract_type.toUpperCase()}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <MapPin size={12} color={primaryColor} />
                                        </div>
                                        <span>{vaga.location} ({vaga.work_model})</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                        Powered by <strong>Space Talent</strong>
                    </div>
                </div>
            </div>
        </div>
    );
};

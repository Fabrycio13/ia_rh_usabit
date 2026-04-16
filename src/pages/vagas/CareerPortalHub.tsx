import { useState, useEffect } from 'react';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { 
    Loader2, 
    Copy, 
    ExternalLink, 
    Briefcase, 
    Building2,
    Eye,
    Image as ImageIcon,
    ChevronDown,
    Upload,
    PaintBucket,
    Save,
    Type as TypeIcon
} from 'lucide-react';
import toast from 'react-hot-toast';



import { Vagas } from './Vagas';
import { PortalPreview } from './PortalPreview';

export const CareerPortalHub = () => {
    const { profile } = useUser();
    
    // Tabs state
    const [activeTab, setActiveTab] = useState<'vagas' | 'design'>('vagas');

    // Portal Settings State
    const [loading, setLoading] = useState(true);
    // ... (rest of states)
    const [saving, setSaving] = useState(false);
    const [logoUrl, setLogoUrl] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#3b82f6');
    const [aboutText, setAboutText] = useState('');
    const [orgName, setOrgName] = useState('');
    const [fontFamily, setFontFamily] = useState('Inter');
    const [fontColor, setFontColor] = useState('#0f172a');
    const [logoScale, setLogoScale] = useState(1.0);
    const [coverFit, setCoverFit] = useState<'cover' | 'contain'>('cover');
    const [backgroundFit, setBackgroundFit] = useState<'cover' | 'contain'>('cover');
    const [headerPadding, setHeaderPadding] = useState(24);
    const [showPreview, setShowPreview] = useState(true);
    const [pageBackgroundUrl, setPageBackgroundUrl] = useState('');
    const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);

    const fontOptions = [
        { value: 'Inter', label: 'Inter (Sleek)' },
        { value: 'Montserrat', label: 'Montserrat (Modern)' },
        { value: 'Poppins', label: 'Poppins (Friendly)' },
        { value: 'Lato', label: 'Lato (Clean)' },
        { value: 'Playfair Display', label: 'Playfair Display (Elegant)' },
        { value: 'Merriweather', label: 'Merriweather (Classic)' },
        { value: 'Roboto', label: 'Roboto (Technical)' },
        { value: 'Open Sans', label: 'Open Sans (Readable)' },
    ];



    useEffect(() => {
        const fetchData = async () => {
            if (!profile.organization_id) {
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch Org Settings
                const { data: orgData, error: orgError } = await supabase
                    .from('organizations')
                    .select('name, logo_url, cover_image_url, primary_color, about_text, font_family, font_color, logo_scale, cover_fit, background_fit, header_padding, page_background_url')
                    .eq('id', profile.organization_id)
                    .single();

                if (orgError) throw orgError;
                if (orgData) {
                    setOrgName(orgData.name || '');
                    setLogoUrl(orgData.logo_url || '');
                    setCoverImageUrl(orgData.cover_image_url || '');
                    setPrimaryColor(orgData.primary_color || '#3b82f6');
                    setAboutText(orgData.about_text || '');
                    setFontFamily(orgData.font_family || 'Inter');
                    setFontColor(orgData.font_color || '#0f172a');
                    setLogoScale(orgData.logo_scale ?? 1.0);
                    setCoverFit(orgData.cover_fit as any || 'cover');
                    setBackgroundFit(orgData.background_fit as any || 'cover');
                    setHeaderPadding(orgData.header_padding ?? 24);
                    setPageBackgroundUrl(orgData.page_background_url || '');
                }

                // Jobs fetching removed as it is handled by the Vagas component

            } catch (err: any) {
                console.error('[CareerPortalHub] Erro:', err);
                toast.error('Erro ao carregar dados do portal.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [profile.organization_id]);

    const handleSaveSettings = async () => {
        if (!profile.organization_id) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({
                    logo_url: logoUrl,
                    cover_image_url: coverImageUrl,
                    primary_color: primaryColor,
                    about_text: aboutText,
                    font_family: fontFamily,
                    font_color: fontColor,
                    logo_scale: logoScale,
                    cover_fit: coverFit,
                    background_fit: backgroundFit,
                    header_padding: headerPadding,
                    page_background_url: pageBackgroundUrl,
                })
                .eq('id', profile.organization_id);

            if (error) throw error;
            toast.success('Configurações do portal salvas!');
        } catch (err: any) {
            toast.error('Erro ao salvar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover' | 'background') => {
        const file = event.target.files?.[0];
        if (!file || !profile.organization_id) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.organization_id}/${type}_${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const toastId = toast.loading(`Enviando ${type === 'logo' ? 'logomarca' : type === 'cover' ? 'capa' : 'fundo'}...`);

        try {
            const { error: uploadError } = await supabase.storage
                .from('organizations')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('organizations')
                .getPublicUrl(filePath);

            if (type === 'logo') setLogoUrl(publicUrl);
            else if (type === 'cover') setCoverImageUrl(publicUrl);
            else setPageBackgroundUrl(publicUrl);

            // Auto-save to database immediately
            const field = type === 'logo' ? 'logo_url' : type === 'cover' ? 'cover_image_url' : 'page_background_url';
            await supabase
                .from('organizations')
                .update({ [field]: publicUrl })
                .eq('id', profile.organization_id);

            toast.success('Imagem enviada e salva com sucesso!', { id: toastId });
        } catch (error: any) {
            console.error('Erro no upload:', error);
            toast.error('Erro ao enviar imagem. Verifique o tamanho ou tente novamente.', { id: toastId });
        }
    };

    const copyPortalLink = () => {
        const url = `${window.location.origin}${window.location.pathname}#/carreiras/${profile.organization_id}`;
        navigator.clipboard.writeText(url);
        toast.success('Link do portal copiado!');
    };



    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
            </div>
        );
    }

    const inputStyle: React.CSSProperties = {
        width: '100%',
        background: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '11px 14px',
        color: 'var(--text-main)',
        fontSize: '14px',
        outline: 'none'
    };

    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: 600,
        color: active ? 'var(--primary)' : 'var(--text-dim)',
        borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: 'none',
        border: 'none',
        outline: 'none'
    });

    return (
        <div style={{ padding: '0 32px 32px' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', paddingTop: '10px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <Briefcase size={32} style={{ color: 'var(--primary)' }} />
                        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Vagas</h1>
                    </div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginTop: '6px' }}>Gerencie suas oportunidades e personalize seu portal de carreiras.</p>
                </div>
                {(activeTab === 'vagas' || activeTab === 'design') && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={copyPortalLink}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
                        >
                            <Copy size={16} /> Link do Portal
                        </button>
                        <a 
                            href={`#/carreiras/${profile.organization_id}`} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
                        >
                            <ExternalLink size={16} /> Ver Portal Público
                        </a>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
                <button onClick={() => setActiveTab('vagas')} style={tabStyle(activeTab === 'vagas')}>Vagas</button>
                <button onClick={() => setActiveTab('design')} style={tabStyle(activeTab === 'design')}>Personalizar Design</button>
            </div>

            {activeTab === 'vagas' ? (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <Vagas hideHeader={true} />
                </div>
            ) : (
                <div style={{ animation: 'fadeIn 0.3s ease-out', position: 'relative' }}>
                    <div style={{ 
                        display: 'flex', 
                        gap: '24px', 
                        alignItems: 'flex-start',
                        maxWidth: showPreview ? '1400px' : '900px',
                        margin: '0 auto',
                        transition: 'max-width 0.4s ease-in-out'
                    }}>
                        {/* Control Panel (Main) */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '32px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Design do Portal</h2>
                                        <button 
                                            onClick={() => setShowPreview(!showPreview)}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '8px', 
                                                background: showPreview ? 'var(--primary)' : 'rgba(59, 130, 246, 0.1)', 
                                                color: showPreview ? '#fff' : 'var(--primary)',
                                                border: 'none', padding: '8px 16px', borderRadius: '8px', 
                                                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Eye size={16} /> {showPreview ? 'Ocultar Preview' : 'Mostrar Preview'}
                                        </button>
                                    </div>

                                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />

                                    {/* 1. Brand Assets & Background */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <ImageIcon size={18} /> Ativos Digitais & Fundo
                                        </h3>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                                            {/* Logo */}
                                            <div style={{ background: 'var(--bg-card-alt)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>LOGOMARCA</label>
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', height: '64px' }}>
                                                        <div style={{ width: '64px', height: '64px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                            {logoUrl ? <img src={logoUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transform: `scale(${logoScale})` }} /> : <Building2 size={24} style={{ opacity: 0.1 }} />}
                                                        </div>
                                                        <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
                                                            <input type="file" id="logo-upload" hidden onChange={(e) => handleImageUpload(e, 'logo')} accept="image/*" />
                                                            <button onClick={() => document.getElementById('logo-upload')?.click()} style={{ ...inputStyle, height: '42px', background: 'rgba(59, 130, 246, 0.05)', color: 'var(--primary)', border: '1px dashed var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: 0, flex: 1 }}>
                                                                <Upload size={14} /> Subir
                                                            </button>
                                                            {logoUrl && (
                                                                <button 
                                                                    onClick={async () => {
                                                                        setLogoUrl('');
                                                                        await supabase.from('organizations').update({ logo_url: null }).eq('id', profile.organization_id);
                                                                        toast.success('Logo removida');
                                                                    }}
                                                                    style={{ width: '38px', height: '42px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
                                                                >
                                                                    &times;
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>TAMANHO DA LOGO: {Math.round(logoScale * 100)}%</label>
                                                    <input type="range" min="0.5" max="2" step="0.1" value={logoScale} onChange={e => setLogoScale(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                                                </div>
                                            </div>

                                            {/* Cover */}
                                            <div style={{ background: 'var(--bg-card-alt)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>IMAGEM DE CAPA</label>
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', height: '64px' }}>
                                                        <div style={{ width: '64px', height: '64px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                            {coverImageUrl ? <img src={coverImageUrl} style={{ width: '100%', height: '100%', objectFit: coverFit }} /> : <ImageIcon size={24} style={{ opacity: 0.1 }} />}
                                                        </div>
                                                        <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
                                                            <input type="file" id="cover-upload" hidden onChange={(e) => handleImageUpload(e, 'cover')} accept="image/*" />
                                                            <button onClick={() => document.getElementById('cover-upload')?.click()} style={{ ...inputStyle, height: '42px', background: 'rgba(59, 130, 246, 0.05)', color: 'var(--primary)', border: '1px dashed var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: 0, flex: 1 }}>
                                                                <Upload size={14} /> Subir
                                                            </button>
                                                            {coverImageUrl && (
                                                                <button 
                                                                    onClick={async () => {
                                                                        setCoverImageUrl('');
                                                                        await supabase.from('organizations').update({ cover_image_url: null }).eq('id', profile.organization_id);
                                                                        toast.success('Capa removida');
                                                                    }}
                                                                    style={{ width: '38px', height: '42px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
                                                                >
                                                                    &times;
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>MODO DE EXIBIÇÃO</label>
                                                    <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                        <button onClick={() => setCoverFit('cover')} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: coverFit === 'cover' ? 'var(--primary)' : 'transparent', color: coverFit === 'cover' ? '#fff' : 'var(--text-muted)' }}>Preencher</button>
                                                        <button onClick={() => setCoverFit('contain')} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: coverFit === 'contain' ? 'var(--primary)' : 'transparent', color: coverFit === 'contain' ? '#fff' : 'var(--text-muted)' }}>Ajustar</button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Background */}
                                            <div style={{ background: 'var(--bg-card-alt)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>FUNDO DA PÁGINA</label>
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', height: '64px' }}>
                                                        <div style={{ width: '64px', height: '64px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                            {pageBackgroundUrl ? <img src={pageBackgroundUrl} style={{ width: '100%', height: '100%', objectFit: backgroundFit }} /> : <ImageIcon size={24} style={{ opacity: 0.1 }} />}
                                                        </div>
                                                        <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
                                                            <input type="file" id="bg-upload" hidden onChange={(e) => handleImageUpload(e, 'background')} accept="image/*" />
                                                            <button onClick={() => document.getElementById('bg-upload')?.click()} style={{ ...inputStyle, height: '42px', background: 'rgba(59, 130, 246, 0.05)', color: 'var(--primary)', border: '1px dashed var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: 0, flex: 1 }}>
                                                                <Upload size={14} /> Fundo
                                                            </button>
                                                            {pageBackgroundUrl && (
                                                                <button 
                                                                    onClick={async () => {
                                                                        setPageBackgroundUrl('');
                                                                        await supabase.from('organizations').update({ page_background_url: null }).eq('id', profile.organization_id);
                                                                        toast.success('Fundo removido');
                                                                    }}
                                                                    style={{ width: '38px', height: '42px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
                                                                >
                                                                    &times;
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>MODO DE EXIBIÇÃO</label>
                                                    <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                        <button onClick={() => setBackgroundFit('cover')} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: backgroundFit === 'cover' ? 'var(--primary)' : 'transparent', color: backgroundFit === 'cover' ? '#fff' : 'var(--text-muted)' }}>Preencher</button>
                                                        <button onClick={() => setBackgroundFit('contain')} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: backgroundFit === 'contain' ? 'var(--primary)' : 'transparent', color: backgroundFit === 'contain' ? '#fff' : 'var(--text-muted)' }}>Ajustar</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Typography & Colors */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
                                                <TypeIcon size={14} style={{ marginRight: 6, display: 'inline' }} /> FONTE DO PORTAL
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <button 
                                                    onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
                                                    style={{ 
                                                        ...inputStyle, 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer',
                                                        background: 'var(--bg-card-alt)',
                                                        textAlign: 'left',
                                                        width: '100%',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <span style={{ fontFamily: `'${fontFamily}', sans-serif` }}>
                                                        {fontOptions.find(f => f.value === fontFamily)?.label || fontFamily}
                                                    </span>
                                                    <ChevronDown 
                                                        size={16} 
                                                        style={{ 
                                                            transition: 'transform 0.3s ease',
                                                            transform: isFontDropdownOpen ? 'rotate(180deg)' : 'rotate(0)'
                                                        }} 
                                                    />
                                                </button>

                                                {isFontDropdownOpen && (
                                                    <>
                                                        {/* Click outside overlay */}
                                                        <div 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsFontDropdownOpen(false);
                                                            }}
                                                            style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                                                        />
                                                        
                                                        {/* Dropdown Options */}
                                                        <div style={{ 
                                                            position: 'absolute', 
                                                            top: 'calc(100% + 8px)', 
                                                            left: 0, 
                                                            right: 0, 
                                                            background: 'rgba(30, 41, 59, 0.95)',
                                                            backdropFilter: 'blur(12px)',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: '12px',
                                                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.2)',
                                                            zIndex: 101,
                                                            overflow: 'hidden',
                                                            animation: 'fadeInSlide 0.2s ease-out'
                                                        }}>
                                                            <div style={{ padding: '8px' }}>
                                                                {fontOptions.map(option => {
                                                                    const isActive = fontFamily === option.value;
                                                                    return (
                                                                        <button
                                                                            key={option.value}
                                                                            onClick={() => {
                                                                                setFontFamily(option.value);
                                                                                setIsFontDropdownOpen(false);
                                                                            }}
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'space-between',
                                                                                width: '100%',
                                                                                padding: '12px 14px',
                                                                                borderRadius: '10px',
                                                                                background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                                                                color: isActive ? 'var(--primary)' : 'var(--text-main)',
                                                                                border: 'none',
                                                                                cursor: 'pointer',
                                                                                fontSize: '14px',
                                                                                fontWeight: isActive ? 600 : 500,
                                                                                textAlign: 'left',
                                                                                transition: 'background 0.2s',
                                                                                fontFamily: `'${option.value}', sans-serif`
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                if (!isActive) e.currentTarget.style.background = 'transparent';
                                                                            }}
                                                                        >
                                                                            {option.label}
                                                                            {isActive && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
                                                <PaintBucket size={14} style={{ marginRight: 6, display: 'inline' }} /> COR PRINCIPAL
                                            </label>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <div style={{ position: 'relative', width: '42px', height: '42px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ position: 'absolute', top: '-10px', left: '-10px', width: '80px', height: '80px', cursor: 'pointer', border: 'none', background: 'none' }} />
                                                </div>
                                                <input style={{ ...inputStyle, flex: 1 }} value={primaryColor.toUpperCase()} onChange={e => setPrimaryColor(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
                                                <PaintBucket size={14} style={{ marginRight: 6, display: 'inline' }} /> COR DAS LETRAS
                                            </label>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <div style={{ position: 'relative', width: '42px', height: '42px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                                    <input type="color" value={fontColor} onChange={e => setFontColor(e.target.value)} style={{ position: 'absolute', top: '-10px', left: '-10px', width: '80px', height: '80px', cursor: 'pointer', border: 'none', background: 'none' }} />
                                                </div>
                                                <input style={{ ...inputStyle, flex: 1 }} value={fontColor.toUpperCase()} onChange={e => setFontColor(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. Spacing Control */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>
                                            Espaçamento do Cabeçalho: <strong>{headerPadding}px</strong>
                                        </label>
                                        <input 
                                            type="range" 
                                            min="16" 
                                            max="100" 
                                            value={headerPadding} 
                                            onChange={e => setHeaderPadding(parseInt(e.target.value))}
                                            style={{ width: '100%', height: '6px', background: 'var(--bg-card-alt)', borderRadius: '5px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                                        />
                                    </div>

                                    {/* 5. About Text */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>SOBRE A EMPRESA</label>
                                        <textarea style={{ ...inputStyle, minHeight: '150px', resize: 'vertical' }} value={aboutText} onChange={e => setAboutText(e.target.value)} placeholder="Descreva sua empresa para os candidatos..." />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                                        <button 
                                            onClick={handleSaveSettings}
                                            disabled={saving}
                                            style={{
                                                padding: '12px 32px',
                                                background: 'var(--primary)',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '10px',
                                                fontWeight: 700,
                                                cursor: saving ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '10px',
                                                fontSize: '15px'
                                            }}
                                        >
                                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                            Salvar Alterações
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preview (Collapsible) */}
                        {showPreview && (
                            <div style={{ width: '400px', position: 'sticky', top: '24px', animation: 'slideInRight 0.3s ease-out' }}>
                                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                                    <Eye size={16} />
                                    <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Preview ao Vivo</span>
                                </div>
                                <div style={{ border: '8px solid var(--bg-card)', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                                        <PortalPreview 
                                            logoUrl={logoUrl}
                                            coverImageUrl={coverImageUrl}
                                            pageBackgroundUrl={pageBackgroundUrl}
                                            primaryColor={primaryColor}
                                            aboutText={aboutText}
                                            orgName={orgName}
                                            fontFamily={fontFamily}
                                            fontColor={fontColor}
                                            logoScale={logoScale}
                                            coverFit={coverFit}
                                            backgroundFit={backgroundFit}
                                            headerPadding={headerPadding}
                                        />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

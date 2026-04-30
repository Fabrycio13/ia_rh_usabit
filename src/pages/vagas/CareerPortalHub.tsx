import React, { useState, useEffect } from 'react';

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
    Type as TypeIcon,
    Palette,
    Layers,
    Check,
    User,
    Mail,
    Phone,
    Linkedin,
    MapPin,
    ArrowLeft,
    Send,
    Search,
    Filter,
    X as CloseIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import DatePicker from '../../common/components/ui/DatePicker';



import { Vagas } from './Vagas';
import { PortalPreview } from './PortalPreview';
import { useLocation } from 'react-router-dom';

export const CareerPortalHub = () => {
    const { profile } = useUser();
    const location = useLocation();
    
    // Tabs state
    const [activeTab, setActiveTab] = useState<'vagas' | 'design'>('vagas');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'design') setActiveTab('design');
        else if (tab === 'vagas') setActiveTab('vagas');
    }, [location]);
    const [designSubTab, setDesignSubTab] = useState<'portal' | 'vagas'>('portal');

    // Vagas para design individual
    const [orgVagas, setOrgVagas] = useState<{id: string; title: string; category: string | null; status: string; created_at: string | null; vaga_primary_color: string | null; vaga_gradient_end: string | null; vaga_bg_color: string | null; vaga_bg_image: string | null;}[]>([]);
    const [selectedVagaId, setSelectedVagaId] = useState<string>('');
    const [vagaDesign, setVagaDesign] = useState({ primaryColor: '', gradientEnd: '', bgColor: '', bgImage: '' });
    const [savingVaga, setSavingVaga] = useState(false);
    const [vagaSearch, setVagaSearch] = useState('');
    const [vagaStatusFilter, setVagaStatusFilter] = useState('');
    const [vagaCategoryFilter, setVagaCategoryFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Dropdown control
    const [isStatusSelectOpen, setIsStatusSelectOpen] = useState(false);
    const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false);

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

                // Buscar vagas da organização para design individual
                const { data: vagasData } = await supabase
                    .from('vagas_white_label')
                    .select('id, title, category, status, created_at, vaga_primary_color, vaga_gradient_end, vaga_bg_color, vaga_bg_image')
                    .eq('organization_id', profile.organization_id)
                    .in('status', ['aberta', 'pausada'])
                    .order('created_at', { ascending: false });
                
                if (vagasData) setOrgVagas(vagasData as any);

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

    const handleSelectVaga = (vagaId: string) => {
        setSelectedVagaId(vagaId);
        const v = orgVagas.find(v => v.id === vagaId);
        if (v) {
            setVagaDesign({
                primaryColor: v.vaga_primary_color || '',
                gradientEnd: v.vaga_gradient_end || '',
                bgColor: v.vaga_bg_color || '',
                bgImage: v.vaga_bg_image || '',
            });
        } else {
            setVagaDesign({ primaryColor: '', gradientEnd: '', bgColor: '', bgImage: '' });
        }
    };

    const handleSaveVagaDesign = async () => {
        if (!selectedVagaId) {
            toast.error('Selecione uma vaga primeiro.');
            return;
        }
        setSavingVaga(true);
        try {
            const { error } = await supabase
                .from('vagas_white_label')
                .update({
                    vaga_primary_color: vagaDesign.primaryColor || null,
                    vaga_gradient_end: vagaDesign.gradientEnd || null,
                    vaga_bg_color: vagaDesign.bgColor || null,
                    vaga_bg_image: vagaDesign.bgImage || null,
                })
                .eq('id', selectedVagaId);
            if (error) throw error;
            // Atualizar lista local
            setOrgVagas(prev => prev.map(v => v.id === selectedVagaId ? {
                ...v,
                vaga_primary_color: vagaDesign.primaryColor || null,
                vaga_gradient_end: vagaDesign.gradientEnd || null,
                vaga_bg_color: vagaDesign.bgColor || null,
                vaga_bg_image: vagaDesign.bgImage || null,
            } : v));
            toast.success('Design da vaga salvo!');
        } catch (err: any) {
            toast.error('Erro ao salvar: ' + err.message);
        } finally {
            setSavingVaga(false);
        }
    };

    const handleVagaBgImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profile.organization_id) return;
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.organization_id}/vagas/bg_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const toastId = toast.loading('Enviando imagem de fundo...');
        try {
            const { error: uploadError } = await supabase.storage
                .from('organizations')
                .upload(fileName, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('organizations').getPublicUrl(fileName);
            setVagaDesign(prev => ({ ...prev, bgImage: publicUrl }));
            toast.success('Imagem enviada!', { id: toastId });
        } catch (error: any) {
            toast.error('Erro ao enviar imagem.', { id: toastId });
        }
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
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        outline: 'none'
    });

    return (
        <div style={{ width: '100%' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
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
                <button disabled style={{ ...tabStyle(activeTab === 'design'), opacity: 0.5, cursor: 'not-allowed' }} title="Em breve">Personalizar Design</button>
            </div>

            {activeTab === 'vagas' ? (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <Vagas hideHeader={true} />
                </div>
            ) : (
                <div style={{ animation: 'fadeIn 0.3s ease-out', position: 'relative' }}>
                    {/* Sub-tabs: Portal de Vagas | Design das Vagas */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '4px', 
                        marginBottom: '32px', 
                        borderBottom: '1px solid var(--border)',
                        padding: '0 4px'
                    }}>
                        {[
                            { id: 'portal' as const, label: 'Portal de Vagas', icon: <Layers size={18} />, count: 1 },
                            { id: 'vagas' as const, label: 'Design das Vagas', icon: <Palette size={18} />, count: orgVagas.length }
                        ].map(tab => {
                            const active = designSubTab === tab.id;
                            const statusColor = active ? 'var(--primary)' : 'var(--text-dim)';
                            const badgeColor = active ? 'var(--primary)' : 'var(--text-muted)';
                            
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setDesignSubTab(tab.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 24px',
                                        background: active ? 'var(--bg-card)' : 'transparent',
                                        color: statusColor,
                                        borderTop: 'none',
                                        borderLeft: 'none',
                                        borderRight: 'none',
                                        borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
                                        borderRadius: '8px 8px 0 0',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        marginBottom: '-1px',
                                        position: 'relative',
                                        zIndex: active ? 1 : 0
                                    }}
                                >
                                    <span style={{ opacity: active ? 1 : 0.6, display: 'flex' }}>{tab.icon}</span>
                                    {tab.label}
                                    <span style={{ 
                                        fontSize: '11px', 
                                        background: active ? 'rgba(59, 130, 246, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                                        color: badgeColor,
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        fontWeight: 700,
                                        marginLeft: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}>
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {designSubTab === 'portal' && (
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
                    )}

                    {/* SUB-ABA: DESIGN DAS VAGAS */}
                    {designSubTab === 'vagas' && (
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', maxWidth: '1200px', margin: '0 auto', transition: 'all 0.3s', width: '100%' }}>
                        {/* Painel de controle */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Seletor de Vaga */}
                            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                                <div style={{ marginBottom: '24px' }}>
                                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '20px' }}>
                                        {selectedVagaId ? 'Vaga Selecionada' : 'Filtrar Vagas'}
                                    </h2>
                                    
                                    {!selectedVagaId && (
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', flexWrap: 'nowrap' }}>
                                            {/* Search */}
                                            <div style={{ position: 'relative', width: '260px', flexShrink: 0 }}>
                                                <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                                                <input 
                                                    type="text" 
                                                    placeholder="Buscar vagas..." 
                                                    value={vagaSearch}
                                                    onChange={e => setVagaSearch(e.target.value)}
                                                    style={{ 
                                                        background: 'rgba(255, 255, 255, 0.03)', 
                                                        border: '1px solid var(--border)', 
                                                        borderRadius: '10px', 
                                                        padding: '12px 16px 12px 42px', 
                                                        fontSize: '14px', 
                                                        color: 'var(--text-main)',
                                                        width: '100%',
                                                        height: '44px',
                                                        outline: 'none',
                                                        transition: 'all 0.2s',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                    }}
                                                />
                                            </div>

                                            {/* Category Filter */}
                                            <div style={{ position: 'relative' }}>
                                                <div 
                                                    onClick={() => setIsCategorySelectOpen(!isCategorySelectOpen)}
                                                    style={{ 
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)',
                                                        borderRadius: '10px', padding: '0 16px', color: 'var(--text-main)',
                                                        fontSize: '14px', cursor: 'pointer', height: '44px', minWidth: '180px', gap: '8px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Briefcase size={16} style={{ color: 'var(--primary)' }} />
                                                        <span style={{ whiteSpace: 'nowrap' }}>{vagaCategoryFilter || 'Todos Cargos'}</span>
                                                    </div>
                                                    <ChevronDown size={14} style={{ transform: isCategorySelectOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
                                                </div>
                                                {isCategorySelectOpen && (
                                                    <>
                                                        <div onClick={() => setIsCategorySelectOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                                                        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', backdropFilter: 'blur(16px)' }}>
                                                            <div 
                                                                onClick={() => { setVagaCategoryFilter(''); setIsCategorySelectOpen(false); }} 
                                                                style={{ 
                                                                    display: 'flex', alignItems: 'center', gap: '10px',
                                                                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', 
                                                                    color: !vagaCategoryFilter ? 'var(--primary)' : 'var(--text-dim)', 
                                                                    fontSize: '13px', background: !vagaCategoryFilter ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                                                    fontWeight: !vagaCategoryFilter ? 600 : 400
                                                                }}
                                                            >
                                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: !vagaCategoryFilter ? 'var(--primary)' : 'var(--text-muted)' }} />
                                                                Todos Cargos
                                                            </div>
                                                            {[...new Set(orgVagas.map(v => v.category).filter(Boolean))].map(cat => (
                                                                <div 
                                                                    key={cat} 
                                                                    onClick={() => { setVagaCategoryFilter(cat!); setIsCategorySelectOpen(false); }} 
                                                                    style={{ 
                                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                                        padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', 
                                                                        color: vagaCategoryFilter === cat ? 'var(--primary)' : 'var(--text-dim)', 
                                                                        fontSize: '13px', background: vagaCategoryFilter === cat ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                                                        fontWeight: vagaCategoryFilter === cat ? 600 : 400
                                                                    }}
                                                                >
                                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                                                                    {cat}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Status Filter */}
                                            <div style={{ position: 'relative' }}>
                                                <div 
                                                    onClick={() => setIsStatusSelectOpen(!isStatusSelectOpen)}
                                                    style={{ 
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)',
                                                        borderRadius: '10px', padding: '0 16px', color: 'var(--text-main)',
                                                        fontSize: '14px', cursor: 'pointer', height: '44px', minWidth: '160px', gap: '8px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Filter size={16} style={{ color: '#10b981' }} />
                                                        <span style={{ whiteSpace: 'nowrap' }}>{vagaStatusFilter ? (vagaStatusFilter.charAt(0).toUpperCase() + vagaStatusFilter.slice(1)) : 'Todos Status'}</span>
                                                    </div>
                                                    <ChevronDown size={14} style={{ transform: isStatusSelectOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
                                                </div>
                                                {isStatusSelectOpen && (
                                                    <>
                                                        <div onClick={() => setIsStatusSelectOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                                                        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', backdropFilter: 'blur(16px)' }}>
                                                            {[
                                                                {id: '', label: 'Todos Status', color: 'var(--text-muted)'},
                                                                {id: 'aberta', label: 'Aberta', color: '#22c55e'},
                                                                {id: 'pausada', label: 'Pausada', color: '#f59e0b'},
                                                                {id: 'fechada', label: 'Fechada', color: '#ef4444'},
                                                                {id: 'cancelada', label: 'Cancelada', color: '#64748b'}
                                                            ].map(status => (
                                                                <div 
                                                                    key={status.id}
                                                                    onClick={() => { setVagaStatusFilter(status.id); setIsStatusSelectOpen(false); }} 
                                                                    style={{ 
                                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                                        padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', 
                                                                        color: vagaStatusFilter === status.id ? 'var(--primary)' : 'var(--text-dim)', 
                                                                        fontSize: '13px', background: vagaStatusFilter === status.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                                                        fontWeight: vagaStatusFilter === status.id ? 600 : 400
                                                                    }}
                                                                >
                                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.color }} />
                                                                    {status.label}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Period Filter */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 600, whiteSpace: 'nowrap' }}>Período:</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8, marginLeft: '8px' }}>De:</span>
                                                    <DatePicker value={startDate} onChange={val => setStartDate(val)} />
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8, marginLeft: '8px' }}>Até:</span>
                                                    <DatePicker value={endDate} onChange={val => setEndDate(val)} />
                                                </div>
                                            </div>

                                            {/* Clear Filters Button */}
                                            {(vagaSearch || vagaStatusFilter || vagaCategoryFilter || startDate || endDate) && (
                                                <button 
                                                    onClick={() => { setVagaSearch(''); setVagaStatusFilter(''); setVagaCategoryFilter(''); setStartDate(''); setEndDate(''); }}
                                                    style={{ 
                                                        background: 'transparent', border: '1px solid var(--error-border)', color: 'var(--text-error)', 
                                                        fontSize: '12px', fontWeight: 600, cursor: 'pointer', 
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '10px 14px', borderRadius: '10px', whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    <CloseIcon size={14} /> Limpar
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {selectedVagaId && (
                                        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                                                Editando Design da Vaga
                                            </h2>
                                            <button 
                                                onClick={() => setSelectedVagaId('')}
                                                style={{ 
                                                    display: 'flex', alignItems: 'center', gap: '6px', 
                                                    background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
                                                    border: 'none', padding: '10px 18px', borderRadius: '10px', 
                                                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                            >
                                                <CloseIcon size={14} /> Fechar Edição
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {orgVagas.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Nenhuma vaga ativa encontrada.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                                        {orgVagas
                                            .filter(v => {
                                                if (selectedVagaId) return v.id === selectedVagaId;
                                                const matchesSearch = v.title.toLowerCase().includes(vagaSearch.toLowerCase());
                                                const matchesStatus = vagaStatusFilter ? v.status === vagaStatusFilter : true;
                                                const matchesCategory = vagaCategoryFilter ? v.category === vagaCategoryFilter : true;
                                                
                                                // Date filter
                                                const vagaDate = v.created_at ? new Date(v.created_at) : null;
                                                if (startDate && vagaDate && vagaDate < new Date(startDate)) return false;
                                                if (endDate && vagaDate) {
                                                    const nextDay = new Date(endDate);
                                                    nextDay.setDate(nextDay.getDate() + 1);
                                                    if (vagaDate >= nextDay) return false;
                                                }

                                                return matchesSearch && matchesStatus && matchesCategory;
                                            })
                                            .map(v => (
                                            <button
                                                key={v.id}
                                                type="button"
                                                onClick={() => !selectedVagaId && handleSelectVaga(v.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '12px 16px', borderRadius: '10px', 
                                                    cursor: selectedVagaId ? 'default' : 'pointer',
                                                    borderTop: selectedVagaId === v.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                    borderLeft: selectedVagaId === v.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                    borderRight: selectedVagaId === v.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                    borderBottom: selectedVagaId === v.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                    background: selectedVagaId === v.id ? 'rgba(99,102,241,0.07)' : 'var(--bg-main)',
                                                    transition: 'all 0.15s', textAlign: 'left',
                                                    boxShadow: selectedVagaId === v.id ? '0 4px 12px rgba(99,102,241,0.15)' : 'none'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <Briefcase size={16} style={{ color: selectedVagaId === v.id ? 'var(--primary)' : 'var(--text-muted)' }} />
                                                    <span style={{ color: selectedVagaId === v.id ? 'var(--primary)' : 'var(--text-main)', fontWeight: selectedVagaId === v.id ? 700 : 500, fontSize: '14px' }}>{v.title}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {(v.vaga_primary_color || v.vaga_bg_image) && (
                                                        <div title="Design Configurado" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }} />
                                                    )}
                                                    <span style={{ fontSize: '11px', background: v.status === 'aberta' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: v.status === 'aberta' ? '#10b981' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{v.status}</span>
                                                    {selectedVagaId === v.id && (
                                                        <Check size={16} style={{ color: 'var(--primary)' }} />
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedVagaId && (
                            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
                                <div>
                                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px' }}>Customizar Identidade da Vaga</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Configure cores e fundo exclusivos para esta página de candidatura.</p>
                                </div>

                                {/* Cores */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>COR PRINCIPAL</label>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '0 0 10px' }}>Botões e destaques</p>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input type="color" value={vagaDesign.primaryColor || '#6366f1'} onChange={e => setVagaDesign(p => ({...p, primaryColor: e.target.value}))} style={{ width: '44px', height: '44px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '2px', background: 'transparent' }} />
                                            <input type="text" value={vagaDesign.primaryColor} onChange={e => setVagaDesign(p => ({...p, primaryColor: e.target.value}))} placeholder="#6366f1" style={{ ...inputStyle }} />
                                            {vagaDesign.primaryColor && <button type="button" onClick={() => setVagaDesign(p => ({...p, primaryColor: ''}))} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }}>Limpar</button>}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>COR DO GRADIENTE</label>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '0 0 10px' }}>2ª cor do cabeçalho</p>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input type="color" value={vagaDesign.gradientEnd || '#7c3aed'} onChange={e => setVagaDesign(p => ({...p, gradientEnd: e.target.value}))} style={{ width: '44px', height: '44px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '2px', background: 'transparent' }} />
                                            <input type="text" value={vagaDesign.gradientEnd} onChange={e => setVagaDesign(p => ({...p, gradientEnd: e.target.value}))} placeholder="#7c3aed" style={{ ...inputStyle }} />
                                            {vagaDesign.gradientEnd && <button type="button" onClick={() => setVagaDesign(p => ({...p, gradientEnd: ''}))} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }}>Limpar</button>}
                                        </div>
                                    </div>
                                </div>

                                {/* Preview do gradiente */}
                                <div style={{ height: '56px', borderRadius: '10px', background: `linear-gradient(135deg, ${vagaDesign.primaryColor || '#6366f1'} 0%, ${vagaDesign.gradientEnd || '#7c3aed'} 100%)`, display: 'flex', alignItems: 'center', paddingLeft: '20px' }}>
                                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px', opacity: 0.9 }}>Preview do Header</span>
                                </div>

                                {/* Fundo */}
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>COR DE FUNDO</label>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '0 0 10px' }}>Ignorada se houver imagem de fundo</p>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input type="color" value={vagaDesign.bgColor || '#0B1020'} onChange={e => setVagaDesign(p => ({...p, bgColor: e.target.value}))} style={{ width: '44px', height: '44px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: '2px', background: 'transparent' }} />
                                        <input type="text" value={vagaDesign.bgColor} onChange={e => setVagaDesign(p => ({...p, bgColor: e.target.value}))} placeholder="#0B1020" style={{ ...inputStyle }} />
                                        {vagaDesign.bgColor && <button type="button" onClick={() => setVagaDesign(p => ({...p, bgColor: ''}))} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', whiteSpace: 'nowrap' }}>Limpar</button>}
                                    </div>
                                </div>

                                {/* Imagem de Fundo */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>IMAGEM DE FUNDO</label>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '0 0 10px' }}>Substitui a cor sólida de fundo</p>
                                    {vagaDesign.bgImage ? (
                                        <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', height: '100px' }}>
                                            <img src={vagaDesign.bgImage} alt="Fundo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button type="button" onClick={() => setVagaDesign(p => ({...p, bgImage: ''}))} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', padding: '4px 10px', fontSize: '12px' }}>Remover</button>
                                        </div>
                                    ) : (
                                        <label style={{ display: 'block', cursor: 'pointer' }}>
                                            <input type="file" accept="image/*" onChange={handleVagaBgImageUpload} style={{ display: 'none' }} />
                                            <div
                                                style={{ border: '2px dashed var(--border)', borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
                                            >
                                                <Upload size={22} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                                                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Clique para enviar imagem</p>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '4px 0 0', opacity: 0.7 }}>JPG, PNG, WebP</p>
                                            </div>
                                        </label>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                    <button
                                        onClick={handleSaveVagaDesign}
                                        disabled={savingVaga}
                                        style={{ padding: '12px 32px', background: 'linear-gradient(135deg, var(--primary), #7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: savingVaga ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
                                    >
                                        {savingVaga ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        Salvar Design da Vaga
                                    </button>
                                </div>
                            </div>
                            )}
                        </div>

                        {/* Preview ao vivo da vaga - Só aparece quando selecionado */}
                        {selectedVagaId && (
                        <div style={{ width: '420px', position: 'sticky', top: '24px', animation: 'fadeIn 0.4s ease-out' }}>
                            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                                <Eye size={16} />
                                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Preview da Candidatura</span>
                            </div>
                            <div style={{ border: '8px solid var(--bg-card)', borderRadius: '32px', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', overflow: 'hidden', height: '780px' }}>
                                <div style={{
                                    height: '100%',
                                    background: vagaDesign.bgImage ? `url(${vagaDesign.bgImage}) center/cover no-repeat` : (vagaDesign.bgColor || '#0B1020'),
                                    fontFamily: 'Inter, sans-serif',
                                    overflowY: 'auto',
                                    paddingBottom: '40px'
                                }}>
                                    {/* Header (Fiel ao real) */}
                                    <div style={{
                                        background: `linear-gradient(135deg, ${vagaDesign.primaryColor || 'var(--primary)'} 0%, ${vagaDesign.gradientEnd || '#7c3aed'} 100%)`,
                                        padding: '40px 24px', position: 'relative', overflow: 'hidden'
                                    }}>
                                        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                                        
                                        <div style={{ position: 'relative', zIndex: 1 }}>
                                            <div style={{ 
                                                display: 'inline-flex', alignItems: 'center', gap: '6px', 
                                                padding: '6px 12px', background: 'rgba(255, 255, 255, 0.15)', 
                                                borderRadius: '6px', color: '#fff', fontSize: '11px', marginBottom: '12px' 
                                            }}>
                                                <ArrowLeft size={12} /> Voltar
                                            </div>
                                            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>
                                                Candidate-se à Vaga
                                            </h2>
                                            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', margin: 0, fontWeight: 500 }}>
                                                {orgVagas.find(v => v.id === selectedVagaId)?.title || 'Título da Vaga'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Cards de Preview */}
                                    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* Card: Informações Pessoais */}
                                        <div style={{ background: '#1a1c2d', padding: '20px', borderRadius: '16px', border: '1px solid #1f2332' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>Informações Pessoais</div>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {[
                                                    { label: 'Nome Completo *', icon: <User size={14} />, placeholder: 'Seu nome completo' },
                                                    { label: 'E-mail *', icon: <Mail size={14} />, placeholder: 'seu.email@exemplo.com' },
                                                    { label: 'Telefone *', icon: <Phone size={14} />, placeholder: '(11) 99999-9999' },
                                                    { label: 'LinkedIn', icon: <Linkedin size={14} />, placeholder: 'linkedin.com/in/seu-perfil' },
                                                    { label: 'Cidade / Estado', icon: <MapPin size={14} />, placeholder: 'São Paulo, SP' }
                                                ].map(field => (
                                                    <div key={field.label}>
                                                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>{field.label}</div>
                                                        <div style={{ height: '36px', background: '#0B1020', borderRadius: '8px', border: '1px solid #1f2332', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '10px' }}>
                                                            <div style={{ color: '#64748b' }}>{field.icon}</div>
                                                            <div style={{ fontSize: '11px', color: '#475569' }}>{field.placeholder}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Card: Currículo */}
                                        <div style={{ background: '#1a1c2d', padding: '20px', borderRadius: '16px', border: '1px solid #1f2332' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>Currículo</div>
                                            <div style={{ 
                                                height: '100px', border: '2px dashed #1f2332', borderRadius: '12px', 
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                                            }}>
                                                <Upload size={18} style={{ color: '#64748b' }} />
                                                <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center' }}>Clique para enviar seu currículo<br/>PDF até 10MB</span>
                                            </div>
                                        </div>

                                        {/* Botão Final */}
                                        <div style={{ 
                                            height: '46px', borderRadius: '12px', marginTop: '10px',
                                            background: `linear-gradient(135deg, ${vagaDesign.primaryColor || 'var(--primary)'} 0%, ${vagaDesign.gradientEnd || '#7c3aed'} 100%)`, 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                            boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                                        }}>
                                            <Send size={16} style={{ color: '#fff' }} />
                                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>Enviar Candidatura</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}
                    </div>
                    )}
                </div>
            )}
        </div>
    );
};

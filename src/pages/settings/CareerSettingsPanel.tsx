import React, { useState, useEffect } from 'react';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { Loader2, Image as ImageIcon, PaintBucket, Type } from 'lucide-react';

interface CareerSettingsPanelProps {
    showToast: (type: 'success' | 'error', msg: string) => void;
}

export const CareerSettingsPanel: React.FC<CareerSettingsPanelProps> = ({ showToast }) => {
    const { profile } = useUser();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [logoUrl, setLogoUrl] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#3b82f6');
    const [aboutText, setAboutText] = useState('');
    const [orgName, setOrgName] = useState('');

    useEffect(() => {
        const fetchOrgSettings = async () => {
            if (!profile.organization_id) {
                setLoading(false);
                return;
            }
            try {
                const { data, error } = await supabase
                    .from('organizations')
                    .select('name, logo_url, cover_image_url, primary_color, about_text')
                    .eq('id', profile.organization_id)
                    .single();

                if (error) throw error;
                if (data) {
                    setOrgName(data.name || '');
                    setLogoUrl(data.logo_url || '');
                    setCoverImageUrl(data.cover_image_url || '');
                    setPrimaryColor(data.primary_color || '#3b82f6');
                    setAboutText(data.about_text || '');
                }
            } catch (err: any) {
                console.error('[CareerSettings] Erro ao carregar:', err);
                showToast('error', 'Erro ao carregar configurações da página de carreiras.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrgSettings();
    }, [profile.organization_id, showToast]);

    const handleSave = async () => {
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
                })
                .eq('id', profile.organization_id);

            if (error) throw error;
            showToast('success', 'Configurações de carreiras salvas com sucesso!');
        } catch (err: any) {
            console.error('[CareerSettings] Erro ao salvar:', err);
            showToast('error', 'Erro ao salvar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!profile.organization_id) {
        return (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Você não possui uma organização vinculada.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '20vh' }}>
                <Loader2 style={{ width: 24, height: 24, color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
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
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        color: 'var(--text-muted)',
        fontSize: '12px',
        fontWeight: 600,
        marginBottom: '6px',
    };

    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '18px', margin: '0 0 4px' }}>
                    Personalização do Portal White Label
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0, maxWidth: '600px' }}>
                    Configure a logomarca, imagem de fundo (cover), cores e o texto "Sobre a Empresa" que os candidatos visualizarão na sua Página de Carreiras exclusiva.
                </p>
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <a 
                        href={`#/carreiras/${profile.organization_id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 600, textDecoration: 'underline' }}
                    >
                        Visualizar meu Portal de Carreiras
                    </a>
                    <button
                        onClick={() => {
                            const url = `${window.location.origin}${window.location.pathname}#/carreiras/${profile.organization_id}`;
                            navigator.clipboard.writeText(url);
                            showToast('success', 'Link copiado para a área de transferência!');
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                    >
                        Copiar Link do Portal
                    </button>
                </div>
            </div>

            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    {/* Logo URL */}
                    <div>
                        <label style={labelStyle}>
                            <ImageIcon size={14} style={{ display: 'inline', marginRight: 4 }} />
                            URL da Logomarca (Opcional)
                        </label>
                        <input
                            style={inputStyle}
                            placeholder="https://exemplo.com/logo.png"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                        />
                    </div>
                    {/* Cover URL */}
                    <div>
                        <label style={labelStyle}>
                            <ImageIcon size={14} style={{ display: 'inline', marginRight: 4 }} />
                            URL da Imagem de Fundo/Capa (Opcional)
                        </label>
                        <input
                            style={inputStyle}
                            placeholder="https://exemplo.com/capa.jpg"
                            value={coverImageUrl}
                            onChange={(e) => setCoverImageUrl(e.target.value)}
                        />
                    </div>
                    {/* Cor Principal */}
                    <div>
                        <label style={labelStyle}>
                            <PaintBucket size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Cor Principal da Marca
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="color"
                                style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'none' }}
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                            />
                            <input
                                style={{ ...inputStyle, width: '120px' }}
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* About Text */}
                <div>
                    <label style={labelStyle}>
                        <Type size={14} style={{ display: 'inline', marginRight: 4 }} />
                        Sobre a {orgName || 'Empresa'}
                    </label>
                    <textarea
                        style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                        placeholder="Escreva um texto apresentando sua empresa para os candidatos..."
                        value={aboutText}
                        onChange={(e) => setAboutText(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'background 0.15s' }}
                    >
                        {saving && <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />}
                        {saving ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

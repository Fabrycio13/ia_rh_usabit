import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import { User, Building2, Phone, Mail, Briefcase, Camera, Loader2, Zap, Star, Building, Check, Lock, ShieldCheck, Moon, Sun, MapPin, Bell, Settings, Key, CreditCard, ChevronDown, ChevronUp, Palette, RefreshCcw, Sparkles, Layout } from 'lucide-react';
import { useUser } from '../../core/contexts/UserContext';
import { useTheme } from '../../core/contexts/ThemeContext';
import { logActivity } from '../../core/services/logger';
import toast from 'react-hot-toast';
import { OwnerAdminApiPanel, OwnerAdminPlanPanel, type AdminUser } from './OwnerPanels';
import { roleDefinitions } from '../../common/constants/roleDefinitions';

type TabKey = 'perfil' | 'seguranca' | 'aparencia' | 'api' | 'plano';

interface TabItem {
    key: TabKey;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}

const allTabs: TabItem[] = [
    { key: 'perfil', label: 'Perfil', icon: User },
    { key: 'seguranca', label: 'Segurança', icon: Lock },
    { key: 'aparencia', label: 'Aparência', icon: Moon },
    { key: 'api', label: 'API', icon: Key },
    { key: 'plano', label: 'Plano', icon: CreditCard },
];

// Abas visíveis para cada perfil
const getVisibleTabs = (userRole: string): TabItem[] => {
    const baseTabs = allTabs.filter(tab => ['perfil', 'seguranca', 'aparencia'].includes(tab.key));
    // Apenas Owner veem API e Plano
    if (userRole === 'owner') {
        return [...baseTabs, ...allTabs.filter(tab => ['api', 'plano'].includes(tab.key))];
    }
    return baseTabs;
};

const themeBtnCss = `
    .theme-switch-container {
        display: flex;
        background: var(--bg-main);
        padding: 6px;
        border-radius: 14px;
        border: 1px solid var(--border);
        width: fit-content;
        position: relative;
        gap: 4px;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
    }
    .theme-switch-slider {
        position: absolute;
        height: calc(100% - 12px);
        width: calc(50% - 8px);
        background: var(--primary);
        border-radius: 10px;
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
    }
    .theme-switch-option {
        position: relative;
        z-index: 1;
        padding: 8px 18px;
        border-radius: 10px;
        border: none;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-dim);
        transition: color 0.3s;
    }
    .theme-switch-option.active {
        color: #fff;
    }
    .theme-icon-anim {
        transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .theme-switch-option:hover .theme-icon-anim {
        transform: rotate(15deg) scale(1.1);
    }
`;

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '11px 14px 11px 42px',
    color: 'var(--text-main)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, background 0.2s',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    color: 'var(--text-muted)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    marginBottom: '6px',
};

const fieldWrapStyle: React.CSSProperties = { position: 'relative' };

const iconFieldStyle: React.CSSProperties = {
    position: 'absolute',
    left: '13px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '16px',
    height: '16px',
    color: 'var(--text-dim)',
    pointerEvents: 'none',
};

const plans = [
    {
        key: 'trial',
        name: 'Trial',
        icon: Zap,
        price: 'Grátis',
        period: '7 dias',
        color: '#f59e0b',
        features: ['Até 20 análises/mês', 'Limite de 5 candidatos por análise', 'Banco de candidatos limitado', 'Suporte por e-mail'],
    },
    {
        key: 'pro',
        name: 'Pro',
        icon: Star,
        price: 'R$ 99,90',
        period: '/mês',
        color: '#6366f1',
        features: ['Análises ilimitadas', 'Banco de candidatos completo', 'Suporte prioritário', 'Relatórios avançados'],
        popular: true,
    },
    {
        key: 'enterprise',
        name: 'Enterprise',
        icon: Building,
        price: 'Sob consulta',
        period: '',
        color: '#10b981',
        features: ['Tudo do Pro', 'Múltiplos usuários', 'SLA garantido', 'Integração personalizada'],
    },
];

export const Configuracoes = () => {
    const { profile, refetch } = useUser();
    const { theme, toggleTheme, bgTheme, setBgTheme, customPrimaryColor, setCustomPrimaryColor, customTextColor, setCustomTextColor } = useTheme();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabKey>('perfil');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [currentPlan] = useState<string>('trial');

    const showToast = (type: 'success' | 'error' | 'info', msg: string) => {
        if (type === 'success') toast.success(msg);
        else if (type === 'info') toast(msg, { icon: 'ℹ️' });
        else toast.error(msg);
    };

    const userId = profile.userId;
    const email = profile.email;
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [orgName, setOrgName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarPreview, setAvatarPreview] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Evolution API States
    const [evoUrl, setEvoUrl] = useState('');
    const [evoKey, setEvoKey] = useState('');
    const [evoInstance, setEvoInstance] = useState('');
    const [showEvoConfig, setShowEvoConfig] = useState(false);

    // Perfis state (mantido para API/Plano)
    const [allUsers, setAllUsers] = useState<AdminUser[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const mql = window.matchMedia('(max-width: 768px)');
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);


    useEffect(() => {
        if (!profile.loaded || dataLoaded) return;
        if (!userId) { setLoading(false); return; }
        const load = async () => {
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (profileData) {
                setName(profileData.name ?? '');
                setRole(profileData.role ?? '');
                setOrgName(profileData.organization_name ?? '');
                setPhone(profileData.phone ?? '');
                setAddress(profileData.address ?? '');
                setNotificationsEnabled(profileData.notifications_enabled ?? false);
                setAvatarUrl(profileData.avatar_url ?? '');
                setEvoUrl(profileData.evolution_api_url ?? '');
                setEvoKey(profileData.evolution_api_key ?? '');
                setEvoInstance(profileData.evolution_instance ?? '');
                if (profileData.avatar_url) setAvatarPreview(profileData.avatar_url);
            }
            setDataLoaded(true);
            setLoading(false);
        };
        load();
    }, [userId, profile.loaded, dataLoaded]);

    // Carregar usuários quando entrar nas abas que dependem da lista de usuários
    const loadUsersRef = useRef<() => Promise<void> | null>(null);

    useEffect(() => {
        const isOwner = profile.user_role === 'owner';
        const isGestor = profile.user_role === 'gestor';
        const needsUsers = isOwner && (activeTab === 'api' || activeTab === 'plano');

        if (needsUsers && (isOwner || isGestor)) {
            loadUsersRef.current = loadUsers;
            loadUsersRef.current?.();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, profile.user_role]);

    // Redirecionar para aba "perfil" se tentar acessar aba restrita sem permissão
    useEffect(() => {
        const visibleTabs = getVisibleTabs(profile.user_role);
        const isTabVisible = visibleTabs.some(tab => tab.key === activeTab);
        if (!isTabVisible && profile.loaded) {
            setActiveTab('perfil');
        }
    }, [activeTab, profile.user_role, profile.loaded]);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;
        setUploadingPhoto(true);
        const ext = file.name.split('.').pop();
        const path = `${userId}/avatar.${ext}`;
        console.log('[Avatar Upload] path:', path, 'file.type:', file.type, 'file.size:', file.size);
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '0' });
        if (uploadError) {
            console.error('[Avatar Upload] error:', uploadError);
            toast.error(`Erro ao enviar foto: ${uploadError.message}`);
            setUploadingPhoto(false);
            logActivity(userId, 'Fez alterações na foto', { filename: file.name }, uploadError.message);
            return;
        }
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        const urlWithCache = `${publicUrl}?t=${Date.now()}`;
        setAvatarPreview(urlWithCache);
        setAvatarUrl(urlWithCache);

        const { error: saveError } = await supabase
            .from('profiles')
            .update({ avatar_url: urlWithCache, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (saveError) {
            console.error('[Avatar Upload] save error:', saveError);
            toast.error('Foto enviada, mas falhou ao salvar no perfil. Clique em "Salvar alterações".');
        } else {
            toast.success('Foto atualizada e salva!');
        }
        setUploadingPhoto(false);
        logActivity(userId, 'Fez alterações na foto', { filename: file.name });
    };

    const handleRemovePhoto = async () => {
        if (!userId) return;
        setAvatarPreview('');
        setAvatarUrl('');

        const { error: saveError } = await supabase
            .from('profiles')
            .update({ avatar_url: null, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (saveError) {
            console.error('[Avatar Remove] save error:', saveError);
            toast.error('Falha ao remover foto do perfil.');
        } else {
            toast.success('Foto removida!');
        }
    };

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                name,
                role,
                organization_name: orgName,
                phone,
                address,
                notifications_enabled: notificationsEnabled,
                avatar_url: avatarUrl,
                evolution_api_url: evoUrl,
                evolution_api_key: evoKey,
                evolution_instance: evoInstance,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('[Configuracoes] erro ao atualizar perfil:', updateError);
            const { error: insertError } = await supabase.from('profiles').insert({
                id: userId,
                email,
                name,
                role,
                organization_name: orgName,
                phone,
                address,
                notifications_enabled: notificationsEnabled,
                avatar_url: avatarUrl
            });
            setSaving(false);
            if (insertError) { 
                console.error('[Configuracoes] erro ao inserir perfil:', insertError); 
                toast.error(`Erro: ${insertError.message}`); 
                logActivity(userId, 'Fez alterações no perfil', { name, role, organization_name: orgName }, insertError.message);
            }
            else {
                toast.success('Perfil salvo com sucesso!');
                logActivity(userId, 'Fez alterações no perfil', { name, role, organization_name: orgName });
            }
        } else {
            setSaving(false);
            toast.success('Perfil salvo com sucesso!');
            logActivity(userId, 'Fez alterações no perfil', { name, role, organization_name: orgName });
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword) {
            showToast('error', 'Digite a nova senha.');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('error', 'As senhas não coincidem.');
            return;
        }
        if (newPassword.length < 6) {
            showToast('error', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setSavingPassword(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setSavingPassword(false);

        if (error) {
            toast.error(`Erro: ${error.message}`);
        } else {
            toast.success('Senha alterada com sucesso!');
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    const formatPhone = (val: string) => {
        const nums = val.replace(/\D/g, '').slice(0, 11);
        if (nums.length <= 2) return nums;
        if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
        return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
    };

    // Carregar usuários (owner vê todos; gestor vê sua org)
    const loadUsers = async () => {
        const role = profile.user_role;
        if (role !== 'owner' && role !== 'gestor') return;
        let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
        // Gestor só vê usuários da sua organização
        if (role === 'gestor' && profile.organization_id) {
            query = query.eq('organization_id', profile.organization_id);
        }
        const { data } = await query;
        if (data) setAllUsers(data);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <Loader2 style={{ width: 32, height: 32, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';

    return (
        <div className="cfg-root">
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                    70% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
                    100% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }
                @keyframes slideIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
                .field-input:focus { border-color: #6366f1 !important; }
                .save-btn:hover:not(:disabled) { background: #4f46e5 !important; }
                .photo-overlay { opacity: 0; transition: opacity 0.2s; }
                .avatar-wrapper:hover .photo-overlay { opacity: 1; }
                .plan-card { transition: border-color 0.2s, transform 0.2s; }
                .plan-card:hover { transform: translateY(-2px); }
                .upgrade-btn:hover { opacity: 0.85 !important; }
                .cfg-save-row { justify-content: center; }
                @media (max-width: 768px) {
                    .cfg-grid-2col > div { padding: 18px 14px !important; }
                    .cfg-grid-2col > div > div[style*="padding: 16px"] { padding: 12px !important; }
                }
                .cfg-root { overflow-x: hidden; max-width: 100%; box-sizing: border-box; }
                .cfg-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                @media (max-width: 768px) {
                    .cfg-root { padding: 0 4px; }
                    .cfg-grid-2col { grid-template-columns: 1fr !important; align-items: stretch !important; }
                    .cfg-grid-2col > * { min-width: 0 !important; }
                    .cfg-photo-card { height: auto !important; }
                    .cfg-inner-2col { grid-template-columns: 1fr !important; gap: 20px !important; }
                    .cfg-form-grid { grid-template-columns: 1fr !important; }
                    .cfg-save-row { justify-content: center !important; }
                }
            `}</style>


            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: isMobile ? 12 : 16, marginBottom: isMobile ? 16 : 24, flexWrap: 'wrap' }}>
                <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '20px' : '16px', marginBottom: '8px' }}>
                            <Settings size={isMobile ? 24 : 32} style={{ color: 'var(--primary)' }} />
                        <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            Configurações
                        </h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                        Gerencie seu perfil e tema
                    </p>
                </div>
            </div>

            {/* ── Abas ── */}
            <div style={{ display: 'flex', gap: isMobile ? '2px' : '4px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '0', overflow: 'hidden' }}>
                {getVisibleTabs(profile.user_role).map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: isMobile ? '4px' : '8px',
                                padding: isMobile ? '8px 10px' : '12px 20px',
                                borderRadius: '10px 10px 0 0',
                                border: 'none',
                                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                                background: isActive ? 'var(--bg-card)' : 'transparent',
                                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                fontSize: isMobile ? '11px' : '14px',
                                fontWeight: isActive ? 600 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '-1px',
                                position: 'relative',
                                whiteSpace: 'nowrap',
                                flex: isMobile ? '1 1 0%' : undefined,
                                minWidth: 0,
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    (e.target as HTMLElement).style.color = 'var(--text-main)';
                                    (e.target as HTMLElement).style.background = 'var(--bg-card)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    (e.target as HTMLElement).style.color = 'var(--text-muted)';
                                    (e.target as HTMLElement).style.background = 'transparent';
                                }
                            }}
                        >
                            <Icon size={tab.key === 'seguranca' || tab.key === 'aparencia' ? (isMobile ? 22 : 18) : 16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Conteúdo das Abas ── */}
            
            {/* ABA 1: PERFIL */}
            {activeTab === 'perfil' && (
                <>
                {(() => {
                    const currentUserRole = roleDefinitions.find(r => r.key === profile.user_role) || roleDefinitions[1];
                    const RoleIcon = currentUserRole.icon;
                    return (
                    <>
                    <div className="cfg-grid-2col" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '240px 1fr', gap: '20px', marginBottom: '20px', alignItems: 'stretch' }}>

                        {/* Card avatar separado */}
                        <div className="cfg-photo-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', justifyContent: 'space-between' }}>
                            <div className="avatar-wrapper" style={{ position: 'relative', width: '120px', height: '120px', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)' }} />
                                ) : (
                                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 700, color: '#fff', border: '3px solid var(--border)' }}>{initials}</div>
                                )}
                                <div className="photo-overlay" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {uploadingPhoto ? <Loader2 style={{ width: 24, height: 24, color: '#fff', animation: 'spin 1s linear infinite' }} /> : <Camera style={{ width: 24, height: 24, color: '#fff' }} />}
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />

                            <div style={{ textAlign: 'center' }}>
                                <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '16px', margin: 0 }}>{name || 'Sem nome'}</p>
                                <p style={{
                                    color: (roleDefinitions.find(r => r.key === profile.user_role)?.color || 'var(--text-dim)'),
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    margin: '5px 0 0',
                                    letterSpacing: '0.5px'
                                }}>
                                    {currentUserRole.label}
                                </p>
                                <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '2px 0 0' }}>{role}</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '4px' }}>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="save-btn"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'var(--primary)',
                                        color: '#fff',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.2)'
                                    }}
                                >
                                    <Camera style={{ width: 14, height: 14 }} />
                                    Trocar foto
                                </button>
                                {avatarPreview && (
                                    <button
                                        onClick={handleRemovePhoto}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(239,68,68,0.3)',
                                            background: 'transparent',
                                            color: '#ef4444',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                        Remover foto
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Card do perfil atual (ao lado) */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px' }}>
                            <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: '0 0 20px' }}>Seu Perfil Atual</p>

                            <div className="cfg-inner-2col" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '32px' }}>
                                {/* Lado esquerdo: card do role */}
                                <div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        background: `${currentUserRole.color}10`,
                                        border: `1px solid ${currentUserRole.color}30`,
                                        marginBottom: '14px',
                                    }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '10px',
                                            background: currentUserRole.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <RoleIcon style={{ width: 22, height: 22, color: '#fff' }} />
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '17px', margin: 0 }}>{currentUserRole.label}</p>
                                            <p style={{ color: currentUserRole.color, fontSize: '11px', fontWeight: 600, margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Perfil ativo</p>
                                        </div>
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                                        {currentUserRole.description}
                                    </p>
                                </div>

                                {/* Lado direito: atribuições */}
                                <div>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>
                                        Suas Atribuições
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {currentUserRole.permissions.map(permission => (
                                            <div key={permission} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                background: 'var(--bg-card-alt)',
                                                border: '1px solid var(--border)',
                                            }}>
                                                <Check style={{ width: 14, height: 14, color: currentUserRole.color, flexShrink: 0, strokeWidth: 3 }} />
                                                <span style={{ color: 'var(--text-main)', fontSize: '13px' }}>{permission}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card formulário */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px' }}>
                        <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: '0 0 20px' }}>Informações Pessoais</p>

                        <div className="cfg-form-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '16px' }}>
                            {/* Nome */}
                            <div>
                                <label htmlFor="cfg-name" style={labelStyle}>Nome completo</label>
                                <div style={fieldWrapStyle}>
                                    <User style={iconFieldStyle} />
                                    <input id="cfg-name" name="name" autoComplete="name" className="field-input" style={inputStyle} placeholder="Seu nome completo" value={name} onChange={e => setName(e.target.value)} />
                                </div>
                            </div>

                            {/* Endereço */}
                            <div>
                                <label htmlFor="cfg-address" style={labelStyle}>Endereço</label>
                                <div style={fieldWrapStyle}>
                                    <MapPin style={iconFieldStyle} />
                                    <input id="cfg-address" name="street-address" autoComplete="street-address" className="field-input" style={inputStyle} placeholder="Cidade - UF ou Endereço completo" value={address} onChange={e => setAddress(e.target.value)} />
                                </div>
                            </div>

                            {/* Telefone */}
                            <div>
                                <label htmlFor="cfg-phone" style={labelStyle}>Telefone</label>
                                <div style={fieldWrapStyle}>
                                    <Phone style={iconFieldStyle} />
                                    <input id="cfg-phone" name="tel" type="tel" autoComplete="tel" className="field-input" style={inputStyle} placeholder="(00) 00000-0000" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} />
                                </div>
                            </div>

                            {/* Cargo */}
                            <div>
                                <label htmlFor="cfg-role" style={labelStyle}>Cargo</label>
                                <div style={fieldWrapStyle}>
                                    <Briefcase style={iconFieldStyle} />
                                    <input id="cfg-role" name="role" autoComplete="organization-title" className="field-input" style={inputStyle} placeholder="Ex: Analista de RH" value={role} onChange={e => setRole(e.target.value)} />
                                </div>
                            </div>

                            {/* Organização */}
                            {profile.user_role !== 'convidado' && (
                            <div>
                                <label htmlFor="cfg-orgname" style={labelStyle}>Organização</label>
                                <div style={fieldWrapStyle}>
                                    <Building2 style={iconFieldStyle} />
                                    <input id="cfg-orgname" name="organization" autoComplete="organization" className="field-input" style={inputStyle} placeholder="Nome da organização" value={orgName} onChange={e => setOrgName(e.target.value)} />
                                </div>
                            </div>
                            )}

                            {/* Email readonly */}
                            <div>
                                <label htmlFor="cfg-email" style={labelStyle}>E-mail</label>
                                <div style={fieldWrapStyle}>
                                    <Mail style={iconFieldStyle} />
                                    <input id="cfg-email" name="email" type="email" autoComplete="email" style={{ ...inputStyle, color: 'var(--text-dim)', cursor: 'not-allowed' }} value={email} readOnly title="O e-mail não pode ser alterado aqui" />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                            <button
                                className="save-btn"
                                onClick={handleSave}
                                disabled={saving}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'background 0.15s' }}
                            >
                                {saving && <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />}
                                {saving ? 'Salvando...' : 'Salvar alterações'}
                            </button>
                        </div>
                    </div>
                    </>
                    );
                })()}
                </>
            )}

            {/* ABA 2: SEGURANÇA (Senha) */}
            {activeTab === 'seguranca' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', maxWidth: '480px', gap: '20px', marginBottom: '24px' }}>

                    {/* Segurança */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', display: 'flex', flexDirection: 'column' }}>
                        <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: '0 0 4px' }}>Segurança</p>
                        <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '0 0 20px' }}>Senha de acesso</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', flex: 1 }}>
                            <div>
                                <label htmlFor="cfg-new-password" style={labelStyle}>Nova Senha</label>
                                <div style={fieldWrapStyle}>
                                    <Lock style={iconFieldStyle} />
                                    <input
                                        id="cfg-new-password"
                                        name="new-password"
                                        className="field-input"
                                        type="password"
                                        style={inputStyle}
                                        placeholder="Nova senha"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="cfg-confirm-password" style={labelStyle}>Confirmar</label>
                                <div style={fieldWrapStyle}>
                                    <ShieldCheck style={iconFieldStyle} />
                                    <input
                                        id="cfg-confirm-password"
                                        name="confirm-password"
                                        className="field-input"
                                        type="password"
                                        style={inputStyle}
                                        placeholder="Repita"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-start' }}>
                            <button
                                className="save-btn"
                                onClick={handleChangePassword}
                                disabled={savingPassword}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: savingPassword ? 'not-allowed' : 'pointer', opacity: savingPassword ? 0.7 : 1, transition: 'background 0.15s' }}
                            >
                                {savingPassword && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                                {savingPassword ? 'Atualizando...' : 'Alterar Senha'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ABA APARÊNCIA: Tema e Notificações */}
            {activeTab === 'aparencia' && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    {/* Aparência */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                        <style>{themeBtnCss}</style>

                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: '0 0 4px' }}>Aparência</p>
                            <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>Tema da interface</p>
                        </div>

                        <div className="theme-switch-container" style={{ marginTop: '10px' }}>
                            <div className="theme-switch-slider" style={{
                                transform: theme === 'light' ? 'translateX(0)' : 'translateX(calc(100% + 4px))'
                            }} />

                            <button
                                className={`theme-switch-option ${theme === 'light' ? 'active' : ''}`}
                                onClick={() => {
                                    if (bgTheme !== 'simple') {
                                        showToast('info', 'O modo claro só está disponível no fundo Simples');
                                        return;
                                    }
                                    if (theme === 'dark') toggleTheme();
                                }}
                                style={{
                                    opacity: bgTheme !== 'simple' ? 0.4 : 1,
                                    cursor: bgTheme !== 'simple' ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <Sun className="theme-icon-anim" size={16} />
                                Claro
                            </button>

                            <button
                                className={`theme-switch-option ${theme === 'dark' ? 'active' : ''}`}
                                onClick={() => theme === 'light' && toggleTheme()}
                            >
                                <Moon className="theme-icon-anim" size={16} />
                                Escuro
                            </button>
                        </div>

                        <div style={{ marginTop: '24px', marginBottom: '12px' }}>
                            <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '14px', margin: 0 }}>Temas</p>
                            <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '4px 0 0' }}>Escolha o estilo visual do seu painel</p>
                        </div>

                        <div className="theme-switch-container" style={{ width: '100%', maxWidth: '480px', height: isMobile ? '48px' : '44px' }}>
                            <div className="theme-switch-slider" style={{
                                width: 'calc(33.33% - 8px)',
                                transform: bgTheme === 'simple' ? 'translateX(0)' : bgTheme === 'planets' ? 'translateX(calc(100% + 4px))' : 'translateX(calc(200% + 8px))',
                                height: '32px',
                                top: '6px',
                                background: 'var(--primary)',
                                borderRadius: '10px',
                                boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.3)'
                            }} />

                            <button
                                className={`theme-switch-option ${bgTheme === 'simple' ? 'active' : ''}`}
                                onClick={() => setBgTheme('simple')}
                                style={{ flex: 1, height: '100%', zIndex: 1, fontSize: '12px', fontWeight: 600, gap: isMobile ? '4px' : '8px', whiteSpace: 'nowrap', padding: isMobile ? '6px 10px' : undefined }}
                            >
                                <Layout size={15} />
                                Simples
                            </button>

                            <button
                                className={`theme-switch-option ${bgTheme === 'planets' ? 'active' : ''}`}
                                onClick={() => setBgTheme('planets')}
                                style={{ flex: 1, height: '100%', zIndex: 1, fontSize: '12px', fontWeight: 600, gap: isMobile ? '4px' : '8px', whiteSpace: 'nowrap', padding: isMobile ? '6px 10px' : undefined }}
                            >
                                <Star size={15} />
                                Planetário
                            </button>

                            <button
                                className={`theme-switch-option ${bgTheme === 'spatial' ? 'active' : ''}`}
                                onClick={() => setBgTheme('spatial')}
                                style={{ flex: 1, height: '100%', zIndex: 1, fontSize: '12px', fontWeight: 600, gap: isMobile ? '4px' : '8px', whiteSpace: 'nowrap', padding: isMobile ? '6px 10px' : undefined }}
                            >
                                <Sparkles size={15} />
                                Espacial
                            </button>
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>Ambiente Customizado</span>
                        </div>
                    </div>

                    {/* Personalização de Cores */}
                    {(() => {
                        const handlePrimary = (e: React.SyntheticEvent<HTMLInputElement>) => setCustomPrimaryColor((e.target as HTMLInputElement).value);
                        const handleText = (e: React.SyntheticEvent<HTMLInputElement>) => setCustomTextColor((e.target as HTMLInputElement).value);
                        return (
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: '0 0 4px' }}>Cores Customizadas</p>
                                        <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>Personalize as cores do sistema</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setCustomPrimaryColor(null);
                                            setCustomTextColor(null);
                                            toast.success('Cores resetadas para o padrão');
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                                    >
                                        <RefreshCcw size={14} />
                                        Resetar
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                                    {/* Cor Principal */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                                <Palette size={18} />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500, margin: 0 }}>Cor Principal</p>
                                                <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>Botões, abas, destaques e bordas</p>
                                            </div>
                                        </div>
                                        <input
                                            id="cfg-primary-color"
                                            name="primary-color"
                                            type="color"
                                            value={customPrimaryColor || (theme === 'dark' ? '#3b82f6' : '#2563eb')}
                                            onChange={handlePrimary}
                                            onInput={handlePrimary}
                                            style={{ width: '36px', height: '36px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                                        />
                                    </div>

                                    {/* Cor do Texto */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                                <div style={{ fontSize: '16px', fontWeight: 700 }}>Aa</div>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500, margin: 0 }}>Cor do Texto</p>
                                                <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>Títulos, legendas, textos de apoio — afeta toda a tipografia</p>
                                            </div>
                                        </div>
                                        <input
                                            id="cfg-text-color"
                                            name="text-color"
                                            type="color"
                                            value={customTextColor || (theme === 'dark' ? '#dce8f8' : '#0c1c30')}
                                            onChange={handleText}
                                            onInput={handleText}
                                            style={{ width: '36px', height: '36px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Notificações */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: '0 0 4px' }}>Notificações</p>
                            <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>Alertas de sistema</p>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div
                                onClick={async () => {
                                    const newState = !notificationsEnabled;
                                    if (newState && Notification.permission !== 'granted') {
                                        const permission = await Notification.requestPermission();
                                        if (permission !== 'granted') return;
                                    }
                                    setNotificationsEnabled(newState);
                                    // Salva imediatamente no banco
                                    if (userId) {
                                        const { error } = await supabase
                                            .from('profiles')
                                            .update({ notifications_enabled: newState })
                                            .eq('id', userId);
                                        if (error) {
                                            console.error('Erro ao salvar preferência de notificação:', error);
                                            toast.error('Erro ao salvar preferência');
                                        } else {
                                            toast.success(newState ? 'Notificações ativadas!' : 'Notificações desativadas!');
                                            refetch();
                                        }
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    background: 'var(--bg-card-alt)',
                                    border: '1px solid var(--border)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: notificationsEnabled ? 'rgba(79, 70, 229, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: notificationsEnabled ? 'var(--primary)' : 'var(--text-dim)'
                                    }}>
                                        <Bell size={18} />
                                    </div>
                                    <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 500 }}>Análise finalizada</span>
                                </div>

                                <div style={{
                                    width: '36px',
                                    height: '20px',
                                    borderRadius: '10px',
                                    background: notificationsEnabled ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
                                    position: 'relative',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}>
                                    <div style={{
                                        width: '14px',
                                        height: '14px',
                                        borderRadius: '50%',
                                        background: '#fff',
                                        position: 'absolute',
                                        top: '3px',
                                        left: notificationsEnabled ? '19px' : '3px',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                    }} />
                                </div>
                            </div>

                            <p style={{ color: 'var(--text-dim)', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                                Seja notificado quando a Análise terminar. Mais útil para tarefas de longa duração.
                            </p>
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: notificationsEnabled ? '#10b981' : 'var(--text-dim)', animation: notificationsEnabled ? 'pulse 2s infinite' : 'none' }} />
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>
                                {notificationsEnabled ? 'Notificações Ativas' : 'Desativado'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ABA 3: API (Integrações) — Perfis removido */}

            {/* ABA 3: API (Integrações) */}
            {activeTab === 'api' && (
                <>
                    {/* Visão Owner: todos os admins */}
                    {profile.user_role === 'owner' && (
                        <OwnerAdminApiPanel
                            allUsers={allUsers}
                            labelStyle={labelStyle}
                            fieldWrapStyle={fieldWrapStyle}
                            iconFieldStyle={iconFieldStyle}
                            inputStyle={inputStyle}
                            isMobile={isMobile}
                        />
                    )}

                    {/* Visão Admin/Gestor: suas próprias configs */}
                    {profile.user_role !== 'owner' && (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                            <button 
                                onClick={() => setShowEvoConfig(!showEvoConfig)}
                                style={{ 
                                    width: '100%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    padding: '24px 28px', 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                            >
                                <div>
                                    <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: '0 0 4px' }}>Integração Evolution API (WhatsApp)</p>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>Configure as credenciais para ativar o chat com candidatos</p>
                                </div>
                                <div style={{ color: 'var(--text-dim)' }}>
                                    {showEvoConfig ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </button>

                            {showEvoConfig && (
                                <div style={{ padding: '0 28px 24px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1.5fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label htmlFor="cfg-evo-url" style={labelStyle}>Server URL</label>
                                            <div style={fieldWrapStyle}>
                                                <ShieldCheck style={iconFieldStyle} />
                                                <input id="cfg-evo-url" name="evo-url" autoComplete="url" className="field-input" style={inputStyle} placeholder="https://evolution.seuservidor.com" value={evoUrl} onChange={e => setEvoUrl(e.target.value)} />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="cfg-evo-key" style={labelStyle}>API Key</label>
                                            <div style={fieldWrapStyle}>
                                                <Lock style={iconFieldStyle} />
                                                <input id="cfg-evo-key" name="evo-key" type="password" autoComplete="off" className="field-input" style={inputStyle} placeholder="Sua Global API Key" value={evoKey} onChange={e => setEvoKey(e.target.value)} />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="cfg-evo-instance" style={labelStyle}>Nome da Instância</label>
                                            <div style={fieldWrapStyle}>
                                                <Zap style={iconFieldStyle} />
                                                <input id="cfg-evo-instance" name="evo-instance" autoComplete="off" className="field-input" style={inputStyle} placeholder="agente-rh" value={evoInstance} onChange={e => setEvoInstance(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                        <div className="cfg-save-row" style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                                        <button className="save-btn" onClick={handleSave} disabled={saving}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'background 0.15s' }}>
                                            {saving && <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />}
                                            {saving ? 'Salvando...' : 'Salvar configurações da API'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Card: Link do Banco de Talentos / Portal White Label */}
                    {profile.organization_id && (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginTop: '24px' }}>
                            <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                                <div style={{ flex: 1, minWidth: '280px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Briefcase size={18} />
                                        </div>
                                        <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: 0 }}>Seu Banco de Talentos (Link Público)</p>
                                    </div>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '0 0 16px' }}>Use este link para vincular ao seu site oficial ou compartilhar diretamente com candidatos nas redes sociais.</p>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ flex: 1, background: 'var(--bg-main)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <code style={{ color: 'var(--primary)', fontSize: '12px', fontFamily: 'monospace' }}>
                                                {`${window.location.origin}${window.location.pathname}#/carreiras/${profile.organization_id}`}
                                            </code>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const url = `${window.location.origin}${window.location.pathname}#/carreiras/${profile.organization_id}`;
                                                navigator.clipboard.writeText(url);
                                                showToast('success', 'Link copiado!');
                                            }}
                                            style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Copiar Link
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <button 
                                        onClick={() => navigate('/vagas?tab=design')}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px', background: 'var(--primary)', color: '#fff', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        <Palette size={18} /> Personalizar Site
                                    </button>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', margin: 0 }}>Altere cores, logo e capas</p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ABA 4: PLANO (Pagamento) */}
            {activeTab === 'plano' && (
                <>
                    {/* Visão Owner: todos os admins e seus planos */}
                    {profile.user_role === 'owner' && (
                        <OwnerAdminPlanPanel allUsers={allUsers} plans={plans} isMobile={isMobile} />
                    )}

                    {/* Visão Admin: seu próprio plano */}
                    {profile.user_role !== 'owner' && (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: 0 }}>Plano Atual</p>
                                <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '4px 0 0' }}>Gerencie sua assinatura e faça upgrade quando quiser</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
                                {plans.map(plan => {
                                    const PlanIcon = plan.icon;
                                    const isActive = currentPlan === plan.key;
                                    return (
                                        <div key={plan.key} className="plan-card" style={{ position: 'relative', background: isActive ? `${plan.color}10` : 'var(--bg-main)', border: `1px solid ${isActive ? plan.color : 'var(--border)'}`, borderRadius: '14px', padding: '20px' }}>
                                            {plan.popular && (<div style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: '#fff', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '20px' }}>Mais popular</div>)}
                                            {isActive && (<div style={{ position: 'absolute', top: '12px', right: '12px', background: `${plan.color}20`, color: plan.color, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', border: `1px solid ${plan.color}40` }}>Ativo</div>)}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${plan.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <PlanIcon style={{ width: 18, height: 18, color: plan.color }} />
                                                </div>
                                                <div>
                                                    <p style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '15px', margin: 0 }}>{plan.name}</p>
                                                    <p style={{ color: plan.color, fontWeight: 700, fontSize: '13px', margin: 0 }}>{plan.price}<span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '11px' }}>{plan.period}</span></p>
                                                </div>
                                            </div>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {plan.features.map(f => (<li key={f} style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-muted)', fontSize: '12px' }}><Check style={{ width: 13, height: 13, color: plan.color, flexShrink: 0 }} />{f}</li>))}
                                            </ul>
                                            {isActive ? (
                                                <div style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', border: `1px solid ${plan.color}30`, color: plan.color, fontSize: '13px', fontWeight: 600 }}>Plano atual</div>
                                            ) : (
                                                <button className="upgrade-btn" onClick={() => { showToast('error', 'Em breve! Sistema de pagamento em construção.'); logActivity(userId, 'Fez alterações na forma de pagamento', { plano: plan.name }); }} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: 'none', background: plan.color, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' }}>
                                                    {plan.key === 'enterprise' ? 'Falar com vendas' : 'Fazer upgrade'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

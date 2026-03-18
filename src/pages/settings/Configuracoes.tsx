import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../core/services/supabase';
import { User, Building2, Phone, Mail, Briefcase, Camera, CheckCircle, AlertCircle, Loader2, Zap, Star, Building, Check, Lock, ShieldCheck, Moon, Sun, MapPin, Bell } from 'lucide-react';
import { useUser } from '../../core/contexts/UserContext';
import { useTheme } from '../../core/contexts/ThemeContext';
import { logActivity } from '../../core/services/logger';

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
    const { theme, toggleTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [currentPlan] = useState<string>('trial');

    const userId = profile.userId;
    const email = profile.email;
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [company, setCompany] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarPreview, setAvatarPreview] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        if (!profile.loaded || dataLoaded) return;
        if (!userId) { setLoading(false); return; }
        const load = async () => {
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (profileData) {
                setName(profileData.name ?? '');
                setRole(profileData.role ?? '');
                setCompany(profileData.company ?? '');
                setPhone(profileData.phone ?? '');
                setAddress(profileData.address ?? '');
                setNotificationsEnabled(profileData.notifications_enabled ?? false);
                setAvatarUrl(profileData.avatar_url ?? '');
                if (profileData.avatar_url) setAvatarPreview(profileData.avatar_url);
            }
            setDataLoaded(true);
            setLoading(false);
        };
        load();
    }, [userId, profile.loaded, dataLoaded]);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;
        setUploadingPhoto(true);
        const ext = file.name.split('.').pop();
        const path = `${userId}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
        if (uploadError) { 
            showToast('error', 'Erro ao enviar foto.'); 
            setUploadingPhoto(false); 
            logActivity(userId, 'Fez alterações na foto', { filename: file.name }, uploadError.message);
            return; 
        }
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        const urlWithCache = `${publicUrl}?t=${Date.now()}`;
        setAvatarPreview(urlWithCache);
        setAvatarUrl(publicUrl);
        setUploadingPhoto(false);
        showToast('success', 'Foto atualizada!');
        logActivity(userId, 'Fez alterações na foto', { filename: file.name });
    };

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                name,
                role,
                company,
                phone,
                address,
                notifications_enabled: notificationsEnabled,
                avatar_url: avatarUrl,
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
                company,
                phone,
                address,
                notifications_enabled: notificationsEnabled,
                avatar_url: avatarUrl
            });
            setSaving(false);
            if (insertError) { 
                console.error('[Configuracoes] erro ao inserir perfil:', insertError); 
                showToast('error', `Erro: ${insertError.message}`); 
                logActivity(userId, 'Fez alterações no perfil', { name, role, company }, insertError.message);
            }
            else {
                showToast('success', 'Perfil salvo com sucesso!');
                logActivity(userId, 'Fez alterações no perfil', { name, role, company });
            }
        } else {
            setSaving(false);
            showToast('success', 'Perfil salvo com sucesso!');
            logActivity(userId, 'Fez alterações no perfil', { name, role, company });
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
            showToast('error', `Erro: ${error.message}`);
        } else {
            showToast('success', 'Senha alterada com sucesso!');
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

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <Loader2 style={{ width: 32, height: 32, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';

    return (
        <>
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
            `}</style>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '24px', right: '28px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px',
                    background: toast.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
                    border: `1px solid ${toast.type === 'success' ? 'var(--success)' : 'var(--text-error)'}`,
                    borderRadius: '10px', padding: '12px 18px',
                    color: toast.type === 'success' ? 'var(--success)' : 'var(--text-error)',
                    fontSize: '14px', fontWeight: 500, animation: 'slideIn 0.25s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                }}>
                    {toast.type === 'success' ? <CheckCircle style={{ width: 16, height: 16 }} /> : <AlertCircle style={{ width: 16, height: 16 }} />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ color: 'var(--text-main)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Configurações</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 6 }}>Gerencie seu perfil e tema</p>
                </div>
            </div>

            {/* ── Seção Perfil ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px', marginBottom: '24px' }}>

                {/* Card avatar */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', height: '100%' }}>
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
                        <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '18px', margin: 0 }}>{name || 'Sem nome'}</p>
                        <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '5px 0 0' }}>{role || 'Cargo não definido'}</p>
                    </div>


                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="save-btn"
                        style={{
                            marginTop: 'auto',
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'var(--primary)',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.2)'
                        }}
                    >
                        <Camera style={{ width: 14, height: 14 }} />
                        Trocar foto
                    </button>
                </div>

                {/* Card formulário */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px' }}>
                    <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: '0 0 20px' }}>Informações Pessoais</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        {/* Nome */}
                        <div>
                            <label style={labelStyle}>Nome completo</label>
                            <div style={fieldWrapStyle}>
                                <User style={iconFieldStyle} />
                                <input className="field-input" style={inputStyle} placeholder="Seu nome completo" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                        </div>

                        {/* Endereço */}
                        <div>
                            <label style={labelStyle}>Endereço</label>
                            <div style={fieldWrapStyle}>
                                <MapPin style={iconFieldStyle} />
                                <input className="field-input" style={inputStyle} placeholder="Cidade - UF ou Endereço completo" value={address} onChange={e => setAddress(e.target.value)} />
                            </div>
                        </div>

                        {/* Telefone */}
                        <div>
                            <label style={labelStyle}>Telefone</label>
                            <div style={fieldWrapStyle}>
                                <Phone style={iconFieldStyle} />
                                <input className="field-input" style={inputStyle} placeholder="(00) 00000-0000" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} />
                            </div>
                        </div>

                        {/* Cargo */}
                        <div>
                            <label style={labelStyle}>Cargo</label>
                            <div style={fieldWrapStyle}>
                                <Briefcase style={iconFieldStyle} />
                                <input className="field-input" style={inputStyle} placeholder="Ex: Analista de RH" value={role} onChange={e => setRole(e.target.value)} />
                            </div>
                        </div>

                        {/* Empresa */}
                        <div>
                            <label style={labelStyle}>Empresa</label>
                            <div style={fieldWrapStyle}>
                                <Building2 style={iconFieldStyle} />
                                <input className="field-input" style={inputStyle} placeholder="Nome da empresa" value={company} onChange={e => setCompany(e.target.value)} />
                            </div>
                        </div>

                        {/* Email readonly */}
                        <div>
                            <label style={labelStyle}>E-mail</label>
                            <div style={fieldWrapStyle}>
                                <Mail style={iconFieldStyle} />
                                <input style={{ ...inputStyle, color: 'var(--text-dim)', cursor: 'not-allowed' }} value={email} readOnly title="O e-mail não pode ser alterado aqui" />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
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
            </div>

            {/* ── Seções Segurança, Aparência e Notificações (Grid 1:1:1) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>

                {/* Segurança */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', display: 'flex', flexDirection: 'column' }}>
                    <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: '0 0 4px' }}>Segurança</p>
                    <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '0 0 20px' }}>Senha de acesso</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', flex: 1 }}>
                        <div>
                            <label style={labelStyle}>Nova Senha</label>
                            <div style={fieldWrapStyle}>
                                <Lock style={iconFieldStyle} />
                                <input
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
                            <label style={labelStyle}>Confirmar</label>
                            <div style={fieldWrapStyle}>
                                <ShieldCheck style={iconFieldStyle} />
                                <input
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
                            onClick={() => theme === 'dark' && toggleTheme()}
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

                    <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>Interface Ativa</span>
                    </div>
                </div>

                {/* Notificações */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: '0 0 4px' }}>Notificações</p>
                        <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>Alertas de sistema</p>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div
                            onClick={async () => {
                                let newState = !notificationsEnabled;
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
                                        showToast('error', 'Erro ao salvar preferência');
                                    } else {
                                        showToast('success', newState ? 'Notificações ativadas!' : 'Notificações desativadas!');
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

            {/* ── Seção Planos ── */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px' }}>
                <div style={{ marginBottom: '20px' }}>
                    <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: 0 }}>Plano Atual</p>
                    <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '4px 0 0' }}>Gerencie sua assinatura e faça upgrade quando quiser</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {plans.map(plan => {
                        const PlanIcon = plan.icon;
                        const isActive = currentPlan === plan.key;
                        return (
                            <div
                                key={plan.key}
                                className="plan-card"
                                style={{
                                    position: 'relative',
                                    background: isActive ? `${plan.color}10` : 'var(--bg-main)',
                                    border: `1px solid ${isActive ? plan.color : 'var(--border)'}`,
                                    borderRadius: '14px',
                                    padding: '20px',
                                }}
                            >
                                {plan.popular && (
                                    <div style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: '#fff', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '20px' }}>
                                        Mais popular
                                    </div>
                                )}
                                {isActive && (
                                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: `${plan.color}20`, color: plan.color, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', border: `1px solid ${plan.color}40` }}>
                                        Ativo
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${plan.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <PlanIcon style={{ width: 18, height: 18, color: plan.color }} />
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '15px', margin: 0 }}>{plan.name}</p>
                                        <p style={{ color: plan.color, fontWeight: 700, fontSize: '13px', margin: 0 }}>
                                            {plan.price}<span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '11px' }}>{plan.period}</span>
                                        </p>
                                    </div>
                                </div>

                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {plan.features.map(f => (
                                        <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                            <Check style={{ width: 13, height: 13, color: plan.color, flexShrink: 0 }} />
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                {isActive ? (
                                    <div style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', border: `1px solid ${plan.color}30`, color: plan.color, fontSize: '13px', fontWeight: 600 }}>
                                        Plano atual
                                    </div>
                                ) : (
                                    <button
                                        className="upgrade-btn"
                                        onClick={() => {
                                            showToast('error', 'Em breve! Sistema de pagamento em construção.');
                                            logActivity(userId, 'Fez alterações na forma de pagamento', { plano: plan.name });
                                        }}
                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: 'none', background: plan.color, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' }}
                                    >
                                        {plan.key === 'enterprise' ? 'Falar com vendas' : 'Fazer upgrade'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
};

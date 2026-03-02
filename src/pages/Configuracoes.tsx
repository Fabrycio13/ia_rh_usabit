import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Building2, Phone, Mail, Briefcase, Camera, CheckCircle, AlertCircle, Loader2, Zap, Star, Building, Check, Lock, ShieldCheck } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#131621',
    border: '1px solid #1F2332',
    borderRadius: '10px',
    padding: '11px 14px 11px 42px',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#64748b',
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
    color: '#4a5568',
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
        features: ['Até 5 análises', 'Banco de candidatos limitado', 'Suporte por e-mail'],
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
    const { profile } = useUser();
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
        if (uploadError) { showToast('error', 'Erro ao enviar foto.'); setUploadingPhoto(false); return; }
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        const urlWithCache = `${publicUrl}?t=${Date.now()}`;
        setAvatarPreview(urlWithCache);
        setAvatarUrl(publicUrl);
        setUploadingPhoto(false);
        showToast('success', 'Foto atualizada!');
    };

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ name, role, company, phone, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (updateError) {
            console.error('[Configuracoes] erro ao atualizar perfil:', updateError);
            const { error: insertError } = await supabase.from('profiles').insert({ id: userId, email, name, role, company, phone, avatar_url: avatarUrl });
            setSaving(false);
            if (insertError) { console.error('[Configuracoes] erro ao inserir perfil:', insertError); showToast('error', `Erro: ${insertError.message}`); }
            else showToast('success', 'Perfil salvo com sucesso!');
        } else {
            setSaving(false);
            showToast('success', 'Perfil salvo com sucesso!');
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
                <div style={{ position: 'fixed', top: '24px', right: '28px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', background: toast.type === 'success' ? '#0f2918' : '#2a0f0f', border: `1px solid ${toast.type === 'success' ? '#16a34a' : '#dc2626'}`, borderRadius: '10px', padding: '12px 18px', color: toast.type === 'success' ? '#4ade80' : '#f87171', fontSize: '14px', fontWeight: 500, animation: 'slideIn 0.25s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                    {toast.type === 'success' ? <CheckCircle style={{ width: 16, height: 16 }} /> : <AlertCircle style={{ width: 16, height: 16 }} />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Configurações</h1>
                <p style={{ color: '#4a5568', fontSize: '14px', margin: '4px 0 0' }}>Gerencie seu perfil e plano</p>
            </div>

            {/* ── Seção Perfil ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px', marginBottom: '24px' }}>

                {/* Card avatar */}
                <div style={{ background: '#0B0D12', border: '1px solid #1F2332', borderRadius: '16px', padding: '24px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                    <div className="avatar-wrapper" style={{ position: 'relative', width: '88px', height: '88px', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar" style={{ width: '88px', height: '88px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #1F2332' }} />
                        ) : (
                            <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: '#fff', border: '3px solid #1F2332' }}>{initials}</div>
                        )}
                        <div className="photo-overlay" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {uploadingPhoto ? <Loader2 style={{ width: 20, height: 20, color: '#fff', animation: 'spin 1s linear infinite' }} /> : <Camera style={{ width: 20, height: 20, color: '#fff' }} />}
                        </div>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />

                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '14px', margin: 0 }}>{name || 'Sem nome'}</p>
                        <p style={{ color: '#64748b', fontSize: '12px', margin: '3px 0 0' }}>{role || 'Cargo não definido'}</p>
                    </div>

                    <div style={{ width: '100%', height: '1px', background: '#1F2332' }} />

                    <div style={{ width: '100%' }}>
                        <p style={{ color: '#4a5568', fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 6px' }}>E-mail</p>
                        <p style={{ color: '#94a3b8', fontSize: '12px', wordBreak: 'break-all', margin: 0 }}>{email}</p>
                    </div>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #1F2332', background: 'transparent', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLButtonElement).style.color = '#6366f1'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1F2332'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
                    >
                        Trocar foto
                    </button>
                </div>

                {/* Card formulário */}
                <div style={{ background: '#0B0D12', border: '1px solid #1F2332', borderRadius: '16px', padding: '24px 28px' }}>
                    <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '15px', margin: '0 0 20px' }}>Informações Pessoais</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        {/* Nome — ocupa 2 colunas */}
                        <div style={{ gridColumn: '1 / 3' }}>
                            <label style={labelStyle}>Nome completo</label>
                            <div style={fieldWrapStyle}>
                                <User style={iconFieldStyle} />
                                <input className="field-input" style={inputStyle} placeholder="Seu nome completo" value={name} onChange={e => setName(e.target.value)} />
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

                        {/* Telefone */}
                        <div>
                            <label style={labelStyle}>Telefone</label>
                            <div style={fieldWrapStyle}>
                                <Phone style={iconFieldStyle} />
                                <input className="field-input" style={inputStyle} placeholder="(00) 00000-0000" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} />
                            </div>
                        </div>

                        {/* Email readonly — 1 coluna */}
                        <div>
                            <label style={labelStyle}>E-mail</label>
                            <div style={fieldWrapStyle}>
                                <Mail style={iconFieldStyle} />
                                <input style={{ ...inputStyle, color: '#4a5568', cursor: 'not-allowed' }} value={email} readOnly title="O e-mail não pode ser alterado aqui" />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            className="save-btn"
                            onClick={handleSave}
                            disabled={saving}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#6366f1', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'background 0.15s' }}
                        >
                            {saving && <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />}
                            {saving ? 'Salvando...' : 'Salvar alterações'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Seção Segurança ── */}
            <div style={{ background: '#0B0D12', border: '1px solid #1F2332', borderRadius: '16px', padding: '24px 28px', marginBottom: '24px' }}>
                <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '15px', margin: '0 0 4px' }}>Segurança</p>
                <p style={{ color: '#4a5568', fontSize: '13px', margin: '0 0 20px' }}>Atualize sua senha de acesso</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '800px' }}>
                    <div>
                        <label style={labelStyle}>Nova Senha</label>
                        <div style={fieldWrapStyle}>
                            <Lock style={iconFieldStyle} />
                            <input
                                className="field-input"
                                type="password"
                                style={inputStyle}
                                placeholder="Mínimo 6 caracteres"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>Confirmar Nova Senha</label>
                        <div style={fieldWrapStyle}>
                            <ShieldCheck style={iconFieldStyle} />
                            <input
                                className="field-input"
                                type="password"
                                style={inputStyle}
                                placeholder="Repita a nova senha"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                        className="save-btn"
                        onClick={handleChangePassword}
                        disabled={savingPassword}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#6366f1', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: savingPassword ? 'not-allowed' : 'pointer', opacity: savingPassword ? 0.7 : 1, transition: 'background 0.15s' }}
                    >
                        {savingPassword && <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />}
                        {savingPassword ? 'Atualizando...' : 'Alterar Senha'}
                    </button>
                </div>
            </div>

            {/* ── Seção Planos ── */}
            <div style={{ background: '#0B0D12', border: '1px solid #1F2332', borderRadius: '16px', padding: '24px 28px' }}>
                <div style={{ marginBottom: '20px' }}>
                    <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '15px', margin: 0 }}>Plano Atual</p>
                    <p style={{ color: '#4a5568', fontSize: '13px', margin: '4px 0 0' }}>Gerencie sua assinatura e faça upgrade quando quiser</p>
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
                                    background: isActive ? `${plan.color}10` : '#0E1015',
                                    border: `1px solid ${isActive ? plan.color : '#1F2332'}`,
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
                                        <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '15px', margin: 0 }}>{plan.name}</p>
                                        <p style={{ color: plan.color, fontWeight: 700, fontSize: '13px', margin: 0 }}>
                                            {plan.price}<span style={{ color: '#4a5568', fontWeight: 400, fontSize: '11px' }}>{plan.period}</span>
                                        </p>
                                    </div>
                                </div>

                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {plan.features.map(f => (
                                        <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#94a3b8', fontSize: '12px' }}>
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
                                        onClick={() => showToast('error', 'Em breve! Sistema de pagamento em construção.')}
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

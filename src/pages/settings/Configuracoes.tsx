import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../core/services/supabase';
import { User, Building2, Phone, Mail, Briefcase, Camera, CheckCircle, AlertCircle, Loader2, Zap, Star, Building, Check, Lock, ShieldCheck, Moon, Sun, MapPin, Bell, Settings, Users, Key, CreditCard, X, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useUser } from '../../core/contexts/UserContext';
import { useTheme } from '../../core/contexts/ThemeContext';
import { logActivity } from '../../core/services/logger';
import { OwnerAdminApiPanel, OwnerAdminPlanPanel } from './OwnerPanels';

type TabKey = 'perfil' | 'seguranca' | 'perfis' | 'api' | 'plano';

interface TabItem {
    key: TabKey;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}

const allTabs: TabItem[] = [
    { key: 'perfil', label: 'Perfil', icon: User },
    { key: 'seguranca', label: 'Segurança', icon: Lock },
    { key: 'perfis', label: 'Perfis', icon: Users },
    { key: 'api', label: 'API', icon: Key },
    { key: 'plano', label: 'Plano', icon: CreditCard },
];

// Abas visíveis para cada perfil
const getVisibleTabs = (userRole: string): TabItem[] => {
    const baseTabs = allTabs.filter(tab => ['perfil', 'seguranca', 'perfis'].includes(tab.key));
    // Owner e Gestor veem API e Plano
    if (userRole === 'owner' || userRole === 'gestor') {
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

const roleDefinitions = [
    {
        key: 'owner',
        label: 'Owner',
        icon: ShieldCheck,
        color: '#dc2626',
        description: 'Super-admin da plataforma. Vê e gerencia todas as organizações.',
        permissions: [
            'Criar e gerenciar gestores',
            'Acesso total a todas as funcionalidades',
            'Visão de todas as organizações',
            'Configurações globais do sistema',
            'Gerenciar planos e assinaturas',
            'Acesso a logs e auditoria completa'
        ]
    },
    {
        key: 'gestor',
        label: 'Gestor',
        icon: Briefcase,
        color: '#f59e0b',
        description: 'Admin da organização cliente. Acesso total dentro da sua org. Cria e gerencia RH e Convidados.',
        permissions: [
            'Acesso total à sua organização',
            'Criar e gerenciar RH e Convidados',
            'Gerenciar vagas, análises e candidatos',
            'Pipeline e chat com candidatos',
            'Configurar integrações da organização',
            'Acesso a logs de atividade'
        ]
    },
    {
        key: 'rh',
        label: 'RH',
        icon: Users,
        color: '#6366f1',
        description: 'Focado em recrutamento e seleção. Acesso operacional completo à organização.',
        permissions: [
            'Criar e editar vagas',
            'Analisar candidatos',
            'Gerenciar banco de candidatos',
            'Pipeline de candidatos',
            'Visualizar relatórios de análise'
        ]
    },
    {
        key: 'convidado',
        label: 'Convidado',
        icon: User,
        color: '#10b981',
        description: 'Acesso somente leitura às vagas da organização.',
        permissions: [
            'Visualizar vagas publicadas',
            'Acessar links públicos de vagas',
            'Visualizar dados básicos'
        ]
    },
];

export const Configuracoes = () => {
    const { profile, refetch } = useUser();
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<TabKey>('perfil');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [currentPlan] = useState<string>('trial');

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

    // Perfis state
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', user_role: 'rh', organization_name: '' });
    const [creatingUser, setCreatingUser] = useState(false);

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
    useEffect(() => {
        const isOwner = profile.user_role === 'owner';
        const isGestor = profile.user_role === 'gestor';
        const needsUsers = activeTab === 'perfis' || (isOwner && (activeTab === 'api' || activeTab === 'plano'));

        if (needsUsers && (isOwner || isGestor)) {
            loadUsers();
        }
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
                showToast('error', `Erro: ${insertError.message}`); 
                logActivity(userId, 'Fez alterações no perfil', { name, role, organization_name: orgName }, insertError.message);
            }
            else {
                showToast('success', 'Perfil salvo com sucesso!');
                logActivity(userId, 'Fez alterações no perfil', { name, role, organization_name: orgName });
            }
        } else {
            setSaving(false);
            showToast('success', 'Perfil salvo com sucesso!');
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

    // Carregar usuários (owner vê todos; gestor vê sua org)
    const loadUsers = async () => {
        const role = profile.user_role;
        if (role !== 'owner' && role !== 'gestor') return;
        setLoadingUsers(true);
        let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
        // Gestor só vê usuários da sua organização
        if (role === 'gestor' && profile.organization_id) {
            query = query.eq('organization_id', profile.organization_id);
        }
        const { data } = await query;
        if (data) setAllUsers(data);
        setLoadingUsers(false);
    };

    // Criar novo usuário (somente admin/gestor) - Hierarquia Multi Talent
    const handleCreateUser = async () => {
        if (!newUser.name || !newUser.email || !newUser.password) {
            showToast('error', 'Preencha todos os campos.');
            return;
        }
        if (newUser.password.length < 6) {
            showToast('error', 'A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        const canCreate = (creatorRole: string, targetRole: string): boolean => {
            if (creatorRole === 'owner') return targetRole === 'gestor';
            if (creatorRole === 'gestor') return ['rh', 'convidado'].includes(targetRole);
            return false;
        };

        if (!canCreate(profile.user_role, newUser.user_role)) {
            const allowed = profile.user_role === 'owner' ? 'Gestor' : 'RH ou Convidado';
            showToast('error', `Seu perfil só pode criar: ${allowed}`);
            return;
        }

        setCreatingUser(true);

        // Definir campos de organização com base na hierarquia ANTES do signUp para enviar via metadados
        const isCreatingGestor = newUser.user_role === 'gestor';
        const creatorIsOwner = profile.user_role === 'owner';

        let organizationId: string | null = null;
        let organizationName: string | null = null;

        if (creatorIsOwner && isCreatingGestor) {
            // Owner criando Gestor: Org começa zerada para o Gestor configurar no tutorial
            organizationId = null;
            organizationName = null;
        } else {
            // Gestor criando RH/Convidado: Herda a org do Gestor
            // Garantir que não enviamos string vazia para o banco (deve ser UUID válido ou NULL)
            organizationId = profile.organization_id || null;
            organizationName = profile.organization_name || null;
        }

        try {
            // CRIAR UM CLIENTE TEMPORÁRIO QUE NÃO PERSISTE SESSÃO
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            
            const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
                auth: { persistSession: false, autoRefreshToken: false }
            });

            // Enviar metadados completos para o Trigger handle_new_user()
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: newUser.email,
                password: newUser.password,
                options: { 
                    data: { 
                        full_name: newUser.name,
                        user_role: newUser.user_role,
                        organization_id: organizationId,
                        organization_name: organizationName
                    } 
                },
            });

            if (authError) {
                showToast('error', `Erro ao criar usuário: ${authError.message}`);
                setCreatingUser(false);
                return;
            }

            if (authData.user) {

                // USAR UPSERT: Evita erro se o Trigger do banco for mais rápido que o frontend
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: authData.user.id,
                        email: newUser.email,
                        name: newUser.name,
                        user_role: newUser.user_role as any,
                        status: 'active',
                        account_type: 'active',
                        organization_id: organizationId,
                        organization_name: organizationName,
                        onboarding_completed: false,
                    }, { onConflict: 'id' });

                if (profileError) {
                    showToast('error', `Conta criada mas erro ao salvar perfil: ${profileError.message}`);
                    return;
                }

                // Enviar email de convite via Edge Function
                try {
                    await supabase.functions.invoke('send-invite-email', {
                        body: {
                            userId: authData.user.id,
                            email: newUser.email,
                            name: newUser.name,
                            role: newUser.user_role,
                            createdBy: profile.userName || 'Administrador',
                        },
                    });
                    showToast('success', `Usuário ${newUser.name} criado! Email de convite enviado.`);
                } catch (e) {
                    console.warn('[Configuracoes] Erro ao enviar email (ignorado):', e);
                    showToast('success', `Usuário ${newUser.name} criado!`);
                }

                logActivity(profile.userId, 'Criou novo usuário', { nome: newUser.name, perfil: newUser.user_role });
                setNewUser({ name: '', email: '', password: '', user_role: profile.user_role === 'owner' ? 'gestor' : 'rh', organization_name: '' });
                setShowCreateModal(false);
                loadUsers();
            }
        } catch (err: any) {
            console.error('[Configuracoes] Erro fatal:', err);
            showToast('error', `Ocorreu um erro inesperado: ${err.message}`);
        } finally {
            setCreatingUser(false);
        }
    };

    // Atualizar perfil de usuário
    const handleUpdateUserRole = async (userId: string, newRole: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ user_role: newRole })
            .eq('id', userId);

        if (error) {
            showToast('error', `Erro ao atualizar perfil: ${error.message}`);
        } else {
            showToast('success', 'Perfil atualizado com sucesso!');
            logActivity(userId, 'Atualizou perfil de usuário', { usuarioId: userId, novoPerfil: newRole });
            
            // Se o usuário alterado for o próprio usuário logado, recarrega o perfil
            if (userId === profile.userId) {
                await refetch();
                showToast('success', `Seu perfil foi alterado para: ${roleDefinitions.find(r => r.key === newRole)?.label || newRole}`);
            }
            
            loadUsers();
        }
    };

    // Toggle status do usuário
    const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', userId);

        if (error) {
            showToast('error', `Erro ao atualizar status: ${error.message}`);
        } else {
            showToast('success', `Usuário ${newStatus === 'active' ? 'ativado' : 'desativado'}!`);
            loadUsers();
        }
    };

    // Toggle status da ORGANIZAÇÃO (afeta todos os membros)
    const handleToggleOrgStatus = async (orgId: string, currentStatus: string) => {
        if (orgId === 'sem-org') {
            showToast('error', 'Não é possível desativar usuários sem organização definida.');
            return;
        }
        
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('organization_id', orgId);

        if (error) {
            showToast('error', `Erro ao atualizar organização: ${error.message}`);
        } else {
            showToast('success', `Organização ${newStatus === 'active' ? 'ativada' : 'desativada'} com sucesso!`);
            loadUsers();
        }
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <Settings size={32} style={{ color: 'var(--primary)' }} />
                        <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            Configurações
                        </h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                        Gerencie seu perfil e tema
                    </p>
                </div>
            </div>

            {/* ── Abas ── */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
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
                                gap: '8px',
                                padding: '12px 20px',
                                borderRadius: '10px 10px 0 0',
                                border: 'none',
                                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                                background: isActive ? 'var(--bg-card)' : 'transparent',
                                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                fontSize: '14px',
                                fontWeight: isActive ? 600 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '-1px',
                                position: 'relative',
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
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Conteúdo das Abas ── */}
            
            {/* ABA 1: PERFIL */}
            {activeTab === 'perfil' && (
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
                            <p style={{ 
                                color: (roleDefinitions.find(r => r.key === profile.user_role)?.color || 'var(--text-dim)'), 
                                fontSize: '12px', 
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                margin: '5px 0 0',
                                letterSpacing: '0.5px'
                            }}>
                                {roleDefinitions.find(r => r.key === profile.user_role)?.label || profile.user_role}
                            </p>
                            <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '2px 0 0' }}>{role}</p>
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

                            {/* Organização */}
                            <div>
                                <label style={labelStyle}>Organização</label>
                                <div style={fieldWrapStyle}>
                                    <Building2 style={iconFieldStyle} />
                                    <input className="field-input" style={inputStyle} placeholder="Nome da organização" value={orgName} onChange={e => setOrgName(e.target.value)} />
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
            )}

            {/* ABA 2: SEGURANÇA (Senha, Aparência e Notificações) */}
            {activeTab === 'seguranca' && (
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
            )}

            {/* ABA 3: PERFIS */}
            {activeTab === 'perfis' && (
                <>
                    {/* Card do perfil atual do usuário */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', marginBottom: '24px' }}>
                        <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '15px', margin: '0 0 20px' }}>Seu Perfil Atual</p>
                        
                        {(() => {
                            const currentUserRole = roleDefinitions.find(r => r.key === profile.user_role) || roleDefinitions[1];
                            const RoleIcon = currentUserRole.icon;
                            return (
                                <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                    {/* Info do perfil */}
                                    <div style={{ flex: 1, minWidth: '280px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${currentUserRole.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <RoleIcon style={{ width: 24, height: 24, color: currentUserRole.color }} />
                                            </div>
                                            <div>
                                                <p style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '18px', margin: 0 }}>{currentUserRole.label}</p>
                                                <p style={{ color: currentUserRole.color, fontSize: '12px', fontWeight: 600, margin: 0 }}>Perfil ativo</p>
                                            </div>
                                        </div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', margin: '0 0 16px' }}>
                                            {currentUserRole.description}
                                        </p>
                                    </div>

                                    {/* Permissões */}
                                    <div style={{ flex: 1, minWidth: '280px' }}>
                                        <p style={{ color: 'var(--text-dim)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>
                                            Suas Atribuições
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {currentUserRole.permissions.map(permission => (
                                                <div key={permission} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Check style={{ width: 14, height: 14, color: currentUserRole.color, flexShrink: 0 }} />
                                                    <span style={{ color: 'var(--text-main)', fontSize: '13px' }}>{permission}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Seção de gestão (Owner, Admin e Gestor) */}
                    {(profile.user_role === 'owner' || profile.user_role === 'gestor') && (
                        <>
                            {/* Header de gestão */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div>
                                    <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '18px', margin: 0 }}>
                                        {profile.user_role === 'owner' ? 'Gestão de Organizações' : 'Minha Equipe'}
                                    </p>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '4px 0 0' }}>
                                        {profile.user_role === 'owner' ? 'Gerencie as empresas e seus respectivos gestores' : 'Gerenciar RH e Convidados'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
+                                       setCreatingUser(false); // Garante que o botão não comece em "Criando"
                                        setNewUser({
                                            name: '',
                                            email: '',
                                            password: '',
                                            user_role: profile.user_role === 'owner' ? 'gestor' : 'rh',
                                            organization_name: ''
                                        });
                                        setShowCreateModal(true);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 20px',
                                        background: 'var(--primary)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Plus size={18} />
                                    {profile.user_role === 'owner' ? 'Nova Organização' : 'Novo Membro'}
                                </button>
                            </div>

                            {/* Tabela de usuários/organizações */}
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--bg-main)' }}>
                                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600 }}>
                                                {profile.user_role === 'owner' ? 'Organização / Empresa' : 'Usuário'}
                                            </th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600 }}>
                                                {profile.user_role === 'owner' ? 'Gestor Principal' : 'Cargo'}
                                            </th>
                                            {profile.user_role === 'owner' && (
                                                <th style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600 }}>
                                                    Membros
                                                </th>
                                            )}
                                            <th style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600 }}>Status</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600 }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            // Se for Owner, mostramos Organizações agrupadas
                                            if (profile.user_role === 'owner') {
                                                const orgsMap = new Map();
                                                
                                                allUsers.forEach(u => {
                                                    // Ignorar o próprio Owner da lista de organizações cliente
                                                    if (u.user_role === 'owner') return;

                                                    const orgId = u.organization_id || 'sem-org';
                                                    if (!orgsMap.has(orgId)) {
                                                        orgsMap.set(orgId, {
                                                            id: orgId,
                                                            name: u.organization_name || 'Empresa s/ Nome',
                                                            gestor: null,
                                                            members: [],
                                                            status: u.status
                                                        });
                                                    }
                                                    
                                                    const org = orgsMap.get(orgId);
                                                    org.members.push(u);
                                                    // Define o gestor como o contato principal
                                                    if (u.user_role === 'gestor') {
                                                        org.gestor = u;
                                                        org.name = u.organization_name || org.name;
                                                    }
                                                });

                                                const displayOrgs = Array.from(orgsMap.values());

                                                return displayOrgs.map(org => {
                                                    const gestor = org.gestor || org.members[0];
                                                    const gestorRole = roleDefinitions.find(r => r.key === 'gestor')!;

                                                    return (
                                                        <tr key={org.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                            <td style={{ padding: '14px 16px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    <div style={{
                                                                        width: '36px',
                                                                        height: '36px',
                                                                        borderRadius: '8px',
                                                                        background: 'var(--primary-bg)',
                                                                        color: 'var(--primary)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontSize: '12px',
                                                                        fontWeight: 700
                                                                    }}>
                                                                        <Building2 size={18} />
                                                                    </div>
                                                                    <div>
                                                                        <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '14px', margin: 0 }}>
                                                                            {org.name}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '14px 16px' }}>
                                                                <div>
                                                                    <p style={{ color: 'var(--text-main)', fontSize: '13px', margin: 0, fontWeight: 500 }}>{gestor?.name || 'Incompleto'}</p>
                                                                    <p style={{ color: 'var(--text-dim)', fontSize: '11px', margin: 0 }}>{gestor?.email}</p>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                                <span style={{ padding: '4px 10px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600 }}>
                                                                    {org.members.length}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: org.status === 'active' ? 'var(--success)' : 'var(--text-dim)' }} />
                                                                    <span style={{ fontSize: '12px', color: 'var(--text-main)', textTransform: 'capitalize' }}>{org.status === 'active' ? 'Ativa' : 'Inativa'}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '14px 16px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                    <button 
                                                                        onClick={() => handleToggleOrgStatus(org.id, org.status)}
                                                                        style={{ 
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '6px',
                                                                            padding: '8px 16px', 
                                                                            borderRadius: '8px', 
                                                                            border: '1px solid var(--border)', 
                                                                            background: org.status === 'active' ? 'transparent' : 'var(--success-bg)', 
                                                                            color: org.status === 'active' ? '#f43f5e' : 'var(--success)', 
                                                                            cursor: 'pointer',
                                                                            fontSize: '11px',
                                                                            fontWeight: 600,
                                                                            transition: 'all 0.2s'
                                                                        }} 
                                                                        title={org.status === 'active' ? "Bloquear Acesso da Empresa" : "Liberar Acesso da Empresa"}
                                                                    >
                                                                        <AlertCircle size={14} />
                                                                        {org.status === 'active' ? 'SUSPENDER' : 'REATIVAR'}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            }

                                            // Comportamento normal para Gestores (ver equipe)
                                            const displayUsers = allUsers.filter(u => u.user_role !== 'owner' && u.user_role !== 'gestor');

                                            return displayUsers.map(user => {
                                                const userRole = roleDefinitions.find(r => r.key === user.user_role) || roleDefinitions[1];
                                                const memberCount = 0;

                                                return (
                                                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ padding: '14px 16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{
                                                                    width: '36px',
                                                                    height: '36px',
                                                                    borderRadius: '8px',
                                                                    background: `${userRole.color}20`,
                                                                    color: userRole.color,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '12px',
                                                                    fontWeight: 700
                                                                }}>
                                                                    {(user.organization_name || user.name || user.email)[0].toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '14px', margin: 0 }}>
                                                                        {profile.user_role === 'owner' ? (user.organization_name || 'Empresa s/ Nome') : user.name}
                                                                    </p>
                                                                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '2px 0 0' }}>
                                                                        {profile.user_role === 'owner' ? (user.organization_id?.slice(0, 8) || 'ID Pendente') : user.email}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '14px 16px' }}>
                                                            {profile.user_role === 'owner' ? (
                                                                <div>
                                                                    <p style={{ color: 'var(--text-main)', fontSize: '13px', margin: 0 }}>{user.name}</p>
                                                                    <p style={{ color: 'var(--text-dim)', fontSize: '11px', margin: 0 }}>{user.email}</p>
                                                                </div>
                                                            ) : (
                                                                <span style={{
                                                                    padding: '4px 10px',
                                                                    borderRadius: '20px',
                                                                    background: `${userRole.color}15`,
                                                                    color: userRole.color,
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                    border: `1px solid ${userRole.color}30`
                                                                }}>
                                                                    {userRole.label}
                                                                </span>
                                                            )}
                                                        </td>
                                                        {profile.user_role === 'owner' && (
                                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                                <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 600 }}>{memberCount}</span>
                                                                <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}> membros</span>
                                                            </td>
                                                        )}
                                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: user.status === 'active' ? '#10b981' : '#ef4444' }} />
                                                                <span style={{ fontSize: '12px', color: user.status === 'active' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                                    {user.status === 'active' ? 'Ativo' : 'Inativo'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                            <button
                                                                onClick={() => handleUpdateUserRole(user.id, user.status === 'active' ? 'inactive' : 'active')}
                                                                style={{
                                                                    padding: '6px 14px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid var(--border)',
                                                                    background: 'var(--bg-main)',
                                                                    color: user.status === 'active' ? '#ef4444' : '#10b981',
                                                                    fontSize: '12px',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                {user.status === 'active' ? 'Desativar' : 'Ativar'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Mensagem para roles sem acesso ao painel */}
                    {profile.user_role !== 'owner' && profile.user_role !== 'gestor' && (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 28px', textAlign: 'center' }}>
                            <Lock size={48} style={{ color: 'var(--text-dim)', marginBottom: '16px' }} />
                            <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '18px', margin: '0 0 8px' }}>Acesso Restrito</p>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0 }}>
                                Apenas o Gestor da organização pode gerenciar usuários e perfis.
                            </p>
                        </div>
                    )}
                </>
            )}

            {showCreateModal && (profile.user_role === 'owner' || profile.user_role === 'gestor') && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }} onClick={() => setShowCreateModal(false)}>
                    <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '28px',
                        width: '100%',
                        maxWidth: '480px',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '18px', margin: 0 }}>Criar Novo Usuário</p>
                                <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '4px 0 0' }}>
                                    {profile.user_role === 'owner' ? 'Criar novo Gestor'
                                    : 'Criar RH ou Convidado'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>


                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Nome */}
                            <div>
                                <label style={labelStyle}>Nome completo</label>
                                <div style={fieldWrapStyle}>
                                    <User style={iconFieldStyle} />
                                    <input
                                        className="field-input"
                                        style={inputStyle}
                                        placeholder="Nome do usuário"
                                        value={newUser.name}
                                        onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label style={labelStyle}>E-mail</label>
                                <div style={fieldWrapStyle}>
                                    <Mail style={iconFieldStyle} />
                                    <input
                                        className="field-input"
                                        style={inputStyle}
                                        placeholder="email@empresa.com"
                                        value={newUser.email}
                                        onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Senha */}
                            <div>
                                <label style={labelStyle}>Senha temporária</label>
                                <div style={fieldWrapStyle}>
                                    <Lock style={iconFieldStyle} />
                                    <input
                                        className="field-input"
                                        type="password"
                                        style={inputStyle}
                                        placeholder="Senha inicial (min. 6 caracteres)"
                                        value={newUser.password}
                                        onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Perfil - filtrado por hierarquia */}
                            <div>
                                <label style={labelStyle}>Perfil de Acesso</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {roleDefinitions
                                        .filter(role => {
                                            // Owner só pode criar Gestor
                                            if (profile.user_role === 'owner') return role.key === 'gestor';
                                            // Gestor só pode criar RH e Convidado
                                            if (profile.user_role === 'gestor') return ['rh', 'convidado'].includes(role.key);
                                            return false;
                                        })
                                        .map(role => {
                                            const RoleIcon = role.icon;
                                            const isSelected = newUser.user_role === role.key;
                                            return (
                                                <button
                                                    key={role.key}
                                                    onClick={() => setNewUser(prev => ({ ...prev, user_role: role.key }))}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        padding: '12px',
                                                        borderRadius: '10px',
                                                        border: `2px solid ${isSelected ? role.color : 'var(--border)'}`,
                                                        background: isSelected ? `${role.color}10` : 'var(--bg-input)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${role.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <RoleIcon style={{ width: 16, height: 16, color: role.color }} />
                                                    </div>
                                                    <div style={{ textAlign: 'left' }}>
                                                        <p style={{ color: isSelected ? role.color : 'var(--text-main)', fontWeight: 600, fontSize: '13px', margin: 0 }}>{role.label}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Botão criar */}
                            <button
                                onClick={handleCreateUser}
                                disabled={creatingUser}
                                style={{
                                    marginTop: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: creatingUser ? 'var(--text-dim)' : 'var(--primary)',
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: creatingUser ? 'not-allowed' : 'pointer',
                                    transition: 'background 0.2s'
                                }}
                            >
                                {creatingUser && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
                                {creatingUser ? 'Criando...' : 'Criar Usuário'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ABA 4: API (Integrações) */}
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
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={labelStyle}>Server URL</label>
                                            <div style={fieldWrapStyle}>
                                                <ShieldCheck style={iconFieldStyle} />
                                                <input className="field-input" style={inputStyle} placeholder="https://evolution.seuservidor.com" value={evoUrl} onChange={e => setEvoUrl(e.target.value)} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>API Key</label>
                                            <div style={fieldWrapStyle}>
                                                <Lock style={iconFieldStyle} />
                                                <input className="field-input" type="password" style={inputStyle} placeholder="Sua Global API Key" value={evoKey} onChange={e => setEvoKey(e.target.value)} />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Nome da Instância</label>
                                            <div style={fieldWrapStyle}>
                                                <Zap style={iconFieldStyle} />
                                                <input className="field-input" style={inputStyle} placeholder="agente-rh" value={evoInstance} onChange={e => setEvoInstance(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
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
                </>
            )}

            {/* ABA 5: PLANO (Pagamento) */}
            {activeTab === 'plano' && (
                <>
                    {/* Visão Owner: todos os admins e seus planos */}
                    {profile.user_role === 'owner' && (
                        <OwnerAdminPlanPanel allUsers={allUsers} plans={plans} />
                    )}

                    {/* Visão Admin: seu próprio plano */}
                    {profile.user_role !== 'owner' && (
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
        </>
    );
};

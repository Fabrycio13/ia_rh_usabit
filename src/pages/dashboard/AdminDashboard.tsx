import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { Users, UserX, UserCheck, Search, Loader2, BarChart2, X, ShieldCheck, Database, ChevronDown, Mail, Plus, Briefcase, Building2, User as UserIcon } from 'lucide-react';
import DatePicker from '../../common/components/ui/DatePicker';
import toast from 'react-hot-toast';
import { logActivity } from '../../core/services/logger';
import { roleDefinitions } from '../../common/constants/roleDefinitions';
import { 
    ResponsiveContainer, Tooltip as RechartsTooltip,
    AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
.cal-day { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:12px; cursor:pointer; transition:background 0.15s, color 0.15s; color:var(--text-muted); position:relative; }
.cal-day:hover { background:rgba(99,102,241,0.12); color:var(--text-main); }
.cal-day.cal-active { background:var(--primary) !important; color:#fff !important; font-weight:700; }
.cal-day.cal-today { font-weight:700; color:var(--primary); }
.cal-day.cal-has-job::after { content:''; position:absolute; bottom:3px; left:50%; transform:translateX(-50%); width:4px; height:4px; border-radius:50%; background:#22c55e; }
.cal-nav { background:none; border:none; cursor:pointer; color:var(--text-dim); padding:4px 8px; border-radius:8px; transition:background 0.15s; font-size:18px; line-height:1; }
.cal-nav:hover { background:var(--bg-main); color:var(--text-main); }
.cal-range { background:rgba(99,102,241,0.15) !important; color:var(--text-main) !important; border-radius:0 !important; }
.cal-range-start { border-radius:8px 0 0 8px !important; }
.cal-range-end { border-radius:0 8px 8px 0 !important; }

/* Custom Select CSS */
.cs-container { position: relative; width: 100%; display: flex; align-items: center; gap: 12px; }
.cs-trigger { 
    display: flex; align-items: center; justify-content: space-between;
    background: var(--bg-input); border: 1px solid var(--border);
    border-radius: 10px; padding: 10px 16px; color: var(--text-main);
    font-size: 14px; cursor: pointer; transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    white-space: nowrap; flex: 1; height: 44px;
}
.cs-trigger:hover { border-color: var(--primary); }
.cs-dropdown {
    position: absolute; top: calc(100% + 8px); left: 0; min-width: 100%;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 12px; padding: 8px; z-index: 1000;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    backdrop-filter: blur(16px); animation: csSlideUp 0.2s ease-out;
}
.cs-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 8px; color: var(--text-dim);
    font-size: 13px; cursor: pointer; transition: all 0.15s;
}
.cs-item:hover { background: var(--row-hover); color: var(--text-main); }
.cs-item.active { background: rgba(59, 130, 246, 0.15); color: #3b82f6; font-weight: 600; }
.cs-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
@keyframes csSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
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

const initials = (name: string) =>
    name?.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';

interface UserProfile {
    id: string;
    email: string;
    name: string;
    user_role: string;
    status: string;
    organization_id?: string;
    organization_name?: string;
    created_at: string;
}

interface ChartData {
    name: string;
    value: number;
}

export const AdminDashboard = () => {
    const { profile } = useUser();
    const userRole = profile.user_role;
    const userOrgId = profile.organization_id;

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [analysisData, setAnalysisData] = useState<ChartData[]>([]);
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [jobDateSet, setJobDateSet] = useState<Set<string>>(new Set());
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [organizations, setOrganizations] = useState<{id: string, name: string}[]>([]);
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const check = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
        check(mq);
        mq.addEventListener('change', check);
        return () => mq.removeEventListener('change', check);
    }, []);

    // Perfis state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', user_role: 'rh' });
    const [creatingUser, setCreatingUser] = useState(false);
    const [vagaModalUserId, setVagaModalUserId] = useState<string | null>(null);
    const [vagasList, setVagasList] = useState<Array<{ id: string; title: string; job_code?: string | null }>>([]);
    const [userVagaIds, setUserVagaIds] = useState<Set<string>>(new Set());
    const [vagaLoading, setVagaLoading] = useState(false);

    // Calendar state
    const today = new Date();
    const [calYear, setCalYear] = useState(today.getFullYear());
    const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-based
    const [rangeStart, setRangeStart] = useState<string | null>(null); // 'YYYY-MM-DD'
    const [rangeEnd, setRangeEnd] = useState<string | null>(null);   // 'YYYY-MM-DD'

    const activeStart = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeStart : rangeEnd) : rangeStart;
    const activeEnd = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeEnd : rangeStart) : rangeStart;

    // Dropdown states
    const [isOrgOpen, setIsOrgOpen] = useState(false);
    const [isRoleOpen, setIsRoleOpen] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    
    const orgRef = useRef<HTMLDivElement>(null);
    const roleRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (orgRef.current && !orgRef.current.contains(event.target as Node)) setIsOrgOpen(false);
            if (roleRef.current && !roleRef.current.contains(event.target as Node)) setIsRoleOpen(false);
            if (statusRef.current && !statusRef.current.contains(event.target as Node)) setIsStatusOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchDashboardData = async () => {
        const isInitial = users.length === 0;
        if (isInitial) setLoading(true);
        
        let userQuery = supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        // ISOLAMENTO: Apenas Owner vê tudo. Outros perfis (Gestor) veem apenas sua org.
        if (userRole !== 'owner' && userOrgId) {
            userQuery = userQuery.eq('organization_id', userOrgId);
        }

        const { data: userData } = await userQuery;
        
        if (userData) {
            setUsers(userData as UserProfile[]);
            
            // Extrair organizações únicas para o filtro (Apenas usuários ativos)
            const orgs = userData
                .filter(u => u.organization_id && u.status === 'active')
                .reduce((acc: {id: string, name: string}[], u) => {
                    if (!acc.find(o => o.id === u.organization_id)) {
                        acc.push({ 
                            id: u.organization_id, 
                            name: u.organization_name || 'Nova Organização'
                        });
                    }
                    return acc;
                }, [])
                .sort((a, b) => a.name.localeCompare(b.name));
            setOrganizations(orgs);
        }

        // Fetch Analyses (Jobs) for the selected range or last 7 days
        const end = activeEnd ? new Date(activeEnd) : new Date();
        const start = activeStart ? new Date(activeStart) : new Date();
        if (!activeStart) start.setDate(end.getDate() - 7);
        
        let jobQuery = supabase
            .from('jobs')
            .select('created_at')
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString());

        if (selectedOrgId) {
            jobQuery = jobQuery.eq('organization_id', selectedOrgId);
        } else if (userRole !== 'owner' && userOrgId) {
            // Se não for owner, força o filtro da sua própria org mesmo que não tenha selecionado nada específico
            jobQuery = jobQuery.eq('organization_id', userOrgId);
        }

        const { data: jobData } = await jobQuery;

        if (jobData) {
            setJobDateSet(new Set(jobData.map(j => j.created_at.slice(0, 10))));
            const counts: Record<string, number> = {};
            const chartData = [];
            const current = new Date(start);
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                const label = current.toLocaleDateString('pt-BR', { weekday: 'short' });
                counts[dateStr] = 0;
                
                jobData.forEach(job => {
                    if (job.created_at.startsWith(dateStr)) {
                        counts[dateStr]++;
                    }
                });

                chartData.push({
                    name: label,
                    fullName: current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    value: counts[dateStr]
                });
                current.setDate(current.getDate() + 1);
            }
            setAnalysisData(chartData);
        }

        if (isInitial) setLoading(false);
    };
    const fetchDashboardDataRef = useRef<() => Promise<void> | null>(null);

     
     useEffect(() => {
        fetchDashboardDataRef.current = fetchDashboardData;  
        fetchDashboardDataRef.current?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeStart, activeEnd, selectedOrgId]);

    // Calendar helpers
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const todayStr = today.toISOString().slice(0, 10);

    const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
    const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmtDate = (d: string | null) => {
        if (!d) return '';
        return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
    };
    const clearRange = () => { setRangeStart(null); setRangeEnd(null); };
    const handleDayClick = (day: number) => {
        const ds = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
        if (!rangeStart || (rangeStart && rangeEnd)) {
            setRangeStart(ds);
            setRangeEnd(null);
        } else {
            if (ds === rangeStart) { clearRange(); }
            else { setRangeEnd(ds); }
        }
    };

    const toggleStatus = async (userId: string, currentStatus: string) => {
        setUpdatingId(userId);
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', userId);
        
        if (!error) {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        }
        setUpdatingId(null);
    };

    const loadVagas = async () => {
        const { data } = await supabase.from('vagas_white_label').select('id, title, job_code').eq('status', 'aberta').order('job_code', { ascending: true, nullsFirst: false });
        if (data) setVagasList(data);
    };

    const loadUserVagaAccess = async (convidadoUserId: string) => {
        setVagaLoading(true);
        const { data } = await supabase.from('convidado_vaga_access').select('vaga_id').eq('convidado_user_id', convidadoUserId);
        setUserVagaIds(new Set((data || []).map(d => d.vaga_id)));
        setVagaLoading(false);
    };

    const handleToggleVagaAccess = async (convidadoUserId: string, vagaId: string, hasAccess: boolean) => {
        if (hasAccess) {
            const { error } = await supabase.from('convidado_vaga_access').delete().eq('convidado_user_id', convidadoUserId).eq('vaga_id', vagaId);
            if (error) { toast.error('Erro ao remover acesso'); return; }
            setUserVagaIds(prev => { const next = new Set(prev); next.delete(vagaId); return next; });
        } else {
            const { error } = await supabase.from('convidado_vaga_access').insert({ convidado_user_id: convidadoUserId, vaga_id: vagaId, created_by: profile.userId });
            if (error) { toast.error('Erro ao adicionar acesso'); return; }
            setUserVagaIds(prev => { const next = new Set(prev); next.add(vagaId); return next; });
        }
    };

    const handleCreateUser = async () => {
        if (!newUser.name || !newUser.email) {
            toast.error('Preencha todos os campos.');
            return;
        }

        const canCreate = (creatorRole: string, targetRole: string): boolean => {
            if (creatorRole === 'owner') return targetRole === 'gestor';
            if (creatorRole === 'gestor') return ['rh', 'convidado'].includes(targetRole);
            return false;
        };

        if (!canCreate(userRole, newUser.user_role)) {
            const allowed = userRole === 'owner' ? 'Gestor' : 'RH ou Convidado';
            toast.error(`Seu perfil só pode criar: ${allowed}`);
            return;
        }

        setCreatingUser(true);

        const isCreatingGestor = newUser.user_role === 'gestor';
        const creatorIsOwner = userRole === 'owner';

        let organizationId: string | null = null;
        let organizationName: string | null = null;

        if (creatorIsOwner && isCreatingGestor) {
            organizationId = null;
            organizationName = null;
        } else {
            organizationId = profile.organization_id || null;
            organizationName = profile.organization_name || null;
        }

        try {
            const { data: fnData, error: fnError } = await supabase.functions.invoke('create-user-and-invite', {
                body: {
                    email: newUser.email,
                    name: newUser.name,
                    user_role: newUser.user_role,
                    organization_id: organizationId,
                    organization_name: organizationName,
                }
            });
            if (fnError) {
                const detail = fnError.message || JSON.stringify(fnError);
                toast.error(`Erro ao criar convite: ${detail.substring(0, 300)}`);
                setCreatingUser(false);
                return;
            }
            const userId = fnData?.userId;
            if (!userId) {
                toast.error(`Erro: userId não retornado. Resposta: ${JSON.stringify(fnData).substring(0, 2000)}`);
                setCreatingUser(false);
                return;
            }
            toast.success(`Convite enviado para ${newUser.name}!`);
            logActivity(profile.userId, 'Criou novo usuário', { tipo: newUser.user_role, email: newUser.email });
            setShowCreateModal(false);
            setNewUser({ name: '', email: '', user_role: 'rh' });
        } catch (err) {
            toast.error(`Ocorreu um erro inesperado: ${(err as Error).message}`);
        }
        setCreatingUser(false);
    };

    const handleToggleOrgStatus = async (orgId: string, currentStatus: string) => {
        if (!orgId) {
            toast.error('Não é possível desativar usuários sem organização definida.');
            return;
        }
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('organization_id', orgId);
        if (error) {
            toast.error(`Erro ao atualizar organização: ${error.message}`);
            return;
        }
        setUsers(prev => prev.map(u => u.organization_id === orgId ? { ...u, status: newStatus } : u));
        toast.success(`Organização ${newStatus === 'active' ? 'ativada' : 'desativada'} com sucesso!`);
        logActivity(profile.userId, `${newStatus === 'active' ? 'Ativou' : 'Desativou'} organização`, { organization_id: orgId });
    };

    const handleResendInvite = async (targetUser: { id: string; name?: string; email: string }) => {
        const { error } = await supabase.functions.invoke('send-invite-email', {
            body: { userId: targetUser.id, email: targetUser.email, name: targetUser.name || targetUser.email }
        });
        if (error) {
            toast.error('Erro ao reenviar convite. Verifique o console.');
            logActivity(profile.userId, 'Erro ao reenviar convite', { email: targetUser.email, error: error.message });
            return;
        }
        toast.success(`Convite reenviado para ${targetUser.name || targetUser.email}`);
        logActivity(profile.userId, 'Reenviou convite', { email: targetUser.email });
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.name?.toLowerCase().includes(search.toLowerCase()) || 
                               u.email?.toLowerCase().includes(search.toLowerCase()));
        const matchesRole = !roleFilter || u.user_role === roleFilter;
        const matchesStatus = !statusFilter || u.status === statusFilter;
        const matchesOrg = !selectedOrgId || u.organization_id === selectedOrgId;
        return matchesSearch && matchesRole && matchesStatus && matchesOrg;
    });

    const displayUsersForStats = selectedOrgId 
        ? users.filter(u => u.organization_id === selectedOrgId)
        : users;

    const stats = {
        total: displayUsersForStats.length,
        active: displayUsersForStats.filter(u => u.status === 'active').length,
        inactive: displayUsersForStats.filter(u => u.status === 'inactive').length,
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <Loader2 className="animate-spin" size={32} color="#3b82f6" />
            </div>
        );
    }

    return (
        <div style={{ width: '100%', margin: '0' }}>
            <style>{css}</style>
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                    <ShieldCheck size={isMobile ? 24 : 32} style={{ color: 'var(--primary)' }} />
                    <h1 style={{ fontSize: isMobile ? '22px' : '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        Painel Administrador
                    </h1>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                    Gerencie usuários e monitore o status das contas.
                </p>

                {/* Organization Selection Filter - Apenas para Owner */}
                {userRole === 'owner' && (
                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                        {!isMobile && <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>Filtrar Dashboard por Organização:</span>}
                        
                        <div className="cs-container" ref={orgRef} style={{ width: 'auto', minWidth: isMobile ? '100%' : '320px', flexShrink: 0 }}>
                            <div className="cs-trigger" onClick={() => setIsOrgOpen(!isOrgOpen)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
                                    <Database size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {organizations.find(o => o.id === selectedOrgId)?.name || 'Todas as Organizações (Visão Global)'}
                                    </span>
                                </div>
                                <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isOrgOpen ? 'rotate(180deg)' : 'none' }} />
                            </div>

                            {isOrgOpen && (
                                <div className="cs-dropdown" style={{ ...(isMobile ? { left: 'auto', right: 0, maxWidth: 'calc(100vw - 32px)' } : {}) }}>
                                    <div 
                                        className={`cs-item ${selectedOrgId === '' ? 'active' : ''}`}
                                        onClick={() => { setSelectedOrgId(''); setIsOrgOpen(false); }}
                                    >
                                        <div className="cs-dot" style={{ background: 'var(--primary)' }} />
                                        Visão Global (Todas)
                                    </div>
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                                    {organizations.map(org => (
                                        <div 
                                            key={org.id} 
                                            className={`cs-item ${selectedOrgId === org.id ? 'active' : ''}`}
                                            onClick={() => { setSelectedOrgId(org.id); setIsOrgOpen(false); }}
                                        >
                                            <div className="cs-dot" style={{ background: '#10b981' }} />
                                            {org.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? '12px' : '20px', marginBottom: isMobile ? '20px' : '32px' }}>
                {[
                    { label: 'Total de Usuários', value: stats.total, icon: Users, color: '#3b82f6' },
                    { label: 'Usuários Ativos', value: stats.active, icon: UserCheck, color: '#10b981' },
                    { label: 'Usuários Inativos', value: stats.inactive, icon: UserX, color: '#ef4444' },
                ].map((s, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', padding: isMobile ? '14px' : '20px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ padding: '12px', background: `${s.color}20`, borderRadius: '12px', color: s.color }}>
                            <s.icon size={24} />
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>{s.label}</p>
                            <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: isMobile ? '12px' : '20px', marginBottom: '32px' }}>
                {isMobile && (
                <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: 12 }}>
                        <p style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Filtro</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, whiteSpace: 'nowrap' }}>Período:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>De:</span>
                            <DatePicker compact value={rangeStart || ''} onChange={val => setRangeStart(val || null)} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>Até:</span>
                            <DatePicker compact value={rangeEnd || ''} onChange={val => setRangeEnd(val || null)} />
                        </div>
                    </div>
                    {(rangeStart || rangeEnd) && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                            <button onClick={clearRange} style={{ background: 'transparent', border: '1px solid var(--error-border)', borderRadius: '8px', padding: '6px 14px', color: 'var(--text-error)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <X size={14} /> Limpar filtros
                            </button>
                        </div>
                    )}
                </div>
                )}
                {/* Analyses Per Day */}
                <div style={{ background: 'var(--bg-card)', padding: isMobile ? '14px' : '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', color: '#3b82f6' }}>
                                <BarChart2 size={20} />
                            </div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                                {activeStart 
                                    ? `Análises: ${fmtDate(activeStart)}${activeEnd ? ` → ${fmtDate(activeEnd)}` : ''}`
                                    : 'Análises Realizadas (Últimos 7 dias)'
                                }
                            </h3>
                        </div>
                    </div>
                    <div style={{ height: isMobile ? '180px' : '300px', width: '100%', minWidth: 0, position: 'relative' }}>
                        <ResponsiveContainer width="100%" height={isMobile ? 180 : 300} debounce={50}>
                            <AreaChart data={analysisData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} strokeOpacity={0.5} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-dim)', fontSize: 12 }} 
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'var(--text-dim)', fontSize: 12 }} 
                                    allowDecimals={false}
                                    dx={-10}
                                />
                                <RechartsTooltip 
                                    contentStyle={{ 
                                        background: 'var(--bg-card)', 
                                        border: '1px solid var(--border)', 
                                        borderRadius: '12px', 
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                        color: 'var(--text-main)' 
                                    }}
                                    itemStyle={{ color: '#6366f1', fontWeight: 600 }}
                                    labelStyle={{ color: 'var(--text-dim)', fontSize: '11px', marginBottom: '4px' }}
                                    formatter={(value: number | undefined) => [value || 0, 'Análises']}
                                    labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorValue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Calendar Filter (desktop) */}
                {!isMobile && (
                <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                            <p style={{ color: 'var(--text-dim)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>Filtro</p>
                            <p style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: 700 }}>{monthNames[calMonth]} {calYear}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="cal-nav" onClick={prevMonth}>‹</button>
                            <button className="cal-nav" onClick={nextMonth}>›</button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
                        {dayNames.map(d => (
                            <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', padding: '4px 0' }}>{d}</div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const ds = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
                            const isToday = ds === todayStr;
                            const hasJob = jobDateSet.has(ds);
                            const lo = activeStart && activeEnd ? (activeStart < activeEnd ? activeStart : activeEnd) : activeStart;
                            const hi = activeStart && activeEnd ? (activeStart < activeEnd ? activeEnd : activeStart) : activeStart;
                            const isStart = ds === lo;
                            const isEnd = ds === hi;
                            const inRange = lo && hi && ds > lo && ds < hi;
                            const isActive = isStart || isEnd;
                            const isPending = rangeStart && !rangeEnd && ds === rangeStart;
                            let cls = 'cal-day';
                            if (isActive || isPending) cls += ' cal-active';
                            else if (isToday) cls += ' cal-today';
                            if (inRange) cls += ' cal-range';
                            if (isStart && activeEnd && activeEnd !== activeStart) cls += ' cal-range-start';
                            if (isEnd && activeStart && activeEnd !== activeStart) cls += ' cal-range-end';
                            if (hasJob) cls += ' cal-has-job';
                            return (
                                <div key={day} className={cls} onClick={() => handleDayClick(day)}>{day}</div>
                            );
                        })}
                    </div>

                    {/* Legend + Selection info */}
                    <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                            <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Dia com vaga criada</span>
                        </div>
                        {activeStart ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                                    {activeEnd && activeEnd !== activeStart
                                        ? <><b style={{ color: 'var(--primary)' }}>{fmtDate(activeStart)}</b> → <b style={{ color: 'var(--primary)' }}>{fmtDate(activeEnd)}</b></>
                                        : <><b style={{ color: 'var(--primary)' }}>{fmtDate(activeStart)}</b>{!rangeEnd ? <span style={{ color: '#f59e0b' }}> • clique p/ finalizar</span> : ''}</>
                                    }
                                </span>
                                <button onClick={clearRange} style={{ fontSize: '10px', color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }}>Limpar</button>
                            </div>
                        ) : (
                            <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Clique num dia (ou selecione um período)</span>
                        )}
                    </div>
                </div>
                )}
            </div>

            {/* Filter Bar */}
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: isMobile ? '100%' : '240px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar usuários…" 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px 8px 36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                        onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                </div>
                
                {!isMobile && <div style={{ height: '20px', width: '1px', background: 'var(--border)', margin: '0 4px' }} />}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Cargo:</span>
                        <div className="cs-container" ref={roleRef} style={{ width: isMobile ? '100%' : '160px' }}>
                            <div className="cs-trigger" onClick={() => setIsRoleOpen(!isRoleOpen)}>
                                <span>{roleFilter === '' ? 'Todos' : roleFilter.toUpperCase()}</span>
                                <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isRoleOpen ? 'rotate(180deg)' : 'none' }} />
                            </div>
                            {isRoleOpen && (
                                <div className="cs-dropdown" style={{ ...(isMobile ? { left: 'auto', right: 0, maxWidth: 'calc(100vw - 32px)' } : {}) }}>
                                    <div className={`cs-item ${roleFilter === '' ? 'active' : ''}`} onClick={() => { setRoleFilter(''); setIsRoleOpen(false); }}>Todos</div>
                                    <div className={`cs-item ${roleFilter === 'rh' ? 'active' : ''}`} onClick={() => { setRoleFilter('rh'); setIsRoleOpen(false); }}>RH</div>
                                    <div className={`cs-item ${roleFilter === 'gestor' ? 'active' : ''}`} onClick={() => { setRoleFilter('gestor'); setIsRoleOpen(false); }}>GESTOR</div>
                                    <div className={`cs-item ${roleFilter === 'convidado' ? 'active' : ''}`} onClick={() => { setRoleFilter('convidado'); setIsRoleOpen(false); }}>CONVIDADO</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Status:</span>
                        <div className="cs-container" ref={statusRef} style={{ width: isMobile ? '100%' : '160px' }}>
                            <div className="cs-trigger" onClick={() => setIsStatusOpen(!isStatusOpen)}>
                                <span>{statusFilter === '' ? 'Todos' : statusFilter === 'active' ? 'Ativo' : 'Inativo'}</span>
                                <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isStatusOpen ? 'rotate(180deg)' : 'none' }} />
                            </div>
                            {isStatusOpen && (
                                <div className="cs-dropdown" style={{ ...(isMobile ? { left: 'auto', right: 0, maxWidth: 'calc(100vw - 32px)' } : {}) }}>
                                    <div className={`cs-item ${statusFilter === '' ? 'active' : ''}`} onClick={() => { setStatusFilter(''); setIsStatusOpen(false); }}>Todos</div>
                                    <div className={`cs-item ${statusFilter === 'active' ? 'active' : ''}`} onClick={() => { setStatusFilter('active'); setIsStatusOpen(false); }}>
                                        <div className="cs-dot" style={{ background: '#10b981' }} /> Ativo
                                    </div>
                                    <div className={`cs-item ${statusFilter === 'inactive' ? 'active' : ''}`} onClick={() => { setStatusFilter('inactive'); setIsStatusOpen(false); }}>
                                        <div className="cs-dot" style={{ background: '#ef4444' }} /> Inativo
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {(roleFilter || statusFilter || search) && (
                    <button
                        onClick={() => { setRoleFilter(''); setStatusFilter(''); setSearch(''); }}
                        style={{ background: 'transparent', border: '1px solid var(--error-border)', borderRadius: 8, padding: isMobile ? '7px 10px' : '7px 12px', color: 'var(--text-error)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                        <X style={{ width: 12, height: 12 }} /> Limpar filtros
                    </button>
                )}
            </div>

            {/* Convidar Usuário */}
            {(userRole === 'owner' || userRole === 'gestor') && (
                    <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--primary)',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'opacity 0.15s',
                        }}
                    >
                        <Plus size={18} />
                        Convidar Usuário
                    </button>
                </div>
            )}

            {/* User List */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                {userRole === 'owner' ? (
                    /* Owner: Visão agrupada por organização */
                    <div>
                        {(() => {
                            const orgs = new Map<string, { id: string; name: string; status: string; users: UserProfile[] }>();
                            filteredUsers.forEach(u => {
                                const oid = u.organization_id || 'sem-org';
                                if (!orgs.has(oid)) {
                                    orgs.set(oid, { id: oid, name: u.organization_name || 'Sem Organização', status: u.status, users: [] });
                                }
                                orgs.get(oid)!.users.push(u);
                            });
                            return Array.from(orgs.values()).map(org => {
                                const gestor = org.users.find(u => u.user_role === 'gestor');
                                const membros = org.users.filter(u => u.id !== gestor?.id);
                                const totalMembros = org.users.length;
                                const orgStatus = org.users.some(u => u.status === 'active') ? 'active' : 'inactive';
                                return (
                                    <div key={org.id} style={{ borderBottom: '1px solid var(--border)', padding: isMobile ? '12px 14px' : '16px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, borderRadius: '10px', background: orgStatus === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Building2 size={isMobile ? 16 : 18} color={orgStatus === 'active' ? '#10b981' : '#ef4444'} />
                                                </div>
                                                <div>
                                                    <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '14px', margin: 0 }}>{org.name}</p>
                                                    <p style={{ color: 'var(--text-dim)', fontSize: '11px', margin: '2px 0 0' }}>
                                                        {totalMembros} {totalMembros === 1 ? 'membro' : 'membros'} {gestor ? `• Gestor: ${gestor.name || gestor.email.split('@')[0]}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: orgStatus === 'active' ? '#10b981' : '#ef4444' }} />
                                                <span style={{ fontSize: 12, color: orgStatus === 'active' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                    {orgStatus === 'active' ? 'Ativa' : 'Inativa'}
                                                </span>
                                                {org.id !== 'sem-org' && (
                                                    <button
                                                        onClick={() => handleToggleOrgStatus(org.id, orgStatus)}
                                                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: orgStatus === 'active' ? '#ef4444' : '#10b981', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        {orgStatus === 'active' ? <UserX size={12} /> : <UserCheck size={12} />}
                                                        {orgStatus === 'active' ? 'Desativar' : 'Ativar'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {membros.length > 0 && (
                                            <div style={{ marginTop: '10px', marginLeft: isMobile ? 0 : '46px' }}>
                                                {membros.map(u => (
                                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap', gap: '6px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: u.user_role === 'rh' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: u.user_role === 'rh' ? '#6366f1' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{initials(u.name)}</div>
                                                            <div>
                                                                <p style={{ color: 'var(--text-main)', fontSize: 13, fontWeight: 500, margin: 0 }}>{u.name || u.email.split('@')[0]}</p>
                                                                <p style={{ color: 'var(--text-dim)', fontSize: 11, margin: 0 }}>{u.email}</p>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: 10, fontWeight: 700, background: u.user_role === 'rh' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: u.user_role === 'rh' ? '#6366f1' : '#10b981' }}>
                                                                {u.user_role?.toUpperCase()}
                                                            </span>
                                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: u.status === 'active' ? '#10b981' : '#ef4444' }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                        {filteredUsers.length === 0 && (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
                                Nenhum usuário encontrado.
                            </div>
                        )}
                    </div>
                ) : (
                    /* Gestor/RH/Convidado: Tabela plana com ações estendidas */
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: isMobile ? 'auto' : 'fixed' }}>
                        <colgroup>
                            <col style={{ width: isMobile ? 'auto' : '28%' }} />
                            <col style={{ width: isMobile ? '0%' : '20%' }} />
                            <col style={{ width: isMobile ? 'auto' : '14%' }} />
                            <col style={{ width: isMobile ? '0%' : '14%' }} />
                            <col style={{ width: isMobile ? 'auto' : '24%' }} />
                        </colgroup>
                        <thead>
                            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: isMobile ? '12px 6px 12px 8px' : '14px 16px', fontSize: isMobile ? '10px' : '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Usuário</th>
                                <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: isMobile ? 'none' : 'table-cell' }}>Organização</th>
                                <th style={{ padding: isMobile ? '12px 2px' : '14px 16px', fontSize: isMobile ? '10px' : '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Cargo</th>
                                <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', display: isMobile ? 'none' : 'table-cell' }}>Status</th>
                                <th style={{ padding: isMobile ? '12px 4px' : '14px 16px', fontSize: isMobile ? '10px' : '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => {
                                const roleLabel = user.user_role?.toUpperCase();
                                const isOwner = user.user_role === 'owner';

                                return (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: isMobile ? '10px 8px' : '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10 }}>
                                            {!isMobile && (
                                            <div style={{ 
                                                width: 32, 
                                                height: 32, 
                                                borderRadius: '50%', 
                                                background: isOwner ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                                                color: isOwner ? '#ef4444' : '#3b82f6', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                fontSize: 11, 
                                                fontWeight: 700, 
                                                flexShrink: 0 
                                            }}>
                                                {initials(user.name)}
                                            </div>
                                            )}
                                            <div style={{ minWidth: 0, position: 'relative' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <p style={{ color: 'var(--text-main)', fontWeight: 500, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {(() => { const n = user.name || user.email.split('@')[0] || 'Usuário'; const m = isMobile ? 12 : 999; return n.length > m ? n.substring(0, m) + '…' : n; })()}
                                                    </p>
                                                    {isMobile && (
                                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: user.status === 'active' ? '#10b981' : '#ef4444', flexShrink: 0 }} />
                                                    )}
                                                </div>
                                                <p style={{ color: 'var(--text-dim)', fontSize: 11, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: isMobile ? '10px 8px' : '16px', display: isMobile ? 'none' : 'table-cell' }}>
                                        <p style={{ color: 'var(--text-main)', fontSize: 13, margin: 0, fontWeight: 500 }}>
                                            {user.organization_name || 'Sem Organização'}
                                        </p>
                                    </td>
                                    <td style={{ padding: isMobile ? '10px 6px' : '10px 8px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: isMobile ? '3px 6px' : '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: isMobile ? '10px' : '11px',
                                            fontWeight: 700,
                                            background: isOwner ? 'rgba(239, 68, 68, 0.1)' : '#3b82f620',
                                            color: isOwner ? '#ef4444' : '#3b82f6',
                                            textTransform: 'uppercase',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {roleLabel}
                                        </span>
                                    </td>
                                    <td style={{ padding: isMobile ? '10px 8px' : '16px', display: isMobile ? 'none' : 'table-cell' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: user.status === 'active' ? '#10b981' : '#ef4444' }} />
                                            <span style={{ fontSize: '13px', color: user.status === 'active' ? '#10b981' : '#ef4444' }}>
                                                {user.status === 'active' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: isMobile ? '10px 8px' : '10px 8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '6px' : '6px' }}>
                                            <button
                                                onClick={() => toggleStatus(user.id, user.status)}
                                                disabled={updatingId === user.id}
                                                title={user.status === 'active' ? 'Desativar' : 'Ativar'}
                                                style={{
                                                    padding: isMobile ? '6px' : '6px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-main)',
                                                    color: user.status === 'active' ? '#ef4444' : '#10b981',
                                                    fontSize: isMobile ? '10px' : '11px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px',
                                                    transition: 'all 0.2s',
                                                    whiteSpace: 'nowrap',
                                                    minWidth: isMobile ? 28 : 'auto',
                                                }}
                                            >
                                                {updatingId === user.id ? <Loader2 className="animate-spin" size={12} /> : (user.status === 'active' ? <UserX size={12} /> : <UserCheck size={12} />)}
                                                {isMobile ? '' : (user.status === 'active' ? 'Desativar' : 'Ativar')}
                                            </button>
                                            <button
                                                onClick={() => handleResendInvite({ id: user.id, name: user.name, email: user.email })}
                                                title="Reenviar convite"
                                                style={{
                                                    padding: isMobile ? '6px' : '6px 10px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-main)',
                                                    color: '#3b82f6',
                                                    fontSize: isMobile ? '10px' : '11px',
                                                    fontWeight: 600,
                                                    cursor: user.user_role === 'owner' ? 'default' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px',
                                                    transition: 'all 0.2s',
                                                    whiteSpace: 'nowrap',
                                                    visibility: user.user_role === 'owner' ? 'hidden' : 'visible',
                                                    pointerEvents: user.user_role === 'owner' ? 'none' : 'auto',
                                                    minWidth: isMobile ? 28 : 'auto',
                                                }}
                                            >
                                                <Mail size={12} />
                                                {isMobile ? '' : 'Reenviar'}
                                            </button>
                                            <button
                                                onClick={() => { setVagaModalUserId(user.id); loadVagas(); loadUserVagaAccess(user.id); }}
                                                title="Vagas"
                                                style={{
                                                    padding: isMobile ? '6px' : '6px 10px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-main)',
                                                    color: '#10b981',
                                                    fontSize: isMobile ? '10px' : '11px',
                                                    fontWeight: 600,
                                                    cursor: user.user_role === 'convidado' ? 'pointer' : 'default',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px',
                                                    transition: 'all 0.2s',
                                                    whiteSpace: 'nowrap',
                                                    visibility: user.user_role === 'convidado' ? 'visible' : 'hidden',
                                                    pointerEvents: user.user_role === 'convidado' ? 'auto' : 'none',
                                                    minWidth: isMobile ? 28 : 'auto',
                                                }}
                                            >
                                                <Briefcase size={12} />
                                                {isMobile ? '' : 'Vagas'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
                            Nenhum usuário encontrado.
                        </div>
                    )}
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: '20px', padding: isMobile ? '20px' : '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700, margin: 0 }}>Convidar Usuário</h2>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label htmlFor="newuser-name" style={labelStyle}>Nome completo</label>
                            <div style={fieldWrapStyle}>
                                <UserIcon style={iconFieldStyle} />
                                <input
                                    id="newuser-name"
                                    style={inputStyle}
                                    placeholder="Nome do usuário"
                                    value={newUser.name}
                                    onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label htmlFor="newuser-email" style={labelStyle}>E-mail</label>
                            <div style={fieldWrapStyle}>
                                <Mail style={iconFieldStyle} />
                                <input
                                    id="newuser-email"
                                    type="email"
                                    style={inputStyle}
                                    placeholder="email@exemplo.com"
                                    value={newUser.email}
                                    onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Perfil de Acesso</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {roleDefinitions
                                    .filter(r => {
                                        if (userRole === 'owner') return r.key === 'gestor';
                                        if (userRole === 'gestor') return ['rh', 'convidado'].includes(r.key);
                                        return false;
                                    })
                                    .map(r => (
                                        <button
                                            key={r.key}
                                            onClick={() => setNewUser(prev => ({ ...prev, user_role: r.key }))}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                border: `2px solid ${newUser.user_role === r.key ? r.color : 'var(--border)'}`,
                                                background: newUser.user_role === r.key ? `${r.color}10` : 'var(--bg-main)',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <r.icon size={20} color={r.color} />
                                            <div>
                                                <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '13px', margin: 0 }}>{r.label}</p>
                                                <p style={{ color: 'var(--text-dim)', fontSize: '11px', margin: '2px 0 0' }}>{r.description}</p>
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        </div>

                        <button
                            onClick={handleCreateUser}
                            disabled={creatingUser}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'var(--primary)',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: creatingUser ? 'not-allowed' : 'pointer',
                                opacity: creatingUser ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            {creatingUser ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                            {creatingUser ? 'Enviando convite…' : 'Enviar Convite'}
                        </button>
                    </div>
                </div>
            )}

            {/* Vaga Permission Modal */}
            {vagaModalUserId && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: '20px', padding: isMobile ? '20px' : '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h2 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700, margin: 0 }}>Permissão de Vagas</h2>
                            <button onClick={() => setVagaModalUserId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '16px' }}>
                            Selecione as vagas que este convidado poderá acessar:
                        </p>
                        {vagaLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                                <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                            </div>
                        ) : vagasList.length === 0 ? (
                            <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                                Nenhuma vaga aberta disponível.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {vagasList.map(vaga => {
                                    const hasAccess = userVagaIds.has(vaga.id);
                                    return (
                                        <label
                                            key={vaga.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                border: `1px solid ${hasAccess ? 'var(--primary)' : 'var(--border)'}`,
                                                background: hasAccess ? 'rgba(59,130,246,0.05)' : 'var(--bg-main)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={hasAccess}
                                                onChange={() => handleToggleVagaAccess(vagaModalUserId, vaga.id, hasAccess)}
                                                style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
                                            />
                                            <div>
                                                <p style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 500, margin: 0 }}>
                                                    {vaga.job_code ? `${vaga.job_code} - ` : ''}{vaga.title}
                                                </p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

import { useEffect, useState } from 'react';
import { supabase } from '../../core/services/supabase';
import { Users, UserX, UserCheck, Search, Loader2, BarChart2, X, ShieldCheck } from 'lucide-react';
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
`;

const initials = (name: string) =>
    name?.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?';

interface UserProfile {
    id: string;
    email: string;
    name: string;
    user_role: string;
    status: string;
    created_at: string;
}

interface ChartData {
    name: string;
    value: number;
}

export const AdminDashboard = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [analysisData, setAnalysisData] = useState<ChartData[]>([]);
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [jobDateSet, setJobDateSet] = useState<Set<string>>(new Set());

    // Calendar state
    const today = new Date();
    const [calYear, setCalYear] = useState(today.getFullYear());
    const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-based
    const [rangeStart, setRangeStart] = useState<string | null>(null); // 'YYYY-MM-DD'
    const [rangeEnd, setRangeEnd] = useState<string | null>(null);   // 'YYYY-MM-DD'

    const activeStart = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeStart : rangeEnd) : rangeStart;
    const activeEnd = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeEnd : rangeStart) : rangeStart;

    const fetchDashboardData = async () => {
        setLoading(true);
        
        // Fetch Users
        const { data: userData } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (userData) {
            setUsers(userData as UserProfile[]);
        }

        // Fetch Analyses (Jobs) for the selected range or last 7 days
        const end = activeEnd ? new Date(activeEnd) : new Date();
        const start = activeStart ? new Date(activeStart) : new Date();
        if (!activeStart) start.setDate(end.getDate() - 7);
        
        const { data: jobData } = await supabase
            .from('jobs')
            .select('created_at')
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString());

        if (jobData) {
            setJobDateSet(new Set(jobData.map(j => j.created_at.slice(0, 10))));
            const counts: Record<string, number> = {};
            const chartData = [];
            let current = new Date(start);
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

        setLoading(false);
    };

    useEffect(() => {
        fetchDashboardData();
    }, [activeStart, activeEnd]);

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

    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.name?.toLowerCase().includes(search.toLowerCase()) || 
                               u.email?.toLowerCase().includes(search.toLowerCase()));
        const matchesRole = !roleFilter || u.user_role === roleFilter;
        const matchesStatus = !statusFilter || u.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });

    const stats = {
        total: users.length,
        active: users.filter(u => u.status === 'active').length,
        inactive: users.filter(u => u.status === 'inactive').length,
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
                    <ShieldCheck size={32} style={{ color: 'var(--primary)' }} />
                    <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        Painel Administrador
                    </h1>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                    Gerencie usuários e monitore o status das contas.
                </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
                {[
                    { label: 'Total de Usuários', value: stats.total, icon: Users, color: '#3b82f6' },
                    { label: 'Usuários Ativos', value: stats.active, icon: UserCheck, color: '#10b981' },
                    { label: 'Usuários Inativos', value: stats.inactive, icon: UserX, color: '#ef4444' },
                ].map((s, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', marginBottom: '32px' }}>
                {/* Analyses Per Day */}
                <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
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
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
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

                {/* Calendar Filter */}
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
            </div>

            {/* Filter Bar */}
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '240px' }}>
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
                
                <div style={{ height: '20px', width: '1px', background: 'var(--border)', margin: '0 4px' }} />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Cargo:</span>
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-main)', fontSize: 13, outline: 'none', cursor: 'pointer', minWidth: '140px' }}
                        >
                            <option value="">Todos</option>
                            <option value="admin">Administrador</option>
                            <option value="rh">RH</option>
                            <option value="gestor">Gestor</option>
                            <option value="convidado">Convidado</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Status:</span>
                        <select 
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-main)', fontSize: 13, outline: 'none', cursor: 'pointer', minWidth: '140px' }}
                        >
                            <option value="">Todos</option>
                            <option value="active">Ativo</option>
                            <option value="inactive">Inativo</option>
                        </select>
                    </div>
                </div>

                {(roleFilter || statusFilter || search) && (
                    <button
                        onClick={() => { setRoleFilter(''); setStatusFilter(''); setSearch(''); }}
                        style={{ background: 'transparent', border: '1px solid var(--error-border)', borderRadius: 8, padding: '7px 12px', color: 'var(--text-error)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                        <X style={{ width: 12, height: 12 }} /> Limpar filtros
                    </button>
                )}
            </div>

            {/* User List */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>


                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '40%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '20%' }} />
                        </colgroup>
                        <thead>
                            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Usuário</th>
                                <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Cargo</th>
                                <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                                {initials(user.name)}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ color: 'var(--text-main)', fontWeight: 500, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {user.name || user.email.split('@')[0] || 'Usuário'}
                                                </p>
                                                <p style={{ color: 'var(--text-dim)', fontSize: 11, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: user.user_role === 'admin' ? '#ef444420' : '#3b82f620', color: user.user_role === 'admin' ? '#ef4444' : '#3b82f6', textTransform: 'uppercase' }}>
                                            {user.user_role === 'admin' ? 'ADMIN' : user.user_role === 'rh' ? 'RH' : user.user_role === 'gestor' ? 'GESTOR' : 'CONVIDADO'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: user.status === 'active' ? '#10b981' : '#ef4444' }} />
                                            <span style={{ fontSize: '13px', color: user.status === 'active' ? '#10b981' : '#ef4444' }}>
                                                {user.status === 'active' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <button 
                                                onClick={() => toggleStatus(user.id, user.status)}
                                                disabled={updatingId === user.id}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-main)',
                                                    color: user.status === 'active' ? '#ef4444' : '#10b981',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {updatingId === user.id ? <Loader2 className="animate-spin" size={14} /> : (user.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />)}
                                                {user.status === 'active' ? 'Desativar' : 'Ativar'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

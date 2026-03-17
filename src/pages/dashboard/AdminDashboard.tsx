import { useEffect, useState } from 'react';
import { supabase } from '../../core/services/supabase';
import { Users, UserX, UserCheck, Search, Loader2, BarChart2, PieChart as PieIcon } from 'lucide-react';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
    AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

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

        // Fetch Analyses (Jobs) for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: jobData } = await supabase
            .from('jobs')
            .select('created_at')
            .gte('created_at', sevenDaysAgo.toISOString());

        if (jobData) {
            const counts: Record<string, number> = {};
            // Initialize last 7 days with zero
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dayStr = date.toLocaleDateString('pt-BR', { weekday: 'short' });
                counts[dayStr] = 0;
            }

            jobData.forEach(job => {
                const dayStr = new Date(job.created_at).toLocaleDateString('pt-BR', { weekday: 'short' });
                if (counts[dayStr] !== undefined) counts[dayStr]++;
            });

            const formattedData = Object.entries(counts)
                .map(([name, value]) => ({ name, value }))
                .reverse();
            setAnalysisData(formattedData);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

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

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(search.toLowerCase()) || 
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

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
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ color: 'var(--text-main)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Painel Administrativo</h1>
                <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 6 }}>Gerencie usuários e monitore o status das contas.</p>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '32px' }}>
                {/* Analyses Per Day */}
                <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', color: '#3b82f6' }}>
                            <BarChart2 size={20} />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Análises Realizadas (Últimos 7 dias)</h3>
                    </div>
                    <div style={{ height: '240px', width: '100%' }}>
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

                {/* User Status Distribution */}
                <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', color: '#10b981' }}>
                            <PieIcon size={20} />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Distribuição de Usuários</h3>
                    </div>
                    <div style={{ height: '240px', width: '100%', position: 'relative' }}>
                        <div style={{
                            position: 'absolute',
                            top: '46%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            pointerEvents: 'none'
                        }}>
                            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', display: 'block' }}>{stats.total}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Ativos', value: stats.active },
                                        { name: 'Inativos', value: stats.inactive }
                                    ]}
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                    startAngle={90}
                                    endAngle={450}
                                >
                                    <Cell fill="#10b981" />
                                    <Cell fill="#ef4444" opacity={0.8} />
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ 
                                        background: 'var(--bg-card)', 
                                        border: '1px solid var(--border)', 
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                    }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    align="center"
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* User List */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input 
                            type="text" 
                            placeholder="Buscar por nome ou email..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px 10px 40px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '25%' }} />
                            <col style={{ width: '30%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '15%' }} />
                        </colgroup>
                        <thead>
                            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Usuário</th>
                                <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</th>
                                <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Cargo</th>
                                <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '16px', color: 'var(--text-main)', fontWeight: 500 }}>
                                        {user.name || user.email.split('@')[0] || 'Usuário'}
                                    </td>
                                    <td style={{ padding: '16px', color: 'var(--text-dim)' }}>{user.email}</td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: user.user_role === 'admin' ? '#ef444420' : '#3b82f620', color: user.user_role === 'admin' ? '#ef4444' : '#3b82f6', textTransform: 'uppercase' }}>
                                            {user.user_role}
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

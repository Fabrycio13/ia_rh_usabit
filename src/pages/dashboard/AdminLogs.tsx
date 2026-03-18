import { useEffect, useState } from 'react';
import { supabase } from '../../core/services/supabase';
import { Clock, Loader2, Info, Search, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface LogEntry {
    id: string;
    user_id: string;
    action: string;
    details: any;
    error: string | null;
    created_at: string;
    profiles?: {
        name: string;
        email: string;
    };
}

export const AdminLogs = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [searchUser, setSearchUser] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchLogs = async () => {
        setLoading(true);
        
        let result = await supabase
            .from('activity_logs')
            .select(`
                *,
                profiles (name, email)
            `)
            .order('created_at', { ascending: false })
            .limit(500); // Aumentado para suportar paginação local em mais dados
        
        if (result.error) {
            result = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);
        }
        
        if (result.data) {
            setLogs(result.data as LogEntry[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    // Reset page when filtering
    useEffect(() => {
        setCurrentPage(1);
    }, [searchUser, startDate, endDate, statusFilter]);

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        setSearchUser('');
        setStatusFilter('');
        setCurrentPage(1);
    };

    

    const filteredLogs = logs.filter(l => {
        
        const matchesUser = searchUser === '' || 
            (l.profiles?.name || '').toLowerCase().includes(searchUser.toLowerCase()) || 
            (l.profiles?.email || '').toLowerCase().includes(searchUser.toLowerCase());
        
        // Filtro de Status
        const matchesStatus = statusFilter === '' || 
            (statusFilter === 'success' && !l.error) || 
            (statusFilter === 'error' && !!l.error);

        // Filtro de Período
        const logDate = l.created_at.slice(0, 10); // YYYY-MM-DD
        const matchesStart = !startDate || logDate >= startDate;
        const matchesEnd = !endDate || logDate <= endDate;

        return matchesUser && matchesStatus && matchesStart && matchesEnd;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <Loader2 className="animate-spin" size={32} color="var(--primary)" />
            </div>
        );
    }

    return (
        <div style={{ width: '100%', margin: '0' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <h1 style={{ color: 'var(--text-main)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Logs de atividade</h1>
                    <p style={{ color: 'var(--primary)', fontSize: 14, marginTop: 6, fontWeight: 500 }}>
                        {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} encontrado{filteredLogs.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Standardized Filter Bar - Revised order and fields */}
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', flex: 1 }}>
                    {/* Date Range Group - FIRST */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Período:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>De:</span>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-main)', fontSize: 12, outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>Até:</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-main)', fontSize: 12, outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div style={{ height: '24px', width: '1px', background: 'var(--border)', margin: '0 4px' }} />

                    <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Filtrar por:</span>
                    
                    {/* User Search */}
                    <div style={{ position: 'relative', width: '200px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input 
                            type="text"
                            placeholder="Usuário..."
                            value={searchUser}
                            onChange={e => { setSearchUser(e.target.value); setCurrentPage(1); }}
                            style={{ width: '100%', padding: '8px 12px 8px 34px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s' }}
                        />
                    </div>

                    {/* Status Filter */}
                    <div style={{ position: 'relative', width: '150px' }}>
                        <AlertCircle 
                            size={14} 
                            style={{ 
                                position: 'absolute', 
                                left: '12px', 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                color: statusFilter === 'success' ? '#10b981' : statusFilter === 'error' ? '#ef4444' : '#3b82f6',
                                transition: 'color 0.2s'
                            }} 
                        />
                        <select 
                            value={statusFilter} 
                            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            style={{ 
                                width: '100%', 
                                padding: '8px 12px 8px 34px', 
                                background: 'var(--bg-card)', 
                                border: '1px solid var(--border)', 
                                borderRadius: '8px', 
                                color: statusFilter === 'success' ? '#10b981' : statusFilter === 'error' ? '#ef4444' : '#3b82f6', 
                                fontSize: '13px', 
                                fontWeight: 600,
                                outline: 'none', 
                                appearance: 'none', 
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <option value="" style={{ color: '#3b82f6' }}>Todos status</option>
                            <option value="success" style={{ color: '#10b981' }}>Sucesso</option>
                            <option value="error" style={{ color: '#ef4444' }}>Erro</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    {(searchUser || statusFilter || startDate || endDate) && (
                        <button 
                            onClick={clearFilters}
                            style={{ background: 'transparent', border: '1px solid var(--error-border)', borderRadius: 8, padding: '8px 14px', color: 'var(--text-error)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <X size={14} /> Limpar
                        </button>
                    )}
                    
                    <button 
                        onClick={fetchLogs}
                        style={{ 
                            padding: '10px 20px', 
                            borderRadius: '10px', 
                            background: 'var(--primary)', 
                            border: 'none', 
                            color: '#fff', 
                            fontSize: '13px', 
                            fontWeight: 700, 
                            cursor: 'pointer', 
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--primary-hover)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 15px rgba(59, 130, 246, 0.4)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'var(--primary)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                        }}
                    >
                        Atualizar
                    </button>
                </div>
            </div>


            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                {filteredLogs.length === 0 ? (
                    <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        <Info size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p style={{ fontSize: '16px' }}>Nenhum log encontrado para os critérios selecionados.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: '15%' }} />
                                    <col style={{ width: '22%' }} />
                                    <col style={{ width: '28%' }} />
                                    <col style={{ width: '25%' }} />
                                    <col style={{ width: '10%' }} />
                                </colgroup>
                                <thead>
                                    <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Data/Hora</th>
                                        <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Usuário</th>
                                        <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Ação</th>
                                        <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Detalhes</th>
                                        <th style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Status / Erro</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedLogs.map(log => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '13px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '16px', color: 'var(--text-dim)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Clock size={14} style={{ opacity: 0.6 }} />
                                                    {formatDate(log.created_at)}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', verticalAlign: 'middle', textAlign: 'left' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{log.profiles?.name || 'Sistema'}</span>
                                                    <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{log.profiles?.email}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'left', verticalAlign: 'middle' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.15)', textTransform: 'uppercase', display: 'inline-block' }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle', textAlign: 'left' }}>
                                                {typeof log.details === 'object' && log.details !== null ? (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                        {Object.entries(log.details).map(([k, v]) => (
                                                            <span key={k} style={{ padding: '2px 6px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '10px' }}>
                                                                <strong style={{ opacity: 0.7 }}>{k}:</strong> {String(v)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    String(log.details || '-')
                                                )}
                                            </td>
                                            <td style={{ padding: '16px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
                                                    {log.error ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', fontSize: '12px' }}>
                                                            <AlertCircle size={14} />
                                                            <span style={{ fontWeight: 500 }}>Erro</span>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '12px', fontWeight: 500 }}>
                                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                                            Sucesso
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls - Standardized Style */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                                    Página {currentPage} de {totalPages} · {filteredLogs.length} logs
                                </span>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                                        disabled={currentPage === 1}
                                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-dim)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13, transition: 'all 0.2s' }}
                                    >
                                        <ChevronLeft style={{ width: 15, height: 15 }} /> Anterior
                                    </button>
                                    
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                        .reduce<(number | '...')[]>((acc, p, i, arr) => {
                                            if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                                            acc.push(p); return acc;
                                        }, [])
                                        .map((p, i) => p === '...' ? (
                                            <span key={`d${i}`} style={{ padding: '7px 4px', color: '#475569', fontSize: 13 }}>…</span>
                                        ) : (
                                            <button 
                                                key={p} 
                                                onClick={() => setCurrentPage(p as number)}
                                                style={{ 
                                                    width: 34, 
                                                    height: 34, 
                                                    borderRadius: 8, 
                                                    border: '1px solid', 
                                                    borderColor: p === currentPage ? '#3b82f6' : 'var(--border)', 
                                                    background: p === currentPage ? '#3b82f6' : 'transparent', 
                                                    color: p === currentPage ? '#fff' : 'var(--text-dim)', 
                                                    cursor: 'pointer', 
                                                    fontSize: 13, 
                                                    fontWeight: p === currentPage ? 600 : 400,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                        
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                                        disabled={currentPage === totalPages}
                                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-dim)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, transition: 'all 0.2s' }}
                                    >
                                        Próximo <ChevronRight style={{ width: 15, height: 15 }} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};


 
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { useTheme } from '../../core/contexts/ThemeContext';
import { Clock, Loader2, Info, Search, AlertCircle, ChevronLeft, ChevronRight, X, Database, ChevronDown } from 'lucide-react';
import DatePicker from '../../common/components/ui/DatePicker';

interface LogEntry {
    id: string;
    user_id: string;
    action: string;
    details: unknown;
    error: string | null;
    created_at: string;
    profiles?: {
        name: string;
        email: string;
        organization_id: string | null;
        organization_name: string | null;
    };
}

export const AdminLogs = () => {
    const { profile } = useUser();
    const { bgTheme } = useTheme();
    const userRole = profile.user_role;
    const userOrgId = profile.organization_id;

    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [searchUser, setSearchUser] = useState('');
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [organizations, setOrganizations] = useState<{id: string, name: string}[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const check = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
        check(mq);
        mq.addEventListener('change', check);
        return () => mq.removeEventListener('change', check);
    }, []);

    // Dropdown states
    const [isOrgOpen, setIsOrgOpen] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const orgRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (orgRef.current && !orgRef.current.contains(event.target as Node)) setIsOrgOpen(false);
            if (statusRef.current && !statusRef.current.contains(event.target as Node)) setIsStatusOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        
        let query = supabase
            .from('activity_logs')
            .select(`
                *,
                profiles!inner (name, email, organization_id, organization_name)
            `);
        
        // ISOLAMENTO: Apenas Owner vê logs de tudo. Gestor vê apenas sua org.
        if (userRole !== 'owner' && userOrgId) {
            query = query.eq('profiles.organization_id', userOrgId);
        }

        const result = await query
            .order('created_at', { ascending: false })
            .limit(500);
        
        if (result.data) {
            const data = result.data as LogEntry[];
            setLogs(data);

            // Extrair organizações únicas
            const orgs = data
                .filter(l => l.profiles?.organization_id)
                .reduce((acc: {id: string, name: string}[], l) => {
                    const orgId = l.profiles!.organization_id!;
                    if (!acc.find(o => o.id === orgId)) {
                        acc.push({
                            id: orgId,
                            name: l.profiles!.organization_name || `Org: ${orgId.slice(0, 5)}`
                        });
                    }
                    return acc;
                }, []);
            setOrganizations(orgs);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();  
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset page when filtering
    useEffect(() => {
        setCurrentPage(1);  
    }, [searchUser, selectedOrgId, startDate, endDate, statusFilter]);

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatRelativeTime = useCallback((iso: string) => {
        const now = Date.now();
        const date = new Date(iso).getTime();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'agora';
        if (diffMin < 60) return `há ${diffMin}min`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 6) return `há ${diffHour}h`;
        const today = new Date();
        const logDate = new Date(iso);
        if (logDate.toDateString() === today.toDateString()) return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        if (logDate.toDateString() === yesterday.toDateString()) return 'ontem';
        if (logDate.getFullYear() === today.getFullYear()) return logDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return logDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }, []);

    const clearFilters = () => {
        setStartDate('');
        setEndDate('');
        setSearchUser('');
        setSelectedOrgId('');
        setStatusFilter('');
        setCurrentPage(1);
    };

    

    const filteredLogs = logs.filter(l => {
        
        const matchesUser = searchUser === '' || 
            (l.profiles?.name || '').toLowerCase().includes(searchUser.toLowerCase()) || 
            (l.profiles?.email || '').toLowerCase().includes(searchUser.toLowerCase());
        
        const matchesOrg = !selectedOrgId || l.profiles?.organization_id === selectedOrgId;
        
        // Filtro de Status
        const matchesStatus = statusFilter === '' || 
            (statusFilter === 'success' && !l.error) || 
            (statusFilter === 'error' && !!l.error);

        // Filtro de Período
        const logDate = l.created_at.slice(0, 10); // YYYY-MM-DD
        const matchesStart = !startDate || logDate >= startDate;
        const matchesEnd = !endDate || logDate <= endDate;

        return matchesUser && matchesOrg && matchesStatus && matchesStart && matchesEnd;
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
            <style>{`
                .cs-container { position: relative; width: 220px; display: flex; align-items: center; gap: 12px; }
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
                .cs-item.active { background: var(--primary-light-bg); color: var(--primary); font-weight: 600; }
                .cs-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
                @keyframes csSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <Database size={isMobile ? 24 : 32} style={{ color: 'var(--primary)' }} />
                        <h1 style={{ fontSize: isMobile ? '22px' : '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            Logs de Atividade
                        </h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                        {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} encontrado{filteredLogs.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Standardized Filter Bar - Revised order and fields */}
            <div style={{ background: bgTheme === 'frequence' ? '#060d08' : 'var(--bg-main)', border: bgTheme === 'frequence' ? '1px solid rgba(34,197,94,0.15)' : '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', flex: 1 }}>
                    {/* Date Range Group - FIRST */}
                    {isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Período:</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>De:</span>
                                    <DatePicker compact value={startDate} onChange={val => { setStartDate(val); setCurrentPage(1); }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>Até:</span>
                                    <DatePicker compact value={endDate} onChange={val => { setEndDate(val); setCurrentPage(1); }} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Período:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>De:</span>
                                <DatePicker value={startDate} onChange={val => { setStartDate(val); setCurrentPage(1); }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>Até:</span>
                                <DatePicker value={endDate} onChange={val => { setEndDate(val); setCurrentPage(1); }} />
                            </div>
                        </div>
                    )}

                    {!isMobile && <div style={{ height: '24px', width: '1px', background: 'var(--border)', margin: '0 4px' }} />}

                    {!isMobile && <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Filtrar por:</span>}
                    
                    {/* Organization Selector - Apenas para Owner */}
                    {userRole === 'owner' && (
                        <div className="cs-container" ref={orgRef} style={{ width: 'auto', minWidth: isMobile ? '100%' : '240px', flexShrink: 0 }}>
                            <div className="cs-trigger" onClick={() => setIsOrgOpen(!isOrgOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                    <Database size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {organizations.find(o => o.id === selectedOrgId)?.name || 'Todas as Organizações'}
                                    </span>
                                </div>
                                <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isOrgOpen ? 'rotate(180deg)' : 'none', opacity: 0.6, flexShrink: 0 }} />
                            </div>

                            {isOrgOpen && (
                                <div className="cs-dropdown" style={{ ...(isMobile ? { left: 'auto', right: 0, maxWidth: 'calc(100vw - 32px)' } : {}) }}>
                                    <div 
                                        className={`cs-item ${selectedOrgId === '' ? 'active' : ''}`}
                                        onClick={() => { setSelectedOrgId(''); setIsOrgOpen(false); setCurrentPage(1); }}
                                    >
                                        <div className="cs-dot" style={{ background: 'var(--primary)' }} />
                                        Todas as Organizações
                                    </div>
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                                    {organizations.map(org => (
                                        <div 
                                            key={org.id} 
                                            className={`cs-item ${selectedOrgId === org.id ? 'active' : ''}`}
                                            onClick={() => { setSelectedOrgId(org.id); setIsOrgOpen(false); setCurrentPage(1); }}
                                        >
                                            <div className="cs-dot" style={{ background: '#10b981' }} />
                                            {org.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* User Search */}
                    <div style={{ position: 'relative', width: isMobile ? '100%' : '200px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input 
                            type="text"
                            placeholder="Usuário..."
                            value={searchUser}
                            onChange={e => { setSearchUser(e.target.value); setCurrentPage(1); }}
                            style={{ width: '100%', padding: '8px 12px 8px 34px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s' }}
                        />
                    </div>

                    {/* Status Filter - CUSTOM PREMIUM SELECT */}
                    <div className="cs-container" ref={statusRef} style={{ width: isMobile ? '100%' : '160px' }}>
                        <div className="cs-trigger" onClick={() => setIsStatusOpen(!isStatusOpen)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AlertCircle 
                                    size={14} 
                                    style={{ 
                                        color: statusFilter === 'success' ? '#10b981' : statusFilter === 'error' ? '#ef4444' : 'var(--primary)',
                                    }} 
                                />
                                <span>{statusFilter === 'success' ? 'Sucesso' : statusFilter === 'error' ? 'Erro' : 'Todos status'}</span>
                            </div>
                            <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isStatusOpen ? 'rotate(180deg)' : 'none', opacity: 0.6 }} />
                        </div>

                        {isStatusOpen && (
                            <div className="cs-dropdown" style={{ minWidth: '150px', ...(isMobile ? { left: 'auto', right: 0, maxWidth: 'calc(100vw - 32px)' } : {}) }}>
                                <div 
                                    className={`cs-item ${statusFilter === '' ? 'active' : ''}`}
                                    onClick={() => { setStatusFilter(''); setIsStatusOpen(false); setCurrentPage(1); }}
                                >
                                    <div className="cs-dot" style={{ background: 'var(--primary)' }} />
                                    Todos status
                                </div>
                                <div 
                                    className={`cs-item ${statusFilter === 'success' ? 'active' : ''}`}
                                    onClick={() => { setStatusFilter('success'); setIsStatusOpen(false); setCurrentPage(1); }}
                                >
                                    <div className="cs-dot" style={{ background: '#10b981' }} />
                                    Sucesso
                                </div>
                                <div 
                                    className={`cs-item ${statusFilter === 'error' ? 'active' : ''}`}
                                    onClick={() => { setStatusFilter('error'); setIsStatusOpen(false); setCurrentPage(1); }}
                                >
                                    <div className="cs-dot" style={{ background: '#ef4444' }} />
                                    Erro
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: isMobile ? '4px' : '8px' }}>
                    {(searchUser || selectedOrgId || statusFilter || startDate || endDate) && (
                        <button 
                            onClick={clearFilters}
                            style={{ background: 'transparent', border: '1px solid var(--error-border)', borderRadius: 8, padding: '8px 14px', color: 'var(--text-error)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <X size={14} /> Limpar
                        </button>
                    )}
                </div>
                <button 
                    onClick={fetchLogs}
                        style={{ 
                            padding: isMobile ? '10px 14px' : '10px 20px', 
                            borderRadius: '10px', 
                            background: 'var(--primary)', 
                            border: 'none', 
                            color: '#fff', 
                            fontSize: '13px', 
                            fontWeight: 700, 
                            cursor: 'pointer', 
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.3)',
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
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(var(--primary-rgb), 0.3)';
                        }}
                    >
                        Atualizar
                    </button>
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                {filteredLogs.length === 0 ? (
                    <div style={{ padding: isMobile ? '32px 16px' : '64px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        <Info size={isMobile ? 28 : 40} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p style={{ fontSize: '16px' }}>Nenhum log encontrado para os critérios selecionados.</p>
                    </div>
                ) : isMobile ? (
                    <>
                        {paginatedLogs.map(log => (
                            <div key={log.id} onClick={() => setSelectedLog(log)}
                                style={{ cursor: 'pointer', padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', transition: 'background 0.15s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        {formatRelativeTime(log.created_at)}
                                    </span>
                                    <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {log.profiles?.name || 'Sistema'}
                                    </span>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: log.error ? '#ef4444' : '#10b981', flexShrink: 0 }} />
                                </div>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'var(--primary-light-bg)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}>
                                    {log.action}
                                </span>
                            </div>
                        ))}
                    </>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                                                    <span style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: 13 }}>{log.profiles?.name || 'Sistema'}</span>
                                                    <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{log.profiles?.email}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'left', verticalAlign: 'middle' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'var(--primary-light-bg)', color: 'var(--primary)', border: '1px solid var(--primary-border)', textTransform: 'uppercase' }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle', textAlign: 'left' }}>
                                                {typeof log.details === 'object' && log.details !== null ? (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                        {Object.entries(log.details).map(([k, v]) => (
                                                            <span key={k} style={{ padding: '2px 6px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '10px', whiteSpace: 'nowrap' }}>
                                                                <strong style={{ opacity: 0.7 }}>{k}:</strong> {String(v)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                                        {String(log.details || '-')}
                                                    </span>
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
                    </>
                )}
            {/* No closing </div> here — pagination is inside the same container */}

            {/* Pagination Controls — inside the table container for border-radius */}
            {totalPages > 1 && (
                <div style={{ 
                    display: 'flex', flexDirection: isMobile ? 'column' : 'row', 
                    alignItems: 'center', justifyContent: 'space-between', 
                    padding: isMobile ? '12px 14px' : '14px 20px', 
                    borderTop: '1px solid var(--border)',
                    background: bgTheme === 'frequence' ? '#060d08' : 'var(--bg-card)', 
                    gap: isMobile ? '8px' : 0 
                }}>
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                        Página {currentPage} de {totalPages} · {filteredLogs.length} logs
                    </span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                            disabled={currentPage === 1}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: isMobile ? '10px 12px' : '7px 14px', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-dim)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13, transition: 'all 0.2s' }}
                        >
                            <ChevronLeft style={{ width: 15, height: 15 }} /> {!isMobile && 'Anterior'}
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
                                        width: isMobile ? 30 : 34, 
                                        height: isMobile ? 30 : 34, 
                                        borderRadius: 8, 
                                        border: '1px solid', 
                                        borderColor: p === currentPage ? 'var(--primary)' : 'var(--border)', 
                                        background: p === currentPage ? 'var(--primary)' : 'transparent', 
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
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: isMobile ? '10px 12px' : '7px 14px', color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-dim)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, transition: 'all 0.2s' }}
                        >
                            {!isMobile && 'Próximo'} <ChevronRight style={{ width: 15, height: 15 }} />
                        </button>
                </div>
            </div>
            )}
            </div>{/* closes table container */}
            {/* Detail Board Modal */}
            {selectedLog && (
                <div onClick={() => setSelectedLog(null)}
                    style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                    <div onClick={e => e.stopPropagation()}
                        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 500, background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', padding: '16px 24px 32px', boxShadow: '0 -8px 32px rgba(0,0,0,0.3)', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 12px' }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                            <button onClick={() => setSelectedLog(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'var(--text-dim)' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Data/Hora */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '12px 14px', background: 'var(--bg-main)', borderRadius: 10, border: '1px solid var(--border)' }}>
                            <Clock size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                            <span style={{ color: 'var(--text-main)', fontSize: 13, fontWeight: 500 }}>{formatDate(selectedLog.created_at)}</span>
                        </div>

                        {/* Usuário */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Usuário</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-main)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                    {(selectedLog.profiles?.name || 'Sistema')[0].toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: 14 }}>{selectedLog.profiles?.name || 'Sistema'}</div>
                                    {selectedLog.profiles?.email && (
                                        <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{selectedLog.profiles.email}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Ação */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Ação</div>
                            <div style={{ padding: '12px 14px', background: 'var(--bg-main)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'var(--primary-light-bg)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}>
                                    {selectedLog.action}
                                </span>
                            </div>
                        </div>

                        {/* Status + Erro */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Status</div>
                            <div style={{ padding: '12px 14px', background: 'var(--bg-main)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                {selectedLog.error ? (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', marginBottom: 8 }}>
                                            <AlertCircle size={16} />
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>Erro</span>
                                        </div>
                                        <div style={{ color: '#ef4444', fontSize: 12, background: 'rgba(239,68,68,0.06)', padding: '8px 10px', borderRadius: 6, wordBreak: 'break-word', lineHeight: 1.4 }}>
                                            {selectedLog.error}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>Sucesso</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Detalhes */}
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Detalhes</div>
                            <div style={{ padding: '12px 14px', background: 'var(--bg-main)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                {selectedLog.details === null || selectedLog.details === undefined ? (
                                    <span style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>—</span>
                                ) : typeof selectedLog.details === 'object' ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {Object.entries(selectedLog.details).map(([k, v]) => (
                                            <span key={k} style={{ padding: '4px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>
                                                <strong style={{ opacity: 0.7 }}>{k}:</strong> {String(v)}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span style={{ color: 'var(--text-main)', fontSize: 13, wordBreak: 'break-all' }}>{String(selectedLog.details)}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

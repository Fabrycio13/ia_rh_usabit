/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
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
                .cs-item.active { background: rgba(59, 130, 246, 0.15); color: #3b82f6; font-weight: 600; }
                .cs-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
                @keyframes csSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <Database size={32} style={{ color: 'var(--primary)' }} />
                        <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            Logs de Atividade
                        </h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
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
                            <DatePicker 
                                value={startDate} 
                                onChange={val => { setStartDate(val); setCurrentPage(1); }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>Até:</span>
                            <DatePicker 
                                value={endDate} 
                                onChange={val => { setEndDate(val); setCurrentPage(1); }}
                            />
                        </div>
                    </div>

                    <div style={{ height: '24px', width: '1px', background: 'var(--border)', margin: '0 4px' }} />

                    <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Filtrar por:</span>
                    
                    {/* Organization Selector - Apenas para Owner */}
                    {userRole === 'owner' && (
                        <div className="cs-container" ref={orgRef} style={{ width: 'auto', minWidth: '240px', flexShrink: 0 }}>
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
                                <div className="cs-dropdown">
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

                    {/* Status Filter - CUSTOM PREMIUM SELECT */}
                    <div className="cs-container" ref={statusRef} style={{ width: '160px' }}>
                        <div className="cs-trigger" onClick={() => setIsStatusOpen(!isStatusOpen)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AlertCircle 
                                    size={14} 
                                    style={{ 
                                        color: statusFilter === 'success' ? '#10b981' : statusFilter === 'error' ? '#ef4444' : '#3b82f6',
                                    }} 
                                />
                                <span>{statusFilter === 'success' ? 'Sucesso' : statusFilter === 'error' ? 'Erro' : 'Todos status'}</span>
                            </div>
                            <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isStatusOpen ? 'rotate(180deg)' : 'none', opacity: 0.6 }} />
                        </div>

                        {isStatusOpen && (
                            <div className="cs-dropdown" style={{ minWidth: '150px' }}>
                                <div 
                                    className={`cs-item ${statusFilter === '' ? 'active' : ''}`}
                                    onClick={() => { setStatusFilter(''); setIsStatusOpen(false); setCurrentPage(1); }}
                                >
                                    <div className="cs-dot" style={{ background: '#3b82f6' }} />
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

                <div style={{ display: 'flex', gap: 8 }}>
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


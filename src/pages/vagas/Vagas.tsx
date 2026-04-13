import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../core/contexts/LangContext';
import { supabase } from '../../core/services/supabase';
import { Briefcase, Plus, Search, Filter, Edit, Trash2, Eye, ExternalLink, ChevronDown, Users, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';

type VagaStatus = 'aberta' | 'fechada' | 'pausada';

interface Vaga {
    id: string;
    title: string;
    public_hash: string;
    is_active: boolean;
    is_accepting_applications: boolean;
    location: string | null;
    contract_type: string | null;
    application_count: number;
    created_at: string;
}

export const Vagas = () => {
    const { t } = useLang();
    const navigate = useNavigate();
    const [vagas, setVagas] = useState<Vaga[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [openStatusId, setOpenStatusId] = useState<string | null>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [vagaToDelete, setVagaToDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const statusBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    useEffect(() => {
        const fetchVagas = async () => {
            try {
                const { data, error } = await supabase
                    .from('vagas_white_label')
                    .select('id, title, public_hash, is_active, is_accepting_applications, location, contract_type, application_count, created_at')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setVagas(data || []);
            } catch (err) {
                console.error('Erro ao buscar vagas:', err);
                toast.error('Erro ao carregar vagas');
            } finally {
                setLoading(false);
            }
        };

        fetchVagas();
    }, []);

    const openDeleteModal = (id: string) => {
        setVagaToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!vagaToDelete) return;
        setDeleting(true);

        try {
            // Soft delete: apenas desativa a vaga ao invés de excluir
            const { error } = await supabase
                .from('vagas_white_label')
                .update({ is_active: false })
                .eq('id', vagaToDelete);

            if (error) throw error;

            setVagas(prev => prev.filter(v => v.id !== vagaToDelete));
            toast.success('Vaga desativada com sucesso');
        } catch (err) {
            console.error('Erro ao desativar vaga:', err);
            toast.error('Erro ao desativar vaga');
        } finally {
            setDeleting(false);
            setDeleteModalOpen(false);
            setVagaToDelete(null);
        }
    };

    const cancelDelete = () => {
        setDeleteModalOpen(false);
        setVagaToDelete(null);
    };

    const updateVagaStatus = async (id: string, status: VagaStatus) => {
        try {
            const updates = {
                is_active: status !== 'pausada',
                is_accepting_applications: status === 'aberta',
            };

            const { error } = await supabase
                .from('vagas_white_label')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            setVagas(prev => prev.map(v =>
                v.id === id ? { ...v, ...updates } : v
            ));

            const statusLabels = { aberta: 'Aberta', fechada: 'Fechada', pausada: 'Pausada' };
            toast.success(`Status alterado para "${statusLabels[status]}"`);
            setOpenStatusId(null);
        } catch (err) {
            console.error('Erro ao atualizar status:', err);
            toast.error('Erro ao atualizar status');
        }
    };

    const getStatusFromVaga = (vaga: Vaga): VagaStatus => {
        if (!vaga.is_active) return 'pausada';
        if (!vaga.is_accepting_applications) return 'fechada';
        return 'aberta';
    };

    const getStatusConfig = (status: VagaStatus) => {
        switch (status) {
            case 'aberta':
                return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', label: 'Aberta' };
            case 'fechada':
                return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Fechada' };
            case 'pausada':
                return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Pausada' };
        }
    };

    const getContractTypeLabel = (type: string | null) => {
        const labels: Record<string, string> = {
            clt: 'CLT',
            pj: 'PJ',
            estagio: 'Estágio',
            freelancer: 'Freelancer'
        };
        return type ? labels[type] || type : '-';
    };

    const copyPublicLink = (hash: string) => {
        const url = `${window.location.origin}/v/${hash}`;
        navigator.clipboard.writeText(url);
        toast.success('Link copiado!');
    };

    const filteredVagas = vagas.filter(vaga =>
        vaga.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vaga.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vaga.contract_type || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="text-[var(--text-main)]">
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                    <Briefcase size={32} style={{ color: 'var(--primary)' }} />
                    <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        {t('vagas')}
                    </h1>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                    Gerencie suas vagas e publique novas oportunidades
                </p>
            </div>

            {/* Actions Bar */}
            <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '24px',
                flexWrap: 'wrap'
            }}>
                {/* Search */}
                <div style={{
                    flex: '1',
                    minWidth: '250px',
                    position: 'relative'
                }}>
                    <Search size={18} style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                    }} />
                    <input
                        type="text"
                        placeholder="Buscar vagas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 16px 12px 40px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            color: 'var(--text-main)',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Filter Button */}
                <button style={{
                    padding: '12px 20px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: 500
                }}>
                    <Filter size={16} />
                    Filtros
                </button>

                {/* Create New Vaga */}
                <button
                    onClick={() => navigate('/vagas/nova')}
                    style={{
                        padding: '12px 24px',
                        background: 'var(--primary)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#4f46e5'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
                >
                    <Plus size={16} />
                    Nova Vaga
                </button>
            </div>

            {/* Vagas List */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                overflow: 'hidden'
            }}>
                {loading ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>Carregando vagas...</p>
                    </div>
                ) : filteredVagas.length === 0 ? (
                    <div style={{
                        padding: '60px 20px',
                        textAlign: 'center',
                        color: 'var(--text-muted)'
                    }}>
                        <Briefcase size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p style={{ fontSize: '16px', marginBottom: '8px' }}>Nenhuma vaga encontrada</p>
                        <p style={{ fontSize: '14px' }}>Crie uma nova vaga para começar</p>
                    </div>
                ) : (
                    <div>
                        {/* Table Header */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 160px',
                            padding: '16px 24px',
                            borderBottom: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            fontSize: '12px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            <div>Título</div>
                            <div>Localização</div>
                            <div style={{ textAlign: 'center' }}>Tipo</div>
                            <div style={{ textAlign: 'center' }}>Candidaturas</div>
                            <div style={{ textAlign: 'center' }}>Status</div>
                            <div style={{ textAlign: 'center' }}>Link</div>
                            <div style={{ textAlign: 'center' }}>Ações</div>
                        </div>

                        {/* Table Rows */}
                        {filteredVagas.map((vaga) => {
                            const currentStatus = getStatusFromVaga(vaga);
                            const statusConfig = getStatusConfig(currentStatus);
                            const isStatusOpen = openStatusId === vaga.id;

                            return (
                                <div
                                    key={vaga.id}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 160px',
                                        padding: '16px 24px',
                                        borderBottom: '1px solid var(--border)',
                                        alignItems: 'center',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                                        {vaga.title}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                        {vaga.location || '-'}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                                        {getContractTypeLabel(vaga.contract_type)}
                                    </div>
                                    <div
                                        onClick={() => navigate(`/vagas/${vaga.id}/candidatos`)}
                                        style={{ color: 'var(--primary)', fontSize: '14px', textAlign: 'center', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        {vaga.application_count}
                                    </div>

                                    {/* Status Dropdown */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                        <button
                                            ref={(el) => { statusBtnRefs.current[vaga.id] = el; }}
                                            onClick={() => {
                                                if (isStatusOpen) {
                                                    setOpenStatusId(null);
                                                    setDropdownPos(null);
                                                } else {
                                                    const btn = statusBtnRefs.current[vaga.id];
                                                    if (btn) {
                                                        const rect = btn.getBoundingClientRect();
                                                        setDropdownPos({
                                                            top: rect.bottom + 8,
                                                            left: rect.left + rect.width / 2,
                                                        });
                                                    }
                                                    setOpenStatusId(vaga.id);
                                                }
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '4px 10px',
                                                background: statusConfig.bg,
                                                border: `1px solid ${statusConfig.color}33`,
                                                borderRadius: '12px',
                                                color: statusConfig.color,
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {statusConfig.label}
                                            <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: isStatusOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                        </button>
                                    </div>

                                    {/* Link Button */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => copyPublicLink(vaga.public_hash)}
                                            title="Copiar link público"
                                            style={{
                                                padding: '6px',
                                                background: 'transparent',
                                                border: '1px solid var(--border)',
                                                borderRadius: '6px',
                                                color: 'var(--primary)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                                        <button
                                            onClick={() => navigate(`/v/${vaga.public_hash}`)}
                                            title="Visualizar vaga"
                                            style={{
                                                padding: '6px',
                                                background: 'transparent',
                                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                                borderRadius: '6px',
                                                color: '#3b82f6',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <button
                                            onClick={() => navigate(`/vagas/${vaga.id}/candidatos`)}
                                            title="Ver candidatos"
                                            style={{
                                                padding: '6px',
                                                background: 'transparent',
                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                borderRadius: '6px',
                                                color: '#10b981',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Users size={14} />
                                        </button>
                                        <button
                                            onClick={() => navigate(`/vagas/editar/${vaga.id}`)}
                                            title="Editar"
                                            style={{
                                                padding: '6px',
                                                background: 'transparent',
                                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                                borderRadius: '6px',
                                                color: '#f59e0b',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => openDeleteModal(vaga.id)}
                                            title="Excluir"
                                            style={{
                                                padding: '6px',
                                                background: 'transparent',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                borderRadius: '6px',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Global Status Dropdown — position:fixed escapes overflow:hidden */}
            {openStatusId && dropdownPos && (() => {
                const vaga = vagas.find(v => v.id === openStatusId);
                if (!vaga) return null;
                const currentStatus = getStatusFromVaga(vaga);
                return (
                    <>
                        <div
                            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                            onClick={() => { setOpenStatusId(null); setDropdownPos(null); }}
                        />
                        <div style={{
                            position: 'fixed',
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            transform: 'translateX(-50%)',
                            background: '#1a1c2d',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            padding: '6px',
                            zIndex: 50,
                            minWidth: '140px',
                            boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.5)'
                        }}>
                            {(['aberta', 'fechada', 'pausada'] as VagaStatus[]).map((status) => {
                                const config = getStatusConfig(status);
                                return (
                                    <button
                                        key={status}
                                        onClick={() => updateVagaStatus(vaga.id, status)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            width: '100%',
                                            padding: '8px 12px',
                                            background: currentStatus === status ? config.bg : 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: config.color,
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = config.bg}
                                        onMouseLeave={(e) => {
                                            if (currentStatus !== status) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: config.color }} />
                                        {config.label}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                );
            })()}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: '#1a1c2d',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '32px',
                        maxWidth: '420px',
                        width: '90%',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        {/* Close Button */}
                        <button
                            onClick={cancelDelete}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={20} />
                        </button>

                        {/* Icon */}
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <AlertTriangle size={28} style={{ color: '#ef4444' }} />
                        </div>

                        {/* Title */}
                        <h3 style={{
                            color: 'var(--text-main)',
                            fontSize: '20px',
                            fontWeight: 700,
                            textAlign: 'center',
                            margin: '0 0 8px'
                        }}>
                            Desativar Vaga?
                        </h3>

                        {/* Description */}
                        <p style={{
                            color: 'var(--text-muted)',
                            fontSize: '14px',
                            textAlign: 'center',
                            lineHeight: 1.6,
                            margin: '0 0 24px'
                        }}>
                            A vaga será desativada e não aparecerá mais publicamente. Os dados e candidaturas serão mantidos no sistema.
                        </p>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={cancelDelete}
                                disabled={deleting}
                                style={{
                                    flex: 1,
                                    padding: '12px 20px',
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    color: 'var(--text-main)',
                                    cursor: deleting ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    opacity: deleting ? 0.5 : 1
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                style={{
                                    flex: 1,
                                    padding: '12px 20px',
                                    background: deleting ? '#991b1b' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#fff',
                                    cursor: deleting ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                }}
                            >
                                {deleting ? 'Desativando...' : 'Sim, Desativar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

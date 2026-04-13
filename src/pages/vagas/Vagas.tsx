import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../core/contexts/LangContext';
import { Briefcase, Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react';

interface Vaga {
    id: string;
    title: string;
    department: string;
    location: string;
    type: string;
    status: 'open' | 'closed' | 'draft';
    created_at: string;
}

export const Vagas = () => {
    const { t } = useLang();
    const navigate = useNavigate();
    const [vagas, setVagas] = useState<Vaga[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // TODO: Fetch vagas from Supabase
        // For now, using mock data
        setVagas([
            {
                id: '1',
                title: 'Desenvolvedor Frontend',
                department: 'Tecnologia',
                location: 'São Paulo, SP',
                type: 'CLT',
                status: 'open',
                created_at: '2026-04-01',
            },
            {
                id: '2',
                title: 'Analista de RH',
                department: 'Recursos Humanos',
                location: 'Remoto',
                type: 'CLT',
                status: 'open',
                created_at: '2026-04-05',
            },
        ]);
    }, []);

    const filteredVagas = vagas.filter(vaga =>
        vaga.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vaga.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vaga.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: Vaga['status']) => {
        switch (status) {
            case 'open':
                return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', label: 'Aberta' };
            case 'closed':
                return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Fechada' };
            case 'draft':
                return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Rascunho' };
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '40px' }}>
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
                {filteredVagas.length === 0 ? (
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
                            gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 120px',
                            padding: '16px 24px',
                            borderBottom: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            fontSize: '12px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            <div>Título</div>
                            <div>Departamento</div>
                            <div>Localização</div>
                            <div>Tipo</div>
                            <div>Status</div>
                            <div>Ações</div>
                        </div>

                        {/* Table Rows */}
                        {filteredVagas.map((vaga) => {
                            const statusConfig = getStatusColor(vaga.status);
                            return (
                                <div
                                    key={vaga.id}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 120px',
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
                                        {vaga.department}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                        {vaga.location}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                        {vaga.type}
                                    </div>
                                    <div>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '4px 12px',
                                            background: statusConfig.bg,
                                            color: statusConfig.color,
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: 600
                                        }}>
                                            {statusConfig.label}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            title="Visualizar"
                                            style={{
                                                padding: '6px',
                                                background: 'transparent',
                                                border: '1px solid var(--border)',
                                                borderRadius: '6px',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <button
                                            title="Editar"
                                            style={{
                                                padding: '6px',
                                                background: 'transparent',
                                                border: '1px solid var(--border)',
                                                borderRadius: '6px',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
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
        </div>
    );
};

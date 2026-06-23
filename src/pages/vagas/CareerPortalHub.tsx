import { useState, useEffect, type JSX } from 'react';

import { useUser } from '../../core/contexts/UserContext';
import {
    Copy,
    ExternalLink,
    Briefcase,
    User,
    Users,
    Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Vagas } from './Vagas';
import { PoolTalentos } from './PoolTalentos';
import { Analises } from '../analysis/Analises';

import { useSearchParams } from 'react-router-dom';

const tabCss = `
@keyframes tabIconBounce { 0%{transform:scale(1)} 40%{transform:scale(1.3) rotate(-8deg)} 70%{transform:scale(1.15) rotate(4deg)} 100%{transform:scale(1)} }
.tab-btn:hover .tab-ico { animation: tabIconBounce 0.4s ease forwards; }
`;

type TabId = 'vagas' | 'pool' | 'analises';

const tabConfig: { id: TabId; label: string; icon: typeof Briefcase }[] = [
    { id: 'vagas', label: 'Gestão de Vagas', icon: Briefcase },
    { id: 'pool', label: 'Pool de Talentos', icon: Users },
    { id: 'analises', label: 'Análises', icon: Activity },
];

export const CareerPortalHub = () => {
    const { profile } = useUser();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab') as TabId | null;
    const isConvidado = profile.user_role === 'convidado';
    const visibleTabs = isConvidado
        ? tabConfig.filter(t => t.id === 'vagas')
        : tabConfig;
    const [activeTab, setActiveTab] = useState<TabId>(
        tabFromUrl && tabConfig.some(t => t.id === tabFromUrl) && (!isConvidado || tabFromUrl === 'vagas') ? tabFromUrl : 'vagas'
    );

    useEffect(() => {
        const current = searchParams.get('tab') as TabId | null;
        if (current !== activeTab) {
            setSearchParams({ tab: activeTab }, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const copyPortalLink = () => {
        const url = `${window.location.origin}${window.location.pathname}#/carreiras/${profile.organization_id}`;
        navigator.clipboard.writeText(url);
        toast.success('Link do portal copiado!');
    };

    const showPortalActions = (activeTab === 'vagas' || activeTab === 'pool') && !isConvidado;

    return (
        <div style={{ width: '100%' }}>
            <style>{tabCss}</style>
            {/* Header Area */}
            {(() => {
                const current = tabConfig.find(t => t.id === activeTab)!;
                const title = current.label;
                const subtitles: Record<TabId, string> = {
                    vagas: 'Gerencie suas oportunidades e personalize seu portal de carreiras.',
                    pool: 'Currículos recebidos sem vaga específica',
                    analises: 'Acompanhe e gerencie as análises de currículos realizadas.',
                };
                const iconMap: Record<TabId, JSX.Element> = {
                    vagas: <Briefcase size={32} />,
                    pool: <User size={32} />,
                    analises: <Activity size={32} />,
                };

                return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--primary)' }}>{iconMap[activeTab]}</span>
                                <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{title}</h1>
                            </div>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginTop: '6px' }}>{subtitles[activeTab]}</p>
                        </div>
                        {showPortalActions && (
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={copyPortalLink}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
                                >
                                    <Copy size={16} /> Link do Portal
                                </button>
                                <a
                                    href={`#/carreiras/${profile.organization_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
                                >
                                    <ExternalLink size={16} /> Ver Portal Público
                                </a>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
                {visibleTabs.map(tab => {
                    const active = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className="tab-btn"
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '12px 24px',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: active ? 'var(--primary)' : 'var(--text-dim)',
                                borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: 'none',
                                borderTop: 'none',
                                borderLeft: 'none',
                                borderRight: 'none',
                                outline: 'none',
                                position: 'relative'
                            }}
                        >
                            <Icon className="tab-ico" size={18} style={{ flexShrink: 0 }} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'vagas' ? (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <Vagas hideHeader={true} />
                </div>
            ) : activeTab === 'pool' ? (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <PoolTalentos />
                </div>
            ) : (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <Analises hideHeader={true} />
                </div>
            )}
        </div>
    );
};

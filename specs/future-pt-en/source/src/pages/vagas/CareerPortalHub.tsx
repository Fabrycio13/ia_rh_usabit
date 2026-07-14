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
    const isOwner = profile.user_role === 'owner';
    const visibleTabs = tabConfig.filter(t => {
        if (t.id === 'vagas') return true;
        if (t.id === 'pool') return !isConvidado;
        if (t.id === 'analises') return isOwner;
        return false;
    });
    const [activeTab, setActiveTab] = useState<TabId>(
        tabFromUrl && visibleTabs.some(t => t.id === tabFromUrl) ? tabFromUrl : 'vagas'
    );
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const check = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
        check(mq);
        mq.addEventListener('change', check);
        return () => mq.removeEventListener('change', check);
    }, []);

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
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', gap: isMobile ? '16px' : '0', marginBottom: isMobile ? '20px' : '32px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--primary)' }}>{iconMap[activeTab]}</span>
                                <h1 style={{ fontSize: isMobile ? '22px' : '32px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{title}</h1>
                            </div>
                            <p style={{ color: 'var(--text-dim)', fontSize: isMobile ? '13px' : '14px', marginTop: '6px' }}>{subtitles[activeTab]}</p>
                        </div>
                        {showPortalActions && (
                            <div style={{ display: 'flex', gap: '10px', flexDirection: 'row', flexWrap: 'wrap' }}>
                                <button
                                    onClick={copyPortalLink}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, minHeight: isMobile ? '44px' : 'auto', flex: isMobile ? '1 1 calc(50% - 5px)' : 'auto' }}
                                >
                                    <Copy size={16} /> {isMobile ? 'Copiar' : 'Link do Portal'}
                                </button>
                                <a
                                    href={`#/carreiras/${profile.organization_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, textDecoration: 'none', minHeight: isMobile ? '44px' : 'auto', flex: isMobile ? '1 1 calc(50% - 5px)' : 'auto' }}
                                >
                                    <ExternalLink size={16} /> {isMobile ? 'Portal Público' : 'Ver Portal Público'}
                                </a>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: isMobile ? '20px' : '32px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
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
                                padding: isMobile ? '10px 16px' : '12px 24px',
                                fontSize: isMobile ? '13px' : '14px',
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
                                position: 'relative',
                                whiteSpace: 'nowrap',
                                minHeight: isMobile ? '44px' : 'auto'
                            }}
                        >
                            <Icon className="tab-ico" size={isMobile ? 16 : 18} style={{ flexShrink: 0 }} />
                            {isMobile && tab.id === 'vagas' ? 'Vagas' : isMobile && tab.id === 'pool' ? 'Talentos' : tab.label}
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

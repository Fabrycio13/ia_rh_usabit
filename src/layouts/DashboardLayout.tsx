import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ChatWidget } from './ChatWidget';
import { useUser } from '../core/contexts/UserContext';
import { useTheme } from '../core/contexts/ThemeContext';
import { hasPermission } from '../core/config/permissions';
import { SpaceBackground } from '../common/components/ui/SpaceBackground';
import { SpatialBackground } from '../common/components/ui/SpatialBackground';
import { Menu, X } from 'lucide-react';

export const DashboardLayout = () => {
    const { profile } = useUser();
    const { bgTheme } = useTheme();
    const [isChatOpen, setIsChatOpen] = React.useState(false);
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);
    const location = useLocation();

    React.useEffect(() => {
        setIsMobileOpen(false);
    }, [location]);

    return (
        <div className="dl-root" style={{ display: 'flex', width: '100vw', height: '100vh', position: 'relative', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
            <style>{`
                @media (max-width: 767px) {
                    .dl-sidebar-wrap {
                        position: fixed !important;
                        top: 10px !important;
                        left: 0 !important;
                        height: calc(100vh - 20px) !important;
                        z-index: 40 !important;
                        transform: translateX(-110%);
                        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        padding: 0 0 0 10px !important;
                    }
                    .dl-sidebar-wrap.open {
                        transform: translateX(0);
                    }
                    .dl-backdrop {
                        display: block !important;
                        position: fixed;
                        inset: 0;
                        background: rgba(0,0,0,0.5);
                        z-index: 39;
                    }
                    .dl-hamburger {
                        display: flex !important;
                    }
                    .dl-main-wrap {
                        padding: 0 !important;
                        gap: 0 !important;
                    }
                    .dl-main-inner {
                        padding: 16px 16px 60px !important;
                    }
                    .dl-chat-col {
                        display: none !important;
                    }
                }
                @media (min-width: 768px) {
                    .dl-hamburger { display: none !important; }
                    .dl-backdrop { display: none !important; }
                }
            `}</style>
            {bgTheme === 'planets' && <SpaceBackground />}
            {bgTheme === 'spatial' && <SpatialBackground />}
            
            {/* Hamburguer — only visible on mobile via CSS */}
            <button
                className="dl-hamburger"
                onClick={() => setIsMobileOpen(o => !o)}
                style={{
                    position: 'fixed',
                    top: 16,
                    left: 16,
                    zIndex: 45,
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                }}
            >
                {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Backdrop — only visible on mobile when drawer open */}
            {isMobileOpen && <div className="dl-backdrop" onClick={() => setIsMobileOpen(false)} />}

            <div className="dl-main-wrap" style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%', height: '100%', padding: '10px', gap: '10px', boxSizing: 'border-box' }}>
                {/* Floating sidebar wrapper */}
                <div className={`dl-sidebar-wrap${isMobileOpen ? ' open' : ''}`} style={{ flexShrink: 0, height: '100%', display: 'flex' }}>
                    <Sidebar onToggleChat={() => setIsChatOpen(!isChatOpen)} />
                </div>
                <div className="dl-chat-col" style={{ flex: 1, display: 'flex', minWidth: 0, height: '100%' }}>
                    <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }} className="custom-scrollbar hide-scrollbar">
                        <div className="dl-main-inner" style={{ padding: '30px 30px 60px', width: '100%', boxSizing: 'border-box' }}>
                            <Outlet />
                        </div>
                    </main>
                    {hasPermission(profile.user_role, 'chat_widget') && (
                        <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
                    )}
                </div>
            </div>
        </div>
    );
};

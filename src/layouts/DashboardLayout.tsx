import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ChatWidget } from './ChatWidget';
import { useUser } from '../core/contexts/UserContext';
import { useTheme } from '../core/contexts/ThemeContext';
import { hasPermission } from '../core/config/permissions';
import { SpaceBackground } from '../common/components/ui/SpaceBackground';
import { SpatialBackground } from '../common/components/ui/SpatialBackground';
import { PanelLeft } from 'lucide-react';

export const DashboardLayout = () => {
    const { profile } = useUser();
    const { bgTheme } = useTheme();
    const [isChatOpen, setIsChatOpen] = React.useState(false);
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(false);
    const location = useLocation();

    React.useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    React.useEffect(() => {
        setIsMobileOpen(false);
        setIsChatOpen(false);
    }, [location]);

    const hamburgerVisible = isMobile;
    const showBackdrop = isMobile && isMobileOpen;

    const sidebarMobile: React.CSSProperties = {
        position: 'fixed',
        top: 10,
        left: 0,
        height: 'calc(100vh - 20px)',
        zIndex: 40,
        transform: isMobileOpen ? 'translateX(0)' : 'translateX(-110%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '0 0 0 10px',
        display: 'flex',
    };

    const sidebarDesktop: React.CSSProperties = {
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        padding: '10px 0 10px 10px',
        boxSizing: 'border-box',
    };

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', position: 'relative', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
            {bgTheme === 'planets' && <SpaceBackground />}
            {bgTheme === 'spatial' && <SpatialBackground />}
            
            {hamburgerVisible && (
                <button
                    onClick={() => setIsMobileOpen(o => !o)}
                    style={{
                        display: 'flex',
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
                    <PanelLeft size={20} style={{ transform: isMobileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                </button>
            )}

            {showBackdrop && (
                <div
                    onClick={() => setIsMobileOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 39,
                    }}
                />
            )}

            {/* Sidebar — RENDERED AT ROOT LEVEL (outside z-index:1 container) */}
            <div style={isMobile ? sidebarMobile : sidebarDesktop}>
                <Sidebar onToggleChat={() => { setIsChatOpen(o => !o); if (isMobile) setIsMobileOpen(false); }} hideToggle={isMobile} />
            </div>

            {/* Main content — sidebar is a sibling, not parent */}
            <div style={{
                position: 'relative',
                zIndex: 1,
                flex: 1,
                display: 'flex',
                minWidth: 0,
                height: '100%',
                padding: isMobile ? '0' : '10px 10px 10px 0',
                gap: isMobile ? '0' : '10px',
                boxSizing: 'border-box',
            }}>
                <div style={{ flex: 1, display: 'flex', minWidth: 0, height: '100%' }}>
                    <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }} className="custom-scrollbar hide-scrollbar">
                        <div style={{
                            padding: isMobile ? '16px 16px 60px' : '30px 30px 60px',
                            width: '100%',
                            boxSizing: 'border-box',
                        }}>
                            <Outlet />
                        </div>
                    </main>
                    {hasPermission(profile.user_role, 'chat_widget') && (
                        isMobile ? (
                            isChatOpen && <ChatWidget isOpen={true} onClose={() => setIsChatOpen(false)} fullScreen />
                        ) : (
                            <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

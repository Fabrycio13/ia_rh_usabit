import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ChatWidget } from './ChatWidget';
import { useUser } from '../core/contexts/UserContext';
import { useTheme } from '../core/contexts/ThemeContext';
import { hasPermission } from '../core/config/permissions';
import { SpaceBackground } from '../common/components/ui/SpaceBackground';
import { SpatialBackground } from '../common/components/ui/SpatialBackground';

export const DashboardLayout = () => {
    const { profile } = useUser();
    const { bgTheme } = useTheme();
    const [isChatOpen, setIsChatOpen] = React.useState(false);

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', position: 'relative', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
            {bgTheme === 'planets' && <SpaceBackground />}
            {bgTheme === 'spatial' && <SpatialBackground />}
            
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%', height: '100%', padding: '10px', gap: '10px', boxSizing: 'border-box' }}>
                {/* Floating sidebar wrapper */}
                <div style={{ flexShrink: 0, height: '100%', display: 'flex' }}>
                    <Sidebar onToggleChat={() => setIsChatOpen(!isChatOpen)} />
                </div>
                <div style={{ flex: 1, display: 'flex', minWidth: 0, height: '100%' }}>
                    <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }} className="custom-scrollbar hide-scrollbar">
                        <div style={{ padding: '30px 30px 60px', width: '100%', boxSizing: 'border-box' }}>
                            <Outlet />
                        </div>
                    </main>
                    {hasPermission(profile.user_role, 'chat') && (
                        <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
                    )}
                </div>
            </div>
        </div>
    );
};

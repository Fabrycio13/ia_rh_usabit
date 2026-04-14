import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ChatWidget } from './ChatWidget';
import { useUser } from '../core/contexts/UserContext';
import { hasPermission } from '../core/config/permissions';

export const DashboardLayout = () => {
    const { profile } = useUser();
    const [isChatOpen, setIsChatOpen] = React.useState(false);

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
            <Sidebar onToggleChat={() => setIsChatOpen(!isChatOpen)} />
            <div style={{ flex: 1, display: 'flex', minWidth: 0, height: '100vh' }}>
                <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }} className="custom-scrollbar hide-scrollbar">
                    <div style={{ padding: '40px 40px 60px', width: '100%', boxSizing: 'border-box' }}>
                        <Outlet />
                    </div>
                </main>
                {hasPermission(profile.user_role, 'chat') && (
                    <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
                )}
            </div>
        </div>
    );
};

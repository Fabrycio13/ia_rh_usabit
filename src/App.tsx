import React, { useState, useEffect, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './core/services/supabase';
import type { Session } from '@supabase/supabase-js';
import { useUser, UserProvider } from './core/contexts/UserContext';
import { LangProvider } from './core/contexts/LangContext';
import { hasPermission } from './core/config/permissions';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Toaster } from 'react-hot-toast';

const Login = React.lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const LandingPage = React.lazy(() => import('./pages/marketing/LandingPage').then(m => ({ default: m.LandingPage })));
const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const CandidateBank = React.lazy(() => import('./pages/candidates/CandidateBank').then(m => ({ default: m.CandidateBank })));
const Configuracoes = React.lazy(() => import('./pages/settings/Configuracoes').then(m => ({ default: m.Configuracoes })));
const Ajuda = React.lazy(() => import('./pages/support/Ajuda').then(m => ({ default: m.Ajuda })));
const Pipeline = React.lazy(() => import('./pages/candidates/Pipeline').then(m => ({ default: m.Pipeline })));
const AdminDashboard = React.lazy(() => import('./pages/dashboard/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminLogs = React.lazy(() => import('./pages/dashboard/AdminLogs').then(m => ({ default: m.AdminLogs })));
const Chat = React.lazy(() => import('./pages/support/Chat').then(m => ({ default: m.Chat })));
const Register = React.lazy(() => import('./pages/auth/Register').then(m => ({ default: m.Register })));
const SetPassword = React.lazy(() => import('./pages/auth/SetPassword').then(m => ({ default: m.SetPassword })));
const VagaForm = React.lazy(() => import('./pages/vagas/VagaForm').then(m => ({ default: m.VagaForm })));
const VagaCandidatos = React.lazy(() => import('./pages/vagas/VagaCandidatos').then(m => ({ default: m.VagaCandidatos })));
const PublicJobPage = React.lazy(() => import('./pages/vagas/PublicJobPage').then(m => ({ default: m.PublicJobPage })));
const JobApplication = React.lazy(() => import('./pages/vagas/JobApplication').then(m => ({ default: m.JobApplication })));
const OrganizationCareerPage = React.lazy(() => import('./pages/vagas/OrganizationCareerPage').then(m => ({ default: m.OrganizationCareerPage })));
const CareerPortalHub = React.lazy(() => import('./pages/vagas/CareerPortalHub').then(m => ({ default: m.CareerPortalHub })));
const SpontaneousApplication = React.lazy(() => import('./pages/vagas/SpontaneousApplication').then(m => ({ default: m.SpontaneousApplication })));
const OnboardingModal = React.lazy(() => import('./common/components/OnboardingModal').then(m => ({ default: m.OnboardingModal })));

const LoadingFallback = () => (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
    </div>
);

const AppContent = ({ session }: { session: Session | null }) => {
    const { profile } = useUser();

    if (session && !profile.loaded) {
        const isPublicRoute = window.location.hash.includes('/carreiras/') || window.location.hash.includes('/v/');
        if (!isPublicRoute) return <div style={{ height: '100vh', background: '#0B1020' }} />;
    }

    return (
        <HashRouter>
            {session && !window.location.hash.includes('/set-password') && <Suspense fallback={null}><OnboardingModal /></Suspense>}
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: { background: '#1a1c27', color: '#e2e8f0', border: '1px solid #1f2332' },
                    success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }}
            />
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    <Route path="/" element={!session ? <LandingPage /> : <Navigate to={profile.user_role === 'convidado' ? '/vagas' : '/dashboard'} />} />
                    <Route path="/login" element={!session ? <Login /> : <Navigate to={profile.user_role === 'convidado' ? '/vagas' : '/dashboard'} />} />
                    <Route path="/registro" element={!session ? <Register /> : <Navigate to={profile.user_role === 'convidado' ? '/vagas' : '/dashboard'} />} />
                    
                    {/* Public Routes */}
                    <Route path="/v/:hash" element={<PublicJobPage />} />
                    <Route path="/v/:hash/candidatar" element={<JobApplication />} />
                    <Route path="/carreiras/:orgId" element={<OrganizationCareerPage />} />
                    <Route path="/carreiras/:orgId/candidatar" element={<SpontaneousApplication />} />

                    {/* Persist Layout for Logged-in Routes */}
                    <Route element={session ? <DashboardLayout /> : <Navigate to="/" />}>
                        <Route path="/dashboard" element={hasPermission(profile.user_role, 'dashboard') ? <Dashboard /> : <Navigate to={hasPermission(profile.user_role, 'vagas') ? '/vagas' : '/ajuda'} />} />
                        <Route path="/vagas" element={hasPermission(profile.user_role, 'vagas') ? <CareerPortalHub /> : <Navigate to={hasPermission(profile.user_role, 'dashboard') ? '/dashboard' : '/ajuda'} />} />
                        <Route path="/vagas/nova" element={hasPermission(profile.user_role, 'vagas') ? <VagaForm /> : <Navigate to="/dashboard" />} />
                        <Route path="/vagas/editar/:id" element={hasPermission(profile.user_role, 'vagas') ? <VagaForm /> : <Navigate to="/dashboard" />} />
                        <Route path="/vagas/:id/candidatos" element={hasPermission(profile.user_role, 'vagas') ? <VagaCandidatos /> : <Navigate to="/dashboard" />} />
                        <Route path="/candidatos" element={hasPermission(profile.user_role, 'candidatos') ? <CandidateBank /> : <Navigate to="/dashboard" />} />
                        <Route path="/configuracoes" element={<Configuracoes />} />
                        <Route path="/ajuda" element={<Ajuda />} />
                        <Route path="/pipeline" element={hasPermission(profile.user_role, 'pipeline') ? <Pipeline /> : <Navigate to="/dashboard" />} />
                        <Route path="/chat" element={hasPermission(profile.user_role, 'chat') && profile.isPremium ? <Chat /> : <Navigate to="/dashboard" />} />

                        {/* Admin Routes */}
                        {hasPermission(profile.user_role, 'admin') && (
                            <>
                                <Route path="/admin" element={<AdminDashboard />} />
                                <Route path="/admin/logs" element={<AdminLogs />} />
                            </>
                        )}
                    </Route>

                    <Route path="/set-password" element={<SetPassword />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Suspense>
        </HashRouter>
    );
}

export const App = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const hash = window.location.hash;
        const isSetPasswordFlow = hash.includes('type=signup') || hash.includes('type=invite');

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
            if (isSetPasswordFlow && session) {
                window.location.hash = '#/set-password';
            }
        }).catch(() => {
            setSession(null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f111a] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <LangProvider>
            <UserProvider>
                <AppContent session={session} />
            </UserProvider>
        </LangProvider>
    );
};

export default App;

import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { supabase } from './core/services/supabase';
import type { Session } from '@supabase/supabase-js';
import { useUser, UserProvider } from './core/contexts/UserContext';
import { LangProvider } from './core/contexts/LangContext';
import { AnalysisProvider } from './core/contexts/AnalysisContext';
import { hasPermission } from './core/config/permissions';
import { Login } from './pages/auth/Login';
import { LandingPage } from './pages/marketing/LandingPage';
import { Dashboard } from './pages/dashboard/Dashboard';
import { JobDetailView } from './pages/analysis/Analises';
import { CandidateBank } from './pages/candidates/CandidateBank';
import { AnaliseNova } from './pages/analysis/AnaliseNova';
import { Configuracoes } from './pages/settings/Configuracoes';
import { Ajuda } from './pages/support/Ajuda';
import { Pipeline } from './pages/candidates/Pipeline';
import { AdminDashboard } from './pages/dashboard/AdminDashboard';
import { AdminLogs } from './pages/dashboard/AdminLogs';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Chat } from './pages/support/Chat';
import { Register } from './pages/auth/Register';
import { SetPassword } from './pages/auth/SetPassword';
// import { ConfirmEmail } from './pages/auth/ConfirmEmail';
// import { TrialExpired } from './pages/auth/TrialExpired';

import { VagaForm } from './pages/vagas/VagaForm';
import { VagaCandidatos } from './pages/vagas/VagaCandidatos';
import { PublicJobPage } from './pages/vagas/PublicJobPage';
import { JobApplication } from './pages/vagas/JobApplication';
import { OrganizationCareerPage } from './pages/vagas/OrganizationCareerPage';
import { CareerPortalHub } from './pages/vagas/CareerPortalHub';
import { SpontaneousApplication } from './pages/vagas/SpontaneousApplication';
import { Toaster } from 'react-hot-toast';
import { OnboardingModal } from './common/components/OnboardingModal';

const JobDetailRoute = () => {
    const { jobId } = useParams<{ jobId: string }>();
    if (!jobId) return <Navigate to="/analises" />;
    return <JobDetailView jobId={jobId} />;
};

const AppContent = ({ session }: { session: Session | null }) => {
    const { profile } = useUser();

    // Helper to check if trial expired

    // const isTrialExpired = () => {
    //     if (!profile.trial_ends_at) return false;
    //     if (profile.account_type === 'lifetime' || profile.user_role === 'admin' || profile.user_role === 'rh') return false;
    //     return new Date(profile.trial_ends_at) < new Date();
    // };

    if (session && !profile.loaded) {
        // Não bloqueia com tela escura se for uma rota pública (Portal de Carreiras ou Vaga)
        const isPublicRoute = window.location.hash.includes('/carreiras/') || window.location.hash.includes('/v/');
        if (!isPublicRoute) return <div style={{ height: '100vh', background: '#0B1020' }} />;
    }

    return (
        <HashRouter>
            {/* Onboarding Modal - Só abre se não estiver completo no banco E não houver trava local */}
            {session && !window.location.hash.includes('/set-password') && <OnboardingModal />}
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: { background: '#1a1c27', color: '#e2e8f0', border: '1px solid #1f2332' },
                    success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }}
            />
            <Routes>
                <Route path="/" element={!session ? <LandingPage /> : <Navigate to={profile.user_role === 'convidado' ? '/vagas' : '/dashboard'} />} />
                <Route path="/login" element={!session ? <Login /> : <Navigate to={profile.user_role === 'convidado' ? '/vagas' : '/dashboard'} />} />
                <Route path="/registro" element={!session ? <Register /> : <Navigate to={profile.user_role === 'convidado' ? '/vagas' : '/dashboard'} />} />
                
                {/* Public Routes (no auth required) */}
                <Route path="/v/:hash" element={<PublicJobPage />} />
                <Route path="/v/:hash/candidatar" element={<JobApplication />} />
                <Route path="/carreiras/:orgId" element={<OrganizationCareerPage />} />
                <Route path="/carreiras/:orgId/candidatar" element={<SpontaneousApplication />} />

                {/* Perist Layout for Logged-in Routes */}
                <Route element={session ? <DashboardLayout /> : <Navigate to="/" />}>
                    <Route path="/dashboard" element={hasPermission(profile.user_role, 'dashboard') ? <Dashboard /> : <Navigate to="/vagas" />} />
                    <Route path="/vagas" element={hasPermission(profile.user_role, 'vagas') ? <CareerPortalHub /> : <Navigate to="/dashboard" />} />
                    <Route path="/vagas/nova" element={hasPermission(profile.user_role, 'vagas') ? <VagaForm /> : <Navigate to="/dashboard" />} />
                    <Route path="/vagas/editar/:id" element={hasPermission(profile.user_role, 'vagas') ? <VagaForm /> : <Navigate to="/dashboard" />} />
                    <Route path="/vagas/:id/candidatos" element={hasPermission(profile.user_role, 'vagas') ? <VagaCandidatos /> : <Navigate to="/dashboard" />} />
                    <Route path="/analises" element={<Navigate to="/vagas?tab=analises" replace />} />
                    <Route path="/candidatos" element={hasPermission(profile.user_role, 'candidatos') ? <CandidateBank /> : <Navigate to="/dashboard" />} />
                    <Route path="/analise/nova" element={hasPermission(profile.user_role, 'analises') ? <AnaliseNova /> : <Navigate to="/dashboard" />} />
                    <Route path="/analise/:jobId" element={hasPermission(profile.user_role, 'analises') ? <JobDetailRoute /> : <Navigate to="/dashboard" />} />
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
                <AnalysisProvider>
                    <AppContent session={session} />
                </AnalysisProvider>
            </UserProvider>
        </LangProvider>
    );
};

export default App;

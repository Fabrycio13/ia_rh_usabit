import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { supabase } from './core/services/supabase';
import { useUser, UserProvider } from './core/contexts/UserContext';
import { LangProvider } from './core/contexts/LangContext';
import { AnalysisProvider } from './core/contexts/AnalysisContext';
import { Login } from './pages/auth/Login';
import { LandingPage } from './pages/marketing/LandingPage';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Analises, JobDetailView } from './pages/analysis/Analises';
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
import { ConfirmEmail } from './pages/auth/ConfirmEmail';
import { TrialExpired } from './pages/auth/TrialExpired';
import { Vagas } from './pages/vagas/Vagas';
import { VagaForm } from './pages/vagas/VagaForm';
import { PublicJobPage } from './pages/vagas/PublicJobPage';
import { JobApplication } from './pages/vagas/JobApplication';
import { Toaster } from 'react-hot-toast';

const JobDetailRoute = () => {
    const { jobId } = useParams<{ jobId: string }>();
    if (!jobId) return <Navigate to="/analises" />;
    return <JobDetailView jobId={jobId} />;
};

const AppContent = ({ session }: { session: any }) => {
    const { profile } = useUser();

    // Helper to check if trial expired
    const isTrialExpired = () => {
        if (!profile.trial_ends_at) return false;
        if (profile.account_type === 'lifetime' || profile.user_role === 'admin') return false;
        return new Date(profile.trial_ends_at) < new Date();
    };

    if (session) {
        // 1. Wait for profile to load
        if (!profile.loaded) return <div style={{ height: '100vh', background: '#0B1020' }} />;

        // 2. Email confirmation (skip for lifetime)
        if (!session.user.confirmed_at && profile.account_type !== 'lifetime') {
            return <ConfirmEmail />;
        }

        // 3. Trial Expiry
        if (profile.account_type === 'trial' && isTrialExpired()) {
            return <TrialExpired />;
        }
    }

    return (
        <HashRouter>
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: { background: '#1a1c27', color: '#e2e8f0', border: '1px solid #1f2332' },
                    success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }}
            />
            <Routes>
                <Route path="/" element={!session ? <LandingPage /> : <Navigate to="/dashboard" />} />
                <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
                <Route path="/registro" element={!session ? <Register /> : <Navigate to="/dashboard" />} />
                
                {/* Public Routes (no auth required) */}
                <Route path="/v/:hash" element={<PublicJobPage />} />
                <Route path="/v/:hash/candidatar" element={<JobApplication />} />

                {/* Perist Layout for Logged-in Routes */}
                <Route element={session ? <DashboardLayout /> : <Navigate to="/" />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/vagas" element={<Vagas />} />
                    <Route path="/vagas/nova" element={<VagaForm />} />
                    <Route path="/analises" element={<Analises />} />
                    <Route path="/candidatos" element={<CandidateBank />} />
                    <Route path="/analise/nova" element={<AnaliseNova />} />
                    <Route path="/analise/:jobId" element={<JobDetailRoute />} />
                    <Route path="/configuracoes" element={<Configuracoes />} />
                    <Route path="/ajuda" element={<Ajuda />} />
                    <Route path="/pipeline" element={profile.isPremium ? <Pipeline /> : <Navigate to="/dashboard" />} />
                    <Route path="/chat" element={profile.isPremium ? <Chat /> : <Navigate to="/dashboard" />} />

                    {/* Admin Routes */}
                    {profile.user_role === 'admin' && (
                        <>
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/admin/logs" element={<AdminLogs />} />
                        </>
                    )}
                </Route>

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </HashRouter>
    );
}

export const App = () => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
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

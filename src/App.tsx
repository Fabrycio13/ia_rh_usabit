import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { UserProvider } from './contexts/UserContext';
import { LangProvider } from './contexts/LangContext';
import { AnalysisProvider } from './contexts/AnalysisContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Analises, JobDetailView } from './pages/Analises';
import { CandidateBank } from './pages/CandidateBank';
import { AnaliseNova } from './pages/AnaliseNova';
import { Configuracoes } from './pages/Configuracoes';
import { Ajuda } from './pages/Ajuda';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Toaster } from 'react-hot-toast';

const JobDetailRoute = () => {
  const { jobId } = useParams<{ jobId: string }>();
  if (!jobId) return <Navigate to="/analises" />;
  return <JobDetailView jobId={jobId} />;
};

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
          <BrowserRouter>
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: { background: '#1a1c27', color: '#e2e8f0', border: '1px solid #1f2332' },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
            <Routes>
              <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />

              {/* Layout Persistente para Rotas Logadas */}
              <Route element={session ? <DashboardLayout /> : <Navigate to="/login" />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/analises" element={<Analises />} />
                <Route path="/candidatos" element={<CandidateBank />} />
                <Route path="/analise/nova" element={<AnaliseNova />} />
                <Route path="/analise/:jobId" element={<JobDetailRoute />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/ajuda" element={<Ajuda />} />
              </Route>

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </AnalysisProvider>
      </UserProvider>
    </LangProvider>
  );
};

export default App;

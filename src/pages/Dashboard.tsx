import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Job {
  id: string;
  name: string;
  filters: { gender?: string; age?: string; location?: string } | null;
  created_at: string;
}

interface JobWithStats extends Job {
  totalCandidates: number;
  topCandidates: number;
}

// ─── Estilos do Tooltip ───────────────────────────────────────────────────────
const TT = {
  background: '#13151C',
  border: '1px solid #1F2332',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 12,
};

const ACCENT = '#6366f1';
const GREEN = '#10b981';
const PIE_COLORS = [ACCENT, '#8b5cf6', GREEN, '#f59e0b', '#ec4899'];

// ─── Componente ───────────────────────────────────────────────────────────────
export const Dashboard = () => {
  const { profile } = useUser();
  const [jobs, setJobs] = useState<JobWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // KPIs derivados dos dados
  const totalVagas = jobs.length;
  const totalAvaliados = jobs.reduce((s, j) => s + j.totalCandidates, 0);
  const totalMelhores = jobs.reduce((s, j) => s + j.topCandidates, 0);
  const taxaAprovacao = totalAvaliados > 0
    ? ((totalMelhores / totalAvaliados) * 100).toFixed(1)
    : '0.0';

  useEffect(() => {
    if (!profile.loaded) return; // wait for context to initialize
    if (!profile.userId) { setLoading(false); return; } // not logged in

    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    fetchDashboardData(profile.userId).finally(() => clearTimeout(safetyTimer));

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_candidates' }, () => fetchDashboardData(profile.userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchDashboardData(profile.userId))
      .subscribe();

    return () => {
      clearTimeout(safetyTimer);
      supabase.removeChannel(channel);
    };
  }, [profile.userId, profile.loaded]); // re-run when login state changes

  async function fetchDashboardData(userId: string) {
    try {
      setLoading(true);
      setError(null);

      // 1. Buscar vagas DO usuário autenticado
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, name, filters, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;
      if (!jobsData || jobsData.length === 0) {
        setJobs([]);
        return;
      }

      const jobIds = jobsData.map((j) => j.id);

      // 2. Contar candidatos por vaga (via job_candidates)
      const { data: jcData, error: jcError } = await supabase
        .from('job_candidates')
        .select('job_id')
        .in('job_id', jobIds);

      if (jcError) throw jcError;

      // 3. Buscar melhores candidatos (job_candidates com score >= 70)
      // Usamos um try/catch específico aqui para não quebrar o dashboard se a coluna 'score' ainda não existir
      let topData: any[] = [];
      try {
        const { data, error: topError } = await supabase
          .from('job_candidates')
          .select('job_id')
          .eq('user_id', userId)
          .gte('score', 70)
          .in('job_id', jobIds);

        if (!topError) topData = data ?? [];
        else console.warn('[Dashboard] Coluna score pode estar ausente em job_candidates:', topError.message);
      } catch (e) {
        console.error('[Dashboard] Erro ao buscar scores:', e);
      }

      // 4. Montar contagens por vaga
      const candidateCountByJob: Record<string, number> = {};
      const topCountByJob: Record<string, number> = {};

      (jcData ?? []).forEach(({ job_id }) => {
        candidateCountByJob[job_id] = (candidateCountByJob[job_id] ?? 0) + 1;
      });

      (topData ?? []).forEach(({ job_id }) => {
        if (job_id) {
          topCountByJob[job_id] = (topCountByJob[job_id] ?? 0) + 1;
        }
      });

      const enriched: JobWithStats[] = jobsData.map((j) => ({
        ...j,
        totalCandidates: candidateCountByJob[j.id] ?? 0,
        topCandidates: topCountByJob[j.id] ?? 0,
      }));

      setJobs(enriched);
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err);
      setError('Não foi possível carregar os dados. Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Dados para os gráficos ───────────────────────────────────────────────
  const barData = jobs.map((j) => ({
    name: j.name.length > 12 ? j.name.slice(0, 12) + '…' : j.name,
    Avaliados: j.totalCandidates,
    Melhores: j.topCandidates,
  }));

  const lineData = jobs.map((j) => ({
    name: j.name.length > 12 ? j.name.slice(0, 12) + '…' : j.name,
    Taxa: j.totalCandidates > 0
      ? parseFloat(((j.topCandidates / j.totalCandidates) * 100).toFixed(1))
      : 0,
  }));

  // Gênero: vem de jobs.filters.gender
  const genderMap: Record<string, number> = {};
  jobs.forEach((j) => {
    const g = j.filters?.gender ?? 'Não informado';
    genderMap[g] = (genderMap[g] ?? 0) + 1;
  });
  const pieGender = Object.entries(genderMap).map(([name, value]) => ({ name, value }));

  // Localidade: vem de jobs.filters.location
  const localMap: Record<string, number> = {};
  jobs.forEach((j) => {
    const loc = j.filters?.location ?? 'Não informado';
    localMap[loc] = (localMap[loc] ?? 0) + 1;
  });
  const localData = Object.entries(localMap).map(([name, value]) => ({ name, value }));

  // ─── Estados de UI ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Carregando dados…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-md">
          <p className="text-red-400 font-semibold mb-2">Erro ao carregar</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchDashboardData(profile.userId)}
            className="bg-[#6366f1] hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-10">
        <p className="text-[#64748B] text-[13px] mb-1 font-medium tracking-wide">Visão geral</p>
        <h1 className="text-white text-[32px] font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[
          { label: 'VAGAS ANALISADAS', value: String(totalVagas), color: 'text-[#6366f1]' },
          { label: 'CANDIDATOS AVALIADOS', value: String(totalAvaliados), color: 'text-[#10b981]' },
          { label: 'MELHORES CANDIDATOS', value: String(totalMelhores), color: 'text-[#f59e0b]' },
          { label: 'TAXA DE APROVAÇÃO', value: `${taxaAprovacao}%`, color: 'text-[#ec4899]' },
        ].map((k) => (
          <div key={k.label} className="bg-[#15171E] rounded-2xl p-7 border border-[#1F2332] shadow-sm flex flex-col justify-center">
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-4">{k.label}</p>
            <p className={`text-[36px] font-bold tracking-tight ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {jobs.length === 0 ? (
        <div className="bg-[#15171E] rounded-2xl p-16 border border-[#1F2332] text-center">
          <p className="text-slate-400 text-lg mb-2">Nenhuma vaga encontrada</p>
          <p className="text-slate-500 text-sm">Crie uma nova análise para começar.</p>
        </div>
      ) : (
        <>
          {/* Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 h-auto lg:h-[350px]">

            {/* Candidatos por Vaga */}
            <div className="bg-[#15171E] rounded-2xl p-8 flex flex-col border border-[#1F2332] shadow-sm">
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-8">CANDIDATOS POR VAGA</p>
              <div className="flex-1 w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barGap={4} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#222635" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#1C1F2B' }} contentStyle={TT} />
                    <Bar dataKey="Avaliados" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={48} />
                    <Bar dataKey="Melhores" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribuição por Gênero */}
            <div className="bg-[#15171E] rounded-2xl p-8 flex flex-col border border-[#1F2332] shadow-sm">
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-4">DISTRIBUIÇÃO POR GÊNERO</p>
              <div className="flex-1 w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieGender} cx="50%" cy="50%" innerRadius={75} outerRadius={110} paddingAngle={2} dataKey="value" stroke="none">
                      {pieGender.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TT} />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: '20px' }}
                      iconType="square"
                      formatter={(value, _, index) => (
                        <span style={{ color: PIE_COLORS[index % PIE_COLORS.length] }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10 h-auto lg:h-[350px]">

            {/* Taxa de Aprovação */}
            <div className="bg-[#15171E] rounded-2xl p-8 flex flex-col border border-[#1F2332] shadow-sm">
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-8">TAXA DE APROVAÇÃO POR VAGA (%)</p>
              <div className="flex-1 w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lineData} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#222635" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} unit="%" />
                    <Tooltip contentStyle={TT} formatter={(v) => [`${v}%`, 'Taxa']} />
                    <Bar dataKey="Taxa" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Vagas por Localidade */}
            <div className="bg-[#15171E] rounded-2xl p-8 flex flex-col border border-[#1F2332] shadow-sm">
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-8">VAGAS POR LOCALIDADE</p>
              <div className="flex-1 w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={localData} layout="vertical" barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#222635" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                      allowDecimals={false}
                      domain={[0, (dataMax: number) => dataMax + 1]}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      dx={-10}
                    />
                    <Tooltip cursor={{ fill: '#1C1F2B' }} contentStyle={TT} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </>
      )}
    </>
  );
};

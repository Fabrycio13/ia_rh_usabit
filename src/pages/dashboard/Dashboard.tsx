import { useEffect, useRef, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { TrendingUp, Users, Briefcase, Award, ArrowUpRight, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Animated Counter ─────────────────────────────────────────────────────────
const AnimatedNumber = ({ target, suffix = '' }: { target: number; suffix?: string }) => {
  const [val, setVal] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    ref.current = 0;
    const steps = 40;
    const inc = target / steps;
    const timer = setInterval(() => {
      ref.current += inc;
      if (ref.current >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(ref.current));
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return <>{val}{suffix}</>;
};

// ─── Tooltip style ────────────────────────────────────────────────────────────
const TT = {
  background: '#1a1c2d',
  border: '1px solid rgba(99,102,241,0.2)',
  borderRadius: 10,
  color: '#e2e8f0',
  fontSize: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};


// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
@keyframes dashFadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes pulse-ring { 0%{transform:scale(1);opacity:0.6} 70%{transform:scale(1.3);opacity:0} 100%{transform:scale(1.3);opacity:0} }
.d-card { background:var(--bg-card); border:1px solid var(--border); border-radius:20px; transition:box-shadow 0.2s,border-color 0.2s; }
.d-card:hover { box-shadow:0 8px 40px rgba(99,102,241,0.08); border-color:rgba(99,102,241,0.18); }
.kpi-card { position:relative; overflow:hidden; border-radius:20px; padding:24px; transition:transform 0.2s, box-shadow 0.2s; cursor:default; }
.kpi-card:hover { transform:translateY(-3px); box-shadow:0 16px 48px rgba(0,0,0,0.35); }
.kpi-orb { position:absolute; width:120px; height:120px; border-radius:50%; opacity:0.12; right:-20px; top:-20px; filter:blur(30px); }
.anim-1 { animation: dashFadeUp 0.4s ease both; }
.anim-2 { animation: dashFadeUp 0.4s 0.08s ease both; }
.anim-3 { animation: dashFadeUp 0.4s 0.16s ease both; }
.anim-4 { animation: dashFadeUp 0.4s 0.24s ease both; }
.anim-5 { animation: dashFadeUp 0.4s 0.32s ease both; }
.anim-6 { animation: dashFadeUp 0.4s 0.40s ease both; }
.top-row:hover { background: var(--row-hover); }
.top-row { transition:background 0.15s; border-radius:10px; }
.live-dot { width:8px; height:8px; border-radius:50%; background:#22c55e; position:relative; }
.live-dot::after { content:''; position:absolute; inset:-3px; border-radius:50%; border:2px solid #22c55e; animation:pulse-ring 2s ease-out infinite; }
.cal-day { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:12px; cursor:pointer; transition:background 0.15s, color 0.15s; color:var(--text-muted); position:relative; }
.cal-day:hover { background:rgba(99,102,241,0.12); color:var(--text-main); }
.cal-day.cal-active { background:var(--primary) !important; color:#fff !important; font-weight:700; }
.cal-day.cal-today { font-weight:700; color:var(--primary); }
.cal-day.cal-has-job::after { content:''; position:absolute; bottom:3px; left:50%; transform:translateX(-50%); width:4px; height:4px; border-radius:50%; background:#22c55e; }
.cal-nav { background:none; border:none; cursor:pointer; color:var(--text-dim); padding:4px 8px; border-radius:8px; transition:background 0.15s; font-size:18px; line-height:1; }
.cal-nav:hover { background:var(--bg-main); color:var(--text-main); }
.cal-range { background:rgba(99,102,241,0.15) !important; color:var(--text-main) !important; border-radius:0 !important; }
.cal-range-start { border-radius:8px 0 0 8px !important; }
.cal-range-end { border-radius:0 8px 8px 0 !important; }
`;

// ─── Main Component ───────────────────────────────────────────────────────────
export const Dashboard = () => {
  const { profile } = useUser();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-based
  const [rangeStart, setRangeStart] = useState<string | null>(null); // 'YYYY-MM-DD'
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);   // 'YYYY-MM-DD'

  const totalVagas = jobs.length;
  const totalAvaliados = jobs.reduce((s, j) => s + j.totalCandidates, 0);
  const totalMelhores = jobs.reduce((s, j) => s + j.topCandidates, 0);
  const taxaAprovacao = totalAvaliados > 0
    ? parseFloat(((totalMelhores / totalAvaliados) * 100).toFixed(1))
    : 0;

  useEffect(() => {
    if (!profile.loaded) return;
    if (!profile.userId) { setLoading(false); return; }
    const t = setTimeout(() => setLoading(false), 8000);
    fetchData(profile.userId).finally(() => clearTimeout(t));
    const ch = supabase.channel('dash-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_candidates' }, () => fetchData(profile.userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchData(profile.userId))
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
  }, [profile.userId, profile.loaded]);

  async function fetchData(userId: string) {
    try {
      setLoading(true); setError(null);
      const { data: jobsData, error: je } = await supabase
        .from('jobs').select('id,name,filters,created_at')
        .eq('user_id', userId).order('created_at', { ascending: false });
      if (je) throw je;
      if (!jobsData?.length) { setJobs([]); return; }

      const ids = jobsData.map(j => j.id);
      const { data: jcData } = await supabase.from('job_candidates').select('job_id').in('job_id', ids);
      let topData: any[] = [];
      try {
        const { data } = await supabase.from('job_candidates').select('job_id').eq('user_id', userId).gte('score', 70).in('job_id', ids);
        topData = data ?? [];
      } catch { /* ignore */ }

      const cnt: Record<string, number> = {};
      const top: Record<string, number> = {};
      (jcData ?? []).forEach(({ job_id }) => { cnt[job_id] = (cnt[job_id] ?? 0) + 1; });
      (topData ?? []).forEach(({ job_id }) => { if (job_id) top[job_id] = (top[job_id] ?? 0) + 1; });

      setJobs(jobsData.map(j => ({ ...j, totalCandidates: cnt[j.id] ?? 0, topCandidates: top[j.id] ?? 0 })));
    } catch (e: any) {
      setError('Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }

  // Chart data
  const barData = jobs.slice(0, 8).map(j => ({
    name: j.name.length > 14 ? j.name.slice(0, 14) + '…' : j.name,
    Avaliados: j.totalCandidates,
    Aprovados: j.topCandidates,
  }));

  // Dates that have jobs created on them
  const jobDateSet = new Set(jobs.map(j => j.created_at.slice(0, 10)));

  // Area chart: filter by selected range
  const activeStart = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeStart : rangeEnd) : rangeStart;
  const activeEnd = rangeStart && rangeEnd ? (rangeStart < rangeEnd ? rangeEnd : rangeStart) : rangeStart;

  const filteredJobs = activeStart
    ? jobs.filter(j => {
      const d = j.created_at.slice(0, 10);
      return d >= activeStart! && d <= (activeEnd ?? activeStart)!;
    })
    : jobs;

  const areaData = filteredJobs.slice().reverse().map((j, i) => ({
    name: `V${i + 1}`,
    Candidatos: j.totalCandidates,
    Aprovados: j.topCandidates,
  }));

  const topJobs = [...jobs].sort((a, b) => b.topCandidates - a.topCandidates).slice(0, 5);

  // Calendar helpers
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayStr = today.toISOString().slice(0, 10);

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmtDate = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
  const clearRange = () => { setRangeStart(null); setRangeEnd(null); };
  const handleDayClick = (day: number) => {
    const ds = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
    if (!rangeStart || (rangeStart && rangeEnd)) {
      // Start fresh selection
      setRangeStart(ds);
      setRangeEnd(null);
    } else {
      // Second click: if same day, clear; else set end
      if (ds === rangeStart) { clearRange(); }
      else { setRangeEnd(ds); }
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Carregando dashboard…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 400 }}>
        <p style={{ color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>Erro ao carregar</p>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 20 }}>{error}</p>
        <button onClick={() => fetchData(profile.userId)} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Tentar novamente</button>
      </div>
    </div>
  );

  return (
    <>
      <style>{css}</style>

      {/* ── Header ── */}
      <div className="anim-1" style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ color: 'var(--text-dim)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Visão geral</p>
          <h1 style={{ color: 'var(--text-main)', fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 14px' }}>
          <div className="live-dot" />
          <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>Tempo real</span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="anim-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Vagas Analisadas', value: totalVagas, suffix: '', icon: Briefcase, grad: 'linear-gradient(135deg,#6366f1,#818cf8)', orb: '#6366f1' },
          { label: 'Candidatos Avaliados', value: totalAvaliados, suffix: '', icon: Users, grad: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', orb: '#0ea5e9' },
          { label: 'Melhores Candidatos', value: totalMelhores, suffix: '', icon: Award, grad: 'linear-gradient(135deg,#f59e0b,#fbbf24)', orb: '#f59e0b' },
          { label: 'Taxa de Aprovação', value: taxaAprovacao, suffix: '%', icon: TrendingUp, grad: 'linear-gradient(135deg,#22c55e,#4ade80)', orb: '#22c55e' },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="kpi-card" style={{ background: k.grad }}>
              <div className="kpi-orb" style={{ background: k.orb }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 12, padding: 10, display: 'flex' }}>
                  <Icon style={{ width: 18, height: 18, color: '#fff' }} />
                </div>
                <ArrowUpRight style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.6)' }} />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{k.label}</p>
              <p style={{ color: '#fff', fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
                <AnimatedNumber target={k.value} suffix={k.suffix} />
              </p>
            </div>
          );
        })}
      </div>

      {jobs.length === 0 ? (
        <div className="d-card anim-3" style={{ padding: 64, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Briefcase style={{ width: 28, height: 28, color: 'var(--primary)' }} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Nenhuma vaga encontrada</p>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Crie uma nova análise para começar a ver os dados aqui.</p>
          <button onClick={() => navigate('/analise/nova')} style={{ marginTop: 24, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 28px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Nova Análise</button>
        </div>
      ) : (
        <>
          {/* ── Row 1: Area Chart + Pie ── */}
          <div className="anim-3" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, marginBottom: 16 }}>

            {/* Area Chart */}
            <div className="d-card" style={{ padding: '24px 20px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <p style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Evolução por Vaga</p>
                  <p style={{ color: 'var(--text-main)', fontSize: 20, fontWeight: 700 }}>
                    {activeStart
                      ? activeEnd && activeEnd !== activeStart
                        ? `${fmtDate(activeStart)} → ${fmtDate(activeEnd)}`
                        : fmtDate(activeStart)
                      : 'Candidatos & Aprovados'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[{ color: '#6366f1', label: 'Candidatos' }, { color: '#22c55e', label: 'Aprovados' }].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                      <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gCand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gAprov" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={TT} />
                    <Area type="monotone" dataKey="Candidatos" stroke="#6366f1" strokeWidth={2.5} fill="url(#gCand)" dot={false} activeDot={{ r: 5, fill: '#6366f1' }} />
                    <Area type="monotone" dataKey="Aprovados" stroke="#22c55e" strokeWidth={2.5} fill="url(#gAprov)" dot={false} activeDot={{ r: 5, fill: '#22c55e' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Calendar */}
            <div className="d-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Filtro</p>
                  <p style={{ color: 'var(--text-main)', fontSize: 16, fontWeight: 700 }}>{monthNames[calMonth]} {calYear}</p>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="cal-nav" onClick={prevMonth}>‹</button>
                  <button className="cal-nav" onClick={nextMonth}>›</button>
                </div>
              </div>

              {/* Day names */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
                {dayNames.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', padding: '4px 0' }}>{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const ds = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`;
                  const isToday = ds === todayStr;
                  const hasJob = jobDateSet.has(ds);
                  const lo = activeStart && activeEnd ? (activeStart < activeEnd ? activeStart : activeEnd) : activeStart;
                  const hi = activeStart && activeEnd ? (activeStart < activeEnd ? activeEnd : activeStart) : activeStart;
                  const isStart = ds === lo;
                  const isEnd = ds === hi;
                  const inRange = lo && hi && ds > lo && ds < hi;
                  const isActive = isStart || isEnd;
                  const isPending = rangeStart && !rangeEnd && ds === rangeStart;
                  let cls = 'cal-day';
                  if (isActive || isPending) cls += ' cal-active';
                  else if (isToday) cls += ' cal-today';
                  if (inRange) cls += ' cal-range';
                  if (isStart && activeEnd && activeEnd !== activeStart) cls += ' cal-range-start';
                  if (isEnd && activeStart && activeEnd !== activeStart) cls += ' cal-range-end';
                  if (hasJob) cls += ' cal-has-job';
                  return (
                    <div key={day} className={cls} onClick={() => handleDayClick(day)}>{day}</div>
                  );
                })}
              </div>

              {/* Legend + Selection info */}
              <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>Dia com vaga criada</span>
                </div>
                {activeStart ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                      {activeEnd && activeEnd !== activeStart
                        ? <><b style={{ color: 'var(--primary)' }}>{fmtDate(activeStart)}</b> → <b style={{ color: 'var(--primary)' }}>{fmtDate(activeEnd)}</b></>
                        : <><b style={{ color: 'var(--primary)' }}>{fmtDate(activeStart)}</b>{!rangeEnd ? <span style={{ color: '#f59e0b' }}> • clique p/ finalizar</span> : ''}</>
                      }
                    </span>
                    <button onClick={clearRange} style={{ fontSize: 10, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }}>Limpar</button>
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>Clique num dia (ou selecione um período)</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Row 2: Bar chart + Top Jobs table ── */}
          <div className="anim-4" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, marginBottom: 16 }}>

            {/* Bar Chart */}
            <div className="d-card" style={{ padding: '24px 20px 16px' }}>
              <div style={{ marginBottom: 24 }}>
                <p style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Comparativo</p>
                <p style={{ color: 'var(--text-main)', fontSize: 20, fontWeight: 700 }}>Candidatos por Vaga</p>
              </div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barGap={4} barCategoryGap="32%" margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={TT} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                    <Bar dataKey="Avaliados" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={42} />
                    <Bar dataKey="Aprovados" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Jobs Table */}
            <div className="d-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <p style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Ranking</p>
                  <p style={{ color: 'var(--text-main)', fontSize: 17, fontWeight: 700 }}>Top Vagas</p>
                </div>
                <button onClick={() => navigate('/analises')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Ver todas <ChevronRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {topJobs.map((j, i) => {
                  const pct = j.totalCandidates > 0 ? Math.round((j.topCandidates / j.totalCandidates) * 100) : 0;
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={j.id} className="top-row" style={{ padding: '10px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: medals[i] ? 22 : 13, fontWeight: medals[i] ? 400 : 700, color: 'var(--text-muted)', lineHeight: 1 }}>{medals[i] ?? `${i + 1}`}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'var(--text-main)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{j.name}</p>
                        <div style={{ height: 4, background: 'var(--bg-main)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#a78bfa)', borderRadius: 4, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ color: 'var(--text-main)', fontSize: 13, fontWeight: 700 }}>{j.topCandidates}</p>
                        <p style={{ color: 'var(--text-dim)', fontSize: 10 }}>{pct}%</p>
                      </div>
                    </div>
                  );
                })}
                {topJobs.length === 0 && (
                  <p style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Sem dados ainda</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Row 3: Recent Jobs ── */}
          <div className="anim-5 d-card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <p style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Recentes</p>
                <p style={{ color: 'var(--text-main)', fontSize: 17, fontWeight: 700 }}>Últimas Vagas Criadas</p>
              </div>
              <button onClick={() => navigate('/analises')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, borderRadius: 10, padding: '6px 14px' }}>
                Ver todas <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {jobs.slice(0, 6).map(j => {
                const pct = j.totalCandidates > 0 ? Math.round((j.topCandidates / j.totalCandidates) * 100) : 0;
                const date = new Date(j.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                return (
                  <div key={j.id} onClick={() => navigate('/analises')} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.35)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(99,102,241,0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <p style={{ color: 'var(--text-main)', fontSize: 14, fontWeight: 600, flex: 1, marginRight: 8, lineHeight: 1.3 }}>{j.name}</p>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, whiteSpace: 'nowrap', marginTop: 1 }}>{date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                      <div>
                        <p style={{ color: 'var(--text-dim)', fontSize: 10, marginBottom: 2 }}>Avaliados</p>
                        <p style={{ color: 'var(--text-main)', fontSize: 16, fontWeight: 700 }}>{j.totalCandidates}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-dim)', fontSize: 10, marginBottom: 2 }}>Aprovados</p>
                        <p style={{ color: '#22c55e', fontSize: 16, fontWeight: 700 }}>{j.topCandidates}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-dim)', fontSize: 10, marginBottom: 2 }}>Taxa</p>
                        <p style={{ color: pct >= 50 ? '#22c55e' : pct >= 25 ? '#f59e0b' : '#ef4444', fontSize: 16, fontWeight: 700 }}>{pct}%</p>
                      </div>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 50 ? 'linear-gradient(90deg,#22c55e,#4ade80)' : pct >= 25 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : '#ef4444', borderRadius: 4, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
};

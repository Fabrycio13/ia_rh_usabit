import { useEffect, useRef, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { TrendingUp, Users, Briefcase, Award, ArrowUpRight, ChevronRight, Settings2, Check, RefreshCw, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../core/contexts/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Job {
  id: string;
  name: string;
  filters: { gender?: string; age?: string; location?: string } | null;
  created_at: string;
}
interface JobWithStats extends Job {
  type: 'analysis' | 'job';
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
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--text-main)',
  fontSize: 12,
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
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
.kpi-orb { position:absolute; width:160px; height:160px; border-radius:50%; opacity:0.25; right:-30px; top:-30px; filter:blur(40px); }
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
`;

// ─── Planet Overlay Component ─────────────────────────────────────────────────
const PlanetOverlay = ({ type }: { type: string }) => {
  switch (type) {
    case 'Jupiter':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent, transparent 12px, rgba(124,45,18,0.25) 12px, rgba(124,45,18,0.25) 24px)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent, transparent 18px, rgba(254,243,199,0.15) 18px, rgba(254,243,199,0.15) 36px)' }} />
          <div style={{ position: 'absolute', top: '65%', left: '15%', width: '25%', height: '12%', borderRadius: '50%', background: 'rgba(124,45,18,0.45)', filter: 'blur(2px)', transform: 'rotate(-3deg)' }} />
          <div style={{ position: 'absolute', top: '30%', left: '55%', width: '28%', height: '6%', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', filter: 'blur(1px)' }} />
        </div>
      );
    case 'Earth':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0,
            backgroundImage: `
              radial-gradient(ellipse 22px 18px at 25% 30%, #166534 0%, transparent 100%),
              radial-gradient(ellipse 30px 22px at 65% 55%, #15803d 0%, transparent 100%),
              radial-gradient(ellipse 18px 12px at 45% 45%, #3f6212 0%, transparent 100%),
              radial-gradient(ellipse 12px 08px at 80% 20%, #14532d 0%, transparent 100%),
              radial-gradient(circle 7px at 22% 72%, #166534 0%, transparent 100%)
            `,
            opacity: 0.85, filter: 'blur(1px)'
          }} />
          <div style={{ position: 'absolute', top: '22%', left: '22%', width: '18%', height: '18%', background: 'rgba(255,255,255,0.3)', borderRadius: '50%', filter: 'blur(5px)' }} />
          <div style={{ position: 'absolute', inset: 0,
            backgroundImage: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.08) 0deg, transparent 45deg, rgba(255,255,255,0.08) 90deg)',
            filter: 'blur(2px)', animation: 'float 30s linear infinite'
          }} />
        </div>
      );
    case 'Moon':
      return (
        <div style={{ position: 'absolute', inset: 0, opacity: 0.7 }}>
          <div style={{ position: 'absolute', top: '15%', left: '25%', width: '18%', height: '18%', borderRadius: '50%', background: 'rgba(0,0,0,0.2)', boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3)' }} />
          <div style={{ position: 'absolute', top: '45%', left: '60%', width: '15%', height: '15%', borderRadius: '50%', background: 'rgba(0,0,0,0.2)', boxShadow: 'inset 2px 2px 3px rgba(0,0,0,0.3)' }} />
          <div style={{ position: 'absolute', top: '70%', left: '30%', width: '22%', height: '22%', borderRadius: '50%', background: 'rgba(0,0,0,0.15)', boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.25)' }} />
        </div>
      );
    case 'Mars':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '15%', left: '15%', width: '35%', height: '15%', background: 'rgba(69,10,10,0.35)', filter: 'blur(4px)', transform: 'rotate(-5deg)' }} />
          <div style={{ position: 'absolute', top: '65%', left: '50%', width: '25%', height: '15%', background: 'rgba(69,10,10,0.3)', filter: 'blur(3px)', transform: 'rotate(10deg)' }} />
          <div style={{ position: 'absolute', top: '35%', left: '55%', width: '15%', height: '15%', borderRadius: '50%', background: 'rgba(69,10,10,0.2)', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.3)' }} />
        </div>
      );
    case 'Neptune':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(160deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 16px)', filter: 'blur(1.5px)', animation: 'float 45s linear infinite' }} />
          <div style={{ position: 'absolute', top: '40%', left: '10%', width: '80%', height: '4%', background: 'rgba(255,255,255,0.15)', filter: 'blur(3px)' }} />
        </div>
      );
    case 'Venus':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.12) 0%, transparent 60%)', filter: 'blur(2px)' }} />
          <div style={{ position: 'absolute', inset: -10, background: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(0,0,0,0.05) 12px, rgba(0,0,0,0.05) 24px)', filter: 'blur(4px)', opacity: 0.4 }} />
        </div>
      );
    case 'Saturn':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.1) 50%, transparent)' }} />
          <div style={{ position: 'absolute', top: '25%', left: '10%', width: '80%', height: '10%', background: 'rgba(255,255,255,0.05)', filter: 'blur(1px)' }} />
        </div>
      );
    default:
      return null;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const Dashboard = () => {
  const { profile } = useUser();
  const { bgTheme, theme } = useTheme();
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
  
  // Layout customization state
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem(`dash-layout-${profile.userId}`);
    return saved ? JSON.parse(saved) : { calendarPos: 'right', rankingPos: 'right' };
  });

  useEffect(() => {
    const t = setTimeout(() => setShowCharts(true), 500);
    return () => clearTimeout(t);
  }, []);

  const saveLayout = (newLayout: typeof layout) => {
    setLayout(newLayout);
    localStorage.setItem(`dash-layout-${profile.userId}`, JSON.stringify(newLayout));
  };

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vagas_white_label' }, () => fetchData(profile.userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vagas_candidaturas' }, () => fetchData(profile.userId))
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
  }, [profile.userId, profile.loaded]);

  async function fetchData(userId: string) {
    try {
      setLoading(true); setError(null);
      
      // 1. Buscar Análises (jobs)
      const { data: analysesData, error: ae } = await supabase
        .from('jobs').select('id,name,filters,created_at')
        .eq('user_id', userId).order('created_at', { ascending: false });
      if (ae) throw ae;

      // 2. Buscar Vagas do Portal (vagas_white_label)
      const { data: whiteLabelData, error: we } = await supabase
        .from('vagas_white_label')
        .select('id, title, created_at, organization_id')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (we) throw we;

      // 3. Buscar estatísticas para Análises
      let analysisStats: JobWithStats[] = [];
      if (analysesData?.length) {
        const ids = analysesData.map(j => j.id);
        const { data: jcData } = await supabase.from('job_candidates').select('job_id, score').in('job_id', ids);
        const cnt: Record<string, number> = {};
        const top: Record<string, number> = {};
        (jcData ?? []).forEach(row => {
          cnt[row.job_id] = (cnt[row.job_id] ?? 0) + 1;
          if ((row.score || 0) >= 70) top[row.job_id] = (top[row.job_id] ?? 0) + 1;
        });
        analysisStats = analysesData.map(j => ({
          ...j,
          type: 'analysis',
          totalCandidates: cnt[j.id] ?? 0,
          topCandidates: top[j.id] ?? 0
        }));
      }

      // 4. Buscar estatísticas para Vagas Criadas
      let whiteLabelStats: JobWithStats[] = [];
      if (whiteLabelData?.length) {
        const ids = whiteLabelData.map(j => j.id);
        const { data: vcData } = await supabase.from('vagas_candidaturas').select('vaga_id, match_score').in('vaga_id', ids);
        const cnt: Record<string, number> = {};
        const top: Record<string, number> = {};
        (vcData ?? []).forEach(row => {
          cnt[row.vaga_id] = (cnt[row.vaga_id] ?? 0) + 1;
          if ((row.match_score || 0) >= 70) top[row.vaga_id] = (top[row.vaga_id] ?? 0) + 1;
        });
        whiteLabelStats = whiteLabelData.map(j => ({
          id: j.id,
          name: j.title,
          filters: null,
          created_at: j.created_at,
          type: 'job',
          totalCandidates: cnt[j.id] ?? 0,
          topCandidates: top[j.id] ?? 0
        }));
      }

      // Mesclar e ordenar por data
      const merged = [...analysisStats, ...whiteLabelStats].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setJobs(merged);
    } catch (e: any) {
      console.error('Erro no Dashboard:', e);
      setError('Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }

  // Chart data
  const barData = jobs.slice(0, 20).map(j => ({
    name: j.type === 'job' ? j.name : `[A] ${j.name}`,
    shortName: j.name.length > 10 ? j.name.slice(0, 10) + '…' : j.name,
    fullName: j.name,
    type: j.type === 'job' ? 'Vaga' : 'Análise',
    color: j.type === 'job' ? '#6366f1' : '#a78bfa',
    Avaliados: j.totalCandidates,
    Match: j.topCandidates,
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

  // Group data by date for Area Chart (Volume Histórico)
  const groupedByDate: Record<string, { name: string, Vagas: number, Analises: number, Match: number }> = {};
  
  filteredJobs.slice().reverse().forEach(j => {
    const date = j.created_at.slice(0, 10);
    const dayMonth = `${date.slice(8, 10)}/${date.slice(5, 7)}`;
    if (!groupedByDate[date]) {
      groupedByDate[date] = { name: dayMonth, Vagas: 0, Analises: 0, Match: 0 };
    }
    if (j.type === 'job') groupedByDate[date].Vagas += j.totalCandidates;
    else groupedByDate[date].Analises += j.totalCandidates;
    groupedByDate[date].Match += j.topCandidates;
  });

  const areaData = Object.values(groupedByDate);

  const topJobs = [...jobs].sort((a, b) => b.totalCandidates - a.totalCandidates).slice(0, 5);

  // Calendar helpers
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayStr = today.toISOString().slice(0, 10);

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmtDate = (d: string | null) => {
    if (!d) return '';
    return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
  };
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
      <div className="anim-1" style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <LayoutGrid size={32} style={{ color: 'var(--primary)' }} />
              <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Dashboard
              </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Visão geral</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => setIsCustomizing(!isCustomizing)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 8, 
              background: 'var(--primary)', 
              border: 'none', 
              borderRadius: 12, padding: '8px 16px',
              color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(99,102,241,0.25)'
            }}
          >
            {isCustomizing ? <Check style={{ width: 15, height: 15 }} /> : <Settings2 style={{ width: 15, height: 15 }} />}
            {isCustomizing ? 'Concluir' : 'Customizar'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 14px' }}>
            <div className="live-dot" />
            <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>Tempo real</span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="anim-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { 
            label: 'Vagas Totais', value: totalVagas, suffix: '', icon: Briefcase, 
            orb: '#6366f1', 
            planet: { 
              name: 'Saturn', size: 90, 
              color: 'radial-gradient(circle at 35% 35%, #fef3c7 0%, #d97706 40%, #78350f 100%)', 
              right: -10, bottom: -15, ring: true,
              style: { boxShadow: 'inset -20px -20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(217,119,6,0.15)' }
            } 
          },
          { 
            label: 'Candidatos Avaliados', value: totalAvaliados, suffix: '', icon: Users, 
            orb: '#0ea5e9', 
            planet: { 
              name: 'Jupiter', size: 105, 
              color: 'radial-gradient(circle at 30% 30%, #fff7ed 0%, #f59e0b 35%, #7c2d12 100%)', 
              right: -5, bottom: 15, ring: false, 
              style: { boxShadow: 'inset -25px -25px 50px rgba(0,0,0,0.5)', opacity: 0.9 }
            } 
          },
          { 
            label: 'Melhores Candidatos', value: totalMelhores, suffix: '', icon: Award, 
            orb: '#2563eb', 
            planet: { 
              name: 'Earth', size: 85, 
              color: 'radial-gradient(circle at 35% 35%, #60a5fa 0%, #2563eb 50%, #1e3a8a 100%)', 
              right: 15, bottom: 5, ring: false, 
              style: { boxShadow: 'inset -15px -15px 35px rgba(0,0,0,0.6), 0 0 25px rgba(37,99,235,0.25)' }
            } 
          },
          { 
            label: 'Taxa de Aprovação', 
            value: taxaAprovacao, 
            suffix: '%', icon: TrendingUp, 
            orb: '#22c55e', 
            planet: { 
              name: 'Moon', size: 75, 
              color: 'radial-gradient(circle at 30% 30%, #f3f4f6 0%, #9ca3af 50%, #374151 100%)', 
              right: 20, bottom: -5, ring: false, 
              style: { opacity: 0.85, boxShadow: 'inset -20px -20px 40px rgba(0,0,0,0.5)' }
            } 
          },
        ].map((k, idx) => {
          const Icon = k.icon;
          return (
            <div key={k.label} 
              className={`kpi-card d-card ${bgTheme === 'spatial' ? 'card-spatial' : ''}`}
              style={{ position: 'relative', overflow: 'hidden', '--card-idx': idx } as React.CSSProperties}
            >
              {bgTheme === 'spatial' && <div className="card-spatial-glow" />}
              <div className="kpi-orb" style={{ background: k.orb }} />
              
              {/* Theme-based backgrounds */}
              {bgTheme === 'planets' && (
                <>
                  {/* Animated Stars - Maximum Density */}
                  {[...Array(35)].map((_, i) => (
                    <div 
                      key={i} 
                      className="star" 
                      style={{ 
                        width: (i % 6 === 0 ? 2 : 1), 
                        height: (i % 6 === 0 ? 2 : 1), 
                        top: `${(i * 13) % 95}%`, 
                        left: `${(idx * 23 + i * 31) % 95}%`, 
                        '--duration': `${1.5 + (i % 5) * 0.4}s`,
                        animationDelay: `${i * 0.1}s`,
                        opacity: 0.15 + (i % 5) * 0.15
                      } as any} 
                    />
                  ))}

                  {/* Rotating Planet */}
                  <div 
                    className="planet" 
                    style={{ 
                      width: k.planet.size, 
                      height: k.planet.size, 
                      background: 'black', 
                      backgroundImage: k.planet.color, 
                      right: k.planet.right, 
                      bottom: k.planet.bottom,
                      animation: 'float 18s ease-in-out infinite',
                      animationDelay: `${idx * 1.2}s`,
                      zIndex: 2,
                      ...(k.planet.style || {})
                    } as any}
                  >
                    <PlanetOverlay type={k.planet.name} />
                    {k.planet.ring && (
                      <div className="planet-ring" style={{ 
                        width: k.planet.size * 2.4, 
                        height: k.planet.size * 0.5, 
                        background: 'radial-gradient(ellipse at center, transparent 38%, rgba(217,119,6,0.1) 39%, rgba(217,119,6,0.2) 45%, rgba(217,119,6,0.05) 55%, rgba(217,119,6,0.15) 65%, transparent 66%)', 
                        transform: 'translate(-50%, -50%) rotate(-15deg)', 
                        filter: 'blur(0.5px)',
                        boxShadow: '0 0 10px rgba(217,119,6,0.05)'
                      }} />
                    )}
                  </div>
                </>
              )}

              {bgTheme === 'spatial' && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at 100% 100%, rgba(44, 88, 253, 0.08) 0%, transparent 60%)',
                  pointerEvents: 'none',
                  zIndex: 1
                }} />
              )}

              <div style={{ position: 'relative', zIndex: 3 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ 
                    background: theme === 'dark' ? 'rgba(7, 15, 42, 0.65)' : 'var(--primary-light-bg)', 
                    backdropFilter: 'blur(8px)', 
                    border: '1px solid ' + (theme === 'dark' ? 'rgba(99,102,241,0.3)' : 'var(--primary-border)'), 
                    borderRadius: 12, 
                    padding: 10, 
                    display: 'flex', 
                    boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(37,99,235,0.08)' 
                  }}>
                    <Icon style={{ width: 18, height: 18, color: 'var(--primary)' }} />
                  </div>
                  <ArrowUpRight style={{ width: 16, height: 16, color: 'var(--text-dim)' }} />
                </div>
                <p style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{k.label}</p>
                <div style={{ color: 'var(--text-main)', fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  <AnimatedNumber target={k.value} suffix={k.suffix} />
                </div>
              </div>
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
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Crie uma nova análise ou vaga para começar a ver os dados aqui.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <button onClick={() => navigate('/analise/nova')} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 28px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Nova Análise</button>
            <button onClick={() => navigate('/vagas/nova')} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: 12, padding: '10px 28px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Criar Vaga</button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Row 1: Area Chart + Calendar ── */}
          <div className="anim-3" style={{ position: 'relative', display: 'flex', flexDirection: layout.calendarPos === 'right' ? 'row' : 'row-reverse', gap: 16, marginBottom: 16 }}>
            {isCustomizing && (
              <div 
                onClick={() => saveLayout({ ...layout, calendarPos: layout.calendarPos === 'right' ? 'left' : 'right' })}
                style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: 'var(--primary)', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}
              >
                <RefreshCw style={{ width: 12, height: 12 }} /> Inverter Posição
              </div>
            )}

            {/* Area Chart */}
            <div className="d-card" style={{ flex: 1, padding: '24px 20px 16px', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <p style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Volume Histórico</p>
                  <p style={{ color: 'var(--text-main)', fontSize: 20, fontWeight: 700 }}>Candidatos & Match</p>
                  <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -4 }}>
                    {activeStart
                      ? activeEnd && activeEnd !== activeStart
                        ? `${fmtDate(activeStart)} → ${fmtDate(activeEnd)}`
                        : fmtDate(activeStart)
                      : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[
                    { color: '#6366f1', label: 'Vagas' }, 
                    { color: '#a78bfa', label: 'Análises' }, 
                    { color: '#22c55e', label: 'Match' }
                  ].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                      <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ height: 220, width: '100%' }}>
                {showCharts && (
                  <ResponsiveContainer width="100%" height={220} debounce={150}>
                    <AreaChart data={areaData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gVaga" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gAnalise" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gMatch" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        content={({ active, payload, label: _label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div style={{ ...TT, padding: '10px 14px' }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>{label}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {payload.map((p: any) => (
                                    <p key={p.dataKey} style={{ color: p.color, fontSize: 12, fontWeight: 600 }}>
                                      {p.name}: {p.value}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="Vagas" stroke="#6366f1" strokeWidth={2.5} fill="url(#gVaga)" dot={false} activeDot={{ r: 5, fill: '#6366f1' }} />
                      <Area type="monotone" dataKey="Analises" stroke="#a78bfa" strokeWidth={2.5} fill="url(#gAnalise)" dot={false} activeDot={{ r: 5, fill: '#a78bfa' }} />
                      <Area type="monotone" dataKey="Match" stroke="#22c55e" strokeWidth={2.5} fill="url(#gMatch)" dot={false} activeDot={{ r: 5, fill: '#22c55e' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Calendar */}
            <div className="d-card" style={{ width: 360, padding: 20, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
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
          <div className="anim-4" style={{ display: 'flex', flexDirection: layout.rankingPos === 'right' ? 'row' : 'row-reverse', gap: 16, marginBottom: 16, position: 'relative' }}>
            {isCustomizing && (
              <div 
                onClick={() => saveLayout({ ...layout, rankingPos: layout.rankingPos === 'right' ? 'left' : 'right' })}
                style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: 'var(--primary)', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}
              >
                <RefreshCw style={{ width: 12, height: 12 }} /> Inverter Posição
              </div>
            )}

            {/* Bar Chart */}
            <div className="d-card" style={{ flex: 1, padding: '24px 20px 16px', minWidth: 0 }}>
              <div style={{ marginBottom: 24 }}>
                <p style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Comparativo</p>
                <p style={{ color: 'var(--text-main)', fontSize: 20, fontWeight: 700 }}>Candidatos por Vaga</p>
              </div>
              <div style={{ height: 220, width: '100%' }}>
                {showCharts && (
                  <ResponsiveContainer width="100%" height={220} debounce={150}>
                    <BarChart data={barData} barGap={4} barCategoryGap="32%" margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip 
                        content={({ active, payload, label: _label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div style={{ ...TT, padding: '10px 14px' }}>
                                <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 700 }}>{data.type}</p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>{data.fullName}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <p style={{ color: '#6366f1', fontSize: 12, fontWeight: 600 }}>Total: {data.Avaliados}</p>
                                  <p style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>Match: {data.Match}</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                        cursor={{ fill: 'rgba(99,102,241,0.05)' }} 
                      />
                      <Bar dataKey="Avaliados" radius={[6, 6, 0, 0]} maxBarSize={42}>
                        {barData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                      <Bar dataKey="Match" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={42} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top Jobs Table */}
            <div className="d-card" style={{ width: 360, padding: 24, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <p style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Ranking</p>
                  <p style={{ color: 'var(--text-main)', fontSize: 17, fontWeight: 700 }}>Top Vagas</p>
                </div>
                <button onClick={() => navigate('/vagas')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Ver todas <ChevronRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {topJobs.map((j, i) => {
                  const maxTotal = Math.max(...topJobs.map(tj => tj.totalCandidates), 1);
                  const volumePct = Math.round((j.totalCandidates / maxTotal) * 100);
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={j.id} 
                      className="top-row" 
                      onClick={() => navigate(j.type === 'job' ? `/vagas/${j.id}/candidatos` : '/analises')}
                      style={{ padding: '10px 8px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: medals[i] ? 22 : 13, fontWeight: medals[i] ? 400 : 700, color: 'var(--text-muted)', lineHeight: 1 }}>{medals[i] ?? `${i + 1}`}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'var(--text-main)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{j.name}</p>
                        <div style={{ height: 4, background: 'var(--bg-main)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${volumePct}%`, background: 'linear-gradient(90deg,#6366f1,#a78bfa)', borderRadius: 4, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ color: 'var(--text-main)', fontSize: 13, fontWeight: 700 }}>{j.totalCandidates}</p>
                        <p style={{ color: 'var(--text-dim)', fontSize: 10 }}>Total</p>
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
              <button onClick={() => navigate('/vagas')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, borderRadius: 10, padding: '6px 14px' }}>
                Ver todas <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
              {jobs.slice(0, 8).map((j, i) => {
                const pct = j.totalCandidates > 0 ? Math.round((j.topCandidates / j.totalCandidates) * 100) : 0;
                const date = new Date(j.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                
                // Cycle through planets for variety
                const planetVariants = [
                  { name: 'Saturn', color: 'radial-gradient(circle at 35% 35%, #fef3c7 0%, #d97706 40%, #78350f 100%)', shadow: 'rgba(217,119,6,0.15)', ring: true },
                  { name: 'Jupiter', color: 'radial-gradient(circle at 30% 30%, #fff7ed 0%, #f59e0b 35%, #7c2d12 100%)', shadow: 'rgba(124,45,18,0.2)' },
                  { name: 'Earth', color: 'radial-gradient(circle at 35% 35%, #60a5fa 0%, #2563eb 50%, #1e3a8a 100%)', shadow: 'rgba(37,99,235,0.2)' },
                  { name: 'Mars', color: 'radial-gradient(circle at 35% 35%, #f87171 0%, #b91c1c 50%, #450a0a 100%)', shadow: 'rgba(185,28,28,0.15)' },
                  { name: 'Neptune', color: 'radial-gradient(circle at 35% 35%, #38bdf8 0%, #1d4ed8 50%, #1e3a8a 100%)', shadow: 'rgba(29,78,216,0.2)' },
                  { name: 'Venus', color: 'radial-gradient(circle at 35% 35%, #fde68a 0%, #d97706 50%, #78350f 100%)', shadow: 'rgba(217,119,6,0.15)' },
                  { name: 'Moon', color: 'radial-gradient(circle at 30% 30%, #f3f4f6 0%, #9ca3af 50%, #374151 100%)', shadow: 'rgba(156,163,175,0.15)' }
                ];
                const p = planetVariants[j.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % planetVariants.length];

                return (
                  <div key={j.id} onClick={() => navigate(j.type === 'job' ? `/vagas/${j.id}/candidatos` : '/analises')} 
                    className={`d-card ${bgTheme === 'spatial' ? 'card-spatial' : ''}`}
                    style={{ position: 'relative', overflow: 'hidden', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', border: bgTheme === 'spatial' ? 'none' : '1px solid var(--border)', minHeight: 145, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                    onMouseEnter={e => { 
                      if (bgTheme !== 'spatial') {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.35)'; 
                      }
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; 
                      (e.currentTarget as HTMLDivElement).style.boxShadow = bgTheme === 'spatial' ? '0 20px 40px rgba(44, 88, 253, 0.15)' : '0 12px 40px rgba(0,0,0,0.35)'; 
                    }}
                    onMouseLeave={e => { 
                      if (bgTheme !== 'spatial') {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; 
                      }
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; 
                      (e.currentTarget as HTMLDivElement).style.boxShadow = bgTheme === 'spatial' ? '0 10px 30px rgba(0, 0, 0, 0.5)' : 'none'; 
                    }}>
                    {bgTheme === 'spatial' && <div className="card-spatial-glow" />}
                    
                    {/* Theme-based backgrounds */}
                    {bgTheme === 'planets' && (
                      <>
                        {/* Stars Background */}
                        {[...Array(12)].map((si) => (
                          <div key={si} className="star" style={{ width: 1, height: 1, top: `${(si * 13) % 95}%`, left: `${(si * 29 + i * 11) % 95}%`, '--duration': `${2 + (si % 3)}s`, opacity: 0.15 } as any} />
                        ))}
                      </>
                    )}

                    <div style={{ position: 'relative', zIndex: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <p style={{ color: 'var(--text-main)', fontSize: 13, fontWeight: 700, flex: 1, marginRight: 4, lineHeight: 1.2, letterSpacing: '-0.01em', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{j.name}</p>
                        <span style={{ color: 'var(--text-dim)', fontSize: 10, whiteSpace: 'nowrap', fontWeight: 600 }}>{date}</span>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <span style={{ 
                          fontSize: '9px', 
                          fontWeight: 800, 
                          textTransform: 'uppercase', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          background: j.type === 'job' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                          color: j.type === 'job' ? '#22c55e' : '#6366f1',
                          border: `1px solid ${j.type === 'job' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`
                        }}>
                          {j.type === 'job' ? 'Vaga' : 'Análise'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                        <div>
                          <p style={{ color: 'var(--text-dim)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>Total</p>
                          <p style={{ color: 'var(--text-main)', fontSize: 14, fontWeight: 800 }}>{j.totalCandidates}</p>
                        </div>
                        <div>
                          <p style={{ color: 'var(--text-dim)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>Match</p>
                          <p style={{ color: '#22c55e', fontSize: 14, fontWeight: 800 }}>{j.topCandidates}</p>
                        </div>
                        <div style={{ flex: 1, minWidth: 45 }}>
                          <p style={{ color: 'var(--text-dim)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>%</p>
                          <p style={{ color: pct >= 50 ? '#22c55e' : pct >= 25 ? '#f59e0b' : '#ef4444', fontSize: pct >= 100 ? 14 : 15, fontWeight: 800, textAlign: 'right' }}>{pct}%</p>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ position: 'relative', zIndex: 1, marginTop: 2, marginRight: 75 }}>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 50 ? 'linear-gradient(90deg,#6366f1,#4ade80)' : pct >= 25 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : '#ef4444', borderRadius: 4, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                      </div>
                    </div>

                    {/* Mini Planet Segment - Compact */}
                    {bgTheme === 'planets' && (
                      <div className="planet" style={{ position: 'absolute', width: 75, height: 75, borderRadius: '50%', background: p.color, right: -12, bottom: -12, opacity: 1, boxShadow: `inset -12px -12px 25px rgba(0,0,0,0.5), 0 0 20px ${p.shadow}`, transition: 'all 0.4s ease', zIndex: 10 } as any}>
                        <PlanetOverlay type={p.name} />
                        {p.ring && <div className="planet-ring" style={{ width: 125, height: 18, background: 'radial-gradient(ellipse, transparent 40%, rgba(217,119,6,0.1) 45%, transparent 60%)', transform: 'translate(-50%, -50%) rotate(-15deg)', filter: 'blur(1px)' }} />}
                      </div>
                    )}

                    {bgTheme === 'spatial' && (
                      <div style={{
                        position: 'absolute',
                        right: -10,
                        bottom: -10,
                        width: 80,
                        height: 80,
                        background: 'radial-gradient(circle at center, rgba(44, 88, 253, 0.12) 0%, transparent 70%)',
                        filter: 'blur(20px)',
                        zIndex: 1
                      }} />
                    )}
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

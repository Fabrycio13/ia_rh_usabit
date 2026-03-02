import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, UserRound, Star, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useAnalysis } from '../contexts/AnalysisContext';

interface Job {
  id: string;
  name: string;
  created_at: string;
  totalCandidates: number;
  topCandidates: number;
  filters: { gender?: string; age?: string; location?: string } | null;
}

interface Candidate {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  age: string | null;
  gender: string | null;
  score: number;
  skills: string | null;
  experience: string | null;
  education: string | null;
  attention_points: string | null;
  resumeUrl: string | null;
}

const scoreColor = (s: number) =>
  s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444';

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();

/** Separa qualquer texto de skills em chips individuais */
function parseSkills(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let cleaned = raw
    .replace(/experiência em/gi, '')
    .replace(/conhecimento em/gi, '')
    .replace(/domínio de/gi, '')
    .replace(/habilidade em/gi, '')
    .replace(/proficiência em/gi, '');
  const parts = cleaned.split(/,|;|\se\/ou\s|\sou\s|\se\s|\//);
  return parts
    .map(s => s.replace(/[.]/g, '').trim())
    .filter(s => s.length > 1 && s.length < 60);
}

// ─── Detail View ──────────────────────────────────────────────────────────────
export function JobDetailView({ jobId }: { jobId: string }) {
  const navigate = useNavigate();
  const { profile } = useUser();
  const [job, setJob] = useState<{ name: string; created_at: string } | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'best' | 'mid' | 'worst'>('best');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    try { return profile.userId ? JSON.parse(localStorage.getItem(`fav-${profile.userId}`) ?? '{}') : {}; } catch { return {}; }
  });

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(`fav-${profile.userId}`, JSON.stringify(next)); } catch { }
      return next;
    });
  };

  useEffect(() => {
    async function load() {
      try {
        // Load job info
        const { data: jobData, error: jobErr } = await supabase
          .from('jobs')
          .select('name, created_at')
          .eq('id', jobId)
          .single();

        if (jobErr) throw jobErr;
        setJob(jobData);

        // Load candidates via join: job_candidates → candidates
        const { data: jcData, error: candErr } = await supabase
          .from('job_candidates')
          .select('candidates(id, name, email, phone, location, age, gender, analysis)')
          .eq('job_id', jobId);

        if (candErr) throw candErr;

        const mapped: Candidate[] = (jcData ?? [])
          .map((row: any) => row.candidates)
          .filter(Boolean)
          .map((c: any) => {
            // Busca o score e dados desta vaga específica pelo histórico (se disponível)
            const history: any[] = Array.isArray(c.analysis?.history) ? c.analysis.history : [];
            const jobEntry = history.find((h: any) => h.job_id === jobId);

            // Prioriza o jobEntry do histórico, caso contrário tenta a raiz (compatibilidade)
            const analysis = jobEntry ?? c.analysis ?? {};

            // O score agora é pego exclusivamente da análise vinculada a este job
            const score = typeof analysis.score === 'number' ? analysis.score : 0;

            return {
              id: c.id,
              name: c.name,
              email: c.email,
              phone: c.phone ?? null,
              location: c.location ?? null,
              age: c.age ?? null,
              gender: c.gender ?? null,
              score,
              skills: analysis.skills ?? null,
              experience: analysis.experience ?? null,
              education: analysis.education ?? null,
              attention_points: analysis.redFlags ?? null,
              resumeUrl: null,
            };
          })
          .sort((a: Candidate, b: Candidate) => b.score - a.score);

        // Load resume URLs from resume_uploads
        const candidateIds = mapped.map(c => c.id);
        if (candidateIds.length > 0) {
          const { data: ruData } = await supabase
            .from('resume_uploads')
            .select('job_id, file_path')
            .eq('job_id', jobId);
          if (ruData && ruData.length > 0) {
            // Map each candidate to its resume by position (upload order = candidate order)
            // As fallback, use the candidate's own resume_url stored in the candidates table
            const { data: candWithUrl } = await supabase
              .from('candidates')
              .select('id, resume_url')
              .in('id', candidateIds);
            if (candWithUrl) {
              const urlMap: Record<string, string> = {};
              candWithUrl.forEach((r: any) => { if (r.resume_url) urlMap[r.id] = r.resume_url; });
              mapped.forEach(c => { c.resumeUrl = urlMap[c.id] ?? null; });
            }
          }
        }

        setCandidates(mapped);
      } catch (err: any) {
        console.error('Erro ao carregar análise:', err);
        toast.error('Erro ao carregar análise: ' + (err.message ?? 'erro desconhecido'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId]);

  // Re-init favorites if userId arrives late
  useEffect(() => {
    if (profile.userId) {
      try { setFavorites(JSON.parse(localStorage.getItem(`fav-${profile.userId}`) ?? '{}')); } catch { }
    }
  }, [profile.userId]);

  // Escolhe a melhor aba inicial após carregar
  useEffect(() => {
    if (!loading && candidates.length > 0) {
      const bestCount = candidates.filter(c => c.score >= 70).length;
      const midCount = candidates.filter(c => c.score >= 40 && c.score < 70).length;
      if (bestCount > 0) setActiveTab('best');
      else if (midCount > 0) setActiveTab('mid');
      else setActiveTab('worst');
    }
  }, [loading, candidates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const best = candidates.filter(c => c.score >= 70);
  const mid = candidates.filter(c => c.score >= 40 && c.score < 70);
  const worst = candidates.filter(c => c.score < 40);
  const displayed = activeTab === 'best' ? best : activeTab === 'mid' ? mid : worst;
  const sortedAll = [...candidates].sort((a, b) => b.score - a.score);

  const tabs = [
    { key: 'best' as const, label: 'Melhores', count: best.length, color: '#10b981' },
    { key: 'mid' as const, label: 'Intermediários', count: mid.length, color: '#f59e0b' },
    { key: 'worst' as const, label: 'Piores', count: worst.length, color: '#ef4444' },
  ];

  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analises')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <span className="text-slate-600">|</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{job?.name ?? 'Análise'}</h1>
            {job && <p className="text-slate-400 text-xs mt-0.5">{new Date(job.created_at).toLocaleDateString('pt-BR')} às {new Date(job.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="bg-[#12141d] border border-white/5 rounded-xl px-3 py-1.5">{candidates.length} candidatos</span>
          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-3 py-1.5">{best.length} aprovados</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-[#12141d] rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === t.key ? '#fff' : 'transparent',
              color: activeTab === t.key ? '#0b0d12' : '#64748b',
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Table */}
      {candidates.length === 0 ? (
        <div className="bg-[#12141d] border border-white/5 rounded-2xl p-16 text-center">
          <p className="text-slate-400 text-lg mb-2">Nenhum candidato nesta análise</p>
          <p className="text-slate-500 text-sm">Os candidatos podem não ter sido salvos corretamente.</p>
        </div>
      ) : (
        <div style={{ background: '#15171e', border: '1px solid #1f2332', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '6%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '18%' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1px solid #1f2332', background: '#12141d' }}>
                {['Rank', 'Nome', 'Idade', 'Localização', 'Gênero', 'Score', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                  Nenhum candidato nesta categoria.
                </td></tr>
              ) : displayed.map((c) => (
                <tr key={c.id}
                  onClick={() => setSelectedCandidate(c)}
                  style={{ borderBottom: '1px solid #1a1c27', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Rank */}
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: sortedAll.indexOf(c) < 3 ? '#f59e0b' : '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {sortedAll.indexOf(c) < 3 ? ['🥇', '🥈', '🥉'][sortedAll.indexOf(c)] : null}
                      {sortedAll.indexOf(c) + 1}
                    </span>
                  </td>
                  {/* Nome */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f122', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {initials(c.name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: '#f8fafc', fontWeight: 500, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                        {c.email && <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  {/* Idade */}
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8' }}>
                    {(c.age && !/não\s*informado/i.test(c.age)) ? `${c.age} anos` : '—'}
                  </td>
                  {/* Localização */}
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.location ?? '—'}
                  </td>
                  {/* Gênero */}
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {c.gender ?? '—'}
                  </td>
                  {/* Score */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: `${scoreColor(c.score)}22`, color: scoreColor(c.score), border: `1px solid ${scoreColor(c.score)}44`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                      {c.score}%
                    </span>
                  </td>
                  {/* Ações */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button
                        title="Favoritar"
                        onClick={e => { e.stopPropagation(); toggleFav(c.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: favorites[c.id] ? '#fbbf24' : '#64748b', padding: 6, borderRadius: 6 }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(251,191,36,0.1)'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                      >
                        <Star size={16} fill={favorites[c.id] ? '#fbbf24' : 'none'} strokeWidth={1.5} />
                      </button>
                      <button
                        title={c.resumeUrl ? 'Abrir Currículo' : 'PDF não disponível'}
                        onClick={e => {
                          e.stopPropagation();
                          if (c.resumeUrl) {
                            const a = document.createElement('a');
                            a.href = c.resumeUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
                            document.body.appendChild(a); a.click(); document.body.removeChild(a);
                          } else {
                            toast.error('PDF não disponível para este candidato.');
                          }
                        }}
                        style={{ background: 'none', border: 'none', cursor: c.resumeUrl ? 'pointer' : 'not-allowed', color: c.resumeUrl ? '#818cf8' : '#2d3147', padding: 6, borderRadius: 6 }}
                        onMouseEnter={e => { if (c.resumeUrl) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.1)'; }}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                      >
                        <ClipboardList size={16} />
                      </button>
                      <button
                        title="Ver Perfil Completo"
                        onClick={e => { e.stopPropagation(); setSelectedCandidate(c); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6, borderRadius: 6 }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.1)'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                      >
                        <UserRound size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}


      {/* Candidate Detail Side Panel */}
      {selectedCandidate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div onClick={() => setSelectedCandidate(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', zIndex: 1, width: 460, height: '100vh', background: '#0d0f17', borderLeft: '1px solid #1f2332', overflowY: 'auto', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold text-white">
                  {initials(selectedCandidate.name)}
                </div>
                <div>
                  <p className="text-white font-bold text-lg">{selectedCandidate.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${scoreColor(selectedCandidate.score)}22`, color: scoreColor(selectedCandidate.score), border: `1px solid ${scoreColor(selectedCandidate.score)}44` }}>
                    Score: {selectedCandidate.score}%
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="text-slate-400 hover:text-white transition-colors bg-[#1a1c27] border border-[#1f2332] rounded-lg p-2">✕</button>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Contato</p>
              <div className="bg-[#12141d] rounded-xl border border-[#1f2332] divide-y divide-[#1f2332] text-sm">
                {selectedCandidate.email && <div className="flex justify-between px-4 py-3"><span className="text-slate-400">Email</span><span className="text-slate-200">{selectedCandidate.email}</span></div>}
                {selectedCandidate.phone && <div className="flex justify-between px-4 py-3"><span className="text-slate-400">Telefone</span><span className="text-slate-200">{selectedCandidate.phone}</span></div>}
                {selectedCandidate.location && <div className="flex justify-between px-4 py-3"><span className="text-slate-400">Local</span><span className="text-slate-200">{selectedCandidate.location}</span></div>}
                {selectedCandidate.age && <div className="flex justify-between px-4 py-3"><span className="text-slate-400">Idade</span><span className="text-slate-200">{selectedCandidate.age}</span></div>}
                {selectedCandidate.gender && <div className="flex justify-between px-4 py-3"><span className="text-slate-400">Gênero</span><span className="text-slate-200">{selectedCandidate.gender}</span></div>}
              </div>
            </div>

            {selectedCandidate.skills && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Habilidades</p>
                <div className="flex flex-wrap gap-2">
                  {parseSkills(selectedCandidate.skills).map(s => (
                    <span key={s} className="bg-[#1a1c27] border border-[#2d3147] rounded-md px-3 py-1 text-xs text-indigo-300 font-medium">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedCandidate.experience && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Experiência</p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{selectedCandidate.experience}</p>
              </div>
            )}

            {selectedCandidate.education && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Formação</p>
                <p className="text-sm text-slate-300">{selectedCandidate.education}</p>
              </div>
            )}

            {selectedCandidate.attention_points && (
              <div>
                <p className="text-xs text-red-400 uppercase tracking-widest mb-3">Pontos de Atenção</p>
                <p className="text-sm text-red-300 leading-relaxed whitespace-pre-line">{selectedCandidate.attention_points}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main List ─────────────────────────────────────────────────────────────────
export const Analises = () => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { analyzing } = useAnalysis();

  useEffect(() => {
    if (analyzing) {
      navigate('/analise/nova');
    }
  }, [analyzing, navigate]);

  useEffect(() => {
    if (!profile.loaded) return;
    if (!profile.userId) { setLoading(false); return; }
    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    fetchAnalises(profile.userId).finally(() => clearTimeout(safetyTimer));
    return () => clearTimeout(safetyTimer);
  }, [profile.userId, profile.loaded]);

  async function fetchAnalises(userId: string) {
    try {
      setLoading(true);
      setError(null);

      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, name, filters, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;
      if (!jobsData || jobsData.length === 0) { setJobs([]); return; }

      const jobIds = jobsData.map(j => j.id);

      const { data: jcData } = await supabase
        .from('job_candidates')
        .select('job_id')
        .in('job_id', jobIds);

      const countByJob: Record<string, number> = {};
      (jcData ?? []).forEach(({ job_id }) => { countByJob[job_id] = (countByJob[job_id] ?? 0) + 1; });

      setJobs(jobsData.map(j => ({
        ...j,
        totalCandidates: countByJob[j.id] ?? 0,
        topCandidates: (j.filters as any)?.best ?? 0,
      })));
    } catch (err: any) {
      console.error('Erro ao carregar análises:', err);
      setError('Não foi possível carregar as análises.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteJob(e: React.MouseEvent, jId: string, jName: string) {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja excluir a análise "${jName}"? Todos os dados vinculados serão removidos.`)) return;
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', jId).eq('user_id', profile.userId);
      if (error) throw error;
      toast.success('Análise excluída com sucesso');
      setJobs(prev => prev.filter(j => j.id !== jId));
    } catch (err) {
      console.error('Erro ao excluir análise:', err);
      toast.error('Ocorreu um erro ao excluir a análise.');
    }
  }

  const recent = jobs.slice(0, 3);
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' - ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  const COLORS = ['bg-indigo-600', 'bg-purple-700', 'bg-indigo-500', 'bg-violet-600'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Carregando análises…</p>
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
          <button onClick={() => fetchAnalises(profile.userId)} className="bg-[#6366f1] text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-slate-400 text-sm mb-1">Olá, esse é a</p>
          <h1 className="text-2xl font-bold tracking-tight">IA Análise de Currículos</h1>
        </div>
        <button
          onClick={() => navigate('/analise/nova?new=true')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Análise
        </button>
      </div>

      {/* Recentes */}
      {recent.length > 0 && (
        <>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-4">Acessados recentemente</p>
          <div className="flex gap-3 mb-10 flex-wrap">
            {recent.map((j, i) => (
              <div
                key={j.id}
                onClick={() => navigate(`/analise/${j.id}`)}
                className="flex items-center gap-3 bg-[#12141d] border border-white/5 rounded-2xl px-4 py-3 cursor-pointer hover:border-indigo-500/40 transition-colors min-w-[180px]"
              >
                <div className={`w-9 h-9 rounded-full ${COLORS[i % COLORS.length]} flex items-center justify-center font-bold text-sm text-white flex-shrink-0`}>
                  {j.name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{j.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(j.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tabela */}
      <p className="text-xs text-slate-400 uppercase tracking-widest mb-4">Últimas análises</p>

      {jobs.length === 0 ? (
        <div className="bg-[#12141d] border border-white/5 rounded-2xl p-16 text-center">
          <p className="text-slate-400 text-lg mb-2">Nenhuma análise encontrada</p>
          <p className="text-slate-500 text-sm mb-6">Clique em "Nova Análise" para começar.</p>
          <button
            onClick={() => navigate('/analise/nova?new=true')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors mx-auto"
          >
            <Plus className="w-4 h-4" /> Nova Análise
          </button>
        </div>
      ) : (
        <div className="bg-[#12141d]/50 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02]">
              <tr>
                <th className="px-6 py-4 text-left font-medium text-slate-400">Nome da Vaga</th>
                <th className="px-6 py-4 text-center font-medium text-slate-400">Candidatos Avaliados</th>
                <th className="px-6 py-4 text-center font-medium text-slate-400">Melhores Candidatos</th>
                <th className="px-6 py-4 text-center font-medium text-slate-400">Faixa Etária</th>
                <th className="px-6 py-4 text-center font-medium text-slate-400">Gênero</th>
                <th className="px-6 py-4 text-center font-medium text-slate-400">Localidade</th>
                <th className="px-6 py-4 text-center font-medium text-slate-400">Última Atualização</th>
                <th className="px-6 py-4 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {jobs.map(j => (
                <tr
                  key={j.id}
                  onClick={() => navigate(`/analise/${j.id}`)}
                  className="hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 text-slate-200 font-medium">{j.name}</td>
                  <td className="px-6 py-4 text-center text-slate-300">{j.totalCandidates}</td>
                  <td className="px-6 py-4 text-center text-slate-300">{j.topCandidates}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{j.filters?.age || '—'}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{j.filters?.gender || '—'}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{j.filters?.location || '—'}</td>
                  <td className="px-6 py-4 text-center text-slate-400 whitespace-nowrap">{formatDate(j.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={(e) => handleDeleteJob(e, j.id, j.name)}
                        className="text-slate-500 hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, UserRound, Star, ClipboardList, Mail, Phone, MapPin, Calendar, Search, ChevronLeft, ChevronRight, X, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { useAnalysis } from '../../core/contexts/AnalysisContext';

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
  address: string | null;
  age: string | null;
  gender: string | null;
  score: number;
  skills: string | null;
  experience: string | null;
  education: string | null;
  attention_points: string | null;
  resumeUrl: string | null;
  isBlacklisted?: boolean;
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
          .select('candidates(id, name, email, phone, location, address, age, gender, is_blacklisted, analysis)')
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
              address: c.address ?? null,
              age: c.age ?? null,
              gender: c.gender ?? null,
              score,
              skills: analysis.skills ?? null,
              experience: analysis.experience ?? null,
              education: analysis.education ?? null,
              attention_points: analysis.redFlags ?? null,
              resumeUrl: null,
              isBlacklisted: c.is_blacklisted,
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
    <div className="text-[var(--text-main)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analises')}
            className="flex items-center gap-2 text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <span style={{ color: 'var(--border)' }}>|</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">{job?.name ?? 'Análise'}</h1>
            {job && <p className="text-[var(--text-dim)] text-xs mt-0.5">{new Date(job.created_at).toLocaleDateString('pt-BR')} às {new Date(job.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-dim)] rounded-xl px-3 py-1.5">{candidates.length} candidatos</span>
          <span style={{ background: 'var(--success-bg)', borderColor: 'var(--success)', color: 'var(--success)' }} className="border rounded-xl px-3 py-1.5">{best.length} aprovados</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-[var(--bg-main)] border border-[var(--border)] rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background: activeTab === t.key ? t.color : 'transparent',
              color: activeTab === t.key ? '#fff' : t.color,
              boxShadow: activeTab === t.key ? `0 4px 12px ${t.color}33` : 'none',
              opacity: activeTab === t.key ? 1 : 0.8
            }}
            onMouseEnter={e => {
              if (activeTab !== t.key) {
                e.currentTarget.style.background = `${t.color}11`;
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={e => {
              if (activeTab !== t.key) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.opacity = '0.8';
              }
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Table */}
      {candidates.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-white/5 rounded-2xl p-16 text-center">
          <p className="text-slate-400 text-lg mb-2">Nenhum candidato nesta análise</p>
          <p className="text-slate-500 text-sm">Os candidatos podem não ter sido salvos corretamente.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
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
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                {['Rank', 'Nome', 'Idade', 'Localização', 'Gênero', 'Score', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
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
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--row-hover)')}
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
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-light-bg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {initials(c.name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ color: c.isBlacklisted ? '#ef4444' : 'var(--text-main)', fontWeight: 500, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                          {c.isBlacklisted && <Ban size={14} color="#ef4444" />}
                        </div>
                        {c.email && <p style={{ color: 'var(--text-dim)', fontSize: 11, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  {/* Idade */}
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8' }}>
                    {(c.age && !/não\s*informado/i.test(c.age)) ? `${c.age} anos` : '—'}
                  </td>
                  {/* Localização */}
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-dim)' }}>
                    {c.location ?? '—'}
                  </td>
                  {/* Gênero */}
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
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
          <div style={{
            position: 'relative', zIndex: 1, width: 'clamp(400px, 35vw, 95vw)', height: '100vh',
            background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', overflowY: 'auto',
            padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20,
            boxShadow: '-20px 0 60px rgba(0,0,0,0.5)'
          }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center text-lg font-bold text-white">
                  {initials(selectedCandidate.name)}
                </div>
                <div>
                  <p className="text-[var(--text-main)] font-bold text-lg">{selectedCandidate.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${scoreColor(selectedCandidate.score)}22`, color: scoreColor(selectedCandidate.score), border: `1px solid ${scoreColor(selectedCandidate.score)}44` }}>
                    Score: {selectedCandidate.score}%
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="transition-colors rounded-lg p-2" style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>✕</button>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs text-[var(--text-dim)] uppercase tracking-widest mb-3">Contato</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {[
                  { icon: <Mail size={13} />, label: 'Email', value: selectedCandidate.email },
                  { icon: <Phone size={13} />, label: 'Telefone', value: selectedCandidate.phone },
                  { icon: <MapPin size={13} />, label: 'Local', value: selectedCandidate.location },
                  { icon: <MapPin size={13} />, label: 'Endereço', value: selectedCandidate.address },
                  { icon: <UserRound size={13} />, label: 'Gênero', value: selectedCandidate.gender },
                  { icon: <Calendar size={13} />, label: 'Idade', value: (selectedCandidate.age && !['Não informado', '—'].includes(selectedCandidate.age)) ? `${selectedCandidate.age} anos` : null },
                ].map((item, idx) => (
                  <div key={idx} style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    minHeight: 60,
                    justifyContent: 'center',
                    boxSizing: 'border-box'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.icon}{item.label}</span>
                    <span style={{ fontSize: 13, color: item.value ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value ?? 'Não informado'}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedCandidate.skills && (
              <div>
                <p className="text-xs text-[var(--text-dim)] uppercase tracking-widest mb-3">Habilidades</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {parseSkills(selectedCandidate.skills).map(s => (
                    <span key={s} style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      borderRadius: 8,
                      padding: '5px 14px',
                      fontSize: 12,
                      color: '#fff',
                      fontWeight: 600,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>{s}</span>
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
                <p className="text-xs text-[var(--text-error)] uppercase tracking-widest mb-3">Pontos de Atenção</p>
                <div style={{ padding: '0 0' }}>
                  {selectedCandidate.attention_points && !selectedCandidate.attention_points.includes('Não existem pontos de atenção') ? (
                    <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none' }}>
                      {selectedCandidate.attention_points.split('\n').filter(Boolean).map((p, i) => (
                        <li key={i} style={{ fontSize: 13, color: '#fca5a5', marginBottom: 6, lineHeight: '1.4' }}>• {p}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>Não existem pontos de atenção identificados pela IA.</p>
                  )}
                </div>
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

  // Filters & Pagination state
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

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

      // Limpar referências ao job deletado em candidates.analysis.history
      const { data: affectedCandidates } = await supabase
        .from('candidates')
        .select('id, analysis')
        .eq('user_id', profile.userId);

      if (affectedCandidates) {
        for (const candidate of affectedCandidates) {
          const history: any[] = candidate.analysis?.history ?? [];
          const hadJob = history.some((h: any) => h.job_id === jId);
          if (hadJob) {
            const newHistory = history.filter((h: any) => h.job_id !== jId);
            await supabase
              .from('candidates')
              .update({ analysis: { ...candidate.analysis, history: newHistory } })
              .eq('id', candidate.id);
          }
        }
      }

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

  // Filter logic
  const filtered = jobs.filter(j => {
    const matchesSearch = j.name.toLowerCase().includes(search.toLowerCase());
    const jobDate = j.created_at.slice(0, 10); // YYYY-MM-DD
    const matchesStart = !startDate || jobDate >= startDate;
    const matchesEnd = !endDate || jobDate <= endDate;
    return matchesSearch && matchesStart && matchesEnd;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const goTo = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

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
    <div className="text-[var(--text-main)]">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[var(--text-dim)] text-sm mb-1">Bem-vindo à</p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">IA Análise de Currículos</h1>
        </div>
        <div className="flex items-center gap-4">
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', width: 15, height: 15 }} />
            <input
              type="text"
              placeholder="Buscar análises…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, color: 'var(--text-main)', fontSize: 13, outline: 'none', width: 240 }}
              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          <button
            onClick={() => navigate('/analise/nova?new=true')}
            style={{ background: 'var(--primary)', color: '#fff' }}
            className="flex items-center gap-2 hover:opacity-90 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Análise
          </button>
        </div>
      </div>

      {/* Recentes */}
      {recent.length > 0 && (
        <>
          <p className="text-xs text-[var(--text-dim)] uppercase tracking-widest mb-4">Acessados recentemente</p>
            <div className="flex gap-3 mb-10 flex-wrap">
            {recent.map((j, i) => {
              // Cycle through planets for variety
              const planetVariants = [
                { name: 'Saturn', color: 'radial-gradient(circle at 35% 35%, #fef3c7 0%, #d97706 40%, #78350f 100%)', shadow: 'rgba(217,119,6,0.15)', ring: true },
                { name: 'Jupiter', color: 'radial-gradient(circle at 30% 30%, #fff7ed 0%, #f59e0b 35%, #7c2d12 100%)', shadow: 'rgba(124,45,18,0.2)' },
                { name: 'Earth', color: 'radial-gradient(circle at 35% 35%, #60a5fa 0%, #2563eb 50%, #1e3a8a 100%)', shadow: 'rgba(37,99,235,0.2)' },
                { name: 'Moon', color: 'radial-gradient(circle at 30% 30%, #f3f4f6 0%, #9ca3af 50%, #374151 100%)', shadow: 'rgba(156,163,175,0.15)' }
              ];
              const p = planetVariants[i % planetVariants.length];

              return (
                <div
                  key={j.id}
                  onClick={() => navigate(`/analise/${j.id}`)}
                  className="d-card group"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '16px 20px', 
                    cursor: 'pointer', 
                    width: '220px',
                    flex: '0 0 auto',
                    minWidth: '220px'
                  }}
                  onMouseEnter={e => { 
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; 
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.3)'; 
                  }}
                  onMouseLeave={e => { 
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; 
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; 
                  }}
                >
                  {/* Stars Background - Full Coverage */}
                  {[...Array(25)].map((_, si) => (
                    <div 
                      key={si} 
                      className="star" 
                      style={{ 
                        width: si % 7 === 0 ? 2 : 1, 
                        height: si % 7 === 0 ? 2 : 1, 
                        top: `${(si * 17) % 100}%`, 
                        left: `${(si * 37 + i * 13) % 100}%`, 
                        '--duration': `${1.5 + (si % 4)}s`, 
                        animationDelay: `${si * 0.1}s`, 
                        opacity: (si % 5) * 0.1 
                      } as any} 
                    />
                  ))}

                  {/* Mini Planet Segment - Solid to hide stars */}
                  <div 
                    className="mini-planet" 
                    style={{ 
                      position: 'absolute', 
                      width: 60, 
                      height: 60, 
                      borderRadius: '50%', 
                      background: `transparent`, // Transparent base
                      backgroundImage: p.color, // Planet texture
                      right: -15, 
                      bottom: -15, 
                      opacity: 0.9, 
                      boxShadow: `inset -5px -5px 15px rgba(0,0,0,0.5), 0 0 15px ${p.shadow}`, 
                      zIndex: 2 // Higher than stars
                    } as any} 
                  />

                  <div style={{ position: 'relative', zIndex: 3 }}>
                    <p className="font-bold text-sm text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors">{j.name}</p>
                    <p className="text-[10px] text-[var(--text-dim)] mt-1 font-bold uppercase tracking-widest opacity-70">{new Date(j.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Filter Bar — Positioned below Recent */}
      <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginRight: 4 }}>Filtrar período:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>De:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPage(1); }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text-main)', fontSize: 12, outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>Até:</span>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPage(1); }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text-main)', fontSize: 12, outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>
        {(startDate || endDate || (search && !paginated.length)) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); setPage(1); }}
            style={{ background: 'transparent', border: '1px solid var(--error-border)', borderRadius: 8, padding: '7px 12px', color: 'var(--text-error)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X style={{ width: 12, height: 12 }} /> Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <p className="text-xs text-[var(--text-dim)] uppercase tracking-widest mb-4">Últimas análises</p>

      {jobs.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-16 text-center">
          <p className="text-[var(--text-muted)] text-lg mb-2">Nenhuma análise encontrada</p>
          <p className="text-[var(--text-dim)] text-sm mb-6">Clique em "Nova Análise" para começar.</p>
          <button
            onClick={() => navigate('/analise/nova?new=true')}
            style={{ background: 'var(--primary)', color: '#fff' }}
            className="flex items-center gap-2 hover:opacity-90 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors mx-auto"
          >
            <Plus className="w-4 h-4" /> Nova Análise
          </button>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th className="px-6 py-4 text-left font-medium text-[var(--text-dim)]">Nome da Vaga</th>
                <th className="px-6 py-4 text-center font-medium text-[var(--text-dim)]">Candidatos Avaliados</th>
                <th className="px-6 py-4 text-center font-medium text-[var(--text-dim)]">Melhores Candidatos</th>
                <th className="px-6 py-4 text-center font-medium text-[var(--text-dim)]">Faixa Etária</th>
                <th className="px-6 py-4 text-center font-medium text-[var(--text-dim)]">Gênero</th>
                <th className="px-6 py-4 text-center font-medium text-[var(--text-dim)]">Localidade</th>
                <th className="px-6 py-4 text-center font-medium text-[var(--text-dim)]">Última Atualização</th>
                <th className="px-6 py-4 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginated.map(j => (
                <tr
                  key={j.id}
                  onClick={() => navigate(`/analise/${j.id}`)}
                  className="hover:bg-[var(--row-hover)] transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 text-[var(--text-main)] font-medium">{j.name}</td>
                  <td className="px-6 py-4 text-center text-[var(--text-main)]">{j.totalCandidates}</td>
                  <td className="px-6 py-4 text-center text-[var(--text-main)]">{j.topCandidates}</td>
                  <td className="px-6 py-4 text-center text-[var(--text-dim)]">{j.filters?.age || '—'}</td>
                  <td className="px-6 py-4 text-center text-[var(--text-dim)]">{j.filters?.gender || '—'}</td>
                  <td className="px-6 py-4 text-center text-[var(--text-dim)]">{j.filters?.location || '—'}</td>
                  <td className="px-6 py-4 text-center text-[var(--text-dim)] whitespace-nowrap">{formatDate(j.created_at)}</td>
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

          {/* Paginação */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Página {page} de {totalPages} · {filtered.length} análises</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => goTo(page - 1)} disabled={page === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', color: page === 1 ? 'var(--text-muted)' : 'var(--text-dim)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                  <ChevronLeft style={{ width: 15, height: 15 }} /> Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | '...')[]>((acc, p, i, arr) => {
                    if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                    acc.push(p); return acc;
                  }, [])
                  .map((p, i) => p === '...' ? (
                    <span key={`d${i}`} style={{ padding: '7px 4px', color: '#475569', fontSize: 13 }}>…</span>
                  ) : (
                    <button key={p} onClick={() => goTo(p as number)}
                      style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid', borderColor: p === page ? 'var(--primary)' : 'var(--border)', background: p === page ? 'var(--primary)' : 'transparent', color: p === page ? '#fff' : 'var(--text-dim)', cursor: 'pointer', fontSize: 13, fontWeight: p === page ? 600 : 400 }}>{p}</button>
                  ))}
                <button onClick={() => goTo(page + 1)} disabled={page === totalPages}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-dim)', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                  Próximo <ChevronRight style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

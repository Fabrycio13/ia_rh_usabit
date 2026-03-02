import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Star, Search, ChevronLeft, ChevronRight,
  X, MapPin, Calendar, UserRound, Mail, Phone,
  Briefcase, Eye, Loader, ChevronUp, ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Candidate {
  id: string;
  name: string;
  email: string;
  location: string | null;
  age: string | null;
  gender: string | null;
  score: number | null;
  vagas: string[];
}

interface Application { jobId: string; jobName: string; score: number; appliedAt: string; }

interface CandidateDetail extends Candidate {
  phone: string | null;
  skills: string | null;
  experience: string | null;
  education: string | null;
  redFlags: string | null;
  applications: Application[];
  enriched: boolean;
}

type SortKey = 'name' | 'location' | 'age' | null;
type SortDir = 'asc' | 'desc';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}
function scoreColor(s: number) { return s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444'; }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR'); }

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

function toStr(v: any): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

const PAGE_SIZE = 10;

// ─── Candidate Panel ──────────────────────────────────────────────────────────
function CandidatePanel({ c, onClose, navigate }: { c: CandidateDetail; onClose: () => void; navigate: (path: string) => void }) {
  const skillsList = parseSkills(c.skills);
  const redFlagsList = c.redFlags ? c.redFlags.split('\n').filter(Boolean) : [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', zIndex: 1, background: '#13151f', border: '1px solid #252836', borderRadius: 20, width: 'min(92vw, 920px)', maxHeight: '90vh', overflowY: 'auto', fontFamily: 'Inter, sans-serif', boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: '#1d1f2e', border: '1px solid #252836', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#94a3b8', zIndex: 2 }}><X size={16} /></button>

        <div style={{ padding: '32px 36px 24px', borderBottom: '1px solid #1f2332' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(c.name)}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>{c.name}</h2>
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 8, flexWrap: 'wrap' }}>
                {c.location && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#94a3b8' }}><MapPin size={13} />{c.location}</span>}
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#94a3b8' }}><Calendar size={13} />{(c.age && !['Não informado', 'não informado', '—'].includes(c.age)) ? `${c.age} anos` : 'Não informado'}</span>
                {c.gender && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#94a3b8' }}><UserRound size={13} />{c.gender}</span>}
              </div>
            </div>
          </div>
        </div>

        {!c.enriched ? (
          <div style={{ padding: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#64748b' }}>
            <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Carregando detalhes…</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ padding: '28px 36px', borderRight: '1px solid #1f2332', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <section>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Informações de Contato</p>
                <div style={{ background: '#0d0f1a', borderRadius: 12, border: '1px solid #1f2332', overflow: 'hidden' }}>
                  {c.email && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid #1a1c27' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}><Mail size={14} />Email</span>
                    <span style={{ fontSize: 13, color: '#e2e8f0' }}>{c.email}</span>
                  </div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}><Phone size={14} />Telefone</span>
                    <span style={{ fontSize: 13, color: c.phone ? '#e2e8f0' : '#475569' }}>{c.phone ?? 'Não informado'}</span>
                  </div>
                </div>
              </section>

              {skillsList.length > 0 && (
                <section>
                  <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Habilidades</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {skillsList.map((s, i) => <span key={i} style={{ background: '#1a1c2d', border: '1px solid #2d3060', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#c7d2fe', fontWeight: 500 }}>{s}</span>)}
                  </div>
                </section>
              )}
              {c.experience && (
                <section>
                  <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Experiência</p>
                  <p style={{ fontSize: 14, color: '#e2e8f0', lineHeight: '1.7', margin: 0 }}>{c.experience}</p>
                </section>
              )}
              {c.education && (
                <section>
                  <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Formação</p>
                  <p style={{ fontSize: 14, color: '#e2e8f0', margin: 0 }}>{c.education}</p>
                </section>
              )}
              <section>
                <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Pontos de Atenção</p>
                {redFlagsList.length > 0 ? (
                  <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none' }}>
                    {redFlagsList.map((line, i) => <li key={i} style={{ fontSize: 13, color: '#fca5a5', marginBottom: 4, lineHeight: '1.5' }}>• {line}</li>)}
                  </ul>
                ) : <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>• Nenhum identificado.</p>}
              </section>
            </div>

            <div style={{ padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}><Briefcase size={12} /> Vagas Aplicadas ({c.applications.length})</p>
              </div>
              {c.applications.length === 0
                ? <p style={{ fontSize: 13, color: '#64748b' }}>Nenhuma vaga associada.</p>
                : (c.applications as any[]).map((app) => (
                  <div key={app.jobId + app.appliedAt} style={{ background: '#0d0f1a', border: '1px solid #1f2332', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14, margin: '0 0 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.jobName}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ background: scoreColor(app.score), color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{app.score}% match</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>· {formatDate(app.appliedAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/analise/${app.jobId}`)}
                      style={{ background: '#1d1f2e', border: '1px solid #252836', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#94a3b8', flexShrink: 0 }}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Sort indicator ───────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <span style={{ opacity: 0.25, display: 'inline-flex', flexDirection: 'column' }}><ChevronUp size={10} /><ChevronDown size={10} /></span>;
  return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: '#6366f1' }} /> : <ChevronDown size={12} style={{ color: '#6366f1' }} />;
}

// ─── SelectFilter ─────────────────────────────────────────────────────────────
function SelectFilter({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background: '#15171e', border: '1px solid #1f2332', borderRadius: 8, padding: '7px 10px', color: value ? '#f1f5f9' : '#64748b', fontSize: 12, outline: 'none', cursor: 'pointer', minWidth: 110 }}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export const CandidateBank = () => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CandidateDetail | null>(null);

  // ─ Sorting
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ─ Filters
  const [filterGender, setFilterGender] = useState('');
  const [filterVaga, setFilterVaga] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Load favorites from localStorage (per user)
  useEffect(() => {
    if (!profile.userId) return;
    try {
      const stored = localStorage.getItem(`fav-${profile.userId}`);
      if (stored) setFavorites(JSON.parse(stored));
    } catch { }
  }, [profile.userId]);

  const toggle = (id: string) => setFavorites(prev => {
    const next = { ...prev, [id]: !prev[id] };
    try { localStorage.setItem(`fav-${profile.userId}`, JSON.stringify(next)); } catch { }
    return next;
  });

  useEffect(() => {
    if (!profile.loaded) return;
    if (!profile.userId) { setLoading(false); return; }
    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    fetchCandidates(profile.userId).finally(() => clearTimeout(safetyTimer));
    return () => clearTimeout(safetyTimer);
  }, [profile.userId, profile.loaded]);

  async function fetchCandidates(userId: string) {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('candidates')
        .select('id, name, email, location, age, gender, score, job_candidates(jobs(name))')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      setCandidates((data ?? []).map((c: any) => ({
        id: c.id, name: c.name, email: c.email, location: c.location,
        age: c.age, gender: c.gender, score: c.score,
        vagas: (c.job_candidates ?? []).map((jc: any) => jc.jobs?.name).filter(Boolean),
      })));
    } finally {
      setLoading(false);
    }
  }

  // Handle column sort click
  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(col); setSortDir('asc'); }
    setPage(1);
  };

  // Derived unique options for filter
  const genderOptions = useMemo(() => [...new Set(candidates.map(c => c.gender).filter(Boolean) as string[])].sort(), [candidates]);
  const vagaOptions = useMemo(() => [...new Set(candidates.flatMap(c => c.vagas))].sort(), [candidates]);

  // Full filtered + sorted list
  const processed = useMemo(() => {
    let list = [...candidates];

    // Text search
    const q = search.toLowerCase().trim();
    if (q) list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.location ?? '').toLowerCase().includes(q) ||
      c.vagas.some(v => v.toLowerCase().includes(q))
    );

    // Favorites
    if (onlyFavorites) list = list.filter(c => favorites[c.id]);

    // Gender filter
    if (filterGender) list = list.filter(c => c.gender === filterGender);

    // Vaga filter
    if (filterVaga) list = list.filter(c => c.vagas.includes(filterVaga));

    // Sort
    if (sortKey) {
      list.sort((a, b) => {
        let va: any, vb: any;
        if (sortKey === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
        else if (sortKey === 'location') { va = (a.location ?? '').toLowerCase(); vb = (b.location ?? '').toLowerCase(); }
        else if (sortKey === 'age') { va = parseFloat(a.age ?? '0'); vb = parseFloat(b.age ?? '0'); }
        else if (sortKey === 'age') { va = parseFloat(a.age ?? '0'); vb = parseFloat(b.age ?? '0'); }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [candidates, search, onlyFavorites, favorites, filterGender, filterVaga, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paginated = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

  function openCandidate(c: Candidate) {
    setSelected({ ...c, phone: null, skills: null, experience: null, education: null, redFlags: null, applications: [], enriched: false });
    enrichCandidate(c.id);
  }

  async function enrichCandidate(id: string) {
    try {
      const { data: cd } = await supabase.from('candidates').select('phone, analysis').eq('id', id).maybeSingle();
      setSelected(prev => {
        if (!prev || prev.id !== id) return prev;
        const analysis = cd?.analysis ?? {};
        return {
          ...prev,
          phone: toStr(cd?.phone) ?? null,
          skills: toStr(analysis?.skills ?? analysis?.Skills),
          experience: toStr(analysis?.experience ?? analysis?.Experience),
          education: toStr(analysis?.education ?? analysis?.Education),
          redFlags: toStr(analysis?.redFlags ?? analysis?.['RedFlags(Pontos de atenção)']),
          applications: (analysis?.history || []).map((h: any) => ({
            jobId: h.job_id,
            jobName: h.job_name,
            score: h.score,
            appliedAt: h.analyzed_at,
          })),
          enriched: true,
        };
      });
    } catch {
      setSelected(prev => prev ? { ...prev, enriched: true } : prev);
    }
  }

  const activeFilters = [filterGender, filterVaga, onlyFavorites ? 'fav' : ''].filter(Boolean).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '4px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Carregando candidatos…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Banco de Candidatos</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>
            {processed.length} candidato{processed.length !== 1 ? 's' : ''} encontrado{processed.length !== 1 ? 's' : ''}
            {search && <> · <span style={{ color: '#94a3b8' }}>"{search}"</span></>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', width: 15, height: 15 }} />
            <input type="text" placeholder="Buscar candidatos…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ background: '#15171e', border: '1px solid #1f2332', borderRadius: 10, paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, color: '#e2e8f0', fontSize: 13, outline: 'none', width: 240 }}
              onFocus={e => (e.target.style.borderColor = '#6366f1')}
              onBlur={e => (e.target.style.borderColor = '#1f2332')} />
          </div>

          <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#6366f1', border: 'none', borderRadius: 10, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus style={{ width: 16, height: 16 }} /> Adicionar
          </button>
        </div>
      </div>

      {/* Filter bar — always visible */}
      <div style={{ background: '#15171e', border: '1px solid #1f2332', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginRight: 4 }}>Filtrar por:</span>
        <SelectFilter value={filterGender} onChange={v => { setFilterGender(v); setPage(1); }} options={genderOptions} placeholder="Gênero" />
        <SelectFilter value={filterVaga} onChange={v => { setFilterVaga(v); setPage(1); }} options={vagaOptions} placeholder="Vaga aplicada" />
        <button onClick={() => { setOnlyFavorites(f => !f); setPage(1); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: onlyFavorites ? '#fbbf2420' : 'transparent', border: `1px solid ${onlyFavorites ? '#fbbf24' : '#1f2332'}`, borderRadius: 8, padding: '7px 12px', color: onlyFavorites ? '#fbbf24' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
          <Star style={{ width: 13, height: 13, fill: onlyFavorites ? '#fbbf24' : 'none' }} />
          Apenas favoritos
        </button>
        {activeFilters > 0 && (
          <button onClick={() => { setFilterGender(''); setFilterVaga(''); setOnlyFavorites(false); setPage(1); }}
            style={{ background: 'transparent', border: '1px solid #ef444440', borderRadius: 8, padding: '7px 12px', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <X style={{ width: 12, height: 12 }} /> Limpar
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#15171e', borderRadius: 16, border: '1px solid #1f2332', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '28%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '1px solid #1f2332' }}>
              {([
                ['name', 'Nome'],
                ['location', 'Localização'],
                ['age', 'Idade'],
                [null, 'Gênero'],
                [null, 'Vagas Aplicadas'],
                [null, 'Favoritos'],
                [null, 'Visualizar'],
              ] as [SortKey, string][]).map(([col, label]) => (
                <th key={label}
                  onClick={col ? () => handleSort(col) : undefined}
                  style={{ padding: '14px 16px', textAlign: (label === 'Favoritos' || label === 'Visualizar') ? 'center' : 'left', fontSize: 11, fontWeight: 600, color: (col && sortKey === col) ? '#6366f1' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: col ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {label}
                    {col && <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                {search || activeFilters > 0 ? 'Nenhum candidato encontrado com os filtros aplicados.' : 'Nenhum candidato cadastrado ainda.'}
              </td></tr>
            ) : paginated.map(c => (
              <tr key={c.id} onClick={() => openCandidate(c)}
                style={{ borderBottom: '1px solid #1a1c27', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366f1', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{initials(c.name)}</div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <p style={{ color: '#64748b', fontSize: 11, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: 13, color: '#94a3b8' }}>{c.location ?? <span style={{ color: '#475569' }}>Não informado</span>}</td>
                <td style={{ padding: '16px', fontSize: 13, color: '#94a3b8' }}>{(c.age && !['Não informado', 'não informado', '—'].includes(c.age)) ? `${c.age} anos` : <span style={{ color: '#475569' }}>Não informado</span>}</td>
                <td style={{ padding: '16px', fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{c.gender ?? <span style={{ color: '#475569' }}>Não informado</span>}</td>
                <td style={{ padding: '16px' }}>
                  {c.vagas.length === 0 ? <span style={{ color: '#475569', fontSize: 13 }}>Não informado</span> : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {c.vagas.slice(0, 2).map(v => <span key={v} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '2px 7px', borderRadius: 5, fontSize: 11, fontWeight: 600 }}>{v}</span>)}
                      {c.vagas.length > 2 && <span style={{ color: '#64748b', fontSize: 11 }}>+{c.vagas.length - 2}</span>}
                    </div>
                  )}
                </td>
                <td style={{ padding: '0 16px', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <button onClick={e => { e.stopPropagation(); toggle(c.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: favorites[c.id] ? '#fbbf24' : '#475569', transition: 'color 0.15s' }}>
                      <Star style={{ width: 16, height: 16, fill: favorites[c.id] ? '#fbbf24' : 'none', strokeWidth: 1.5 }} />
                    </button>
                  </div>
                </td>
                <td style={{ padding: '0 16px', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Eye style={{ width: 15, height: 15, color: '#475569' }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginação */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #1f2332' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Página {page} de {totalPages} · {processed.length} candidatos</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={() => goTo(page - 1)} disabled={page === 1}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid #1f2332', borderRadius: 8, padding: '7px 14px', color: page === 1 ? '#475569' : '#94a3b8', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>
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
                    style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid', borderColor: p === page ? '#6366f1' : '#1f2332', background: p === page ? '#6366f1' : 'transparent', color: p === page ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: p === page ? 600 : 400 }}>{p}</button>
                ))}
              <button onClick={() => goTo(page + 1)} disabled={page === totalPages}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid #1f2332', borderRadius: 8, padding: '7px 14px', color: page === totalPages ? '#475569' : '#94a3b8', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                Próximo <ChevronRight style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && <CandidatePanel c={selected} onClose={() => setSelected(null)} navigate={navigate} />}
    </>
  );
};

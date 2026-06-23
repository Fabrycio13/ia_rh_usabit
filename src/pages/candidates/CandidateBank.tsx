import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star, Search, ChevronLeft, ChevronRight,
  X, ChevronUp, ChevronDown, Ban, Phone, Users, UserCheck, Eye
} from 'lucide-react';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { CandidatePanel } from '../../features/analysis/CandidatePanel';
import { hasPermission } from '../../core/config/permissions';
import { type CandidateDetail } from '../../features/analysis/CandidatePanelUtils';
import { ReanalyzeCandidateModal } from '../../features/candidates/components/ReanalyzeCandidateModal';

const PAGE_SIZE = 10;

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

function toStr(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

const VAGA_PALETTE = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'];
function vagaColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return VAGA_PALETTE[Math.abs(h) % VAGA_PALETTE.length];
}

function extractVagaName(field: unknown): string | undefined {
  if (Array.isArray(field)) return (field[0] as { title?: string; name?: string } | undefined)?.title ?? (field[0] as { title?: string; name?: string } | undefined)?.name;
  if (field && typeof field === 'object') return (field as { title?: string; name?: string }).title ?? (field as { title?: string; name?: string }).name;
  return undefined;
}

// â”€â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface JCDataRow { job_id?: string; vaga_id?: string }
interface PipeDataRow { id: string; notes?: string; pipelines?: { name?: string }[] }
interface CandidateRow { id: string; analysis?: { history?: HistoryEntry[] }; skills?: string; experience?: string; education?: string }
interface HistoryEntry { job_id: string; job_name?: string; job_title?: string; score?: number; match_score?: number; analyzed_at?: string; date?: string; created_at?: string; skills?: string; habilidades?: string; summary?: string; experience?: string; experiencia?: string; strengths?: string; positivePoints?: string; pontos_positivos?: string; positive_points?: string; education?: string; formacao?: string; gaps?: string; redFlags?: string; pontos_atencao?: string; attention_points?: string; job_code?: string; code?: string; resume_url?: string | null }
interface Candidate {
  id: string;
  name: string;
  email: string;
  location: string | null;
  address: string | null;
  age: string | null;
  gender: string | null;
  portfolio: string | null;
  cep: string | null;
  address_number: string | null;
  complement: string | null;
  score: number | null;
  vagas: string[];
  interview_eligible: boolean;
  is_blacklisted: boolean;
  resume_url?: string | null;
  resume_file_name?: string | null;
  phone?: string | null;
  conversations?: unknown[];
}

type SortKey = 'name' | 'location' | 'age' | null;
type SortDir = 'asc' | 'desc';

// â”€â”€â”€ Sort indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <span style={{ opacity: 0.25, display: 'inline-flex', flexDirection: 'column' }}><ChevronUp size={10} /><ChevronDown size={10} /></span>;
  return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: 'var(--primary)' }} /> : <ChevronDown size={12} style={{ color: 'var(--primary)' }} />;
}

// â”€â”€â”€ SelectFilter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SelectFilter({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ flex: 1, minWidth: '140px', position: 'relative' }}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '7px 12px', color: value ? 'var(--text-main)' : 'var(--text-dim)',
          fontSize: '12px', cursor: 'pointer', height: '34px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          transition: 'all 0.2s'
      }}>
         <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || placeholder}</span>
         <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
      </div>
      {isOpen && (
          <div style={{ 
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '100%',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '6px', zIndex: 1000,
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              maxHeight: '240px', overflowY: 'auto'
          }}>
             <div
                 onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
                 onMouseLeave={e => e.currentTarget.style.background = value === '' ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
                 style={{ 
                     padding: '8px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
                     color: value === '' ? '#3b82f6' : 'var(--text-dim)',
                     background: value === '' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                     fontWeight: value === '' ? 600 : 400
                 }} onClick={() => { onChange(''); setIsOpen(false); }}>
                 {placeholder}
             </div>
             {options.map(o => (
                <div key={o}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = value === o ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
                    style={{ 
                        padding: '8px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
                        color: value === o ? '#3b82f6' : 'var(--text-dim)',
                        background: value === o ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        fontWeight: value === o ? 600 : 400
                    }} onClick={() => { onChange(o); setIsOpen(false); }}>
                    {o}
                </div>
             ))}
          </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const CandidateBank = () => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CandidateDetail | null>(null);
  const [reanalysingCandId, setReanalysingCandId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // â”€ Sorting
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // â”€ Filters
  const [filterGender, setFilterGender] = useState('');
  const [filterVaga, setFilterVaga] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [activeTab, setActiveTab] = useState<'todos' | 'candidatos' | 'blacklist'>('todos');

  // Mobile detection
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Load favorites from localStorage (per user)
  useEffect(() => {
    if (!profile.userId) return;
    try {
      const stored = localStorage.getItem(`fav-${profile.userId}`);
      if (stored) setFavorites(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [profile.userId]);

  const toggle = (id: string) => setFavorites(prev => {
    const next = { ...prev, [id]: !prev[id] };
    try { localStorage.setItem(`fav-${profile.userId}`, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  const fetchCandidatesRef = useRef<(userId: string, userRole?: string) => Promise<void>>(() => Promise.resolve());
  fetchCandidatesRef.current = async function fetchCandidates(userId: string, userRole?: string) {
    const isGlobalViewer = userRole === 'owner';
    const isOrgMember = userRole === 'administrador' || userRole === 'supervisor' || userRole === 'rh';
    try {
      setLoading(true);
      let query = supabase
        .from('candidates')
        .select('id, name, email, location, address, age, gender, linkedin, portfolio, cep, address_number, complement, score, interview_eligible, is_blacklisted, resume_url, resume_file_name, phone, conversations:candidate_conversations(candidate_id), job_candidates(job_id, vaga_id, jobs(name), vagas_white_label(title)), source')
        .order('name', { ascending: true });

      if (!isGlobalViewer) {
        if (isOrgMember && profile.organization_id && profile.organization_id !== 'null') {
          query = query.eq('organization_id', profile.organization_id);
        } else {
          query = query.eq('user_id', userId);
        }
      }

      const { data, error } = await query;

      if (error) {
        let fallbackQuery = supabase
          .from('candidates')
          .select('id, name, email, location, address, age, gender, linkedin, portfolio, cep, address_number, complement, score, phone, resume_url, conversations:candidate_conversations(candidate_id), job_candidates(job_id, vaga_id, jobs(name), vagas_white_label(title)), source')
          .order('name', { ascending: true });
        if (!isGlobalViewer) {
          if (isOrgMember && profile.organization_id) {
            fallbackQuery = fallbackQuery.eq('organization_id', profile.organization_id);
          } else {
            fallbackQuery = fallbackQuery.eq('user_id', userId);
          }
        }
        const { data: fallback } = await fallbackQuery;
        setCandidates(((fallback ?? []).filter(c => c.source !== 'spontaneous' && c.source !== 'manual_add' && c.source !== null).map(c => ({
          ...c,
          vagas: [...new Set(
            (c.job_candidates ?? []).map((jc) => extractVagaName(jc.vagas_white_label) || extractVagaName(jc.jobs)).filter((s: unknown): s is string => !!s)
          )]
        }))) as unknown as Candidate[]);
        return;
      }

      setCandidates(((data ?? []).filter(c => c.source !== 'spontaneous' && c.source !== 'manual_add' && c.source !== null).map(c => ({
        ...c,
        vagas: [...new Set(
          (c.job_candidates ?? []).map((jc) => extractVagaName(jc.vagas_white_label) || extractVagaName(jc.jobs)).filter((s: unknown): s is string => !!s)
        )]
      }))) as unknown as Candidate[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile.loaded) return;
    if (!profile.userId) { setLoading(false); return; }
    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    fetchCandidatesRef.current(profile.userId, profile.user_role).finally(() => clearTimeout(safetyTimer));
    return () => clearTimeout(safetyTimer);
  }, [profile.userId, profile.loaded, profile.user_role]);

  async function handleToggleBlacklistRow(candidate: Candidate) {
    const newVal = !candidate.is_blacklisted;
    try {
      const { error } = await supabase.from('candidates').update({ is_blacklisted: newVal }).eq('id', candidate.id);
      if (!error) {
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, is_blacklisted: newVal } : c));
        if (selected?.id === candidate.id) {
          setSelected(prev => prev ? { ...prev, is_blacklisted: newVal } : null);
        }
      }
    } catch { /* ignore */ }
  }

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(col); setSortDir('asc'); }
    setPage(1);
  };

  const genderOptions = useMemo(() => [...new Set(candidates.map(c => c.gender).filter(Boolean) as string[])].sort(), [candidates]);
  const vagaOptions = useMemo(() => [...new Set(candidates.flatMap(c => c.vagas))].sort(), [candidates]);

  const processed = useMemo(() => {
    let list = [...candidates];
    const q = search.toLowerCase().trim();
    if (q) list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.location ?? '').toLowerCase().includes(q) ||
      c.vagas.some(v => v.toLowerCase().includes(q))
    );
    if (onlyFavorites) list = list.filter(c => favorites[c.id]);
    if (filterGender) list = list.filter(c => c.gender === filterGender);
    if (filterVaga) list = list.filter(c => c.vagas.includes(filterVaga));

    if (activeTab === 'blacklist') {
      list = list.filter(c => c.is_blacklisted);
    } else if (activeTab === 'candidatos') {
      list = list.filter(c => !c.is_blacklisted);
    }

    if (sortKey) {
      list.sort((a, b) => {
        let va: string | number, vb: string | number;
        if (sortKey === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
        else if (sortKey === 'location') { va = (a.location ?? '').toLowerCase(); vb = (b.location ?? '').toLowerCase(); }
        else if (sortKey === 'age') { va = parseFloat(a.age ?? '0'); vb = parseFloat(b.age ?? '0'); }
        else { va = ''; vb = ''; }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [candidates, search, onlyFavorites, favorites, filterGender, filterVaga, sortKey, sortDir, activeTab]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paginated = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

  function openCandidate(c: Candidate) {
    setSelected({ 
      ...c, 
      phone: null, skills: null, experience: null, education: null, 
      redFlags: null, applications: [], notes: null, enriched: false,
      is_blacklisted: c.is_blacklisted ?? false,
      hideBankButton: true,
      status: 'talent_bank'
    } as CandidateDetail);
    enrichCandidate(c.id);
  }

  async function enrichCandidate(id: string) {
    try {
      const [{ data: cd }, { data: jcData }, { data: pipeData }, { data: convData }] = await Promise.all([
        supabase.from('candidates').select('phone, address, analysis, notes, is_blacklisted').eq('id', id).maybeSingle(),
        supabase.from('job_candidates').select('job_id, vaga_id').eq('candidate_id', id),
        supabase.from('pipeline_cards').select('id, notes, pipelines(name)').eq('candidate_id', id),
        supabase.from('candidate_conversations').select('*').eq('candidate_id', id).eq('user_id', profile.userId)
      ]);

      const validJobIds = new Set();
      (jcData ?? []).forEach((jc: JCDataRow) => {
        if (jc.job_id) validJobIds.add(jc.job_id);
        if (jc.vaga_id) validJobIds.add(jc.vaga_id);
      });
      console.log('[enrichCandidate] validJobIds:', Array.from(validJobIds));

      setSelected(prev => {
        if (!prev || prev.id !== id) return prev;
        const analysis = cd?.analysis ?? {};
        const rawHistory = Array.isArray(analysis?.history) ? analysis.history : [];
        console.log('[enrichCandidate] rawHistory IDs:', (rawHistory as HistoryEntry[]).map((h: HistoryEntry) => h.job_id));

        const validHistory = rawHistory.filter((h: HistoryEntry) =>
            (h.job_id || (h as unknown as Record<string, string>).vaga_id) && validJobIds.has(h.job_id || (h as unknown as Record<string, string>).vaga_id)
        );
        console.log('[enrichCandidate] validHistory count (unfiltered):', validHistory.length);

        const pipelineCards = (pipeData ?? []).map((pc: PipeDataRow) => {
          let jobName = undefined;
          let jobId = undefined;
          let score = undefined;
          try {
            const parsed = JSON.parse(pc.notes || '');
            jobName = parsed.selected_job_name;
            jobId = parsed.selected_job_id;
            score = parsed.selected_job_score;
          } catch { /* ignore */ }
          return { id: pc.id, jobId, jobName, score, pipelineName: pc.pipelines?.[0]?.name };
        });

        return {
          ...prev,
          phone: toStr(cd?.phone) ?? null,
          address: toStr(cd?.address) ?? null,
          analysis: cd?.analysis ?? {},
          skills: toStr(analysis?.skills ?? analysis?.Skills ?? analysis?.habilidades ?? analysis?.Habilidades ?? (cd as unknown as CandidateRow)?.skills),
          experience: toStr(analysis?.summary ?? analysis?.experience ?? analysis?.Experience ?? analysis?.experiencia ?? (cd as unknown as CandidateRow)?.experience),
          education: toStr(analysis?.education ?? analysis?.Education ?? analysis?.formacao ?? analysis?.Formacao ?? (cd as unknown as CandidateRow)?.education),
          redFlags: toStr(analysis?.gaps ?? analysis?.redFlags ?? analysis?.['RedFlags(Pontos de atenção)'] ?? analysis?.['Pontos de atenção'] ?? analysis?.['pontos_de_atencao']),
          notes: cd?.notes ?? null,
          is_blacklisted: cd?.is_blacklisted ?? prev.is_blacklisted,
          applications: (() => {
            const mapped = validHistory.map((h: HistoryEntry) => ({
              jobId: h.job_id,
              jobName: h.job_name || h.job_title || 'Vaga Desconhecida',
              jobCode: h.job_code || h.code || '',
              score: h.score ?? h.match_score ?? 0,
              appliedAt: h.analyzed_at || h.date || h.created_at,
              skills: toStr(h.skills ?? h.habilidades),
              experience: toStr(h.summary ?? h.experience ?? h.experiencia),
              positivePoints: toStr(h.strengths ?? h.positivePoints ?? h.pontos_positivos ?? h.positive_points),
              education: toStr(h.education ?? h.formacao),
              redFlags: toStr(h.gaps ?? h.redFlags ?? h.pontos_atencao ?? h.attention_points),
              resume_url: h.resume_url
            }));
            // Deduplicate by jobId - keep entry with more content
            const seen = new Map<string, typeof mapped[0]>();
            for (const app of mapped) {
              const existing = seen.get(app.jobId);
              if (!existing || (app.experience && app.experience.length > (existing.experience?.length ?? 0))) {
                seen.set(app.jobId, app);
              }
            }
            return Array.from(seen.values());
          })(),
          pipelineCards,
          enriched: true,
          conversations: convData || []
        };
      });
    } catch {
      setSelected(prev => prev ? { ...prev, enriched: true } : prev);
    }
  }

  const handleReanalyzeSuccess = async () => {
    setReanalysingCandId(null);
    if (selected) await enrichCandidate(selected.id);
    if (profile.userId) fetchCandidatesRef.current(profile.userId, profile.user_role);
  };

  const activeFilters = [filterGender, filterVaga, onlyFavorites ? 'fav' : '', activeTab !== 'todos' ? 'tab' : ''].filter(Boolean).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Carregando candidatos…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: isMobile ? 12 : 32, flexWrap: 'wrap' }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <Users size={isMobile ? 24 : 32} style={{ color: 'var(--primary)' }} />
            <h1 style={{ fontSize: isMobile ? '22px' : '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Banco de Talentos
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            {processed.length} candidato{processed.length !== 1 ? 's' : ''}
            {activeTab === 'blacklist' ? ' na blacklist' : activeTab === 'candidatos' ? ' ativos' : ' encontrado'}{processed.length !== 1 && activeTab === 'todos' ? 's' : ''}
            {search && <> · <span style={{ color: 'var(--text-muted)' }}>"{search}"</span></>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <div style={{ position: 'relative', width: isMobile ? '100%' : 'auto' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', width: 15, height: 15 }} />
            <input type="text" placeholder="Buscar candidatos…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, color: 'var(--text-main)', fontSize: 13, outline: 'none', width: isMobile ? '100%' : 240, boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', alignItems: isMobile ? 'stretch' : 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginRight: 4 }}>Filtrar por:</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <SelectFilter value={filterGender} onChange={v => { setFilterGender(v); setPage(1); }} options={genderOptions} placeholder="Gênero" />
          <SelectFilter value={filterVaga} onChange={v => { setFilterVaga(v); setPage(1); }} options={vagaOptions} placeholder="Vaga aplicada" />
        </div>
        <button onClick={() => { setOnlyFavorites(f => !f); setPage(1); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: onlyFavorites ? 'var(--favorite-bg)' : 'transparent', border: `1px solid ${onlyFavorites ? 'var(--favorite)' : 'var(--border)'}`, borderRadius: 8, padding: isMobile ? '10px 14px' : '7px 12px', color: onlyFavorites ? 'var(--favorite)' : 'var(--text-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', justifyContent: isMobile ? 'center' : 'flex-start', width: isMobile ? '100%' : 'auto' }}>
          <Star style={{ width: 13, height: 13, fill: onlyFavorites ? 'var(--favorite)' : 'none' }} />
          Apenas favoritos
        </button>
        {activeFilters > 0 && (
          <button onClick={() => { setFilterGender(''); setFilterVaga(''); setOnlyFavorites(false); setActiveTab('todos'); setPage(1); }}
            style={{ background: 'transparent', border: '1px solid var(--error-border)', borderRadius: 8, padding: isMobile ? '10px 14px' : '7px 12px', color: 'var(--text-error)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, justifyContent: isMobile ? 'center' : 'flex-start', width: isMobile ? '100%' : 'auto' }}>
            <X style={{ width: 12, height: 12 }} /> Limpar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: 0, flexWrap: 'nowrap' }}>
        {([
          { key: 'todos' as const, label: 'Todos', icon: Users, color: 'var(--primary)' },
          { key: 'candidatos' as const, label: 'Candidatos', icon: UserCheck, color: '#10b981' },
          { key: 'blacklist' as const, label: 'Blacklist', icon: Ban, color: '#ef4444' },
        ]).map(tab => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          const statusColor = tab.color;
          const count = tab.key === 'todos' ? candidates.length :
                        tab.key === 'candidatos' ? candidates.filter(c => !c.is_blacklisted).length :
                        candidates.filter(c => c.is_blacklisted).length;

          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '4px' : '8px',
                padding: isMobile ? '8px 10px' : '10px 20px',
                background: isActive ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                color: isActive ? statusColor : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '-1px',
                opacity: isActive ? 1 : 0.8,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              onMouseEnter={e => {
                if (!isActive) {
                    e.currentTarget.style.color = statusColor;
                    e.currentTarget.style.opacity = '1';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.opacity = '0.8';
                }
              }}
            >
              <Icon size={16} />
              {tab.label}
              <span style={{ 
                  fontSize: '10px', 
                  background: isActive ? `${statusColor}25` : `${statusColor}15`,
                  color: statusColor,
                  padding: '1px 7px',
                  borderRadius: '20px',
                  fontWeight: 700,
                    marginLeft: isMobile ? '4px' : '8px',
                  border: `1px solid ${statusColor}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '20px',
                  transition: 'all 0.2s'
              }}>
                  {count}
              </span>
            </button>
          );
        })}
      </div>

      {paginated.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', padding: '60px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
          {activeTab === 'blacklist'
            ? 'Nenhum candidato na blacklist.'
            : activeTab === 'candidatos'
              ? 'Nenhum candidato ativo encontrado.'
              : search || activeFilters > 0
                ? 'Nenhum candidato encontrado com os filtros aplicados.'
                : 'Nenhum candidato cadastrado ainda.'}
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {paginated.map(c => (
            <div key={c.id} onClick={() => openCandidate(c)}
              style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 14px', cursor: 'pointer', transition: 'background 0.1s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>{initials(c.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: c.is_blacklisted ? '#ef4444' : 'var(--text-main)', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    {c.interview_eligible && <span style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', flexShrink: 0 }}>⚡ PIPELINE</span>}
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 1 }}>{c.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); toggle(c.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: favorites[c.id] ? '#fbbf24' : '#475569' }}>
                    <Star style={{ width: 18, height: 18, fill: favorites[c.id] ? '#fbbf24' : 'none', strokeWidth: 1.5 }} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleToggleBlacklistRow(c); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.is_blacklisted ? 'var(--text-error)' : '#475569' }}>
                    <Ban style={{ width: 18, height: 18 }} />
                  </button>
                  {hasPermission(profile.user_role, 'chat') && (
                    <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.conversations?.length ? '#22c55e' : '#475569' }}>
                      <Phone style={{ width: 18, height: 18, fill: c.conversations?.length ? '#22c55e22' : 'none' }} />
                    </div>
                  )}
                  <button onClick={e => { e.stopPropagation(); openCandidate(c); }}
                    style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', cursor: 'pointer' }}>
                    <Eye size={18} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {c.location && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>📍 {c.location}</span>}
                {(c.age && !/(não|nao)\s*informado|—/i.test(c.age)) && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>· {String(c.age).replace(/\s*anos?/i, '').trim()} anos</span>}
                {c.gender && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>· {c.gender}</span>}
              </div>
              {(c.vagas || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {c.vagas.slice(0, 3).map(v => {
                    const color = vagaColor(v);
                    return (
                      <span key={v} style={{ background: `${color}18`, border: `1px solid ${color}44`, color, padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600 }}>
                        {v.toUpperCase()}
                      </span>
                    );
                  })}
                  {c.vagas.length > 3 && <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>+{c.vagas.length - 3}</span>}
                </div>
              )}
            </div>
          ))}
          {totalPages > 1 && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>{page} de {totalPages}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => goTo(page - 1)} disabled={page === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: isMobile ? '10px 14px' : '7px 14px', color: page === 1 ? 'var(--text-muted)' : 'var(--text-dim)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                  <ChevronLeft style={{ width: 15, height: 15 }} /> {!isMobile && 'Anterior'}
                </button>
                {!isMobile && Array.from({ length: totalPages }, (_, i) => i + 1)
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
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: isMobile ? '10px 14px' : '7px 14px', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-dim)', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                  {!isMobile && 'Próximo'} <ChevronRight style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              {hasPermission(profile.user_role, 'chat') && <col style={{ width: '8%' }} />}
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                {([
                  ['name', 'Nome'],
                  ['location', 'Localização'],
                  ['age', 'Idade'],
                  [null, 'Gênero'],
                  [null, 'Vagas Aplicadas'],
                  [null, 'Favoritos'],
                  [null, 'Blacklist'],
                  ...(hasPermission(profile.user_role, 'chat') ? [[null, 'Chat'] as [SortKey, string]] : []),
                  [null, 'Visualizar'],
                ] as [SortKey, string][]).map(([col, label]) => (
                  <th key={label}
                    onClick={col ? () => handleSort(col) : undefined}
                    style={{ padding: '14px 16px', textAlign: (['Favoritos', 'Blacklist', 'Chat', 'Visualizar'].includes(label)) ? 'center' : 'left', fontSize: 11, fontWeight: 600, color: (col && sortKey === col) ? 'var(--primary)' : 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: col ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {label}
                      {col && <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(c => (
                <tr key={c.id} onClick={() => openCandidate(c)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--row-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{initials(c.name)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ color: c.is_blacklisted ? '#ef4444' : 'var(--text-main)', fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                          {c.interview_eligible && <span style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', flexShrink: 0 }}>⚡ PIPELINE</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <p style={{ color: 'var(--text-dim)', fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.email}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: 13, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{c.location ?? <span style={{ color: 'var(--text-muted)' }}>Não informado</span>}</td>
                  <td style={{ padding: '16px', fontSize: 13, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{(c.age && !/(não|nao)\s*informado|—/i.test(c.age)) ? `${String(c.age).replace(/\s*anos?/i, '').trim()} anos` : <span style={{ color: 'var(--text-muted)' }}>Não informado</span>}</td>
                  <td style={{ padding: '16px', fontSize: 13, color: 'var(--text-main)', fontWeight: 500, whiteSpace: 'nowrap' }}>{c.gender ?? <span style={{ color: 'var(--text-muted)' }}>Não informado</span>}</td>
                  <td style={{ padding: '16px' }}>
                    {(c.vagas || []).length === 0 ? <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Não informado</span> : (
                      <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                        {(c.vagas || []).slice(0, 3).map(v => {
                          const color = vagaColor(v);
                          return (
                            <span key={v} style={{ background: `${color}18`, border: `1px solid ${color}44`, color, padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                              {v.toUpperCase()}
                            </span>
                          );
                        })}
                        {c.vagas.length > 3 && <span style={{ color: 'var(--text-dim)', fontSize: 11, whiteSpace: 'nowrap' }}>+{c.vagas.length - 3}</span>}
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
                      <button onClick={e => { e.stopPropagation(); handleToggleBlacklistRow(c); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.is_blacklisted ? 'var(--text-error)' : '#475569', transition: 'color 0.15s' }}>
                        <Ban style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  </td>
                  {hasPermission(profile.user_role, 'chat') && (
                    <td style={{ padding: '0 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div
                          title={c.conversations?.length ? "Chat Ativo" : "Chat Inativo"}
                          style={{ 
                            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            color: c.conversations?.length ? '#22c55e' : '#475569', transition: 'all 0.15s' 
                          }}>
                          <Phone style={{ width: 16, height: 16, fill: c.conversations?.length ? '#22c55e22' : 'none' }} />
                        </div>
                      </div>
                    </td>
                  )}
                  <td style={{ padding: '0 16px', height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <button 
                            title="Visualizar Card"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCandidate(c);
                            }}
                            style={{
                              padding: '6px',
                              background: 'transparent',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'var(--primary-light-bg)';
                              e.currentTarget.style.borderColor = 'var(--primary)';
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = 'var(--border)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <Eye size={16} />
                          </button>
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Página {page} de {totalPages} · {processed.length} candidatos</span>
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

      {selected && (
        <CandidatePanel
          c={selected}
          onClose={() => setSelected(null)}
          navigate={navigate}
          onNotesChange={(id, notes) => {
            setCandidates(prev => prev.map(cand => cand.id === id ? { ...cand, notes } : cand));
            setSelected(prev => prev && prev.id === id ? { ...prev, notes } : prev);
          }}
          onFieldChange={(id, field, val) => {
            setCandidates(prev => prev.map(cand => cand.id === id ? { ...cand, [field]: val } : cand));
            setSelected(prev => prev && prev.id === id ? { ...prev, [field]: val } : prev);
          }}
          onTransferSuccess={() => {
            if (profile.userId) fetchCandidatesRef.current(profile.userId, profile.user_role);
          }}
          onBlacklistChange={(id, val) => {
            setCandidates(prev => prev.map(cand => cand.id === id ? { ...cand, is_blacklisted: val } : cand));
            setSelected(prev => prev && prev.id === id ? { ...prev, is_blacklisted: val } : prev);
          }}
          showAnalyzeWithVagas={true}
          hideFeedbackDaIA={true}
          onAnalyzeWithVagas={(cid) => setReanalysingCandId(cid)}
          onDeleteFromBank={async (id) => {
            const cand = candidates.find(c => c.id === id);
            await Promise.all([
              supabase.from('candidates').delete().eq('id', id),
              supabase.from('job_candidates').delete().eq('candidate_id', id),
              cand?.email
                ? supabase.from('vagas_candidaturas')
                    .update({ status: 'pending' })
                    .eq('candidate_email', cand.email)
                    .eq('status', 'talent_bank')
                : Promise.resolve(),
            ]);
            setSelected(null);
            if (profile.userId) fetchCandidatesRef.current(profile.userId, profile.user_role);
          }}
        />
      )}

      {reanalysingCandId && selected && (
        <ReanalyzeCandidateModal
          candidate={selected}
          organizationId={profile.organization_id || ''}
          userId={profile.userId}
          onClose={() => setReanalysingCandId(null)}
          onSuccess={handleReanalyzeSuccess}
        />
      )}
    </div>
  );
};

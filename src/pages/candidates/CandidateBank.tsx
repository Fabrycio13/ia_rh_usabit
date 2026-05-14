import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Star, Search, ChevronLeft, ChevronRight,
  X, ChevronUp, ChevronDown, Ban, Phone, Users, UserCheck, Eye
} from 'lucide-react';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { CandidatePanel } from '../../features/analysis/CandidatePanel';
import { AddCandidateModal } from '../../common/components/AddCandidateModal';
import { hasPermission } from '../../core/config/permissions';
import { type CandidateDetail } from '../../features/analysis/CandidatePanelUtils';

const PAGE_SIZE = 10;

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

function toStr(v: any): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
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
  conversations?: any[];
}

type SortKey = 'name' | 'location' | 'age' | null;
type SortDir = 'asc' | 'desc';

// ─── Sort indicator ───────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <span style={{ opacity: 0.25, display: 'inline-flex', flexDirection: 'column' }}><ChevronUp size={10} /><ChevronDown size={10} /></span>;
  return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: 'var(--primary)' }} /> : <ChevronDown size={12} style={{ color: 'var(--primary)' }} />;
}

// ─── SelectFilter ─────────────────────────────────────────────────────────────
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
    <div ref={ref} style={{ width: '160px', position: 'relative' }}>
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
  const [showAddModal, setShowAddModal] = useState(false);

  // ─ Sorting
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ─ Filters
  const [filterGender, setFilterGender] = useState('');
  const [filterVaga, setFilterVaga] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [activeTab, setActiveTab] = useState<'todos' | 'candidatos' | 'blacklist'>('todos');

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

  useEffect(() => {
    if (!profile.loaded) return;
    if (!profile.userId) { setLoading(false); return; }
    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    fetchCandidates(profile.userId, profile.user_role).finally(() => clearTimeout(safetyTimer));
    return () => clearTimeout(safetyTimer);
  }, [profile.userId, profile.loaded, profile.user_role]);

  async function fetchCandidates(userId: string, userRole?: string) {
    const isGlobalViewer = userRole === 'owner';
    const isOrgMember = userRole === 'gestor' || userRole === 'rh';
    try {
      setLoading(true);
      let query = supabase
        .from('candidates')
        .select('id, name, email, location, address, age, gender, linkedin, portfolio, cep, address_number, complement, score, interview_eligible, is_blacklisted, resume_url, resume_file_name, phone, conversations:candidate_conversations(candidate_id), job_candidates(job_id, vaga_id)')
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
          .select('id, name, email, location, address, age, gender, linkedin, portfolio, cep, address_number, complement, score, phone, resume_url, conversations:candidate_conversations(candidate_id), job_candidates(job_id, vaga_id)')
          .order('name', { ascending: true });
        if (!isGlobalViewer) {
          if (isOrgMember && profile.organization_id) {
            fallbackQuery = fallbackQuery.eq('organization_id', profile.organization_id);
          } else {
            fallbackQuery = fallbackQuery.eq('user_id', userId);
          }
        }
        const { data: fallback } = await fallbackQuery;
        setCandidates((fallback ?? []).map((c: any) => ({
          id: c.id, name: c.name, email: c.email, location: c.location, address: c.address,
          age: c.age, gender: c.gender, linkedin: c.linkedin, portfolio: c.portfolio, cep: c.cep,
          address_number: c.address_number, complement: c.complement,
          score: c.score,
          interview_eligible: false,
          is_blacklisted: false,
          resume_url: c.resume_url,
          phone: c.phone,
          conversations: c.conversations,
          vagas: (c.job_candidates ?? []).map((jc: any) => jc.jobs?.name || jc.vagas_white_label?.title).filter(Boolean),
        })));
        return;
      }

      setCandidates((data ?? []).map((c: any) => ({
        id: c.id, name: c.name, email: c.email, location: c.location, address: c.address,
        age: c.age, gender: c.gender, linkedin: c.linkedin, portfolio: c.portfolio, cep: c.cep,
        address_number: c.address_number, complement: c.complement,
        score: c.score,
        interview_eligible: c.interview_eligible ?? false,
        is_blacklisted: c.is_blacklisted ?? false,
        resume_url: c.resume_url,
        resume_file_name: c.resume_file_name,
        phone: c.phone,
        conversations: c.conversations,
        vagas: (c.job_candidates ?? []).map((jc: any) => jc.jobs?.name || jc.vagas_white_label?.title).filter(Boolean),
      })));
    } finally {
      setLoading(false);
    }
  }

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
        let va: any, vb: any;
        if (sortKey === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
        else if (sortKey === 'location') { va = (a.location ?? '').toLowerCase(); vb = (b.location ?? '').toLowerCase(); }
        else if (sortKey === 'age') { va = parseFloat(a.age ?? '0'); vb = parseFloat(b.age ?? '0'); }
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
      (jcData ?? []).forEach((jc: any) => {
        if (jc.job_id) validJobIds.add(jc.job_id);
        if (jc.vaga_id) validJobIds.add(jc.vaga_id);
      });
      console.log('[enrichCandidate] validJobIds:', Array.from(validJobIds));

      setSelected(prev => {
        if (!prev || prev.id !== id) return prev;
        const analysis = cd?.analysis ?? {};
        const rawHistory: any[] = analysis?.history ?? [];
        console.log('[enrichCandidate] rawHistory IDs:', rawHistory.map((h: any) => h.job_id));

        const validHistory = rawHistory.filter((h: any) => h.job_id);
        console.log('[enrichCandidate] validHistory count (unfiltered):', validHistory.length);

        const pipelineCards = (pipeData ?? []).map((pc: any) => {
          let jobName = undefined;
          let jobId = undefined;
          let score = undefined;
          try {
            const parsed = JSON.parse(pc.notes || '');
            jobName = parsed.selected_job_name;
            jobId = parsed.selected_job_id;
            score = parsed.selected_job_score;
          } catch { /* ignore */ }
          return { id: pc.id, jobId, jobName, score, pipelineName: pc.pipelines?.name };
        });

        return {
          ...prev,
          phone: toStr(cd?.phone) ?? null,
          address: toStr(cd?.address) ?? null,
          skills: toStr(analysis?.skills ?? analysis?.Skills ?? analysis?.habilidades ?? analysis?.Habilidades ?? (cd as any)?.skills),
          experience: toStr(analysis?.summary ?? analysis?.experience ?? analysis?.Experience ?? analysis?.experiencia ?? (cd as any)?.experience),
          education: toStr(analysis?.education ?? analysis?.Education ?? analysis?.formacao ?? analysis?.Formacao ?? (cd as any)?.education),
          redFlags: toStr(analysis?.gaps ?? analysis?.redFlags ?? analysis?.['RedFlags(Pontos de atenção)'] ?? analysis?.['Pontos de atenção'] ?? analysis?.['pontos_de_atencao']),
          notes: cd?.notes ?? null,
          is_blacklisted: cd?.is_blacklisted ?? prev.is_blacklisted,
          applications: validHistory.map((h: any) => ({
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
          })),
          pipelineCards,
          enriched: true,
          conversations: convData || []
        };
      });
    } catch {
      setSelected(prev => prev ? { ...prev, enriched: true } : prev);
    }
  }

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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <Users size={32} style={{ color: 'var(--primary)' }} />
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Banco de Talentos
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            {processed.length} candidato{processed.length !== 1 ? 's' : ''}
            {activeTab === 'blacklist' ? ' na blacklist' : activeTab === 'candidatos' ? ' ativos' : ' encontrado'}{processed.length !== 1 && activeTab === 'todos' ? 's' : ''}
            {search && <> · <span style={{ color: 'var(--text-muted)' }}>"{search}"</span></>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', width: 15, height: 15 }} />
            <input type="text" placeholder="Buscar candidatos…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, color: 'var(--text-main)', fontSize: 13, outline: 'none', width: 240 }}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary)', border: 'none', borderRadius: 10, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus style={{ width: 16, height: 16 }} /> Adicionar
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginRight: 4 }}>Filtrar por:</span>
        <SelectFilter value={filterGender} onChange={v => { setFilterGender(v); setPage(1); }} options={genderOptions} placeholder="Gênero" />
        <SelectFilter value={filterVaga} onChange={v => { setFilterVaga(v); setPage(1); }} options={vagaOptions} placeholder="Vaga aplicada" />
        <button onClick={() => { setOnlyFavorites(f => !f); setPage(1); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: onlyFavorites ? 'var(--favorite-bg)' : 'transparent', border: `1px solid ${onlyFavorites ? 'var(--favorite)' : 'var(--border)'}`, borderRadius: 8, padding: '7px 12px', color: onlyFavorites ? 'var(--favorite)' : 'var(--text-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
          <Star style={{ width: 13, height: 13, fill: onlyFavorites ? 'var(--favorite)' : 'none' }} />
          Apenas favoritos
        </button>
        {activeFilters > 0 && (
          <button onClick={() => { setFilterGender(''); setFilterVaga(''); setOnlyFavorites(false); setActiveTab('todos'); setPage(1); }}
            style={{ background: 'transparent', border: '1px solid var(--error-border)', borderRadius: 8, padding: '7px 12px', color: 'var(--text-error)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <X style={{ width: 12, height: 12 }} /> Limpar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
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
                gap: '8px',
                padding: '10px 20px',
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
                opacity: isActive ? 1 : 0.8
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
                  marginLeft: '8px',
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
            {paginated.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
                {activeTab === 'blacklist'
                  ? 'Nenhum candidato na blacklist.'
                  : activeTab === 'candidatos'
                    ? 'Nenhum candidato ativo encontrado.'
                    : search || activeFilters > 0
                      ? 'Nenhum candidato encontrado com os filtros aplicados.'
                      : 'Nenhum candidato cadastrado ainda.'}
              </td></tr>
            ) : paginated.map(c => (
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
                  {c.vagas.length === 0 ? <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Não informado</span> : (
                    <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
                      {c.vagas.slice(0, 2).map(v => (
                        <span key={v} style={{ background: 'var(--primary-light-bg)', border: '1px solid var(--primary-border)', color: 'var(--primary-text-light)', padding: '2px 7px', borderRadius: 5, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                          {v}
                        </span>
                      ))}
                      {c.vagas.length > 2 && <span style={{ color: 'var(--text-dim)', fontSize: 11, whiteSpace: 'nowrap' }}>+{c.vagas.length - 2}</span>}
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
            if (profile.userId) fetchCandidates(profile.userId, profile.user_role);
          }}
          onBlacklistChange={(id, val) => {
            setCandidates(prev => prev.map(cand => cand.id === id ? { ...cand, is_blacklisted: val } : cand));
            setSelected(prev => prev && prev.id === id ? { ...prev, is_blacklisted: val } : prev);
          }}
        />
      )}

      <AddCandidateModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          if (profile.userId) fetchCandidates(profile.userId);
        }}
        onViewCandidate={async (candidateId) => {
          setShowAddModal(false);
          // Abre o painel do candidato existente com dados já carregados
          openCandidate(candidates.find(c => c.id === candidateId)!);
        }}
      />
    </div>
  );
};

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, X, Edit2, Check, Trash2, GripVertical, ChevronDown, Ban, LayoutDashboard, List, BarChart2, Flag, Calendar, Target, ClipboardList, AlertCircle, Phone, Kanban } from 'lucide-react';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { logScreening, logActivity } from '../../core/services/logger';
import { CandidatePanel } from '../../features/analysis/CandidatePanel';
import { hasPermission } from '../../core/config/permissions';
import { type CandidateDetail, toStr } from '../../features/analysis/CandidatePanelUtils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Pipeline {
    id: string;
    name: string;
    user_id: string;
    vaga_id?: string | null;
    is_active?: boolean;
}
interface PipelineColumn {
    id: string;
    name: string;
    color: string;
    position: number;
    pipeline_id: string;
}

interface PipelineCard {
    id: string;
    column_id: string;
    candidate_id: string;
    position: number;
    pipeline_id: string;
    notes: string | null;
    candidate_name: string;
    candidate_score: number | null;
    candidate_vagas: string[];
    display_job_name?: string;
    display_job_score?: number;
    job_id?: string;
    is_blacklisted?: boolean;
    candidate_phone?: string | null;
    candidate_conversations?: any[];
    vaga_id?: string | null;
}

interface EligibleCandidate {
    id: string;
    name: string;
    score: number | null;
    vagas: string[];
    already_in_pipeline: boolean;
    is_blacklisted?: boolean;
    phone?: string | null;
    conversations?: any[];
}

// ─── Default columns ──────────────────────────────────────────────────────────
const DEFAULT_COLUMNS = [
    { name: 'Triagem', color: '#6366f1', position: 0 },
    { name: 'Entrevista', color: '#0ea5e9', position: 1 },
    { name: 'Proposta', color: '#f59e0b', position: 2 },
    { name: 'Aprovado', color: '#22c55e', position: 3 },
    { name: 'Reprovado', color: '#ef4444', position: 4 },
];

const COLUMN_COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#22c55e', '#ef4444', '#a78bfa', '#ec4899', '#14b8a6'];

function initials(name: string) {
    return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
}
function scoreColor(s: number | null) {
    if (!s) return '#64748b';
    return s >= 70 ? '#22c55e' : s >= 40 ? '#f59e0b' : '#ef4444';
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
@keyframes pipelineFadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
.pipe-col { display:flex; flex-direction:column; min-width:280px; max-width:280px; max-height:calc(100vh - 260px); border-radius:16px; padding:0; background:var(--bg-main); border:1px solid var(--border); transition:border-color 0.2s; }
.pipe-col.drag-over { border-color:var(--primary); background:rgba(99,102,241,0.04); }
.pipe-col.dragging { opacity:0.1; }
.pipe-card { background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:14px; cursor:grab; user-select:none; position:relative; }
.pipe-card:hover { box-shadow:0 4px 20px rgba(0,0,0,0.25); border-color:rgba(99,102,241,0.3); }
.pipe-card.dragging { opacity:0.1; }
.pipe-card.custom-ghost { position:fixed; pointer-events:none; z-index:9999; width:250px; left:0; top:0; opacity:1 !important; box-shadow: 0 20px 50px rgba(0,0,0,0.5); transform: rotate(3deg); border: 2px solid var(--primary); }
.pipe-card.drop-target { border-top: 2px solid var(--primary); margin-top: -2px; }
.pipe-btn { background:none; border:none; cursor:pointer; padding:5px; border-radius:6px; display:flex; align-items:center; justify-content:center; transition:background 0.15s; color:var(--text-dim); }
.pipe-btn:hover { background:var(--bg-card); color:var(--text-main); }
.pipe-col-header-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.candidate-option { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; cursor:pointer; transition:background 0.1s; }
.candidate-option:hover { background:rgba(99,102,241,0.08); }
.candidate-option.disabled { opacity:0.4; cursor:not-allowed; }

/* Premium Dropdown */
.pipeline_select_btn {
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 12px 20px;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 240px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}
.pipeline_select_btn:hover {
    background: rgba(30, 41, 59, 0.8);
    border-color: var(--primary);
    transform: translateY(-1px);
    box-shadow: 0 8px 30px rgba(99, 102, 241, 0.2);
}
.pipeline_dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    width: 100%;
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 8px;
    z-index: 1000;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    animation: dropdownIn 0.2s ease-out;
}
@keyframes dropdownIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
.pipeline_option {
    padding: 12px 16px;
    border-radius: 10px;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    font-weight: 600;
}
.pipeline_option:hover {
    background: rgba(99, 102, 241, 0.1);
    color: var(--primary);
}
.pipeline_option.active {
    background: rgba(99, 102, 241, 0.2);
    color: #fff;
}
.tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
    color: var(--text-dim);
}
.tab-btn:hover:not(.active) {
    color: var(--text-main);
    background: rgba(99, 102, 241, 0.08);
}
.tab-btn.active {
    background: rgba(99, 102, 241, 0.1);
    color: var(--primary);
}
@keyframes iconBounce {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.3) rotate(-8deg); }
    70%  { transform: scale(1.15) rotate(4deg); }
    100% { transform: scale(1); }
}
.tab-btn:hover svg {
    animation: iconBounce 0.4s ease forwards;
}
`;

// ─── Column Header Edit Inline ─────────────────────────────────────────────────
function ColHeader({ col, onUpdate, onDelete, onDragStart, onDragEnd }: {
    col: PipelineColumn;
    onUpdate: (id: string, name: string, color: string) => void;
    onDelete: (id: string) => void;
    onDragStart: (e: React.DragEvent, type: 'col', item: PipelineColumn) => void;
    onDragEnd: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(col.name);
    const [color, setColor] = useState(col.color);
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

    const save = () => { onUpdate(col.id, name.trim() || col.name, color); setEditing(false); };

    if (editing) return (
        <div style={{ padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input ref={ref} value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--primary)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-main)', fontSize: 13, fontWeight: 600, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLUMN_COLORS.map(c => (
                    <div key={c} onClick={() => setColor(c)} style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '2px solid #fff' : '2px solid transparent', boxSizing: 'border-box' }} />
                ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={save} style={{ flex: 1, background: 'var(--primary)', border: 'none', borderRadius: 8, padding: '6px 0', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Check size={13} /> Salvar</button>
                <button onClick={() => onDelete(col.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '6px 10px', color: '#ef4444', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Trash2 size={12} /></button>
                <button onClick={() => setEditing(false)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer' }}><X size={12} /></button>
            </div>
        </div>
    );

    return (
        <div
            style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'grab' }}
            draggable
            onDragStart={e => onDragStart(e, 'col', col)}
            onDragEnd={onDragEnd}
        >
            <div className="pipe-col-header-dot" style={{ background: col.color }} />
            <span style={{ flex: 1, color: 'var(--text-main)', fontWeight: 700, fontSize: 13 }}>{col.name}</span>
            <button className="pipe-btn" onClick={() => setEditing(true)} title="Editar coluna"><Edit2 size={13} /></button>
        </div>
    );
}

// ─── Add Candidate Modal ───────────────────────────────────────────────────────
function AddCandidateModal({ columnId, eligibles, onAdd, onClose }: {
    columnId: string;
    eligibles: EligibleCandidate[];
    onAdd: (colId: string, cand: EligibleCandidate) => void;
    onClose: () => void;
}) {
    const [search, setSearch] = useState('');
    const filtered = eligibles.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
            <div style={{ position: 'relative', zIndex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, width: 380, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <p style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 16 }}>Adicionar Candidato</p>
                    <button className="pipe-btn" onClick={onClose}><X size={16} /></button>
                </div>
                <input
                    autoFocus
                    placeholder="Buscar candidato…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 14px', color: 'var(--text-main)', fontSize: 13, outline: 'none', marginBottom: 12, width: '100%', boxSizing: 'border-box' }}
                />
                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filtered.length === 0 && (
                        <p style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                            {eligibles.length === 0
                                ? 'Nenhum candidato elegível. Use o botão "Entrevistar" no Banco de Candidatos.'
                                : 'Nenhum candidato encontrado.'}
                        </p>
                    )}
                    {filtered.map(c => (
                        <div
                            key={c.id}
                            className={`candidate-option${c.already_in_pipeline ? ' disabled' : ''}`}
                            onClick={() => !c.already_in_pipeline && onAdd(columnId, c)}
                        >
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                {initials(c.name)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <p style={{ color: c.is_blacklisted ? '#ef4444' : 'var(--text-main)', fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                                    {c.is_blacklisted && <Ban size={13} color="#ef4444" />}
                                </div>
                                <p style={{ color: 'var(--text-dim)', fontSize: 11, margin: '2px 0 0' }}>
                                    {c.vagas.slice(0, 2).join(', ')}{c.vagas.length > 2 ? '…' : ''}
                                </p>
                            </div>
                            {c.score != null && <span style={{ background: scoreColor(c.score), color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{c.score}%</span>}
                            {c.already_in_pipeline && <span style={{ color: 'var(--text-dim)', fontSize: 10, flexShrink: 0 }}>já no pipeline</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export const Pipeline = () => {
    const { profile } = useUser();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const vagaIdParam = searchParams.get('vagaId');
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
    const [fetchingPipelines, setFetchingPipelines] = useState(true);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'board' | 'lista' | 'metricas'>('board');
    
    const [columns, setColumns] = useState<PipelineColumn[]>([]);
    const [cards, setCards] = useState<PipelineCard[]>([]);
    const [eligibles, setEligibles] = useState<EligibleCandidate[]>([]);
    
    const [showCreatePipeline, setShowCreatePipeline] = useState(false);
    const [newPipeName, setNewPipeName] = useState('');
    const [addColModal, setAddColModal] = useState(false);
    const [newColName, setNewColName] = useState('');
    const [newColColor, setNewColColor] = useState(COLUMN_COLORS[0]);
    const [addCandModal, setAddCandModal] = useState<string | null>(null);
    const [draggingCard, setDraggingCard] = useState<PipelineCard | null>(null);
    const [draggingCol, setDraggingCol] = useState<PipelineColumn | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);
    const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

    const [showSelect, setShowSelect] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetail | null>(null);
    
    // Filtro de Status para os pipelines
    const [availableVagas, setAvailableVagas] = useState<Array<{ id: string; title: string; status: string }>>([]);
    const [pipelineStatusFilter, setPipelineStatusFilter] = useState<string>(''); // '' = Todas
    
    const [showStatusSelect, setShowStatusSelect] = useState(false);
    const statusSelectRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!profile.loaded || !profile.userId) return;
        init(profile.userId);
    }, [profile.userId, profile.loaded]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
                setShowSelect(false);
            }
            if (statusSelectRef.current && !statusSelectRef.current.contains(e.target as Node)) {
                setShowStatusSelect(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (selectedPipelineId && profile.userId) {
            loadPipelineData(profile.userId, selectedPipelineId);
        } else {
            setColumns([]);
            setCards([]);
        }
    }, [selectedPipelineId, profile.userId]);
    
    // Helper function para status da vaga
    const getVagaStatusBadge = (vagaId?: string | null) => {
        if (!vagaId) return null;
        const vaga = availableVagas.find(v => v.id === vagaId);
        if (!vaga) return null;
        
        const statusConfig: Record<string, { color: string; emoji: string; label: string }> = {
            'aberta': { color: '#22c55e', emoji: '', label: 'Aberta' },
            'pausada': { color: '#f59e0b', emoji: '', label: 'Pausada' },
            'fechada': { color: '#ef4444', emoji: '', label: 'Fechada' },
            'cancelada': { color: '#64748b', emoji: '', label: 'Cancelada' }
        };
        
        const config = statusConfig[vaga.status] || { color: '#64748b', emoji: '', label: '' };
        
        return (
            <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px',
                fontSize: '7px',
                fontWeight: 700,
                padding: '2px 4px',
                borderRadius: '4px',
                background: config.color,
                color: '#fff',
                minWidth: '10px',
                justifyContent: 'center'
            }} title={`Vaga ${config.label}`}>
                {config.emoji}
            </span>
        );
    };

    async function init(userId: string) {
        setFetchingPipelines(true);
        try {
            const { data: pipes } = await supabase.from('pipelines').select('*').eq('user_id', userId).order('name');
            setPipelines(pipes || []);
            if (pipes && pipes.length > 0) {
                // Se houver um vagaIdParam, tenta encontrar o pipeline correspondente
                const targetPipe = vagaIdParam ? pipes.find(p => p.vaga_id === vagaIdParam) : null;
                
                if (targetPipe) {
                    setSelectedPipelineId(targetPipe.id);
                } else {
                    setSelectedPipelineId(pipes[0].id);
                }
            }
            
            // Buscar vagas disponíveis para filtro
            await loadAvailableVagas();
        } catch (err) {
            console.error('Init error:', err);
        } finally {
            setFetchingPipelines(false);
        }
    }
    
    async function loadAvailableVagas() {
        try {
            const { data: vagas } = await supabase
                .from('vagas_white_label')
                .select('id, title, status, is_accepting_applications')
                .order('title');
            
            if (vagas) {
                setAvailableVagas(vagas.map(v => ({
                    id: v.id,
                    title: v.title,
                    status: v.status
                })));
            }
        } catch (err) {
            console.error('Error loading vagas:', err);
        }
    }

    async function createPipeline() {
        if (!newPipeName.trim() || !profile.userId || loading) return;
        setLoading(true);
        try {
            const { data: pipe, error } = await supabase.from('pipelines')
                .insert({ name: newPipeName.trim(), user_id: profile.userId })
                .select().single();
            
            if (error) throw error;

            if (pipe) {
                const toInsert = DEFAULT_COLUMNS.map(c => ({ ...c, user_id: profile.userId, pipeline_id: pipe.id }));
                await supabase.from('pipeline_columns').insert(toInsert);
                
                setPipelines(prev => [...prev, pipe].sort((a, b) => a.name.localeCompare(b.name)));
                setSelectedPipelineId(pipe.id);
                setNewPipeName('');
                setShowCreatePipeline(false);
                logActivity(profile.userId, `Criou o processo "${pipe.name}"`);
            }
        } catch (err: any) {
            console.error('Create pipeline error:', err);
            alert('Erro ao criar pipeline: ' + (err.message || 'Verifique sua conexão'));
        } finally {
            setLoading(false);
        }
    }

    async function loadPipelineData(userId: string, pipelineId: string) {
        setLoading(true);
        try {
            const { data: cols } = await supabase
                .from('pipeline_columns').select('*').eq('pipeline_id', pipelineId).order('position');
            setColumns(cols || []);

            const { data: cardData } = await supabase
                .from('pipeline_cards')
                .select('id, column_id, candidate_id, position, notes, candidates(name, score, is_blacklisted, phone, conversations:candidate_conversations(candidate_id), job_candidates(jobs(name), vagas_white_label(title)))')
                .eq('pipeline_id', pipelineId)
                .order('position');

            setCards((cardData ?? []).map((c: any) => {
                let displayJobName = undefined;
                let displayJobScore = undefined;
                let jobId = undefined;
                try {
                    const parsed = JSON.parse(c.notes || '');
                    if (parsed.selected_job_id) {
                        displayJobName = parsed.selected_job_name;
                        displayJobScore = parsed.selected_job_score;
                        jobId = parsed.selected_job_id;
                    }
                } catch { }

                return {
                    id: c.id,
                    column_id: c.column_id,
                    candidate_id: c.candidate_id,
                    position: c.position,
                    pipeline_id: pipelineId,
                    notes: c.notes,
                    candidate_name: c.candidates?.name ?? 'Sem nome',
                    candidate_score: c.candidates?.score ?? null,
                    candidate_vagas: (c.candidates?.job_candidates ?? []).map((jc: any) => jc.jobs?.name || jc.vagas_white_label?.title).filter(Boolean),
                    display_job_name: displayJobName,
                    display_job_score: displayJobScore,
                    job_id: jobId,
                    is_blacklisted: c.candidates?.is_blacklisted,
                    candidate_phone: c.candidates?.phone,
                    candidate_conversations: c.candidates?.conversations,
                };
            }));
            await loadEligibles(userId, cardData ?? []);
        } finally {
            setLoading(false);
        }
    }

    async function loadEligibles(userId: string, currentCards: any[]) {
        const { data } = await supabase
            .from('candidates')
            .select('id, name, score, is_blacklisted, phone, conversations:candidate_conversations(candidate_id), job_candidates(jobs(name), vagas_white_label(title))')
            .eq('user_id', userId)
            .eq('interview_eligible', true)
            .order('name');

        const inPipeline = new Set(currentCards.map((c: any) => c.candidate_id));

        setEligibles((data ?? []).map((c: any) => ({
            id: c.id,
            name: c.name,
            score: c.score,
            vagas: (c.job_candidates ?? []).map((jc: any) => jc.jobs?.name || jc.vagas_white_label?.title).filter(Boolean),
            already_in_pipeline: inPipeline.has(c.id),
            is_blacklisted: c.is_blacklisted,
            phone: c.phone,
            conversations: c.conversations,
        })));
    }

    // ─── Candidate Detail Logic ──────────────────────────────────────────────
    async function enrichCandidate(id: string): Promise<Partial<CandidateDetail>> {
        const [{ data: cand }, { data: jcData }, { data: pipeData }, { data: convData }] = await Promise.all([
            supabase.from('candidates').select('*').eq('id', id).maybeSingle(),
            supabase.from('job_candidates').select('job_id').eq('candidate_id', id),
            supabase.from('pipeline_cards').select('id, notes, pipelines(name)').eq('candidate_id', id),
            supabase.from('candidate_conversations').select('*').eq('candidate_id', id).eq('user_id', profile.userId)
        ]);

        if (!cand) return { enriched: true };

        const analysis = cand.analysis ?? {};
        const validJobIds = new Set((jcData ?? []).map((jc: any) => jc.job_id));
        const rawHistory: any[] = analysis?.history ?? [];
        const validHistory = rawHistory.filter((h: any) => h.job_id && validJobIds.has(h.job_id));

        const pipelineCards = (pipeData ?? []).map((pc: any) => {
            let jobName = undefined;
            let jobId = undefined;
            let score = undefined;
            try {
                const parsed = JSON.parse(pc.notes || '');
                jobName = parsed.selected_job_name;
                jobId = parsed.selected_job_id;
                score = parsed.selected_job_score;
            } catch { }
            return { id: pc.id, jobId, jobName, score, pipelineName: pc.pipelines?.name };
        });

        return {
            email: toStr(cand.email) || '',
            location: toStr(cand.location) || null,
            address: toStr(cand.address) || null,
            age: toStr(cand.age) || null,
            gender: toStr(cand.gender) || null,
            phone: toStr(cand.phone) || null,
            skills: toStr(analysis?.skills ?? analysis?.Skills ?? analysis?.habilidades ?? analysis?.Habilidades ?? cand.skills),
            experience: toStr(analysis?.experience ?? analysis?.Experience ?? analysis?.experiencia ?? analysis?.Experiencia ?? cand.experience),
            education: toStr(analysis?.education ?? analysis?.Education ?? analysis?.formacao ?? analysis?.Formacao ?? cand.education),
            redFlags: toStr(analysis?.redFlags ?? analysis?.['RedFlags(Pontos de atenção)'] ?? analysis?.['Pontos de atenção'] ?? analysis?.['pontos_de_atencao'] ?? cand.red_flags),
            notes: cand.notes || null,
            is_blacklisted: cand.is_blacklisted ?? false,
            applications: validHistory.map((h: any) => ({
                jobId: h.job_id,
                jobName: h.job_name,
                score: h.score,
                appliedAt: h.analyzed_at,
                skills: toStr(h.skills ?? h.habilidades ?? h.analysis?.skills ?? h.analysis?.habilidades),
                experience: toStr(h.experience ?? h.experiencia ?? h.analysis?.experience ?? h.analysis?.experiencia),
                education: toStr(h.education ?? h.formacao ?? h.analysis?.education ?? h.analysis?.formacao),
                redFlags: toStr(h.redFlags ?? h.attention_points ?? h.analysis?.redFlags ?? h.analysis?.['Pontos de atenção'] ?? h.analysis?.attention_points),
            })),
            pipelineCards,
            resume_url: cand.resume_url,
            enriched: true,
            conversations: convData || []
        };
    }

    async function openCandidate(card: PipelineCard) {
        const base: any = {
            id: card.candidate_id,
            name: card.candidate_name,
            score: card.candidate_score,
            vagas: card.candidate_vagas,
            enriched: false,
            applications: [],
            hideBankButton: true
        };
        setSelectedCandidate(base);
        try {
            const extra = await enrichCandidate(card.candidate_id);
            setSelectedCandidate(prev => prev && prev.id === card.candidate_id ? { ...prev, ...extra } : prev);
        } catch (err) {
            console.error('Error enriching candidate:', err);
            setSelectedCandidate(prev => prev && prev.id === card.candidate_id ? { ...prev, enriched: true } : prev);
        }
    }

    // ─── Column CRUD ──────────────────────────────────────────────────────────
    async function createColumn() {
        if (!newColName.trim() || !profile.userId) return;
        const pos = columns.length;
        const { data } = await supabase.from('pipeline_columns')
            .insert({ user_id: profile.userId, pipeline_id: selectedPipelineId, name: newColName.trim(), color: newColColor, position: pos })
            .select().single();
        if (data) {
            setColumns(prev => [...prev, data]);
            setNewColName('');
            setNewColColor(COLUMN_COLORS[0]);
            setAddColModal(false);
        }
    }

    async function updateColumn(id: string, name: string, color: string) {
        await supabase.from('pipeline_columns').update({ name, color }).eq('id', id);
        setColumns(prev => prev.map(c => c.id === id ? { ...c, name, color } : c));
    }

    async function deleteColumn(id: string) {
        await supabase.from('pipeline_columns').delete().eq('id', id);
        setColumns(prev => prev.filter(c => c.id !== id));
        setCards(prev => prev.filter(c => c.column_id !== id));
    }

    // ─── Card CRUD ────────────────────────────────────────────────────────────
    async function addCard(columnId: string, cand: EligibleCandidate, jobInfo?: { jobId: string; jobName: string; score: number }, pipelineId?: string): Promise<PipelineCard | null> {
        if (!profile.userId) return null;
        const pos = cards.filter(c => c.column_id === columnId).length;

        let notesJson = null;
        if (jobInfo) {
            notesJson = JSON.stringify({
                selected_job_id: jobInfo.jobId,
                selected_job_name: jobInfo.jobName,
                selected_job_score: jobInfo.score
            });
        }

        const targetPipeId = pipelineId || selectedPipelineId;
        if (!targetPipeId) return null;

        const { data } = await supabase.from('pipeline_cards')
            .insert({
                user_id: profile.userId,
                column_id: columnId,
                candidate_id: cand.id,
                position: pos,
                pipeline_id: targetPipeId,
                notes: notesJson
            })
            .select().single();
        if (data) {
            await supabase.from('candidates').update({ interview_eligible: true }).eq('id', cand.id);

            const targetCol = columns.find(cl => cl.id === columnId);
            const targetPipe = pipelines.find(p => p.id === targetPipeId);
            logScreening(
                profile.userId,
                cand.id,
                'inclusion',
                null,
                targetCol?.name || 'Pipeline',
                { 
                    job_name: jobInfo?.jobName, 
                    job_id: jobInfo?.jobId, 
                    pipeline_id: targetPipeId,
                    pipeline_name: targetPipe?.name
                }
            );
            logActivity(profile.userId, `Adicionou "${cand.name}" ao processo "${targetPipe?.name || 'Pipeline'}"`);

            const newCard: PipelineCard = {
                id: data.id,
                column_id: columnId,
                candidate_id: cand.id,
                position: pos,
                pipeline_id: targetPipeId,
                notes: notesJson,
                candidate_name: cand.name,
                candidate_score: cand.score,
                candidate_vagas: cand.vagas,
                display_job_name: jobInfo?.jobName,
                display_job_score: jobInfo?.score
            };
            setCards(prev => [...prev, newCard]);
            setEligibles(prev => prev.map(e => e.id === cand.id ? { ...e, already_in_pipeline: true } : e));
            setAddCandModal(null);
            return newCard;
        }
        return null;
    }

    async function removeCard(cardId: string, candidateId: string) {
        await supabase.from('pipeline_cards').delete().eq('id', cardId);
        const filtered = cards.filter(c => c.id !== cardId);
        setCards(filtered);

        const stillInPipeline = filtered.some(c => c.candidate_id === candidateId);
        setEligibles(prev => prev.map(e => e.id === candidateId ? { ...e, already_in_pipeline: stillInPipeline } : e));

        const card = cards.find(c => c.id === cardId);
        const pipe = pipelines.find(p => p.id === (card?.pipeline_id || selectedPipelineId));
        if (profile.userId && card) {
            logActivity(profile.userId, `Removeu "${card.candidate_name}" do processo "${pipe?.name || 'Pipeline'}"`);
        }

        if (!stillInPipeline) {
            await supabase.from('candidates').update({ interview_eligible: false }).eq('id', candidateId);
        }

        if (selectedCandidate?.id === candidateId) {
            setSelectedCandidate(prev => prev ? {
                ...prev,
                interview_eligible: stillInPipeline,
                pipelineCards: prev.pipelineCards?.filter(pc => pc.id !== cardId)
            } : null);
        }
    }

    function handleNotesChange(id: string, notes: string) {
        setCards(prev => prev.map(c => c.candidate_id === id ? { ...c, notes } : c));
        if (selectedCandidate?.id === id) setSelectedCandidate(prev => prev ? { ...prev, notes } : null);
    }

    async function handleEligibleChange(id: string, val: boolean, jobInfo?: { jobId: string; jobName: string; score: number }, pipelineId?: string) {
        if (val) {
            const cand = eligibles.find(e => e.id === id);
            const targetPipeline = pipelineId || selectedPipelineId;
            const targetCol = columns[0]?.id;
            if (cand && targetCol && targetPipeline) {
                const newCard = await addCard(targetCol, cand, jobInfo, targetPipeline);

                if (newCard && selectedCandidate?.id === id) {
                    setSelectedCandidate(prev => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            pipelineCards: [
                                ...(prev.pipelineCards || []),
                                {
                                    id: newCard.id,
                                    jobId: jobInfo?.jobId,
                                    jobName: jobInfo?.jobName,
                                    score: jobInfo?.score,
                                    pipelineName: pipelines.find(p => p.id === targetPipeline)?.name
                                }
                            ]
                        };
                    });
                }
            }
        }
        if (selectedCandidate?.id === id) setSelectedCandidate(prev => prev ? { ...prev, interview_eligible: val } : null);
    }

    function handleFieldChange(id: string, field: string, val: any) {
        if (field === 'name') setCards(prev => prev.map(c => c.candidate_id === id ? { ...c, candidate_name: val } : c));
        if (field === 'conversations') setCards(prev => prev.map(c => c.candidate_id === id ? { ...c, candidate_conversations: val } : c));
        if (field === 'phone') setCards(prev => prev.map(c => c.candidate_id === id ? { ...c, candidate_phone: val } : c));
        if (selectedCandidate?.id === id) setSelectedCandidate(prev => prev ? { ...prev, [field]: val } : null);
    }

    async function deletePipeline(id: string) {
        if (!window.confirm('Tem certeza que deseja excluir este pipeline? Todos os cards e etapas serão removidos.')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('pipelines').delete().eq('id', id);
            if (error) throw error;
            setPipelines(prev => {
                const pipe = prev.find(p => p.id === id);
                if (pipe && profile.userId) {
                    logActivity(profile.userId, `Excluiu o processo "${pipe.name}"`);
                }
                const filtered = prev.filter(p => p.id !== id);
                if (selectedPipelineId === id) {
                    setSelectedPipelineId(filtered.length > 0 ? filtered[0].id : null);
                }
                return filtered;
            });
        } catch (err: any) {
            console.error('Delete pipeline error:', err);
            alert('Erro ao excluir pipeline: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    async function moveCard(card: PipelineCard, targetColId: string) {
        if (card.column_id === targetColId) return;
        const pos = cards.filter(c => c.column_id === targetColId).length;
        
        const sourceCol = columns.find(cl => cl.id === card.column_id);
        const targetCol = columns.find(cl => cl.id === targetColId);

        await supabase.from('pipeline_cards').update({ column_id: targetColId, position: pos }).eq('id', card.id);
        setCards(prev => prev.map(c => c.id === card.id ? { ...c, column_id: targetColId, position: pos } : c));

        if (profile.userId) {
            logScreening(
                profile.userId,
                card.candidate_id,
                'move',
                sourceCol?.name,
                targetCol?.name,
                { card_id: card.id, job_id: card.job_id, job_name: card.display_job_name }
            );
        }
    }

    // ─── Drag handlers ────────────────────────────────────────────────────────
    const onDragStart = (e: React.DragEvent, type: 'card' | 'col', item: PipelineCard | PipelineColumn) => {
        if (type === 'card') e.stopPropagation();
        e.dataTransfer.setData('type', type);

        if (type === 'card' && e.dataTransfer.setDragImage) {
            const img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(img, 0, 0);
        }

        if (type === 'card') {
            const card = item as PipelineCard;
            setDragPos({ x: e.clientX, y: e.clientY });
            e.dataTransfer.setData('cardId', card.id);
            setTimeout(() => setDraggingCard(card), 0);
        } else {
            const col = item as PipelineColumn;
            e.dataTransfer.setData('colId', col.id);
            setTimeout(() => setDraggingCol(col), 0);
        }
    };

    const onDragEnd = () => {
        setDraggingCard(null);
        setDraggingCol(null);
        setDragOverCol(null);
        setDragOverCardId(null);
    };

    const onDragOverCol = (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        setDragOverCol(colId);
        setDragPos({ x: e.clientX, y: e.clientY });
    };

    const onDragOverCard = (e: React.DragEvent, cardId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverCardId(cardId);
        setDragPos({ x: e.clientX, y: e.clientY });
    };

    const onDrop = async (e: React.DragEvent, targetColId: string) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('type');

        if (type === 'card' && draggingCard) {
            let targetPos = 0;
            const currentColCards = cards.filter(c => c.column_id === targetColId).sort((a, b) => a.position - b.position);

            if (dragOverCardId) {
                const overIdx = currentColCards.findIndex(c => c.id === dragOverCardId);
                targetPos = overIdx !== -1 ? overIdx : currentColCards.length;
            } else {
                targetPos = currentColCards.length;
            }

            if (draggingCard.column_id === targetColId) {
                const oldIdx = currentColCards.findIndex(c => c.id === draggingCard.id);
                if (oldIdx === targetPos || oldIdx === targetPos - 1) {
                    onDragEnd();
                    return;
                }
            }

            const sourceCol = columns.find(cl => cl.id === draggingCard.column_id);
            const targetCol = columns.find(cl => cl.id === targetColId);

            const otherCards = cards.filter(c => c.id !== draggingCard.id);
            const targetColOtherCards = otherCards.filter(c => c.column_id === targetColId).sort((a, b) => a.position - b.position);

            targetColOtherCards.splice(targetPos, 0, { ...draggingCard, column_id: targetColId });

            const updatedCards = [
                ...otherCards.filter(c => c.column_id !== targetColId),
                ...targetColOtherCards.map((c, i) => ({ ...c, position: i }))
            ];
            setCards(updatedCards);

            await supabase.from('pipeline_cards').update({ column_id: targetColId, position: targetPos }).eq('id', draggingCard.id);
            
            if (draggingCard.column_id !== targetColId && profile.userId) {
                const pipe = pipelines.find(p => p.id === (draggingCard.pipeline_id || selectedPipelineId));
                logScreening(
                    profile.userId,
                    draggingCard.candidate_id,
                    'move',
                    sourceCol?.name,
                    targetCol?.name,
                    { card_id: draggingCard.id, job_id: draggingCard.job_id, job_name: draggingCard.display_job_name }
                );
                logActivity(profile.userId, `Moveu "${draggingCard.candidate_name}" para "${targetCol?.name || 'Etapa'}" no processo "${pipe?.name || 'Pipeline'}"`);
            }

            for (let i = 0; i < targetColOtherCards.length; i++) {
                if (targetColOtherCards[i].position !== i) {
                    await supabase.from('pipeline_cards').update({ position: i }).eq('id', targetColOtherCards[i].id);
                }
            }
        } else if (type === 'col') {
            const sourceColId = e.dataTransfer.getData('colId');
            if (sourceColId === targetColId) {
                onDragEnd();
                return;
            }
            const sourceIdx = columns.findIndex(c => c.id === sourceColId);
            const targetIdx = columns.findIndex(c => c.id === targetColId);
            if (sourceIdx === -1 || targetIdx === -1) { onDragEnd(); return; }

            const newCols = [...columns];
            const [moved] = newCols.splice(sourceIdx, 1);
            newCols.splice(targetIdx, 0, moved);

            const updatedCols = newCols.map((c, i) => ({ ...c, position: i }));
            setColumns(updatedCols);

            for (const c of updatedCols) {
                await supabase.from('pipeline_columns').update({ position: c.position }).eq('id', c.id);
            }
        }
        onDragEnd();
    };

    // ─── Loading ──────────────────────────────────────────────────────────────
    if (fetchingPipelines) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Carregando processos…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const eligiblesForModal = addCandModal
        ? eligibles.map(e => ({ ...e, already_in_pipeline: cards.some(c => c.candidate_id === e.id) }))
        : [];

    return (
        <>
            <style>{css}</style>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
                {/* Left side: Title and Count */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <Kanban size={32} style={{ color: 'var(--primary)' }} />
                        <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            Pipeline de Recrutamento
                        </h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                        {pipelines.length} processo{pipelines.length !== 1 ? 's' : ''} cadastrado{pipelines.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Right side: Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Dropdown 1: Filtro de Status das Vagas */}
                    <div style={{ position: 'relative', zIndex: 100 }} ref={statusSelectRef}>
                        <div 
                            onClick={() => setShowStatusSelect(!showStatusSelect)}
                            style={{ 
                                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, 
                                padding: '10px 14px', color: 'var(--text-main)', fontSize: 13, 
                                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', 
                                minWidth: 200, justifyContent: 'space-between'
                            }}
                        >
                            <span style={{ fontWeight: 600 }}>
                                {pipelineStatusFilter === '' && 'Vagas: Todas'}
                                {pipelineStatusFilter === 'aberta' && 'Vagas: Abertas'}
                                {pipelineStatusFilter === 'pausada' && 'Vagas: Pausadas'}
                                {pipelineStatusFilter === 'fechada' && 'Vagas: Fechadas'}
                                {pipelineStatusFilter === 'cancelada' && 'Vagas: Canceladas'}
                            </span>
                            <ChevronDown size={14} style={{ transition: 'transform 0.3s', transform: showStatusSelect ? 'rotate(180deg)' : 'none', color: 'var(--text-dim)' }} />
                        </div>

                        {showStatusSelect && (
                            <div className="pipeline_dropdown">
                                {[
                                    { value: '', label: 'Todas as Vagas' },
                                    { value: 'aberta', label: 'Vagas Abertas' },
                                    { value: 'pausada', label: 'Vagas Pausadas' },
                                    { value: 'fechada', label: 'Vagas Fechadas' },
                                    { value: 'cancelada', label: 'Vagas Canceladas' },
                                ].map(opt => (
                                    <div 
                                        key={opt.value} 
                                        className={`pipeline_option${pipelineStatusFilter === opt.value ? ' active' : ''}`}
                                        onClick={() => { 
                                            setPipelineStatusFilter(opt.value); 
                                            setShowStatusSelect(false);
                                            
                                            // Atualiza o pipeline selecionado para o primeiro que corresponde ao filtro
                                            const matchingPipelines = pipelines.map(p => {
                                                const v = availableVagas.find(v => v.id === p.vaga_id);
                                                return { ...p, status: v ? v.status : 'aberta' };
                                            }).filter(p => !opt.value || p.status === opt.value);
                                            
                                            if (matchingPipelines.length > 0) {
                                                setSelectedPipelineId(matchingPipelines[0].id);
                                            } else {
                                                setSelectedPipelineId(null);
                                            }
                                        }}
                                    >
                                        <span>{opt.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Dropdown 2: Select Pipeline Dropdown */}
                    <div style={{ position: 'relative', zIndex: 99 }} ref={selectRef}>
                        <div 
                            onClick={() => setShowSelect(!showSelect)}
                            style={{ 
                                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, 
                                padding: '10px 14px', color: 'var(--text-main)', fontSize: 13, 
                                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', 
                                minWidth: 200, justifyContent: 'space-between'
                            }}
                        >
                            <span style={{ fontWeight: 600 }}>
                                {(() => {
                                    const p = pipelines.find(p => p.id === selectedPipelineId);
                                    if (!p) return 'Selecionar Processo';
                                    const v = availableVagas.find(v => v.id === p.vaga_id);
                                    const statusLabel = v ? `(${v.status})` : '';
                                    return `${p.name} ${statusLabel}`;
                                })()}
                            </span>
                            <ChevronDown size={14} style={{ transition: 'transform 0.3s', transform: showSelect ? 'rotate(180deg)' : 'none', color: 'var(--text-dim)' }} />
                        </div>

                        {showSelect && (
                            <div className="pipeline_dropdown">
                                {pipelines
                                    .map(p => {
                                        const v = availableVagas.find(v => v.id === p.vaga_id);
                                        return { ...p, status: v ? v.status : 'aberta' };
                                    })
                                    .filter(p => !pipelineStatusFilter || p.status === pipelineStatusFilter)
                                    .map(p => (
                                    <div 
                                        key={p.id} 
                                        className={`pipeline_option${p.id === selectedPipelineId ? ' active' : ''}`}
                                        onClick={() => { setSelectedPipelineId(p.id); setShowSelect(false); }}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span>{p.name}</span>
                                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-main)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                                                {p.status}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deletePipeline(p.id); }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.5, cursor: 'pointer', padding: 4 }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {pipelines.filter(p => !pipelineStatusFilter || (availableVagas.find(v => v.id === p.vaga_id)?.status || 'aberta') === pipelineStatusFilter).length === 0 && (
                                    <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum processo neste status.</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Primary Button: Add Pipeline */}
                    <button 
                        onClick={() => setShowCreatePipeline(true)}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: 6, 
                            background: 'var(--primary)', border: 'none', 
                            borderRadius: 10, padding: '10px 18px', color: '#fff', 
                            fontSize: 13, fontWeight: 600, cursor: 'pointer' 
                        }}
                    >
                        <Plus style={{ width: 16, height: 16 }} /> Novo Processo
                    </button>
                </div>
            </div>

            {/* Tabs and Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                {/* Tabs à esquerda */}
                <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, gap: 4 }}>
                    <button className={`tab-btn${activeTab === 'board' ? ' active' : ''}`} onClick={() => setActiveTab('board')}>
                        <LayoutDashboard size={14} /> Board
                    </button>
                    <button className={`tab-btn${activeTab === 'lista' ? ' active' : ''}`} onClick={() => setActiveTab('lista')}>
                        <List size={14} /> Lista
                    </button>
                    <button className={`tab-btn${activeTab === 'metricas' ? ' active' : ''}`} onClick={() => setActiveTab('metricas')}>
                        <BarChart2 size={14} /> Métricas
                    </button>
                </div>

                {/* Ações da Aba (Nova Coluna e Filtros) à direita */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {activeTab === 'board' && selectedPipelineId && (
                        <button 
                            onClick={() => setAddColModal(true)} 
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: 6, 
                                background: 'transparent', border: '1px solid var(--border)', 
                                borderRadius: 10, padding: '8px 14px', color: 'var(--text-main)', 
                                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' 
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Plus size={14} /> Nova Coluna
                        </button>
                    )}
                </div>
            </div>

            {/* Board */}
            {activeTab === 'board' && (
                <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
                {columns.map(col => {
                    // Filtrar cards por coluna e por pipeline
                    let colCards = cards.filter(c => c.column_id === col.id);
                    colCards = colCards.sort((a, b) => a.position - b.position);
                    return (
                        <div
                            key={col.id}
                            className={`pipe-col${dragOverCol === col.id ? ' drag-over' : ''}${draggingCol?.id === col.id ? ' dragging' : ''}`}
                            onDragEnd={onDragEnd}
                            onDragOver={e => onDragOverCol(e, col.id)}
                            onDrop={e => onDrop(e, col.id)}
                        >
                            <ColHeader col={col} onUpdate={updateColumn} onDelete={deleteColumn} onDragStart={onDragStart} onDragEnd={onDragEnd} />

                            <div style={{ padding: '0 14px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ background: col.color + '22', color: col.color, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 9px' }}>{colCards.length} candidato{colCards.length !== 1 ? 's' : ''}</span>
                            </div>

                            <div style={{ height: 1, background: 'var(--border)', marginBottom: 10, flexShrink: 0 }} />

                            <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 60, overflowY: 'auto', paddingBottom: 10 }}>
                                {colCards.length === 0 && (
                                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                                        Arraste candidatos aqui
                                    </div>
                                )}
                                {colCards.map(card => (
                                    <div
                                        key={card.id}
                                        className={`pipe-card${draggingCard?.id === card.id ? ' dragging' : ''}${dragOverCardId === card.id ? ' drop-target' : ''}`}
                                        draggable
                                        onDragStart={e => onDragStart(e, 'card', card)}
                                        onDragEnd={onDragEnd}
                                        onDragOver={e => onDragOverCard(e, card.id)}
                                        onClick={() => openCandidate(card)}
                                        style={{ background: 'var(--bg-card)', opacity: 1, cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {/* Linha 1: avatar alinhado ao nome + X */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${col.color}, ${col.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                                    {initials(card.candidate_name)}
                                                </div>
                                                <p style={{ color: card.is_blacklisted ? '#ef4444' : 'var(--text-main)', fontWeight: 700, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{card.candidate_name}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                                    {card.is_blacklisted && <Ban size={13} color="#ef4444" />}
                                                    {hasPermission(profile.user_role, 'chat') && (card.candidate_conversations?.length ?? 0) > 0 && (
                                                        <div title="Chat Ativo">
                                                            <Phone size={13} color="#22c55e" fill="#22c55e22" />
                                                        </div>
                                                    )}
                                                    <button className="pipe-btn" onClick={(e) => { e.stopPropagation(); removeCard(card.id, card.candidate_id); }} title="Remover do pipeline" style={{ color: '#ef4444' }}>
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Linha 2: badge da vaga recuada para alinhar com o nome */}
                                            {(() => {
                                                const p = pipelines.find(pipe => pipe.id === card.pipeline_id);
                                                const vId = card.vaga_id || p?.vaga_id;
                                                return (card.display_job_name || (card.candidate_vagas && card.candidate_vagas.length > 0)) && (
                                                    <div style={{ paddingLeft: 44, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {getVagaStatusBadge(vId)}
                                                        <span style={{ 
                                                            fontSize: 9, 
                                                            fontWeight: 800, 
                                                            padding: '3px 8px', 
                                                            borderRadius: 12, 
                                                            background: 'rgba(99,102,241,0.1)', 
                                                            border: '1px solid rgba(99,102,241,0.2)', 
                                                            color: 'var(--primary)', 
                                                            whiteSpace: 'nowrap', 
                                                            overflow: 'hidden', 
                                                            textOverflow: 'ellipsis', 
                                                            maxWidth: 'calc(100% - 20px)'
                                                        }}>
                                                            {(card.display_job_name || card.candidate_vagas[0]).toUpperCase()}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {card.display_job_score != null ? (
                                                    <span style={{ color: scoreColor(card.display_job_score), fontSize: 12, fontWeight: 800, marginTop: 4, display: 'block' }}>
                                                        {card.display_job_score}% match
                                                    </span>
                                                ) : card.candidate_score != null ? (
                                                    <span style={{ color: scoreColor(card.candidate_score), fontSize: 12, fontWeight: 800, marginTop: 4, display: 'block' }}>
                                                        {card.candidate_score}% match
                                                    </span>
                                                ) : <span />}
                                            </div>
                                            <div style={{ display: 'flex', gap: 2 }}>
                                                <GripVertical size={13} style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                        </div>

                                        <MoveCardDropdown card={card} columns={columns} onMove={moveCard} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {!selectedPipelineId && !fetchingPipelines && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '100px 0', background: 'rgba(99,102,241,0.02)', borderRadius: 24, border: '1px dashed rgba(99,102,241,0.2)' }}>
                        <div style={{ 
                            width: 100, height: 100, borderRadius: '50%', 
                            background: 'rgba(99,102,241,0.1)', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
                            boxShadow: '0 0 30px rgba(99,102,241,0.1)'
                        }}>
                            <Plus size={48} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: 24, color: 'var(--text-main)', margin: '0 0 12px', fontWeight: 800 }}>Nenhum processo seletivo</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: 15, maxWidth: 340, margin: 0, lineHeight: 1.6 }}>
                                Crie seu primeiro pipeline para começar a organizar seus candidatos por vaga ou departamento.
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowCreatePipeline(true)}
                            style={{ 
                                background: 'var(--primary)', border: 'none', borderRadius: 16, 
                                padding: '16px 36px', color: '#fff', fontSize: 16, fontWeight: 700, 
                                cursor: 'pointer', boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(99,102,241,0.5)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.4)'; }}
                        >
                            Criar meu primeiro Pipeline
                        </button>
                    </div>
                )}
                
                {selectedPipelineId && columns.length === 0 && !loading && (
                    <div style={{ minWidth: 280, border: '2px dashed var(--border)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--text-dim)', fontSize: 14 }}>
                        Clique em "Nova Coluna" para começar
                    </div>
                )}
            </div>
            )}

            {/* List Tab */}
            {activeTab === 'lista' && (
                <div style={{ paddingBottom: 20 }}>
                    <div style={{ width: '100%', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Candidato</div>
                            <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Compatibilidade</div>
                            <div style={{ color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status do Pipeline</div>
                        </div>
                        {columns.length === 0 && (
                            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
                                Nenhum candidato encontrado neste pipeline.
                            </div>
                        )}
                        {columns.map(col => {
                            const colCards = cards.filter(c => c.column_id === col.id).sort((a, b) => a.position - b.position);
                            return colCards.map((card) => {
                                const isBlacklisted = card.is_blacklisted;
                                const score = card.display_job_score ?? card.candidate_score;
                                const scoreCol = scoreColor(score);
                                return (
                                    <div key={card.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', padding: '16px 24px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s', alignItems: 'center' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--row-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => openCandidate(card)}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                                                <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 12, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--primary)' }}>
                                                    {(card.display_job_name ?? card.candidate_vagas[0] ?? 'CANDIDATO').toUpperCase()}
                                                </span>
                                                <span style={{ color: isBlacklisted ? '#ef4444' : 'var(--text-main)', fontWeight: 700, fontSize: 15 }}>
                                                    {card.candidate_name}
                                                </span>
                                                {isBlacklisted && <Ban size={14} color="#ef4444" />}
                                            </div>
                                            <div style={{ color: 'var(--text-dim)', fontSize: 13, paddingLeft: 2 }}>
                                                Clique para ver detalhes do perfil
                                            </div>
                                        </div>
                                        <div>
                                            {score != null ? (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: scoreCol + '1a', color: scoreCol, fontSize: 12, fontWeight: 700 }}>
                                                    <Flag size={12} /> {score}% match
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>-</span>
                                            )}
                                        </div>
                                        <div>
                                            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, border: `1px solid ${col.color}40`, background: col.color + '1a', color: col.color, fontSize: 12, fontWeight: 700 }}>
                                                {col.name}
                                            </span>
                                        </div>
                                    </div>
                                );
                            });
                        })}
                    </div>
                </div>
            )}

            {/* Metrics Tab */}
            {activeTab === 'metricas' && (
                <div style={{ paddingBottom: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                        {/* Card 1: Total */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Total de Candidatos</div>
                            <div style={{ color: 'var(--text-main)', fontSize: 28, fontWeight: 800 }}>
                                {cards.length}
                            </div>
                            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 8 }}>Em todas as etapas do processo</div>
                            <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                                <Calendar size={18} />
                            </div>
                        </div>
                        
                        {/* Card 2: Em Andamento (Triagem, Entrevista, Proposta) */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Candidatos Ativos</div>
                            <div style={{ color: 'var(--text-main)', fontSize: 28, fontWeight: 800 }}>
                                {cards.filter(c => {
                                    const col = columns.find(col => col.id === c.column_id);
                                    return col && !col.name.toLowerCase().includes('reprovado') && !col.name.toLowerCase().includes('aprovado');
                                }).length}
                            </div>
                            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 8 }}>Em avaliação ativa</div>
                            <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                                <Target size={18} />
                            </div>
                        </div>

                        {/* Card 3: Aprovados */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Aprovados</div>
                            <div style={{ color: 'var(--text-main)', fontSize: 28, fontWeight: 800 }}>
                                {cards.filter(c => {
                                    const col = columns.find(col => col.id === c.column_id);
                                    return col && col.name.toLowerCase().includes('aprovado');
                                }).length}
                            </div>
                            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 8 }}>Aguardando contratação</div>
                            <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                                <ClipboardList size={18} />
                            </div>
                        </div>

                        {/* Card 4: Reprovados/Descartados */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Descartados</div>
                            <div style={{ color: 'var(--text-main)', fontSize: 28, fontWeight: 800 }}>
                                {cards.filter(c => {
                                    const col = columns.find(col => col.id === c.column_id);
                                    return col && col.name.toLowerCase().includes('reprovado');
                                }).length}
                            </div>
                            <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 8 }}>Historico finalizado</div>
                            <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                                <AlertCircle size={18} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Column Modal */}
            {addColModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div onClick={() => setAddColModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                    <div style={{ position: 'relative', zIndex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: 340, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <p style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 16 }}>Nova Coluna</p>
                            <button className="pipe-btn" onClick={() => setAddColModal(false)}><X size={16} /></button>
                        </div>
                        <input
                            autoFocus
                            placeholder="Nome da coluna…"
                            value={newColName}
                            onChange={e => setNewColName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') createColumn(); }}
                            style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-main)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 16 }}
                        />
                        <p style={{ color: 'var(--text-dim)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Cor</p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                            {COLUMN_COLORS.map(c => (
                                <div key={c} onClick={() => setNewColColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: newColColor === c ? '3px solid #fff' : '3px solid transparent', boxSizing: 'border-box', boxShadow: newColColor === c ? `0 0 0 2px ${c}` : 'none' }} />
                            ))}
                        </div>
                        <button
                            onClick={createColumn}
                            disabled={!newColName.trim()}
                            style={{ width: '100%', background: newColName.trim() ? 'var(--primary)' : 'var(--bg-main)', border: 'none', borderRadius: 12, padding: '12px 0', color: newColName.trim() ? '#fff' : 'var(--text-muted)', fontSize: 14, fontWeight: 700, cursor: newColName.trim() ? 'pointer' : 'not-allowed' }}
                        >
                            Criar Coluna
                        </button>
                    </div>
                </div>
            )}

            {/* Modal: Create Pipeline */}
            {showCreatePipeline && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div onClick={() => !loading && setShowCreatePipeline(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                    <div style={{ position: 'relative', zIndex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, width: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ fontSize: 20, color: 'var(--text-main)', margin: '0 0 20px', fontWeight: 700 }}>Novo Processo Seletivo</h3>
                        <p style={{ color: 'var(--text-dim)', fontSize: 14, margin: '0 0 24px' }}>Dê um nome para este pipeline (ex: Design, Front-end, etc.)</p>
                        <input 
                            autoFocus
                            placeholder="Nome do processo…"
                            value={newPipeName}
                            onChange={e => setNewPipeName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') createPipeline(); }}
                            style={{ 
                                width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', 
                                borderRadius: 12, padding: '12px 16px', color: 'var(--text-main)', 
                                fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 24
                            }}
                        />
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button 
                                onClick={() => setShowCreatePipeline(false)}
                                style={{ 
                                    flex: 1, background: 'transparent', border: '1px solid var(--border)', 
                                    borderRadius: 12, padding: '12px 0', color: 'var(--text-dim)', 
                                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.color = '#ef4444';
                                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
                                    e.currentTarget.style.background = 'rgba(239,68,68,0.05)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.color = 'var(--text-dim)';
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={createPipeline}
                                disabled={!newPipeName.trim() || loading}
                                style={{ flex: 2, background: 'var(--primary)', border: 'none', borderRadius: 12, padding: '12px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (newPipeName.trim() && !loading) ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                                {loading && <div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
                                {loading ? 'Criando...' : 'Criar Pipeline'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Candidate Modal */}
            {addCandModal && (
                <AddCandidateModal
                    columnId={addCandModal}
                    eligibles={eligiblesForModal}
                    onAdd={addCard}
                    onClose={() => setAddCandModal(null)}
                />
            )}

            {/* Custom Drag Ghost: 100% Opaque rendering */}
            {draggingCard && (
                <div
                    className="pipe-card custom-ghost"
                    style={{
                        transform: `translate(${dragPos.x - 20}px, ${dragPos.y - 20}px) rotate(2deg)`,
                        width: 250,
                        position: 'fixed'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                            {initials(draggingCard.candidate_name)}
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>{draggingCard.candidate_name}</p>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>
                                {draggingCard.display_job_name || draggingCard.candidate_vagas[0]}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Candidate Detail Panel */}
            {selectedCandidate && (
                <CandidatePanel
                    key={selectedCandidate.id + (selectedCandidate.enriched ? '-full' : '-base')}
                    c={selectedCandidate as any}
                    onClose={() => setSelectedCandidate(null)}
                    navigate={navigate}
                    onNotesChange={handleNotesChange}
                    onEligibleChange={handleEligibleChange}
                    onRemoveCard={removeCard}
                    onFieldChange={handleFieldChange}
                    onBlacklistChange={(id: string, val: boolean) => {
                        setCards(prev => prev.map(c => (c.candidate_id === id ? { ...c, is_blacklisted: val } : c)));
                        setSelectedCandidate(prev => (prev && prev.id === id ? { ...prev, is_blacklisted: val } : prev));
                    }}
                />
            )}
        </>
    );
};

// ─── Move Card Dropdown ────────────────────────────────────────────────────────
function MoveCardDropdown({ card, columns, onMove }: {
    card: PipelineCard;
    columns: PipelineColumn[];
    onMove: (card: PipelineCard, colId: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);
    const others = columns.filter(c => c.id !== card.column_id);
    if (others.length === 0) return null;

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!open && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setPos({ top: r.top - 8 - (others.length * 36 + 12), left: r.left, width: r.width });
        }
        setOpen(o => !o);
    };

    return (
        <div style={{ position: 'relative', marginTop: 8 }}>
            <button
                ref={btnRef}
                onClick={toggle}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}
            >
                Mover para <ChevronDown size={11} />
            </button>
            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={e => { e.stopPropagation(); setOpen(false); }} />
                    <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 6, zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {others.map(col => (
                            <button key={col.id} onClick={e => { e.stopPropagation(); onMove(card, col.id); setOpen(false); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', borderRadius: 7, padding: '7px 10px', cursor: 'pointer', color: 'var(--text-main)', fontSize: 12, fontWeight: 500, textAlign: 'left', transition: 'background 0.1s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                                {col.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

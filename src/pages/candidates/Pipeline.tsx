import { useEffect, useRef, useState } from 'react';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, X, Edit2, Check, Trash2, ChevronDown, ChevronRight, ChevronsUp, ChevronsDown, ArrowUp, ArrowDown, Ban, LayoutDashboard, List, BarChart2, Flag, Calendar, Target, ClipboardList, AlertCircle, Phone, Kanban, MoreHorizontal, MoreVertical, Eye, Link as LinkIcon, Unlink } from 'lucide-react';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { useTheme } from '../../core/contexts/ThemeContext';
import { logScreening, logActivity } from '../../core/services/logger';
import { CandidatePanel } from '../../features/analysis/CandidatePanel';
import { hasPermission } from '../../core/config/permissions';
import { type CandidateDetail, type Application } from '../../features/analysis/CandidatePanelUtils';
import { toStr, initials, scoreColor } from '../../core/utils/format';
import toast from 'react-hot-toast';

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
    candidate_conversations?: unknown[];
    vaga_id?: string | null;
}

interface CandidateQueryRow {
    id: string;
    name: string;
    score: number | null;
    is_blacklisted?: boolean;
    phone?: string | null;
    conversations?: unknown[];
    vagas_candidaturas?: { vagas_white_label?: { title?: string } }[];
}

interface PipeQueryRow {
    id: string;
    notes?: string | null;
    pipelines?: { name?: string }[] | null;
}

interface RawCardRow {
    id: string;
    column_id: string;
    candidate_id: string;
    position: number;
    notes: string | null;
    candidates: {
        name: string | null;
        score: number | null;
        is_blacklisted: boolean;
        phone: string | null;
        conversations: unknown[];
        vagas_candidaturas: Array<{
            vagas_white_label: { title: string } | null;
        }>;
    } | null;
}

interface EligibleCandidate {
    id: string;
    name: string;
    score: number | null;
    vagas: string[];
    already_in_pipeline: boolean;
    is_blacklisted?: boolean;
    phone?: string | null;
    conversations?: unknown[];
}



interface HistoryItem {
    job_id: string;
    job_name?: string;
    score?: number;
    analyzed_at?: string;
    skills?: string;
    habilidades?: string;
    experience?: string;
    experiencia?: string;
    summary?: string;
    strengths?: string;
    positivePoints?: string;
    pontos_positivos?: string;
    positive_points?: string;
    education?: string;
    formacao?: string;
    redFlags?: string;
    attention_points?: string;
    gaps?: string;
    analysis?: Record<string, unknown>;
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

// ─── CSS ──────────────────────────────────────────────────────────────────────
const getCss = (bgTheme: string) => `
@keyframes pipelineFadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
.pipe-col { display:flex; flex-direction:column; min-width:280px; max-width:280px; max-height:calc(100vh - 260px); border-radius:16px; padding:0; background:${bgTheme === 'frequence' ? '#060d08' : 'var(--bg-main)'}; border:${bgTheme === 'frequence' ? '1px solid rgba(34,197,94,0.12)' : '1px solid var(--border)'}; transition:border-color 0.2s; }
.pipe-col.drag-over { border-color:var(--primary); background:${bgTheme === 'frequence' ? 'rgba(34,197,94,0.06)' : 'rgba(99,102,241,0.04)'}; }
.pipe-col.dragging { opacity:0.1; }
.pipe-card { background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px 24px; cursor:grab; user-select:none; position:relative; }
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
function ColHeader({ col, onUpdate, onDelete, colHeaderRef, isColHeaderConvidado }: {
    col: PipelineColumn;
    onUpdate: (id: string, name: string, color: string) => void;
    onDelete: (id: string) => void;
    colHeaderRef?: React.RefObject<Map<string, HTMLElement>>;
    isColHeaderConvidado?: boolean;
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
            ref={el => { if (el && colHeaderRef) colHeaderRef.current.set(col.id, el); }}
            style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'grab' }}
        >
            <div className="pipe-col-header-dot" style={{ background: col.color }} />
            <span style={{ flex: 1, color: 'var(--text-main)', fontWeight: 700, fontSize: 13 }}>{col.name}</span>
            {!isColHeaderConvidado && <button className="pipe-btn" onClick={() => setEditing(true)} title="Editar coluna"><Edit2 size={13} /></button>}
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
                            className={`candidate-option${c.already_in_pipeline || c.is_blacklisted ? ' disabled' : ''}`}
                            onClick={() => !c.already_in_pipeline && !c.is_blacklisted && onAdd(columnId, c)}
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
                            {!c.already_in_pipeline && c.is_blacklisted && <span style={{ color: '#ef4444', fontSize: 10, flexShrink: 0 }}>restringido (blacklist)</span>}
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
    const { bgTheme } = useTheme();
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
    const [selectedVagaId, setSelectedVagaId] = useState<string>('');
    const [vagasWithoutPipeline, setVagasWithoutPipeline] = useState<{ id: string; title: string; job_code?: string }[]>([]);
    const [showVagaSelectCreate, setShowVagaSelectCreate] = useState(false);
    const [vagaSearchCreate, setVagaSearchCreate] = useState('');
    const [addColModal, setAddColModal] = useState(false);
    const [newColName, setNewColName] = useState('');
    const [newColColor, setNewColColor] = useState(COLUMN_COLORS[0]);
    const [addCandModal, setAddCandModal] = useState<string | null>(null);
    const [activeCardId, setActiveCardId] = useState<string | null>(null);
    const [, setActiveColumnId] = useState<string | null>(null);
    const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

    const [showSelect, setShowSelect] = useState(false);
    const [linkVagaSelectOpen, setLinkVagaSelectOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
    const columnRefs = useRef<Map<string, HTMLElement>>(new Map());
    const colHeaderRefs = useRef<Map<string, HTMLElement>>(new Map());

    const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetail | null>(null);
    
    const [vagaSearch, setVagaSearch] = useState('');

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const check = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
        check(mq);
        mq.addEventListener('change', check);
        return () => mq.removeEventListener('change', check);
    }, []);

    const [expandedCols, setExpandedCols] = useState<Set<string>>(new Set());

    // Filtro de Status para os pipelines
    const [availableVagas, setAvailableVagas] = useState<Array<{ id: string; title: string; status: string; job_code?: string; pipeline_id?: string | null; is_active?: boolean }>>([]);
    const isConvidado = profile.user_role === 'convidado';
    const [pipelineStatusFilter, setPipelineStatusFilter] = useState<string>(''); // '' = Todas
    const [linkVagaPipeline, setLinkVagaPipeline] = useState<Pipeline | null>(null);
    const [linkVagaVagaId, setLinkVagaVagaId] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    
    const [showStatusSelect, setShowStatusSelect] = useState(false);
    const statusSelectRef = useRef<HTMLDivElement>(null);
    const [cardMenuOpen, setCardMenuOpen] = useState<string | null>(null);
    const [cardSubmenu, setCardSubmenu] = useState<string | null>(null);
    const [cardMenuPos, setCardMenuPos] = useState<{ top: number; left: number } | null>(null);

    const [mobileSheet, setMobileSheet] = useState<{ type: 'card'; card: PipelineCard; col: PipelineColumn } | { type: 'col'; col: PipelineColumn } | null>(null);

    const initRef = useRef<(userId: string) => Promise<void> | null>(null);

    useEffect(() => {
        if (!profile.loaded || !profile.userId) return;
        initRef.current = init;
        initRef.current?.(profile.userId)?.catch(err => {
            console.error('[Pipeline] init error:', err);
            setFetchingPipelines(false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile.userId, profile.loaded]);

    const cardMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
                setShowSelect(false);
            }
            if (statusSelectRef.current && !statusSelectRef.current.contains(e.target as Node)) {
                setShowStatusSelect(false);
            }
            if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
                if (cardMenuOpen) {
                    e.preventDefault();
                    e.stopPropagation();
                    setCardMenuOpen(null);
                    setCardSubmenu(null);
                    setCardMenuPos(null);
                    const once = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); };
                    document.addEventListener('click', once, { once: true });
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [cardMenuOpen]);

    const loadPipelineDataRef = useRef<((userId: string, pipelineId: string) => Promise<void>) | null>(null);

    useEffect(() => {
        setCards([]);
        setColumns([]);
        if (selectedPipelineId && profile.userId) {
            loadPipelineDataRef.current = loadPipelineData;
            loadPipelineDataRef.current?.(profile.userId, selectedPipelineId)?.catch(err => {
                console.error('[Pipeline] loadPipelineData error:', err);
                setLoading(false);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPipelineId, profile.userId]);

    // ─── Drag-and-Drop with @atlaskit ─────────────────────────────────────────
    useEffect(() => {
        if (isConvidado || isMobile) return;
        const cleanupFunctions: Array<() => void> = [];

        cards.forEach(card => {
            const element = cardRefs.current.get(card.id);
            if (!element) return;

            const cleanup = draggable({
                element,
                getInitialData: () => ({
                    type: 'card',
                    cardId: card.id,
                    columnId: card.column_id
                }),
                onDragStart: ({ source }) => {
                    setActiveCardId(source.data.cardId as string);
                },
                onDrop: ({ location, source }) => {
                    setActiveCardId(null);
                    setDragOverColumnId(null);

                    const destination = location.current.dropTargets[0];
                    if (!destination) return;

                    const targetColumnId = destination.data.columnId as string;
                    const cardId = source.data.cardId as string;
                    const card = cards.find(c => c.id === cardId);
                    if (!card) return;

                    // Calculate position based on card dropped over
                    const dropTargets = location.current.dropTargets;
                    let targetIndex = 0;

                    if (dropTargets.length > 1) {
                        const overCardId = dropTargets[1].data.cardId as string;
                        const columnCards = cards
                            .filter(c => c.column_id === targetColumnId)
                            .sort((a, b) => a.position - b.position);
                        const overIndex = columnCards.findIndex(c => c.id === overCardId);
                        targetIndex = overIndex >= 0 ? overIndex : columnCards.length;
                    }

                    // Same column reorder
                    if (card.column_id === targetColumnId) {
                        const columnCards = cards
                            .filter(c => c.column_id === targetColumnId && c.id !== cardId)
                            .sort((a, b) => a.position - b.position);
                        columnCards.splice(targetIndex, 0, card);
                        const updates = columnCards.map((c, idx) => ({
                            id: c.id,
                            position: idx
                        }));
                        setCards(prev => prev.map(c => {
                            if (c.id === cardId) return { ...c, position: targetIndex };
                            const idx = updates.findIndex(u => u.id === c.id);
                            if (idx >= 0) return { ...c, position: updates[idx].position };
                            return c;
                        }));
                        (async () => {
                            for (const update of updates) {
                                await supabase.from('pipeline_cards').update({ position: update.position }).eq('id', update.id);
                            }
                        })();
                    } else {
                        // Cross-column move
                        const sourceCol = columns.find(cl => cl.id === card.column_id);
                        const targetCol = columns.find(cl => cl.id === targetColumnId);
                        const otherCards = cards.filter(c => c.id !== cardId);
                        const targetColOtherCards = otherCards.filter(c => c.column_id === targetColumnId).sort((a, b) => a.position - b.position);
                        targetColOtherCards.splice(targetIndex, 0, { ...card, column_id: targetColumnId });
                        const updatedCards = [
                            ...otherCards.filter(c => c.column_id !== targetColumnId),
                            ...targetColOtherCards.map((c, i) => ({ ...c, position: i }))
                        ];
                        setCards(updatedCards);
                        supabase.from('pipeline_cards').update({ column_id: targetColumnId, position: targetIndex }).eq('id', cardId).then(() => {
                            for (let i = 0; i < targetColOtherCards.length; i++) {
                                if (targetColOtherCards[i].position !== i) {
                                    supabase.from('pipeline_cards').update({ position: i }).eq('id', targetColOtherCards[i].id);
                                }
                            }
                        });
                        if (profile.userId) {
                            const pipe = pipelines.find(p => p.id === (card.pipeline_id || selectedPipelineId));
                            const pipeSuffix = pipe ? ` - ${pipe.name}` : '';
                            logScreening(profile.userId, card.candidate_id, 'move', `${sourceCol?.name || ''}${pipeSuffix}`, `${targetCol?.name || ''}${pipeSuffix}`, { card_id: card.id, job_id: card.job_id, job_name: card.display_job_name, pipeline_id: pipe?.id, pipeline_name: pipe?.name });
                            logActivity(profile.userId, `Moveu "${card.candidate_name}" para "${targetCol?.name || 'Etapa'}" no processo "${pipe?.name || 'Pipeline'}"`);
                        }
                    }
                }
            });

            cleanupFunctions.push(cleanup);
        });

        return () => cleanupFunctions.forEach(fn => fn());
    }, [cards, columns, isConvidado, isMobile, profile, pipelines, selectedPipelineId]);

    useEffect(() => {
        if (isConvidado || isMobile) return;
        const cleanupFunctions: Array<() => void> = [];

        columns.forEach(column => {
            const element = columnRefs.current.get(column.id);
            if (!element) return;

            const cleanup = dropTargetForElements({
                element,
                canDrop: ({ source }) => source.data.type === 'card' || source.data.type === 'col',
                getData: () => ({ columnId: column.id })
            });

            cleanupFunctions.push(cleanup);
        });

        return () => cleanupFunctions.forEach(fn => fn());
    }, [columns, isConvidado, isMobile]);

    useEffect(() => {
        if (isConvidado || isMobile) return;
        const cleanupFunctions: Array<() => void> = [];

        columns.forEach(col => {
            const headerEl = colHeaderRefs.current.get(col.id);
            if (!headerEl) return;

            const cleanup = draggable({
                element: headerEl,
                getInitialData: () => ({
                    type: 'col',
                    columnId: col.id
                }),
                onDragStart: ({ source }) => {
                    setActiveColumnId(source.data.columnId as string);
                },
                onDrop: ({ location, source }) => {
                    setActiveColumnId(null);

                    const destination = location.current.dropTargets[0];
                    if (!destination) return;

                    const targetColumnId = destination.data.columnId as string;
                    const sourceColumnId = source.data.columnId as string;

                    if (sourceColumnId === targetColumnId) return;

                    const sourceIdx = columns.findIndex(c => c.id === sourceColumnId);
                    const targetIdx = columns.findIndex(c => c.id === targetColumnId);

                    if (sourceIdx === -1 || targetIdx === -1) return;

                    const newCols = [...columns];
                    const [moved] = newCols.splice(sourceIdx, 1);
                    newCols.splice(targetIdx, 0, moved);

                    const updatedCols = newCols.map((c, i) => ({ ...c, position: i }));
                    setColumns(updatedCols);

                    (async () => {
                        for (const c of updatedCols) {
                            await supabase.from('pipeline_columns').update({ position: c.position }).eq('id', c.id);
                        }
                    })();
                }
            });

            cleanupFunctions.push(cleanup);
        });

        return () => cleanupFunctions.forEach(fn => fn());
    }, [columns, isConvidado, isMobile]);
    
    // Helper function para status da vaga
    const getVagaStatusBadge = (vagaId?: string | null) => {
        if (!vagaId) return null;
        const vaga = availableVagas.find(v => v.id === vagaId);
        if (!vaga) return null;
        
        const statusConfig: Record<string, { color: string; emoji: string; label: string }> = {
            'aberta': { color: '#22c55e', emoji: '', label: 'Aberta' },
            'pausada': { color: '#f59e0b', emoji: '', label: 'Pausada' },
            'fechada': { color: '#ef4444', emoji: '', label: 'Fechada' },
            'cancelada': { color: '#64748b', emoji: '', label: 'Cancelada' },
            'invisivel': { color: '#6366f1', emoji: '', label: 'Invisível' }
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
                justifyContent: 'flex-start'
            }} title={`Vaga ${config.label}`}>
                {config.emoji}
            </span>
        );
    };

    async function init(userId: string) {
        setFetchingPipelines(true);
        try {
            let query = supabase.from('pipelines')
                .select('id, name, user_id, vaga_id, is_active')
                .eq('is_active', true)
                .order('name');

            if (isConvidado) {
                const { data: acesso } = await supabase
                    .from('convidado_vaga_access')
                    .select('vaga_id')
                    .eq('convidado_user_id', userId);
                const vagaIds = (acesso || []).map(a => a.vaga_id);
                if (vagaIds.length === 0) {
                    setPipelines([]);
                    setFetchingPipelines(false);
                    return;
                }
                query = query.in('vaga_id', vagaIds);
            } else if (profile.organization_id) {
                if (profile.user_role === 'rh') {
                    query = query.eq('user_id', userId);
                } else {
                    query = query.or(`organization_id.eq.${profile.organization_id},user_id.eq.${userId}`);
                }
            } else {
                query = query.eq('user_id', userId);
            }
            const { data: pipes } = await query;

            // Buscar vagas disponíveis para filtro PRIMEIRO
            await loadAvailableVagas();

            // DEPOIS reordenar pipelines por job_code
            const sorted = (pipes || []).sort((a, b) => {
                const va = availableVagas.find(v => v.id === a.vaga_id);
                const vb = availableVagas.find(v => v.id === b.vaga_id);
                const codeA = va?.job_code || '';
                const codeB = vb?.job_code || '';
                if (codeA && codeB) return codeA.localeCompare(codeB, undefined, { numeric: true });
                if (codeA) return -1;
                if (codeB) return 1;
                return (va?.title || a.name || '').localeCompare(vb?.title || b.name || '', undefined, { numeric: true });
            });

            setPipelines(sorted);
            if (sorted.length > 0) {
                const targetPipe = vagaIdParam ? sorted.find(p => p.vaga_id === vagaIdParam) : null;

                if (targetPipe) {
                    setSelectedPipelineId(targetPipe.id);
                } else {
                    setSelectedPipelineId(sorted[0].id);
                }
            }
        } catch (err) {
            console.error('Init error:', err);
        } finally {
            setFetchingPipelines(false);
        }
    }
    
    async function loadAvailableVagas() {
        try {
            let vagaQuery = supabase
                .from('vagas_white_label')
                .select('id, title, status, is_accepting_applications, job_code, pipeline_id, is_active')
                .order('job_code', { ascending: true, nullsFirst: false });

            if (isConvidado) {
                const { data: acesso } = await supabase
                    .from('convidado_vaga_access')
                    .select('vaga_id')
                    .eq('convidado_user_id', profile.userId);
                const vagaIds = (acesso || []).map(a => a.vaga_id);
                if (vagaIds.length === 0) {
                    setAvailableVagas([]);
                    return;
                }
                vagaQuery = vagaQuery.in('id', vagaIds);
            } else if (profile.user_role === 'rh') {
                vagaQuery = vagaQuery.eq('organization_id', profile.organization_id);
            }

            const { data: vagas } = await vagaQuery;
            
            if (vagas) {
                setAvailableVagas(vagas.map(v => ({
                    id: v.id,
                    title: v.title,
                    status: v.status,
                    job_code: v.job_code,
                    pipeline_id: v.pipeline_id,
                    is_active: v.is_active,
                })));
            }
        } catch (err) {
            console.error('Error loading vagas:', err);
        }
    }

    async function openCreatePipelineModal() {
        setNewPipeName('');
        setSelectedVagaId('');
        try {
            const { data: vagas } = await supabase
                .from('vagas_white_label')
                .select('id, title, job_code')
                .is('pipeline_id', null)
                .in('status', ['aberta', 'invisivel'])
                .order('title');
            setVagasWithoutPipeline(vagas || []);
        } catch {
            setVagasWithoutPipeline([]);
        }
        setShowCreatePipeline(true);
    }

    async function createPipeline() {
        if (!newPipeName.trim() || !profile.userId || loading) return;
        setLoading(true);
        try {
            if (selectedVagaId) {
                const { data: vaga } = await supabase
                    .from('vagas_white_label')
                    .select('pipeline_id')
                    .eq('id', selectedVagaId)
                    .single();
                if (vaga?.pipeline_id) {
                    toast.error('Esta vaga já está vinculada a outro pipeline');
                    setLoading(false);
                    return;
                }
            }
            const insertData: {
                name: string;
                user_id: string;
                organization_id?: string;
                vaga_id?: string;
            } = { 
                name: newPipeName.trim(), 
                user_id: profile.userId,
                organization_id: profile.organization_id || undefined
            };

            if (selectedVagaId) {
                insertData.vaga_id = selectedVagaId;
            }

            const { data: pipe, error } = await supabase.from('pipelines')
                .insert(insertData)
                .select().single();

            if (error) throw error;

            if (pipe) {
                if (selectedVagaId) {
                    await supabase
                        .from('vagas_white_label')
                        .update({ pipeline_id: pipe.id })
                        .eq('id', selectedVagaId);
                }

                const toInsert = DEFAULT_COLUMNS.map(c => ({
                    ...c,
                    user_id: profile.userId,
                    pipeline_id: pipe.id,
                    organization_id: profile.organization_id
                }));
                await supabase.from('pipeline_columns').insert(toInsert);

                await loadAvailableVagas();

                setPipelines(prev => [...prev, pipe].sort((a, b) => a.name.localeCompare(b.name)));
                setSelectedPipelineId(pipe.id);
                setNewPipeName('');
                setSelectedVagaId('');
                setShowCreatePipeline(false);
                logActivity(profile.userId, `Criou o processo "${pipe.name}"`);
            }
        } catch (err: unknown) {
            console.error('Create pipeline error:', err);
            alert('Erro ao criar pipeline: ' + (err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    async function handleLinkVaga() {
        if (!linkVagaPipeline || !linkVagaVagaId) return;
        setLoading(true);
        try {
            const { data: vagaCheck } = await supabase
                .from('vagas_white_label')
                .select('pipeline_id, title')
                .eq('id', linkVagaVagaId)
                .single();
            if (!vagaCheck) { setLoading(false); return; }
            if (vagaCheck.pipeline_id) {
                toast.error(`"${vagaCheck.title}" já está vinculada a outro pipeline`);
                setLoading(false);
                return;
            }

            await supabase.from('pipelines')
                .update({ vaga_id: linkVagaVagaId })
                .eq('id', linkVagaPipeline.id);

            await supabase.from('vagas_white_label')
                .update({ pipeline_id: linkVagaPipeline.id })
                .eq('id', linkVagaVagaId);

            await loadAvailableVagas();

            setPipelines(prev => prev.map(p =>
                p.id === linkVagaPipeline.id
                    ? { ...p, vaga_id: linkVagaVagaId }
                    : p
            ));

            toast.success('Pipeline vinculado à vaga');
        } catch (err) {
            console.error('Error linking pipeline:', err);
            toast.error('Erro ao vincular pipeline');
        } finally {
            setLoading(false);
            setLinkVagaPipeline(null);
            setLinkVagaVagaId('');
        }
    }

    async function handleUnlinkVaga(pipeId: string) {
        const pipe = pipelines.find(p => p.id === pipeId);
        if (!pipe || !pipe.vaga_id) return;
        setLoading(true);
        try {
            await supabase.from('pipelines')
                .update({ vaga_id: null })
                .eq('id', pipeId);

            await supabase.from('vagas_white_label')
                .update({ pipeline_id: null })
                .eq('id', pipe.vaga_id);

            await loadAvailableVagas();

            setPipelines(prev => prev.map(p =>
                p.id === pipeId
                    ? { ...p, vaga_id: null }
                    : p
            ));

            toast.success('Pipeline desvinculado da vaga');
        } catch (err) {
            console.error('Error unlinking pipeline:', err);
            toast.error('Erro ao desvincular pipeline');
        } finally {
            setLoading(false);
        }
    }

    async function loadPipelineData(userId: string, pipelineId: string) {
        setLoading(true);
        try {
            const { data: cols } = await supabase
                .from('pipeline_columns').select('id, name, color, position, pipeline_id').eq('pipeline_id', pipelineId).order('position');
            setColumns(cols || []);

            const { data: cardData } = await supabase
                .from('pipeline_cards')
                .select('id, column_id, candidate_id, position, notes, candidates(name, score, is_blacklisted, phone, conversations:candidate_conversations(candidate_id), vagas_candidaturas(vaga_id, vagas_white_label(title)))')
                .eq('pipeline_id', pipelineId)
                .order('position');

            const raw = (cardData ?? []) as unknown as RawCardRow[];
            const mapped: PipelineCard[] = raw.map((c) => {
                let displayJobName: string | undefined;
                let displayJobScore: number | undefined;
                let jobId: string | undefined;
                try {
                    const parsed: Record<string, unknown> = JSON.parse(c.notes || '');
                    if (parsed.selected_job_id) {
                        displayJobName = parsed.selected_job_name as string;
                        displayJobScore = parsed.selected_job_score as number;
                        jobId = parsed.selected_job_id as string;
                    }
                // eslint-disable-next-line no-empty
                } catch { }

                return {
                    id: c.id,
                    column_id: c.column_id,
                    candidate_id: c.candidate_id,
                    position: c.position,
                    notes: c.notes,
                    pipeline_id: pipelineId,
                    candidate_name: c.candidates?.name ?? 'Sem nome',
                    candidate_score: c.candidates?.score ?? null,
                    candidate_vagas: (c.candidates?.vagas_candidaturas ?? []).map((vc) => vc.vagas_white_label?.title).filter((s): s is string => !!s),
                    display_job_name: displayJobName,
                    display_job_score: displayJobScore,
                    job_id: jobId,
                };
            });
            setCards(mapped);
            if (!isConvidado) {
                await loadEligibles(userId, mapped);
            }
        } finally {
            setLoading(false);
        }
    }

    async function loadEligibles(userId: string, currentCards: PipelineCard[]) {
        const { data } = await supabase
            .from('candidates')
            .select('id, name, score, is_blacklisted, phone, conversations:candidate_conversations(candidate_id), vagas_candidaturas(vaga_id, vagas_white_label(title))')
            .eq('user_id', userId)
            .eq('interview_eligible', true)
            .order('name');

        const inPipeline = new Set(currentCards.map((c) => c.candidate_id));

        setEligibles(((data ?? []) as CandidateQueryRow[]).map((c) => ({
            id: c.id,
            name: c.name,
            score: c.score,
            vagas: (c.vagas_candidaturas ?? []).map((vc) => vc.vagas_white_label?.title).filter((s): s is string => !!s),
            already_in_pipeline: inPipeline.has(c.id),
            is_blacklisted: c.is_blacklisted,
            phone: c.phone,
            conversations: c.conversations,
        })));
    }

    // ─── Candidate Detail Logic ──────────────────────────────────────────────
    async function enrichCandidate(id: string, firstJob?: { jobId: string; jobName: string; score: number | null }, candidateVagas?: string[]): Promise<Partial<CandidateDetail>> {
        const [{ data: cand }, { data: jcData }, { data: pipeData }, { data: convData }] = await Promise.all([
            supabase.from('candidates').select('id, email, phone, location, address, linkedin, age, gender, portfolio, cep, address_number, complement, skills, experience, education, red_flags, notes, is_blacklisted, status, resume_url, analysis').eq('id', id).maybeSingle(),
            supabase.from('vagas_candidaturas').select('vaga_id').eq('candidate_id', id),
            supabase.from('pipeline_cards').select('id, notes, pipelines(name)').eq('candidate_id', id),
            supabase.from('candidate_conversations').select('id, candidate_id, user_id, message, role, created_at').eq('candidate_id', id).eq('user_id', profile.userId)
        ]);

        if (!cand) return { enriched: true };

        const analysis = cand.analysis ?? {};
        const validJobIds = new Set<string>();
        (jcData ?? []).forEach((jc: { vaga_id?: string }) => {
            if (jc.vaga_id) validJobIds.add(jc.vaga_id);
        });
        const rawHistory: HistoryItem[] = analysis?.history ?? [];
        const validHistory = rawHistory.filter((h) =>
            (h.job_id || (h as unknown as Record<string, string>).vaga_id) && validJobIds.has(h.job_id || (h as unknown as Record<string, string>).vaga_id)
        );

        const pipelineCards = (pipeData ?? []).map((pc: PipeQueryRow) => {
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

        const mappedHistory = validHistory.map((h) => ({
            jobId: h.job_id,
            jobName: h.job_name,
            score: h.score,
            appliedAt: h.analyzed_at,
            skills: toStr(h.skills ?? h.habilidades),
            experience: toStr(h.summary ?? h.experience ?? h.experiencia),
            positivePoints: toStr(h.strengths ?? h.positivePoints ?? h.pontos_positivos ?? h.positive_points),
            education: toStr(h.education ?? h.formacao),
            redFlags: toStr(h.gaps ?? h.redFlags ?? h.attention_points),
        })) as unknown as Application[];

        if (firstJob && firstJob.jobId) {
            const existingIndex = mappedHistory.findIndex(a => a.jobId === firstJob.jobId);
            if (existingIndex >= 0) {
                if (!mappedHistory[existingIndex].jobName && firstJob.jobName) {
                    mappedHistory[existingIndex] = { ...mappedHistory[existingIndex], jobName: firstJob.jobName };
                }
                if (!mappedHistory[existingIndex].score && firstJob.score) {
                    mappedHistory[existingIndex] = { ...mappedHistory[existingIndex], score: firstJob.score };
                }
            } else {
                mappedHistory.unshift({
                    jobId: firstJob.jobId,
                    jobName: firstJob.jobName || candidateVagas?.[0] || 'Vaga',
                    score: firstJob.score ?? 0,
                    appliedAt: '',
                    skills: null,
                    experience: null,
                    education: null,
                    redFlags: null,
                });
            }
        } else if (firstJob && !firstJob.jobId && firstJob.jobName) {
            mappedHistory.unshift({
                jobId: '',
                jobName: firstJob.jobName || candidateVagas?.[0] || 'Vaga',
                score: firstJob.score ?? 0,
                appliedAt: '',
                skills: null,
                experience: null,
                education: null,
                redFlags: null,
            });
        }

        return {
            email: toStr(cand.email) || '',
            phone: toStr(cand.phone) || null,
            location: toStr(cand.location) || null,
            address: toStr(cand.address) || null,
            linkedin: cand.linkedin || null,
            age: toStr(cand.age) || null,
            gender: toStr(cand.gender) || null,
            portfolio: cand.portfolio || null,
            cep: cand.cep || null,
            address_number: cand.address_number || null,
            complement: cand.complement || null,
            skills: toStr(analysis?.skills ?? analysis?.Skills ?? analysis?.habilidades ?? analysis?.Habilidades ?? cand.skills),
            experience: toStr(analysis?.experience ?? analysis?.Experience ?? analysis?.experiencia ?? analysis?.Experiencia ?? cand.experience),
            education: toStr(analysis?.education ?? analysis?.Education ?? analysis?.formacao ?? analysis?.Formacao ?? cand.education),
            redFlags: toStr(analysis?.redFlags ?? analysis?.['RedFlags(Pontos de atenção)'] ?? analysis?.['Pontos de atenção'] ?? analysis?.['pontos_de_atencao'] ?? cand.red_flags),
            notes: cand.notes || null,
            is_blacklisted: cand.is_blacklisted ?? false,
            analysis: cand.analysis ?? {},
            status: cand.status || null,
            applications: mappedHistory,
            pipelineCards,
            resume_url: cand.resume_url,
            enriched: true,
            conversations: convData || []
        };
    }

    async function openCandidate(card: PipelineCard) {
        if (isConvidado) return;
        const displayJobName = card.display_job_name || card.candidate_vagas[0] || '';
        const displayJobId = card.job_id || '';
        const displayScore = card.display_job_score ?? card.candidate_score ?? null;
        const base = {
            id: card.candidate_id,
            name: card.candidate_name,
            score: card.candidate_score,
            vagas: card.candidate_vagas,
            enriched: false,
            applications: [],
            hideBankButton: true
        } as unknown as CandidateDetail;
        setSelectedCandidate(base);
        try {
            const extra = await enrichCandidate(
                card.candidate_id,
                displayJobId ? { jobId: displayJobId, jobName: displayJobName, score: displayScore } : displayJobName ? { jobId: '', jobName: displayJobName, score: displayScore } : undefined,
                card.candidate_vagas
            );
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
                `${targetCol?.name || 'Triagem'} - ${targetPipe?.name || 'Pipeline'}`,
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


    function handleFieldChange(id: string, field: string, val: unknown) {
        const cardFieldMap: Record<string, string> = {
            name: 'candidate_name',
            phone: 'candidate_phone',
            conversations: 'candidate_conversations',
        };
        const cardField = cardFieldMap[field] || field;
        setCards(prev => prev.map(c => c.candidate_id === id ? { ...c, [cardField]: val } : c));
        setSelectedCandidate(prev => prev && prev.id === id ? { ...prev, [field]: val } : prev);
    }

    async function deletePipeline(id: string) {
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
        } catch (err: unknown) {
            console.error('Delete pipeline error:', err);
            alert('Erro ao excluir pipeline: ' + (err as Error).message);
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
            const pipe = pipelines.find(p => p.id === (card.pipeline_id || selectedPipelineId));
            const pipeSuffix = pipe ? ` - ${pipe.name}` : '';
            logScreening(
                profile.userId,
                card.candidate_id,
                'move',
                `${sourceCol?.name || ''}${pipeSuffix}`,
                `${targetCol?.name || ''}${pipeSuffix}`,
                { card_id: card.id, job_id: card.job_id, job_name: card.display_job_name, pipeline_id: pipe?.id, pipeline_name: pipe?.name }
            );
        }
    }

    async function reorderCard(card: PipelineCard, direction: 'top' | 'up' | 'down' | 'bottom') {
        const colCards = cards.filter(c => c.column_id === card.column_id && c.id !== card.id).sort((a, b) => a.position - b.position);
        
        if (colCards.length === 0) return;

        let newPosition: number;

        switch (direction) {
            case 'top':
                newPosition = 0;
                break;
            case 'up':
                newPosition = Math.max(0, card.position - 1);
                break;
            case 'down':
                newPosition = card.position + 1;
                break;
            case 'bottom':
                newPosition = colCards.length;
                break;
        }

        const { error } = await supabase
            .from('pipeline_cards')
            .update({ position: newPosition })
            .eq('id', card.id);

        if (!error) {
            setCards(prev => prev.map(c => {
                if (c.id === card.id) {
                    return { ...c, position: newPosition };
                }
                if (c.column_id === card.column_id) {
                    let pos = c.position;
                    if (direction === 'top' && c.position < card.position) {
                        pos = c.position + 1;
                    } else if (direction === 'bottom' && c.position > card.position) {
                        pos = c.position - 1;
                    } else if (direction === 'up' && c.position >= newPosition && c.position < card.position) {
                        pos = c.position + 1;
                    } else if (direction === 'down' && c.position > card.position && c.position <= newPosition) {
                        pos = c.position - 1;
                    }
                    return { ...c, position: pos };
                }
                return c;
            }));
        }
    }

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
            <style>{getCss(bgTheme)}</style>

            <div style={{ marginBottom: isMobile ? 12 : 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: isMobile ? 10 : 16 }}>
                    <Kanban size={isMobile ? 24 : 32} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 style={{ fontSize: isMobile ? '20px' : '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            Pipeline de Recrutamento
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '2px 0 0' }}>
                            {pipelines.length} processo{pipelines.length !== 1 ? 's' : ''} cadastrado{pipelines.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    {/* Primary Button: Add Pipeline */}
                    {!isConvidado && (
                    <button 
                        onClick={openCreatePipelineModal}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6, 
                            background: 'var(--primary)', border: 'none', 
                            borderRadius: isMobile ? 8 : 10, padding: isMobile ? '6px 10px' : '10px 18px', color: '#fff', 
                            fontSize: isMobile ? 11 : 13, fontWeight: 600, cursor: 'pointer',
                            whiteSpace: 'nowrap', flexShrink: 0
                        }}
                    >
                        <Plus style={{ width: isMobile ? 14 : 16, height: isMobile ? 14 : 16 }} />{isMobile ? '' : ' Novo Processo'}
                    </button>)}
                </div>

                {/* Controls row: dropdowns */}
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flexWrap: 'wrap' }}>
                    {/* Dropdown 1: Filtro de Status das Vagas */}
                    <div style={{ position: 'relative', zIndex: 100, flex: isMobile ? '1 1 0' : undefined, minWidth: 0 }} ref={statusSelectRef}>
                                <div 
                                    onClick={() => setShowStatusSelect(!showStatusSelect)}
                                    style={{ 
                                        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, 
                                        padding: '8px 14px', color: 'var(--text-main)', fontSize: 13, 
                                        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', 
                                        minWidth: 0, justifyContent: 'space-between', whiteSpace: 'nowrap',
                                        overflow: 'hidden'
                                    }}
                                >
                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                                {pipelineStatusFilter === '' && 'Vagas: Todas'}
                                {pipelineStatusFilter === 'aberta' && 'Vagas: Abertas'}
                                {pipelineStatusFilter === 'pausada' && 'Vagas: Pausadas'}
                                {pipelineStatusFilter === 'fechada' && 'Vagas: Fechadas'}
                                {pipelineStatusFilter === 'cancelada' && 'Vagas: Canceladas'}
                                {pipelineStatusFilter === 'invisivel' && 'Vagas: Invisíveis'}
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
                                    { value: 'invisivel', label: 'Vagas Invisíveis' },
                                ].map(opt => (
                                    <div 
                                        key={opt.value} 
                                        className={`pipeline_option${pipelineStatusFilter === opt.value ? ' active' : ''}`}
                                        onClick={() => { 
                                            setPipelineStatusFilter(opt.value); 
                                            setVagaSearch('');
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
                    <div style={{ position: 'relative', zIndex: 99, flex: isMobile ? '1 1 0' : undefined, minWidth: isMobile ? 0 : 400 }} ref={selectRef}>
                        <div
                            onClick={() => setShowSelect(!showSelect)}
                            style={{
                                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
                                padding: '8px 14px', color: 'var(--text-main)', fontSize: 13,
                                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                                justifyContent: 'space-between', whiteSpace: 'nowrap',
                                overflow: 'hidden', minWidth: 0
                            }}
                        >
                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                                {(() => {
                                    const p = pipelines.find(p => p.id === selectedPipelineId);
                                    if (!p) return 'Selecionar Processo';
                                    const v = availableVagas.find(v => v.id === p.vaga_id);
                                    const codeLabel = v?.job_code ? `${v.job_code}` : '';
                                    const titleLabel = v?.title ? ` (${v.title})` : '';
                                    return `${codeLabel}${titleLabel} - ${p.name}`;
                                })()}
                            </span>
                            <ChevronDown size={14} style={{ transition: 'transform 0.3s', transform: showSelect ? 'rotate(180deg)' : 'none', color: 'var(--text-dim)' }} />
                        </div>

                        {showSelect && (
                            <div className="pipeline_dropdown" style={isMobile ? { width: 'auto', minWidth: 280, maxWidth: '90vw', right: 0, left: 'auto' } : undefined}>
                                <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                                    <input
                                        autoFocus
                                        placeholder="Pesquisar por nome ou código..."
                                        value={vagaSearch}
                                        onChange={e => setVagaSearch(e.target.value)}
                                        style={{
                                            width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)',
                                            borderRadius: 6, padding: '10px 14px', color: 'var(--text-main)', fontSize: 14, outline: 'none', boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                {pipelines
                                    .map(p => {
                                        const v = availableVagas.find(v => v.id === p.vaga_id);
                                        return { ...p, status: v ? v.status : 'aberta', job_code: v?.job_code, vaga_title: v?.title || '' };
                                    })
                                    .filter(p =>
                                        (!pipelineStatusFilter || p.status === pipelineStatusFilter) &&
                                        (!vagaSearch ||
                                            p.name.toLowerCase().includes(vagaSearch.toLowerCase()) ||
                                            (p.job_code || '').toLowerCase().includes(vagaSearch.toLowerCase()) ||
                                            p.vaga_title.toLowerCase().includes(vagaSearch.toLowerCase())
                                        )
                                    )
                                    .map(p => (
                                    <div
                                        key={p.id}
                                        className={`pipeline_option${p.id === selectedPipelineId ? ' active' : ''}`}
                                        onClick={() => { setSelectedPipelineId(p.id); setShowSelect(false); }}
style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingRight: 28 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                                                <div className="cs-dot" style={{ background: 'var(--primary)', flexShrink: 0 }} />
                                                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                            </div>
                                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-main)', color: 'var(--text-dim)', textTransform: 'uppercase', flexShrink: 0 }}>
                                                {p.status}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 20 }}>
                                            {p.job_code && <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>{p.job_code}</span>}
                                            {p.vaga_title && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>| {p.vaga_title}</span>}
                                        </div>
                                        {!isConvidado && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(p.id); }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.5, cursor: 'pointer', padding: 4, position: 'absolute', right: 8, top: 8 }}
                                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
                                        >
                                            <Trash2 size={14} />
                                        </button>)}
                                    </div>
                                ))}
                                {pipelines
                                    .map(p => {
                                        const v = availableVagas.find(v => v.id === p.vaga_id);
                                        return { ...p, status: v ? v.status : 'aberta', job_code: v?.job_code, vaga_title: v?.title || '' };
                                    })
                                    .filter(p =>
                                        (!pipelineStatusFilter || p.status === pipelineStatusFilter) &&
                                        (!vagaSearch ||
                                            p.name.toLowerCase().includes(vagaSearch.toLowerCase()) ||
                                            (p.job_code || '').toLowerCase().includes(vagaSearch.toLowerCase()) ||
                                            p.vaga_title.toLowerCase().includes(vagaSearch.toLowerCase())
                                        )
                                    ).length === 0 && (
                                    <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>Nenhum processo encontrado.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs and Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 10 : 16 }}>
                {/* Tabs à esquerda */}
                <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, gap: 4, flexShrink: 0 }}>
                    <button className={`tab-btn${activeTab === 'board' ? ' active' : ''}`} onClick={() => setActiveTab('board')} style={{ padding: isMobile ? '6px 8px' : undefined }}>
                        <LayoutDashboard size={14} />{isMobile ? '' : ' Board'}
                    </button>
                    <button className={`tab-btn${activeTab === 'lista' ? ' active' : ''}`} onClick={() => setActiveTab('lista')} style={{ padding: isMobile ? '6px 8px' : undefined }}>
                        <List size={14} />{isMobile ? '' : ' Lista'}
                    </button>
                    <button className={`tab-btn${activeTab === 'metricas' ? ' active' : ''}`} onClick={() => setActiveTab('metricas')} style={{ padding: isMobile ? '6px 8px' : undefined }}>
                        <BarChart2 size={14} />{isMobile ? '' : ' Métricas'}
                    </button>
                </div>

                {/* Ações da Aba (Nova Coluna, Vincular Vaga, Filtros) à direita */}
                {/* Actions row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, flexShrink: 0, flexWrap: isMobile ? 'nowrap' : 'nowrap', justifyContent: isMobile ? 'flex-end' : 'flex-end', minWidth: 0 }}>
                    {!isConvidado && selectedPipelineId && !pipelines.find(p => p.id === selectedPipelineId)?.vaga_id && (
                        <button
                            onClick={() => { const p = pipelines.find(x => x.id === selectedPipelineId); if (p) { setLinkVagaPipeline(p); loadAvailableVagas(); } }}
                            title="Vincular a vaga"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'transparent', border: '1px solid var(--border)',
                                borderRadius: 10, padding: isMobile ? '10px 12px' : '8px 14px', color: '#2C58FD',
                                fontSize: isMobile ? 13 : 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(44,88,253,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            {isMobile ? <><LinkIcon size={14} /> Vincular</> : 'Vincular a vaga'}
                        </button>
                    )}
                    {!isConvidado && selectedPipelineId && pipelines.find(p => p.id === selectedPipelineId)?.vaga_id && (
                        <button
                            onClick={() => { const p = pipelines.find(x => x.id === selectedPipelineId); if (p) handleUnlinkVaga(p.id); }}
                            title="Desvincular vaga"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'transparent', border: '1px solid var(--border)',
                                borderRadius: 10, padding: isMobile ? '10px 12px' : '8px 14px', color: '#ef4444',
                                fontSize: isMobile ? 13 : 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            {isMobile ? <><Unlink size={14} /> Desvincular</> : 'Desvincular vaga'}
                        </button>
                    )}
                    {!isConvidado && activeTab === 'board' && selectedPipelineId && (
                        <button
                            onClick={() => setAddColModal(true)}
                            title="Nova Coluna"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'transparent', border: '1px solid var(--border)',
                                borderRadius: 10, padding: isMobile ? '10px 12px' : '8px 14px', color: 'var(--text-main)',
                                fontSize: isMobile ? 13 : 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <Plus size={isMobile ? 14 : 14} /> {isMobile ? 'Coluna' : 'Nova Coluna'}
                        </button>
                    )}
                </div>
            </div>

            {/* Board */}
            {activeTab === 'board' && (
                <div style={{ display: 'flex', gap: isMobile ? 0 : 14, overflowX: isMobile ? 'visible' : 'auto', paddingBottom: 16, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
                {columns.map(col => {
                    let colCards = cards.filter(c => c.column_id === col.id);
                    colCards = colCards.sort((a, b) => a.position - b.position);
                    const isOpen = expandedCols.has(col.id);
                    return isMobile ? (
                        <div key={col.id} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
                            <div onClick={() => { const next = new Set(expandedCols); if (isOpen) next.delete(col.id); else next.add(col.id); setExpandedCols(next); }}
                                 style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px', cursor: 'pointer', borderLeft: `3px solid ${col.color}` }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                                <span style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 15, flex: 1 }}>{col.name}</span>
                                <span style={{ background: col.color + '22', color: col.color, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 9px' }}>{colCards.length}</span>
                                {!isConvidado && (
                                    <button className="pipe-btn" onClick={(e) => { e.stopPropagation(); setMobileSheet({ type: 'col', col }); }}
                                        style={{ color: 'var(--text-dim)' }}>
                                        <MoreVertical size={14} />
                                    </button>
                                )}
                                <span style={{ color: 'var(--text-dim)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                                    <ChevronDown size={16} />
                                </span>
                            </div>
                            {isOpen && (
                                <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)' }}>
                                    {colCards.length === 0 && (
                                        <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Nenhum candidato</div>
                                    )}
                                    {colCards.map(card => (
                                        <div key={card.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${col.color}, ${col.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                                    {initials(card.candidate_name)}
                                                </div>
                                                <span style={{ color: card.is_blacklisted ? '#ef4444' : 'var(--text-main)', fontWeight: 700, fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => openCandidate(card)}>{card.candidate_name}</span>
                                                <button className="pipe-btn" onClick={(e) => { e.stopPropagation(); openCandidate(card); }} title="Ver detalhes" style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
                                                    <Eye size={13} />
                                                </button>
                                                {!isConvidado && (
                                                    <button className="pipe-btn" onClick={(e) => { e.stopPropagation(); setMobileSheet({ type: 'card', card, col }); }}
                                                        style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
                                                        <MoreVertical size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div
                            key={col.id}
                            ref={el => { if (el) columnRefs.current.set(col.id, el); }}
                            className={`pipe-col${dragOverColumnId === col.id ? ' drag-over' : ''}`}
                        >
                            <ColHeader col={col} onUpdate={updateColumn} onDelete={deleteColumn} colHeaderRef={colHeaderRefs} isColHeaderConvidado={profile.user_role === 'convidado'} />

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
                                        ref={el => { if (el) cardRefs.current.set(card.id, el); }}
                                        className={`pipe-card${activeCardId === card.id ? ' dragging' : ''}`}
                                        onClick={() => { if (activeCardId || cardMenuOpen) { setCardMenuOpen(null); setCardSubmenu(null); setCardMenuPos(null); } else { openCandidate(card); } }}
                                        style={{ background: 'var(--bg-card)', opacity: 1, cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {/* Linha 1: avatar alinhado ao nome + X */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${col.color}, ${col.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                                    {initials(card.candidate_name)}
                                                </div>
                                                <p style={{ color: card.is_blacklisted ? '#ef4444' : 'var(--text-main)', fontWeight: 700, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, maxWidth: 'calc(100% - 100px)' }}>{card.candidate_name}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, position: 'relative' }}>
                                                    {card.is_blacklisted && <Ban size={13} color="#ef4444" />}
                                                    {hasPermission(profile.user_role, 'chat') && (card.candidate_conversations?.length ?? 0) > 0 && (
                                                        <div title="Chat Ativo">
                                                            <Phone size={13} color="#22c55e" fill="#22c55e22" />
                                                        </div>
                                                    )}
                                                    {!isConvidado && (
                                                    <button className="pipe-btn" onClick={(e) => { e.stopPropagation(); openCandidate(card); }} title="Ver card completo" style={{ color: 'var(--text-dim)' }}>
                                                        <Eye size={13} />
                                                    </button>
                                                    )}
                                                    {!isConvidado && (
                                                    <button className="pipe-btn" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setCardMenuPos({ top: rect.bottom + 4, left: rect.right - 180 }); setCardMenuOpen(cardMenuOpen === card.id ? null : card.id); }} title="Opções" style={{ color: 'var(--text-dim)' }}>
                                                        <MoreHorizontal size={13} />
                                                    </button>
                                                    )}
                                                    {!isConvidado && cardMenuOpen === card.id && cardMenuPos && (
                                                        <div ref={cardMenuRef} style={{ position: 'fixed', top: cardMenuPos.top, left: cardMenuPos.left, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 180 }}>
                                                            <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontSize: 12, color: 'var(--text-main)', borderRadius: 6 }} onClick={(e) => { e.stopPropagation(); openCandidate(card); setCardMenuOpen(null); }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                                                                <Eye size={13} /> Ver card completo
                                                            </button>
                                                            {!isConvidado && (
                                                            <>
                                                            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                                                            <div style={{ position: 'relative' }}>
                                                                <button
                                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontSize: 12, color: 'var(--text-main)', borderRadius: 6 }}
                                                                    onClick={(e) => { e.stopPropagation(); setCardSubmenu(cardSubmenu === 'reorder' ? null : 'reorder'); }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                                                                >
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}><ArrowUp size={13} /> Reordenar</span>
                                                                    <ChevronRight size={13} style={{ flexShrink: 0 }} />
                                                                </button>
                                                                {cardSubmenu === 'reorder' && (
                                                                    <div style={{ position: 'absolute', left: '100%', top: 0, marginLeft: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, zIndex: 99999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 150 }}>
                                                                        <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontSize: 12, color: 'var(--text-main)', borderRadius: 6, whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); reorderCard(card, 'top'); setCardMenuOpen(null); setCardSubmenu(null); }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                                                                            <ChevronsUp size={13} /> Mover para topo
                                                                        </button>
                                                                        <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontSize: 12, color: 'var(--text-main)', borderRadius: 6, whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); reorderCard(card, 'up'); setCardMenuOpen(null); setCardSubmenu(null); }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                                                                            <ArrowUp size={13} /> Mover para cima
                                                                        </button>
                                                                        <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontSize: 12, color: 'var(--text-main)', borderRadius: 6, whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); reorderCard(card, 'down'); setCardMenuOpen(null); setCardSubmenu(null); }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                                                                            <ArrowDown size={13} /> Mover para baixo
                                                                        </button>
                                                                        <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontSize: 12, color: 'var(--text-main)', borderRadius: 6, whiteSpace: 'nowrap' }} onClick={(e) => { e.stopPropagation(); reorderCard(card, 'bottom'); setCardMenuOpen(null); setCardSubmenu(null); }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                                                                            <ChevronsDown size={13} /> Mover para fim
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ position: 'relative' }}>
                                                                <button
                                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontSize: 12, color: 'var(--text-main)', borderRadius: 6 }}
                                                                    onClick={(e) => { e.stopPropagation(); setCardSubmenu(cardSubmenu === 'move' ? null : 'move'); }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                                                                >
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}><Kanban size={13} /> Mover para...</span>
                                                                    <ChevronRight size={13} style={{ flexShrink: 0 }} />
                                                                </button>
                                                                {cardSubmenu === 'move' && (
                                                                    <div style={{ position: 'absolute', left: '100%', top: 0, marginLeft: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 4, zIndex: 99999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 150 }}>
                                                                        {columns.filter(c => c.id !== card.column_id).map(col => (
                                                                            <button key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontSize: 12, color: 'var(--text-main)', borderRadius: 6 }} onClick={(e) => { e.stopPropagation(); moveCard(card, col.id); setCardMenuOpen(null); setCardSubmenu(null); }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                                                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                                                                                {col.name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                                                            <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontSize: 12, color: '#ef4444', borderRadius: 6 }} onClick={(e) => { e.stopPropagation(); removeCard(card.id, card.candidate_id); setCardMenuOpen(null); }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                                                                <X size={13} /> Remover
                                                            </button>
                                                            </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Linha 2: badge da vaga recuada para alinhar com o nome */}
                                            {(() => {
                                                const p = pipelines.find(pipe => pipe.id === card.pipeline_id);
                                                const vId = card.vaga_id || p?.vaga_id;
                                                const jobCode = availableVagas.find(v => v.id === card.job_id || v.id === card.vaga_id)?.job_code;
                                                const jobName = card.display_job_name || card.candidate_vagas[0];
                                                return (jobName) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 12 }}>
                                                        {getVagaStatusBadge(vId)}
                                                        {jobCode && (
                                                            <span style={{
                                                                fontSize: 9,
                                                                fontWeight: 800,
                                                                padding: '3px 8px',
                                                                borderRadius: 12,
                                                                background: 'rgba(99,102,241,0.15)',
                                                                border: '1px solid rgba(99,102,241,0.3)',
                                                                color: 'var(--primary)'
                                                            }}>
                                                                {jobCode.toUpperCase()}
                                                            </span>
                                                        )}
                                                        <span style={{
                                                            fontSize: 9,
                                                            fontWeight: 800,
                                                            padding: '3px 8px',
                                                            borderRadius: 12,
                                                            background: 'rgba(99,102,241,0.15)',
                                                            border: '1px solid rgba(99,102,241,0.3)',
                                                            color: 'var(--primary)',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {jobName.toUpperCase()}
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
                                        </div>
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
                            onClick={openCreatePipelineModal}
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
                        <div style={{ display: isMobile ? 'flex' : 'grid', gridTemplateColumns: isMobile ? undefined : '3fr 1fr 1fr', padding: isMobile ? '10px 14px' : '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', justifyContent: 'space-between', gap: isMobile ? 4 : 0 }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: isMobile ? 10 : 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Candidato</div>
                            <div style={{ color: 'var(--text-dim)', fontSize: isMobile ? 10 : 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score</div>
                            <div style={{ color: 'var(--text-dim)', fontSize: isMobile ? 10 : 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estágio</div>
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
                                let importedFrom = '';
                                try { const n = JSON.parse(card.notes || '{}'); importedFrom = n.imported_from || ''; } catch { /* ignore */ }
                                return (
                                    <div key={card.id} style={{ display: isMobile ? 'flex' : 'grid', gridTemplateColumns: isMobile ? undefined : '3fr 1fr 1fr', padding: isMobile ? '12px 14px' : '16px 24px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s', alignItems: 'center', justifyContent: 'space-between', gap: isMobile ? 6 : 0, flexWrap: isMobile ? 'wrap' : 'nowrap' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} onClick={() => openCandidate(card)}>
                                        <div style={{ flex: isMobile ? '1 1 auto' : undefined }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, marginBottom: isMobile ? 0 : 4 }}>
                                                <span style={{ fontSize: isMobile ? 9 : 10, fontWeight: 800, padding: isMobile ? '2px 6px' : '4px 10px', borderRadius: 12, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                                                    {(card.display_job_name ?? card.candidate_vagas[0] ?? 'CANDIDATO').toUpperCase()}
                                                </span>
                                                <span style={{ color: isBlacklisted ? '#ef4444' : 'var(--text-main)', fontWeight: 700, fontSize: isMobile ? 13 : 15 }}>
                                                    {card.candidate_name}
                                                </span>
                                                {isBlacklisted && <Ban size={isMobile ? 12 : 14} color="#ef4444" />}
                                                {importedFrom && !isMobile && (
                                                    <span style={{ fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 6, marginLeft: 4 }}>
                                                        ← {importedFrom}
                                                    </span>
                                                )}
                                            </div>
                                            {isMobile && importedFrom && (
                                                <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 2, paddingLeft: 4 }}>
                                                    ← {importedFrom}
                                                </div>
                                            )}
                                            {!isMobile && (
                                                <div style={{ color: 'var(--text-dim)', fontSize: 13, paddingLeft: 2 }}>
                                                    Clique para ver detalhes do perfil
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ flexShrink: 0 }}>
                                            {score != null ? (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: isMobile ? 4 : 6, padding: isMobile ? '2px 8px' : '4px 12px', borderRadius: 20, background: scoreCol + '1a', color: scoreCol, fontSize: isMobile ? 10 : 12, fontWeight: 700 }}>
                                                    <Flag size={isMobile ? 10 : 12} /> {score}%
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-dim)', fontSize: isMobile ? 11 : 13 }}>-</span>
                                            )}
                                        </div>
                                        <div style={{ flexShrink: 0 }}>
                                            <span style={{ display: 'inline-block', padding: isMobile ? '2px 8px' : '4px 12px', borderRadius: 20, border: `1px solid ${col.color}40`, background: col.color + '1a', color: col.color, fontSize: isMobile ? 10 : 12, fontWeight: 700 }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 16 }}>
                        {/* Card 1: Total */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: isMobile ? 12 : 20, position: 'relative', overflow: 'hidden', minHeight: isMobile ? 110 : 'auto' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: isMobile ? 11 : 13, fontWeight: 600, marginBottom: isMobile ? 4 : 8 }}>Total de Candidatos</div>
                            <div style={{ color: 'var(--text-main)', fontSize: isMobile ? 22 : 28, fontWeight: 800 }}>
                                {cards.length}
                            </div>
                            <div style={{ color: 'var(--text-dim)', fontSize: isMobile ? 10 : 11, marginTop: isMobile ? 4 : 8, paddingRight: isMobile ? 28 : 0 }}>Em todas as etapas do processo</div>
                            <div style={{ position: 'absolute', bottom: isMobile ? 10 : 20, right: isMobile ? 10 : 20, display: 'flex', alignItems: 'center', justifyContent: 'center', width: isMobile ? 26 : 32, height: isMobile ? 26 : 32, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                                <Calendar size={isMobile ? 14 : 18} />
                            </div>
                        </div>
                        
                        {/* Card 2: Em Andamento (Triagem, Entrevista, Proposta) */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: isMobile ? 12 : 20, position: 'relative', overflow: 'hidden', minHeight: isMobile ? 110 : 'auto' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: isMobile ? 11 : 13, fontWeight: 600, marginBottom: isMobile ? 4 : 8 }}>Candidatos Ativos</div>
                            <div style={{ color: 'var(--text-main)', fontSize: isMobile ? 22 : 28, fontWeight: 800 }}>
                                {cards.filter(c => {
                                    const col = columns.find(col => col.id === c.column_id);
                                    return col && !col.name.toLowerCase().includes('reprovado') && !col.name.toLowerCase().includes('aprovado');
                                }).length}
                            </div>
                            <div style={{ color: 'var(--text-dim)', fontSize: isMobile ? 10 : 11, marginTop: isMobile ? 4 : 8, paddingRight: isMobile ? 28 : 0 }}>Em avaliação ativa</div>
                            <div style={{ position: 'absolute', bottom: isMobile ? 10 : 20, right: isMobile ? 10 : 20, display: 'flex', alignItems: 'center', justifyContent: 'center', width: isMobile ? 26 : 32, height: isMobile ? 26 : 32, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                                <Target size={isMobile ? 14 : 18} />
                            </div>
                        </div>

                        {/* Card 3: Aprovados */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: isMobile ? 12 : 20, position: 'relative', overflow: 'hidden', minHeight: isMobile ? 110 : 'auto' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: isMobile ? 11 : 13, fontWeight: 600, marginBottom: isMobile ? 4 : 8 }}>Aprovados</div>
                            <div style={{ color: 'var(--text-main)', fontSize: isMobile ? 22 : 28, fontWeight: 800 }}>
                                {cards.filter(c => {
                                    const col = columns.find(col => col.id === c.column_id);
                                    return col && col.name.toLowerCase().includes('aprovado');
                                }).length}
                            </div>
                            <div style={{ color: 'var(--text-dim)', fontSize: isMobile ? 10 : 11, marginTop: isMobile ? 4 : 8, paddingRight: isMobile ? 28 : 0 }}>Aguardando contratação</div>
                            <div style={{ position: 'absolute', bottom: isMobile ? 10 : 20, right: isMobile ? 10 : 20, display: 'flex', alignItems: 'center', justifyContent: 'center', width: isMobile ? 26 : 32, height: isMobile ? 26 : 32, borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                                <ClipboardList size={isMobile ? 14 : 18} />
                            </div>
                        </div>

                        {/* Card 4: Reprovados/Descartados */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: isMobile ? 12 : 20, position: 'relative', overflow: 'hidden', minHeight: isMobile ? 110 : 'auto' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: isMobile ? 11 : 13, fontWeight: 600, marginBottom: isMobile ? 4 : 8 }}>Descartados</div>
                            <div style={{ color: 'var(--text-main)', fontSize: isMobile ? 22 : 28, fontWeight: 800 }}>
                                {cards.filter(c => {
                                    const col = columns.find(col => col.id === c.column_id);
                                    return col && col.name.toLowerCase().includes('reprovado');
                                }).length}
                            </div>
                            <div style={{ color: 'var(--text-dim)', fontSize: isMobile ? 10 : 11, marginTop: isMobile ? 4 : 8, paddingRight: isMobile ? 28 : 0 }}>Historico finalizado</div>
                            <div style={{ position: 'absolute', bottom: isMobile ? 10 : 20, right: isMobile ? 10 : 20, display: 'flex', alignItems: 'center', justifyContent: 'center', width: isMobile ? 26 : 32, height: isMobile ? 26 : 32, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                                <AlertCircle size={isMobile ? 14 : 18} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Column Modal */}
            {addColModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 12 : 0 }}>
                    <div onClick={() => setAddColModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                    <div style={{ position: 'relative', zIndex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: isMobile ? 16 : 20, padding: isMobile ? 20 : 28, width: isMobile ? '100%' : 340, maxWidth: 340, boxSizing: 'border-box', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
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
                <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 12 : 0 }}>
                    <div onClick={() => { if (!loading) { setShowCreatePipeline(false); setSelectedVagaId(''); } }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                    <div style={{ position: 'relative', zIndex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: isMobile ? 16 : 20, padding: isMobile ? 20 : 32, width: isMobile ? '100%' : 440, maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>
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
                                fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 16
                            }}
                        />

                        {/* Vaga selector */}
                        <p style={{ color: 'var(--text-dim)', fontSize: 14, margin: '0 0 8px' }}>Vincular a uma vaga (opcional)</p>
                        <div style={{ position: 'relative', marginBottom: 24 }}>
                            <div
                                onClick={() => setShowVagaSelectCreate(!showVagaSelectCreate)}
                                style={{
                                    background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 12,
                                    padding: '12px 16px', color: 'var(--text-main)', fontSize: 14,
                                    display: 'flex', alignItems: 'center', cursor: 'pointer',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <span>
                                    {selectedVagaId
                                        ? (() => {
                                            const v = vagasWithoutPipeline.find(x => x.id === selectedVagaId);
                                            return v ? `${v.title}${v.job_code ? ` [${v.job_code}]` : ''}` : 'Selecionar vaga';
                                        })()
                                        : '— Nenhuma, criar pipeline avulso —'
                                    }
                                </span>
                                <ChevronDown size={14} style={{ transition: 'transform 0.3s', transform: showVagaSelectCreate ? 'rotate(180deg)' : 'none', color: 'var(--text-dim)' }} />
                            </div>

                            {showVagaSelectCreate && (
                                <div className="pipeline_dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4 }}>
                                    <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                                        <input
                                            autoFocus
                                            placeholder="Pesquisar vaga..."
                                            value={vagaSearchCreate}
                                            onChange={e => setVagaSearchCreate(e.target.value)}
                                            style={{
                                                width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)',
                                                borderRadius: 6, padding: '10px 14px', color: 'var(--text-main)', fontSize: 14,
                                                outline: 'none', boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <div
                                        className={`pipeline_option${selectedVagaId === '' ? ' active' : ''}`}
                                        onClick={() => { setSelectedVagaId(''); setShowVagaSelectCreate(false); setVagaSearchCreate(''); setNewPipeName(''); }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>— Nenhuma, criar pipeline avulso —</span>
                                    </div>
                                    {vagasWithoutPipeline
                                        .filter(v =>
                                            !vagaSearchCreate ||
                                            v.title.toLowerCase().includes(vagaSearchCreate.toLowerCase()) ||
                                            (v.job_code || '').toLowerCase().includes(vagaSearchCreate.toLowerCase())
                                        )
                                        .map(v => (
                                            <div
                                                key={v.id}
                                                className={`pipeline_option${selectedVagaId === v.id ? ' active' : ''}`}
                                                onClick={() => {
                                                    setSelectedVagaId(v.id);
                                                    setShowVagaSelectCreate(false);
                                                    setVagaSearchCreate('');
                                                    setNewPipeName(v.title);
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div className="cs-dot" style={{ background: 'var(--primary)', flexShrink: 0 }} />
                                                    <span style={{ fontWeight: 600 }}>{v.title}</span>
                                                    {v.job_code && <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>{v.job_code}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    {vagasWithoutPipeline.filter(v =>
                                        !vagaSearchCreate ||
                                        v.title.toLowerCase().includes(vagaSearchCreate.toLowerCase()) ||
                                        (v.job_code || '').toLowerCase().includes(vagaSearchCreate.toLowerCase())
                                    ).length === 0 && (
                                        <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma vaga disponível.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button 
                                onClick={() => { setShowCreatePipeline(false); setSelectedVagaId(''); }}
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

            {/* Modal: Link Pipeline to Vaga */}
            {linkVagaPipeline && (() => {
                const unlinkedVagas = availableVagas.filter(v => !v.pipeline_id && v.is_active !== false && (v.status === 'aberta' || v.status === 'invisivel'));
                return (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div onClick={() => { setLinkVagaPipeline(null); setLinkVagaVagaId(''); }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                        <div style={{ position: 'relative', zIndex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, width: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
                            <h3 style={{ fontSize: 20, color: 'var(--text-main)', margin: '0 0 12px', fontWeight: 700 }}>Vincular Pipeline a Vaga</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: 14, margin: '0 0 20px' }}>
                                Pipeline: <strong style={{ color: 'var(--text-main)' }}>{linkVagaPipeline.name}</strong>
                            </p>
                            <div style={{ position: 'relative', marginBottom: 24, zIndex: 50 }}>
                                <div
                                    onClick={() => setLinkVagaSelectOpen(!linkVagaSelectOpen)}
                                    style={{
                                        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
                                        padding: '10px 14px', color: 'var(--text-main)', fontSize: 13,
                                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <span style={{ fontWeight: 500, color: linkVagaVagaId ? 'var(--text-main)' : 'var(--text-dim)' }}>
                                        {linkVagaVagaId
                                            ? (() => { const v = availableVagas.find(x => x.id === linkVagaVagaId); return v ? `${v.job_code ? `[${v.job_code}] ` : ''}${v.title}` : 'Selecione uma vaga...'; })()
                                            : 'Selecione uma vaga...'}
                                    </span>
                                    <ChevronDown size={14} style={{ transition: 'transform 0.3s', transform: linkVagaSelectOpen ? 'rotate(180deg)' : 'none', color: 'var(--text-dim)' }} />
                                </div>

                                {linkVagaSelectOpen && (
                                    <div className="pipeline_dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4 }}>
                                        {unlinkedVagas.length === 0 && (
                                            <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma vaga disponível.</div>
                                        )}
                                        {unlinkedVagas.map(v => (
                                            <div
                                                key={v.id}
                                                className={`pipeline_option${linkVagaVagaId === v.id ? ' active' : ''}`}
                                                onClick={() => { setLinkVagaVagaId(v.id); setLinkVagaSelectOpen(false); }}
                                                style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div className="cs-dot" style={{ background: 'var(--primary)', flexShrink: 0 }} />
                                                    <span style={{ fontWeight: 600 }}>{v.title}</span>
                                                </div>
                                                {v.job_code && <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, paddingLeft: 20 }}>{v.job_code}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    onClick={() => { setLinkVagaPipeline(null); setLinkVagaVagaId(''); }}
                                    style={{
                                        flex: 1, background: 'transparent', border: '1px solid var(--border)',
                                        borderRadius: 12, padding: '12px 0', color: 'var(--text-dim)',
                                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleLinkVaga}
                                    disabled={!linkVagaVagaId || loading}
                                    style={{
                                        flex: 2, background: 'var(--primary)', border: 'none',
                                        borderRadius: 12, padding: '12px 0', color: '#fff',
                                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                        opacity: (linkVagaVagaId && !loading) ? 1 : 0.5,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                    }}
                                >
                                    {loading ? 'Vinculando...' : 'Vincular'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal: Delete Pipeline Confirmation */}
            {deleteConfirmId && (() => {
                const pipe = pipelines.find(p => p.id === deleteConfirmId);
                if (!pipe) return null;
                return (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div onClick={() => setDeleteConfirmId(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                        <div style={{ position: 'relative', zIndex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, width: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
                            <h3 style={{ fontSize: 20, color: 'var(--text-main)', margin: '0 0 12px', fontWeight: 700 }}>Excluir Processo Seletivo</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: 14, margin: '0 0 24px' }}>
                                Tem certeza que deseja excluir <strong>"{pipe.name}"</strong>? Todos os cards e etapas serão removidos permanentemente.
                            </p>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button 
                                    onClick={() => setDeleteConfirmId(null)}
                                    style={{ 
                                        flex: 1, background: 'transparent', border: '1px solid var(--border)', 
                                        borderRadius: 12, padding: '12px 0', color: 'var(--text-dim)', 
                                        fontSize: 14, fontWeight: 700, cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={() => { deletePipeline(deleteConfirmId); setDeleteConfirmId(null); }}
                                    style={{ flex: 1, background: '#ef4444', border: 'none', borderRadius: 12, padding: '12px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Add Candidate Modal */}
            {addCandModal && (
                <AddCandidateModal
                    columnId={addCandModal}
                    eligibles={eligiblesForModal}
                    onAdd={addCard}
                    onClose={() => setAddCandModal(null)}
                />
            )}

            {/* Candidate Detail Panel */}
            {selectedCandidate && (
                <CandidatePanel
                    c={selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                    navigate={navigate}
                    onNotesChange={handleNotesChange}
                    onFieldChange={handleFieldChange}
                    onTransferSuccess={() => {
                        if (profile.userId && selectedPipelineId) {
                            loadPipelineData(profile.userId, selectedPipelineId);
                        }
                    }}
                    onBlacklistChange={(id: string, val: boolean) => {
                        if (val) {
                            setCards(prev => prev.filter(c => c.candidate_id !== id));
                        } else {
                            setCards(prev => prev.map(c => (c.candidate_id === id ? { ...c, is_blacklisted: val } : c)));
                        }
                        setSelectedCandidate(prev => (prev && prev.id === id ? { ...prev, is_blacklisted: val } : prev));
                    }}
                    onCardRemoved={(cardId: string) => {
                        setCards(prev => prev.filter(c => c.id !== cardId));
                    }}
                    hideFeedbackDaIA={true}
                />
            )}

            {/* Bottom Sheet (mobile) */}
            {isMobile && mobileSheet && (
                <div onClick={() => setMobileSheet(null)}
                    style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
                    <div onClick={(e) => e.stopPropagation()}
                        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', padding: '16px 20px 32px', boxShadow: '0 -8px 32px rgba(0,0,0,0.3)' }}>
                        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
                        {mobileSheet.type === 'card' && (
                            <>
                                <p style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 14, margin: '0 0 4px 0' }}>{mobileSheet.card.candidate_name}</p>
                                <p style={{ color: 'var(--text-dim)', fontSize: 12, margin: '0 0 14px 0' }}>{mobileSheet.col.name} · {mobileSheet.card.display_job_name ?? 'Candidato'}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {columns.filter(c => c.id !== mobileSheet.card.column_id).map(targetCol => (
                                        <button key={targetCol.id}
                                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', borderRadius: 12, textAlign: 'left' }}
                                            onClick={() => { moveCard(mobileSheet.card, targetCol.id); setMobileSheet(null); }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: targetCol.color, flexShrink: 0 }} />
                                            Mover para {targetCol.name}
                                        </button>
                                    ))}
                                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                                    <button
                                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontSize: 13, fontWeight: 600, color: '#ef4444', borderRadius: 12, textAlign: 'left' }}
                                        onClick={() => { removeCard(mobileSheet.card.id, mobileSheet.card.candidate_id); setMobileSheet(null); }}>
                                        <Trash2 size={14} />
                                        Remover deste pipeline
                                    </button>
                                </div>
                            </>
                        )}
                        {mobileSheet.type === 'col' && (
                            <>
                                <p style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 14, margin: '0 0 14px 0' }}>Opções da coluna</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <button
                                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', borderRadius: 12, textAlign: 'left' }}
                                        onClick={() => { setMobileSheet(null); /* Could prompt inline edit here */ }}>
                                        <Edit2 size={14} />
                                        Editar nome da coluna
                                    </button>
                                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                                    <button
                                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', fontSize: 13, fontWeight: 600, color: '#ef4444', borderRadius: 12, textAlign: 'left' }}
                                        onClick={() => { deleteColumn(mobileSheet.col.id); setMobileSheet(null); }}>
                                        <Trash2 size={14} />
                                        Excluir coluna
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

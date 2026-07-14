import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../core/services/supabase';
import { useUser } from '../../../core/contexts/UserContext';
import { useLang } from '../../../core/contexts/LangContext';
import toast from 'react-hot-toast';
import { logScreening } from '../../../core/services/logger';
import { GitBranch, Loader, Trash2, ChevronDown, Ban } from 'lucide-react';

const css = `
.pls-container { position: relative; flex: 1; }
.pls-trigger { 
    display: flex; align-items: center; justify-content: space-between;
    background: var(--bg-input); border: 1px solid var(--border);
    border-radius: 10px; padding: 10px 16px; color: var(--text-main);
    font-size: 14px; cursor: pointer; transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    white-space: nowrap;
    height: 44px;
}
.pls-trigger:hover { border-color: var(--primary); }
.pls-trigger.open { border-color: var(--primary); }
.pls-dropdown {
    position: absolute; top: calc(100% + 8px); left: 0; min-width: 100%;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 12px; padding: 8px; z-index: 1000;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    backdrop-filter: blur(16px); animation: csSlideUp 0.2s ease-out;
    max-height: 240px; overflow-y: auto;
}
.pls-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 8px; color: var(--text-dim);
    font-size: 13px; cursor: pointer; transition: all 0.15s;
}
.pls-item:hover { background: var(--row-hover); color: var(--text-main); }
.pls-item.active { background: rgba(59, 130, 246, 0.15); color: #3b82f6; font-weight: 600; }
.pls-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--primary); }
@keyframes csSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;

interface LinkedPipeline {
    cardId: string;
    pipelineId: string;
    pipelineName: string;
}

export function PipelineLinkSection({
    candidateId,
    candidateName,
    currentJobContext,
    isBlacklisted,
    onCardRemoved
}: {
    candidateId: string;
    candidateName: string;
    currentJobContext?: { id: string; title: string };
    isBlacklisted?: boolean;
    onCardRemoved?: (cardId: string) => void;
}) {
    const { profile } = useUser();
    const { t } = useLang();
    const [pipelines, setPipelines] = useState<Array<{ id: string; name: string }>>([]);
    const [linkedPipelines, setLinkedPipelines] = useState<LinkedPipeline[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [linking, setLinking] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [lastRemovedPipeline, setLastRemovedPipeline] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mq = window.matchMedia('(max-width:767px)');
        const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownOpen]);

    useEffect(() => {
        async function load() {
            const [pipeResult, cardResult] = await Promise.all([
                supabase.from('pipelines').select('id, name').eq('organization_id', profile.organization_id).order('name'),
                supabase.from('pipeline_cards').select('id, pipeline_id').eq('candidate_id', candidateId)
            ]);

            if (pipeResult.data) setPipelines(pipeResult.data);

            if (cardResult.data && cardResult.data.length > 0) {
                const pipeMap = new Map(pipeResult.data?.map(p => [p.id, p.name]) ?? []);
                setLinkedPipelines(
                    cardResult.data.map(card => ({
                        cardId: card.id,
                        pipelineId: card.pipeline_id,
                        pipelineName: pipeMap.get(card.pipeline_id) || 'Pipeline'
                    }))
                );
            }
        }
        load();
    }, [candidateId, profile.organization_id]);

    async function handleLink() {
        if (!selectedId) return;
        setLinking(true);
        try {
            const alreadyLinked = linkedPipelines.find(p => p.pipelineId === selectedId);
            if (alreadyLinked) {
                toast(t('candidatoJaNoPipeline'));
                return;
            }

            const { data: firstCol } = await supabase
                .from('pipeline_columns')
                .select('id, name')
                .eq('pipeline_id', selectedId)
                .order('position', { ascending: true })
                .limit(1)
                .maybeSingle();

            if (!firstCol) {
                toast.error('Pipeline sem colunas');
                return;
            }

            const payload: Record<string, unknown> = {
                pipeline_id: selectedId,
                candidate_id: candidateId,
                column_id: firstCol.id,
                position: 0,
                user_id: profile.userId,
                organization_id: profile.organization_id,
            };

            const notesObj: Record<string, unknown> = {};

            if (currentJobContext) {
                notesObj.selected_job_id = currentJobContext.id;
                notesObj.selected_job_name = currentJobContext.title;
            }

            if (lastRemovedPipeline) {
                notesObj.imported_from = lastRemovedPipeline;
                setLastRemovedPipeline(null);
            }

            if (Object.keys(notesObj).length > 0) {
                payload.notes = JSON.stringify(notesObj);
            }

            const { data, error } = await supabase.from('pipeline_cards').insert(payload).select().single();

            if (error) throw error;

            const pipelineName = pipelines.find(p => p.id === selectedId)?.name || 'Pipeline';
            await logScreening(profile.userId, candidateId, 'inclusion', null, `${firstCol.name} - ${pipelineName}`, {
                pipeline_id: selectedId,
                pipeline_name: pipelineName,
                via: 'analysis_panel'
            });

            const newPipeline = pipelines.find(p => p.id === selectedId);
            setLinkedPipelines(prev => [...prev, {
                cardId: data.id,
                pipelineId: selectedId,
                pipelineName: newPipeline?.name || 'Pipeline'
            }]);
            setSelectedId('');
            setDropdownOpen(false);
            toast.success(t('candidatoVinculadoPipeline').replace('{name}', candidateName));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao vincular';
            toast.error(msg);
        } finally {
            setLinking(false);
        }
    }

    async function handleRemove(pipelineId: string, cardId: string, pipelineName: string) {
        setRemovingId(cardId);
        try {
            const { error } = await supabase.from('pipeline_cards').delete().eq('id', cardId);
            if (error) throw error;
            setLinkedPipelines(prev => prev.filter(p => p.cardId !== cardId));
            setLastRemovedPipeline(pipelineName);
            onCardRemoved?.(cardId);
            await logScreening(profile.userId, candidateId, 'removal', pipelineName, null, {
                pipeline_id: pipelineId,
                pipeline_name: pipelineName,
                via: 'analysis_panel'
            });
            toast.success('Removido do pipeline');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao remover';
            toast.error(msg);
        } finally {
            setRemovingId(null);
        }
    }

    useEffect(() => {
        if (isBlacklisted) {
            setLinkedPipelines([]);
        }
    }, [isBlacklisted]);

    const availablePipelines = pipelines.filter(p => !linkedPipelines.some(lp => lp.pipelineId === p.id));
    const selectedPipeline = pipelines.find(p => p.id === selectedId);

    if (isBlacklisted) {
        return (
            <section style={{
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 20,
                padding: 24,
                background: 'rgba(239, 68, 68, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
            }}>
                <p style={{
                    fontSize: 13, fontWeight: 700, color: '#ef4444', margin: 0,
                    display: 'flex', alignItems: 'center', gap: 8,
                    textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                    <GitBranch size={16} /> {t('vinculadoPipelines')}
                </p>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    fontSize: 13,
                    lineHeight: 1.5
                }}>
                    <Ban size={16} style={{ flexShrink: 0 }} />
                    <span>{t('candidatoRestritoPipeline')}</span>
                </div>
            </section>
        );
    }

    return (
        <section style={{
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 20,
            padding: isMobile ? 16 : 24,
            background: 'rgba(99, 102, 241, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
        }}>
            <p style={{
                fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: 0,
                display: 'flex', alignItems: 'center', gap: 8,
                textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
                <GitBranch size={16} /> {t('vinculadoPipelines')}
            </p>

            {linkedPipelines.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {linkedPipelines.map(lp => (
                        <div key={lp.cardId} style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: 'rgba(34, 197, 94, 0.08)',
                            border: '1px solid rgba(34, 197, 94, 0.15)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <GitBranch size={14} color="#22c55e" />
                                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                                    {lp.pipelineName}
                                </span>
                            </div>
                            <button
                                onClick={() => handleRemove(lp.pipelineId, lp.cardId, lp.pipelineName)}
                                disabled={removingId === lp.cardId}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    background: 'rgba(239, 68, 68, 0.05)',
                                    color: '#ef4444',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: removingId === lp.cardId ? 'not-allowed' : 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {removingId === lp.cardId ? <Loader size={12} className="spin" /> : <Trash2 size={12} />}
                                {t('remover')}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', gap: 10, alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', width: '100%' }}>
                <div className="pls-container" ref={dropdownRef} style={{ width: isMobile ? '100%' : 'auto' }}>
                    <div
                        className={`pls-trigger ${dropdownOpen ? 'open' : ''}`}
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                        <span style={{ color: selectedPipeline ? 'var(--text-main)' : 'var(--text-dim)' }}>
                            {selectedPipeline ? selectedPipeline.name : t('vincularPipelineDropdown')}
                        </span>
                        <ChevronDown size={14} style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </div>
                    {dropdownOpen && (
                        <div className="pls-dropdown">
                            <div
                                className={`pls-item ${!selectedId ? 'active' : ''}`}
                                onClick={() => { setSelectedId(''); setDropdownOpen(false); }}
                            >
                                <div className="pls-dot" style={{ background: 'var(--text-muted)' }} />
                                {t('vincularPipelineDropdown')}
                            </div>
                            {availablePipelines.map(p => (
                                <div
                                    key={p.id}
                                    className={`pls-item ${selectedId === p.id ? 'active' : ''}`}
                                    onClick={() => { setSelectedId(p.id); setDropdownOpen(false); }}
                                >
                                    <div className="pls-dot" />
                                    {p.name}
                                </div>
                            ))}
                            {availablePipelines.length === 0 && (
                                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
                                    {t('nenhumPipelineDisponivel')}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleLink}
                    disabled={!selectedId || linking}
                    style={{
                        padding: '10px 20px',
                        borderRadius: 10,
                        border: 'none',
                        background: !selectedId || linking ? 'var(--border)' : 'var(--primary)',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: !selectedId || linking ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap',
                        width: isMobile ? '100%' : 'auto'
                    }}
                >
                    {linking ? <Loader size={16} className="spin" /> : <GitBranch size={16} />}
                    {linking ? t('vinculando') : t('vincular')}
                </button>
            </div>
        </section>
    );
}

import { useEffect, useState } from 'react';
import {
    X, MapPin, Calendar, UserRound, Mail, Phone,
    Briefcase, Eye, Loader, MessageSquare, Zap, Smile, Ban, Activity, Clock, ClipboardList, UserPlus,
    ChevronLeft, FileText
} from 'lucide-react';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { logActivity } from '../../core/services/logger';
import { handleViewResume } from '../../core/utils/storage';
import { TalentTransferModal } from '../candidates/components/TalentTransferModal';

import {
    initials, scoreColor, formatDate, parseSkills, parseComments, relativeTime,
    type CandidateDetail, type Comment
} from './CandidatePanelUtils';

// ─── Candidate Panel Component ────────────────────────────────────────────────
export function CandidatePanel({
    c,
    onClose,
    navigate,
    onNotesChange,
    onFieldChange,
    onBlacklistChange,
    onTransferSuccess,
    currentJobContext
}: {
    c: CandidateDetail;
    onClose: () => void;
    navigate: (path: string) => void;
    onNotesChange: (id: string, notes: string) => void;
    onFieldChange: (id: string, field: string, val: any) => void;
    onBlacklistChange: (id: string, val: boolean) => void;
    onTransferSuccess?: () => void;
    currentJobContext?: { id: string; title: string };
}) {
    const skillsList = parseSkills(c.skills);

    const [comments, setComments] = useState<Comment[]>(() => parseComments(c.notes));
    const [newText, setNewText] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [pickerOpenId, setPickerOpenId] = useState<string | null>(null);

    // Edição de campos do candidato
    const [editField, setEditField] = useState<string | null>(null);
    const [editFieldVal, setEditFieldVal] = useState('');
    const [savingField, setSavingField] = useState(false);
    const { profile } = useUser();
    const [localC, setLocalC] = useState({ 
        email: c.email, 
        phone: c.phone, 
        location: c.location, 
        address: c.address, 
        linkedin: c.linkedin, 
        age: c.age, 
        gender: c.gender,
        portfolio: c.portfolio,
        cep: c.cep,
        address_number: c.address_number,
        complement: c.complement
    });
    const [transferringToBank, setTransferringToBank] = useState(false);
    const [togglingBlacklist, setTogglingBlacklist] = useState(false);
    const [activatingChat, setActivatingChat] = useState(false);
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [chatActive, setChatActive] = useState(!!c.conversations?.length);

    async function toggleBlacklist() {
        if (togglingBlacklist) return;
        setTogglingBlacklist(true);
        const newVal = !c.is_blacklisted;
        try {
            const { error } = await supabase.from('candidates').update({ is_blacklisted: newVal }).eq('id', c.id);
            if (!error) {
                onBlacklistChange(c.id, newVal);
                logActivity(profile.userId, newVal ? `Restringiu o candidato "${c.name}"` : `Removeu "${c.name}" da lista de restrição`);
            }
        } finally { setTogglingBlacklist(false); }
    }

    async function handleActivateChat() {
        if (activatingChat) return;
        setPhoneError(null);
        
        if (!localC.phone) {
            setPhoneError('Telefone não cadastrado. Adicione um número para habilitar.');
            return;
        }

        const digits = localC.phone.replace(/\D/g, '');
        
        if (!digits.startsWith('55') || digits.length < 12 || digits.length > 13) {
            setPhoneError('Formato inválido. Use o padrão: 5521999999999 (País + DDD + Número).');
            return;
        }

        if (localC.phone !== digits) {
            // Se o usuário tem um número formatado com + ou (), mas os dígitos estão corretos, 
            // opcionalmente podemos normalizar aqui, mas o usuário pediu o padrão 55...
            // Vamos apenas garantir que ao salvar, usamos os dígitos se necessário, 
            // mas a validação de dígitos é o que importa para a API.
        }

        setActivatingChat(true);
        try {
            const { error } = await supabase
                .from('candidate_conversations')
                .upsert({
                    candidate_id: c.id,
                    user_id: profile.userId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'candidate_id, user_id' });

            if (error) throw error;
            
            // Persistir o telefone na tabela de candidatos
            await supabase
                .from('candidates')
                .update({ phone: digits })
                .eq('id', c.id);

            logActivity(profile.userId, `Habilitou chat WhatsApp para o candidato "${c.name}"`, c.id);
            setChatActive(true);
            if (onFieldChange) {
                onFieldChange(c.id, 'phone', digits);
                onFieldChange(c.id, 'conversations', [{ candidate_id: c.id }]);
            }
        } catch (err: any) {
            console.error('[Chat] Erro ao ativar:', err);
            setPhoneError('Erro ao habilitar o chat. Verifique a conexão.');
        } finally {
            setActivatingChat(false);
        }
    }

    async function handleDeactivateChat() {
        setActivatingChat(true);
        try {
            const { error } = await supabase
                .from('candidate_conversations')
                .delete()
                .eq('candidate_id', c.id)
                .eq('user_id', profile.userId);

            if (error) throw error;
            setChatActive(false);
            if (onFieldChange) onFieldChange(c.id, 'conversations', []);
            // window.location.reload();
        } catch (err) {
            console.error('[Chat] Erro ao desativar:', err);
        } finally {
            setActivatingChat(false);
        }
    }

    useEffect(() => {
        setLocalC({ 
            email: c.email, 
            phone: c.phone, 
            location: c.location, 
            address: c.address, 
            linkedin: c.linkedin, 
            age: c.age, 
            gender: c.gender,
            portfolio: c.portfolio,
            cep: c.cep,
            address_number: c.address_number,
            complement: c.complement
        });
        setChatActive(!!c.conversations?.length);
    }, [c.email, c.phone, c.location, c.address, c.linkedin, c.age, c.gender, c.portfolio, c.cep, c.address_number, c.complement, c.conversations]);

    useEffect(() => {
        setPhoneError(null);
    }, [localC.phone]);



    async function handleFieldSave(field: string) {
        if (savingField) return;
        setSavingField(true);
        try {
            const val = editFieldVal.trim() || null;
            const { error } = await supabase.from('candidates').update({ [field]: val }).eq('id', c.id);
            if (!error) {
                setLocalC(prev => ({ ...prev, [field]: val }));
                setEditField(null);
                onFieldChange(c.id, field, val);
                logActivity(profile.userId, `Alterou o campo "${field}" de "${c.name}" para "${val || 'Não informado'}"`);
            }
        } finally { setSavingField(false); }
    }

    const [expandedJob, setExpandedJob] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'vagas' | 'comments' | 'triagem'>(c.isVagaView ? 'comments' : 'triagem');
    const [vagasOpen, setVagasOpen] = useState(true);

    const [screeningLogs, setScreeningLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [expandedLogJob, setExpandedLogJob] = useState<string | null>(null);

    async function fetchScreeningLogs() {
        if (!c.id) return;
        setLoadingLogs(true);
        try {
            const { data, error } = await supabase
                .from('candidate_screening_logs')
                .select('*')
                .eq('candidate_id', c.id)
                .order('created_at', { ascending: false });
            if (!error) setScreeningLogs(data || []);
        } finally { setLoadingLogs(false); }
    }

    useEffect(() => {
        if (activeTab === 'triagem') fetchScreeningLogs();
    }, [activeTab, c.id]);

    useEffect(() => {
        setComments(parseComments(c.notes));
    }, [c.notes]);

    async function persistComments(updated: Comment[]) {
        const json = JSON.stringify(updated);
        
        const { error: candError, data: candData } = await supabase
            .from('candidates')
            .update({ notes: json })
            .eq('id', c.id)
            .select('id');

        if (candError || !candData || candData.length === 0) {
            const { error: appError } = await supabase
                .from('vagas_candidaturas')
                .update({ internal_notes: json })
                .eq('id', c.id);
            
            if (!appError) {
                onNotesChange(c.id, json);
                return true;
            }
            return false;
        }

        if (!candError) onNotesChange(c.id, json);
        return !candError;
    }

    async function handleAddComment() {
        if (!newText.trim() || saving) return;
        setSaving(true);
        try {
            const newComment: Comment = {
                id: Date.now().toString(),
                text: newText.trim(),
                createdAt: new Date().toISOString(),
                liked: false,
                author: {
                    name: profile.userName || 'Recrutador',
                    avatarUrl: profile.avatarUrl,
                    initials: profile.initials || 'R'
                }
            };
            const updated = [...comments, newComment];
            const ok = await persistComments(updated);
            if (ok) { 
                setComments(updated); 
                setNewText(''); 
                logActivity(profile.userId, `Adicionou um comentário em "${c.name}"`);
            }
        } finally { setSaving(false); }
    }

    async function handleDelete(id: string) {
        const updated = comments.filter(cm => cm.id !== id);
        if (await persistComments(updated)) setComments(updated);
    }

    async function handleReaction(id: string, emoji: string) {
        const updated = comments.map(cm => {
            if (cm.id === id) {
                const newReaction = cm.reaction === emoji ? undefined : emoji;
                return { ...cm, reaction: newReaction, liked: !!newReaction };
            }
            return cm;
        });
        if (await persistComments(updated)) setComments(updated);
    }

    async function handleEditSave(id: string) {
        if (!editText.trim()) return;
        const updated = comments.map(cm => cm.id === id ? { ...cm, text: editText.trim() } : cm);
        if (await persistComments(updated)) { setComments(updated); setEditingId(null); }
    }

    const renderAvatar = (author?: Comment['author']) => {
        if (author?.avatarUrl) {
            return <img src={author.avatarUrl} alt={author.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
        }
        return (
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {author?.initials || 'R'}
            </div>
        );
    };

    return (
        <>
            <style>{`
        @keyframes spin{to{transform:rotate(360deg)}} 
        @keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .comment-row .comment-actions { opacity: 0; visibility: hidden; transition: all 0.2s ease; transform: translateY(5px); }
        .comment-row:hover .comment-actions { opacity: 1; visibility: visible; transform: translateY(0); }
        .reaction-btn { opacity: 0.6; transition: all 0.2s; border-radius: 6px; padding: 2px 6px; }
        .reaction-btn:hover { opacity: 1; background: rgba(255,255,255,0.1); }
        .reaction-active { opacity: 1 !important; background: rgba(99,102,241,0.2) !important; border: 1px solid rgba(99,102,241,0.4); }
        .publish-btn { 
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
          transition: all 0.2s;
        }
        .publish-btn:hover:not(:disabled) { 
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(99,102,241,0.4);
          filter: brightness(1.1);
        }
        .publish-btn:active:not(:disabled) { transform: translateY(0); }
        .emoji-picker-bar {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          background: #1e2230;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 30px;
          padding: 6px 10px;
          display: flex;
          gap: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          z-index: 100;
          animation: emojiPop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes emojiPop { from { opacity: 0; transform: scale(0.5) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .emoji-option {
          font-size: 20px;
          cursor: pointer;
          transition: transform 0.2s;
          padding: 2px;
        }
        .emoji-option:hover { transform: scale(1.3); }
      `}</style>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                zIndex: 301, width: 'clamp(400px, 35vw, 95vw)',
                background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif',
                boxShadow: '-20px 0 60px rgba(0,0,0,0.5)', animation: 'slideInRight 0.28s cubic-bezier(0.16,1,0.3,1)',
                overflowY: 'auto'
            }}>
                <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(c.name)}</div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <button 
                                        onClick={onClose}
                                        style={{ 
                                            background: 'none', border: 'none', padding: 0, 
                                            color: 'var(--primary)', fontSize: 13, fontWeight: 600, 
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 
                                        }}
                                    >
                                        <ChevronLeft size={14} /> Voltar
                                    </button>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>|</span>
                                    <h2 style={{ color: c.is_blacklisted ? '#ef4444' : 'var(--text-main)', fontSize: 18, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {c.name}
                                        {c.is_blacklisted && <Ban size={16} />}
                                    </h2>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                    {c.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}><MapPin size={11} />{c.location}</span>}
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}><Calendar size={11} />{(c.age && !/(não|nao)\s*informado|—/i.test(c.age)) ? `${String(c.age).replace(/\s*anos?/i, '').trim()} anos` : 'Não informado'}</span>
                                    {c.gender && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-dim)' }}><UserRound size={11} />{c.gender}</span>}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                            {c.resume_url && (
                                <button
                                    onClick={() => handleViewResume(c.resume_url)}
                                    title="Ver currículo"
                                    style={{
                                        background: 'rgba(99,102,241,0.1)',
                                        border: '1px solid rgba(99,102,241,0.2)',
                                        borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                                        color: 'var(--primary)',
                                        fontSize: 13, fontWeight: 700,
                                        transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        marginRight: 4
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                                >
                                    <FileText size={16} />
                                    Currículo
                                </button>
                            )}
                            {!c.isVagaView && (
                                <button
                                    onClick={toggleBlacklist}
                                    title={c.is_blacklisted ? "Remover da Blacklist" : "Adicionar à Blacklist"}
                                    style={{
                                        background: c.is_blacklisted ? 'rgba(239,68,68,0.1)' : 'var(--bg-main)',
                                        border: `1px solid ${c.is_blacklisted ? '#ef4444' : 'var(--border)'}`,
                                        borderRadius: 10, padding: 8, cursor: 'pointer',
                                        color: c.is_blacklisted ? '#ef4444' : 'var(--text-dim)',
                                        transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <Ban size={16} />
                                </button>
                            )}
                            <button onClick={onClose} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: 8, cursor: 'pointer', color: 'var(--text-dim)', flexShrink: 0 }}><X size={16} /></button>
                        </div>
                    </div>
                </div>

                {!c.enriched ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#64748b' }}>
                        <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: 14 }}>Carregando detalhes…</span>
                    </div>
                ) : (
                    <div style={{ padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>

                        <section>
                            <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Contato</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                                {([
                                    { key: 'email', label: 'Email', icon: <Mail size={14} />, value: localC.email },
                                    { key: 'phone', label: 'Telefone', icon: <Phone size={14} />, value: localC.phone },
                                    { key: 'linkedin', label: 'LinkedIn', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>, value: localC.linkedin },
                                    { key: 'location', label: 'Local', icon: <MapPin size={14} />, value: localC.location },
                                    { 
                                        key: 'address', 
                                        label: 'Endereço', 
                                        icon: <MapPin size={14} />, 
                                        value: localC.address ? (
                                            `${localC.address}${localC.address_number ? ', ' + localC.address_number : ''}${localC.complement ? ' - ' + localC.complement : ''}`
                                        ) : null 
                                    },
                                    { key: 'gender', label: 'Gênero', icon: <UserRound size={14} />, value: localC.gender },
                                    { key: 'age', label: 'Idade', icon: <Calendar size={14} />, value: (localC.age && !['Não informado', 'não informado', '—'].includes(localC.age ?? '')) ? localC.age : null },
                                    { key: 'portfolio', label: 'Portfólio', icon: <Briefcase size={14} />, value: localC.portfolio },
                                ] as { key: string; label: string; icon: React.ReactNode; value: string | null | undefined }[]).map(({ key, label, icon, value }) => (
                                    <div key={key} style={{
                                        background: 'var(--bg-main)',
                                        border: `1px solid ${editField === key ? 'var(--primary)' : 'var(--border)'}`,
                                        borderRadius: 12,
                                        padding: '14px 16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                        transition: 'border-color 0.15s',
                                        position: 'relative',
                                        minHeight: 64,
                                        justifyContent: 'center',
                                        boxSizing: 'border-box'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{icon}{label}</span>
                                            {editField !== key && (
                                                <button onClick={() => { setEditField(key); setEditFieldVal(value ?? ''); }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2, display: 'flex', transition: 'color 0.15s' }}
                                                    onMouseEnter={e => (e.currentTarget.style.color = '#6366f1')}
                                                    onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                            )}
                                        </div>
                                        {editField === key ? (
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <input autoFocus value={editFieldVal} onChange={e => setEditFieldVal(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleFieldSave(key); if (e.key === 'Escape') setEditField(null); }}
                                                    style={{ flex: 1, background: 'var(--bg-main)', border: '1px solid var(--primary)', borderRadius: 7, padding: '5px 9px', color: 'var(--text-main)', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif', minWidth: 0 }}
                                                />
                                                <button onClick={() => handleFieldSave(key)} disabled={savingField}
                                                    style={{ background: 'var(--primary)', border: 'none', borderRadius: 7, padding: '5px 10px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                                                    {savingField ? '…' : '✓'}
                                                </button>
                                                <button onClick={() => setEditField(null)}
                                                    style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 8px', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>✕</button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                <span style={{ fontSize: 14, fontWeight: 600, color: value ? 'var(--text-main)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                    {(value && (key === 'linkedin' || key === 'portfolio') && value.startsWith('http')) ? (
                                                        <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                                                            {value.replace(/^https?:\/\/(www\.)?/, '')}
                                                        </a>
                                                    ) : (
                                                        value ?? 'Não informado'
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                        
                        {c.isVagaView && (
                            <>
                                {skillsList.length > 0 && (
                                    <section>
                                        <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Habilidades</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {skillsList.map((s, i) => (
                                                <span key={i} style={{
                                                    background: 'rgba(99, 102, 241, 0.15)',
                                                    border: '1px solid rgba(99, 102, 241, 0.25)',
                                                    borderRadius: 8,
                                                    padding: '5px 14px',
                                                    fontSize: 12,
                                                    color: 'var(--text-main)',
                                                    fontWeight: 600,
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }}>{s}</span>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {c.answers && Object.entries(c.answers).filter(([key]) => 
                                    !key.startsWith('_') && 
                                    !['address', 'portfolio', 'cep', 'address_number', 'complement', 'linkedin', 'phone', 'email', 'name', 'location', 'gender', 'age'].includes(key)
                                ).length > 0 && (
                                    <section style={{ 
                                        border: '1px solid var(--border)', 
                                        borderRadius: 20, 
                                        padding: 24, 
                                        background: 'rgba(255,255,255,0.02)', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: 16
                                    }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <ClipboardList size={16} /> Respostas Adicionais
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            {Object.entries(c.answers)
                                                .filter(([key]) => !key.startsWith('_') && !['address', 'portfolio', 'cep', 'address_number', 'complement', 'linkedin', 'phone', 'email', 'name', 'location', 'gender', 'age'].includes(key))
                                                .map(([key, value]) => {
                                                    const questionLabel = (c as any).questionLabels?.[key] || key.replace(/_/g, ' ');
                                                    return (
                                                        <div key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12 }}>
                                                            <p style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.03em' }}>
                                                                {questionLabel}
                                                            </p>
                                                            <p style={{ fontSize: 14, color: 'var(--text-main)', margin: 0, fontWeight: 500 }}>
                                                                {typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : (value || '-')}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </section>
                                )}

                                <section style={{ 
                                    border: '1px solid rgba(99, 102, 241, 0.2)', 
                                    borderRadius: 20, 
                                    padding: 24, 
                                    background: 'rgba(99, 102, 241, 0.03)', 
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 20
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: '0', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <Zap size={16} fill="var(--primary)" /> Feedback da IA
                                        </p>
                                        {c.score !== null && c.score !== undefined && (
                                            <div style={{ 
                                                background: scoreColor(c.score), 
                                                color: '#fff', 
                                                padding: '4px 12px', 
                                                borderRadius: '12px', 
                                                fontSize: '14px', 
                                                fontWeight: 800,
                                                boxShadow: `0 4px 12px ${scoreColor(c.score)}44`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}>
                                                <span style={{ fontSize: 10, opacity: 0.9, fontWeight: 700 }}>SCORE:</span>
                                                {c.score}%
                                            </div>
                                        )}
                                    </div>
                                    
                                    {(c.analysis?.match_rationale || c.analysis?.score_justification || c.analysis?.summary || c.analysis?.general_analysis || c.analysis?.reasoning || c.analysis?.feedback || c.analysis?.analysis || c.analysis?.experience) && (
                                        <div>
                                            <p style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em', opacity: 0.8 }}>Análise da Nota</p>
                                            <div style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                {c.analysis?.match_rationale || c.analysis?.score_justification || c.analysis?.summary || c.analysis?.general_analysis || c.analysis?.reasoning || c.analysis?.feedback || c.analysis?.analysis || c.analysis?.experience}
                                            </div>
                                        </div>
                                    )}

                                    {(c.analysis?.strengths || c.analysis?.pros || c.analysis?.positive_points || c.analysis?.positivePoints || c.analysis?.pontos_positivos) && (
                                        <div style={{ borderTop: '1px solid rgba(34, 197, 94, 0.1)', paddingTop: 16 }}>
                                            <p style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Pontos Positivos do Currículo</p>
                                            <div style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                {(() => {
                                                    const val = c.analysis?.strengths || c.analysis?.pros || c.analysis?.positive_points || c.analysis?.positivePoints || c.analysis?.pontos_positivos;
                                                    return Array.isArray(val) ? val.join('\n') : val;
                                                })()}
                                            </div>
                                        </div>
                                    )}

                                    {(c.analysis?.redFlags || c.analysis?.weaknesses || c.analysis?.cons || c.analysis?.negative_points || c.analysis?.gaps || c.analysis?.pontos_atencao) && (
                                        <div style={{ borderTop: '1px solid rgba(239, 68, 68, 0.1)', paddingTop: 16 }}>
                                            <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Pontos de Atenção / Negativos</p>
                                            <div style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                {(() => {
                                                    const val = c.analysis?.redFlags || c.analysis?.weaknesses || c.analysis?.cons || c.analysis?.negative_points || c.analysis?.gaps || c.analysis?.pontos_atencao;
                                                    return Array.isArray(val) ? val.join('\n') : val;
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </>
                        )}

                        {!c.isVagaView && (
                            <section style={{ 
                                border: `1px solid ${chatActive ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`, 
                                borderRadius: 16, 
                                padding: '16px 20px', 
                                background: chatActive ? 'rgba(34,197,94,0.03)' : 'rgba(99,102,241,0.02)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                gap: 14,
                                transition: 'all 0.3s'
                            }}>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: chatActive ? '#22c55e' : 'var(--text-main)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Phone size={14} color={chatActive ? '#22c55e' : 'var(--text-dim)'} /> 
                                        CONVERSA WHATSAPP
                                    </p>
                                    <p style={{ 
                                        fontSize: 12, 
                                        color: phoneError ? '#ef4444' : (chatActive ? '#22c55e' : 'var(--text-dim)'), 
                                        fontWeight: chatActive ? 700 : 400,
                                        margin: 0, 
                                        maxWidth: '300px' 
                                    }}>
                                        {phoneError || (chatActive 
                                            ? 'Chat habilitado ! ✅' 
                                            : 'Habilite o candidato para iniciar conversas em tempo real via Chat.'
                                        )}
                                    </p>
                                </div>

                                <button
                                    onClick={chatActive ? handleDeactivateChat : handleActivateChat}
                                    disabled={activatingChat}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        background: chatActive ? 'rgba(239,68,68,0.05)' : 'transparent',
                                        border: `1px solid ${chatActive ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
                                        borderRadius: 12, padding: '10px 20px',
                                        color: chatActive ? '#ef4444' : 'var(--text-dim)',
                                        fontSize: 13, fontWeight: 700,
                                        cursor: activatingChat ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s', whiteSpace: 'nowrap',
                                    }}
                                    onMouseEnter={e => {
                                        if (chatActive) {
                                            e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                                            e.currentTarget.style.borderColor = '#ef4444';
                                        } else if (!activatingChat) {
                                            e.currentTarget.style.background = 'rgba(99,102,241,0.05)';
                                            e.currentTarget.style.borderColor = 'var(--primary)';
                                            e.currentTarget.style.color = 'var(--primary)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (chatActive) {
                                            e.currentTarget.style.background = 'rgba(239,68,68,0.05)';
                                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
                                        } else if (!activatingChat) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.borderColor = 'var(--border)';
                                            e.currentTarget.style.color = 'var(--text-dim)';
                                        }
                                    }}
                                >
                                    {activatingChat ? <Loader size={16} className="spin" /> : (chatActive ? <X size={15} /> : <Zap size={15} />)}
                                    {chatActive ? 'Desativar Chat' : 'Habilitar Chat'}
                                </button>
                            </section>
                        )}

                        {!c.isVagaView && (
                            <section style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 20, background: 'rgba(239,68,68,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: c.is_blacklisted ? '#ef4444' : 'var(--text-main)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Ban size={14} /> Lista de Restrição (Blacklist)
                                    </p>
                                    <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0, maxWidth: '300px' }}>
                                        {c.is_blacklisted 
                                            ? 'Candidato restrito. Remova da lista para voltar a considerá-lo.' 
                                            : 'Sinalize candidatos que não devem ser considerados para futuras oportunidades.'
                                        }
                                    </p>
                                </div>
                                <button
                                    onClick={toggleBlacklist}
                                    disabled={togglingBlacklist}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        background: c.is_blacklisted ? 'rgba(239,68,68,0.1)' : 'transparent',
                                        border: `1px solid ${c.is_blacklisted ? '#ef4444' : 'var(--border)'}`,
                                        borderRadius: 12, padding: '10px 20px',
                                        color: c.is_blacklisted ? '#ef4444' : 'var(--text-dim)',
                                        fontSize: 13, fontWeight: 700,
                                        cursor: togglingBlacklist ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s', whiteSpace: 'nowrap',
                                    }}
                                    onMouseEnter={e => {
                                        if (!c.is_blacklisted) {
                                            e.currentTarget.style.background = 'rgba(239,68,68,0.05)';
                                            e.currentTarget.style.borderColor = '#ef4444';
                                            e.currentTarget.style.color = '#ef4444';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!c.is_blacklisted) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.borderColor = 'var(--border)';
                                            e.currentTarget.style.color = 'var(--text-dim)';
                                        }
                                    }}
                                >
                                    {togglingBlacklist ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Ban size={14} />}
                                    {c.is_blacklisted ? 'Remover da Lista' : 'Restringir Candidato'}
                                </button>
                            </section>
                        )}



                        {!c.isVagaView && skillsList.length > 0 && (
                            <section>
                                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Habilidades</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {skillsList.map((s, i) => (
                                        <span key={i} style={{
                                            background: 'rgba(99, 102, 241, 0.15)',
                                            border: '1px solid rgba(99, 102, 241, 0.25)',
                                            borderRadius: 8,
                                            padding: '5px 14px',
                                            fontSize: 12,
                                            color: 'var(--text-main)',
                                            fontWeight: 600,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}>{s}</span>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                            {!c.isVagaView ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 16, background: 'var(--bg-main)', borderRadius: 12, padding: 4 }}>
                                    <button onClick={() => setActiveTab('vagas')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: activeTab === 'vagas' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'vagas' ? 'var(--text-main)' : 'var(--text-dim)', boxShadow: activeTab === 'vagas' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none' }}>
                                        <Briefcase size={12} />
                                        Vagas {c.applications.length > 0 && <span style={{ background: activeTab === 'vagas' ? 'var(--primary)' : 'var(--bg-main)', color: activeTab === 'vagas' ? '#fff' : 'var(--text-dim)', borderRadius: 20, padding: '1px 7px', fontSize: 10 }}>{c.applications.length}</span>}
                                    </button>
                                    <button onClick={() => setActiveTab('triagem')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: activeTab === 'triagem' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'triagem' ? 'var(--text-main)' : 'var(--text-dim)', boxShadow: activeTab === 'triagem' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none' }}>
                                        <Activity size={12} />
                                        Triagem
                                    </button>
                                    <button onClick={() => setActiveTab('comments')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: activeTab === 'comments' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'comments' ? 'var(--text-main)' : 'var(--text-dim)', boxShadow: activeTab === 'comments' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none' }}>
                                        <MessageSquare size={12} />
                                        Notas {comments.length > 0 && <span style={{ background: activeTab === 'comments' ? 'var(--primary)' : 'var(--bg-main)', color: activeTab === 'comments' ? '#fff' : 'var(--text-dim)', borderRadius: 20, padding: '1px 7px', fontSize: 10 }}>{comments.length}</span>}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <p style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Notas do Recrutador</p>
                                    {comments.length > 0 && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{comments.length}</span>}
                                </div>
                            )}

                            {activeTab === 'vagas' && (
                                <div>
                                    <button onClick={() => setVagasOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 0 10px', width: '100%' }}>
                                        <span style={{ transition: 'transform 0.2s', transform: vagasOpen ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block' }}>▾</span>
                                        {vagasOpen ? 'Recolher todas' : `Expandir ${c.applications.length} vaga${c.applications.length !== 1 ? 's' : ''}`}
                                    </button>

                                    {vagasOpen && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {c.applications.length === 0 ? <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nenhuma vaga associada.</p> :
                                                c.applications.map(app => (
                                                    <div key={app.jobId} style={{ background: 'var(--bg-main)', border: `1px solid ${expandedJob === app.jobId ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden' }}>
                                                        <div onClick={() => setExpandedJob(expandedJob === app.jobId ? null : app.jobId)} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                                <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: 13, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    {app.jobName}
                                                                    {app.jobCode && <span style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{app.jobCode}</span>}
                                                                </p>
                                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                    <span style={{ background: scoreColor(app.score), color: '#fff', borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{app.score}% match</span>
                                                                    <span style={{ fontSize: 11, color: '#64748b' }}>{formatDate(app.appliedAt)}</span>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                {(app.resume_url || c.resume_url) && (
                                                                    <button 
                                                                        onClick={e => { 
                                                                            e.stopPropagation(); 
                                                                            handleViewResume(app.resume_url || c.resume_url);
                                                                        }} 
                                                                        title="Ver currículo desta inscrição"
                                                                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 7, cursor: 'pointer', color: 'var(--primary)', display: 'flex' }}
                                                                    >
                                                                        <FileText size={14} />
                                                                    </button>
                                                                )}
                                                                <button onClick={e => { e.stopPropagation(); navigate(`/analise/${app.jobId}`); }} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 7, cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}><Eye size={14} /></button>
                                                                <span style={{ transition: 'transform 0.2s', transform: expandedJob === app.jobId ? 'rotate(180deg)' : 'none' }}>▾</span>
                                                            </div>
                                                        </div>
                                                        {expandedJob === app.jobId && (
                                                            <div style={{ borderTop: '1px solid var(--border)', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                                {(app.experience || c.experience) && (
                                                                    <div>
                                                                        <p style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Análise da Nota</p>
                                                                        <p style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>{app.experience || c.experience}</p>
                                                                    </div>
                                                                )}
                                                                {(app.positivePoints) && (
                                                                    <div>
                                                                        <p style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Pontos Positivos</p>
                                                                        <p style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>{app.positivePoints}</p>
                                                                    </div>
                                                                )}
                                                                {(app.education || c.education) && (
                                                                    <div>
                                                                        <p style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Formação</p>
                                                                        <p style={{ fontSize: 13, color: 'var(--text-main)', margin: 0 }}>{app.education || c.education}</p>
                                                                    </div>
                                                                )}
                                                                {(app.redFlags || c.redFlags) && (
                                                                    <div>
                                                                        <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Pontos de Atenção</p>
                                                                        <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none' }}>{(app.redFlags || c.redFlags || '').split('\n').filter(Boolean).map((line, i) => <li key={i} style={{ fontSize: 13, color: '#fca5a5', marginBottom: 4 }}>• {line}</li>)}</ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'triagem' && (
                                <div style={{ minHeight: 100 }}>
                                    {loadingLogs ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}><Loader className="animate-spin" size={20} color="var(--primary)" /></div>
                                    ) : screeningLogs.length === 0 ? (
                                        <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>Nenhum log de triagem ainda.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            {(Object.entries(
                                                screeningLogs.reduce((acc, log) => {
                                                    const groupId = log.details?.pipeline_id || log.details?.job_id || 'unknown';
                                                    const groupName = log.details?.pipeline_name || log.details?.job_name || (log.action === 'inclusion' ? log.to_stage : null) || 'Vaga não identificada';
                                                    if (!acc[groupId]) acc[groupId] = { name: groupName, logs: [] };
                                                    acc[groupId].logs.push(log);
                                                    return acc;
                                                }, {} as Record<string, {name: string, logs: any[]}>)
                                            ) as [string, {name: string, logs: any[]}][]).map(([jobId, group]) => (
                                                <div key={jobId} style={{ 
                                                    background: 'var(--bg-main)', 
                                                    border: '1px solid var(--border)', 
                                                    borderRadius: 12, 
                                                    overflow: 'hidden',
                                                    transition: 'all 0.2s'
                                                }}>
                                                    <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: expandedLogJob === jobId ? '1px solid var(--border)' : 'none' }}>
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <p style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                Processo seletivo - {group.name}
                                                            </p>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setExpandedLogJob(expandedLogJob === jobId ? null : jobId); }}
                                                            style={{ 
                                                                background: expandedLogJob === jobId ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)', 
                                                                border: `1px solid ${expandedLogJob === jobId ? 'var(--primary)' : 'var(--border)'}`, 
                                                                borderRadius: 8, padding: '4px 10px', cursor: 'pointer', 
                                                                color: expandedLogJob === jobId ? 'var(--primary)' : 'var(--text-dim)', 
                                                                fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 
                                                            }}
                                                        >
                                                            {expandedLogJob === jobId ? 'Recolher Log' : 'Ver Log Completo'}
                                                            <span style={{ transition: 'transform 0.2s', transform: expandedLogJob === jobId ? 'rotate(180deg)' : 'none' }}>▼</span>
                                                        </button>
                                                    </div>

                                                    {expandedLogJob === jobId && (
                                                        <div style={{ padding: '16px 20px', position: 'relative' }}>
                                                            <div style={{ position: 'absolute', left: 24.5, top: 16, bottom: 16, width: 1, background: 'var(--border)' }} />
                                                            {group.logs.map((log: any, i: number) => (
                                                                <div key={log.id} style={{ position: 'relative', paddingLeft: 24, paddingBottom: i === group.logs.length - 1 ? 0 : 20 }}>
                                                                    <div style={{ 
                                                                        position: 'absolute', left: -4, top: 2, width: 9, height: 9, borderRadius: '50%', 
                                        background: i === 0 ? 'var(--primary)' : 'var(--bg-card)', 
                                                                        border: `2px solid ${i === 0 ? 'var(--primary)' : 'var(--border)'}`, 
                                                                        boxShadow: i === 0 ? '0 0 8px var(--primary)' : 'none' 
                                                                    }} />
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>
                                                                            {log.action === 'inclusion' ? 'Candidato incluído na vaga' : 
                                                                             log.action === 'move' ? 'Transição de Etapa' : log.action}
                                                                        </span>
                                                                        <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, lineHeight: '1.4' }}>
                                                                            {log.action === 'inclusion' && `Etapa inicial: ${log.to_stage}`}
                                                                            {log.action === 'move' && `Mudou de ${log.from_stage} para ${log.to_stage}`}
                                                                        </p>
                                                                        <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                                            <Clock size={9} /> {relativeTime(log.created_at)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'comments' && (
                                <div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                                        {comments.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>Nenhum comentário ainda.</p>}
                                        {comments.map(cm => (
                                            <div key={cm.id} className="comment-row" style={{ display: 'flex', gap: 12 }}>
                                                {renderAvatar(cm.author)}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{cm.author?.name || 'Recrutador'}</span>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {relativeTime(cm.createdAt)}</span>
                                                    </div>
                                                    {editingId === cm.id ? (
                                                        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--primary)', borderRadius: '4px 16px 16px 16px', padding: '12px' }}>
                                                            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} autoFocus style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: 13, lineHeight: '1.6', resize: 'none', outline: 'none' }} />
                                                            <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                                                                <button onClick={() => setEditingId(null)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                                                                <button onClick={() => handleEditSave(cm.id)} style={{ background: 'var(--primary)', border: 'none', borderRadius: 8, padding: '5px 16px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', padding: '12px 14px', position: 'relative' }}>
                                                            <p style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: '1.6', margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{cm.text}</p>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 24 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                                                                    {!cm.reaction ? (
                                                                        <div className="comment-actions" style={{ display: 'flex', alignItems: 'center' }}>
                                                                            <button
                                                                                onClick={() => setPickerOpenId(pickerOpenId === cm.id ? null : cm.id)}
                                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: pickerOpenId === cm.id ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2, transition: 'color 0.2s' }}
                                                                            >
                                                                                <Smile size={18} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => setPickerOpenId(pickerOpenId === cm.id ? null : cm.id)}
                                                                            style={{ background: 'rgba(99,102,241,0.15)', border: pickerOpenId === cm.id ? '1px solid var(--primary)' : '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'all 0.2s' }}
                                                                        >
                                                                            <span style={{ fontSize: 14 }}>{cm.reaction}</span>
                                                                            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700 }}>1</span>
                                                                        </button>
                                                                    )}
                                                                    {pickerOpenId === cm.id && (
                                                                        <div className="emoji-picker-bar">
                                                                            {['❤️', '👍', '💡', '👏', '😂', '😮'].map(emoji => (
                                                                                <span
                                                                                    key={emoji}
                                                                                    className="emoji-option"
                                                                                    onClick={(e) => { e.stopPropagation(); handleReaction(cm.id, emoji); setPickerOpenId(null); }}
                                                                                >
                                                                                    {emoji}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="comment-actions" style={{ display: 'flex', gap: 12 }}>
                                                                    <button onClick={() => { setEditingId(cm.id); setEditText(cm.text); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                                        Editar
                                                                    </button>
                                                                    <button onClick={() => handleDelete(cm.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.7)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                        <X size={12} />
                                                                        Apagar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                        {renderAvatar({ name: profile.userName, avatarUrl: profile.avatarUrl, initials: profile.initials })}
                                        <div style={{ flex: 1, position: 'relative' }}>
                                            <textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="Adicione um comentário…" rows={3} style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 16, padding: '12px 14px 44px', color: 'var(--text-main)', fontSize: 13, lineHeight: '1.6', resize: 'none', outline: 'none' }} />
                                            <div style={{ position: 'absolute', right: 10, bottom: 10 }}>
                                                <button
                                                    onClick={handleAddComment}
                                                    disabled={saving || !newText.trim()}
                                                    className="publish-btn"
                                                    style={{ border: 'none', borderRadius: 10, padding: '8px 20px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, opacity: newText.trim() ? 1 : 0.5 }}
                                                >
                                                    {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageSquare size={15} />}
                                                    Publicar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {!c.hideBankButton && c.status !== 'talent_bank' && (currentJobContext?.id || c.applications[0]?.jobId ? (
                    <div style={{ padding: '0 24px 32px' }}>
                        <button
                            onClick={() => setTransferringToBank(true)}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                background: '#10b981',
                                border: 'none',
                                borderRadius: '16px',
                                padding: '16px',
                                color: '#fff',
                                fontSize: '15px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.3)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
                            }}
                        >
                            <UserPlus size={18} />
                            Mover para Banco de Talentos
                        </button>
                    </div>
                ) : null
                )}
            </div>

            {transferringToBank && (
                <TalentTransferModal
                    candidate={{
                        id: c.id,
                        name: c.name,
                        email: c.email,
                        phone: localC.phone,
                        location: localC.location,
                        linkedin: localC.linkedin,
                        age: localC.age,
                        gender: localC.gender,
                        address: localC.address,
                        portfolio: localC.portfolio,
                        cep: localC.cep,
                        address_number: localC.address_number,
                        complement: localC.complement,
                        resume_url: c.resume_url,
                        match_score: c.score || 0,
                        notes: c.notes,
                        answers: { _ai_analysis: c.analysis }
                    }}
                    job={{
                        id: currentJobContext?.id || c.applications[0]?.jobId,
                        title: currentJobContext?.title || c.applications[0]?.jobName || 'Banco de Talentos',
                        organization_id: profile.organization_id
                    }}
                    onClose={() => setTransferringToBank(null as any)}
                    onSuccess={() => {
                        setTransferringToBank(false);
                        if (onTransferSuccess) onTransferSuccess();
                    }}
                />
            )}
        </>
    );
}

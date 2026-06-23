import { useState, useEffect, useRef } from 'react';
import { Search, Phone, MoreVertical, FileText, Send, MessageSquare, Loader, Zap, Plus, X } from 'lucide-react';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { EvolutionApiService } from '../../core/services/evolutionApi';
import type { EvolutionMessage } from '../../core/services/evolutionApi';

// Interface Message removida em favor de EvolutionMessage

interface CandidateRow { name?: string; phone?: string }
interface AvailableCandidate { id: string; name: string; phone?: string }

// initialConvs removido para usar dados do banco

function scoreColor(s: number) {
    return s >= 70 ? '#22c55e' : s >= 40 ? '#f59e0b' : '#ef4444';
}

export function Chat() {
    const { profile } = useUser();
    const [convs, setConvs] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'todos' | 'nao-lidos' | 'agendados'>('todos');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    interface Conversation { id: string; name: string; initials: string; color: string; online: boolean; time: string; preview: string; unread: number; candidate: string; vaga: string; score: number; msgs: EvolutionMessage[]; phone: string; candidate_id?: string; updated_at?: string }

    // Novas conversas
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [availableCandidates, setAvailableCandidates] = useState<AvailableCandidate[]>([]);
    const [candSearch, setCandSearch] = useState('');
    const [loadingCands, setLoadingCands] = useState(false);
    const [inputText, setInputText] = useState('');
    
    const activeConv = convs.find(c => c.id === activeId);

    const hasCredentials = profile?.evolution_api_url && profile?.evolution_api_key && profile?.evolution_instance;
    const api = hasCredentials ? new EvolutionApiService(
        profile.evolution_api_url!,
        profile.evolution_api_key!,
        profile.evolution_instance!
    ) : null;

    const loadConversationsRef = useRef<() => Promise<void> | null>(null);
    loadConversationsRef.current = loadConversations;

    useEffect(() => {
        if (profile?.userId) loadConversationsRef.current?.();
    }, [profile?.userId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeConv?.msgs]);

    async function loadConversations() {
        if (!profile?.userId) return;
        setLoading(true);
        // ... (resto da função loadConversations permanece igual, apenas adicionei o check inicial)
        try {
            const { data, error } = await supabase
                .from('candidate_conversations')
                .select(`
                    candidate_id,
                    messages,
                    updated_at,
                    candidate:candidates!inner (
                        id,
                        name,
                        avatar_url,
                        phone
                    )
                `)
                .eq('user_id', profile.userId)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            type ConversationQueryRow = { candidate_id: string; messages?: EvolutionMessage[]; updated_at?: string; candidate?: CandidateRow[] };
            const mapped: Conversation[] = (data || []).map((row: ConversationQueryRow) => {
                const c = row.candidate?.[0];
                const msgs = row.messages ?? [];
                const lastMsg = msgs[msgs.length - 1];

                return {
                    id: row.candidate_id,
                    name: c?.name || 'Candidato Desconhecido',
                    initials: c?.name ? c.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?',
                    color: '#6366f1',
                    online: false,
                    time: row.updated_at ? new Date(row.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                    preview: lastMsg?.text || 'Nova conversa ativada',
                    unread: 0,
                    candidate: c?.name || '',
                    vaga: 'WhatsApp',
                    score: 0,
                    msgs: msgs,
                    phone: c?.phone || ''
                };
            });

            setConvs(mapped);
        } catch (err) {
            console.error('[Chat] Erro ao carregar:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleSend = async () => {
        if (!inputText.trim() || !activeId || !api || sending) return;
        if (!activeConv?.phone) {
            alert('Candidato sem telefone cadastrado.');
            return;
        }

        setSending(true);
        const text = inputText;
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const newMessage: EvolutionMessage = {
            from: 'me',
            text,
            time,
            timestamp: Date.now()
        };

        try {
            await api.sendMessage(activeConv.phone, text);
            
            const updatedMsgs = [...activeConv.msgs, newMessage];
            setConvs(prev => prev.map(c => c.id === activeId
                ? { ...c, msgs: updatedMsgs, preview: text, time }
                : c
            ));
            
            await api.saveLocalHistory(activeId, profile.userId, updatedMsgs);
            setInputText('');
        } catch (err: unknown) {
            console.error('[Chat] Erro ao enviar:', err);
            alert(`Falha ao enviar: ${(err as Error).message}`);
        } finally {
            setSending(false);
        }
    };

    async function loadAvailableCandidates() {
        if (!profile?.userId) return;
        setLoadingCands(true);
        try {
            const { data, error } = await supabase
                .from('candidates')
                .select('id, name, phone')
                .eq('user_id', profile.userId)
                .not('phone', 'is', null)
                .order('name');
            if (error) throw error;
            console.log('[Chat] Candidatos carregados:', data?.length);
            setAvailableCandidates(data || []);
        } catch (err) {
            console.error('[Chat] Erro ao carregar candidatos:', err);
        } finally {
            setLoadingCands(false);
        }
    }

    async function startNewChat(cand: { id: string; name: string }) {
        if (!profile?.userId) return;
        try {
            const { data: existing } = await supabase
                .from('candidate_conversations')
                .select('candidate_id')
                .eq('candidate_id', cand.id)
                .single();

            if (!existing) {
                await supabase.from('candidate_conversations').insert({
                    candidate_id: cand.id,
                    user_id: profile.userId,
                    messages: []
                });
            }

            setShowNewChatModal(false);
            await loadConversations();
            setActiveId(cand.id);
        } catch (err) {
            console.error('[Chat] Erro ao iniciar:', err);
        }
    }

    const filteredConvs = convs.filter(c => {
        const q = search.toLowerCase();
        const matchesSearch = c.name.toLowerCase().includes(q) || c.vaga.toLowerCase().includes(q) || c.candidate.toLowerCase().includes(q);
        const matchesFilter = filter === 'todos' || (filter === 'nao-lidos' && c.unread > 0);
        return matchesSearch && matchesFilter;
    });

    const filterLabels: Record<string, string> = { 'todos': 'Todos', 'nao-lidos': 'Não lidos', 'agendados': 'Agendados' };

    return (
        <>
            <style>{`
                @keyframes typing-dot {
                    0%,80%,100%{opacity:0.25;transform:translateY(0)}
                    40%{opacity:1;transform:translateY(-4px)}
                }
                .chat-input::placeholder { color: var(--text-dim); }
                .chat-input:focus { outline:none; border-color:var(--border-focus) !important; }
                .conv-row {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    margin-bottom: 10px;
                    transition: all 0.2s ease;
                }
                .conv-row:hover {
                    box-shadow: 0 4px 20px rgba(0,0,0,0.25);
                    border-color: rgba(99,102,241,0.3);
                }
                .conv-row.active {
                    border-color: rgba(99,102,241,0.5);
                    background: rgba(99,102,241,0.06);
                }
                .chat-send-btn:hover { background: var(--primary-hover) !important; transform: scale(1.05); }
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000; backdrop-filter: blur(8px);
                    animation: fadeIn 0.2s ease-out;
                }
                .modal-content {
                    background: #111827;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 20px;
                    width: 450px; max-width: 90%;
                    max-height: 80vh;
                    display: flex; flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 25px 70px rgba(0,0,0,0.6);
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .cand-item { border-bottom: 1px solid rgba(255,255,255,0.03); }
                .cand-item:hover { background: rgba(99,102,241,0.1); }
                .cand-item:last-child { border-bottom: none; }
            `}</style>

            {/* Container principal — mesma estrutura do Pipeline */}
            <div style={{
                display: 'flex',
                height: 'calc(100vh - 100px)',
                background: 'var(--bg-main)',   /* igual ao fundo do Pipeline */
                borderRadius: '16px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
            }}>

                {/* ── SIDEBAR ── mesma cor das colunas do Pipeline (bg-main) */}
                <div style={{
                    width: '290px',
                    minWidth: '290px',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRight: '1px solid var(--border)',
                    background: 'var(--bg-main)',
                    minHeight: 0,
                }}>
                    {/* Header */}
                    <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            Mensagens
                        </h2>
                        <button 
                            onClick={() => {
                                setShowNewChatModal(true);
                                loadAvailableCandidates();
                            }}
                            title="Nova Conversa"
                            style={{
                                background: 'rgba(99,102,241,0.1)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: '8px',
                                padding: '6px',
                                cursor: 'pointer',
                                color: '#a78bfa',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                        {/* Busca — mesma estética dos inputs do Pipeline */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'var(--bg-card)',           /* mesmo dos pipe-cards */
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            padding: '8px 12px',
                        }}>
                            <Search size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                            <input
                                type="text"
                                placeholder="Buscar contato ou vaga..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="chat-input"
                                style={{
                                    background: 'none', border: 'none', fontSize: '13px',
                                    color: 'var(--text-main)', width: '100%',
                                }}
                            />
                        </div>

                    {/* Filtros */}
                    <div style={{ display: 'flex', gap: '6px', padding: '10px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                        {(['todos', 'nao-lidos', 'agendados'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)} style={{
                                fontSize: '11px', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer',
                                border: '1px solid',
                                borderColor: filter === f ? 'rgba(99,102,241,0.4)' : 'var(--border)',
                                color: filter === f ? '#a78bfa' : 'var(--text-dim)',
                                background: filter === f ? 'rgba(99,102,241,0.12)' : 'transparent',
                                fontWeight: filter === f ? 600 : 400,
                                transition: 'all 0.15s',
                            }}>{filterLabels[f]}</button>
                        ))}
                    </div>

                    {/* Lista de conversas */}
                    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', minHeight: 0 }}>
                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader size={24} className="spin" /></div>
                        ) : filteredConvs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)', fontSize: 13 }}>
                                Nenhuma conversa ativada. Vá ao Board de Candidatos para iniciar um chat.
                            </div>
                        ) : filteredConvs.map(c => (
                            <div key={c.id} className={`conv-row ${activeId === c.id ? 'active' : ''}`} onClick={() => {
                                setActiveId(c.id);
                                setConvs(prev => prev.map(x => x.id === c.id ? { ...x, unread: 0 } : x));
                            }} style={{
                                display: 'flex', alignItems: 'center', gap: '11px',
                                padding: '14px', cursor: 'pointer',
                            }}>
                                {/* Avatar — com a cor da conversa, igual ao dot da coluna do Pipeline */}
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%',
                                    background: `${c.color}22`,
                                    color: c.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '13px', fontWeight: 700, flexShrink: 0, position: 'relative',
                                    border: `1px solid ${c.color}44`,
                                }}>
                                    {c.initials}
                                    {c.online && (
                                        <div style={{
                                            position: 'absolute', bottom: '1px', right: '1px',
                                            width: '9px', height: '9px', borderRadius: '50%',
                                            background: '#22c55e', border: '2px solid var(--bg-main)',
                                        }} />
                                    )}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                                        {c.preview}
                                    </div>
                                    {/* Tag do candidato — igual ao .pipe-col-header-dot estilo */}
                                    <span style={{
                                        fontSize: '10px', fontWeight: 600,
                                        color: c.color,
                                        background: `${c.color}15`,
                                        border: `1px solid ${c.color}25`,
                                        borderRadius: '4px', padding: '1px 6px',
                                        marginTop: '4px', display: 'inline-block',
                                    }}>{c.candidate}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── ÁREA PRINCIPAL DO CHAT ── fundo da área de visualização */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', minHeight: 0, minWidth: 0 }}>
                    {activeConv ? (
                        <>
                            {/* Header da conversa */}
                            <div style={{
                                background: 'transparent',
                                padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px',
                                borderBottom: '1px solid var(--border)',
                            }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    background: `${activeConv.color}22`, color: activeConv.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '12px', fontWeight: 700,
                                    border: `1px solid ${activeConv.color}44`,
                                }}>
                                    {activeConv.initials}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{activeConv.name}</div>
                                    <div style={{ fontSize: '11px', color: activeConv.online ? '#22c55e' : 'var(--text-dim)', marginTop: '1px' }}>
                                        {activeConv.online ? 'Online agora' : 'Visto por último hoje'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {[<Phone size={17} />, <MoreVertical size={17} />].map((icon, i) => (
                                        <button key={i} className="pipe-btn" style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            padding: '6px', borderRadius: '8px', color: 'var(--text-dim)',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                                        >{icon}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Banner candidato — igual a um pipe-card leve */}
                            <div style={{
                                background: 'rgba(99,102,241,0.06)',
                                borderBottom: '1px solid rgba(99,102,241,0.15)',
                                padding: '7px 20px',
                                display: 'flex', alignItems: 'center', gap: '10px',
                            }}>
                                <FileText size={13} style={{ color: '#6366f1', flexShrink: 0 }} />
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Candidato:</span>
                                <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 600 }}>
                                    {activeConv.candidate} · {activeConv.vaga}
                                </span>
                                <span style={{
                                    marginLeft: 'auto', fontSize: '11px', fontWeight: 700,
                                    color: scoreColor(activeConv.score),
                                    background: `${scoreColor(activeConv.score)}20`,
                                    borderRadius: '20px', padding: '2px 10px',
                                    border: `1px solid ${scoreColor(activeConv.score)}40`,
                                }}>★ {activeConv.score}/100</span>
                            </div>

                            {/* Mensagens */}
                            <div style={{
                                flex: 1, overflowY: 'auto', padding: '20px',
                                display: 'flex', flexDirection: 'column', gap: '10px',
                                minHeight: 0,
                            }}>
                                <div style={{
                                    textAlign: 'center', fontSize: '11px', fontWeight: 500,
                                    color: 'var(--text-dim)',
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                                    borderRadius: '6px', padding: '3px 12px', margin: '0 auto',
                                }}>Hoje</div>

                                {activeConv.msgs.map((m, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex', flexDirection: 'column',
                                        maxWidth: '70%',
                                        alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start',
                                    }}>
                                        {/* Balão */}
                                        <div style={{
                                            padding: '10px 16px', borderRadius: '16px',
                                            fontSize: '13px', lineHeight: '1.55',
                                            background: m.from === 'me' ? activeConv.color : 'var(--bg-main)',
                                            color: m.from === 'me' ? '#ffffff' : 'var(--text-main)',
                                            border: 'none',
                                            borderBottomRightRadius: m.from === 'me' ? '4px' : '16px',
                                            borderBottomLeftRadius: m.from === 'them' ? '4px' : '16px',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                        }}>{m.text}</div>
                                        <div style={{
                                            fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px',
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start',
                                        }}>
                                            {m.time}
                                            {m.from === 'me' && <span style={{ color: '#22c55e' }}>✓✓</span>}
                                        </div>
                                    </div>
                                ))}

                                <div ref={messagesEndRef} />
                            </div>

                             {/* Campo de envio */}
                             <div style={{
                                 background: 'transparent', borderTop: '1px solid var(--border)',
                                 padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px',
                             }}>
                                 {!hasCredentials ? (
                                     <div style={{ flex: 1, color: '#f59e0b', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                         <Zap size={14} /> Configure a API para enviar mensagens.
                                     </div>
                                 ) : (
                                     <>
                                         <input
                                             className="chat-input"
                                             type="text"
                                             placeholder="Mensagem..."
                                             value={inputText}
                                             onChange={e => setInputText(e.target.value)}
                                             onKeyDown={e => e.key === 'Enter' && handleSend()}
                                             disabled={sending}
                                             style={{
                                                 flex: 1,
                                                 background: 'var(--bg-main)',
                                                 border: '1px solid var(--border)',
                                                 borderRadius: '24px', padding: '10px 18px',
                                                 fontSize: '13px', color: 'var(--text-main)',
                                                 transition: 'border-color 0.2s',
                                             }}
                                         />
                                         <button
                                             className="chat-send-btn"
                                             onClick={handleSend}
                                             disabled={sending || !inputText.trim()}
                                             style={{
                                                 width: '38px', height: '38px', borderRadius: '50%',
                                                 background: activeConv.color, border: 'none', cursor: 'pointer',
                                                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                 flexShrink: 0, color: 'white',
                                                 boxShadow: `0 2px 8px ${activeConv.color}66`,
                                                 transition: 'background 0.2s, transform 0.15s',
                                                 opacity: sending ? 0.6 : 1
                                             }}
                                         >
                                             {sending ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
                                         </button>
                                     </>
                                 )}
                             </div>
                        </>
                    ) : (
                        /* Estado vazio — igual ao drop-zone vazio das colunas do Pipeline */
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '12px',
                        }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '16px',
                                background: 'rgba(99,102,241,0.1)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <MessageSquare size={26} style={{ color: '#6366f1' }} />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px' }}>
                                    Nenhuma conversa selecionada
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>
                                    Selecione uma conversa para começar
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showNewChatModal && (
                <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Nova Conversa</h3>
                            <button onClick={() => setShowNewChatModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        
                        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px' }}>
                                <Search size={14} style={{ color: 'var(--text-dim)' }} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar candidato..." 
                                    value={candSearch}
                                    onChange={e => setCandSearch(e.target.value)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '13px', width: '100%', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
                            {loadingCands ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Loader className="spin" size={24} /></div>
                            ) : availableCandidates.filter(c => c.name.toLowerCase().includes(candSearch.toLowerCase())).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)', fontSize: '13px' }}>Nenhum candidato encontrado.</div>
                            ) : availableCandidates.filter(c => c.name.toLowerCase().includes(candSearch.toLowerCase())).map(cand => (
                                <div key={cand.id} className="cand-item" onClick={() => startNewChat(cand)} style={{
                                    padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s'
                                }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700
                                    }}>{cand.name.split(' ').map((n: string)=>n[0]).join('').toUpperCase().slice(0,2)}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{cand.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{cand.phone}</div>
                                    </div>
                                    <Plus size={14} style={{ color: 'var(--text-dim)' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Chat;

import { useState, useEffect, useRef } from 'react';
import { Search, Phone, MoreVertical, FileText, Send, MessageSquare } from 'lucide-react';

interface Message {
    from: 'me' | 'them';
    text: string;
    time: string;
}

interface Conversation {
    id: number;
    name: string;
    initials: string;
    color: string;
    online: boolean;
    time: string;
    preview: string;
    unread: number;
    candidate: string;
    vaga: string;
    score: number;
    msgs: Message[];
}

const initialConvs: Conversation[] = [
    {
        id: 1, name: 'Rafael Costa', initials: 'RC', color: '#6366f1', online: true, time: '14:35', preview: 'Pode ser quinta às 15h', unread: 0, candidate: 'Ana Lima', vaga: 'UX Designer · V2', score: 92,
        msgs: [
            { from: 'them', text: 'Olá! Vi o perfil da Ana Lima. Ela tem portfólio?', time: '14:32' },
            { from: 'me', text: 'Oi Rafael! Sim, link no currículo. IA avaliou 92/100 de compatibilidade.', time: '14:33' },
            { from: 'them', text: 'Ótimo! Quero agendar entrevista essa semana.', time: '14:34' },
            { from: 'me', text: 'Prefere manhã ou tarde?', time: '14:34' },
            { from: 'them', text: 'Tarde — quinta ou sexta.', time: '14:35' },
        ]
    },
    {
        id: 2, name: 'Juliana Mendes', initials: 'JM', color: '#0ea5e9', online: true, time: '13:50', preview: 'Confirmei para amanhã 10h ✓', unread: 2, candidate: 'Carlos Souza', vaga: 'Dev Backend · V1', score: 87,
        msgs: [
            { from: 'them', text: 'Carlos passou na triagem técnica?', time: '13:40' },
            { from: 'me', text: 'Sim! Score 87, forte em Node e Python.', time: '13:42' },
            { from: 'them', text: 'Perfeito. Vou agendar entrevista técnica.', time: '13:48' },
            { from: 'them', text: 'Confirmei para amanhã 10h.', time: '13:50' },
        ]
    },
    {
        id: 3, name: 'Bruno Alves', initials: 'BA', color: '#f59e0b', online: false, time: '11:20', preview: 'Obrigado, vou analisar o CV', unread: 0, candidate: 'Mariana Torres', vaga: 'Product Manager · V3', score: 78,
        msgs: [
            { from: 'me', text: 'Bruno, segue o perfil da Mariana para PM.', time: '11:10' },
            { from: 'me', text: 'Score 78, 5 anos de experiência em SaaS.', time: '11:11' },
            { from: 'them', text: 'Obrigado, vou analisar o CV.', time: '11:20' },
        ]
    },
    {
        id: 4, name: 'Patrícia Lima', initials: 'PL', color: '#ec4899', online: false, time: 'Seg', preview: 'Podemos conversar na terça?', unread: 1, candidate: 'Felipe Gomes', vaga: 'Data Analyst · V4', score: 95,
        msgs: [
            { from: 'them', text: 'Oi! Recebi o perfil do Felipe. Impressionante!', time: 'Seg' },
            { from: 'them', text: 'Score 95 é muito alto. Podemos conversar na terça?', time: 'Seg' },
        ]
    },
    {
        id: 5, name: 'Diego Rocha', initials: 'DR', color: '#22c55e', online: false, time: 'Dom', preview: 'Vou verificar a agenda', unread: 0, candidate: 'Sara Costa', vaga: 'Designer UI · V2', score: 81,
        msgs: [
            { from: 'me', text: 'Diego, temos uma candidata forte para UI Designer.', time: 'Dom' },
            { from: 'them', text: 'Vou verificar a agenda e retorno.', time: 'Dom' },
        ]
    },
];

function scoreColor(s: number) {
    return s >= 70 ? '#22c55e' : s >= 40 ? '#f59e0b' : '#ef4444';
}

export function Chat() {
    const [convs, setConvs] = useState<Conversation[]>(initialConvs);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'todos' | 'nao-lidos' | 'agendados'>('todos');
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const activeConv = convs.find(c => c.id === activeId);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeConv?.msgs, isTyping]);

    const handleSend = () => {
        if (!inputText.trim() || !activeId) return;
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const text = inputText;
        setConvs(prev => prev.map(c => c.id === activeId
            ? { ...c, msgs: [...c.msgs, { from: 'me', text, time }], preview: text, time }
            : c
        ));
        setInputText('');
        setIsTyping(true);
        const replies = ['Entendido, obrigado!', 'Pode confirmar por aqui.', 'Vou verificar e retorno.', 'Combinado!', 'Ok, aguardo confirmação.'];
        setTimeout(() => {
            setIsTyping(false);
            const replyText = replies[Math.floor(Math.random() * replies.length)];
            const replyNow = new Date();
            const replyTime = `${replyNow.getHours().toString().padStart(2, '0')}:${replyNow.getMinutes().toString().padStart(2, '0')}`;
            setConvs(prev => prev.map(c => c.id === activeId
                ? { ...c, msgs: [...c.msgs, { from: 'them', text: replyText, time: replyTime }], preview: replyText, time: replyTime }
                : c
            ));
        }, 1800);
    };

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
                    <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 12px' }}>
                            Mensagens
                        </h2>
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
                        {filteredConvs.map(c => (
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

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{c.time}</span>
                                    {c.unread > 0 && (
                                        <span style={{
                                            background: c.color, color: '#fff',
                                            fontSize: '10px', fontWeight: 700,
                                            minWidth: '18px', height: '18px', borderRadius: '9px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                                        }}>{c.unread}</span>
                                    )}
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

                                {isTyping && (
                                    <div style={{
                                        alignSelf: 'flex-start', padding: '10px 14px',
                                        background: 'var(--bg-main)', border: '1px solid var(--border)',
                                        borderRadius: '14px', borderBottomLeftRadius: '4px',
                                    }}>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            {[0, 1, 2].map(i => (
                                                <div key={i} style={{
                                                    width: '6px', height: '6px', borderRadius: '50%',
                                                    background: activeConv.color,
                                                    animation: 'typing-dot 1.4s infinite ease-in-out',
                                                    animationDelay: `${i * 0.2}s`,
                                                }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Campo de envio */}
                            <div style={{
                                background: 'transparent', borderTop: '1px solid var(--border)',
                                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px',
                            }}>
                                <input
                                    className="chat-input"
                                    type="text"
                                    placeholder="Mensagem..."
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSend()}
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
                                    style={{
                                        width: '38px', height: '38px', borderRadius: '50%',
                                        background: activeConv.color, border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, color: 'white',
                                        boxShadow: `0 2px 8px ${activeConv.color}66`,
                                        transition: 'background 0.2s, transform 0.15s',
                                    }}
                                >
                                    <Send size={15} />
                                </button>
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
        </>
    );
}

export default Chat;

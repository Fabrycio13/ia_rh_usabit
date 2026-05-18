import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader2 } from 'lucide-react';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import { AI_SYSTEM_PROMPT } from '../core/config/aiPrompt';
import { useUser } from '../core/contexts/UserContext';
import { get_assistant_tools, openAiToolDefinitions } from '../core/services/aiTools';
import { type OpenAIMessage } from '../core/services/aiClient';

interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'ia';
    timestamp: Date;
}

const typingDotsStyle = `
@keyframes typingDot {
    0%, 20% { opacity: .2; transform: translateY(0); }
    50% { opacity: 1; transform: translateY(-4px); }
    80%, 100% { opacity: .2; transform: translateY(0); }
}
`;

export const ChatWidget = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { profile } = useUser();
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            text: 'Olá! Sou seu assistente de IA RH. Como posso ajudar com sua gestão de pessoas hoje?',
            sender: 'ia',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialize OpenAI
    const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
        dangerouslyAllowBrowser: true
    });

    const assistantTools = get_assistant_tools(profile.userId || '');

    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = typingDotsStyle;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim() || isTyping) return;

        const currentInput = inputValue;
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            text: currentInput,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        try {
            if (!import.meta.env.VITE_OPENAI_API_KEY) {
                throw new Error('Chave de API da OpenAI não encontrada no .env.local');
            }

            const apiMessages: OpenAIMessage[] = [
                { role: 'system', content: AI_SYSTEM_PROMPT },
                ...messages.map(m => ({
                    role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
                    content: m.text
                })),
                { role: 'user', content: currentInput }
            ];

            let response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: apiMessages as unknown as OpenAI.Chat.ChatCompletionMessageParam[],
                tools: openAiToolDefinitions as unknown as OpenAI.Chat.ChatCompletionTool[],
                tool_choice: "auto",
            });

            let assistantMessage = response.choices[0].message;

            while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                apiMessages.push({
                    role: (assistantMessage.role ?? 'assistant') as 'assistant',
                    content: assistantMessage.content ?? ''
                });

                for (const toolCall of (assistantMessage.tool_calls as unknown as Array<{ id: string; function: { name: string; arguments: string } }>)) {
                    const toolName = toolCall.function.name as keyof typeof assistantTools;
                    const args = JSON.parse(toolCall.function.arguments);

                    let result;
                    if (assistantTools[toolName]) {
                        try {
                            result = await (assistantTools[toolName] as (args: Record<string, unknown>) => Promise<unknown>)(args);
                        } catch (err) {
                            console.error(`Tool ${toolName} failed:`, err);
                            result = { error: "Erro ao acessar o banco de dados." };
                        }
                    } else {
                        result = { error: "Ferramenta não encontrada." };
                    }

                    apiMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result)
                    });
                }

                response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: apiMessages as unknown as OpenAI.Chat.ChatCompletionMessageParam[],
                    tools: openAiToolDefinitions as unknown as OpenAI.Chat.ChatCompletionTool[],
                });
                assistantMessage = response.choices[0].message;
            }

            const text = assistantMessage.content || "";

            const botMsg: ChatMessage = {
                id: Date.now().toString(),
                text: text,
                sender: 'ia',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error: unknown) {
            console.error('OpenAI Error:', error);
            const errorMsg: ChatMessage = {
                id: Date.now().toString(),
                text: `Ops! Ocorreu um erro: ${(error as Error).message || 'Erro desconhecido'}.`,
                sender: 'ia',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div style={{
            width: isOpen ? '400px' : '0px',
            minWidth: isOpen ? '400px' : '0px',
            height: '100vh',
            background: 'var(--bg-card)',
            borderLeft: isOpen ? '1px solid var(--border)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 10
        }}>
            {/* Header */}
            <div style={{
                padding: '24px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#fff',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: '200px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '15px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bot size={28} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap' }}>IA RH Assistente</h3>
                        <div style={{ fontSize: 13, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px rgba(74, 222, 128, 0.5)' }} /> Online
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="custom-scrollbar"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                    background: 'var(--bg-main)'
                }}
            >
                {messages.map(msg => (
                    <div key={msg.id} style={{
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                    }}>
                        <div style={{
                            padding: '14px 18px',
                            borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                            background: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-card)',
                            color: msg.sender === 'user' ? '#fff' : 'var(--text-main)',
                            border: msg.sender === 'ia' ? '1px solid var(--border)' : 'none',
                            fontSize: 14,
                            lineHeight: '1.6',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        }}>
                            <ReactMarkdown
                                components={{
                                    p: ({ children }) => <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{children}</p>,
                                    ul: ({ children }) => <ul style={{ margin: '8px 0', paddingLeft: 20, listStyleType: 'disc' }}>{children}</ul>,
                                    li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                                    strong: ({ children }) => <strong style={{ fontWeight: 700, color: msg.sender === 'ia' ? 'var(--primary)' : 'inherit' }}>{children}</strong>
                                }}
                            >
                                {msg.text}
                            </ReactMarkdown>
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}

                {isTyping && (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 4, alignItems: 'center', background: 'var(--bg-card)', padding: '16px 20px', borderRadius: '20px 20px 20px 4px', color: 'var(--text-dim)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                style={{
                                    width: 6,
                                    height: 6,
                                    background: 'var(--primary)',
                                    borderRadius: '50%',
                                    animation: `typingDot 1.4s infinite`,
                                    animationDelay: `${i * 0.2}s`
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div style={{ padding: '24px 24px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 12, background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '18px', padding: '10px 10px 10px 18px', alignItems: 'center', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                    <input
                        type="text"
                        placeholder={isTyping ? "Aguarde a resposta..." : "Como posso ajudar?"}
                        value={inputValue}
                        disabled={isTyping}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-main)',
                            fontSize: 14,
                            outline: 'none',
                            padding: '12px 0'
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isTyping || !inputValue.trim()}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '14px',
                            background: isTyping || !inputValue.trim() ? 'var(--bg-card)' : 'var(--primary)',
                            border: 'none',
                            color: isTyping || !inputValue.trim() ? 'var(--text-dim)' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: isTyping || !inputValue.trim() ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            boxShadow: isTyping || !inputValue.trim() ? 'none' : '0 4px 12px rgba(34, 197, 94, 0.2)'
                        }}
                        onMouseEnter={e => !isTyping && inputValue.trim() && (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: var(--text-dim);
                }
            `}</style>
        </div>
    );
};

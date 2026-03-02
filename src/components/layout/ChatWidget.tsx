import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import { AI_SYSTEM_PROMPT } from '../../config/aiPrompt';
import { useUser } from '../../contexts/UserContext';
import { get_assistant_tools, toolDefinitions } from '../../lib/aiTools';

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

    // Initialize Gemini with tools
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: {
            role: 'system',
            parts: [{ text: AI_SYSTEM_PROMPT }]
        },
        tools: [{ functionDeclarations: toolDefinitions as any }]
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
            if (!import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY === 'INSIRA_SUA_CHAVE_AQUI') {
                throw new Error('Chave de API do Gemini não encontrada ou não configurada no .env.local');
            }

            // Gemini requires history to start with a "user" message. 
            // Since our first message is a bot greeting, we skip it.
            const history = messages
                .filter((_, idx) => idx > 0)
                .map(m => ({
                    role: m.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }],
                }));

            const chat = model.startChat({ history });

            let result = await chat.sendMessage(currentInput);
            let response = await result.response;

            // Handle Function Calls (Loop for multiple or sequential calls)
            let calls = response.functionCalls();
            while (calls && calls.length > 0) {
                const functionResponses = [];
                for (const call of calls) {
                    const toolName = call.name as keyof typeof assistantTools;
                    if (assistantTools[toolName]) {
                        try {
                            const toolResult = await (assistantTools[toolName] as any)(call.args);
                            functionResponses.push({
                                functionResponse: {
                                    name: toolName,
                                    response: { result: toolResult }
                                }
                            });
                        } catch (err) {
                            console.error(`Tool ${toolName} failed:`, err);
                            functionResponses.push({
                                functionResponse: {
                                    name: toolName,
                                    response: { error: "Erro ao acessar o banco de dados." }
                                }
                            });
                        }
                    }
                }

                if (functionResponses.length > 0) {
                    result = await chat.sendMessage(functionResponses);
                    response = await result.response;
                    calls = response.functionCalls();
                } else {
                    break;
                }
            }

            const text = response.text();

            const botMsg: ChatMessage = {
                id: Date.now().toString(),
                text: text,
                sender: 'ia',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error: any) {
            console.error('Gemini Error:', error);
            const errorMsg: ChatMessage = {
                id: Date.now().toString(),
                text: `Ops! Ocorreu um erro: ${error.message || 'Erro desconhecido'}. \n\nSe você acabou de criar o arquivo .env.local, tente reiniciar o servidor no terminal (Ctrl+C e npm run dev novamente).`,
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
            background: '#15171e',
            borderLeft: 'none',
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
                    background: '#0a0c10'
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
                            background: msg.sender === 'user' ? '#6366f1' : '#1f2332',
                            color: '#fff',
                            fontSize: 14,
                            lineHeight: '1.6',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}>
                            <ReactMarkdown
                                components={{
                                    p: ({ children }) => <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{children}</p>,
                                    ul: ({ children }) => <ul style={{ margin: '8px 0', paddingLeft: 20, listStyleType: 'disc' }}>{children}</ul>,
                                    li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                                    strong: ({ children }) => <strong style={{ fontWeight: 700, color: msg.sender === 'ia' ? '#818cf8' : 'inherit' }}>{children}</strong>
                                }}
                            >
                                {msg.text}
                            </ReactMarkdown>
                        </div>
                        <span style={{ fontSize: 10, color: '#4a5568', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}

                {isTyping && (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 4, alignItems: 'center', background: '#1f2332', padding: '16px 20px', borderRadius: '20px 20px 20px 4px', color: '#94a3b8', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                style={{
                                    width: 6,
                                    height: 6,
                                    background: '#818cf8',
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
            <div style={{ padding: '24px 24px 32px', borderTop: '1px solid #1f2332', background: '#15171e', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 12, background: '#0a0c10', border: '1px solid #1f2332', borderRadius: '18px', padding: '6px 6px 6px 18px', alignItems: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
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
                            color: '#f1f5f9',
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
                            background: isTyping || !inputValue.trim() ? '#1f2332' : '#22c55e',
                            border: 'none',
                            color: isTyping || !inputValue.trim() ? '#4a5568' : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: isTyping || !inputValue.trim() ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            boxShadow: isTyping || !inputValue.trim() ? 'none' : '0 4px 12px rgba(34, 197, 94, 0.3)'
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
                    background: #1f2332;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #2d314e;
                }
            `}</style>
        </div>
    );
};

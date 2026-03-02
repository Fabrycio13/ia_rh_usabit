import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const loadFont = () => {
    if (document.querySelector('#poppins-font')) return;
    const link = document.createElement('link');
    link.id = 'poppins-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap';
    document.head.appendChild(link);
};

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => { loadFont(); }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage({ type: 'error', text: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
        setLoading(false);
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setMessage({ type: 'error', text: 'Por favor, insira seu e-mail primeiro.' });
            return;
        }
        setLoading(true);
        setMessage(null);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/configuracoes`,
        });
        if (error) {
            setMessage({ type: 'error', text: `Erro: ${error.message}` });
        } else {
            setMessage({ type: 'success', text: 'E-mail de recuperação enviado! Verifique sua caixa de entrada.' });
        }
        setLoading(false);
    };

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            overflow: 'hidden',
            fontFamily: "'Inter', system-ui, sans-serif",
            backgroundColor: '#0B1020',
        }}>
            {/* ============ PAINEL ESQUERDO ============ */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0', // Removi o padding horizontal para centralização absoluta
                backgroundColor: '#0B1020',
                position: 'relative',
                overflow: 'hidden',
                minWidth: 0, // Garante que o flex: 1 divida exatamente 50/50
            }}>

                <div style={{
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'center',
                    maxWidth: '850px',
                    width: '100%',
                    padding: '0 48px', // O padding fica aqui para proteger as bordas sem deslocar o centro
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginTop: '-100px' // Subido ainda mais conforme pedido
                }}>
                    {/* Tagline - Deslocada para baixo sem afetar a imagem */}
                    <div style={{ position: 'relative', top: '50px', width: '100%', zIndex: 2 }}>
                        <h2 style={{
                            color: '#ffffff',
                            fontSize: '36px',
                            fontWeight: 800,
                            lineHeight: 1.1,
                            marginBottom: '8px',
                            marginTop: 0,
                            width: '100%'
                        }}>
                            Analise currículos com{' '}
                            <br />
                            <span style={{ color: '#3b82f6' }}>inteligência artificial</span>
                        </h2>
                        <p style={{
                            color: '#94a3b8',
                            fontSize: '18px',
                            lineHeight: 1.4,
                            marginBottom: '16px',
                            marginTop: 0,
                            width: '100%'
                        }}>
                            Encontre os melhores talentos em segundos. Deixe a IA do RH trabalhar por você.
                        </p>
                    </div>

                    {/* Ilustração - expansão e subida */}
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '850px',
                        lineHeight: 0,
                        margin: '0 auto',
                    }}>
                        <img
                            src="/hr-illustration.png"
                            alt="RH com IA"
                            style={{
                                width: '100%',
                                display: 'block',
                                margin: '0 auto'
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'radial-gradient(circle, transparent 30%, #0B1020 95%)',
                            pointerEvents: 'none',
                        }} />
                    </div>

                    {/* Stats rápidas - compactas */}
                    <div style={{
                        display: 'flex',
                        gap: '40px',
                        justifyContent: 'center',
                        marginTop: '10px'
                    }}>
                        {[
                            { value: '200+', label: 'Análises/dia' },
                            { value: '95%', label: 'Precisão' },
                            { value: '10x', label: 'Velocidade' },
                        ].map((stat, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                                <p style={{ color: '#3b82f6', fontSize: '18px', fontWeight: 700, margin: 0 }}>{stat.value}</p>
                                <p style={{ color: '#64748b', fontSize: '10px', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ============ PAINEL DIREITO ============ */}
            <div style={{
                flex: 1,
                backgroundColor: '#1a2a5e',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 48px',
                position: 'relative',
            }}>
                {/* Card de login */}
                <div style={{
                    width: '100%',
                    maxWidth: '520px',
                    backgroundColor: '#fff',
                    borderRadius: '24px',
                    padding: '52px 44px',
                    boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
                }}>
                    {/* Logo usabit - Fredoka Style */}
                    <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                        <span style={{
                            fontFamily: "'Gorditas', cursive",
                            fontWeight: 700,
                            fontSize: '42px',
                            color: '#000000',
                            letterSpacing: '-0.5px',
                            display: 'inline-block',
                            lineHeight: 1,
                        }}>usabit</span>
                    </div>

                    <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginBottom: '28px', marginTop: 0 }}>
                        Analista de Currículos · Powered by IA
                    </p>

                    <h1 style={{
                        textAlign: 'center',
                        color: '#0f172a',
                        fontSize: '20px',
                        fontWeight: 700,
                        marginBottom: '28px',
                        marginTop: 0,
                    }}>
                        Entre na sua conta
                    </h1>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Email */}
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                                Email
                            </label>
                            <input
                                type="email"
                                placeholder="email@exemplo.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '11px 14px',
                                    color: '#0f172a',
                                    fontSize: '14px',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#3b82f6'}
                                onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#e2e8f0'}
                            />
                        </div>

                        {/* Senha */}
                        <div>
                            <label style={{ display: 'block', color: '#374151', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                                Senha
                            </label>
                            <input
                                type="password"
                                placeholder="Insira sua senha"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '11px 14px',
                                    color: '#0f172a',
                                    fontSize: '14px',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#3b82f6'}
                                onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#e2e8f0'}
                            />
                        </div>

                        {message && (
                            <p style={{
                                color: message.type === 'success' ? '#10b981' : '#ef4444',
                                fontSize: '12px',
                                textAlign: 'center',
                                margin: 0,
                                background: message.type === 'success' ? '#10b98110' : '#ef444410',
                                padding: '8px',
                                borderRadius: '6px'
                            }}>
                                {message.text}
                            </p>
                        )}

                        {/* Checkbox + Esqueceu */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input type="checkbox" style={{ width: '14px', height: '14px', accentColor: '#3b82f6' }} />
                                <span style={{ color: '#64748b', fontSize: '13px' }}>Manter conectado</span>
                            </label>
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                style={{ color: '#3b82f6', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                            >
                                Recuperar senha
                            </button>
                        </div>

                        {/* Botão */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '13px',
                                background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontFamily: 'inherit',
                                letterSpacing: '0.3px',
                                transition: 'opacity 0.2s',
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? 'Entrando...' : 'ENTRAR'}
                        </button>
                    </form>
                </div>

                {/* Footer do painel direito */}
                <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '24px', textAlign: 'center' }}>
                    © 2026 usabit · Todos os direitos reservados
                </p>
            </div>
        </div>
    );
};

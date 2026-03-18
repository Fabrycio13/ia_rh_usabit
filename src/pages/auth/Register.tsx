import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';

const loadFont = () => {
    if (document.querySelector('#space-grotesk-font')) return;
    const link = document.createElement('link');
    link.id = 'space-grotesk-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
};

export const Register = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => { loadFont(); }, []);

    // Canvas Animation (Mirroring LandingPage)
    useEffect(() => {
        const canvas = document.getElementById('register-bg') as HTMLCanvasElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const stars = Array.from({ length: 450 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 2 + 0.4,
            speed: Math.random() * 0.008 + 0.003,
            baseOpacity: Math.random() * 0.8 + 0.2,
            twinkleSpeed: Math.random() * 0.04 + 0.015,
            phase: Math.random() * Math.PI * 2
        }));

        let t = 0;
        let animationFrame: number;

        const draw = () => {
            t += 0.012;
            ctx.clearRect(0, 0, width, height);
            
            // Background
            const grad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height));
            grad.addColorStop(0, '#0d1225');
            grad.addColorStop(1, '#07090f');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            // Stars
            stars.forEach((s) => {
                const sy = (s.y - scrollY * 0.08) % height;
                const twinkle = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * s.twinkleSpeed * 65 + s.phase));
                ctx.beginPath();
                ctx.arc(s.x, sy < 0 ? sy + height : sy, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${s.baseOpacity * twinkle})`;
                ctx.fill();
            });

            animationFrame = requestAnimationFrame(draw);
        };

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        const handleScroll = () => setScrollY(window.scrollY);

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll);
        draw();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll);
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }
        
        setLoading(true);
        setMessage(null);

        // Sign up with full name in metadata
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    name: name,
                    company: '',
                },
                emailRedirectTo: window.location.origin + window.location.pathname.split('#')[0] + '#/login',
            }
        });

        if (error) {
            setMessage({ type: 'error', text: `Erro: ${error.message}` });
        } else {
            setMessage({ 
                type: 'success', 
                text: 'Cadastro realizado! Verifique seu e-mail para confirmar a conta e liberar o acesso.' 
            });
            // Clear fields on success
            setName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
        }
        setLoading(false);
    };

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            fontFamily: "'Space Grotesk', sans-serif",
            backgroundColor: '#07090f',
            position: 'relative',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            {/* Background Canvas */}
            <canvas id="register-bg" style={{ position: 'fixed', inset: 0, zIndex: 0 }} />

            {/* Back to LP */}
            <button
                onClick={() => navigate('/')}
                style={{
                    position: 'absolute',
                    top: 30,
                    left: 40,
                    zIndex: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'rgba(255,255,255,0.7)',
                    padding: '10px 18px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s'
                }}
            >
                ← Voltar
            </button>

            <div style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                maxWidth: '460px',
                padding: '0 24px',
                textAlign: 'center'
            }}>
                {/* Logo Section */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '12px',
                        marginBottom: '10px'
                    }}>
                        <img
                            src={`${import.meta.env.BASE_URL}space-talent-favicon.svg`}
                            alt="Logo"
                            style={{ width: 44, height: 44 }}
                        />
                        <span style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                            Space Talent
                        </span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                        Gerenciamento de talentos inteligente
                    </p>
                </div>

                {/* Register Card */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '24px',
                    padding: '44px',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
                }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                        Criar nova conta
                    </h2>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '32px' }}>
                        Preencha os dados para criar sua conta
                    </p>

                    <form onSubmit={handleRegister} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 500 }}>
                                Nome completo
                            </label>
                            <input
                                type="text"
                                placeholder="Seu nome completo"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '13px 16px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 500 }}>
                                Email
                            </label>
                            <input
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '13px 16px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 500 }}>
                                Senha
                            </label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '13px 16px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 500 }}>
                                Confirmar senha
                            </label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '13px 16px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                        </div>

                        {message && (
                            <div style={{
                                padding: '12px',
                                borderRadius: '10px',
                                fontSize: '13px',
                                background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                color: message.type === 'success' ? '#34d399' : '#f87171',
                                border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            }}>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: 700,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                marginTop: '12px',
                                transition: 'transform 0.2s, opacity 0.2s',
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? 'Criando conta...' : 'Criar conta'}
                        </button>
                    </form>

                    <p style={{ marginTop: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
                        Já tem uma conta?{' '}
                        <button 
                            onClick={() => navigate('/login')}
                            style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                        >
                            Fazer login
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

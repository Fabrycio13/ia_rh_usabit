import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import { SpatialBackground } from '../../common/components/ui/SpatialBackground';

const loadFont = () => {
    if (document.querySelector('#poppins-font')) return;
    const link = document.createElement('link');
    link.id = 'poppins-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap';
    document.head.appendChild(link);
};

export const Login = () => {
    const navigate = useNavigate();
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
        <>
            <SpatialBackground />
            <div className="flex flex-col lg:flex-row h-screen overflow-hidden font-['Inter',system-ui,sans-serif] relative">
            {/* Botão voltar */}
            <button
                onClick={() => navigate('/')}
                className="hidden lg:block absolute top-5 left-6 z-50 flex items-center gap-1.5 bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.12)] rounded-[10px] text-[rgba(255,255,255,0.7)] text-[13px] font-medium font-['Inter',system-ui,sans-serif] px-3.5 py-1.5 cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.13)] hover:text-white"
            >
                ← Voltar
            </button>

            {/* PAINEL ESQUERDO */}
            <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-[#0B1020] relative overflow-hidden min-w-0">
                <div className="relative z-1 text-center max-w-[850px] w-full px-12 flex flex-col items-center mt-[-100px]">
                    <div className="relative top-[50px] w-full z-2">
                        <h2 className="text-white text-[36px] font-extrabold leading-[1.1] mb-2 mt-0 w-full">
                            Analise currículos com{' '}
                            <br />
                            <span className="text-blue-500">inteligência artificial</span>
                        </h2>
                        <p className="text-[#94a3b8] text-[18px] leading-[1.4] mb-4 mt-0 w-full">
                            Encontre os melhores talentos em segundos. Deixe a IA do RH trabalhar por você.
                        </p>
                    </div>

                    <div className="relative w-full max-w-[850px] leading-0">
                        <img
                            src={`${import.meta.env.BASE_URL}illustrations/hr-illustration.png`}
                            alt="RH com IA"
                            className="w-full block mx-auto"
                        />
                        <div className="absolute top-0 left-0 right-0 bottom-0 bg-[radial-gradient(circle,transparent_30%,#0B1020_95%)] pointer-events-none" />
                    </div>

                    <div className="flex gap-10 justify-center mt-2.5">
                        {[
                            { value: '200+', label: 'Análises/dia' },
                            { value: '95%', label: 'Precisão' },
                            { value: '10x', label: 'Velocidade' },
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <p className="text-blue-500 text-[18px] font-bold m-0">{stat.value}</p>
                                <p className="text-[#64748b] text-[10px] mt-0.5 uppercase tracking-[0.5px]">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* PAINEL DIREITO */}
            <div className="flex-1 w-full flex flex-col items-center justify-center sm:p-12 p-6 relative">
                {/* Card de login */}
                <div className="w-full max-w-[520px] bg-white rounded-3xl sm:px-11 px-5 py-13 shadow-[0_30px_80px_rgba(0,0,0,0.4)]">
                    <div className="text-center mb-0 mt-[-20px] overflow-hidden">
                        <img
                            src={`${import.meta.env.BASE_URL}logos/usabit-logo.png`}
                            alt="usabit"
                            className="w-full sm:max-w-[200px] max-w-[140px] h-auto object-contain inline-block mix-blend-multiply contrast-125 brightness-110 mx-auto translate-x-[10px]"
                        />
                    </div>

                    <p className="text-center text-[#64748b] text-[12px] mb-7 mt-0">
                        Analista de Currículos · Powered by IA
                    </p>

                    <h1 className="text-center text-[#0f172a] text-[20px] font-bold mb-7 mt-0">
                        Entre na sua conta
                    </h1>

                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        {/* Email */}
                        <div>
                            <label className="block text-[#374151] text-[13px] font-medium mb-1.5">
                                Email
                            </label>
                            <input
                                type="email"
                                placeholder="email@exemplo.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3.5 py-[11px] text-[#0f172a] text-[14px] outline-none transition-colors focus:border-blue-500 font-['Inter',system-ui,sans-serif] box-border"
                            />
                        </div>

                        {/* Senha */}
                        <div>
                            <label className="block text-[#374151] text-[13px] font-medium mb-1.5">
                                Senha
                            </label>
                            <input
                                type="password"
                                placeholder="Insira sua senha"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3.5 py-[11px] text-[#0f172a] text-[14px] outline-none transition-colors focus:border-blue-500 font-['Inter',system-ui,sans-serif] box-border"
                            />
                        </div>

                        {message && (
                            <p className={`text-[12px] text-center m-0 p-2 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                {message.text}
                            </p>
                        )}

                        {/* Checkbox + Esqueceu */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" className="w-3.5 h-3.5 accent-blue-500" />
                                <span className="text-[#64748b] text-[13px]">Manter conectado</span>
                            </label>
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-blue-500 text-[13px] bg-none border-none cursor-pointer underline font-['Inter',system-ui,sans-serif]"
                            >
                                Recuperar senha
                            </button>
                        </div>

                        {/* Botão */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-[13px] bg-gradient-to-r from-blue-600 to-blue-700 text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer font-['Inter',system-ui,sans-serif] tracking-wide transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loading ? 'Entrando...' : 'ENTRAR'}
                        </button>
                    </form>
                </div>

                <p className="text-[#94a3b8] text-[12px] mt-6 text-center">
                    © 2026 usabit · Todos os direitos reservados
                </p>
            </div>
        </div>
        </>
    );
};
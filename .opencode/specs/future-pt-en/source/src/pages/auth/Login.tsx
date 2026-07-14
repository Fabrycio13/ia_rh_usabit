import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import { UsabitPeopleLogo } from '../../components/UsabitPeopleLogo';
import { Eye, EyeOff } from 'lucide-react';
import { useLang } from '../../core/contexts/LangContext';

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
    const { t } = useLang();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => { loadFont(); }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('Auth error:', error);
            setMessage({ type: 'error', text: `${t('erroLogin')} ${error.message}` });
        }
        setLoading(false);
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setMessage({ type: 'error', text: t('insiraEmail') });
            return;
        }
        setLoading(true);
        setMessage(null);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/configuracoes`,
        });
        if (error) {
            setMessage({ type: 'error', text: `${t('erroLogin')} ${error.message}` });
        } else {
            setMessage({ type: 'success', text: t('emailEnviado') });
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen w-screen bg-[#07080a] flex items-center justify-center p-0 md:p-6 relative overflow-hidden font-['Inter',sans-serif] select-none">
            {/* Imagem de Fundo Borrada sob o card */}
            <div className="absolute inset-0 z-0 pointer-events-none select-none">
                <img
                    src={`${import.meta.env.BASE_URL}logos/Professional.jpeg`}
                    alt="Background Blur"
                    className="w-full h-full object-cover blur-[40px] opacity-30 scale-105"
                />
            </div>

            {/* Container do Card Principal */}
            <div className="w-full h-full md:h-[calc(100vh-32px)] md:max-h-[860px] md:w-[98%] xl:w-[96%] md:max-w-[1800px] bg-[#121316] md:rounded-[24px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex overflow-hidden md:border border-[#2d2f36]/40 z-10 relative">
                {/* PAINEL ESQUERDO: Formulário */}
                <div className="w-full md:w-[380px] lg:w-[400px] xl:w-[420px] flex-shrink-0 h-full flex flex-col justify-between p-8 md:p-10 bg-[#121316] z-10 overflow-y-auto">
                    {/* Header Logo Centralizado e Maior */}
                    <div className="flex justify-center mt-6 mb-8 md:mt-2 md:mb-0 cursor-pointer" onClick={() => navigate('/')}>
                        <UsabitPeopleLogo height={44} />
                    </div>

                    {/* Form Content */}
                    <div className="my-auto w-full max-w-[320px] mx-auto flex flex-col justify-center">
                        <h1 className="text-white text-[26px] font-bold mb-2 text-center">
                            {t('entreNaSuaConta')}
                        </h1>
                        <p className="text-[#8e929e] text-[15px] mb-16 text-center">
                            {t('bemVindoDeVolta')}
                        </p>

                        <form onSubmit={handleLogin} className="flex flex-col gap-5.5">
                            {/* Email */}
                            <div>
                                <label htmlFor="login-email" className="block text-[#8e929e] text-[13px] font-medium mb-1.5">
                                    {t('email')}
                                </label>
                                <input
                                    id="login-email"
                                    type="email"
                                    placeholder={t('emailPlaceholder')}
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-[#1c1d22] border border-[#2d2f36] rounded-xl px-4 py-3.5 text-white text-[14px] outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Senha */}
                            <div>
                                <label htmlFor="login-password" className="block text-[#8e929e] text-[13px] font-medium mb-1.5">
                                    {t('senha')}
                                </label>
                                <div className="relative">
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder={t('senhaPlaceholder')}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        className="w-full bg-[#1c1d22] border border-[#2d2f36] rounded-xl px-4 py-3.5 pr-11 text-white text-[14px] outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e929e] hover:text-white bg-transparent border-none cursor-pointer p-0"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {message && (
                                <p className={`text-[12px] text-center m-0 p-3 rounded-xl ${message.type === 'success' ? 'bg-green-950/40 text-green-400 border border-green-800/30' : 'bg-red-950/40 text-red-400 border border-red-800/30'}`}>
                                    {message.text}
                                </p>
                            )}

                            {/* Checkbox + Esqueceu */}
                            <div className="flex items-center justify-between mt-1">
                                <label htmlFor="login-remember" className="flex items-center gap-2 cursor-pointer select-none">
                                    <input id="login-remember" type="checkbox" className="w-4 h-4 rounded bg-[#1c1d22] border-[#2d2f36] accent-blue-500 text-blue-500" />
                                    <span className="text-[#8e929e] text-[13px]">{t('manterConectado')}</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-blue-400 hover:text-blue-300 text-[13px] bg-none border-none cursor-pointer underline transition-colors"
                                >
                                    {t('esqueciSenha')}
                                </button>
                            </div>

                            {/* Botão */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-none rounded-xl text-[14px] font-semibold cursor-pointer tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-blue-900/20 mt-2"
                            >
                                {loading ? t('entrar') + '...' : t('entrar')}
                            </button>

                            {/* Link para Registro */}
                            <p className="text-center text-[13px] text-[#8e929e] mt-1.5 mb-1">
                                {t('naoTemConta')}{' '}
                                <button
                                    type="button"
                                    onClick={() => navigate('/registro')}
                                    className="text-blue-400 hover:text-blue-300 font-semibold bg-transparent border-none cursor-pointer underline transition-colors outline-none inline-block p-0"
                                >
                                    {t('criarConta')}
                                </button>
                            </p>

                            {/* Voltar */}
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="mt-2 text-center text-[13px] text-[#6b6e79] hover:text-white bg-transparent border-none cursor-pointer transition-colors flex items-center justify-center gap-1 mx-auto outline-none"
                            >
                                {t('voltarPaginaInicial')}
                            </button>
                        </form>
                    </div>

                    {/* Footer Copyright */}
                    <div className="text-center text-[#6b6e79] text-[12px] mt-8 md:mt-0">
                        {t('copyright')}
                    </div>
                </div>

                {/* PAINEL DIREITO: Imagem de Fundo (Recrutador) */}
                <div className="flex-1 h-full relative hidden md:block select-none overflow-hidden">
                    <img
                        src={`${import.meta.env.BASE_URL}logos/Professional.jpeg`}
                        alt="Usabit people Recrutamento"
                        className="w-full h-full object-cover object-[55%_center]"
                    />
                    {/* Degradê de fusão suave entre a imagem e o formulário */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#121316] via-transparent to-transparent opacity-80" />
                </div>
            </div>
        </div>
    );
};
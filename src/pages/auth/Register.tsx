import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import { Turnstile } from '@marsidev/react-turnstile';
import { isDisposableEmail } from '../../core/constants/disposableEmails';

const loadFont = () => {
    if (document.querySelector('#poppins-font')) return;
    const link = document.createElement('link');
    link.id = 'poppins-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap';
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
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [honeypot, setHoneypot] = useState('');

    useEffect(() => { loadFont(); }, []);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        if (honeypot) {
            setMessage({ type: 'error', text: 'Erro de validação. Recarregue a página.' });
            return;
        }

        if (isDisposableEmail(email)) {
            setMessage({ type: 'error', text: 'E-mails temporários não são permitidos. Use um e-mail pessoal ou corporativo.' });
            return;
        }

        if (!captchaToken) {
            setMessage({ type: 'error', text: 'Verificação de segurança falhou. Recarregue e tente novamente.' });
            return;
        }
        
        setLoading(true);
        setMessage(null);

        // Em produção, envia captchaToken pro Supabase validar.
        // Em dev, não envia (token de teste do Turnstile é rejeitado pela chave real do Supabase).
        const signUpOptions: {
            data: Record<string, string>;
            emailRedirectTo: string;
            captchaToken?: string;
        } = {
            data: {
                full_name: name,
                name: name,
                organization_name: '',
            },
            emailRedirectTo: window.location.origin + window.location.pathname.split('#')[0] + '#/login',
        };
        if (captchaToken) {
            signUpOptions.captchaToken = captchaToken;
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: signUpOptions,
        });

        if (error) {
            setMessage({ type: 'error', text: `Erro: ${error.message}` });
        } else {
            setMessage({ 
                type: 'success', 
                text: 'Cadastro realizado! Verifique seu e-mail para confirmar a conta e liberar o acesso.' 
            });
            setName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
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
                    <div className="flex justify-center mt-2 mb-8 sm:mb-10">
                        <img
                            src={`${import.meta.env.BASE_URL}logos/usabit-people-logo.svg`}
                            alt="Usabit People"
                            className="h-[44px] sm:h-[48px] object-contain cursor-pointer"
                            onClick={() => navigate('/')}
                        />
                    </div>

                    {/* Form Content */}
                    <div className="my-auto w-full max-w-[320px] mx-auto flex flex-col justify-center">
                        <h1 className="text-white text-[26px] font-bold mb-2 text-center">
                            Criar sua conta
                        </h1>
                        <p className="text-[#8e929e] text-[14px] mb-8 text-center">
                            Preencha os dados abaixo para começar.
                        </p>

                        <form onSubmit={handleRegister} className="flex flex-col gap-4">
                            {/* Nome */}
                            <div>
                                <label className="block text-[#8e929e] text-[13px] font-medium mb-1">
                                    Nome completo
                                </label>
                                <input
                                    type="text"
                                    placeholder="Seu nome completo"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    className="w-full bg-[#1c1d22] border border-[#2d2f36] rounded-xl px-4 py-2.5 text-white text-[14px] outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-[#8e929e] text-[13px] font-medium mb-1">
                                    E-mail
                                </label>
                                <input
                                    type="email"
                                    placeholder="exemplo@usabit.com.br"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-[#1c1d22] border border-[#2d2f36] rounded-xl px-4 py-2.5 text-white text-[14px] outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Senha */}
                            <div>
                                <label className="block text-[#8e929e] text-[13px] font-medium mb-1">
                                    Senha
                                </label>
                                <input
                                    type="password"
                                    placeholder="Insira sua senha"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-[#1c1d22] border border-[#2d2f36] rounded-xl px-4 py-2.5 text-white text-[14px] outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Confirmar Senha */}
                            <div>
                                <label className="block text-[#8e929e] text-[13px] font-medium mb-1">
                                    Confirmar senha
                                </label>
                                <input
                                    type="password"
                                    placeholder="Confirme sua senha"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full bg-[#1c1d22] border border-[#2d2f36] rounded-xl px-4 py-2.5 text-white text-[14px] outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Honeypot - invisível para humanos, bots preenchem */}
                            <input
                                type="text"
                                name="website"
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden="true"
                                style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
                                value={honeypot}
                                onChange={e => setHoneypot(e.target.value)}
                            />

                            {message && (
                                <p className={`text-[12px] text-center m-0 p-3 rounded-xl ${message.type === 'success' ? 'bg-green-950/40 text-green-400 border border-green-800/30' : 'bg-red-950/40 text-red-400 border border-red-800/30'}`}>
                                    {message.text}
                                </p>
                            )}

                            {/* Turnstile */}
                            <Turnstile
                                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY!}
                                onSuccess={(token: string) => setCaptchaToken(token)}
                                onError={() => setCaptchaToken(null)}
                                options={{ theme: 'dark', size: 'invisible' }}
                            />

                            {/* Botão */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-none rounded-xl text-[14px] font-semibold cursor-pointer tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-blue-900/20 mt-1"
                            >
                                {loading ? 'Criando conta...' : 'CRIAR CONTA'}
                            </button>

                            {/* Link para Login */}
                            <p className="text-center text-[13px] text-[#8e929e] mt-1 mb-1">
                                Já tem uma conta?{' '}
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="text-blue-400 hover:text-blue-300 font-semibold bg-transparent border-none cursor-pointer underline transition-colors outline-none inline-block p-0"
                                >
                                    Fazer login
                                </button>
                            </p>

                            {/* Voltar */}
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="mt-6 text-center text-[13px] text-[#6b6e79] hover:text-white bg-transparent border-none cursor-pointer transition-colors flex items-center justify-center gap-1 mx-auto outline-none"
                            >
                                ← Voltar para a página inicial
                            </button>
                        </form>
                    </div>

                    {/* Footer Copyright */}
                    <div className="text-center text-[#6b6e79] text-[12px] mt-8 md:mt-0">
                        © 2026 usabit · Todos os direitos reservados
                    </div>
                </div>

                {/* PAINEL DIREITO: Imagem de Fundo (Recrutador) */}
                <div className="flex-1 h-full relative hidden md:block select-none overflow-hidden">
                    <img
                        src={`${import.meta.env.BASE_URL}logos/Professional.jpeg`}
                        alt="Usabit People Recrutamento"
                        className="w-full h-full object-cover object-[55%_center]"
                    />
                    {/* Degradê de fusão suave entre a imagem e o formulário */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#121316] via-transparent to-transparent opacity-80" />
                </div>
            </div>
        </div>
    );
};

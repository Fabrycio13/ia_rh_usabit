import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import { safeAuthError } from '../../core/services/safeLogger';
import toast from 'react-hot-toast';

export const SetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error || !session) {
                toast.error('Link inválido ou expirado. Solicite um novo convite.');
                navigate('/login', { replace: true });
                return;
            }
            setLoading(false);
        }).catch(() => {
            navigate('/login', { replace: true });
        });
    }, [navigate]);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
            return;
        }
        if (password !== confirm) {
            setMessage({ type: 'error', text: 'As senhas não conferem.' });
            return;
        }

        setSaving(true);
        const { error } = await supabase.auth.updateUser({ password });
        setSaving(false);

        if (error) {
            safeAuthError('[SetPassword] updateUser', error);
            setMessage({ type: 'error', text: 'Não foi possível definir a senha. Tente novamente ou solicite um novo convite.' });
            return;
        }

        // Marcar perfil como ativo após criar/redefinir senha
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const { error: updateError } = await supabase.from('profiles').update({ status: 'active' }).eq('id', session.user.id);
                if (updateError) console.error('Erro ao ativar perfil:', updateError);
            }
        } catch (err) {
            console.error('Erro ao ativar perfil:', err);
        }

        toast.success('Senha definida com sucesso!');
        supabase.auth.signOut().catch(() => console.warn('signOut falhou no setPassword'));
        navigate('/login', { replace: true });
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', background: '#0B1020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen w-screen bg-[#07080a] flex items-center justify-center p-0 md:p-6 relative overflow-hidden font-['Inter',sans-serif] select-none">
            {/* Imagem de Fundo Borrada sob o card */}
            <div className="absolute inset-0 z-0 pointer-events-none select-none">
                <img
                    src={`${import.meta.env.BASE_URL}stock-photos/Close-up_of_hands.webp`}
                    alt="Background Blur"
                    className="w-full h-full object-cover blur-[40px] opacity-30 scale-105"
                />
            </div>

            {/* Container do Card Principal */}
            <div className="w-full h-full md:h-[calc(100vh-32px)] md:max-h-[860px] md:w-[98%] xl:w-[96%] md:max-w-[1800px] bg-[#121316] md:rounded-[24px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex overflow-hidden md:border border-[#2d2f36]/40 z-10 relative">
                {/* PAINEL ESQUERDO: Formulário */}
                <div className="w-full md:w-[380px] lg:w-[400px] xl:w-[420px] flex-shrink-0 h-full flex flex-col justify-between p-8 md:p-10 bg-[#121316] z-10 overflow-y-auto">
                    {/* Header Logo Centralizado e Maior */}
                    <div className="flex justify-center mt-2">
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
                            Criar Nova Senha
                        </h1>
                        <p className="text-[#8e929e] text-[15px] mb-16 text-center">
                            Crie uma senha de acesso segura para sua conta.
                        </p>

                        <form onSubmit={handleSetPassword} className="flex flex-col gap-5.5">
                            {/* Nova Senha */}
                            <div>
                                <label className="block text-[#8e929e] text-[13px] font-medium mb-1.5">
                                    Nova senha
                                </label>
                                <input
                                    type="password"
                                    placeholder="Mínimo 6 caracteres"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full bg-[#1c1d22] border border-[#2d2f36] rounded-xl px-4 py-3.5 text-white text-[14px] outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Confirmar Senha */}
                            <div>
                                <label className="block text-[#8e929e] text-[13px] font-medium mb-1.5">
                                    Confirmar senha
                                </label>
                                <input
                                    type="password"
                                    placeholder="Repita a nova senha"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full bg-[#1c1d22] border border-[#2d2f36] rounded-xl px-4 py-3.5 text-white text-[14px] outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {message && (
                                <p className={`text-[12px] text-center m-0 p-3 rounded-xl ${message.type === 'success' ? 'bg-green-950/40 text-green-400 border border-green-800/30' : 'bg-red-950/40 text-red-400 border border-red-800/30'}`}>
                                    {message.text}
                                </p>
                            )}

                            {/* Botão */}
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-none rounded-xl text-[14px] font-semibold cursor-pointer tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-blue-900/20 mt-2"
                            >
                                {saving ? 'Definindo...' : 'DEFINIR SENHA'}
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
                        src={`${import.meta.env.BASE_URL}stock-photos/Close-up_of_hands.webp`}
                        alt="Usabit People Recrutamento"
                        className="w-full h-full object-cover object-center"
                    />
                    {/* Degradê de fusão suave entre a imagem e o formulário */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#121316] via-transparent to-transparent opacity-80" />
                </div>
            </div>
        </div>
    );
};

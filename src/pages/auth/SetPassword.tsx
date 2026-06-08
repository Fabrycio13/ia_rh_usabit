import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import { SpatialBackground } from '../../common/components/ui/SpatialBackground';
import toast from 'react-hot-toast';

const loadFont = () => {
    if (document.querySelector('#poppins-font')) return;
    const link = document.createElement('link');
    link.id = 'poppins-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap';
    document.head.appendChild(link);
};

export const SetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadFont();
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                toast.error('Link inválido ou expirado. Solicite um novo convite.');
                navigate('/login', { replace: true });
                return;
            }
            setLoading(false);
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
            setMessage({ type: 'error', text: `Erro ao definir senha: ${error.message}` });
            return;
        }

        toast.success('Senha definida com sucesso!');
        await supabase.auth.signOut();
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
        <>
            <SpatialBackground />
            <div className="flex flex-col lg:flex-row h-screen overflow-hidden font-['Inter',system-ui,sans-serif] relative">
                <button
                    onClick={() => navigate('/')}
                    className="hidden lg:block absolute top-5 left-6 z-50 flex items-center gap-1.5 bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.12)] rounded-[10px] text-[rgba(255,255,255,0.7)] text-[13px] font-medium font-['Inter',system-ui,sans-serif] px-3.5 py-1.5 cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.13)] hover:text-white"
                >
                    ← Voltar
                </button>

                <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-[#0B1020] relative overflow-hidden min-w-0">
                    <div className="relative z-1 text-center max-w-[850px] w-full px-12 flex flex-col items-center mt-[-100px]">
                        <div className="relative top-[50px] w-full z-2">
                            <h2 className="text-white text-[36px] font-extrabold leading-[1.1] mb-2 mt-0 w-full">
                                Defina sua senha
                            </h2>
                            <p className="text-[#94a3b8] text-[18px] leading-[1.4] mb-4 mt-0 w-full">
                                Crie uma senha segura para acessar sua conta.
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

                <div className="flex-1 w-full flex flex-col items-center justify-center sm:p-12 p-6 relative">
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
                            Criar Nova Senha
                        </h1>

                        <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-[#374151] text-[13px] font-medium mb-1.5">
                                    Nova senha
                                </label>
                                <input
                                    type="password"
                                    placeholder="Mínimo 6 caracteres"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3.5 py-[11px] text-[#0f172a] text-[14px] outline-none transition-colors focus:border-blue-500 font-['Inter',system-ui,sans-serif] box-border"
                                />
                            </div>

                            <div>
                                <label className="block text-[#374151] text-[13px] font-medium mb-1.5">
                                    Confirmar senha
                                </label>
                                <input
                                    type="password"
                                    placeholder="Repita a senha"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3.5 py-[11px] text-[#0f172a] text-[14px] outline-none transition-colors focus:border-blue-500 font-['Inter',system-ui,sans-serif] box-border"
                                />
                            </div>

                            {message && (
                                <p className={`text-[12px] text-center m-0 p-2 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                    {message.text}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-[13px] bg-gradient-to-r from-blue-600 to-blue-700 text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer font-['Inter',system-ui,sans-serif] tracking-wide transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {saving ? 'Definindo...' : 'DEFINIR SENHA'}
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

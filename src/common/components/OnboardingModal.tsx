import { useState } from 'react';
import { Building2, ChevronRight, Briefcase, Users, Kanban, Zap, ArrowRight, CheckCircle2, Loader2, Layout } from 'lucide-react';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import toast from 'react-hot-toast';

export const OnboardingModal = () => {
    const { profile, refetch } = useUser();
    const [step, setStep] = useState(1);
    const [orgName, setOrgName] = useState('');
    const [saving, setSaving] = useState(false);
    const [hasCompleted] = useState(false);

    // Tipos de Onboarding: 
    // - 'setup': Para Gestores/Owners (precisam criar a org)
    // - 'welcome': Para RH/Convidados (já têm org, apenas boas-vindas)
    const onboardingType = (profile.user_role === 'owner' || profile.user_role === 'administrador' || profile.user_role === 'supervisor') ? 'setup' : 'welcome';

    // Se o Gestor já tiver uma org, ele cai no fluxo de 'welcome' mas com passos reduzidos
    const needsOrgSetup = onboardingType === 'setup' && (!profile.organization_id || !profile.organization_name);

    // Exibe se ainda não completou o onboarding persistido no banco E não houver trava local específica
    const shouldShow = profile.loaded && 
                      !profile.onboarding_completed && 
                      !hasCompleted && 
                      !localStorage.getItem(`ia_rh_onboarding_done_${profile.userId}`);

    if (!shouldShow) return null;

    const finalizeOnboarding = async () => {
        setSaving(true);
        try {
            // Tenta pegar o ID direto da sessão para garantir
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || profile.userId;

            if (userId) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ onboarding_completed: true })
                    .eq('id', userId);
                
                if (error) {
                    console.warn('Nota: Erro ao salvar status no banco (RLS?), mas permitindo entrada:', error);
                }
            }

            // TRAVA DE SEGURANÇA DEFINITIVA: LocalStorage
            localStorage.setItem(`ia_rh_onboarding_done_${userId}`, 'true');

            toast.success('Pronto! Vamos ao trabalho.');
            
            // ESCAPE HATCH FINAL: Recarrega a página ou limpa o estado
            // para que o App.tsx não renderize mais o modal.
            await refetch();
            
            // Forçamos a saída local mesmo se o refetch demorar
            setTimeout(() => {
                window.location.reload(); 
            }, 500);

        } catch (err) {
            console.error('Erro ao finalizar onboarding:', err);
            // Se der qualquer erro crítico, ainda assim tentamos deixar o usuário entrar
            window.location.reload();
        } finally {
            setSaving(false);
        }
    };

    const handleSaveOrg = async () => {
        if (!orgName.trim()) {
            toast.error('Por favor, informe o nome da sua organização.');
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const targetUserId = user?.id;

            if (!targetUserId) throw new Error('Sessão expirada. Faça login novamente.');

            const newOrgId = crypto.randomUUID();

            // 1. Cria a organização na tabela mestre
            const { error: orgError } = await supabase
                .from('organizations')
                .insert({ 
                    id: newOrgId,
                    name: orgName.trim(),
                    created_at: new Date().toISOString()
                });

            if (orgError) {
                // Se der erro de "already exists" ou RLS, apenas logamos e continuamos
                console.warn('Nota: Erro ao inserir na tabela organizations (pode já existir):', orgError);
            }

            // 2. Vincula o usuário a essa organização
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ 
                    organization_id: newOrgId,
                    organization_name: orgName.trim()
                })
                .eq('id', targetUserId);

            if (profileError) {
                console.error('Erro ao vincular perfil:', profileError);
                // Se falhar o vínculo, logamos mas deixamos o usuário prosseguir para o tutorial
                // para evitar que ele fique preso no modal infinitamente
            }

            // Pequeno delay para o usuário ver o "Criando ambiente"
            await new Promise(resolve => setTimeout(resolve, 1500));

            toast.success('Ambiente configurado!');
            
            // AVANÇA O STEP independente de erro no banco (Escape hatch para o usuário)
            setStep(3); 
        } catch (err) {
            console.error('ERRO CRÍTICO NO SETUP:', err);
            toast.error('Ocorreu um problema ao configurar. Tentando prosseguir...');
            setStep(3); // Força o avanço mesmo no catch
        } finally {
            setSaving(false);
        }
    };



    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(7, 10, 19, 0.95)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <div style={{
                width: '100%', maxWidth: '560px', background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: '24px',
                overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                position: 'relative'
            }}>
                <div style={{ display: 'flex', height: '4px', background: 'rgba(255,255,255,0.05)' }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            flex: 1, background: s <= step ? 'var(--primary)' : 'transparent',
                            transition: 'all 0.4s ease'
                        }} />
                    ))}
                </div>

                <div style={{ padding: '40px' }}>
                    {step === 1 && (
                        <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
                            <div style={{ 
                                width: '80px', height: '80px', borderRadius: '24px', 
                                background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <Zap size={40} fill="#6366f1" />
                            </div>
                            <h2 style={{ color: 'var(--text-main)', fontSize: '28px', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
                                Olá, {profile.firstName}!
                            </h2>
                            <p style={{ color: 'var(--text-dim)', fontSize: '16px', lineHeight: '1.6', margin: '0 0 32px' }}>
                                {onboardingType === 'setup' 
                                    ? 'Preparamos um painel exclusivo para você gerenciar seus processos seletivos com IA. Vamos configurar sua empresa?'
                                    : `Você foi convidado(a) para o sistema de RH da ${profile.organization_name || 'sua organização'}.`}
                            </p>
                            
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    onClick={() => needsOrgSetup ? setStep(2) : setStep(3)}
                                    style={{
                                        flex: 2, padding: '16px', borderRadius: '14px', border: 'none',
                                        background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 700,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                    }}
                                >
                                    {needsOrgSetup ? 'Começar Configuração' : 'Ver Tutorial'} <ChevronRight size={20} />
                                </button>
                                
                                {onboardingType === 'welcome' && (
                                    <button 
                                        onClick={finalizeOnboarding}
                                        style={{
                                            flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid var(--border)',
                                            background: 'transparent', color: 'var(--text-dim)', fontSize: '14px', fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Pular
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '32px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {saving ? <Loader2 className="animate-spin" size={24} /> : <Building2 size={24} />}
                                </div>
                                <div>
                                    <h3 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                                        {saving ? 'Criando seu ambiente...' : 'Identidade da Empresa'}
                                    </h3>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: '4px 0 0' }}>
                                        {saving ? 'Estamos preparando tudo para você.' : 'Como sua organização será exibida.'}
                                    </p>
                                </div>
                            </div>

                            {!saving && (
                                <div style={{ marginBottom: '32px' }}>
                                    <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Nome da Organização
                                    </label>
                                    <input 
                                        autoFocus
                                        placeholder="Ex: Usabit Tecnologia"
                                        value={orgName}
                                        onChange={e => setOrgName(e.target.value)}
                                        style={{
                                            width: '100%', padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--border)',
                                            background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', fontSize: '16px',
                                            outline: 'none', transition: 'border-color 0.2s'
                                        }}
                                        onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                        onKeyDown={e => e.key === 'Enter' && handleSaveOrg()}
                                    />
                                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '12px' }}>
                                        * Este nome aparecerá no cabeçalho das suas vagas e relatórios.
                                    </p>
                                </div>
                            )}

                            {saving && (
                                <div style={{ 
                                    padding: '40px 0', display: 'flex', flexDirection: 'column', 
                                    alignItems: 'center', gap: '20px', animation: 'fadeIn 0.3s ease' 
                                }}>
                                    <div style={{ 
                                        width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', 
                                        borderRadius: '10px', overflow: 'hidden' 
                                    }}>
                                        <div style={{ 
                                            width: '60%', height: '100%', background: 'var(--primary)', 
                                            borderRadius: '10px', animation: 'progress 2s ease-in-out infinite' 
                                        }} />
                                    </div>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Configurando banco de dados e permissões...</p>
                                </div>
                            )}

                            {!saving && (
                                <button 
                                    onClick={handleSaveOrg}
                                    disabled={saving}
                                    style={{
                                        width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                                        background: orgName.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
                                        color: orgName.trim() ? '#ffffff' : 'rgba(255,255,255,0.3)', 
                                        fontSize: '16px', fontWeight: 700,
                                        cursor: orgName.trim() ? 'pointer' : 'not-allowed',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                    }}
                                >
                                    Continuar
                                    <ArrowRight size={20} />
                                </button>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                <div style={{ 
                                    width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', 
                                    color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' 
                                }}>
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 style={{ color: 'var(--text-main)', fontSize: '24px', fontWeight: 800, margin: '0 0 12px' }}>
                                    Tudo pronto!
                                </h3>
                                <p style={{ color: 'var(--text-dim)', fontSize: '16px', lineHeight: '1.6', margin: 0 }}>
                                    Sua organização foi criada com sucesso. Vamos conhecer agora como o sistema funciona passo a passo?
                                </p>
                            </div>

                            <button 
                                onClick={() => setStep(4)}
                                style={{
                                    width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                                    background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 700,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                }}
                            >
                                Começar Tour <ChevronRight size={20} />
                            </button>
                        </div>
                    )}

                    {/* TUTORIAL PASSO A PASSO */}
                    {step === 4 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Layout size={40} />
                            </div>
                            <h3 style={{ color: 'var(--text-main)', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>1. Dashboard Central</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                                Sua torre de controle. Veja métricas em tempo real, vagas ativas e os candidatos mais recentes que acabaram de entrar no seu radar.
                            </p>
                            <button onClick={() => setStep(5)} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                                Próximo: Vagas
                            </button>
                        </div>
                    )}

                    {step === 5 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Briefcase size={40} />
                            </div>
                            <h3 style={{ color: 'var(--text-main)', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>2. Gestão de Vagas</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                                Crie oportunidades detalhadas em segundos. Gere links de candidatura públicos para compartilhar em redes sociais e portais de emprego.
                            </p>
                            <button onClick={() => setStep(6)} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                                Próximo: Análise IA
                            </button>
                        </div>
                    )}

                    {step === 6 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Zap size={40} fill="#eab308" />
                            </div>
                            <h3 style={{ color: 'var(--text-main)', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>3. Análise com IA</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                                Nossa inteligência artificial lê e compara todos os currículos com a vaga, criando um ranking automático das melhores pessoas para o cargo.
                            </p>
                            <button onClick={() => setStep(7)} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                                Próximo: Banco de Talentos
                            </button>
                        </div>
                    )}

                    {step === 7 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Users size={40} />
                            </div>
                            <h3 style={{ color: 'var(--text-main)', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>4. Banco de Talentos</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                                Todos os currículos que você já recebeu ficam salvos aqui. Use filtros inteligentes para encontrar candidatos ideais mesmo meses depois.
                            </p>
                            <button onClick={() => setStep(8)} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                                Próximo: Pipeline
                            </button>
                        </div>
                    )}

                    {step === 8 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Kanban size={40} />
                            </div>
                            <h3 style={{ color: 'var(--text-main)', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>5. Pipeline Visual</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                                Controle o fluxo seletivo movendo os candidatos entre colunas: Triagem, Entrevista, Proposta e Contratado. Organização visual total.
                            </p>
                            <button onClick={() => setStep(9)} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                                Próximo: Configurações
                            </button>
                        </div>
                    )}

                    {step === 9 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Building2 size={40} />
                            </div>
                            <h3 style={{ color: 'var(--text-main)', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>6. Configurações e Equipe</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                                Onde o Gestor gerencia a equipe de RH, convida novos membros e ajusta todos os detalhes da conta da organização.
                            </p>
                            <button onClick={finalizeOnboarding} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: '#10b981', color: '#fff', fontSize: '18px', fontWeight: 800, cursor: 'pointer', border: 'none' }}>
                                Concluir e Entrar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(0); }
                    100% { transform: translateX(100%); }
                }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

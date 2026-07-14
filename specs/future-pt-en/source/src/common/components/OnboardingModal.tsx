import { useState } from 'react';
import { Building2, ChevronRight, Briefcase, Users, Kanban, Zap, ArrowRight, CheckCircle2, Loader2, Layout } from 'lucide-react';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { useLang } from '../../core/contexts/LangContext';
import toast from 'react-hot-toast';

export const OnboardingModal = () => {
    const { profile, refetch } = useUser();
    const { t } = useLang();
    const [step, setStep] = useState(1);
    const [orgName, setOrgName] = useState('');
    const [saving, setSaving] = useState(false);
    const [hasCompleted] = useState(false);

    const onboardingType = profile.user_role === 'administrador' ? 'setup' : 'welcome';

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

            toast.success(t('prontoTrabalho'));
            
            await refetch();

        } catch (err) {
            console.error('Erro ao finalizar onboarding:', err);
            await refetch();
        } finally {
            setSaving(false);
        }
    };

    const handleSaveOrg = async () => {
        if (!orgName.trim()) {
            toast.error(t('informeNomeOrg'));
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const targetUserId = user?.id;

            if (!targetUserId) throw new Error(t('sessaoExpirada'));

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

            toast.success(t('ambienteConfigurado'));
            
            // AVANÇA O STEP independente de erro no banco (Escape hatch para o usuário)
            setStep(3); 
        } catch (err) {
            console.error('ERRO CRÍTICO NO SETUP:', err);
            toast.error(t('erroConfigurarProsseguindo'));
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
                                {t('ola')}, {profile.firstName}!
                            </h2>
                            <p style={{ color: 'var(--text-dim)', fontSize: '16px', lineHeight: '1.6', margin: '0 0 32px' }}>
                                {onboardingType === 'setup' 
                                    ? t('boasVindasSetup')
                                    : `${t('boasVindasConvidado')} ${profile.organization_name || t('suaOrganizacao')}.`}
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
                                    {needsOrgSetup ? t('comecarConfiguracao') : t('verTutorial')} <ChevronRight size={20} />
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
                                        {t('pular')}
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
                                        {saving ? t('criandoAmbiente') : t('identidadeEmpresa')}
                                    </h3>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: '4px 0 0' }}>
                                        {saving ? t('preparandoTudo') : t('comoOrganizacaoExibida')}
                                    </p>
                                </div>
                            </div>

                            {!saving && (
                                <div style={{ marginBottom: '32px' }}>
                                    <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {t('nomeOrganizacao')}
                                    </label>
                                    <input 
                                        autoFocus
                                        placeholder={t('orgPlaceholder')}
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
                                        {t('nomeOrganizacaoAsterisco')}
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
                                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>{t('configurandoBancoPermissoes')}</p>
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
                                    {t('continuar')}
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
                                    {t('tudoPronto')}
                                </h3>
                                <p style={{ color: 'var(--text-dim)', fontSize: '16px', lineHeight: '1.6', margin: 0 }}>
                                    {t('organizacaoCriadaSucesso')}
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
                                {t('comecarTour')} <ChevronRight size={20} />
                            </button>
                        </div>
                    )}

                    {/* TUTORIAL PASSO A PASSO */}
                    {step === 4 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Layout size={40} />
                            </div>
                            <h3 style={{ color: 'var(--text-main)', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>1. {t('dashboardCentral')}</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.7', marginBottom: '24px' }}>
                                {t('dashboardCentralDesc')}
                            </p>
                            <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.6', marginBottom: '32px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                {t('dica')} {t('dicaCalendario')}
                            </p>
                            <button onClick={() => setStep(5)} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                                {t('proximoVagas')}
                            </button>
                            <button onClick={finalizeOnboarding} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                                {t('pularTutorial')}
                            </button>
                        </div>
                    )}

                    {step === 5 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Briefcase size={40} />
                            </div>
                            <h3 style={{ color: 'var(--text-main)', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>2. {t('gestaoVagas')}</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.7', marginBottom: '24px' }}>
                                {t('gestaoVagasDesc')}
                            </p>
                            <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.6', marginBottom: '32px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                {t('dica')} {t('dicaVagasDetalhadasOnboarding')}
                            </p>
                            <button onClick={() => setStep(6)} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                                {t('proximoAnaliseIA')}
                            </button>
                            <button onClick={finalizeOnboarding} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                                {t('pularTutorial')}
                            </button>
                        </div>
                    )}

                    {step === 6 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Zap size={40} fill="#eab308" />
                            </div>
                            <h3 style={{ color: 'var(--text-main)', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>3. {t('analiseIA')}</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.7', marginBottom: '24px' }}>
                                {t('analiseIADesc')}
                            </p>
                            <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.6', marginBottom: '32px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                {t('dica')} {t('dicaRefinarFiltros')}
                            </p>
                            <button onClick={() => setStep(7)} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                                {t('proximoBancoTalentos')}
                            </button>
                            <button onClick={finalizeOnboarding} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                                {t('pularTutorial')}
                            </button>
                        </div>
                    )}

                    {step === 7 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Users size={40} />
                            </div>
                            <h3 style={{ color: 'var(--text-main)', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>4. {t('bancoTalentosOnboarding')}</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.7', marginBottom: '24px' }}>
                                {t('bancoTalentosOnboardingDesc')}
                            </p>
                            <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.6', marginBottom: '32px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                {t('dica')} {t('dicaEnviarAvulsos')}
                            </p>
                            <button onClick={() => setStep(8)} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                                {t('proximoPipeline')}
                            </button>
                            <button onClick={finalizeOnboarding} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                                {t('pularTutorial')}
                            </button>
                        </div>
                    )}

                    {step === 8 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Kanban size={40} />
                            </div>
                            <h3 style={{ color: 'var(--text-main)', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>5. {t('pipelineVisual')}</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.7', marginBottom: '24px' }}>
                                {t('pipelineVisualDesc')}
                            </p>
                            <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.6', marginBottom: '32px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                {t('dica')} {t('dicaPersonalizarColunas')}
                            </p>
                            <button onClick={() => setStep(9)} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'var(--primary)', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                                {t('proximoConfiguracoes')}
                            </button>
                            <button onClick={finalizeOnboarding} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                                {t('pularTutorial')}
                            </button>
                        </div>
                    )}

                    {step === 9 && (
                        <div style={{ animation: 'fadeIn 0.5s ease-out', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Building2 size={40} />
                            </div>
                            <h3 style={{ color: 'var(--text-main)', fontSize: '22px', fontWeight: 800, margin: '0 0 12px' }}>6. {t('configuracoesEquipe')}</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.7', marginBottom: '24px' }}>
                                {t('configuracoesEquipeDesc')}
                            </p>
                            <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.6', marginBottom: '32px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                {t('dica')} {t('dicaSupervisores')}
                            </p>
                            <button onClick={finalizeOnboarding} style={{ width: '100%', padding: '16px', borderRadius: '14px', background: '#10b981', color: '#fff', fontSize: '18px', fontWeight: 800, cursor: 'pointer', border: 'none' }}>
                                {t('concluirEntrar')}
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

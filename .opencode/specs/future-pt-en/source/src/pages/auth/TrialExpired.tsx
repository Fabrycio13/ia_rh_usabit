import { supabase } from '../../core/services/supabase';
import { useLang } from '../../core/contexts/LangContext';

export const TrialExpired = () => {
    const { t } = useLang();
    const handleLogout = () => supabase.auth.signOut();

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#07090f',
            color: '#fff',
            fontFamily: "'Space Grotesk', sans-serif",
            textAlign: 'center',
            padding: '24px'
        }}>
            <div style={{
                maxWidth: '500px',
                padding: '60px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '32px',
                backdropFilter: 'blur(20px)'
            }}>
                <div style={{ fontSize: '64px', marginBottom: '24px' }}>⏳</div>
                <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-1px' }}>
                    {t('trialExpiradoTitulo')}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '40px', fontSize: '18px' }}>
                    {t('trialExpiradoDesc')}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                        onClick={() => window.location.href = 'mailto:suporte@usabit.com.br'}
                        style={{
                            padding: '16px',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '14px',
                            fontSize: '16px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        {t('falarSuporteUpgrade')}
                    </button>
                    
                    <button 
                        onClick={handleLogout}
                        style={{
                            padding: '16px',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.6)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '14px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {t('sairConta')}
                    </button>
                </div>
            </div>
        </div>
    );
};

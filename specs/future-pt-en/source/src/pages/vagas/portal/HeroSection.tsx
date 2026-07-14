import heroIllustration from '/illustrations/hero-illustration.png';
import { useLang } from '../../../core/contexts/LangContext';

interface HeroSectionProps {
  orgName: string;
  isMobile: boolean;
  onScrollToVagas: () => void;
  onNavigate: (path: string) => void;
}

export const HeroSection = ({ orgName, isMobile, onScrollToVagas, onNavigate }: HeroSectionProps) => {
  const { t } = useLang();
  return (
    <section
      style={{
        minHeight: 730,
        display: 'flex',
        alignItems: 'center',
        maxWidth: 1440,
        margin: '0 auto',
        padding: isMobile ? '120px 24px 60px' : '160px 64px 80px',
        position: 'relative',
        zIndex: 1,
        gap: isMobile ? 48 : 64,
        flexDirection: isMobile ? 'column' : 'row',
      }}
    >
      {/* Left */}
      <div style={{ flex: 1, maxWidth: 640 }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: isMobile ? 36 : 64,
            lineHeight: isMobile ? 1.1 : '76.8px',
            letterSpacing: '-1.28px',
            color: '#F5F6F8',
            margin: '0 0 24px',
          }}
        >
          {t('heroJornada').replace('{orgName}', orgName)}
        </h1>
        <p
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 400,
            fontSize: isMobile ? 16 : 20,
            lineHeight: '28.8px',
            color: '#C3C7CD',
            margin: '0 0 40px',
            maxWidth: 540,
          }}
        >
          {t('portalHeroDesc')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'row', gap: isMobile ? 10 : 16, flexWrap: 'nowrap' }}>
          <button
            onClick={onScrollToVagas}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: isMobile ? '13px 20px' : '16px 36px',
              borderRadius: 14,
              background: '#2C58FD',
              color: '#F5F6F8',
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 700,
              fontSize: isMobile ? 15 : 18,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 6px 30px rgba(44, 88, 253, 0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            {t('verVagas')}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
          <button
            onClick={() => onNavigate('candidatar')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: isMobile ? '13px 20px' : '16px 36px',
              borderRadius: 14,
              background: 'transparent',
              color: '#F5F6F8',
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 700,
              fontSize: isMobile ? 15 : 18,
              border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {t('cadastrarCurriculo')}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right — Illustration */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: 528,
        }}
      >
        <img
          src={heroIllustration}
          alt={t('ilustracaoAlt')}
          style={{
            width: '100%',
            height: 'auto',
            maxWidth: 528,
            objectFit: 'contain',
          }}
        />
      </div>
    </section>
  );
};

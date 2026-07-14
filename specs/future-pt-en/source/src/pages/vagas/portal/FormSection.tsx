import { useLang } from '../../../core/contexts/LangContext';

interface FormSectionProps {
  orgId: string;
  isMobile: boolean;
  onNavigate: (path: string) => void;
}

export const FormSection = ({ orgId, isMobile, onNavigate }: FormSectionProps) => {
  const { t } = useLang();
  return (
    <section
      style={{
        padding: isMobile ? '60px 24px 110px 24px' : '80px 0 130px 0',
        maxWidth: 1440,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: isMobile ? 32 : 48,
            lineHeight: '57.6px',
            letterSpacing: '-0.48px',
            color: '#F5F6F8',
            margin: 0,
          }}
        >
          {t('trabalheConosco')}
        </h2>
        <p
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 400,
            fontSize: isMobile ? 16 : 18,
            lineHeight: '28.8px',
            color: '#C3C7CD',
            margin: 0,
            maxWidth: 500,
          }}
        >
          {t('portalFormDesc')}
        </p>
        <button
          onClick={() => onNavigate(`/carreiras/${orgId}/candidatar`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 28px',
            borderRadius: 10,
            background: '#2C58FD',
            color: '#F5F6F8',
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 8px 24px rgba(44, 88, 253, 0.25)',
            marginTop: 8,
          }}
        >
          {t('cadastrarCurriculo')}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </section>
  );
};

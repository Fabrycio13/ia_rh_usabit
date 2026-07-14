import usabitLogo from '/logos/usabit-logo.svg';
import { useLang } from '../../../core/contexts/LangContext';

interface NavbarPortalProps {
  isMobile: boolean;
}

export const NavbarPortal = ({ isMobile }: NavbarPortalProps) => {
  const { t } = useLang();
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '0 24px' : '0 64px',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(0,0,0,0.6)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 1440,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          src={usabitLogo}
          alt={t('usabitAlt')}
          style={{ height: 32, width: 'auto', objectFit: 'contain' }}
        />

      </div>
    </nav>
  );
};

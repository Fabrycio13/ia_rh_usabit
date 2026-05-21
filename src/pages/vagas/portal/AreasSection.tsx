import { areas } from './data';

interface AreasSectionProps {
  isMobile: boolean;
}

export const AreasSection = ({ isMobile }: AreasSectionProps) => {
  return (
    <section
      id="areas"
      style={{
        padding: isMobile ? '60px 24px' : '80px 0',
        maxWidth: 1440,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 60, padding: isMobile ? 0 : '0 24px' }}>
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: isMobile ? 32 : 48,
            lineHeight: '57.6px',
            letterSpacing: '-0.48px',
            color: '#F5F6F8',
            margin: '0 0 16px',
          }}
        >
          Áreas onde seu talento faz diferença
        </h2>
        <p
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 400,
            fontSize: isMobile ? 16 : 20,
            lineHeight: '28.8px',
            color: '#C3C7CD',
            margin: 0,
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Atue onde você mais se identifica. Clique abaixo para ver
          oportunidades ativas ou envie seu currículo para nosso banco de
          talentos.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: 24,
          padding: isMobile ? '0 24px' : '0 64px',
        }}
      >
        {areas.map((area) => (
          <div
            key={area.title}
            style={{
              position: 'relative',
              borderRadius: 4,
              overflow: 'hidden',
              minHeight: 308,
              backgroundImage: `url(${area.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              cursor: 'pointer',
              transition: 'transform 0.3s ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.16) 24%, rgba(0,0,0,0.48) 100%)',
              }}
            />
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                height: '100%',
                padding: 32,
                minHeight: 308,
                boxSizing: 'border-box',
              }}
            >
              <h3
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 500,
                  fontSize: 28,
                  lineHeight: '33.6px',
                  color: '#F5F6F8',
                  margin: 0,
                }}
              >
                {area.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

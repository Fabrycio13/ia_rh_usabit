import React from 'react';

// ─── CSS Animations ──────────────────────────────────────────────────────────
const css = `
@keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.star { position: absolute; background: white; border-radius: 50%; pointer-events: none; animation: twinkle var(--duration) ease-in-out infinite; opacity: 0.6; }
.planet { position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(1px); box-shadow: inset -10px -10px 20px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.1); }
`;

// ─── Planet Details ───────────────────────────────────────────────────────────
const PlanetOverlay = ({ type }: { type: string }) => {
  switch (type) {
    case 'Jupiter':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent, transparent 12px, rgba(124,45,18,0.25) 12px, rgba(124,45,18,0.25) 24px)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent, transparent 18px, rgba(254,243,199,0.15) 18px, rgba(254,243,199,0.15) 36px)' }} />
          <div style={{ position: 'absolute', top: '65%', left: '15%', width: '25%', height: '12%', borderRadius: '50%', background: 'rgba(124,45,18,0.45)', filter: 'blur(2px)', transform: 'rotate(-3deg)' }} />
          <div style={{ position: 'absolute', top: '30%', left: '55%', width: '28%', height: '6%', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', filter: 'blur(1px)' }} />
        </div>
      );
    case 'Earth':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, 
            backgroundImage: `
              radial-gradient(ellipse 22px 18px at 25% 30%, #166534 0%, transparent 100%),
              radial-gradient(ellipse 30px 22px at 65% 55%, #15803d 0%, transparent 100%),
              radial-gradient(ellipse 18px 12px at 45% 45%, #3f6212 0%, transparent 100%),
              radial-gradient(ellipse 12px 08px at 80% 20%, #14532d 0%, transparent 100%),
              radial-gradient(circle 7px at 22% 72%, #166534 0%, transparent 100%)
            `,
            opacity: 0.85, filter: 'blur(1px)'
          }} />
          <div style={{ position: 'absolute', top: '22%', left: '22%', width: '18%', height: '18%', background: 'rgba(255,255,255,0.3)', borderRadius: '50%', filter: 'blur(5px)' }} />
          <div style={{ position: 'absolute', inset: 0, 
            backgroundImage: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.08) 0deg, transparent 45deg, rgba(255,255,255,0.08) 90deg)',
            filter: 'blur(2px)', animation: 'float 30s linear infinite'
          }} />
        </div>
      );
    case 'Mars':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '15%', left: '15%', width: '35%', height: '15%', background: 'rgba(69,10,10,0.35)', filter: 'blur(4px)', transform: 'rotate(-5deg)' }} />
          <div style={{ position: 'absolute', top: '65%', left: '50%', width: '25%', height: '15%', background: 'rgba(69,10,10,0.3)', filter: 'blur(3px)', transform: 'rotate(10deg)' }} />
          <div style={{ position: 'absolute', top: '35%', left: '55%', width: '15%', height: '15%', borderRadius: '50%', background: 'rgba(69,10,10,0.2)', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.3)' }} />
        </div>
      );
    case 'Neptune':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(160deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 16px)', filter: 'blur(1.5px)', animation: 'float 45s linear infinite' }} />
          <div style={{ position: 'absolute', top: '40%', left: '10%', width: '80%', height: '4%', background: 'rgba(255,255,255,0.15)', filter: 'blur(3px)' }} />
        </div>
      );
    case 'Saturn':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.1) 50%, transparent)' }} />
          <div style={{ position: 'absolute', top: '25%', left: '10%', width: '80%', height: '10%', background: 'rgba(255,255,255,0.05)', filter: 'blur(1px)' }} />
        </div>
      );
    default:
      return null;
  }
};

export const SpaceBackground = () => {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'var(--bg-main)', overflow: 'hidden' }}>
            <style>{css}</style>
            
            {/* Stars Container */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
                {[...Array(60)].map((_, i) => (
                    <div 
                        key={i} 
                        className="star" 
                        style={{ 
                            left: `${Math.random() * 100}%`, 
                            top: `${Math.random() * 100}%`, 
                            width: `${1 + Math.random() * 2}px`, 
                            height: `${1 + Math.random() * 2}px`, 
                            '--duration': `${2 + Math.random() * 4}s` 
                        } as any} 
                    />
                ))}
            </div>

            {/* Decorative Planets */}
            <div className="planet" style={{ width: 140, height: 140, right: '5%', top: '10%', background: 'radial-gradient(circle at 35% 35%, #4f46e5 0%, #1e1b4b 100%)', opacity: 0.5 }}>
                <PlanetOverlay type="Neptune" />
            </div>
            
            <div className="planet" style={{ width: 80, height: 80, left: '8%', top: '15%', background: 'radial-gradient(circle at 35% 35%, #ef4444 0%, #7f1d1d 100%)', opacity: 0.3 }}>
                <PlanetOverlay type="Mars" />
            </div>

            <div className="planet" style={{ width: 220, height: 220, left: '15%', bottom: '5%', background: 'radial-gradient(circle at 35% 35%, #fde047 0%, #a16207 100%)', opacity: 0.45 }}>
                <PlanetOverlay type="Jupiter" />
            </div>

            <div className="planet" style={{ width: 110, height: 110, right: '12%', bottom: '15%', background: 'radial-gradient(circle at 35% 35%, #3b82f6 0%, #172554 100%)', opacity: 0.35 }}>
                <PlanetOverlay type="Saturn" />
            </div>
            
            {/* Subtle Gradient Layers for Depth */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.1) 100%)' }} />
        </div>
    );
};

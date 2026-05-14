
// ─── CSS Animations ──────────────────────────────────────────────────────────
const css = `
.space-bg-container .star { position: absolute; background: white; border-radius: 50%; pointer-events: none; animation: twinkle var(--duration) ease-in-out infinite; opacity: 0.6; }
.space-bg-container .planet { position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(1px); box-shadow: inset -10px -10px 20px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.1); }
@keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
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
          {/* Efeito 3D esférico extra (luz e sombra) */}
          <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset -20px -20px 40px rgba(0,0,0,0.6), inset 10px 10px 20px rgba(255,255,255,0.1)', zIndex: 10 }} />
          
          {/* Bandas curvas simulando a curvatura de um planeta gasoso */}
          <div style={{ position: 'absolute', inset: '-50%', background: 'radial-gradient(ellipse 80% 50% at 50% 120%, transparent 40%, rgba(255,255,255,0.15) 45%, transparent 55%, rgba(255,255,255,0.08) 60%, transparent 70%)', filter: 'blur(4px)', transform: 'rotate(-15deg)', animation: 'float 40s infinite linear' }} />
          <div style={{ position: 'absolute', inset: '-50%', background: 'radial-gradient(ellipse 80% 50% at 50% -20%, transparent 40%, rgba(255,255,255,0.12) 45%, transparent 55%, rgba(255,255,255,0.05) 60%, transparent 70%)', filter: 'blur(3px)', transform: 'rotate(-15deg)', animation: 'float 30s infinite reverse linear' }} />
          
          {/* Uma "mancha" suave como a grande mancha escura de Netuno real */}
          <div style={{ position: 'absolute', top: '55%', left: '30%', width: '40%', height: '20%', background: 'rgba(30,27,75,0.4)', borderRadius: '50%', filter: 'blur(4px)', transform: 'rotate(-10deg)', zIndex: 5 }} />
          <div style={{ position: 'absolute', top: '57%', left: '35%', width: '25%', height: '10%', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(2px)', transform: 'rotate(-10deg)', zIndex: 5 }} />
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

import React from 'react';

// Stars generated once at module load (stable, not per-render)
const STARS = Array.from({ length: 60 }, (_, i) => ({
    key: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    width: `${1 + Math.random() * 2}px`,
    height: `${1 + Math.random() * 2}px`,
    duration: `${2 + Math.random() * 4}s`
}));

export const SpaceBackground = () => {
    return (
        <div className="space-bg-container" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: '#04070c', overflow: 'hidden' }}>
            <style>{css}</style>

            {/* Stars Container */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
                {STARS.map((star) => (
                    <div
                        key={star.key}
                        className="star"
                        style={{
                            left: star.left,
                            top: star.top,
                            width: star.width,
                            height: star.height,
                            '--duration': star.duration
                        } as React.CSSProperties}
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

import React, { useMemo } from 'react';

const PARTICLE_COUNT = 20;

interface Particle {
  id: number;
  cx: number;     // % horizontal
  cy: number;     // % vertical
  r: number;      // raio em px
  duration: number; // segundos
  delay: number;
  driftX: number;  // px horizontal drift
  driftY: number;  // px vertical drift
}

function generateParticles(): Particle[] {
  const arr: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    arr.push({
      id: i,
      cx: Math.random() * 100,
      cy: Math.random() * 100,
      r: 1 + Math.random() * 3,
      duration: 8 + Math.random() * 14,
      delay: Math.random() * 10,
      driftX: (Math.random() - 0.5) * 80,
      driftY: (Math.random() - 0.5) * 80,
    });
  }
  return arr;
}

export const FrequenceBackground: React.FC = () => {
  const particles = useMemo(() => generateParticles(), []);

  return (
    <div className="frequence-bg-container">
      <style>{`
        .frequence-bg-container {
          position: fixed;
          inset: 0;
          z-index: -1;
          background: radial-gradient(ellipse at 50% 0%, #0a1a0a 0%, #030803 60%, #000000 100%);
          overflow: hidden;
        }

        .frequence-bg-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 80%, rgba(34, 197, 94, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(34, 197, 94, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.02) 0%, transparent 70%);
          pointer-events: none;
          animation: freq-glow-pulse 8s ease-in-out infinite;
        }

        @keyframes freq-glow-pulse {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }

        .frequence-particle {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.12) 0%, transparent 100%);
          pointer-events: none;
          animation: freq-float var(--dur) ease-in-out infinite;
          animation-delay: var(--del);
          opacity: 0;
        }

        @keyframes freq-float {
          0%   { opacity: 0; transform: translate(0, 0) scale(0.8); }
          15%  { opacity: 0.35; }
          50%  { opacity: 0.15; transform: translate(var(--dx), var(--dy)) scale(1.2); }
          85%  { opacity: 0.35; }
          100% { opacity: 0; transform: translate(0, 0) scale(0.8); }
        }
      `}</style>

      {particles.map(p => (
        <div
          key={p.id}
          className="frequence-particle"
          style={{
            left: `${p.cx}%`,
            top: `${p.cy}%`,
            width: `${p.r * 6}px`,
            height: `${p.r * 6}px`,
            '--dur': `${p.duration}s`,
            '--del': `${p.delay}s`,
            '--dx': `${p.driftX}px`,
            '--dy': `${p.driftY}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

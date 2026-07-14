import React, { useId } from 'react';

interface HeartbeatBackgroundProps {
  color?: string;
  opacity?: number;
  speed?: number;
  delay?: number;
  overlayColor?: string;
}

/**
 * HeartbeatBackground — linha de ECG com pulsação.
 *
 * Timeline (speed segundos, ex: 3s):
 *   0–33% : fade-in revela a linha (esquerda → direita)
 *   33–67%: linha 100% visível
 *   67–100%: fade-out cobre (esquerda → direita)
 *
 * Para onda sequencial em N cards: card I tem delay = I * speed.
 * Ex: 4 cards com speed=3s → delays 0s, 3s, 6s, 9s → ciclo total 12s.
 */
export const HeartbeatBackground: React.FC<HeartbeatBackgroundProps> = ({
  color = '#22c55e',
  opacity = 0.25,
  speed = 3,
  delay = 0,
  overlayColor = 'var(--bg-card)',
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const prefix = `hb-${uid}`;

  return (
    <>
      <style>{`
        .${prefix} {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          color: ${color};
          opacity: ${opacity};
        }
        .${prefix} svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .${prefix}-fi {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: ${overlayColor};
          transform-origin: right center;
          animation: ${prefix}-in ${speed}s linear infinite;
          animation-delay: ${delay}s;
        }
        .${prefix}-fo {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: ${overlayColor};
          transform-origin: left center;
          animation: ${prefix}-out ${speed}s linear infinite;
          animation-delay: ${delay}s;
        }
        @keyframes ${prefix}-in {
          0%   { transform: scaleX(1); }
          33%  { transform: scaleX(0); }
          100% { transform: scaleX(0); }
        }
        @keyframes ${prefix}-out {
          0%   { transform: scaleX(0); }
          67%  { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>
      <div className={prefix}>
        <svg viewBox="0 0 150 80" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points="0,40 38,40 44,28 50,40 58,40 63,51 72,4 80,59 84,40 97,40 103,35 110,40 150,40"
          />
        </svg>
        <div className={`${prefix}-fi`} />
        <div className={`${prefix}-fo`} />
      </div>
    </>
  );
};

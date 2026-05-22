import React from 'react';

export const SpatialBackground: React.FC = () => {
  return (
    <div className="spatial-bg-container">
      <style>{`
        .spatial-bg-container {
          position: fixed;
          inset: 0;
          z-index: -1;
          background: linear-gradient(135deg, #070F2A 0%, #0a1628 50%, #000000 100%);
          overflow: hidden;
        }

        .spatial-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(44, 88, 253, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(44, 88, 253, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }



        .spatial-waves {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .wave {
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          will-change: transform;
        }

        .wave-1 { stroke: rgba(44, 88, 253, 0.07); stroke-width: 1.5; }
        .wave-2 { stroke: rgba(44, 88, 253, 0.05); stroke-width: 1; }
        .wave-3 { stroke: rgba(99, 102, 241, 0.08); stroke-width: 1.8; }
        .wave-4 { stroke: rgba(44, 88, 253, 0.04); stroke-width: 1.2; }
        .wave-5 { stroke: rgba(99, 102, 241, 0.06); stroke-width: 1.5; }

        .wave-group {
          transform-origin: center;
          animation: wave-float var(--dur) ease-in-out infinite alternate;
        }
        .wave-group:nth-child(1) { --dur: 6s; }
        .wave-group:nth-child(2) { --dur: 10s; }
        .wave-group:nth-child(3) { --dur: 8s; animation-delay: -2s; }
        .wave-group:nth-child(4) { --dur: 12s; animation-delay: -4s; }
        .wave-group:nth-child(5) { --dur: 7s; animation-delay: -1s; }

        @keyframes wave-float {
          0% { transform: translateY(0px) scaleY(1); opacity: 0.2; }
          50% { opacity: 0.4; }
          100% { transform: translateY(-16px) scaleY(1.05); opacity: 0.5; }
        }
      `}</style>

      <div className="spatial-grid" />

      <svg className="spatial-waves" width="100%" height="100%" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <g className="wave-group">
          <path className="wave wave-1" d="M0,100 Q200,0 400,100 T800,100" />
        </g>
        <g className="wave-group">
          <path className="wave wave-2" d="M0,260 Q200,160 400,260 T800,260" />
        </g>
        <g className="wave-group">
          <path className="wave wave-3" d="M0,420 Q200,320 400,420 T800,420" />
        </g>
        <g className="wave-group">
          <path className="wave wave-4" d="M0,580 Q200,480 400,580 T800,580" />
        </g>
        <g className="wave-group">
          <path className="wave wave-5" d="M0,740 Q200,640 400,740 T800,740" />
        </g>
      </svg>
    </div>
  );
};

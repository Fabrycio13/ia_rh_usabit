import React from 'react';

/**
 * SpatialBackground - Usabit 2025/2026 "NextGen" Aesthetic.
 * Features the signature #070F2A gradient and organic SVG line patterns (riscos).
 */
export const SpatialBackground: React.FC = () => {
  return (
    <div className="spatial-bg-container">
      <style>{`
        .spatial-bg-container {
          position: fixed;
          inset: 0;
          z-index: -1;
          background: linear-gradient(90deg, #070F2A 10.29%, #000000 89.71%);
          overflow: hidden;
        }

        .spatial-lines {
          position: absolute;
          inset: 0;
          opacity: 0.15;
          pointer-events: none;
        }

        .spatial-glow {
          position: absolute;
          width: 60vw;
          height: 60vw;
          background: radial-gradient(circle, rgba(44, 88, 253, 0.12) 0%, transparent 70%);
          filter: blur(80px);
          pointer-events: none;
        }

        .glow-1 { top: -10%; left: -10%; animation: pulse-glow 15s infinite alternate; }
        .glow-2 { bottom: -10%; right: -10%; animation: pulse-glow 20s infinite alternate-reverse; }

        @keyframes pulse-glow {
          0% { transform: scale(1) translate(0, 0); opacity: 0.3; }
          100% { transform: scale(1.2) translate(5%, 5%); opacity: 0.6; }
        }

        .risco-path {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: draw-risco 12s ease-out forwards;
        }

        @keyframes draw-risco {
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* Aurora Glows */}
      <div className="spatial-glow glow-1" />
      <div className="spatial-glow glow-2" />

      {/* Riscos SVG - Usabit 2025 Pattern */}
      <svg className="spatial-lines" width="100%" height="100%" viewBox="0 0 864 230" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path 
          className="risco-path"
          d="M870.378 922L866.533 916.584C846.848 887.969 842.196 856.972 837.659 827.012C833.276 797.744 829.085 770.089 812.207 743.97C796.828 727.799 777.911 721.654 757.88 715.124C750.191 712.589 742.117 709.977 734.235 706.712C697.248 691.348 669.643 672.143 639.538 647.83C602.244 611.878 568.294 571.855 535.46 533.099C516.236 510.476 496.666 487.353 476.289 464.883C474.753 492.089 470.686 519.092 464.139 545.544C437.918 604.196 431.42 669.762 425.192 733.138C424.077 744.661 422.923 756.184 421.693 767.323L421.347 770.742L418.617 768.629C361.292 724.688 312.886 699.991 256.752 686.086C251.485 684.972 246.102 683.974 240.758 682.937C199.004 674.947 159.556 667.381 136.949 625.936C110.036 579.652 104.999 523.727 100.27 469.646C99.4241 460.351 98.6167 451.171 97.7324 442.183C97.0788 436.998 96.4252 431.735 95.81 426.435C89.966 378.038 83.9297 327.99 57.0931 286.123C40.7144 266.918 20.1833 250.133 0.344292 234.039C-7.34525 227.779 -15.3808 221.326 -22.955 214.834C-52.6487 189.009 -80.203 160.827 -105.349 130.563L-112 122.612L-102.926 127.644C-45.6777 159.486 14.1855 182.839 91.081 203.388C156.788 224.821 200.849 249.48 243.103 288.428C275.092 314.547 310.964 336.863 345.643 358.411C378.209 378.691 411.927 399.625 442.647 423.9C453.028 434.194 463.14 444.795 473.059 455.55C474.443 431.505 474.674 407.192 474.943 383.262C475.251 354.647 475.597 325.071 477.827 297.032C478.596 292.768 479.365 288.697 480.095 284.549C489.4 233.041 499.934 174.696 563.027 161.406C616.854 147.387 651.88 124.379 673.295 89.0034C693.057 50.824 711.435 11.0697 729.237 -27.3787C734.619 -39.0553 740.028 -50.7191 745.461 -62.3701C768.915 -99.6662 793.06 -137.999 850.078 -118.948L851.077 -118.602L851.308 -117.565C853.5 -108.193 855.768 -99.359 857.921 -90.6783C866.034 -58.9133 873.07 -31.4886 870.57 1.81287C867.302 29.8905 876.684 66.0727 884.988 97.8377C887.872 108.938 890.602 119.463 892.678 128.566L928.627 300.335C935.47 333.636 941.391 367.668 947.12 400.585C951.811 427.472 956.655 455.511 961.999 482.859L962.384 484.895C977.263 560.063 984.722 597.782 959.308 672.604C951.08 691.233 941.353 710.246 931.087 730.219C901.559 787.834 868.11 853.361 870.186 915.086L870.378 922Z" 
          stroke="url(#risco-gradient)" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeOpacity="0.6"
          vectorEffect="non-scaling-stroke"
        />
        <defs>
          <linearGradient id="risco-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2C58FD" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>

    </div>
  );
};

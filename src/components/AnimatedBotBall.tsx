import React from "react";

const AnimatedBotBall = ({ size = 40 }) => {
  const ballStyle = {
    borderRadius: '50%',
    boxShadow: '0 2px 16px rgba(220, 20, 60, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.1)',
    animation: 'rotate 6s linear infinite, pulse 3s ease-in-out infinite',
    background: 'transparent',
  };

  const keyframes = `
    @keyframes rotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes pulse {
      0%, 100% { 
        box-shadow: 0 2px 16px rgba(220, 20, 60, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.1);
      }
      50% { 
        box-shadow: 0 4px 24px rgba(220, 20, 60, 0.6), 0 0 0 3px rgba(255, 255, 255, 0.2);
      }
    }
  `;

  return (
    <div style={{ display: 'inline-block' }}>
      <style>{keyframes}</style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={ballStyle}
      >
        <defs>
          {/* Основной радиальный градиент */}
          <radialGradient id="ballGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#1a1a1a">
              <animate 
                attributeName="stop-color" 
                values="#1a1a1a;#8b0000;#1a1a1a" 
                dur="4s" 
                repeatCount="indefinite" 
              />
            </stop>
            <stop offset="40%" stopColor="#8b0000">
              <animate 
                attributeName="stop-color" 
                values="#8b0000;#dc143c;#8b0000" 
                dur="3s" 
                repeatCount="indefinite" 
              />
            </stop>
            <stop offset="70%" stopColor="#dc143c">
              <animate 
                attributeName="stop-color" 
                values="#dc143c;#ff0000;#dc143c" 
                dur="5s" 
                repeatCount="indefinite" 
              />
            </stop>
            <stop offset="100%" stopColor="#000000">
              <animate 
                attributeName="stop-color" 
                values="#000000;#2d0000;#000000" 
                dur="6s" 
                repeatCount="indefinite" 
              />
            </stop>
          </radialGradient>
          {/* Градиент для бликов */}
          <radialGradient id="highlightGradient" cx="25%" cy="25%" r="30%">
            <stop offset="0%" stopColor="#ff4444" stopOpacity="0.8">
              <animate 
                attributeName="stop-opacity" 
                values="0.8;0.3;0.8" 
                dur="2s" 
                repeatCount="indefinite" 
              />
            </stop>
            <stop offset="100%" stopColor="#ff4444" stopOpacity="0">
              <animate 
                attributeName="stop-opacity" 
                values="0;0.2;0" 
                dur="2s" 
                repeatCount="indefinite" 
              />
            </stop>
          </radialGradient>
          {/* Градиент для переливов */}
          <linearGradient id="shineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b0000" stopOpacity="0.3">
              <animate 
                attributeName="stop-opacity" 
                values="0.3;0.7;0.3" 
                dur="3s" 
                repeatCount="indefinite" 
              />
            </stop>
            <stop offset="50%" stopColor="#ff0000" stopOpacity="0.5">
              <animate 
                attributeName="stop-opacity" 
                values="0.5;0.9;0.5" 
                dur="3s" 
                repeatCount="indefinite" 
              />
            </stop>
            <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.2">
              <animate 
                attributeName="stop-opacity" 
                values="0.2;0.6;0.2" 
                dur="3s" 
                repeatCount="indefinite" 
              />
            </stop>
          </linearGradient>
        </defs>
        {/* Основной шар */}
        <circle 
          cx="50" 
          cy="50" 
          r="48" 
          fill="url(#ballGradient)" 
        />
        {/* Слой переливов */}
        <circle 
          cx="50" 
          cy="50" 
          r="48" 
          fill="url(#shineGradient)" 
          opacity="0.6"
        />
        {/* Блики */}
        <circle 
          cx="50" 
          cy="50" 
          r="48" 
          fill="url(#highlightGradient)" 
        />
        {/* Дополнительные анимированные элементы */}
        <circle 
          cx="35" 
          cy="35" 
          r="8" 
          fill="#ff0000" 
          opacity="0.4"
        >
          <animate 
            attributeName="opacity" 
            values="0.4;0.8;0.4" 
            dur="2s" 
            repeatCount="indefinite" 
          />
          <animate 
            attributeName="r" 
            values="8;12;8" 
            dur="2s" 
            repeatCount="indefinite" 
          />
        </circle>
        <circle 
          cx="65" 
          cy="65" 
          r="6" 
          fill="#8b0000" 
          opacity="0.3"
        >
          <animate 
            attributeName="opacity" 
            values="0.3;0.7;0.3" 
            dur="3s" 
            repeatCount="indefinite" 
          />
          <animate 
            attributeName="r" 
            values="6;10;6" 
            dur="3s" 
            repeatCount="indefinite" 
          />
        </circle>
      </svg>
    </div>
  );
};

export default AnimatedBotBall; 
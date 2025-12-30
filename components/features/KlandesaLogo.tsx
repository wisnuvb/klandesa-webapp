import React from 'react';

interface KlandesaLogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'default' | 'white' | 'dark';
}

export function KlandesaLogo({
  className = 'w-10 h-10',
  showText = true,
  variant = 'default',
}: KlandesaLogoProps) {
  const colors = {
    default: {
      primary: '#0d9488',
      secondary: '#0f766e',
      accent: '#14b8a6',
      text: '#1f2937',
    },
    white: {
      primary: '#ffffff',
      secondary: '#f0fdfa',
      accent: '#ccfbf1',
      text: '#ffffff',
    },
    dark: {
      primary: '#1f2937',
      secondary: '#374151',
      accent: '#4b5563',
      text: '#1f2937',
    },
  };

  const currentColors = colors[variant];

  return (
    <div className="flex items-center gap-3">
      {/* Logo Icon */}
      <svg
        className={className}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Circle */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill={currentColors.primary}
          opacity="0.1"
        />

        {/* Village Houses - Modern Geometric Style */}
        <g transform="translate(20, 35)">
          {/* Left House */}
          <path
            d="M 0 25 L 10 15 L 20 25 L 20 40 L 0 40 Z"
            fill={currentColors.primary}
          />
          <rect
            x="6"
            y="28"
            width="8"
            height="12"
            fill={currentColors.secondary}
            opacity="0.8"
          />
          <rect
            x="7"
            y="30"
            width="3"
            height="4"
            fill={currentColors.accent}
            opacity="0.6"
          />
          <rect
            x="12"
            y="30"
            width="3"
            height="4"
            fill={currentColors.accent}
            opacity="0.6"
          />

          {/* Middle House (Taller) */}
          <path
            d="M 18 20 L 30 8 L 42 20 L 42 40 L 18 40 Z"
            fill={currentColors.secondary}
          />
          <rect
            x="24"
            y="25"
            width="12"
            height="15"
            fill={currentColors.primary}
            opacity="0.8"
          />
          <rect
            x="26"
            y="28"
            width="4"
            height="5"
            fill={currentColors.accent}
            opacity="0.6"
          />
          <rect
            x="32"
            y="28"
            width="4"
            height="5"
            fill={currentColors.accent}
            opacity="0.6"
          />
          <rect
            x="29"
            y="35"
            width="4"
            height="5"
            fill={currentColors.accent}
            opacity="0.9"
          />

          {/* Right House */}
          <path
            d="M 40 25 L 50 15 L 60 25 L 60 40 L 40 40 Z"
            fill={currentColors.primary}
          />
          <rect
            x="46"
            y="28"
            width="8"
            height="12"
            fill={currentColors.secondary}
            opacity="0.8"
          />
          <rect
            x="47"
            y="30"
            width="3"
            height="4"
            fill={currentColors.accent}
            opacity="0.6"
          />
          <rect
            x="52"
            y="30"
            width="3"
            height="4"
            fill={currentColors.accent}
            opacity="0.6"
          />
        </g>

        {/* Digital Connection Lines */}
        <g opacity="0.6">
          <line
            x1="30"
            y1="55"
            x2="50"
            y2="45"
            stroke={currentColors.accent}
            strokeWidth="2"
            strokeDasharray="2,2"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;4"
              dur="1s"
              repeatCount="indefinite"
            />
          </line>
          <line
            x1="50"
            y1="45"
            x2="70"
            y2="55"
            stroke={currentColors.accent}
            strokeWidth="2"
            strokeDasharray="2,2"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;4"
              dur="1s"
              repeatCount="indefinite"
            />
          </line>
        </g>

        {/* Connection Nodes */}
        <circle cx="30" cy="55" r="3" fill={currentColors.accent}>
          <animate
            attributeName="opacity"
            values="0.5;1;0.5"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="50" cy="45" r="3" fill={currentColors.accent}>
          <animate
            attributeName="opacity"
            values="1;0.5;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="70" cy="55" r="3" fill={currentColors.accent}>
          <animate
            attributeName="opacity"
            values="0.5;1;0.5"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Bottom Wave representing countryside */}
        <path
          d="M 10 75 Q 30 70, 50 75 T 90 75 L 90 90 L 10 90 Z"
          fill={currentColors.primary}
          opacity="0.15"
        />
      </svg>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span
            className="text-2xl font-bold"
            style={{ color: currentColors.text }}
          >
            Klandesa
          </span>
          <span className="text-xs text-gray-500 -mt-1">Digitalisasi Desa</span>
        </div>
      )}
    </div>
  );
}

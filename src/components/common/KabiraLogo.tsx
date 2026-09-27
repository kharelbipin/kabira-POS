import React from 'react';

interface KabiraLogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'badge';
  theme?: 'dark' | 'light';
  className?: string;
  subtitle?: string; // Default: '377 SPIRITS'
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * KaBiRa Emblem Icon (Stylized "K" with dark stem, royal blue chevron arms,
 * swoosh orbit ring, and top-right tech pixel squares) matching the user's brand image.
 */
export const KabiraEmblem: React.FC<{
  className?: string;
  size?: number;
  theme?: 'dark' | 'light';
}> = ({ className = '', size = 36, theme = 'dark' }) => {
  const stemFill = theme === 'dark' ? '#E2E8F0' : '#1E293B';
  const ringSilver = theme === 'dark' ? '#94A3B8' : '#64748B';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="KaBiRa Logo Emblem"
    >
      <defs>
        <linearGradient id="emblem-blue-primary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="45%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
        <linearGradient id="emblem-blue-bright" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="emblem-orbit-blue" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="50%" stopColor="#0088FF" />
          <stop offset="100%" stopColor="#0044CC" />
        </linearGradient>
      </defs>

      {/* Back Orbit Ring (Silver Arc) */}
      <path
        d="M 32 58 C 32 40, 52 30, 80 37 C 98 42, 102 52, 92 60 C 84 66, 68 70, 48 66 C 36 63, 31 60, 32 58 Z"
        fill={ringSilver}
        opacity={theme === 'dark' ? 0.75 : 0.65}
      />

      {/* Vertical Stem of the K */}
      <rect
        x="33"
        y="16"
        width="16"
        height="56"
        rx="1.5"
        fill={stemFill}
      />

      {/* Upper Diagonal Arm of the K */}
      <polygon
        points="46,47 72,16 88,16 58,54"
        fill="url(#emblem-blue-bright)"
      />

      {/* Lower Diagonal Arm of the K */}
      <polygon
        points="52,48 83,72 68,72 44,52"
        fill="url(#emblem-blue-primary)"
      />

      {/* Front Dynamic Orbit Ring (Cyan-Blue Arc cutting around front) */}
      <path
        d="M 22 62 C 22 44, 46 32, 74 38 C 88 41, 98 47, 98 52 C 92 54, 82 54, 70 53 C 46 51, 31 56, 25 68 C 22 73, 21 73, 20 75 C 20 74, 21 68, 22 62 Z"
        fill="url(#emblem-orbit-blue)"
      />

      {/* Dynamic Swoosh Highlight Tip */}
      <path
        d="M 22 67 C 23 57, 34 49, 52 46 C 39 52, 29 60, 24 71 C 23 74, 22 74, 22 67 Z"
        fill="#E0F2FE"
      />

      {/* Top-Right Digital Tech Pixel Blocks */}
      <rect x="88" y="10" width="6.5" height="6.5" rx="0.5" fill="#38BDF8" />
      <rect x="81" y="16" width="7" height="7" rx="0.5" fill="#0284C7" />
      <rect x="88" y="18" width="6.5" height="6.5" rx="0.5" fill={theme === 'dark' ? '#CBD5E1' : '#1E293B'} />
      <rect x="85" y="25" width="5.5" height="5.5" rx="0.5" fill="#60A5FA" />
    </svg>
  );
};

export const KabiraLogo: React.FC<KabiraLogoProps> = ({
  variant = 'full',
  theme = 'dark',
  className = '',
  subtitle = '377 SPIRITS',
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 26 : size === 'md' ? 34 : size === 'lg' ? 44 : 58;
  const isDark = theme === 'dark';

  if (variant === 'icon') {
    return <KabiraEmblem size={iconSize} theme={theme} className={className} />;
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-lg border ${isDark ? 'bg-slate-900/80 border-slate-700/60' : 'bg-slate-50 border-slate-200'} ${className}`}>
        <KabiraEmblem size={22} theme={theme} />
        <div className="flex items-center space-x-1">
          <span className={`font-black tracking-tight text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Ka</span>
          <span className="font-black tracking-tight text-xs text-sky-400">Bi</span>
          <span className={`font-black tracking-tight text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Ra</span>
        </div>
        <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono">
          377
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      {/* Emblem */}
      <KabiraEmblem size={iconSize} theme={theme} />

      {/* Typography & Subtitle */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center space-x-1.5 leading-none">
          {/* "KaBiRa" with distinct "Bi" in royal cyan-blue */}
          <div className="flex items-baseline tracking-tight font-black text-lg sm:text-xl">
            <span className={isDark ? 'text-white' : 'text-slate-900'}>Ka</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">Bi</span>
            <span className={isDark ? 'text-white' : 'text-slate-900'}>Ra</span>
          </div>

          {/* POS Badge */}
          <span className="text-[10px] font-mono font-black tracking-wider px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 uppercase">
            POS
          </span>
        </div>

        {/* Subtitle: 377 SPIRITS (Replaced Granbury, TX) */}
        {variant !== 'compact' && subtitle && (
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span className="font-['Cinzel',serif] text-[10px] font-black tracking-[0.22em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 uppercase">
              {subtitle}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

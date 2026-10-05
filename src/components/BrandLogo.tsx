import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  clickable = false,
  onClick,
}) => {
  const sizeMap = {
    sm: { height: 32, iconSize: 32, fontSize: 'text-lg', subSize: 'text-[9px]' },
    md: { height: 42, iconSize: 42, fontSize: 'text-2xl', subSize: 'text-[11px]' },
    lg: { height: 56, iconSize: 56, fontSize: 'text-3xl', subSize: 'text-[13px]' },
    xl: { height: 72, iconSize: 72, fontSize: 'text-4xl', subSize: 'text-[15px]' },
  };

  const currentSize = sizeMap[size];

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`inline-flex items-center gap-2.5 select-none ${
        clickable ? 'cursor-pointer group' : ''
      } ${className}`}
      dir="ltr"
    >
      {/* Dynamic Emblem: Circular Arrow with Slashing Lightning Bolt */}
      <div
        className="relative shrink-0 transition-transform duration-300 group-hover:scale-105"
        style={{ width: currentSize.iconSize, height: currentSize.iconSize }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-[0_2px_8px_rgba(250,204,21,0.35)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Circular arrow path */}
          <path
            d="M 52 14 A 36 36 0 1 0 74 74"
            stroke="#000000"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path
            d="M 52 14 A 36 36 0 1 0 74 74"
            stroke="#FACC15"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Circular Arrow Head Top */}
          <polygon
            points="58,6 74,18 54,28"
            fill="#FACC15"
            stroke="#000000"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Circular Arrow Head Bottom */}
          <polygon
            points="68,82 82,70 82,88"
            fill="#FACC15"
            stroke="#000000"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Aggressive Slashing Lightning Bolt */}
          <polygon
            points="58,4 32,50 48,50 30,94 76,42 54,42 70,12"
            fill="#000000"
            stroke="#000000"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <polygon
            points="56,7 34,48 50,48 34,90 72,44 52,44 68,14"
            fill="url(#lightningGrad)"
            stroke="#FDE047"
            strokeWidth="1"
            strokeLinejoin="round"
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="lightningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF066" />
              <stop offset="50%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#EAB308" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Typography: FLEXJO + Subtitle */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center">
          <span
            className={`font-black tracking-tighter uppercase font-brand ${currentSize.fontSize} text-[#FACC15] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
            style={{
              WebkitTextStroke: '1px #000000',
              fontStyle: 'italic',
            }}
          >
            FLEXJO
          </span>
          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-widest shadow-sm">
            VIP
          </span>
        </div>

        {showSubtitle && (
          <span
            className={`font-bold tracking-[0.2em] uppercase text-[#FDE047]/90 font-brand mt-0.5 ${currentSize.subSize}`}
          >
            YOUR ACTIVE JOURNEY
          </span>
        )}
      </div>
    </div>
  );
};

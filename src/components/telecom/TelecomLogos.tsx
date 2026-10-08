import React from 'react';
import ggdLogo from '@/assets/ggd-logo.png';
import { Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';

export type NetworkProvider = 'mtn' | 'airtel' | 'glo' | '9mobile' | 'all';

interface NetworkLogoProps {
  network: NetworkProvider;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
}

/**
 * Authentic MTN Nigeria Logo Component
 */
export const MtnLogo: React.FC<{ size?: string; className?: string }> = ({ size = "h-8 w-8", className = "" }) => (
  <div className={`relative flex items-center justify-center rounded-xl bg-[#FFCC00] shadow-sm select-none shrink-0 overflow-hidden ${size} ${className}`} title="MTN Nigeria">
    <svg viewBox="0 0 100 60" className="w-4/5 h-4/5" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer oval ring */}
      <ellipse cx="50" cy="30" rx="46" ry="26" stroke="#000000" strokeWidth="5.5" fill="none" />
      {/* MTN bold text */}
      <text
        x="50"
        y="38"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, 'Arial Black', sans-serif"
        fontWeight="900"
        fontSize="24"
        letterSpacing="-0.5"
        fill="#000000"
      >
        MTN
      </text>
    </svg>
  </div>
);

/**
 * Authentic Airtel Nigeria Logo Component
 */
export const AirtelLogo: React.FC<{ size?: string; className?: string }> = ({ size = "h-8 w-8", className = "" }) => (
  <div className={`relative flex items-center justify-center rounded-xl bg-[#E60000] shadow-sm select-none shrink-0 overflow-hidden ${size} ${className}`} title="Airtel Nigeria">
    <svg viewBox="0 0 100 100" className="w-4/5 h-4/5" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Airtel iconic curved swirl emblem */}
      <path
        d="M 50,15 C 32,15 20,28 20,44 C 20,62 34,75 52,75 C 64,75 74,68 78,58 C 80,53 76,49 71,49 C 67,49 64,52 61,56 C 58,60 54,63 49,63 C 39,63 32,55 32,44 C 32,35 39,27 49,27 C 62,27 70,36 70,50 C 70,55 74,59 79,59 C 84,59 88,55 88,48 C 88,29 72,15 50,15 Z"
        fill="#FFFFFF"
      />
      {/* Small dot/accent */}
      <circle cx="50" cy="45" r="4.5" fill="#FFFFFF" />
      {/* Lower brand wordmark */}
      <text
        x="50"
        y="92"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="16"
        letterSpacing="-0.5"
        fill="#FFFFFF"
      >
        airtel
      </text>
    </svg>
  </div>
);

/**
 * Authentic Glo (Globacom) Logo Component
 */
export const GloLogo: React.FC<{ size?: string; className?: string }> = ({ size = "h-8 w-8", className = "" }) => (
  <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#00D06C] via-[#00A859] to-[#006837] shadow-sm select-none shrink-0 overflow-hidden ${size} ${className}`} title="Glo (Globacom)">
    <svg viewBox="0 0 100 100" className="w-4/5 h-4/5" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 3D sphere glow accent */}
      <circle cx="48" cy="48" r="40" fill="url(#gloSphereGrad)" />
      <defs>
        <radialGradient id="gloSphereGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#4AE88A" />
          <stop offset="60%" stopColor="#00A859" />
          <stop offset="100%" stopColor="#004D25" />
        </radialGradient>
      </defs>
      {/* glo wordmark */}
      <text
        x="49"
        y="58"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, 'Trebuchet MS', sans-serif"
        fontWeight="900"
        fontSize="34"
        fontStyle="italic"
        letterSpacing="-1.5"
        fill="#FFFFFF"
      >
        glo
      </text>
    </svg>
  </div>
);

/**
 * Authentic 9mobile Logo Component
 */
export const NineMobileLogo: React.FC<{ size?: string; className?: string }> = ({ size = "h-8 w-8", className = "" }) => (
  <div className={`relative flex items-center justify-center rounded-xl bg-[#00573D] shadow-sm select-none shrink-0 overflow-hidden ${size} ${className}`} title="9mobile">
    <svg viewBox="0 0 100 100" className="w-4/5 h-4/5" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 9mobile neon lime accent loop */}
      <circle cx="50" cy="50" r="40" stroke="#8DC63F" strokeWidth="6" fill="#004630" />
      <path
        d="M 50,22 C 38,22 30,31 30,42 C 30,53 38,62 50,62 C 60,62 68,54 68,42 C 68,26 55,22 50,22 Z M 50,52 C 43,52 39,47 39,42 C 39,37 43,32 50,32 C 57,32 60,37 60,42 C 60,47 56,52 50,52 Z"
        fill="#8DC63F"
      />
      <path
        d="M 60,42 L 60,70 C 60,75 56,78 50,78 C 45,78 42,75 42,72"
        stroke="#8DC63F"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <text
        x="50"
        y="92"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="12"
        fill="#FFFFFF"
      >
        9mobile
      </text>
    </svg>
  </div>
);

/**
 * Multi-Network combined badge
 */
export const MultiNetworkLogo: React.FC<{ size?: string; className?: string }> = ({ size = "h-8 w-8", className = "" }) => (
  <div className={`relative grid grid-cols-2 grid-rows-2 p-1 gap-1 rounded-xl bg-slate-900 border border-slate-700 shadow-sm shrink-0 overflow-hidden ${size} ${className}`} title="All Networks">
    <div className="bg-[#FFCC00] rounded-xs flex items-center justify-center font-black text-[7px] text-black">M</div>
    <div className="bg-[#E60000] rounded-xs flex items-center justify-center font-black text-[7px] text-white">A</div>
    <div className="bg-[#00A859] rounded-xs flex items-center justify-center font-black text-[7px] text-white">G</div>
    <div className="bg-[#00573D] rounded-xs flex items-center justify-center font-black text-[7px] text-[#8DC63F]">9</div>
  </div>
);

/**
 * Universal Network Logo selector component
 */
export const NetworkLogo: React.FC<NetworkLogoProps> = ({
  network,
  className = '',
  size = 'md',
  showLabel = false,
}) => {
  const sizeMap = {
    sm: 'h-6 w-6',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const currentSize = sizeMap[size];

  const renderLogo = () => {
    switch (network) {
      case 'mtn':
        return <MtnLogo size={currentSize} className={className} />;
      case 'airtel':
        return <AirtelLogo size={currentSize} className={className} />;
      case 'glo':
        return <GloLogo size={currentSize} className={className} />;
      case '9mobile':
        return <NineMobileLogo size={currentSize} className={className} />;
      case 'all':
      default:
        return <MultiNetworkLogo size={currentSize} className={className} />;
    }
  };

  const labelMap: Record<NetworkProvider, string> = {
    mtn: 'MTN',
    airtel: 'Airtel',
    glo: 'Glo',
    '9mobile': '9mobile',
    all: 'All Networks',
  };

  if (!showLabel) return renderLogo();

  return (
    <div className="flex items-center gap-2">
      {renderLogo()}
      <span className="font-bold text-xs uppercase tracking-wider">{labelMap[network]}</span>
    </div>
  );
};

interface GGDRewardBadgeProps {
  customLogoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

/**
 * GGD Rewards Official Design Brand Crest / Seal
 * Allows custom admin uploaded reward logo with smooth fallback to official GGD logo
 */
export const GGDRewardBrandBadge: React.FC<GGDRewardBadgeProps> = ({
  customLogoUrl,
  size = 'md',
  showText = true,
  className = '',
}) => {
  const logoSrc = customLogoUrl || ggdLogo;

  const sizeClasses = {
    sm: 'h-5',
    md: 'h-7',
    lg: 'h-9',
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-red-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-xs backdrop-blur-xs select-none ${className}`}
    >
      <div className="relative shrink-0 flex items-center justify-center">
        <img
          src={logoSrc}
          alt="GGD Rewards"
          className={`${sizeClasses[size]} w-auto object-contain rounded-full shadow-xs`}
          onError={(e) => {
            // Fallback to default ggdLogo if custom url errors
            (e.target as HTMLImageElement).src = ggdLogo;
          }}
        />
        <div className="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-white rounded-full p-[2px] shadow-xs">
          <Sparkles className="h-2 w-2" />
        </div>
      </div>
      {showText && (
        <div className="flex flex-col text-left leading-none pr-0.5">
          <span className="text-[9px] font-black tracking-wider uppercase bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 dark:from-amber-400 dark:via-orange-300 dark:to-yellow-200 bg-clip-text text-transparent">
            GGD REWARDS
          </span>
          <span className="text-[7.5px] font-medium text-muted-foreground flex items-center gap-0.5">
            <ShieldCheck className="h-2 w-2 text-emerald-600 dark:text-emerald-400" />
            Verified Voucher
          </span>
        </div>
      )}
    </div>
  );
};

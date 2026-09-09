import React from 'react';
import { Flame, Sparkles } from 'lucide-react';

interface BlazingBadgeProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BlazingBadge: React.FC<BlazingBadgeProps> = ({
  label = 'FEATURED NEW ARRIVAL',
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[9px] px-2 py-0.5 gap-1',
    md: 'text-[11px] px-2.5 py-1 gap-1.5',
    lg: 'text-xs px-3 py-1.5 gap-2 font-black',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <div
      className={`relative inline-flex items-center font-black rounded-full text-white shadow-lg select-none overflow-hidden ${sizeClasses[size]} ${className} bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 animate-pulse border border-yellow-300/40`}
      style={{
        boxShadow: '0 0 14px rgba(249, 115, 22, 0.65), 0 0 4px rgba(239, 68, 68, 0.8)',
      }}
    >
      {/* Blazing animated sheen */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
      <span className="relative flex items-center gap-1">
        <Flame className={`${iconSizes[size]} text-yellow-200 fill-yellow-300 animate-bounce`} />
        <span className="tracking-wider uppercase font-black text-yellow-100 drop-shadow-sm">
          {label}
        </span>
        <Sparkles className={`${iconSizes[size]} text-yellow-200 opacity-80`} />
      </span>
    </div>
  );
};

export default BlazingBadge;

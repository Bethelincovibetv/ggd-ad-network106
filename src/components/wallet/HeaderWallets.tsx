import React, { useState } from 'react';
import { 
  Banknote, Coins, ArrowUpRight, Plus, Sparkles, 
  Wallet, Shield, Crown, Briefcase, Users, ChevronDown, CheckCircle2
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface HeaderWalletsProps {
  walletBalance: number;
  credits: number;
  isAdmin: boolean;
  isPremium?: boolean;
  isBusiness?: boolean;
  isSyndicate?: boolean;
  onNavigate: (tab: string) => void;
  className?: string;
}

/**
 * Format currency compactly for small viewports to prevent header overflow
 */
function formatCompactNaira(amount: number): string {
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return `₦${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
  }
  if (amount >= 100_000) {
    const val = amount / 1_000;
    return `₦${val.toFixed(0)}k`;
  }
  if (amount >= 10_000) {
    const val = amount / 1_000;
    return `₦${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}k`;
  }
  return `₦${amount.toLocaleString()}`;
}

function formatCompactCredits(credits: number, isAdmin: boolean): string {
  if (isAdmin) return '∞';
  if (credits >= 1_000_000) {
    const val = credits / 1_000_000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
  }
  if (credits >= 10_000) {
    const val = credits / 1_000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}k`;
  }
  return credits.toLocaleString();
}

export const HeaderWallets: React.FC<HeaderWalletsProps> = ({
  walletBalance,
  credits,
  isAdmin,
  isPremium,
  isBusiness,
  isSyndicate,
  onNavigate,
  className = '',
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <div className={`flex items-center gap-1 sm:gap-2 flex-shrink-0 ${className}`}>
      {/* ========================================================
          MOBILE/COMPACT DUAL WALLET CAPSULE (< 640px)
          Prevents horizontal header stretching and nav bar overlap
         ======================================================== */}
      <div className="flex sm:hidden items-center bg-card/90 border border-border/80 shadow-xs rounded-full p-0.5 backdrop-blur-xs">
        {/* Cash Segment */}
        <button
          type="button"
          onClick={() => onNavigate('task-wallet')}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-black text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 active:scale-95 transition-all"
          title={`Naira Cash Wallet: ₦${walletBalance.toLocaleString()} (Click to open)`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span>{formatCompactNaira(walletBalance)}</span>
        </button>

        {/* Divider */}
        <div className="h-3 w-px bg-border/80 my-auto" />

        {/* Credit Segment */}
        <button
          type="button"
          onClick={() => onNavigate('fund-credits')}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-black text-orange-700 dark:text-orange-400 hover:bg-orange-500/15 active:scale-95 transition-all"
          title={`Credit Wallet: ${isAdmin ? 'Unlimited' : credits.toLocaleString()} cr (Click to top up)`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
          </span>
          <span>{formatCompactCredits(credits, isAdmin)}</span>
          <span className="text-[9px] font-extrabold opacity-75">cr</span>
        </button>

        {/* Quick Popover Trigger */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-5 w-5 grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full transition-colors mr-0.5"
              aria-label="View wallet summary"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 text-card-foreground shadow-xl rounded-2xl border-border/80" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-black">Wallet Overview</span>
                </div>
                {isAdmin ? (
                  <Badge variant="outline" className="text-[9px] font-bold text-red-500 border-red-500/30">Admin Unlimited</Badge>
                ) : isPremium ? (
                  <Badge variant="outline" className="text-[9px] font-bold text-amber-500 border-amber-500/30">VIP Premium</Badge>
                ) : null}
              </div>

              {/* Cash Wallet Detail */}
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Banknote className="h-3.5 w-3.5" /> Naira Cash Balance
                  </span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                    ₦{walletBalance.toLocaleString()}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Available for withdrawals, task rewards & transfers.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 h-7 text-[11px] font-bold border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg gap-1"
                  onClick={() => {
                    setPopoverOpen(false);
                    onNavigate('task-wallet');
                  }}
                >
                  Open Cash Wallet <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>

              {/* Credit Wallet Detail */}
              <div className="bg-orange-500/10 border border-orange-500/25 rounded-xl p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5" /> Advertising Credits
                  </span>
                  <span className="text-xs font-black text-orange-700 dark:text-orange-300">
                    {isAdmin ? 'Unlimited' : `${credits.toLocaleString()} cr`}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Used to run campaigns, broadcast ads & create tasks.</p>
                <Button
                  size="sm"
                  className="w-full mt-2 h-7 text-[11px] font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg gap-1 shadow-xs"
                  onClick={() => {
                    setPopoverOpen(false);
                    onNavigate('fund-credits');
                  }}
                >
                  <Plus className="h-3 w-3" /> Top Up Credits
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* ========================================================
          TABLET & DESKTOP DUAL WALLET PILLS (>= 640px)
          Spacious, high-contrast, fully readable badges
         ======================================================== */}
      {/* Live Connected Cash Wallet Pill */}
      <button
        type="button"
        onClick={() => onNavigate('task-wallet')}
        className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1.5 rounded-full transition-all text-xs font-bold shadow-xs group cursor-pointer"
        title="Naira Cash Wallet (Click to manage / withdraw)"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-emerald-700 dark:text-emerald-400 font-black text-xs md:text-sm">
          ₦{walletBalance.toLocaleString()}
        </span>
        <Banknote className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
      </button>

      {/* Live Connected Credit Wallet Pill */}
      <button
        type="button"
        onClick={() => onNavigate('fund-credits')}
        className="hidden sm:flex items-center gap-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 px-2.5 py-1.5 rounded-full transition-all text-xs font-bold shadow-xs group cursor-pointer"
        title="Credit Wallet (Click to top up / fund)"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
        </span>
        <span className="text-orange-700 dark:text-orange-400 font-black text-xs md:text-sm">
          {isAdmin ? '∞' : credits.toLocaleString()}{' '}
          <span className="text-[10px] font-extrabold opacity-80">cr</span>
        </span>
        <Coins className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform" />
      </button>

      {/* Role Indicators (Responsive: compact/hidden on tiny mobile, visible on tablet+) */}
      <div className="hidden md:flex items-center gap-1">
        {isAdmin && (
          <span title="Administrator Access">
            <Shield className="h-4 w-4 text-red-500" />
          </span>
        )}
        {isPremium && (
          <span title="VIP Premium Member">
            <Crown className="h-4 w-4 text-yellow-500" />
          </span>
        )}
        {isBusiness && (
          <span title="Accredited Business">
            <Briefcase className="h-4 w-4 text-blue-500" />
          </span>
        )}
        {isSyndicate && (
          <span title="Syndicate Member">
            <Users className="h-4 w-4 text-purple-500" />
          </span>
        )}
      </div>
    </div>
  );
};

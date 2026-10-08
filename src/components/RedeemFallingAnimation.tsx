import React, { useEffect, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, Coins, Smartphone, Wifi, CheckCircle2, 
  ExternalLink, ArrowUpRight, Copy, Check, ShieldCheck 
} from 'lucide-react';
import { NetworkLogo, GGDRewardBrandBadge } from '@/components/telecom/TelecomLogos';
import { RedeemOffer, NETWORK_THEMES } from '@/services/redeemMarketplaceService';
import { playRedeemSound } from '@/utils/redeemSound';
import { Button } from '@/components/ui/button';

interface FallingToken {
  id: number;
  type: 'coin' | 'diamond' | 'airtime' | 'star' | 'data';
  left: number; // percentage across screen 0-100
  delay: number; // in seconds
  duration: number; // in seconds
  size: number; // px
  rotation: number; // deg
  drift: number; // px horizontal drift
  opacity: number;
}

interface RedeemFallingAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  offer: RedeemOffer;
  appLink: string;
  globalRewardLogo?: string | null;
  userRemainingCredits?: number;
}

export const RedeemFallingAnimation: React.FC<RedeemFallingAnimationProps> = ({
  isOpen,
  onClose,
  offer,
  appLink,
  globalRewardLogo,
  userRemainingCredits,
}) => {
  const [copied, setCopied] = useState(false);
  const [tokensActive, setTokensActive] = useState(false);

  // Generate a random cascade of falling luxury tokens (gold coins, airtime vouchers, sparkles)
  const tokens = useMemo<FallingToken[]>(() => {
    const list: FallingToken[] = [];
    const types: ('coin' | 'diamond' | 'airtime' | 'star' | 'data')[] = [
      'coin', 'coin', 'diamond', 'airtime', 'star', 'data', 'coin'
    ];

    for (let i = 0; i < 48; i++) {
      list.push({
        id: i,
        type: types[i % types.length],
        left: Math.random() * 96 + 2,
        delay: Math.random() * 1.8,
        duration: 2.2 + Math.random() * 2.2,
        size: 16 + Math.floor(Math.random() * 22),
        rotation: Math.floor(Math.random() * 360),
        drift: (Math.random() - 0.5) * 120,
        opacity: 0.75 + Math.random() * 0.25,
      });
    }
    return list;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTokensActive(false);
      return;
    }

    setTokensActive(true);

    // 1. Play celebratory falling & unlock sound immediately
    playRedeemSound();

    // 2. Fire high-impact golden celebration confetti bursts
    try {
      // First wave
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.35, x: 0.5 },
        colors: ['#f59e0b', '#e67e22', '#10b981', '#3b82f6', '#ffffff'],
        disableForReducedMotion: true,
      });

      // Second staggered wave with higher spread
      const timer = setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0.15, y: 0.4 },
          colors: ['#e67e22', '#fbbf24', '#ffffff'],
          disableForReducedMotion: true,
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 0.85, y: 0.4 },
          colors: ['#e67e22', '#fbbf24', '#ffffff'],
          disableForReducedMotion: true,
        });
      }, 350);

      return () => clearTimeout(timer);
    } catch (err) {
      console.warn('Confetti effect skipped:', err);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(appLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  const networkTheme = NETWORK_THEMES[offer.network] || {
    name: offer.network,
    color: '#e67e22',
    bgBadge: 'bg-orange-500/10 text-orange-600',
    border: 'border-orange-500/20'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Dark Ambient Backdrop with Orange Glow */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* FALLING REWARDS RAIN LAYER */}
      {tokensActive && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-10">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="absolute select-none will-change-transform animate-fall"
              style={{
                left: `${token.left}%`,
                top: '-40px',
                animationDelay: `${token.delay}s`,
                animationDuration: `${token.duration}s`,
                animationTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                transform: `rotate(${token.rotation}deg)`,
              }}
            >
              {token.type === 'coin' && (
                <div 
                  className="rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 border border-amber-200 text-yellow-950 font-black"
                  style={{ width: token.size, height: token.size, fontSize: token.size * 0.55 }}
                >
                  ₦
                </div>
              )}
              {token.type === 'airtime' && (
                <div 
                  className="rounded-lg flex items-center justify-center shadow-lg bg-gradient-to-br from-orange-500 to-amber-600 border border-orange-300 text-white font-bold p-1"
                  style={{ width: token.size * 1.3, height: token.size * 0.9 }}
                >
                  <Smartphone className="w-full h-full" />
                </div>
              )}
              {token.type === 'data' && (
                <div 
                  className="rounded-lg flex items-center justify-center shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 border border-emerald-300 text-white font-bold p-1"
                  style={{ width: token.size * 1.2, height: token.size * 0.9 }}
                >
                  <Wifi className="w-full h-full" />
                </div>
              )}
              {token.type === 'diamond' && (
                <div 
                  className="rounded-md flex items-center justify-center shadow-md bg-gradient-to-tr from-cyan-400 to-blue-500 text-white"
                  style={{ width: token.size * 0.85, height: token.size * 0.85 }}
                >
                  <Sparkles className="w-full h-full p-0.5" />
                </div>
              )}
              {token.type === 'star' && (
                <div 
                  className="rounded-full flex items-center justify-center text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  style={{ width: token.size * 0.8, height: token.size * 0.8 }}
                >
                  ★
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL CARD: 3D Depth, Orange Glow, Celebratory Unlocked UI */}
      <div 
        className="relative z-20 w-full max-w-lg bg-card/95 border-2 border-orange-500/40 rounded-3xl shadow-2xl shadow-orange-500/20 backdrop-blur-xl p-5 sm:p-7 text-foreground overflow-hidden transform animate-in fade-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-36 bg-gradient-to-b from-orange-500/30 via-amber-500/20 to-transparent blur-2xl pointer-events-none" />

        {/* Top Celebration Badge */}
        <div className="text-center space-y-2 relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 text-white shadow-lg shadow-orange-500/30 ring-4 ring-orange-500/20 animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-black uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Redemption Complete</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              You Got It! 🎉
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-sm mx-auto">
              Your credits were redeemed. Your link to claim your airtime/data is unlocked below.
            </p>
          </div>
        </div>

        {/* Package Card Detail */}
        <div className="mt-5 p-4 rounded-2xl bg-secondary/60 border border-border/80 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <NetworkLogo network={offer.network} size="md" />
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {networkTheme.name}
                </span>
                <span className="text-sm font-black text-foreground">
                  {offer.title}
                </span>
              </div>
            </div>

            <GGDRewardBrandBadge 
              customLogoUrl={offer.reward_logo_url || globalRewardLogo} 
              size="md" 
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
            <div className="bg-background/80 p-2.5 rounded-xl border border-border/40">
              <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Category</span>
              <span className="font-black text-foreground capitalize flex items-center gap-1 mt-0.5">
                {offer.type === 'data' ? <Wifi className="w-3.5 h-3.5 text-blue-500" /> : <Smartphone className="w-3.5 h-3.5 text-orange-500" />}
                {offer.type} Bundle
              </span>
            </div>
            <div className="bg-background/80 p-2.5 rounded-xl border border-border/40">
              <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Cost Redeemed</span>
              <span className="font-black text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-0.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                {offer.credit_cost.toLocaleString()} Credits
              </span>
            </div>
          </div>

          {offer.instructions && (
            <p className="text-[11px] text-muted-foreground bg-background/50 p-2.5 rounded-xl border border-border/40 leading-relaxed">
              💡 <span className="font-semibold text-foreground">Instructions:</span> {offer.instructions}
            </p>
          )}
        </div>

        {/* Unlocked Access Link Box */}
        <div className="mt-4 space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Your Unlocked Access Link:</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">100% Unlocked</span>
          </label>
          <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between gap-2 shadow-inner">
            <p className="font-mono text-xs sm:text-sm font-black text-foreground truncate select-all">
              {appLink}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 text-orange-600 border-orange-500/30 hover:bg-orange-500/15 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-3 border-t border-border/60 flex flex-col sm:flex-row items-center gap-2.5">
          <a
            href={appLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full sm:flex-1 h-12 px-5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all"
          >
            <span>Launch Tool / Claim Link</span>
            <ArrowUpRight className="h-4 w-4" />
          </a>

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full sm:w-auto h-12 px-6 rounded-2xl text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            Done
          </Button>
        </div>

        {userRemainingCredits !== undefined && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Remaining wallet balance: <span className="font-black text-foreground">{userRemainingCredits.toLocaleString()} Credits</span>
          </p>
        )}
      </div>

      {/* Embedded CSS for falling token animation */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-40px) rotate(0deg);
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation-name: fall;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
};

export default RedeemFallingAnimation;

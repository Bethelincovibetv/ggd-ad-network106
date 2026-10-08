import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Compass,
  Wallet,
  Megaphone,
  Users,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Eye,
  Info,
  MapPin,
  TrendingUp,
  Award,
  Layers,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import ggdLogo from '@/assets/ggd-logo.png';

export const WALKTHROUGH_STORAGE_KEY = 'ggd_walkthrough_seen';

/**
 * Check if the user has already seen or dismissed the walkthrough tour
 */
export const hasSeenWalkthrough = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(WALKTHROUGH_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Mark the walkthrough tour as seen in localStorage
 */
export const markWalkthroughAsSeen = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WALKTHROUGH_STORAGE_KEY, 'true');
  } catch {
    // Ignore storage errors in restricted contexts
  }
};

/**
 * Reset walkthrough seen state so user can replay the tour
 */
export const resetWalkthrough = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(WALKTHROUGH_STORAGE_KEY);
  } catch {
    // Ignore
  }
};

export interface TourStep {
  step: number;
  id: string;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  overview: string;
  explanation: string;
  actionCue?: string;
  tip?: string;
  highlights: string[];
  targetSelector?: string;
  targetDescription?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    id: 'welcome',
    title: 'Welcome to GGD Ad Network',
    badge: 'Platform Overview',
    icon: Compass,
    overview: 'Your central hub for high-impact Nigerian ad campaigns and syndicate growth.',
    explanation:
      'GGD Ad Network brings together high-converting native banners, community crowd promotion, and verified Nigerian marketing tools under one unified dashboard.',
    actionCue: "Let's take a quick 60-second tour of your tools.",
    highlights: [
      'High-impact native advertising across Nigerian publisher networks',
      'Unified dual-currency economy with Naira (₦) and GGD Credits',
      'Zero-bot guarantee with verified crowd tasks and anti-fraud checks'
    ],
    targetSelector: '[data-tour-step="1"], [data-tour-step="overview"], #overview-tab',
    targetDescription: 'Dashboard Main Overview & Quick Metrics'
  },
  {
    step: 2,
    id: 'wallet',
    title: 'Unified Wallet & Credits',
    badge: '₦ / Credits Economy',
    icon: Wallet,
    overview:
      'Dual currency balance — Naira (₦) for payouts/deposits and GGG Credits for launching ads and funding tasks.',
    explanation:
      'Deposit in Naira via instant Bank Transfer / Monnify / Paystack, or use GGD Credits (1 Credit = ₦100) to budget campaigns, reward task completions, and redeem airtime or mobile data vouchers.',
    tip: 'Transfer credits instantly to other users or fund your marketing budget.',
    highlights: [
      'Dual balances: Main ₦ Wallet for cash & Credit Wallet for platform marketing',
      'Instant P2P Credit Transfers with 0% fee to any platform username',
      'Airtime & Data redeem marketplace for MTN, Airtel, Glo, and 9mobile'
    ],
    targetSelector: '[data-tour-step="2"], [data-tour-step="wallet"], #wallet-nav-btn, .wallet-header-btn',
    targetDescription: 'Wallet Hub, Credit Funding & Airtime Redemption'
  },
  {
    step: 3,
    id: 'campaigns',
    title: 'Ad Campaigns & State Targeting',
    badge: '36 States Geo-Targeting',
    icon: Megaphone,
    overview:
      'Reach customers in specific Nigerian states (Lagos, Abuja, Rivers, etc.) with real-time performance analytics.',
    explanation:
      'Create eye-catching banners with our built-in creator or upload your own. Zero in on your ideal demographic by state, device, and publisher categories while monitoring live impressions and CTR.',
    tip: 'Campaigns launch instantly upon approval and run continuously with automated budget protection.',
    highlights: [
      'Pinpoint targeting across Lagos, Abuja (FCT), Rivers, Kano, and all 36 states',
      'Real-time live impression & click analytics with fraud prevention',
      'Full-bleed native banner placements on verified publisher partner sites'
    ],
    targetSelector: '[data-tour-step="3"], [data-tour-step="campaigns"], #campaigns-nav-btn',
    targetDescription: 'Banner Ad Campaigns & Geo-Targeting Hub'
  },
  {
    step: 4,
    id: 'syndicate',
    title: 'Syndicate Hub & Tasks',
    badge: 'Crowd Promotion & Earning',
    icon: Users,
    overview:
      'Promote campaigns or complete watch-and-earn tasks to grow credits and boost member reach.',
    explanation:
      'Mobilize an army of real Nigerian promoters to share your message on WhatsApp statuses, YouTube, Instagram, and TikTok, or earn daily credits yourself by completing watch-and-earn video tasks.',
    tip: 'Tasks are verified automatically before credits are released to guarantee genuine user engagement.',
    highlights: [
      'Syndicate promoters with verified WhatsApp and social reach',
      'Watch-and-Earn YouTube views boost with automatic time tracking',
      'Micro-tasks: App installs, reviews, channel follows, and social broadcasts'
    ],
    targetSelector: '[data-tour-step="4"], [data-tour-step="syndicate"], #syndicate-nav-btn',
    targetDescription: 'Syndicate Hub & Community Task Marketplace'
  },
  {
    step: 5,
    id: 'verification',
    title: 'Business Verification',
    badge: 'CAC & NIN Trust Seal',
    icon: ShieldCheck,
    overview:
      'Submit CAC / NIN documents to get the official Verified Business Badge and unlock higher ad trust.',
    explanation:
      'Verified businesses gain the prestigious green verified shield, priority ad placement, increased buyer inquiry rates, and elevated withdrawal limits.',
    tip: 'Verified merchants convert up to 3.8x higher than unverified profiles on Nigerian WhatsApp campaigns.',
    highlights: [
      'Official Green Verified Business Seal on directory & ads',
      'Instant trust boost for Nigerian online buyers and syndicate partners',
      'Priority directory ranking and access to premium advertising slots'
    ],
    targetSelector: '[data-tour-step="5"], [data-tour-step="verification"], #business-nav-btn',
    targetDescription: 'Verified Merchant Hub & CAC / NIN Credentials'
  },
  {
    step: 6,
    id: 'support',
    title: 'GGD AI & Support',
    badge: '24/7 AI Co-Pilot & Help',
    icon: Sparkles,
    overview:
      'Get 24/7 campaign advice, banner ideas, and platform guidance directly from GGD AI.',
    explanation:
      'Unleash Naija ScriptWriter and Vixora AI to craft viral sales funnels, high-converting Nigerian headlines, and persuasive promotional copy with one tap. Support is always one click away.',
    actionCue: "Ready to launch high-performance campaigns? Let's get started!",
    highlights: [
      'Naija AI ScriptWriter: generate persuasive Pidgin & English ad copy',
      'Automated headline generators, banner dimension recommendations & tips',
      'Direct WhatsApp and platform ticket support with Nigerian account managers'
    ],
    targetSelector: '[data-tour-step="6"], [data-tour-step="support"], #guide-nav-btn, .ai-assistant-btn',
    targetDescription: 'GGD AI Marketing Tools & 24/7 Help Desk'
  }
];

export interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  initialStep?: number;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialStep = 1,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(
    Math.max(0, Math.min(initialStep - 1, TOUR_STEPS.length - 1))
  );
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);
  const [isSpotlightMode, setIsSpotlightMode] = useState<boolean>(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [hasTargetElement, setHasTargetElement] = useState<boolean>(false);
  const [cardPosition, setCardPosition] = useState<'bottom' | 'top' | 'center'>('center');

  const cardRef = useRef<HTMLDivElement>(null);
  const currentStep = TOUR_STEPS[currentStepIndex];

  // Sync initial step when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(Math.max(0, Math.min(initialStep - 1, TOUR_STEPS.length - 1)));
    }
  }, [isOpen, initialStep]);

  // Find and measure target element for spotlight
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !currentStep.targetSelector) {
      setTargetRect(null);
      setHasTargetElement(false);
      return;
    }

    try {
      const selectors = currentStep.targetSelector.split(',').map((s) => s.trim());
      let element: HTMLElement | null = null;

      for (const sel of selectors) {
        const found = document.querySelector<HTMLElement>(sel);
        if (found && found.offsetParent !== null) {
          element = found;
          break;
        }
      }

      if (element) {
        // Scroll element into view smoothly if off-screen
        const rect = element.getBoundingClientRect();
        const isInViewport =
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth);

        if (!isInViewport) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          setTimeout(() => {
            if (element) {
              setTargetRect(element.getBoundingClientRect());
            }
          }, 300);
        } else {
          setTargetRect(rect);
        }

        setHasTargetElement(true);

        // Compute preferred card position relative to target on larger screens
        if (window.innerWidth >= 768) {
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;
          if (spaceBelow >= 360) {
            setCardPosition('bottom');
          } else if (spaceAbove >= 360) {
            setCardPosition('top');
          } else {
            setCardPosition('center');
          }
        } else {
          setCardPosition('bottom');
        }
      } else {
        setTargetRect(null);
        setHasTargetElement(false);
        setCardPosition('center');
      }
    } catch {
      setTargetRect(null);
      setHasTargetElement(false);
      setCardPosition('center');
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    updateTargetPosition();
    const handleResize = () => updateTargetPosition();
    const handleScroll = () => updateTargetPosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [updateTargetPosition]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, dontShowAgain]);

  // Prevent background body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  const handleFinish = () => {
    if (dontShowAgain) {
      markWalkthroughAsSeen();
    }
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      markWalkthroughAsSeen();
    }
    onClose();
  };

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleJumpToStep = (index: number) => {
    setCurrentStepIndex(index);
  };

  if (!isOpen) return null;

  const isFinalStep = currentStepIndex === TOUR_STEPS.length - 1;
  const StepIcon = currentStep.icon;
  const progressPercent = Math.round(((currentStepIndex + 1) / TOUR_STEPS.length) * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
      className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-end sm:justify-center items-center"
    >
      {/* Dark backdrop overlay with 0.75 opacity and backdrop blur */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300"
        onClick={handleSkip}
      />

      {/* Spotlight cutout / highlight element if target exists and in spotlight mode */}
      {isSpotlightMode && hasTargetElement && targetRect && (
        <div
          className="fixed pointer-events-none z-50 transition-all duration-300 ease-out"
          style={{
            top: `${Math.max(0, targetRect.top - 8)}px`,
            left: `${Math.max(0, targetRect.left - 8)}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`,
          }}
        >
          {/* Glowing pulse ring around targeted area */}
          <div className="absolute inset-0 rounded-2xl ring-4 ring-[#e67e22] shadow-[0_0_35px_rgba(230,126,34,0.65)] animate-pulse" />
          <div className="absolute -inset-2 rounded-2xl border-2 border-[#e67e22]/50 animate-ping opacity-35" />

          {/* Active target badge */}
          <div className="absolute -top-3.5 left-3 px-2 py-0.5 rounded-full bg-[#e67e22] text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 select-none">
            <Eye className="w-2.5 h-2.5" />
            <span>Active Section</span>
          </div>
        </div>
      )}

      {/* Main Walkthrough Card Container */}
      <div
        ref={cardRef}
        className={`relative z-50 w-full max-w-full sm:max-w-xl transition-all duration-300 ease-out ${
          // Mobile: docked bottom sheet. Desktop: floating centered card with orange ambient glow
          'px-3 pb-3 sm:px-4 sm:pb-0'
        }`}
      >
        <div
          className="w-full bg-zinc-900 border border-zinc-700/80 rounded-t-3xl sm:rounded-2xl text-zinc-100 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(230,126,34,0.22)] overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[82vh]"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(230, 126, 34, 0.22)',
          }}
        >
          {/* Subtle top orange glow accent line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-[#e67e22] to-amber-500 shrink-0" />

          {/* Header Bar */}
          <div className="px-5 pt-4 pb-3 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-900/90 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xs shrink-0">
                <img
                  src={ggdLogo}
                  alt="GGD Ad Network"
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    // Fallback to compass icon if image fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    GGD Ad Network
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-[#e67e22]/20 border border-[#e67e22]/40 text-[#e67e22] text-[10px] font-bold">
                    Interactive Tour
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 font-medium">
                  Step {currentStepIndex + 1} of {TOUR_STEPS.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Spotlight / Showcase View Toggle (if target element is present) */}
              {hasTargetElement && (
                <button
                  type="button"
                  onClick={() => setIsSpotlightMode((prev) => !prev)}
                  title={isSpotlightMode ? 'Switch to centered presentation mode' : 'Highlight element on page'}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 border ${
                    isSpotlightMode
                      ? 'bg-[#e67e22]/20 text-[#e67e22] border-[#e67e22]/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span className="hidden xs:inline">{isSpotlightMode ? 'Spotlight ON' : 'Showcase Mode'}</span>
                </button>
              )}

              {/* Close / Skip button */}
              <button
                type="button"
                onClick={handleSkip}
                aria-label="Close walkthrough tour"
                className="w-8 h-8 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-800 h-1 shrink-0 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e67e22] to-amber-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Scrollable Content Body */}
          <div className="px-5 py-4 overflow-y-auto space-y-4 text-left custom-tour-scrollbar">
            {/* Step Icon, Badge & Title */}
            <div className="flex items-start gap-3.5">
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e67e22]/25 via-zinc-800 to-zinc-900 border border-[#e67e22]/40 text-[#e67e22] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(230,126,34,0.18)]">
                <StepIcon className="w-6 h-6" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#e67e22] text-white flex items-center justify-center text-[9px] font-black">
                  {currentStepIndex + 1}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-[#e67e22]/15 border border-[#e67e22]/30 text-[#e67e22] text-[10px] font-semibold tracking-wide uppercase">
                    {currentStep.badge}
                  </span>
                  {currentStep.targetDescription && hasTargetElement && (
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1 truncate max-w-[200px]">
                      <MapPin className="w-2.5 h-2.5 text-[#e67e22]" />
                      {currentStep.targetDescription}
                    </span>
                  )}
                </div>

                <h3
                  id="tour-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-snug"
                >
                  {currentStep.title}
                </h3>
              </div>
            </div>

            {/* Overview & Main Explanation */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-zinc-200 leading-relaxed">
                {currentStep.overview}
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {currentStep.explanation}
              </p>
            </div>

            {/* Key Features Highlights List */}
            {currentStep.highlights && currentStep.highlights.length > 0 && (
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#e67e22]" />
                  Key Capabilities
                </span>
                <div className="space-y-1.5">
                  {currentStep.highlights.map((highlight, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#e67e22] shrink-0 mt-0.5" />
                      <span className="leading-tight">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Cue / Nigerian Tip Box */}
            {(currentStep.tip || currentStep.actionCue) && (
              <div className="bg-gradient-to-r from-[#e67e22]/10 via-[#e67e22]/5 to-transparent border-l-2 border-[#e67e22] rounded-r-xl p-3 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#e67e22] shrink-0 mt-0.5" />
                <div className="text-zinc-300">
                  {currentStep.tip && (
                    <p className="font-medium text-amber-200/95">{currentStep.tip}</p>
                  )}
                  {currentStep.actionCue && (
                    <p className="font-bold text-white mt-0.5">{currentStep.actionCue}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls: Dots, Checkbox & Action Buttons */}
          <div className="px-5 py-3.5 border-t border-zinc-800/90 bg-zinc-950/70 shrink-0 space-y-3">
            <div className="flex items-center justify-between gap-2">
              {/* Step indicator clickable dots */}
              <div className="flex items-center gap-1.5" aria-label="Tour step indicators">
                {TOUR_STEPS.map((step, idx) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleJumpToStep(idx)}
                    title={`Jump to step ${idx + 1}: ${step.title}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentStepIndex
                        ? 'w-6 bg-[#e67e22] shadow-[0_0_10px_rgba(230,126,34,0.6)]'
                        : idx < currentStepIndex
                        ? 'w-2 bg-zinc-600 hover:bg-zinc-500'
                        : 'w-2 bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  />
                ))}
              </div>

              {/* Don't show again checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-zinc-400 hover:text-zinc-300">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded-sm border-zinc-700 bg-zinc-900 text-[#e67e22] focus:ring-[#e67e22] focus:ring-offset-zinc-900 w-3.5 h-3.5"
                />
                <span>Don't show this again</span>
              </label>
            </div>

            {/* Navigation Buttons Row */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 px-2.5 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Skip Tour
                </button>
              </div>

              <div className="flex items-center gap-2">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 ${
                    isFinalStep
                      ? 'bg-gradient-to-r from-[#e67e22] to-amber-600 hover:from-[#d35400] hover:to-amber-700 shadow-[#e67e22]/30 ring-2 ring-[#e67e22]/50'
                      : 'bg-[#e67e22] hover:bg-[#d35400] shadow-[#e67e22]/20'
                  }`}
                >
                  <span>{isFinalStep ? 'Get Started' : 'Next'}</span>
                  {isFinalStep ? (
                    <Sparkles className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WalkthroughWizard = GuidedTourModal;
export default GuidedTourModal;

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus, X, Sparkles, ClipboardList, Megaphone, Users, Move } from "lucide-react";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

interface Props {
  onNavigate: (tab: string) => void;
}

const BUTTON_SIZE = 58;
const SCREEN_MARGIN = 12;
const TOP_SAFE = 68;

const getBottomSafe = () => {
  if (typeof window === 'undefined') return 88;
  return window.innerWidth < 768 ? 92 : 24;
};

const clampX = (x: number) => {
  if (typeof window === 'undefined') return x;
  return Math.max(SCREEN_MARGIN, Math.min(window.innerWidth - BUTTON_SIZE - SCREEN_MARGIN, x));
};

const clampY = (y: number) => {
  if (typeof window === 'undefined') return y;
  return Math.max(TOP_SAFE, Math.min(window.innerHeight - BUTTON_SIZE - getBottomSafe(), y));
};

/**
 * Mobile-First Draggable Floating "Create" Button with Smart Viewport-Clamped Menu.
 * - Draggable anywhere across the screen on mobile Android, iOS, and desktop.
 * - Clamped within safe boundaries so it cannot be lost outside the viewport.
 * - Never interferes with normal page scrolling (differentiates drag vs tap).
 * - Intelligently positions its Create options popup relative to button location
 *   so the full menu is always 100% visible inside the visible viewport.
 */
const CreateFab: React.FC<Props> = ({ onNavigate }) => {
  const { isEnabled } = useFeatureToggles();
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Position state (defaults to lower-right above bottom navigation)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 260, y: 500 };
    const isMob = window.innerWidth < 768;
    const defX = window.innerWidth - BUTTON_SIZE - (isMob ? 16 : 28);
    const defY = window.innerHeight - BUTTON_SIZE - (isMob ? 104 : 36);

    try {
      const saved = localStorage.getItem('ggd_fab_pos_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return { x: clampX(parsed.x), y: clampY(parsed.y) };
        }
      }
    } catch (_err) {
      // Storage unavailable or corrupted
    }

    return { x: clampX(defX), y: clampY(defY) };
  });

  const [menuLayout, setMenuLayout] = useState({
    top: 0,
    left: 0,
    width: 320,
    maxHeight: 420,
    placedAbove: false,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragTracker = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    hasMoved: false,
    pointerId: -1,
  });

  // Calculate intelligent viewport-bounded menu position
  const updateMenuPosition = useCallback((btnX: number, btnY: number) => {
    if (typeof window === 'undefined') return;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const isMob = screenW < 768;
    const menuWidth = Math.min(324, screenW - 24);
    const estimatedHeight = 310;
    const gap = 12;
    const margin = 12;
    const bottomNavSafe = isMob ? 88 : 24;

    const spaceBelow = screenH - (btnY + BUTTON_SIZE) - bottomNavSafe;
    const spaceAbove = btnY - TOP_SAFE;

    let top = 0;
    let placedAbove = false;
    let maxHeight = screenH - TOP_SAFE - bottomNavSafe - 24;

    // Determine vertical placement
    if (spaceBelow >= estimatedHeight + gap) {
      top = btnY + BUTTON_SIZE + gap;
      placedAbove = false;
      maxHeight = Math.min(460, spaceBelow - gap);
    } else if (spaceAbove >= estimatedHeight + gap) {
      top = btnY - estimatedHeight - gap;
      placedAbove = true;
      maxHeight = Math.min(460, spaceAbove - gap);
    } else {
      // Screen is tight vertically
      if (spaceAbove >= spaceBelow) {
        top = Math.max(TOP_SAFE + margin, btnY - estimatedHeight - gap);
        placedAbove = true;
        maxHeight = Math.max(220, btnY - TOP_SAFE - gap);
      } else {
        top = btnY + BUTTON_SIZE + gap;
        placedAbove = false;
        maxHeight = Math.max(220, spaceBelow - gap);
      }
    }

    // Strictly clamp top
    top = Math.max(TOP_SAFE + margin, Math.min(screenH - estimatedHeight - bottomNavSafe, top));

    // Determine horizontal placement
    let left = 0;
    const btnCenter = btnX + BUTTON_SIZE / 2;
    if (btnCenter > screenW / 2) {
      // Button on right half: align menu to the right
      left = btnX + BUTTON_SIZE - menuWidth;
    } else {
      // Button on left half: align menu to the left
      left = btnX;
    }

    // Strictly clamp left
    left = Math.max(margin, Math.min(screenW - menuWidth - margin, left));

    setMenuLayout({ top, left, width: menuWidth, maxHeight, placedAbove });
  }, []);

  // Update menu layout whenever menu opens or button position changes
  useEffect(() => {
    if (open) {
      updateMenuPosition(position.x, position.y);
    }
  }, [open, position, updateMenuPosition]);

  // Handle window resize & re-clamp button within safe boundaries
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const next = { x: clampX(prev.x), y: clampY(prev.y) };
        return next;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Escape key to close menu
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Pointer event handlers for draggable FAB
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Left click or touch only
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    dragTracker.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
      hasMoved: false,
      pointerId: e.pointerId,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_err) {
      // Pointer capture not supported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragTracker.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragTracker.current.startX;
    const dy = e.clientY - dragTracker.current.startY;
    const dist = Math.hypot(dx, dy);

    if (dist > 7) {
      if (!dragTracker.current.hasMoved) {
        dragTracker.current.hasMoved = true;
        setIsDragging(true);
      }
      const newX = clampX(dragTracker.current.originX + dx);
      const newY = clampY(dragTracker.current.originY + dy);
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragTracker.current.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_err) {
      // Ignore release error
    }
    dragTracker.current.pointerId = -1;

    if (dragTracker.current.hasMoved) {
      // Finished dragging: save position to local storage
      setIsDragging(false);
      try {
        localStorage.setItem('ggd_fab_pos_v2', JSON.stringify(position));
      } catch (_err) {
        // Ignore storage write error
      }
    } else {
      // It was a tap: toggle create menu
      setIsDragging(false);
      setOpen(prev => !prev);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragTracker.current.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_err) {
      // Ignore cancel error
    }
    dragTracker.current.pointerId = -1;
    setIsDragging(false);
  };

  const options = [
    ...(isEnabled("community") && isEnabled("create_post")
      ? [{
          id: "post",
          icon: Sparkles,
          label: "Community Post",
          desc: "Share updates, media or insights",
          grad: "from-pink-500 to-fuchsia-600",
          run: () => {
            onNavigate("feed");
            setTimeout(() => window.dispatchEvent(new CustomEvent("ggd-open-composer")), 250);
          },
        }]
      : []),
    ...(isEnabled("tasks") && isEnabled("create_credit_task")
      ? [{
          id: "task",
          icon: ClipboardList,
          label: "Credit Task",
          desc: "Pay credits for views, shares & watch time",
          grad: "from-emerald-500 to-teal-600",
          run: () => {
            onNavigate("feed");
            setTimeout(() => window.dispatchEvent(new CustomEvent("ggd-open-task-composer")), 250);
          },
        }]
      : []),
    ...(isEnabled("ads") && isEnabled("create_banner_ad")
      ? [{
          id: "ad",
          icon: Megaphone,
          label: "Banner Advert",
          desc: "Run a display campaign across publisher sites",
          grad: "from-orange-500 to-red-600",
          run: () => onNavigate("ads-create"),
        }]
      : []),
    ...(isEnabled("syndicate") && isEnabled("business_tasks") && isEnabled("create_syndicate_campaign")
      ? [{
          id: "syndicate",
          icon: Users,
          label: "Social Campaign",
          desc: "Hire WhatsApp syndicates for viral reach",
          grad: "from-violet-500 to-indigo-600",
          run: () => onNavigate("business-tasks"),
        }]
      : []),
  ];

  if (options.length === 0) return null;

  return (
    <>
      {/* Backdrop overlay when menu is open */}
      {open && (
        <div
          role="presentation"
          className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Draggable Floating Action Button */}
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? "Close Create Menu" : "Create New Item (Drag to move)"}
        title="Drag to reposition • Tap to create"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        className={`fixed top-0 left-0 z-[70] h-[58px] w-[58px] rounded-full
          bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 text-white
          shadow-[0_12px_28px_-6px_rgba(234,88,12,0.55),0_4px_12px_rgba(0,0,0,0.2)]
          grid place-items-center cursor-grab active:cursor-grabbing
          transition-shadow duration-200
          ${isDragging ? 'scale-110 ring-4 ring-orange-400/50 shadow-2xl' : 'hover:scale-105 active:scale-95'}
          ${open ? 'ring-4 ring-white shadow-2xl' : ''}`}
      >
        {/* Subtle highlight ring & glossy reflection */}
        <span className="absolute inset-1 rounded-full border border-white/25 pointer-events-none" />
        <span className="absolute inset-x-2.5 top-1.5 h-3 rounded-full bg-white/35 blur-[1.5px] pointer-events-none" />

        {/* Rotatable icon */}
        <div className={`transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>
          <Plus className="h-7 w-7 drop-shadow" strokeWidth={3} />
        </div>

        {/* Drag Hint Tooltip Cue */}
        {!isDragging && !open && (
          <span className="sr-only">Draggable create button</span>
        )}
      </button>

      {/* Smart Viewport-Positioned Create Menu */}
      {open && (
        <div
          role="dialog"
          aria-label="Create options menu"
          style={{
            transform: `translate3d(${menuLayout.left}px, ${menuLayout.top}px, 0)`,
            width: `${menuLayout.width}px`,
            maxHeight: `${menuLayout.maxHeight}px`,
          }}
          className="fixed top-0 left-0 z-[75] bg-card/95 backdrop-blur-xl border border-border/80 rounded-3xl
            shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col
            animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Menu Header */}
          <div className="p-3.5 pb-2 border-b border-border/50 flex items-center justify-between bg-muted/30">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <h3 className="text-sm font-black text-foreground">Create New</h3>
              </div>
              <p className="text-[11px] text-muted-foreground">Select what you want to launch</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="h-8 w-8 rounded-full hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Options List with Touch-Friendly Items (>= 48px height) */}
          <div className="p-2.5 space-y-2 overflow-y-auto no-scrollbar flex-1">
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    opt.run();
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-2xl border border-border/60 hover:border-orange-500/40
                    bg-card hover:bg-orange-50/50 dark:hover:bg-orange-950/20 text-left active:scale-[0.98] transition-all group"
                >
                  <span
                    className={`h-11 w-11 rounded-xl grid place-items-center bg-gradient-to-br ${opt.grad}
                      text-white flex-shrink-0 shadow-md shadow-orange-500/10 group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="h-5 w-5 drop-shadow" strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs sm:text-sm font-bold text-foreground leading-tight">
                      {opt.label}
                    </span>
                    <span className="block text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5">
                      {opt.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Drag Tip Footer */}
          <div className="px-3.5 py-2 bg-muted/40 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Move className="h-3 w-3 text-orange-500" />
              <span>Drag the + button anywhere</span>
            </span>
            <span className="font-semibold text-orange-600">GGD Network</span>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateFab;

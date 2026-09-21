import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoritesModal } from '@/components/favorites/FavoritesModal';

interface FavoritesQuickButtonProps {
  className?: string;
  onNavigateTab?: (tab: string) => void;
}

export const FavoritesQuickButton: React.FC<FavoritesQuickButtonProps> = ({
  className = '',
  onNavigateTab,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { totalCount } = useFavorites();

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label="View Saved Favorites"
        title="Saved Favorites (Quick Access)"
        className={`relative flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2 sm:px-2.5 py-1.5 rounded-full transition-all text-xs font-bold shadow-xs group cursor-pointer ${className}`}
      >
        <Heart
          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500 group-hover:scale-110 transition-transform ${
            totalCount > 0 ? 'fill-current animate-pulse' : ''
          }`}
        />
        <span className="text-rose-700 dark:text-rose-400 font-black text-[11px] sm:text-xs">
          {totalCount}
        </span>
        <span className="hidden sm:inline text-rose-600/80 dark:text-rose-300 text-[10px] font-bold">
          Saved
        </span>
      </button>

      <FavoritesModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onNavigateTab={onNavigateTab}
      />
    </>
  );
};

import React from 'react';
import { Heart, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { NewFavoriteInput, FavoriteType } from '@/types/favorites';

interface FavoriteButtonProps {
  item: {
    targetId: string;
    type: FavoriteType;
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string | null;
    price?: number | string | null;
    location?: string | null;
    category?: string | null;
    verified?: boolean;
    rating?: number | null;
    linkUrl: string;
    businessName?: string;
    businessPhone?: string;
    businessWebsite?: string;
  };
  variant?: 'icon' | 'pill' | 'overlay' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
  iconType?: 'heart' | 'bookmark';
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  item,
  variant = 'icon',
  size = 'md',
  showLabel = false,
  className = '',
  iconType = 'heart',
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(item.targetId, item.type);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite({
      targetId: item.targetId,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      description: item.description,
      imageUrl: item.imageUrl,
      price: item.price,
      location: item.location,
      category: item.category,
      verified: item.verified,
      rating: item.rating,
      linkUrl: item.linkUrl,
      businessName: item.businessName,
      businessPhone: item.businessPhone,
      businessWebsite: item.businessWebsite,
    });
  };

  const IconComponent = iconType === 'heart' ? Heart : Bookmark;

  // Render Overlay style (for product image corners)
  if (variant === 'overlay') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={saved ? `Remove ${item.title} from favorites` : `Save ${item.title} to favorites`}
        title={saved ? 'Saved in personal list (Click to remove)' : 'Save to personal list'}
        className={`group relative z-10 flex items-center justify-center rounded-full transition-all duration-300 backdrop-blur-md shadow-md cursor-pointer ${
          size === 'sm'
            ? 'h-8 w-8'
            : size === 'lg'
            ? 'h-11 w-11'
            : 'h-9 w-9'
        } ${
          saved
            ? 'bg-rose-500 text-white shadow-rose-500/30 scale-105'
            : 'bg-white/85 text-slate-700 hover:bg-white hover:text-rose-500 hover:scale-110 border border-slate-200/60'
        } ${className}`}
      >
        <IconComponent
          className={`transition-all duration-300 ${
            size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : 'h-4.5 w-4.5'
          } ${saved ? 'fill-current scale-110' : 'group-hover:scale-110'}`}
        />
      </button>
    );
  }

  // Render Pill with text (e.g. on Detail Page or public Storefront Header)
  if (variant === 'pill') {
    return (
      <Button
        type="button"
        onClick={handleClick}
        variant="outline"
        size={size === 'sm' ? 'sm' : 'default'}
        className={`rounded-2xl font-bold transition-all duration-300 gap-2 cursor-pointer shadow-xs ${
          saved
            ? 'bg-rose-50 text-rose-600 border-rose-300 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-400'
            : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50/50'
        } ${className}`}
      >
        <IconComponent
          className={`h-4 w-4 transition-transform duration-300 ${
            saved ? 'fill-current text-rose-500 scale-110' : 'text-slate-500'
          }`}
        />
        <span className="text-xs">
          {saved ? 'Saved to Favorites' : 'Save to Favorites'}
        </span>
      </Button>
    );
  }

  // Render standard icon button or ghost button
  return (
    <Button
      type="button"
      onClick={handleClick}
      variant={variant === 'ghost' ? 'ghost' : 'outline'}
      size={showLabel ? (size === 'sm' ? 'sm' : 'default') : 'icon'}
      aria-label={saved ? `Remove ${item.title} from favorites` : `Save ${item.title} to favorites`}
      title={saved ? 'Remove from personal list' : 'Save to personal list'}
      className={`transition-all duration-200 cursor-pointer rounded-xl ${
        saved
          ? 'bg-rose-50 text-rose-600 border-rose-300 hover:bg-rose-100 hover:text-rose-700'
          : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50/40 hover:border-rose-200'
      } ${className}`}
    >
      <IconComponent
        className={`h-4 w-4 transition-transform duration-200 ${
          saved ? 'fill-current text-rose-500 scale-110' : ''
        }`}
      />
      {showLabel && (
        <span className="ml-1.5 text-xs font-bold">
          {saved ? 'Saved' : 'Save'}
        </span>
      )}
    </Button>
  );
};

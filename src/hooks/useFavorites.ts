import { useState, useEffect, useMemo, useCallback } from 'react';
import { FavoriteItem, FavoriteType, NewFavoriteInput } from '@/types/favorites';
import {
  getStoredFavorites,
  subscribeToFavorites,
  toggleFavorite as serviceToggleFavorite,
  addFavorite as serviceAddFavorite,
  removeFavorite as serviceRemoveFavorite,
  clearAllFavorites as serviceClearAllFavorites,
  updateFavoriteNotes as serviceUpdateNotes,
  isFavorite as serviceIsFavorite,
  exportFavoritesData,
  importFavoritesData
} from '@/services/favoritesService';
import { toast } from 'sonner';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => getStoredFavorites());

  useEffect(() => {
    const unsubscribe = subscribeToFavorites((items) => {
      setFavorites(items);
    });
    return unsubscribe;
  }, []);

  const businessFavorites = useMemo(
    () => favorites.filter((f) => f.type === 'business'),
    [favorites]
  );

  const productFavorites = useMemo(
    () => favorites.filter((f) => f.type === 'product'),
    [favorites]
  );

  const serviceFavorites = useMemo(
    () => favorites.filter((f) => f.type === 'service'),
    [favorites]
  );

  const isFav = useCallback(
    (targetId: string, type?: FavoriteType) => {
      return favorites.some((item) => {
        if (type) {
          return item.targetId === targetId && item.type === type;
        }
        return item.targetId === targetId || item.id === targetId;
      });
    },
    [favorites]
  );

  const toggle = useCallback(
    (input: NewFavoriteInput, silent: boolean = false) => {
      const isCurrentlySaved = isFav(input.targetId, input.type);
      const added = serviceToggleFavorite(input);

      if (!silent) {
        if (added) {
          toast.success(
            `Saved "${input.title}" to Favorites!`,
            {
              description: `Added to your personal offline quick-access list.`,
            }
          );
        } else {
          toast.info(
            `Removed "${input.title}" from Favorites`,
            {
              description: `Item was removed from your saved list.`,
            }
          );
        }
      }

      return added;
    },
    [isFav]
  );

  const remove = useCallback(
    (targetId: string, type?: FavoriteType, title?: string) => {
      serviceRemoveFavorite(targetId, type);
      if (title) {
        toast.info(`Removed "${title}" from Favorites`);
      }
    },
    []
  );

  const clearAll = useCallback(() => {
    serviceClearAllFavorites();
    toast.info('All favorites cleared from personal storage');
  }, []);

  const updateNotes = useCallback((targetId: string, notes: string) => {
    serviceUpdateNotes(targetId, notes);
    toast.success('Favorite note saved');
  }, []);

  return {
    favorites,
    businessFavorites,
    productFavorites,
    serviceFavorites,
    totalCount: favorites.length,
    businessCount: businessFavorites.length,
    productCount: productFavorites.length,
    serviceCount: serviceFavorites.length,
    isFavorite: isFav,
    toggleFavorite: toggle,
    removeFavorite: remove,
    clearAllFavorites: clearAll,
    updateFavoriteNotes: updateNotes,
    exportFavorites: exportFavoritesData,
    importFavorites: importFavoritesData,
  };
};

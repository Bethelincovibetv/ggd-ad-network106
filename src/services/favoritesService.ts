import { FavoriteItem, FavoriteType, NewFavoriteInput } from '@/types/favorites';
import { safeStorage } from '@/utils/safeStorage';

const FAVORITES_STORAGE_KEY = 'ggd_user_favorites_v1';
const FAVORITES_EVENT = 'ggd_favorites_changed';

/**
 * Safely reads favorites list from localStorage.
 */
export const getStoredFavorites = (): FavoriteItem[] => {
  const items = safeStorage.getJSON<FavoriteItem[]>(FAVORITES_STORAGE_KEY, []);
  return Array.isArray(items) ? items : [];
};

/**
 * Persists favorites array to localStorage and notifies listeners.
 */
const saveFavoritesToStorage = (items: FavoriteItem[]): void => {
  safeStorage.setJSON(FAVORITES_STORAGE_KEY, items);
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail: items }));
    } catch {}
  }
};

/**
 * Checks if an item is already saved in favorites.
 */
export const isFavorite = (targetId: string, type?: FavoriteType): boolean => {
  if (!targetId) return false;
  const current = getStoredFavorites();
  return current.some((item) => {
    if (type) {
      return item.targetId === targetId && item.type === type;
    }
    return item.targetId === targetId;
  });
};

const isFavoritesFeatureDisabled = (): boolean => {
  const toggles = safeStorage.getJSON<Record<string, boolean>>('ggd_feature_toggles_v1', {});
  if (toggles.save_favorite === false || toggles.favorites === false) return true;
  return false;
};

/**
 * Adds an item to favorites.
 */
export const addFavorite = (input: NewFavoriteInput): FavoriteItem | null => {
  if (isFavoritesFeatureDisabled()) {
    console.warn('Save Favorite feature is currently disabled by administrator.');
    return null;
  }
  const current = getStoredFavorites();
  const id = `${input.type}_${input.targetId}`;

  // Filter out any existing matching item to prevent duplicate keys
  const filtered = current.filter(item => item.id !== id && item.targetId !== input.targetId);

  const newItem: FavoriteItem = {
    ...input,
    id,
    savedAt: new Date().toISOString(),
  };

  const updated = [newItem, ...filtered];
  saveFavoritesToStorage(updated);
  return newItem;
};

/**
 * Removes an item from favorites.
 */
export const removeFavorite = (targetId: string, type?: FavoriteType): boolean => {
  if (!targetId) return false;
  const current = getStoredFavorites();
  const updated = current.filter((item) => {
    if (type) {
      return !(item.targetId === targetId && item.type === type);
    }
    return item.targetId !== targetId && item.id !== targetId;
  });

  const removed = updated.length !== current.length;
  if (removed) {
    saveFavoritesToStorage(updated);
  }
  return removed;
};

/**
 * Toggles a favorite on/off. Returns `true` if added, `false` if removed.
 */
export const toggleFavorite = (input: NewFavoriteInput): boolean => {
  if (isFavorite(input.targetId, input.type)) {
    removeFavorite(input.targetId, input.type);
    return false;
  } else {
    addFavorite(input);
    return true;
  }
};

/**
 * Updates optional personal note for a saved favorite item.
 */
export const updateFavoriteNotes = (targetId: string, notes: string): void => {
  const current = getStoredFavorites();
  const updated = current.map((item) => {
    if (item.targetId === targetId || item.id === targetId) {
      return { ...item, notes };
    }
    return item;
  });
  saveFavoritesToStorage(updated);
};

/**
 * Clears all stored favorites.
 */
export const clearAllFavorites = (): void => {
  saveFavoritesToStorage([]);
};

/**
 * Exports current favorites as formatted JSON string for backup/sharing.
 */
export const exportFavoritesData = (): string => {
  const items = getStoredFavorites();
  return JSON.stringify(
    {
      app: 'GGD Ad Network',
      exportedAt: new Date().toISOString(),
      count: items.length,
      favorites: items,
    },
    null,
    2
  );
};

/**
 * Imports favorites from JSON string, merging with existing items without duplicates.
 */
export const importFavoritesData = (jsonStr: string): number => {
  try {
    const data = JSON.parse(jsonStr);
    const listToImport: FavoriteItem[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.favorites)
      ? data.favorites
      : [];

    if (listToImport.length === 0) return 0;

    const current = getStoredFavorites();
    const map = new Map<string, FavoriteItem>();

    // Add current items to map
    current.forEach((item) => map.set(item.id, item));

    // Merge imported items
    let importedCount = 0;
    listToImport.forEach((item) => {
      if (item && item.targetId && item.type && item.title) {
        const id = item.id || `${item.type}_${item.targetId}`;
        if (!map.has(id)) {
          map.set(id, {
            ...item,
            id,
            savedAt: item.savedAt || new Date().toISOString(),
          });
          importedCount++;
        }
      }
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );

    saveFavoritesToStorage(merged);
    return importedCount;
  } catch (err) {
    console.error('Failed to import favorites JSON:', err);
    throw new Error('Invalid favorites JSON format');
  }
};

/**
 * Subscribes to real-time changes across React components & tabs.
 */
export const subscribeToFavorites = (
  callback: (items: FavoriteItem[]) => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<FavoriteItem[]>;
    callback(customEvent.detail || getStoredFavorites());
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === FAVORITES_STORAGE_KEY) {
      callback(getStoredFavorites());
    }
  };

  window.addEventListener(FAVORITES_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  // Initial push
  callback(getStoredFavorites());

  return () => {
    window.removeEventListener(FAVORITES_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
};

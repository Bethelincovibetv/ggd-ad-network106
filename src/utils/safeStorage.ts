/**
 * Safe LocalStorage & Persistent State Engine
 * 
 * Provides fail-safe, crash-proof access to browser storage:
 * - Handles sandboxed iframes (e.g. AI Studio preview), private browsing, and strict browser cookie policies.
 * - Graceful in-memory fallback store if window.localStorage throws SecurityError or QuotaExceededError.
 * - Fault-tolerant JSON serialization & deserialization (never throws on corrupted values).
 * - SSR and Node.js friendly (noop when window is undefined).
 */

const memoryStore = new Map<string, string>();

let isLocalStorageAvailable: boolean | null = null;

function checkLocalStorageAvailability(): boolean {
  if (isLocalStorageAvailable !== null) return isLocalStorageAvailable;
  if (typeof window === 'undefined' || !window.localStorage) {
    isLocalStorageAvailable = false;
    return false;
  }
  try {
    const testKey = '__ggd_storage_probe__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    isLocalStorageAvailable = true;
    return true;
  } catch {
    isLocalStorageAvailable = false;
    return false;
  }
}

export const safeStorage = {
  /**
   * Safely read a string value from localStorage with memory fallback
   */
  getItem(key: string, defaultValue: string | null = null): string | null {
    if (checkLocalStorageAvailability()) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      } catch (err) {
        console.warn(`[SafeStorage] Error reading key "${key}":`, err);
      }
    }
    return memoryStore.has(key) ? memoryStore.get(key)! : defaultValue;
  },

  /**
   * Safely write a string value to localStorage and memory fallback
   */
  setItem(key: string, value: string): boolean {
    memoryStore.set(key, value);
    if (checkLocalStorageAvailability()) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (err) {
        console.warn(`[SafeStorage] Quota or access error writing key "${key}":`, err);
        return false;
      }
    }
    return true;
  },

  /**
   * Safely remove a key from storage and memory fallback
   */
  removeItem(key: string): boolean {
    memoryStore.delete(key);
    if (checkLocalStorageAvailability()) {
      try {
        window.localStorage.removeItem(key);
        return true;
      } catch (err) {
        console.warn(`[SafeStorage] Error removing key "${key}":`, err);
        return false;
      }
    }
    return true;
  },

  /**
   * Safely parse and retrieve a JSON object with fallback default
   */
  getJSON<T>(key: string, fallback: T): T {
    const raw = this.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch (parseErr) {
      console.warn(`[SafeStorage] JSON parse error for key "${key}", returning fallback:`, parseErr);
      return fallback;
    }
  },

  /**
   * Safely serialize and store a JSON value
   */
  setJSON<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      return this.setItem(key, serialized);
    } catch (serializeErr) {
      console.warn(`[SafeStorage] JSON serialization error for key "${key}":`, serializeErr);
      return false;
    }
  },

  /**
   * Clear storage safely
   */
  clear(): void {
    memoryStore.clear();
    if (checkLocalStorageAvailability()) {
      try {
        window.localStorage.clear();
      } catch (err) {
        console.warn('[SafeStorage] Error clearing storage:', err);
      }
    }
  },
};

export const safeGetItem = (key: string, defaultValue?: string | null) => safeStorage.getItem(key, defaultValue);
export const safeSetItem = (key: string, value: string) => safeStorage.setItem(key, value);
export const safeRemoveItem = (key: string) => safeStorage.removeItem(key);
export const safeGetJSON = <T>(key: string, fallback: T) => safeStorage.getJSON<T>(key, fallback);
export const safeSetJSON = <T>(key: string, value: T) => safeStorage.setJSON<T>(key, value);

export default safeStorage;

/**
 * IndexedDB Local Persistence Engine for Ephemeral Peer-to-Peer Images
 * 
 * Technical Specs:
 * - Stores raw Blobs directly inside the browser's IndexedDB.
 * - Zero cloud/server storage cost.
 * - Auto-purges stored images older than 24 hours.
 * - Indexed by conversationKey, timestamp, and expiresAt for instant retrieval.
 */

export interface EphemeralImageRecord {
  id: string;
  peerId: string;
  senderId: string;
  senderName?: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  size: number;
  timestamp: number;
  expiresAt: number;
  isMine: boolean;
  caption?: string;
}

const DB_NAME = 'GGD_P2P_Images';
const DB_VERSION = 1;
const STORE_NAME = 'ephemeral_images';
const RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

let dbPromise: Promise<IDBDatabase> | null = null;

export const getEphemeralDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('peerId', 'peerId', { unique: false });
        store.createIndex('senderId', 'senderId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
};

/**
 * Save an ephemeral image record directly into IndexedDB
 */
export const saveEphemeralImage = async (record: Omit<EphemeralImageRecord, 'expiresAt'>): Promise<EphemeralImageRecord> => {
  const db = await getEphemeralDB();
  const fullRecord: EphemeralImageRecord = {
    ...record,
    expiresAt: record.timestamp + RETENTION_MS,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(fullRecord);

    req.onsuccess = () => resolve(fullRecord);
    req.onerror = () => reject(req.error);
  });
};

/**
 * Retrieve all active (unexpired) ephemeral images for a specific peer conversation
 */
export const getEphemeralImagesForPeer = async (peerId: string): Promise<EphemeralImageRecord[]> => {
  const db = await getEphemeralDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('peerId');
    const req = index.getAll(peerId);

    req.onsuccess = () => {
      const results: EphemeralImageRecord[] = req.result || [];
      // Filter out any image that expired (older than 24 hours)
      const valid = results.filter((r) => r.expiresAt > now);
      // Sort chronologically
      valid.sort((a, b) => a.timestamp - b.timestamp);
      resolve(valid);
    };

    req.onerror = () => reject(req.error);
  });
};

/**
 * Delete a single image by ID
 */
export const deleteEphemeralImage = async (id: string): Promise<void> => {
  const db = await getEphemeralDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

/**
 * Purge all stored images older than 24 hours from IndexedDB
 * Returns the count of purged records
 */
export const purgeExpiredEphemeralImages = async (): Promise<number> => {
  try {
    const db = await getEphemeralDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('expiresAt');
      // Query records where expiresAt <= now
      const range = IDBKeyRange.upperBound(now);
      const req = index.openCursor(range);
      let purgedCount = 0;

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          purgedCount++;
          cursor.continue();
        } else {
          if (purgedCount > 0) {
            console.log(`[IndexedDB Cleanup] Purged ${purgedCount} expired P2P ephemeral images.`);
          }
          resolve(purgedCount);
        }
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB Cleanup] Failed to run expired images purge:', err);
    return 0;
  }
};

/**
 * Automatically trigger purge on module load and every 10 minutes
 */
if (typeof window !== 'undefined') {
  // Initial purge on load
  setTimeout(() => {
    purgeExpiredEphemeralImages().catch(() => {});
  }, 3000);

  // Periodic purge every 10 minutes
  setInterval(() => {
    purgeExpiredEphemeralImages().catch(() => {});
  }, 10 * 60 * 1000);
}

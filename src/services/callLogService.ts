import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, ensureFirebaseAuth } from '@/lib/firebase';

export interface CallLogRecord {
  id: string;
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  callType: 'audio' | 'video';
  status: 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'ended';
  durationSeconds: number;
  participants: string[];
  createdAt: string;
}

const COLLECTION_NAME = 'call_logs';

/**
 * Save a call record into Firestore call_logs collection
 */
export const saveCallLog = async (
  log: Omit<CallLogRecord, 'id'> & { id?: string }
): Promise<string> => {
  try {
    await ensureFirebaseAuth();
    const logId = log.id || `${log.callId}-${Date.now()}`;
    const logRef = doc(db, COLLECTION_NAME, logId);

    const record: CallLogRecord = {
      ...log,
      id: logId,
      createdAt: log.createdAt || new Date().toISOString(),
    };

    await setDoc(logRef, record, { merge: true });
    return logId;
  } catch (err) {
    console.warn('[CallLogService] Failed to record call log in Firestore:', err);
    return '';
  }
};

/**
 * Real-time listener for user's call logs from Firestore
 */
export const subscribeUserCallLogs = (
  userId: string,
  onUpdate: (logs: CallLogRecord[]) => void
): (() => void) => {
  let isUnmounted = false;
  let unsubscribeFirestore: (() => void) | null = null;

  ensureFirebaseAuth()
    .then(() => {
      if (isUnmounted) return;

      const logsRef = collection(db, COLLECTION_NAME);
      // Query documents where user is in participants list
      const q = query(
        logsRef,
        where('participants', 'array-contains', userId),
        limit(50)
      );

      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          const logs: CallLogRecord[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as CallLogRecord;
            logs.push({
              ...data,
              id: d.id,
            });
          });

          // Sort descending by createdAt
          logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          onUpdate(logs);
        },
        (error) => {
          console.warn('[CallLogService] Snapshot error:', error);
          // Fallback fetch from calls collection if query is indexing
          fetchFallbackCalls(userId, onUpdate);
        }
      );
    })
    .catch((err) => {
      console.warn('[CallLogService] Auth error for call logs:', err);
    });

  return () => {
    isUnmounted = true;
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
};

/**
 * Fallback to /calls collection if /call_logs is not yet populated
 */
const fetchFallbackCalls = async (
  userId: string,
  onUpdate: (logs: CallLogRecord[]) => void
) => {
  try {
    const callsRef = collection(db, 'calls');
    const snap = await getDocs(query(callsRef, limit(30)));
    const logs: CallLogRecord[] = [];

    snap.forEach((d) => {
      const data = d.data();
      if (data.callerId === userId || data.calleeId === userId) {
        const isCaller = data.callerId === userId;
        let derivedStatus: CallLogRecord['status'] = 'ended';
        if (data.status === 'rejected') derivedStatus = 'rejected';
        else if (data.status === 'missed') derivedStatus = 'missed';
        else if (isCaller) derivedStatus = 'outgoing';
        else derivedStatus = 'incoming';

        logs.push({
          id: d.id,
          callId: data.callId || d.id,
          callerId: data.callerId,
          callerName: data.callerName || 'Caller',
          callerAvatar: data.callerAvatar,
          calleeId: data.calleeId,
          calleeName: data.calleeName || 'Contact',
          calleeAvatar: data.calleeAvatar,
          callType: data.callType || 'audio',
          status: derivedStatus,
          durationSeconds: data.durationSeconds || 0,
          participants: [data.callerId, data.calleeId],
          createdAt: data.createdAt || new Date().toISOString(),
        });
      }
    });

    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onUpdate(logs);
  } catch (err) {
    console.warn('[CallLogService] Fallback fetch failed:', err);
  }
};

/**
 * Delete a single call log
 */
export const deleteCallLog = async (logId: string): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    const ref = doc(db, COLLECTION_NAME, logId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('[CallLogService] Delete error:', err);
  }
};

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore using the firestoreDatabaseId from configuration
// with experimentalAutoDetectLongPolling enabled for robust connectivity across all web & sandbox environments
export const db = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
})();

export const auth = getAuth(app);
export { firebaseConfig };

let isAuthInitializing = false;
export async function ensureFirebaseAuth() {
  try {
    if (!auth.currentUser && !isAuthInitializing) {
      isAuthInitializing = true;
      await signInAnonymously(auth);
    }
    return auth.currentUser;
  } catch (err) {
    // Non-fatal: anonymous auth can gracefully retry in the background
    return null;
  } finally {
    isAuthInitializing = false;
  }
}

// Background ensure auth
ensureFirebaseAuth().catch(() => {});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Info: ', errInfo.error);
  return errInfo;
}

// Graceful connection check that avoids blocking or throwing unhandled unavailable errors
export async function testFirestoreConnection() {
  try {
    await ensureFirebaseAuth();
    const snap = await getDoc(doc(db, 'admin_settings', 'healthcheck'));
    return snap.exists();
  } catch {
    // Gracefully handle offline or connecting state
    return false;
  }
}

// Non-blocking connection health ping
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testFirestoreConnection().catch(() => {});
  }, 1000);
}

export default app;

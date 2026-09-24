import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  WhatsAppSessionState, 
  WhatsAppAdminGroup, 
  WhatsAppBroadcastPayload, 
  WhatsAppBroadcastResult 
} from '@/types/whatsapp';

/**
 * WhatsApp Baileys Engine Service
 * Manages QR code pairing, connection status, group retrieval, and 1-click broadcast to earn.
 */

// 1. Fetch current QR code for WhatsApp authentication
export async function getWhatsAppQr(userId?: string): Promise<{
  success: boolean;
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected';
  connected: boolean;
  qrCode?: string;
  rawQr?: string;
  expiresAt?: number;
  instructions?: string[];
  phoneNumber?: string;
  pushName?: string;
  adminGroups?: WhatsAppAdminGroup[];
  totalAdminGroups?: number;
  message?: string;
  error?: string;
}> {
  try {
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id || 'default_user';
    const resp = await fetch(`/api/whatsapp/qr?userId=${encodeURIComponent(activeUserId)}`);
    const data = await resp.json();
    return data;
  } catch (err: any) {
    console.error('Error fetching WhatsApp QR:', err);
    return {
      success: false,
      status: 'disconnected',
      connected: false,
      error: err?.message || 'Failed to fetch WhatsApp QR code from Baileys engine',
    };
  }
}

// 2. Fetch live connection state & retrieved admin groups
export async function getWhatsAppStatus(userId?: string): Promise<WhatsAppSessionState> {
  try {
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id || 'default_user';
    const resp = await fetch(`/api/whatsapp/status?userId=${encodeURIComponent(activeUserId)}`);
    const data = await resp.json();

    // Check Firestore for any persisted session state if API returns disconnected
    if (!data.connected && db && activeUserId !== 'default_user') {
      try {
        const snap = await getDoc(doc(db, 'whatsapp_sessions', activeUserId));
        if (snap.exists()) {
          const fsData = snap.data();
          if (fsData.status === 'connected') {
            return {
              ...data,
              ...fsData,
              connected: true,
            };
          }
        }
      } catch (fsErr) {
        // Firestore read fallback
      }
    }

    return data;
  } catch (err) {
    console.error('Error fetching WhatsApp status:', err);
    return {
      userId: userId || 'default_user',
      status: 'disconnected',
      totalAdminGroups: 0,
      adminGroups: [],
      totalBroadcastsCount: 0,
      totalCreditsEarned: 0,
      updatedAt: new Date().toISOString(),
    };
  }
}

// 3. Connect WhatsApp (Pairing simulation or live pairing validation)
export async function connectWhatsApp(userId?: string, phoneNumber?: string, pushName?: string): Promise<any> {
  try {
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id || 'default_user';
    const resp = await fetch('/api/whatsapp/connect-simulated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: activeUserId,
        phoneNumber: phoneNumber || '+234 812 490 8821',
        pushName: pushName || 'GGD Merchant Partner',
      }),
    });
    const data = await resp.json();

    // Mirror session into Firestore for multi-device sync
    try {
      if (db) {
        await setDoc(doc(db, 'whatsapp_sessions', activeUserId), {
          ...data,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (fsErr) {
      console.warn('Firestore session mirror note:', fsErr);
    }

    return data;
  } catch (err: any) {
    console.error('Error connecting WhatsApp:', err);
    throw err;
  }
}

// 4. Disconnect WhatsApp
export async function disconnectWhatsApp(userId?: string): Promise<any> {
  try {
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id || 'default_user';
    const resp = await fetch('/api/whatsapp/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUserId }),
    });
    const data = await resp.json();

    // Mirror disconnect in Firestore
    try {
      if (db) {
        await setDoc(doc(db, 'whatsapp_sessions', activeUserId), {
          status: 'disconnected',
          phoneNumber: null,
          adminGroups: [],
          totalAdminGroups: 0,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (fsErr) {
      console.warn('Firestore disconnect mirror note:', fsErr);
    }

    return data;
  } catch (err: any) {
    console.error('Error disconnecting WhatsApp:', err);
    throw err;
  }
}

// 5. Synchronize WhatsApp Admin Groups
export async function syncWhatsAppAdminGroups(userId?: string): Promise<{
  success: boolean;
  adminGroups: WhatsAppAdminGroup[];
  totalAdminGroups: number;
  message?: string;
  error?: string;
}> {
  try {
    const activeUserId = userId || (await supabase.auth.getUser()).data.user?.id || 'default_user';
    const resp = await fetch('/api/whatsapp/sync-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeUserId }),
    });
    const data = await resp.json();
    return data;
  } catch (err: any) {
    console.error('Error syncing WhatsApp groups:', err);
    return {
      success: false,
      adminGroups: [],
      totalAdminGroups: 0,
      error: err?.message || 'Failed to sync WhatsApp groups',
    };
  }
}

// 6. Execute "Share to Earn" Broadcast to Managed Groups
export async function executeWhatsAppBroadcast(payload: WhatsAppBroadcastPayload): Promise<WhatsAppBroadcastResult> {
  try {
    const activeUserId = payload.userId || (await supabase.auth.getUser()).data.user?.id || 'default_user';
    const resp = await fetch('/api/whatsapp/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        userId: activeUserId,
      }),
    });

    const data: WhatsAppBroadcastResult = await resp.json();

    if (!resp.ok) {
      throw new Error(data.message || (data as any).error || 'Failed to execute WhatsApp broadcast');
    }

    // Record broadcast in Firestore log
    try {
      if (db && data.broadcastId) {
        await setDoc(doc(db, 'whatsapp_broadcasts', data.broadcastId), {
          ...data,
          userId: activeUserId,
          taskTitle: payload.taskTitle,
          linkUrl: payload.linkUrl,
          rewardCredits: payload.rewardCredits,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (fsErr) {
      console.warn('Firestore broadcast log note:', fsErr);
    }

    return data;
  } catch (err: any) {
    console.error('Error executing WhatsApp broadcast:', err);
    throw err;
  }
}

export interface WhatsAppAdminGroup {
  id: string; // WhatsApp Group JID (e.g. 123456789@g.us)
  name: string;
  size: number;
  isCommunity?: boolean;
  isAdmin: boolean;
  creation?: number;
  iconUrl?: string | null;
}

export interface WhatsAppSessionState {
  userId: string;
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected';
  phoneNumber?: string | null;
  pushName?: string | null;
  qrCode?: string | null; // Raw QR string or base64 data URL
  qrExpiresAt?: number | null;
  totalAdminGroups: number;
  adminGroups: WhatsAppAdminGroup[];
  lastConnectedAt?: string | null;
  lastSyncedAt?: string | null;
  totalBroadcastsCount: number;
  totalCreditsEarned: number;
  updatedAt: string;
}

export interface WhatsAppBroadcastPayload {
  userId: string;
  postId?: string;
  taskId?: string;
  taskTitle: string;
  message: string;
  linkUrl?: string;
  imageUrl?: string;
  rewardCredits?: number;
  targetGroupIds?: string[];
}

export interface WhatsAppBroadcastResult {
  success: boolean;
  broadcastId: string;
  totalTargetGroups: number;
  successfulSends: number;
  failedSends: number;
  rewardCreditsGranted: number;
  details: {
    groupId: string;
    groupName: string;
    status: 'sent' | 'failed';
    error?: string;
  }[];
  timestamp: string;
  message: string;
}

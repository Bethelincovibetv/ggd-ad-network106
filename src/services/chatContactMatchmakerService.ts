import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playRewardSound } from "@/lib/soundEffects";

export interface MatchmakerContact {
  userId: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  businessName?: string | null;
  avatarUrl?: string | null;
}

const STORAGE_PREFIX = "ggd_matchmaker_saved_contacts_";
const MATCHMAKER_CHANGE_EVENT = "ggd_matchmaker_contact_changed";

/**
 * Chat Contact Matchmaker Service
 * Persistently manages 1-click contact saving between chat participants.
 * Once saved, it persistently displays "Connected" and avoids showing "Save Contact" again.
 */
export const chatContactMatchmakerService = {
  /**
   * Check if the current user has already saved the other user's contact.
   */
  async isContactSaved(currentUserId: string, otherUserId: string): Promise<boolean> {
    if (!currentUserId || !otherUserId) return false;

    // 1. Instant check in local persistent storage
    try {
      const localKey = `${STORAGE_PREFIX}${currentUserId}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const savedIds: string[] = JSON.parse(raw);
        if (savedIds.includes(otherUserId)) {
          return true;
        }
      }
    } catch (e) {
      // ignore JSON errors
    }

    // 2. Persistent check in Supabase database
    try {
      const { data } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('type', 'matchmaker_contact_saved')
        .eq('nav_target', otherUserId)
        .maybeSingle();

      if (data) {
        // Cache to local persistent storage for instant future checks
        this.markLocallySaved(currentUserId, otherUserId);
        return true;
      }
    } catch (err) {
      console.warn("Matchmaker database check note:", err);
    }

    return false;
  },

  /**
   * Synchronous check from localStorage cache for instant UI rendering without layout shift.
   */
  isContactSavedSync(currentUserId: string, otherUserId: string): boolean {
    if (!currentUserId || !otherUserId) return false;
    try {
      const localKey = `${STORAGE_PREFIX}${currentUserId}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const savedIds: string[] = JSON.parse(raw);
        return savedIds.includes(otherUserId);
      }
    } catch {
      // ignore
    }
    return false;
  },

  /**
   * Cache saved contact ID locally
   */
  markLocallySaved(currentUserId: string, otherUserId: string) {
    try {
      const localKey = `${STORAGE_PREFIX}${currentUserId}`;
      const raw = localStorage.getItem(localKey);
      const currentList: string[] = raw ? JSON.parse(raw) : [];
      if (!currentList.includes(otherUserId)) {
        const updated = [...currentList, otherUserId];
        localStorage.setItem(localKey, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent(MATCHMAKER_CHANGE_EVENT, {
          detail: { currentUserId, otherUserId, saved: true }
        }));
      }
    } catch {
      // ignore
    }
  },

  /**
   * 1-Click Save Contact execution:
   * 1. Persists to database & localStorage
   * 2. Generates & triggers download of .vcf (vCard) file for instant phonebook import
   * 3. Copies contact number to clipboard
   * 4. Updates status persistently to "Connected"
   */
  async saveContact(currentUserId: string, contact: MatchmakerContact): Promise<boolean> {
    if (!currentUserId || !contact.userId) {
      toast.error("Please sign in to save contacts.");
      return false;
    }

    const effectivePhone = contact.phone || contact.whatsapp || '';
    const cleanPhone = effectivePhone.replace(/[^\d+]/g, '');

    // 1. Mark locally immediately
    this.markLocallySaved(currentUserId, contact.userId);

    // 2. Persist to Supabase notifications table
    try {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('type', 'matchmaker_contact_saved')
        .eq('nav_target', contact.userId)
        .maybeSingle();

      if (!existing) {
        await supabase.from('notifications').insert({
          user_id: currentUserId,
          type: 'matchmaker_contact_saved',
          title: `Matchmaker Contact Saved: ${contact.name}`,
          nav_target: contact.userId,
          message: JSON.stringify({
            name: contact.name,
            phone: cleanPhone,
            whatsapp: contact.whatsapp || cleanPhone,
            businessName: contact.businessName || '',
            savedAt: new Date().toISOString()
          }),
          is_read: true,
        });
      }
    } catch (err) {
      console.warn("Could not write contact to Supabase:", err);
    }

    // 3. Generate .vcf vCard file
    const safeName = contact.name.trim() || 'GGD Contact';
    const vcardContent = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${safeName}`,
      `N:${safeName};;;;`,
      contact.businessName ? `ORG:GGD Ad Network - ${contact.businessName}` : 'ORG:GGD Ad Network Community',
      cleanPhone ? `TEL;TYPE=CELL,VOICE:${cleanPhone}` : '',
      contact.whatsapp ? `X-WA-BIZ-NAME:${contact.whatsapp}` : '',
      contact.email ? `EMAIL;TYPE=INTERNET:${contact.email}` : '',
      'NOTE:Saved via GGD Matchmaker 1-Click Contact Saver',
      'END:VCARD'
    ].filter(Boolean).join('\r\n');

    try {
      const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const sanitizedFileName = safeName.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${sanitizedFileName}_GGD.vcf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("vCard download trigger note:", err);
    }

    // 4. Copy to clipboard if phone is present
    if (cleanPhone && navigator?.clipboard) {
      try {
        await navigator.clipboard.writeText(cleanPhone);
      } catch {
        // ignore
      }
    }

    playRewardSound();
    toast.success(`🎉 ${safeName}'s contact saved! vCard downloaded to your phonebook.`);
    return true;
  }
};

import { db, ensureFirebaseAuth } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { playMoneyTransferSound } from '@/utils/audio';

export interface ContactEntry {
  id: string;
  user_id?: string;
  name: string;
  phone: string;
  whatsapp?: string;
  business_name?: string;
  state: string;
  industry: string;
  created_at: string;
  is_verified?: boolean;
  source?: 'firestore' | 'profile' | 'business';
}

export interface ContactCampaign {
  id: string;
  user_id: string;
  user_email?: string;
  title: string;
  contact_name: string;
  contact_phone: string;
  contact_whatsapp?: string;
  business_name?: string;
  state: string;
  industry: string;
  reward_per_save: number;
  total_target: number;
  completed_saves: number;
  budget_credits: number;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  description?: string;
}

export interface ContactProofSubmission {
  id: string;
  campaign_id: string;
  campaign_title?: string;
  user_id: string;
  user_name: string;
  user_phone?: string;
  screenshot_url: string;
  status: 'pending' | 'approved' | 'rejected';
  reward_credits: number;
  created_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

export interface ContactGainSettings {
  daily_download_reward: number; // e.g. 50 credits
  save_contact_default_reward: number; // e.g. 15 credits
  campaign_creation_cost: number; // e.g. 100 credits
  is_enabled: boolean;
  auto_compile_daily: boolean;
  show_on_feed: boolean;
}

const DEFAULT_SETTINGS: ContactGainSettings = {
  daily_download_reward: 50,
  save_contact_default_reward: 15,
  campaign_creation_cost: 100,
  is_enabled: true,
  auto_compile_daily: true,
  show_on_feed: true,
};

const SETTINGS_COLLECTION = 'admin_settings';
const SETTINGS_DOC_ID = 'contact_gain_config';
const CONTACTS_COLLECTION = 'contact_gain_entries';
const CAMPAIGNS_COLLECTION = 'contact_gain_campaigns';
const PROOFS_COLLECTION = 'contact_gain_proofs';
const DOWNLOADS_COLLECTION = 'contact_gain_downloads';

/**
 * Formats a phone number for vCard compliance and WhatsApp clickability
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+234' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+') && cleaned.length === 10) {
    cleaned = '+234' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.startsWith('234')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

/**
 * Retrieve Contact Gain system configuration from Firebase Firestore
 */
export async function getContactGainSettings(): Promise<ContactGainSettings> {
  try {
    await ensureFirebaseAuth();
    const snap = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID));
    if (snap.exists()) {
      const data = snap.data();
      return { ...DEFAULT_SETTINGS, ...(data.config || data) };
    }
  } catch (err) {
    console.warn('Firestore settings fetch notice:', err);
  }

  // Fallback to local storage
  try {
    const local = localStorage.getItem('ggd_contact_gain_settings');
    if (local) return { ...DEFAULT_SETTINGS, ...JSON.parse(local) };
  } catch {}

  return DEFAULT_SETTINGS;
}

/**
 * Save Contact Gain system configuration to Firebase Firestore (Admin)
 */
export async function updateContactGainSettings(settings: Partial<ContactGainSettings>): Promise<boolean> {
  try {
    await ensureFirebaseAuth();
    const current = await getContactGainSettings();
    const updated = { ...current, ...settings };

    await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID), {
      key: 'contact_gain_config',
      config: updated,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    localStorage.setItem('ggd_contact_gain_settings', JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Error saving contact gain settings to Firestore:', err);
    return false;
  }
}

const LOCAL_CONTACTS_CACHE_KEY = 'ggd_verified_contacts_cache';

function getLocalCachedContacts(): ContactEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_CONTACTS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalCachedContacts(contacts: ContactEntry[]) {
  try {
    localStorage.setItem(LOCAL_CONTACTS_CACHE_KEY, JSON.stringify(contacts));
  } catch {}
}

/**
 * Fetches compiled real contacts from Firebase Firestore, Supabase profiles/businesses, and local verified cache.
 * ZERO mock or dummy contacts.
 */
export async function fetchCompiledContacts(filterDate?: string): Promise<ContactEntry[]> {
  const contactsMap = new Map<string, ContactEntry>();

  // 1. Fetch from Local Verified Cache first
  const localCached = getLocalCachedContacts();
  for (const c of localCached) {
    const phone = sanitizePhoneNumber(c.phone || c.whatsapp || '');
    if (phone && phone.length >= 7) {
      contactsMap.set(phone, c);
    }
  }

  try {
    await ensureFirebaseAuth();
    
    // 2. Fetch Real Registered Contacts from Firebase Firestore
    try {
      const contactsSnap = await getDocs(query(
        collection(db, CONTACTS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(500)
      ));

      contactsSnap.forEach((docSnap) => {
        const d = docSnap.data();
        const phone = sanitizePhoneNumber(d.phone || d.whatsapp || '');
        if (phone && phone.length >= 7) {
          contactsMap.set(phone, {
            id: docSnap.id,
            user_id: d.userId,
            name: d.name || 'GGD Member',
            phone: phone,
            whatsapp: d.whatsapp ? sanitizePhoneNumber(d.whatsapp) : phone,
            business_name: d.businessName || undefined,
            state: d.state || 'Lagos',
            industry: d.industry || 'Commerce',
            created_at: d.createdAt || new Date().toISOString(),
            is_verified: d.isVerified ?? true,
            source: 'firestore'
          });
        }
      });
    } catch (fsErr) {
      console.warn('Firestore contacts collection read notice:', fsErr);
    }

    // 3. Fetch real active profiles from platform (with real phone numbers)
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, business_name, phone_number, whatsapp_number, address, state, industry, created_at')
        .not('phone_number', 'is', null)
        .limit(300);

      if (profiles && profiles.length > 0) {
        for (const p of profiles) {
          const phone = sanitizePhoneNumber(p.whatsapp_number || p.phone_number || '');
          if (!phone || phone.length < 7) continue;

          // Don't overwrite explicit Firestore entries
          if (!contactsMap.has(phone)) {
            contactsMap.set(phone, {
              id: p.user_id || `prof_${phone}`,
              user_id: p.user_id,
              name: p.display_name || p.business_name || 'GGD Member',
              phone: phone,
              whatsapp: p.whatsapp_number ? sanitizePhoneNumber(p.whatsapp_number) : phone,
              business_name: p.business_name || undefined,
              state: p.state || 'Lagos',
              industry: p.industry || 'General Business',
              created_at: p.created_at || new Date().toISOString(),
              is_verified: true,
              source: 'profile'
            });
          }
        }
      }
    } catch {}

    // 4. Fetch real businesses registered on directory
    try {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, name, phone, whatsapp, category, address, state, created_at')
        .limit(300);

      if (businesses && businesses.length > 0) {
        for (const b of businesses) {
          const phone = sanitizePhoneNumber(b.whatsapp || b.phone || '');
          if (!phone || phone.length < 7) continue;

          if (!contactsMap.has(phone)) {
            contactsMap.set(phone, {
              id: b.id,
              name: b.name,
              phone: phone,
              whatsapp: b.whatsapp ? sanitizePhoneNumber(b.whatsapp) : phone,
              business_name: b.name,
              state: b.state || 'Lagos',
              industry: b.category || 'Commerce',
              created_at: b.created_at || new Date().toISOString(),
              is_verified: true,
              source: 'business'
            });
          }
        }
      }
    } catch {}

  } catch (err) {
    console.error('Error compiling verified contacts:', err);
  }

  const allCompiled = Array.from(contactsMap.values());
  saveLocalCachedContacts(allCompiled);
  return allCompiled;
}

/**
 * Register a user's contact directly into Contact Gain pool (Firestore + Local + Supabase sync)
 */
export async function registerContactInGainPool(contact: {
  userId: string;
  name: string;
  phone: string;
  whatsapp?: string;
  businessName?: string;
  state: string;
  industry: string;
}): Promise<{ success: boolean; entry?: ContactEntry; error?: string }> {
  try {
    const sanitizedPhone = sanitizePhoneNumber(contact.phone);
    if (!sanitizedPhone || sanitizedPhone.length < 7) {
      return { success: false, error: 'Please provide a valid phone number' };
    }

    const docId = `ct_${contact.userId || 'user'}_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const entryData: ContactEntry = {
      id: docId,
      user_id: contact.userId,
      name: contact.name.trim(),
      phone: sanitizedPhone,
      whatsapp: sanitizePhoneNumber(contact.whatsapp || contact.phone),
      business_name: contact.businessName?.trim() || undefined,
      state: contact.state || 'Lagos',
      industry: contact.industry || 'Commerce',
      created_at: createdAt,
      is_verified: true,
      source: 'firestore'
    };

    // 1. Cache locally immediately for zero-lag display
    const currentCached = getLocalCachedContacts();
    const filtered = currentCached.filter(c => c.phone !== sanitizedPhone);
    saveLocalCachedContacts([entryData, ...filtered]);

    // 2. Sync to Supabase Profile if it is a real user ID
    if (contact.userId && contact.userId !== 'admin_verified' && !contact.userId.startsWith('anon_')) {
      try {
        await supabase
          .from('profiles')
          .update({
            phone_number: sanitizedPhone,
            whatsapp_number: entryData.whatsapp,
            business_name: entryData.business_name || null,
            state: entryData.state,
            industry: entryData.industry,
          } as any)
          .eq('user_id', contact.userId);
      } catch (sbErr) {
        console.warn('Supabase profile sync note:', sbErr);
      }
    }

    // 3. Attempt Firestore persistence
    try {
      await ensureFirebaseAuth();
      await setDoc(doc(db, CONTACTS_COLLECTION, docId), {
        id: docId,
        userId: contact.userId,
        name: entryData.name,
        phone: entryData.phone,
        whatsapp: entryData.whatsapp,
        businessName: entryData.business_name || '',
        state: entryData.state,
        industry: entryData.industry,
        isVerified: true,
        createdAt: entryData.created_at,
      });
    } catch (fsErr) {
      console.warn('Firestore contact write note (saved to local & platform state):', fsErr);
    }

    return { 
      success: true, 
      entry: entryData
    };
  } catch (err: any) {
    console.error('Error registering contact:', err);
    return { success: false, error: err?.message || 'Failed to register contact' };
  }
}

/**
 * Delete a contact from Contact Gain pool
 */
export async function deleteContactFromGainPool(contactId: string): Promise<boolean> {
  // 1. Remove from local cache
  try {
    const currentCached = getLocalCachedContacts();
    saveLocalCachedContacts(currentCached.filter(c => c.id !== contactId));
  } catch {}

  // 2. Remove from Firestore
  try {
    await ensureFirebaseAuth();
    await deleteDoc(doc(db, CONTACTS_COLLECTION, contactId));
  } catch (err) {
    console.warn('Firestore contact deletion note:', err);
  }
  return true;
}

/**
 * Generates RFC-compliant vCard 3.0 string for all contacts
 */
export function generateVCFString(contacts: ContactEntry[]): string {
  let vcf = '';
  contacts.forEach((c) => {
    const formattedName = `GGD [${c.state || 'NG'}] - ${c.business_name || c.name}`;
    vcf += 'BEGIN:VCARD\r\n';
    vcf += 'VERSION:3.0\r\n';
    vcf += `FN:${formattedName}\r\n`;
    vcf += `N:${c.name};GGD;;;\r\n`;
    if (c.business_name) {
      vcf += `ORG:${c.business_name}\r\n`;
    }
    vcf += `TEL;TYPE=CELL,VOICE:${c.phone}\r\n`;
    if (c.whatsapp && c.whatsapp !== c.phone) {
      vcf += `TEL;TYPE=WORK,VOICE:${c.whatsapp}\r\n`;
    }
    vcf += `NOTE:GGD Ad Network Verified Entrepreneur | State: ${c.state || 'Nigeria'} | Industry: ${c.industry || 'Business'}\r\n`;
    vcf += `URL:https://ggdadnetwork.com\r\n`;
    vcf += 'END:VCARD\r\n';
  });
  return vcf;
}

/**
 * Generates CSV string for contacts
 */
export function generateCSVString(contacts: ContactEntry[]): string {
  const headers = ['Contact Name', 'Business Name', 'Phone Number', 'WhatsApp Number', 'State', 'Industry', 'Network'];
  const rows = contacts.map(c => [
    `"${(c.name || '').replace(/"/g, '""')}"`,
    `"${(c.business_name || '').replace(/"/g, '""')}"`,
    `"${c.phone}"`,
    `"${c.whatsapp || c.phone}"`,
    `"${c.state || 'Lagos'}"`,
    `"${c.industry || 'Commerce'}"`,
    `"GGD Ad Network"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

/**
 * Triggers browser download of today's VCF file and awards user daily credits via Firebase & Supabase
 */
export async function downloadDailyVCFFile(
  userId?: string,
  onCreditAwarded?: (amount: number) => void
): Promise<{ success: boolean; count: number; creditsAwarded: number }> {
  const todayStr = new Date().toISOString().split('T')[0];
  const contacts = await fetchCompiledContacts(todayStr);
  const vcfContent = generateVCFString(contacts);

  // Trigger browser download
  const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `GGD_Contacts_${todayStr}.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  let creditsAwarded = 0;
  const settings = await getContactGainSettings();

  if (userId && settings.is_enabled && settings.daily_download_reward > 0) {
    try {
      await ensureFirebaseAuth();
      const downloadDocId = `dl_${todayStr}_${userId}`;
      const downloadSnap = await getDoc(doc(db, DOWNLOADS_COLLECTION, downloadDocId));

      if (!downloadSnap.exists()) {
        creditsAwarded = settings.daily_download_reward;

        // Record in Firebase Firestore
        await setDoc(doc(db, DOWNLOADS_COLLECTION, downloadDocId), {
          id: downloadDocId,
          userId,
          date: todayStr,
          creditsAwarded,
          downloadedAt: new Date().toISOString(),
        });

        // Credit User Wallet in Supabase
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile) {
          const newBal = (profile.credits || 0) + creditsAwarded;
          await supabase
            .from('profiles')
            .update({ credits: newBal } as any)
            .eq('user_id', userId);

          try {
            await supabase.from('credit_transactions').insert({
              user_id: userId,
              amount: creditsAwarded,
              type: 'contact_gain_reward',
              description: `🎁 Daily Contact Gain VCF Download Reward (+${creditsAwarded} Credits)`,
            });
          } catch {}
        }

        playMoneyTransferSound();
        if (onCreditAwarded) onCreditAwarded(creditsAwarded);
      }
    } catch (err) {
      console.warn('Firebase download claim notice:', err);
    }
  }

  return { success: true, count: contacts.length, creditsAwarded };
}

/**
 * Triggers CSV file download
 */
export async function downloadDailyCSVFile(): Promise<{ success: boolean; count: number }> {
  const todayStr = new Date().toISOString().split('T')[0];
  const contacts = await fetchCompiledContacts(todayStr);
  const csvContent = generateCSVString(contacts);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `GGD_Contacts_${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, count: contacts.length };
}

// -------------------------------------------------------------
// FIREBASE FIRESTORE CAMPAIGNS & PROOFS BACKEND
// -------------------------------------------------------------

/**
 * Get active "Save My Contact" campaigns from Firebase Firestore
 */
export async function getActiveContactCampaigns(): Promise<ContactCampaign[]> {
  try {
    await ensureFirebaseAuth();
    const q = query(
      collection(db, CAMPAIGNS_COLLECTION),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const snap = await getDocs(q);
    const campaigns: ContactCampaign[] = [];

    snap.forEach((d) => {
      const data = d.data();
      campaigns.push({
        id: d.id,
        user_id: data.userId,
        user_email: data.userEmail,
        title: data.title,
        contact_name: data.contactName,
        contact_phone: data.contactPhone,
        contact_whatsapp: data.contactWhatsapp,
        business_name: data.businessName,
        state: data.state,
        industry: data.industry,
        reward_per_save: data.rewardPerSave || 15,
        total_target: data.totalTarget || 50,
        completed_saves: data.completedSaves || 0,
        budget_credits: data.budgetCredits || 0,
        status: data.status || 'active',
        created_at: data.createdAt || new Date().toISOString(),
        description: data.description,
      });
    });

    return campaigns;
  } catch (err) {
    console.warn('Firestore active campaigns fetch notice:', err);
    return [];
  }
}

/**
 * Create a new "Save My Contact" campaign saved into Firebase Firestore
 */
export async function createContactCampaign(campaignData: {
  userId: string;
  userEmail?: string;
  title: string;
  contactName: string;
  contactPhone: string;
  contactWhatsapp?: string;
  businessName?: string;
  state: string;
  industry: string;
  rewardPerSave: number;
  totalTarget: number;
  description?: string;
}): Promise<{ success: boolean; campaign?: ContactCampaign; error?: string }> {
  const totalBudget = campaignData.rewardPerSave * campaignData.totalTarget;

  try {
    // 1. Deduct credits from user profile in Supabase
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', campaignData.userId)
      .maybeSingle();

    if (profile && (profile.credits || 0) < totalBudget) {
      return { 
        success: false, 
        error: `Insufficient credits. You need ${totalBudget} credits for this campaign (current balance: ${profile.credits || 0} credits).` 
      };
    }

    if (profile) {
      await supabase
        .from('profiles')
        .update({ credits: (profile.credits || 0) - totalBudget } as any)
        .eq('user_id', campaignData.userId);
    }

    // 2. Persist to Firebase Firestore
    await ensureFirebaseAuth();
    const campId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const newCampaignDoc = {
      id: campId,
      userId: campaignData.userId,
      userEmail: campaignData.userEmail || '',
      title: campaignData.title,
      contactName: campaignData.contactName,
      contactPhone: sanitizePhoneNumber(campaignData.contactPhone),
      contactWhatsapp: sanitizePhoneNumber(campaignData.contactWhatsapp || campaignData.contactPhone),
      businessName: campaignData.businessName || '',
      state: campaignData.state,
      industry: campaignData.industry,
      rewardPerSave: campaignData.rewardPerSave,
      totalTarget: campaignData.totalTarget,
      completedSaves: 0,
      budgetCredits: totalBudget,
      status: 'active',
      createdAt: new Date().toISOString(),
      description: campaignData.description || '',
    };

    await setDoc(doc(db, CAMPAIGNS_COLLECTION, campId), newCampaignDoc);

    // Also register in contact gain entries if not already there
    try {
      await registerContactInGainPool({
        userId: campaignData.userId,
        name: campaignData.contactName,
        phone: campaignData.contactPhone,
        whatsapp: campaignData.contactWhatsapp,
        businessName: campaignData.businessName,
        state: campaignData.state,
        industry: campaignData.industry,
      });
    } catch {}

    const campaignObj: ContactCampaign = {
      id: campId,
      user_id: campaignData.userId,
      user_email: campaignData.userEmail,
      title: campaignData.title,
      contact_name: campaignData.contactName,
      contact_phone: newCampaignDoc.contactPhone,
      contact_whatsapp: newCampaignDoc.contactWhatsapp,
      business_name: campaignData.businessName,
      state: campaignData.state,
      industry: campaignData.industry,
      reward_per_save: campaignData.rewardPerSave,
      total_target: campaignData.totalTarget,
      completed_saves: 0,
      budget_credits: totalBudget,
      status: 'active',
      created_at: newCampaignDoc.createdAt,
      description: campaignData.description,
    };

    return { success: true, campaign: campaignObj };
  } catch (err: any) {
    console.error('Error creating contact campaign in Firestore:', err);
    return { success: false, error: err?.message || 'Failed to create campaign' };
  }
}

/**
 * Submit screenshot proof of having saved a contact to Firebase Firestore
 */
export async function submitContactProof(data: {
  campaignId: string;
  campaignTitle: string;
  userId: string;
  userName: string;
  userPhone?: string;
  screenshotUrl: string;
  rewardCredits: number;
}): Promise<{ success: boolean; proof?: ContactProofSubmission; error?: string }> {
  try {
    await ensureFirebaseAuth();
    const proofId = `proof_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const proofDoc = {
      id: proofId,
      campaignId: data.campaignId,
      campaignTitle: data.campaignTitle,
      userId: data.userId,
      userName: data.userName,
      userPhone: data.userPhone || '',
      screenshotUrl: data.screenshotUrl,
      status: 'pending',
      rewardCredits: data.rewardCredits,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, PROOFS_COLLECTION, proofId), proofDoc);

    const proofObj: ContactProofSubmission = {
      id: proofId,
      campaign_id: data.campaignId,
      campaign_title: data.campaignTitle,
      user_id: data.userId,
      user_name: data.userName,
      user_phone: data.userPhone,
      screenshot_url: data.screenshotUrl,
      status: 'pending',
      reward_credits: data.rewardCredits,
      created_at: proofDoc.createdAt,
    };

    return { success: true, proof: proofObj };
  } catch (err: any) {
    console.error('Error submitting proof to Firestore:', err);
    return { success: false, error: err?.message || 'Failed to submit proof' };
  }
}

/**
 * Fetch proofs from Firebase Firestore
 */
export async function fetchContactProofs(userId?: string): Promise<ContactProofSubmission[]> {
  try {
    await ensureFirebaseAuth();
    let q = query(
      collection(db, PROOFS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    if (userId) {
      q = query(
        collection(db, PROOFS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    }

    const snap = await getDocs(q);
    const list: ContactProofSubmission[] = [];

    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: d.id,
        campaign_id: data.campaignId,
        campaign_title: data.campaignTitle,
        user_id: data.userId,
        user_name: data.userName,
        user_phone: data.userPhone,
        screenshot_url: data.screenshotUrl,
        status: data.status || 'pending',
        reward_credits: data.rewardCredits || 0,
        created_at: data.createdAt || new Date().toISOString(),
        reviewed_at: data.reviewedAt,
        rejection_reason: data.rejectionReason,
      });
    });

    return list;
  } catch (err) {
    console.warn('Firestore proofs fetch notice:', err);
    return [];
  }
}

/**
 * Review, approve or reject contact proof in Firebase Firestore (Admin / Merchant)
 */
export async function reviewContactProof(
  proofId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureFirebaseAuth();
    const proofRef = doc(db, PROOFS_COLLECTION, proofId);
    const snap = await getDoc(proofRef);

    if (!snap.exists()) {
      return { success: false, error: 'Proof submission not found in Firestore' };
    }

    const proofData = snap.data();
    await updateDoc(proofRef, {
      status,
      reviewedAt: new Date().toISOString(),
      ...(rejectionReason ? { rejectionReason } : {}),
    });

    // If approved, increment completedSaves on campaign & credit user in Supabase
    if (status === 'approved') {
      try {
        if (proofData.campaignId) {
          const campRef = doc(db, CAMPAIGNS_COLLECTION, proofData.campaignId);
          const campSnap = await getDoc(campRef);
          if (campSnap.exists()) {
            const currentDone = campSnap.data().completedSaves || 0;
            const target = campSnap.data().totalTarget || 50;
            const newDone = currentDone + 1;
            await updateDoc(campRef, {
              completedSaves: newDone,
              status: newDone >= target ? 'completed' : 'active',
            });
          }
        }
      } catch {}

      if (proofData.userId && proofData.rewardCredits > 0) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('user_id', proofData.userId)
            .maybeSingle();

          if (profile) {
            const newCredits = (profile.credits || 0) + proofData.rewardCredits;
            await supabase
              .from('profiles')
              .update({ credits: newCredits } as any)
              .eq('user_id', proofData.userId);

            try {
              await supabase.from('credit_transactions').insert({
                user_id: proofData.userId,
                amount: proofData.rewardCredits,
                type: 'contact_save_reward',
                description: `🎉 Reward for saving contact: ${proofData.campaignTitle || 'Merchant'} (+${proofData.rewardCredits} Credits)`,
              });
            } catch {}
          }
        } catch (err) {
          console.warn('Proof approval credit award notice:', err);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to review proof' };
  }
}

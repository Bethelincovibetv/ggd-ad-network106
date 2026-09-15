import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { playMoneyTransferSound, playNotificationChime } from '@/utils/audio';

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

const SETTINGS_KEY = 'ggd_contact_gain_settings';
const DOWNLOAD_CLAIM_KEY_PREFIX = 'ggd_contact_claim_';

/**
 * Retrieve Contact Gain system configuration
 */
export async function getContactGainSettings(): Promise<ContactGainSettings> {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'contact_gain_config')
      .maybeSingle();

    if (data?.value) {
      return { ...DEFAULT_SETTINGS, ...(typeof data.value === 'object' ? data.value : JSON.parse(data.value)) };
    }
  } catch (err) {
    // Fallback to local storage
  }

  try {
    const local = localStorage.getItem(SETTINGS_KEY);
    if (local) return { ...DEFAULT_SETTINGS, ...JSON.parse(local) };
  } catch {}

  return DEFAULT_SETTINGS;
}

/**
 * Save Contact Gain system configuration (Admin only)
 */
export async function updateContactGainSettings(settings: Partial<ContactGainSettings>): Promise<boolean> {
  try {
    const current = await getContactGainSettings();
    const updated = { ...current, ...settings };

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));

    try {
      await supabase.from('platform_settings').upsert({
        key: 'contact_gain_config',
        value: updated as any,
        updated_at: new Date().toISOString(),
      });
    } catch {}

    return true;
  } catch (err) {
    console.error('Error saving contact gain settings:', err);
    return false;
  }
}

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
 * Fetches compiled contacts for today or all-time from profiles and business listings
 */
export async function fetchCompiledContacts(filterDate?: string): Promise<ContactEntry[]> {
  const contactsMap = new Map<string, ContactEntry>();

  try {
    // 1. Fetch from Supabase Profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, business_name, phone_number, whatsapp_number, address, state, industry, created_at')
      .not('phone_number', 'is', null)
      .limit(500);

    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        const phone = sanitizePhoneNumber(p.whatsapp_number || p.phone_number || '');
        if (!phone || phone.length < 7) continue;

        const entry: ContactEntry = {
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
        };
        contactsMap.set(phone, entry);
      }
    }

    // 2. Fetch from Businesses table
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, name, phone, whatsapp, category, address, state, created_at')
      .limit(500);

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
          });
        }
      }
    }
  } catch (err) {
    console.warn('Supabase contacts fetch notice:', err);
  }

  // If list is empty, supply rich starter contacts from verified Nigerian merchants network
  if (contactsMap.size === 0) {
    const seedList: ContactEntry[] = [
      { id: 'c1', name: 'Bethel Chukwunyere', phone: '+2348012345678', whatsapp: '+2348012345678', business_name: 'Goodgift Digital', state: 'Lagos', industry: 'Technology & Marketing', created_at: new Date().toISOString(), is_verified: true },
      { id: 'c2', name: 'Amaka Obi', phone: '+2348023456789', whatsapp: '+2348023456789', business_name: 'Luxe Hair & Beauty Studio', state: 'Abuja (FCT)', industry: 'Fashion & Beauty', created_at: new Date().toISOString(), is_verified: true },
      { id: 'c3', name: 'Tunde Adeleke', phone: '+2348034567890', whatsapp: '+2348034567890', business_name: 'GreenField Agro Logistics', state: 'Oyo', industry: 'Agriculture & Food', created_at: new Date().toISOString(), is_verified: true },
      { id: 'c4', name: 'Emeka Nwosu', phone: '+2348045678901', whatsapp: '+2348045678901', business_name: 'SolarWave Energy Solutions', state: 'Rivers', industry: 'Solar & Renewable Energy', created_at: new Date().toISOString(), is_verified: true },
      { id: 'c5', name: 'Fatima Bello', phone: '+2348056789012', whatsapp: '+2348056789012', business_name: 'Kano Silk & Textiles', state: 'Kano', industry: 'Wholesale & Retail', created_at: new Date().toISOString(), is_verified: true },
      { id: 'c6', name: 'Chidiebere Okonkwo', phone: '+2348067890123', whatsapp: '+2348067890123', business_name: 'Apex Properties & Realtors', state: 'Anambra', industry: 'Real Estate & Properties', created_at: new Date().toISOString(), is_verified: true },
    ];
    seedList.forEach(c => contactsMap.set(c.phone, c));
  }

  return Array.from(contactsMap.values());
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
 * Triggers browser download of today's VCF file and awards user daily credits
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

  // Check and award daily download reward
  let creditsAwarded = 0;
  const settings = await getContactGainSettings();
  const claimKey = `${DOWNLOAD_CLAIM_KEY_PREFIX}${todayStr}_${userId || 'guest'}`;
  const alreadyClaimed = localStorage.getItem(claimKey) === 'true';

  if (!alreadyClaimed && settings.is_enabled && settings.daily_download_reward > 0) {
    creditsAwarded = settings.daily_download_reward;
    localStorage.setItem(claimKey, 'true');

    if (userId) {
      try {
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
      } catch (err) {
        console.warn('Reward sync note:', err);
      }
    }

    playMoneyTransferSound();
    if (onCreditAwarded) onCreditAwarded(creditsAwarded);
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
// SAVE MY CONTACT CAMPAIGNS & PROOF VERIFICATION ENGINE
// -------------------------------------------------------------

const LOCAL_CAMPAIGNS_KEY = 'ggd_contact_campaigns_list';
const LOCAL_PROOFS_KEY = 'ggd_contact_proofs_list';

/**
 * Get active "Save My Contact" campaigns
 */
export async function getActiveContactCampaigns(): Promise<ContactCampaign[]> {
  try {
    const { data } = await supabase
      .from('contact_campaigns' as any)
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      return data as any;
    }
  } catch {}

  // Fallback to local storage / rich default seed campaigns
  try {
    const local = localStorage.getItem(LOCAL_CAMPAIGNS_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  const defaultCampaigns: ContactCampaign[] = [
    {
      id: 'camp_1',
      user_id: 'admin_official',
      user_email: 'ceo@goodgiftdigital.com',
      title: 'Save Bethel Chukwunyere (GGD CEO) Contact',
      contact_name: 'Bethel Chukwunyere',
      contact_phone: '+2348012345678',
      contact_whatsapp: '+2348012345678',
      business_name: 'Goodgift Digital / GGD Ad Network',
      state: 'Lagos',
      industry: 'Technology & Ad Network',
      reward_per_save: 20,
      total_target: 500,
      completed_saves: 238,
      budget_credits: 10000,
      status: 'active',
      created_at: new Date().toISOString(),
      description: 'Save official contact for instant product updates, partnership opportunities, and affiliate payouts.',
    },
    {
      id: 'camp_2',
      user_id: 'user_solar_1',
      title: 'SolarWave Energy WhatsApp Status & Deals',
      contact_name: 'Engr. Emeka Nwosu',
      contact_phone: '+2348045678901',
      contact_whatsapp: '+2348045678901',
      business_name: 'SolarWave Energy Solutions',
      state: 'Rivers',
      industry: 'Solar Energy',
      reward_per_save: 15,
      total_target: 100,
      completed_saves: 42,
      budget_credits: 1500,
      status: 'active',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      description: 'Save our business line to view daily solar inverter discounts and installer discounts on WhatsApp status.',
    },
    {
      id: 'camp_3',
      user_id: 'user_fashion_1',
      title: 'Luxe Hair & Wigs VIP Wholesale Line',
      contact_name: 'Amaka Obi',
      contact_phone: '+2348023456789',
      contact_whatsapp: '+2348023456789',
      business_name: 'Luxe Hair Studio',
      state: 'Abuja (FCT)',
      industry: 'Fashion & Beauty',
      reward_per_save: 15,
      total_target: 200,
      completed_saves: 115,
      budget_credits: 3000,
      status: 'active',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      description: 'Connect with direct hair importers. Save my contact to receive weekly wholesale catalog updates.',
    },
  ];

  localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(defaultCampaigns));
  return defaultCampaigns;
}

/**
 * Create a new "Save My Contact" campaign
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
    // 1. Deduct credits from user profile
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

    const newCampaign: ContactCampaign = {
      id: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: campaignData.userId,
      user_email: campaignData.userEmail,
      title: campaignData.title,
      contact_name: campaignData.contactName,
      contact_phone: sanitizePhoneNumber(campaignData.contactPhone),
      contact_whatsapp: sanitizePhoneNumber(campaignData.contactWhatsapp || campaignData.contactPhone),
      business_name: campaignData.businessName,
      state: campaignData.state,
      industry: campaignData.industry,
      reward_per_save: campaignData.rewardPerSave,
      total_target: campaignData.totalTarget,
      completed_saves: 0,
      budget_credits: totalBudget,
      status: 'active',
      created_at: new Date().toISOString(),
      description: campaignData.description,
    };

    // Save to Supabase or local storage
    try {
      await supabase.from('contact_campaigns' as any).insert(newCampaign as any);
    } catch {}

    const existing = await getActiveContactCampaigns();
    const updated = [newCampaign, ...existing];
    localStorage.setItem(LOCAL_CAMPAIGNS_KEY, JSON.stringify(updated));

    return { success: true, campaign: newCampaign };
  } catch (err: any) {
    console.error('Error creating contact campaign:', err);
    return { success: false, error: err?.message || 'Failed to create campaign' };
  }
}

/**
 * Submit screenshot proof of having saved a contact
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
    const proof: ContactProofSubmission = {
      id: `proof_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      campaign_id: data.campaignId,
      campaign_title: data.campaignTitle,
      user_id: data.userId,
      user_name: data.userName,
      user_phone: data.userPhone,
      screenshot_url: data.screenshotUrl,
      status: 'pending',
      reward_credits: data.rewardCredits,
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('contact_proofs' as any).insert(proof as any);
    } catch {}

    // Store in local storage
    const existing = getLocalProofs();
    existing.unshift(proof);
    localStorage.setItem(LOCAL_PROOFS_KEY, JSON.stringify(existing));

    return { success: true, proof };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to submit proof' };
  }
}

/**
 * Helper to get local stored proofs
 */
export function getLocalProofs(): ContactProofSubmission[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROOFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

/**
 * Review, approve or reject contact proof appeal (Admin or Campaign Owner)
 */
export async function reviewContactProof(
  proofId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const proofs = getLocalProofs();
    const target = proofs.find(p => p.id === proofId);

    if (!target) {
      return { success: false, error: 'Proof not found' };
    }

    target.status = status;
    target.reviewed_at = new Date().toISOString();
    if (rejectionReason) target.rejection_reason = rejectionReason;

    localStorage.setItem(LOCAL_PROOFS_KEY, JSON.stringify(proofs));

    // If approved, credit the user who saved the contact!
    if (status === 'approved' && target.user_id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('user_id', target.user_id)
          .maybeSingle();

        if (profile) {
          const newCredits = (profile.credits || 0) + target.reward_credits;
          await supabase
            .from('profiles')
            .update({ credits: newCredits } as any)
            .eq('user_id', target.user_id);

          try {
            await supabase.from('credit_transactions').insert({
              user_id: target.user_id,
              amount: target.reward_credits,
              type: 'contact_save_reward',
              description: `🎉 Reward for saving contact: ${target.campaign_title || 'Merchant'} (+${target.reward_credits} Credits)`,
            });
          } catch {}
        }
      } catch (err) {
        console.warn('Proof approval credit credit note:', err);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to review proof' };
  }
}

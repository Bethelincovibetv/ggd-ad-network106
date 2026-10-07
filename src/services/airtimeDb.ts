import { db, isCloudSqlConfigured } from '../db/index.ts';
import { airtimeRedemptions, sabussApiConfigs } from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export interface AirtimeRedemptionRecord {
  id: string;
  userId: string;
  userEmail?: string | null;
  network: string;
  planId: string;
  phoneNumber: string;
  amountNgn: number;
  creditsDeducted: number;
  reference: string;
  apiStatusCode?: string | null;
  status: 'success' | 'pending' | 'failed' | 'reversed';
  apiResponse?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SabussApiConfigRecord {
  id: string;
  apiKey: string;
  apiPin: string;
  isActive: string;
  minAmount: number;
  maxAmount: number;
  environment: string;
  updatedAt: string;
}

// Resilient memory cache + file persistence for redundancy
const memoryRedemptions = new Map<string, AirtimeRedemptionRecord>();
let memorySabussConfig: SabussApiConfigRecord = {
  id: 'sabuss_primary_config',
  apiKey: process.env.SABUSS_API_KEY || 'sab_live_demo_key_778219',
  apiPin: '0000',
  isActive: 'true',
  minAmount: 100,
  maxAmount: 10000,
  environment: 'production',
  updatedAt: new Date().toISOString(),
};

// Local cache backup file path
const DATA_DIR = path.resolve(process.cwd(), '.data');
const BACKUP_FILE = path.join(DATA_DIR, 'airtime_redemptions.json');
const CONFIG_FILE = path.join(DATA_DIR, 'sabuss_config.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

function loadLocalBackups() {
  ensureDataDir();
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const raw = fs.readFileSync(BACKUP_FILE, 'utf8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((r: AirtimeRedemptionRecord) => {
          if (r?.id) memoryRedemptions.set(r.id, r);
        });
      }
    }
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const conf = JSON.parse(raw);
      if (conf?.apiKey) memorySabussConfig = { ...memorySabussConfig, ...conf };
    }
  } catch (e) {
    console.warn('Airtime DB backup load warning:', e);
  }
}

function saveLocalBackups() {
  ensureDataDir();
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(Array.from(memoryRedemptions.values())), 'utf8');
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(memorySabussConfig), 'utf8');
  } catch {}
}

// Initial load
loadLocalBackups();

// ============================================================================
// SABUSS CONFIG
// ============================================================================

export async function getSabussConfig(): Promise<SabussApiConfigRecord> {
  if (isCloudSqlConfigured() && db) {
    try {
      const rows = await db.select().from(sabussApiConfigs).limit(1);
      if (rows && rows.length > 0) {
        const row = rows[0];
        memorySabussConfig = {
          id: row.id,
          apiKey: row.apiKey,
          apiPin: row.apiPin || '0000',
          isActive: row.isActive || 'true',
          minAmount: row.minAmount || 100,
          maxAmount: row.maxAmount || 10000,
          environment: row.environment || 'production',
          updatedAt: row.updatedAt,
        };
      }
    } catch (err) {
      console.warn('Could not read Sabuss config from Cloud SQL:', err);
    }
  }
  return memorySabussConfig;
}

export async function saveSabussConfig(config: Partial<SabussApiConfigRecord>): Promise<SabussApiConfigRecord> {
  memorySabussConfig = {
    ...memorySabussConfig,
    ...config,
    updatedAt: new Date().toISOString(),
  };
  saveLocalBackups();

  if (isCloudSqlConfigured() && db) {
    try {
      await db.insert(sabussApiConfigs)
        .values({
          id: memorySabussConfig.id,
          apiKey: memorySabussConfig.apiKey,
          apiPin: memorySabussConfig.apiPin,
          isActive: memorySabussConfig.isActive,
          minAmount: memorySabussConfig.minAmount,
          maxAmount: memorySabussConfig.maxAmount,
          environment: memorySabussConfig.environment,
          updatedAt: memorySabussConfig.updatedAt,
        })
        .onConflictDoUpdate({
          target: sabussApiConfigs.id,
          set: {
            apiKey: memorySabussConfig.apiKey,
            apiPin: memorySabussConfig.apiPin,
            isActive: memorySabussConfig.isActive,
            minAmount: memorySabussConfig.minAmount,
            maxAmount: memorySabussConfig.maxAmount,
            environment: memorySabussConfig.environment,
            updatedAt: memorySabussConfig.updatedAt,
          },
        });
    } catch (err) {
      console.warn('Could not save Sabuss config to Cloud SQL:', err);
    }
  }
  return memorySabussConfig;
}

// ============================================================================
// AIRTIME REDEMPTIONS
// ============================================================================

export async function recordAirtimeRedemption(record: AirtimeRedemptionRecord): Promise<AirtimeRedemptionRecord> {
  memoryRedemptions.set(record.id, record);
  saveLocalBackups();

  if (isCloudSqlConfigured() && db) {
    try {
      await db.insert(airtimeRedemptions)
        .values({
          id: record.id,
          userId: record.userId,
          userEmail: record.userEmail || null,
          network: record.network,
          planId: record.planId,
          phoneNumber: record.phoneNumber,
          amountNgn: record.amountNgn,
          creditsDeducted: record.creditsDeducted,
          reference: record.reference,
          apiStatusCode: record.apiStatusCode || null,
          status: record.status,
          apiResponse: record.apiResponse || null,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        })
        .onConflictDoUpdate({
          target: airtimeRedemptions.id,
          set: {
            apiStatusCode: record.apiStatusCode || null,
            status: record.status,
            apiResponse: record.apiResponse || null,
            updatedAt: record.updatedAt,
          },
        });
    } catch (err) {
      console.warn('Could not persist airtime redemption to Cloud SQL:', err);
    }
  }

  return record;
}

export async function updateAirtimeRedemption(
  id: string,
  updates: Partial<AirtimeRedemptionRecord>
): Promise<AirtimeRedemptionRecord | null> {
  const existing = memoryRedemptions.get(id);
  if (!existing) return null;

  const updated: AirtimeRedemptionRecord = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  memoryRedemptions.set(id, updated);
  saveLocalBackups();

  if (isCloudSqlConfigured() && db) {
    try {
      await db.update(airtimeRedemptions)
        .set({
          apiStatusCode: updated.apiStatusCode || null,
          status: updated.status,
          apiResponse: updated.apiResponse || null,
          updatedAt: updated.updatedAt,
        })
        .eq(airtimeRedemptions.id, id);
    } catch (err) {
      console.warn('Could not update airtime redemption in Cloud SQL:', err);
    }
  }

  return updated;
}

export async function getUserAirtimeRedemptions(userId: string): Promise<AirtimeRedemptionRecord[]> {
  if (isCloudSqlConfigured() && db) {
    try {
      const rows = await db.select()
        .from(airtimeRedemptions)
        .where(eq(airtimeRedemptions.userId, userId))
        .orderBy(desc(airtimeRedemptions.createdAt));

      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          userId: r.userId,
          userEmail: r.userEmail,
          network: r.network,
          planId: r.planId,
          phoneNumber: r.phoneNumber,
          amountNgn: r.amountNgn,
          creditsDeducted: r.creditsDeducted,
          reference: r.reference,
          apiStatusCode: r.apiStatusCode,
          status: r.status as any,
          apiResponse: r.apiResponse,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
      }
    } catch (err) {
      console.warn('Could not fetch user redemptions from Cloud SQL:', err);
    }
  }

  return Array.from(memoryRedemptions.values())
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAllAirtimeRedemptions(): Promise<AirtimeRedemptionRecord[]> {
  if (isCloudSqlConfigured() && db) {
    try {
      const rows = await db.select()
        .from(airtimeRedemptions)
        .orderBy(desc(airtimeRedemptions.createdAt));

      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          userId: r.userId,
          userEmail: r.userEmail,
          network: r.network,
          planId: r.planId,
          phoneNumber: r.phoneNumber,
          amountNgn: r.amountNgn,
          creditsDeducted: r.creditsDeducted,
          reference: r.reference,
          apiStatusCode: r.apiStatusCode,
          status: r.status as any,
          apiResponse: r.apiResponse,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
      }
    } catch (err) {
      console.warn('Could not fetch all redemptions from Cloud SQL:', err);
    }
  }

  return Array.from(memoryRedemptions.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

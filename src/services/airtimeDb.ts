import { db, isCloudSqlConfigured, createPool } from '../db/index.ts';
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

// User-provided official Sabuss API Key
export const DEFAULT_SABUSS_API_KEY = 'aZE7V28NY1BD63UMFRLe0QdbA9GfKSI4HOTX5WPcJC1251';

// Resilient memory cache + file persistence for redundancy
const memoryRedemptions = new Map<string, AirtimeRedemptionRecord>();
let memorySabussConfig: SabussApiConfigRecord = {
  id: 'sabuss_primary_config',
  apiKey: process.env.SABUSS_API_KEY || DEFAULT_SABUSS_API_KEY,
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
const ENV_FILE = path.resolve(process.cwd(), '.env');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

function persistToEnv(apiKey: string) {
  try {
    process.env.SABUSS_API_KEY = apiKey;
    if (fs.existsSync(ENV_FILE)) {
      let content = fs.readFileSync(ENV_FILE, 'utf8');
      if (content.includes('SABUSS_API_KEY=')) {
        content = content.replace(/SABUSS_API_KEY=.*/g, `SABUSS_API_KEY=${apiKey}`);
      } else {
        content = content.trimEnd() + `\nSABUSS_API_KEY=${apiKey}\n`;
      }
      fs.writeFileSync(ENV_FILE, content, 'utf8');
    } else {
      fs.writeFileSync(ENV_FILE, `SABUSS_API_KEY=${apiKey}\n`, 'utf8');
    }
  } catch (e) {
    console.warn('Could not write SABUSS_API_KEY to .env:', e);
  }
}

let tablesChecked = false;
export async function ensureCloudSqlAirtimeTables(): Promise<boolean> {
  if (tablesChecked) return true;
  if (!isCloudSqlConfigured()) return false;
  try {
    const pool = createPool();
    if (!pool) return false;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sabuss_api_configs (
        id TEXT PRIMARY KEY,
        api_key TEXT NOT NULL,
        api_pin TEXT NOT NULL DEFAULT '0000',
        is_active TEXT NOT NULL DEFAULT 'true',
        min_amount INTEGER NOT NULL DEFAULT 100,
        max_amount INTEGER NOT NULL DEFAULT 10000,
        environment TEXT NOT NULL DEFAULT 'production',
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS airtime_redemptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_email TEXT,
        network TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        amount_ngn INTEGER NOT NULL,
        credits_deducted INTEGER NOT NULL,
        reference TEXT NOT NULL UNIQUE,
        api_status_code TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        api_response TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    tablesChecked = true;
    return true;
  } catch (e) {
    console.warn('Notice: Cloud SQL airtime table init check:', e);
    return false;
  }
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
      if (conf?.apiKey && conf.apiKey.trim().length > 0) {
        memorySabussConfig = { ...memorySabussConfig, ...conf };
      }
    }
    // If no config file yet or still default placeholder, ensure our real API key is saved
    if (!memorySabussConfig.apiKey || memorySabussConfig.apiKey === 'sab_live_demo_key_778219') {
      memorySabussConfig.apiKey = process.env.SABUSS_API_KEY || DEFAULT_SABUSS_API_KEY;
    }
  } catch (e) {
    console.warn('Airtime DB backup load warning:', e);
  }
}

function saveLocalBackups() {
  ensureDataDir();
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(Array.from(memoryRedemptions.values()), null, 2), 'utf8');
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(memorySabussConfig, null, 2), 'utf8');
  } catch {}
}

// Initial load & backup write
loadLocalBackups();
saveLocalBackups();

// ============================================================================
// SABUSS CONFIG
// ============================================================================

export async function getSabussConfig(): Promise<SabussApiConfigRecord> {
  if (isCloudSqlConfigured() && db) {
    try {
      await ensureCloudSqlAirtimeTables();
      const rows = await db.select().from(sabussApiConfigs).limit(1);
      if (rows && rows.length > 0) {
        const row = rows[0];
        memorySabussConfig = {
          id: row.id,
          apiKey: row.apiKey || memorySabussConfig.apiKey || DEFAULT_SABUSS_API_KEY,
          apiPin: row.apiPin || '0000',
          isActive: row.isActive || 'true',
          minAmount: row.minAmount || 100,
          maxAmount: row.maxAmount || 10000,
          environment: row.environment || 'production',
          updatedAt: row.updatedAt,
        };
        saveLocalBackups();
      }
    } catch (err) {
      console.warn('Notice: Reading Sabuss config from Cloud SQL:', err);
    }
  }

  // Ensure key is never undefined or empty
  if (!memorySabussConfig.apiKey || memorySabussConfig.apiKey.trim().length < 5) {
    memorySabussConfig.apiKey = process.env.SABUSS_API_KEY || DEFAULT_SABUSS_API_KEY;
  }

  return memorySabussConfig;
}

export async function saveSabussConfig(config: Partial<SabussApiConfigRecord>): Promise<SabussApiConfigRecord> {
  const newKey = config.apiKey?.trim() || memorySabussConfig.apiKey || DEFAULT_SABUSS_API_KEY;
  
  memorySabussConfig = {
    ...memorySabussConfig,
    ...config,
    apiKey: newKey,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save local JSON backup
  saveLocalBackups();

  // 2. Persist to .env and runtime process.env
  persistToEnv(newKey);

  // 3. Persist to Cloud SQL if connected
  if (isCloudSqlConfigured() && db) {
    try {
      await ensureCloudSqlAirtimeTables();
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
      console.warn('Notice: Persisting Sabuss config to Cloud SQL:', err);
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
      await ensureCloudSqlAirtimeTables();
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
      await ensureCloudSqlAirtimeTables();
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
      await ensureCloudSqlAirtimeTables();
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
      await ensureCloudSqlAirtimeTables();
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

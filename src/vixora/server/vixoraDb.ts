import fs from 'fs';
import os from 'os';
import path from 'path';
import type { VideoJob, ServerProject, ServerAsset } from '../services/serverVideoEngine';

// Vixora operates strictly outside Cloud SQL using an in-memory cache
// backed by a lightweight local runtime JSON snapshot.
const VIXORA_STATE_FILE = path.join(os.tmpdir(), 'vixora_runtime_state.json');

const memoryJobs = new Map<string, VideoJob>();
const memoryProjects = new Map<string, ServerProject>();
const memoryAssets = new Map<string, ServerAsset>();
const memoryApiKeys = new Map<string, any>([
  [
    'vx_live_vixora_prod_89f3a928b7e411d9c02',
    {
      id: 'key_primary_default',
      name: 'Main Production API Key',
      apiKey: 'vx_live_vixora_prod_89f3a928b7e411d9c02',
      prefix: 'vx_live_vixora_...',
      createdAt: '2026-08-25T00:00:00.000Z',
      lastUsedAt: new Date().toISOString(),
      status: 'active',
      rateLimitPerMin: 120,
      permissions: ['videos:create', 'scripts:generate', 'audio:tts', 'assets:search', 'remote:embed'],
      usageCount: 42,
    }
  ]
]);
const memoryChannelPrefs = new Map<string, any>();

let hydratedFromDisk = false;

function hydrateLocalStoreOnce(): void {
  if (hydratedFromDisk) return;
  hydratedFromDisk = true;
  try {
    if (!fs.existsSync(VIXORA_STATE_FILE)) return;
    const raw = fs.readFileSync(VIXORA_STATE_FILE, 'utf8');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.jobs)) {
      for (const job of parsed.jobs) {
        if (job?.job_id && !memoryJobs.has(job.job_id)) {
          memoryJobs.set(job.job_id, job);
        }
      }
    }
    if (Array.isArray(parsed.projects)) {
      for (const proj of parsed.projects) {
        if (proj?.id && !memoryProjects.has(proj.id)) {
          memoryProjects.set(proj.id, proj);
        }
      }
    }
    if (Array.isArray(parsed.apiKeys)) {
      for (const rec of parsed.apiKeys) {
        if (rec?.apiKey && !memoryApiKeys.has(rec.apiKey)) {
          memoryApiKeys.set(rec.apiKey, rec);
        }
      }
    }
    if (Array.isArray(parsed.channelPrefs)) {
      for (const pref of parsed.channelPrefs) {
        if (pref?.userId && !memoryChannelPrefs.has(pref.userId)) {
          memoryChannelPrefs.set(pref.userId, pref);
        }
      }
    }
  } catch {
    // Best-effort local disk hydration
  }
}

function flushLocalStore(): void {
  try {
    const snapshot = {
      jobs: Array.from(memoryJobs.values()),
      projects: Array.from(memoryProjects.values()),
      apiKeys: Array.from(memoryApiKeys.values()),
      channelPrefs: Array.from(memoryChannelPrefs.values()),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(VIXORA_STATE_FILE, JSON.stringify(snapshot), 'utf8');
  } catch {
    // Non-fatal in ephemeral containers
  }
}

// ============================================================================
// 1. VIDEO RENDER JOBS
// ============================================================================

export async function persistVideoJob(job: VideoJob): Promise<VideoJob> {
  hydrateLocalStoreOnce();
  memoryJobs.set(job.job_id, job);
  flushLocalStore();
  return job;
}

export async function fetchVideoJob(jobId: string): Promise<VideoJob | undefined> {
  hydrateLocalStoreOnce();
  return memoryJobs.get(jobId);
}

export async function fetchAllVideoJobs(): Promise<VideoJob[]> {
  hydrateLocalStoreOnce();
  return Array.from(memoryJobs.values());
}

// ============================================================================
// 2. PROJECTS
// ============================================================================

export async function persistProject(project: ServerProject): Promise<ServerProject> {
  hydrateLocalStoreOnce();
  memoryProjects.set(project.id, project);
  flushLocalStore();
  return project;
}

export async function fetchAllProjects(): Promise<ServerProject[]> {
  hydrateLocalStoreOnce();
  return Array.from(memoryProjects.values());
}

// ============================================================================
// 3. API KEYS MANAGEMENT (ADMIN-CONTROLLED)
// ============================================================================

export async function persistApiKey(record: any): Promise<any> {
  hydrateLocalStoreOnce();
  memoryApiKeys.set(record.apiKey, record);
  flushLocalStore();
  return record;
}

export async function fetchAllApiKeys(): Promise<any[]> {
  hydrateLocalStoreOnce();
  return Array.from(memoryApiKeys.values());
}

export async function revokeApiKey(apiKey: string): Promise<boolean> {
  hydrateLocalStoreOnce();
  const existing = memoryApiKeys.get(apiKey);
  if (existing) {
    existing.status = 'revoked';
    existing.lastUsedAt = new Date().toISOString();
    await persistApiKey(existing);
    return true;
  }
  return false;
}

// ============================================================================
// 4. CHANNEL PREFERENCES
// ============================================================================

export async function persistChannelPreferences(userId: string, prefs: any): Promise<any> {
  hydrateLocalStoreOnce();
  const payload = {
    ...prefs,
    userId,
    updatedAt: new Date().toISOString(),
  };
  memoryChannelPrefs.set(userId, payload);
  flushLocalStore();
  return payload;
}

export async function fetchChannelPreferences(userId: string): Promise<any> {
  hydrateLocalStoreOnce();
  return memoryChannelPrefs.get(userId) || null;
}

export function getRegisteredAssetsCount(): number {
  return memoryAssets.size;
}

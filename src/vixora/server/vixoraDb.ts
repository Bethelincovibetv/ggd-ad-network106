import { db, isCloudSqlConfigured } from '../../db/index.ts';
import { vixoraVideoJobs, vixoraProjects, vixoraApiKeys, vixoraChannelPreferences } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';
import type { VideoJob, ServerProject, ServerAsset } from '../services/serverVideoEngine';

// Resilient memory cache with database synchronization
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

// ============================================================================
// 1. VIDEO RENDER JOBS
// ============================================================================

export async function persistVideoJob(job: VideoJob): Promise<VideoJob> {
  memoryJobs.set(job.job_id, job);

  if (isCloudSqlConfigured() && db) {
    try {
      await db.insert(vixoraVideoJobs)
        .values({
          id: job.job_id,
          projectId: job.project_id || null,
          status: job.status,
          progress: job.progress,
          currentStep: job.current_step,
          topic: job.topic || null,
          script: job.script || null,
          aspectRatio: job.aspect_ratio || 'vertical',
          duration: job.duration || '30s',
          voice: job.voice || 'Kore',
          videoUrl: job.video_url || null,
          thumbnailUrl: job.thumbnail_url || null,
          error: job.error || null,
          createdAt: job.created_at,
          updatedAt: job.updated_at,
        })
        .onConflictDoUpdate({
          target: vixoraVideoJobs.id,
          set: {
            status: job.status,
            progress: job.progress,
            currentStep: job.current_step,
            videoUrl: job.video_url || null,
            thumbnailUrl: job.thumbnail_url || null,
            error: job.error || null,
            updatedAt: job.updated_at,
          }
        });
    } catch (err) {
      console.warn('Could not persist video job to Cloud SQL:', err);
    }
  }

  return job;
}

export async function fetchVideoJob(jobId: string): Promise<VideoJob | undefined> {
  if (memoryJobs.has(jobId)) {
    return memoryJobs.get(jobId);
  }

  if (isCloudSqlConfigured() && db) {
    try {
      const records = await db.select().from(vixoraVideoJobs).where(eq(vixoraVideoJobs.id, jobId));
      if (records.length > 0) {
        const r = records[0];
        const job: VideoJob = {
          job_id: r.id,
          project_id: r.projectId || undefined,
          status: (r.status as any) || 'queued',
          progress: r.progress,
          current_step: r.currentStep || 'Initializing',
          topic: r.topic || undefined,
          script: r.script || undefined,
          aspect_ratio: (r.aspectRatio as any) || 'vertical',
          duration: r.duration || '30s',
          voice: r.voice || 'Kore',
          resolution: '1080p',
          format: 'mp4',
          video_url: r.videoUrl || undefined,
          thumbnail_url: r.thumbnailUrl || undefined,
          error: r.error || undefined,
          created_at: r.createdAt,
          updated_at: r.updatedAt,
          logs: [`[${r.createdAt}] Job loaded from database`],
        };
        memoryJobs.set(job.job_id, job);
        return job;
      }
    } catch (err) {
      console.warn('Could not query video job from Cloud SQL:', err);
    }
  }

  return undefined;
}

export async function fetchAllVideoJobs(): Promise<VideoJob[]> {
  if (isCloudSqlConfigured() && db) {
    try {
      const records = await db.select().from(vixoraVideoJobs);
      if (records.length > 0) {
        records.forEach(r => {
          if (!memoryJobs.has(r.id)) {
            memoryJobs.set(r.id, {
              job_id: r.id,
              project_id: r.projectId || undefined,
              status: (r.status as any) || 'queued',
              progress: r.progress,
              current_step: r.currentStep || '',
              topic: r.topic || undefined,
              script: r.script || undefined,
              aspect_ratio: (r.aspectRatio as any) || 'vertical',
              duration: r.duration || '30s',
              voice: r.voice || 'Kore',
              resolution: '1080p',
              format: 'mp4',
              video_url: r.videoUrl || undefined,
              thumbnail_url: r.thumbnailUrl || undefined,
              error: r.error || undefined,
              created_at: r.createdAt,
              updated_at: r.updatedAt,
              logs: [],
            });
          }
        });
      }
    } catch (err) {
      console.warn('Could not query all video jobs from Cloud SQL:', err);
    }
  }

  return Array.from(memoryJobs.values());
}

// ============================================================================
// 2. PROJECTS
// ============================================================================

export async function persistProject(project: ServerProject): Promise<ServerProject> {
  memoryProjects.set(project.id, project);

  if (isCloudSqlConfigured() && db) {
    try {
      await db.insert(vixoraProjects)
        .values({
          id: project.id,
          title: project.title,
          topic: project.topic || null,
          status: project.status || 'draft',
          aspectRatio: project.aspect_ratio || 'vertical',
          targetDuration: project.target_duration || '30s',
          scriptText: project.script_text || null,
          voiceoverUrl: project.voiceover_url || null,
          videoUrl: project.video_url || null,
          thumbnailUrl: project.thumbnail_url || null,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
        })
        .onConflictDoUpdate({
          target: vixoraProjects.id,
          set: {
            title: project.title,
            status: project.status || 'draft',
            scriptText: project.script_text || null,
            voiceoverUrl: project.voiceover_url || null,
            videoUrl: project.video_url || null,
            thumbnailUrl: project.thumbnail_url || null,
            updatedAt: project.updated_at,
          }
        });
    } catch (err) {
      console.warn('Could not persist project to Cloud SQL:', err);
    }
  }

  return project;
}

export async function fetchAllProjects(): Promise<ServerProject[]> {
  if (isCloudSqlConfigured() && db) {
    try {
      const records = await db.select().from(vixoraProjects);
      if (records.length > 0) {
        records.forEach(r => {
          if (!memoryProjects.has(r.id)) {
            memoryProjects.set(r.id, {
              id: r.id,
              title: r.title,
              topic: r.topic || undefined,
              status: r.status,
              aspect_ratio: r.aspectRatio || 'vertical',
              target_duration: r.targetDuration || '30s',
              script_text: r.scriptText || undefined,
              voiceover_url: r.voiceoverUrl || undefined,
              video_url: r.videoUrl || undefined,
              thumbnail_url: r.thumbnailUrl || undefined,
              created_at: r.createdAt,
              updated_at: r.updatedAt,
            });
          }
        });
      }
    } catch (err) {
      console.warn('Could not query all projects from Cloud SQL:', err);
    }
  }

  return Array.from(memoryProjects.values());
}

// ============================================================================
// 3. API KEYS MANAGEMENT (ADMIN-CONTROLLED)
// ============================================================================

export async function persistApiKey(record: any): Promise<any> {
  memoryApiKeys.set(record.apiKey, record);

  if (isCloudSqlConfigured() && db) {
    try {
      await db.insert(vixoraApiKeys)
        .values({
          id: record.id,
          name: record.name,
          apiKey: record.apiKey,
          prefix: record.prefix,
          status: record.status || 'active',
          rateLimitPerMin: record.rateLimitPerMin || 120,
          usageCount: record.usageCount || 0,
          createdAt: record.createdAt,
          lastUsedAt: record.lastUsedAt || null,
        })
        .onConflictDoUpdate({
          target: vixoraApiKeys.apiKey,
          set: {
            status: record.status,
            usageCount: record.usageCount,
            lastUsedAt: record.lastUsedAt,
          }
        });
    } catch (err) {
      console.warn('Could not persist API key to Cloud SQL:', err);
    }
  }

  return record;
}

export async function fetchAllApiKeys(): Promise<any[]> {
  if (isCloudSqlConfigured() && db) {
    try {
      const records = await db.select().from(vixoraApiKeys);
      if (records.length > 0) {
        records.forEach(r => {
          if (!memoryApiKeys.has(r.apiKey)) {
            memoryApiKeys.set(r.apiKey, {
              id: r.id,
              name: r.name,
              apiKey: r.apiKey,
              prefix: r.prefix,
              status: r.status,
              rateLimitPerMin: r.rateLimitPerMin,
              usageCount: r.usageCount,
              createdAt: r.createdAt,
              lastUsedAt: r.lastUsedAt,
              permissions: ['videos:create', 'scripts:generate', 'audio:tts', 'assets:search'],
            });
          }
        });
      }
    } catch (err) {
      console.warn('Could not query API keys from Cloud SQL:', err);
    }
  }

  return Array.from(memoryApiKeys.values());
}

export async function revokeApiKey(apiKey: string): Promise<boolean> {
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
  const payload = {
    ...prefs,
    userId,
    updatedAt: new Date().toISOString()
  };
  memoryChannelPrefs.set(userId, payload);

  if (isCloudSqlConfigured() && db) {
    try {
      await db.insert(vixoraChannelPreferences)
        .values({
          userId,
          channels: JSON.stringify(prefs.channels || []),
          niche: prefs.niche || 'finance',
          preferredVoice: prefs.preferredVoice || 'Kore',
          preferredRatio: prefs.preferredRatio || 'vertical',
          subtitleStyle: prefs.subtitleStyle || 'mrbeast',
          defaultCta: prefs.defaultCta || null,
          channelHandles: JSON.stringify(prefs.channelHandles || {}),
          updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
          target: vixoraChannelPreferences.userId,
          set: {
            channels: JSON.stringify(prefs.channels || []),
            niche: prefs.niche || 'finance',
            preferredVoice: prefs.preferredVoice || 'Kore',
            preferredRatio: prefs.preferredRatio || 'vertical',
            subtitleStyle: prefs.subtitleStyle || 'mrbeast',
            defaultCta: prefs.defaultCta || null,
            channelHandles: JSON.stringify(prefs.channelHandles || {}),
            updatedAt: payload.updatedAt,
          }
        });
    } catch (err) {
      console.warn('Could not persist channel preferences to Cloud SQL:', err);
    }
  }

  return payload;
}

export async function fetchChannelPreferences(userId: string): Promise<any> {
  if (memoryChannelPrefs.has(userId)) {
    return memoryChannelPrefs.get(userId);
  }

  if (isCloudSqlConfigured() && db) {
    try {
      const records = await db.select().from(vixoraChannelPreferences).where(eq(vixoraChannelPreferences.userId, userId));
      if (records.length > 0) {
        const r = records[0];
        let channels = [];
        let channelHandles = {};
        try { channels = JSON.parse(r.channels); } catch {}
        try { channelHandles = JSON.parse(r.channelHandles || '{}'); } catch {}

        const parsed = {
          userId: r.userId,
          channels,
          niche: r.niche,
          preferredVoice: r.preferredVoice,
          preferredRatio: r.preferredRatio,
          subtitleStyle: r.subtitleStyle,
          defaultCta: r.defaultCta,
          channelHandles,
          updatedAt: r.updatedAt,
        };
        memoryChannelPrefs.set(userId, parsed);
        return parsed;
      }
    } catch (err) {
      console.warn('Could not query channel preferences from Cloud SQL:', err);
    }
  }

  return null;
}

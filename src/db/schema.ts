import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const vixoraVideoJobs = pgTable('vixora_video_jobs', {
  id: text('id').primaryKey(),
  projectId: text('project_id'),
  status: text('status').notNull().default('queued'),
  progress: integer('progress').notNull().default(0),
  currentStep: text('current_step'),
  topic: text('topic'),
  script: text('script'),
  aspectRatio: text('aspect_ratio').default('vertical'),
  duration: text('duration').default('30s'),
  voice: text('voice').default('Kore'),
  videoUrl: text('video_url'),
  thumbnailUrl: text('thumbnail_url'),
  error: text('error'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const vixoraProjects = pgTable('vixora_projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  topic: text('topic'),
  status: text('status').notNull().default('draft'),
  aspectRatio: text('aspect_ratio').default('vertical'),
  targetDuration: text('target_duration').default('30s'),
  scriptText: text('script_text'),
  voiceoverUrl: text('voiceover_url'),
  videoUrl: text('video_url'),
  thumbnailUrl: text('thumbnail_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const vixoraApiKeys = pgTable('vixora_api_keys', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  apiKey: text('api_key').notNull().unique(),
  prefix: text('prefix').notNull(),
  status: text('status').notNull().default('active'),
  rateLimitPerMin: integer('rate_limit_per_min').notNull().default(120),
  usageCount: integer('usage_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
  lastUsedAt: text('last_used_at'),
});

export const vixoraChannelPreferences = pgTable('vixora_channel_preferences', {
  userId: text('user_id').primaryKey(),
  channels: text('channels').notNull(),
  niche: text('niche').notNull().default('finance'),
  preferredVoice: text('preferred_voice').notNull().default('Kore'),
  preferredRatio: text('preferred_ratio').notNull().default('vertical'),
  subtitleStyle: text('subtitle_style').notNull().default('mrbeast'),
  defaultCta: text('default_cta'),
  channelHandles: text('channel_handles'),
  updatedAt: text('updated_at').notNull(),
});

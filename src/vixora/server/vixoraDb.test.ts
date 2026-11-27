import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  persistVideoJob,
  fetchVideoJob,
  fetchAllVideoJobs,
  persistProject,
  fetchAllProjects,
  persistApiKey,
  fetchAllApiKeys,
  revokeApiKey,
  persistChannelPreferences,
  fetchChannelPreferences,
} from './vixoraDb';

test('vixoraDb persists and reads jobs, projects, API keys, and preferences without Cloud SQL', async () => {
  const uniqueId = `test_${Date.now()}`;

  await persistVideoJob({
    job_id: `job_${uniqueId}`,
    status: 'completed',
    progress: 100,
    current_step: 'Done',
    topic: 'GGD Promo',
    aspect_ratio: 'vertical',
    duration: '30s',
    voice: 'Kore',
    resolution: '1080p',
    format: 'mp4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    logs: [],
  });

  const job = await fetchVideoJob(`job_${uniqueId}`);
  assert.equal(job?.job_id, `job_${uniqueId}`);
  assert.equal(job?.topic, 'GGD Promo');
  const allJobs = await fetchAllVideoJobs();
  assert.ok(allJobs.some((j) => j.job_id === `job_${uniqueId}`));

  await persistProject({
    id: `proj_${uniqueId}`,
    title: 'Launch Campaign',
    status: 'ready',
    aspect_ratio: 'vertical',
    target_duration: '30s',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const projects = await fetchAllProjects();
  assert.ok(projects.some((p) => p.id === `proj_${uniqueId}`));

  const apiKey = `vx_test_${uniqueId}`;
  await persistApiKey({
    id: `key_${uniqueId}`,
    name: 'Test Key',
    apiKey,
    prefix: 'vx_test_...',
    status: 'active',
    rateLimitPerMin: 60,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  });
  const keysBefore = await fetchAllApiKeys();
  assert.ok(keysBefore.some((k) => k.apiKey === apiKey && k.status === 'active'));

  const revoked = await revokeApiKey(apiKey);
  assert.equal(revoked, true);
  const keysAfter = await fetchAllApiKeys();
  assert.equal(keysAfter.find((k) => k.apiKey === apiKey)?.status, 'revoked');

  await persistChannelPreferences(`user_${uniqueId}`, {
    channels: ['whatsapp', 'tiktok'],
    niche: 'ecommerce',
  });
  const prefs = await fetchChannelPreferences(`user_${uniqueId}`);
  assert.deepEqual(prefs?.channels, ['whatsapp', 'tiktok']);
  assert.equal(prefs?.niche, 'ecommerce');
});

test('vixoraDb and Drizzle schema contain zero Cloud SQL Vixora dependencies', () => {
  const vixoraDbSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/vixora/server/vixoraDb.ts'),
    'utf8'
  );
  assert.equal(vixoraDbSource.includes('isCloudSqlConfigured'), false);
  assert.equal(vixoraDbSource.includes('drizzle-orm'), false);
  assert.equal(vixoraDbSource.includes('../../db/'), false);

  const schemaSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/db/schema.ts'),
    'utf8'
  );
  assert.equal(schemaSource.includes('vixora_video_jobs'), false);
  assert.equal(schemaSource.includes('vixora_projects'), false);
  assert.equal(schemaSource.includes('vixora_api_keys'), false);
  assert.equal(schemaSource.includes('vixora_channel_preferences'), false);
});

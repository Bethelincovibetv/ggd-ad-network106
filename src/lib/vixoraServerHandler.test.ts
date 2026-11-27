import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MISSING_GEMINI_API_KEY_MESSAGE,
  buildCandidateModels,
  handleVixoraApiRequest,
  inferVixoraAction,
  isValidGeminiKey,
  normalizeVixoraModel,
  resolveCandidateGeminiKeys,
  resolvePrimaryGeminiKey,
} from './vixoraServerHandler.ts';

describe('vixoraServerHandler', () => {
  it('validates Gemini API key format and rejects placeholders or leaked samples', () => {
    assert.equal(isValidGeminiKey(undefined), false);
    assert.equal(isValidGeminiKey(''), false);
    assert.equal(isValidGeminiKey('your_gemini_api_key_here'), false);
    assert.equal(isValidGeminiKey('AIzaSy...placeholder'), false);
    assert.equal(isValidGeminiKey('AIzaSyAd6JjVFP5LYmtiSUXLH-HZGIPlHcseohA'), false);
    assert.equal(isValidGeminiKey('AIzaSyValidSyntheticTestKey1234567890'), true);
  });

  it('prioritizes GEMINI_API_KEY over fallback env keys and deduplicates', () => {
    const keys = resolveCandidateGeminiKeys(
      {
        GEMINI_API_KEY: 'AIzaSyPrimaryEnvKey1234567890123456',
        API_KEY: 'AIzaSySecondaryEnvKey12345678901234',
        VITE_GEMINI_API_KEY: 'AIzaSyPrimaryEnvKey1234567890123456',
      },
      ['AIzaSyCustomFallbackKey123456789012']
    );
    assert.deepEqual(keys, [
      'AIzaSyPrimaryEnvKey1234567890123456',
      'AIzaSySecondaryEnvKey12345678901234',
      'AIzaSyCustomFallbackKey123456789012',
    ]);
    assert.equal(
      resolvePrimaryGeminiKey({ GEMINI_API_KEY: 'AIzaSyPrimaryEnvKey1234567890123456' }),
      'AIzaSyPrimaryEnvKey1234567890123456'
    );
  });

  it('normalizes deprecated models to valid Gemini models', () => {
    assert.equal(normalizeVixoraModel('gemini-1.5-flash'), 'gemini-4-hydrogen');
    assert.equal(normalizeVixoraModel('gemini-2.0-flash'), 'gemini-4-hydrogen');
    assert.equal(normalizeVixoraModel(''), 'gemini-4-hydrogen');
    assert.equal(normalizeVixoraModel('gemini-2.5-flash'), 'gemini-2.5-flash');
    assert.equal(normalizeVixoraModel(undefined, 'tts'), 'gemini-3.8-flash-lite-tts');
    assert.deepEqual(buildCandidateModels('gemini-2.5-flash'), [
      'gemini-4-hydrogen',
      'gemini-2.5-flash',
    ]);
  });

  it('infers action cleanly from body.action or endpoint path', () => {
    assert.equal(inferVixoraAction('/api/ai/vixora-agent', {}), 'agent');
    assert.equal(inferVixoraAction('/api/vixora/ai/assistant', {}), 'assistant');
    assert.equal(inferVixoraAction('/api/vixora/ai/chat', {}), 'assistant');
    assert.equal(inferVixoraAction('/api/audio/tts', {}), 'tts');
    assert.equal(inferVixoraAction('/api/vixora', { action: 'agent' }), 'agent');
    assert.equal(
      inferVixoraAction('/api/vixora', { functionDeclarations: [{ name: 'test' }] }),
      'agent'
    );
  });

  it('returns clear 503 setup error when GEMINI_API_KEY is missing', async () => {
    const res = await handleVixoraApiRequest({
      method: 'POST',
      url: '/api/vixora',
      body: { action: 'assistant', prompt: 'Hello Vixora' },
      env: {},
    });

    assert.equal(res.status, 503);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.missingKey, true);
    assert.equal(res.body.code, 'MISSING_GEMINI_API_KEY');
    assert.equal(res.body.error, MISSING_GEMINI_API_KEY_MESSAGE);
  });

  it('returns non-secret health status on GET /api/vixora without exposing keys', async () => {
    const missingHealth = await handleVixoraApiRequest({
      method: 'GET',
      url: '/api/vixora',
      env: {},
    });
    assert.equal(missingHealth.status, 200);
    assert.equal(missingHealth.body.configured, false);
    assert.equal(missingHealth.body.missingKey, true);
    assert.equal(missingHealth.body.cloudSqlUsed, false);

    const secret = 'AIzaSySecretKeyNeverLeak1234567890';
    const configuredHealth = await handleVixoraApiRequest({
      method: 'GET',
      url: '/api/vixora',
      env: { GEMINI_API_KEY: secret },
    });
    assert.equal(configuredHealth.status, 200);
    assert.equal(configuredHealth.body.configured, true);
    assert.equal(configuredHealth.body.missingKey, false);
    assert.equal(JSON.stringify(configuredHealth.body).includes(secret), false);
  });

  it('returns 400 when contents are omitted or empty on POST generate with a key configured', async () => {
    const resOmitted = await handleVixoraApiRequest({
      method: 'POST',
      url: '/api/vixora',
      body: { action: 'generate' },
      env: { GEMINI_API_KEY: 'AIzaSyTestConfiguredKey1234567890' },
    });
    assert.equal(resOmitted.status, 400);
    assert.equal(resOmitted.body.ok, false);

    const resEmptyArray = await handleVixoraApiRequest({
      method: 'POST',
      url: '/api/vixora',
      body: { action: 'generate', contents: [] },
      env: { GEMINI_API_KEY: 'AIzaSyTestConfiguredKey1234567890' },
    });
    assert.equal(resEmptyArray.status, 400);
    assert.equal(resEmptyArray.body.ok, false);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_VIXORA_MODEL,
  MISSING_GEMINI_API_KEY_MESSAGE,
  VIXORA_CHAT_MODELS,
  buildCandidateModels,
  formatLegacyDirectResponse,
  handleVixoraApiRequest,
  inferVixoraAction,
  isValidGeminiKey,
  normalizeVixoraModel,
  prepareModelGeneratePayload,
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

  it('defaults to gemini-3.8-flash, preserves requested free-tier models first, and exposes all 5 models', () => {
    assert.equal(DEFAULT_VIXORA_MODEL, 'gemini-3.8-flash');
    assert.deepEqual(
      VIXORA_CHAT_MODELS.map((m) => m.id),
      [
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemma-4-31b-it',
      ]
    );
    assert.equal(normalizeVixoraModel('gemini-1.5-flash'), 'gemini-3.8-flash');
    assert.equal(normalizeVixoraModel('gemini-2.0-flash'), 'gemini-3.8-flash');
    assert.equal(normalizeVixoraModel('gemini-4-hydrogen'), 'gemini-3.8-flash');
    assert.equal(normalizeVixoraModel(''), 'gemini-3.8-flash');
    assert.equal(normalizeVixoraModel('gemini-3.6-flash'), 'gemini-3.6-flash');
    assert.equal(normalizeVixoraModel('gemma-4-31b-it'), 'gemma-4-31b-it');
    assert.equal(normalizeVixoraModel(undefined, 'tts'), 'gemini-3.8-flash-lite-tts');
    assert.deepEqual(buildCandidateModels('gemini-3.6-flash'), [
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
    ]);
    assert.equal(buildCandidateModels('gemma-4-31b-it')[0], 'gemma-4-31b-it');
  });

  it('adapts gemma-4-31b-it payloads cleanly without invalid tools or systemInstruction config fields', () => {
    const gemmaPayload = prepareModelGeneratePayload({
      model: 'gemma-4-31b-it',
      contents: [{ role: 'user', parts: [{ text: 'Write an ad headline' }] }],
      systemInstruction: 'You are Vixora AI.',
      temperature: 0.4,
      responseMimeType: 'application/json',
      functionDeclarations: [{ name: 'testTool' }],
    });

    assert.equal(gemmaPayload.config?.tools, undefined);
    assert.equal(gemmaPayload.config?.systemInstruction, undefined);
    assert.equal(gemmaPayload.config?.responseMimeType, undefined);
    assert.equal(gemmaPayload.config?.temperature, 0.4);
    assert.equal(Array.isArray(gemmaPayload.contents), true);
    assert.equal(gemmaPayload.contents[0].parts[0].text.includes('You are Vixora AI.'), true);

    const geminiPayload = prepareModelGeneratePayload({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
      systemInstruction: 'You are Vixora AI.',
      functionDeclarations: [{ name: 'testTool' }],
    });
    assert.equal(typeof geminiPayload.config?.systemInstruction, 'string');
    assert.equal(Array.isArray(geminiPayload.config?.tools), true);
  });

  it('cleans noisy markdown asterisks into clear legacy-style direct text', () => {
    const cleaned = formatLegacyDirectResponse('### Campaign Plan\n**Headline:** Boost *Sales* Now!\n\n\nNext line');
    assert.equal(cleaned, 'Campaign Plan\nHeadline: Boost Sales Now!\n\nNext line');
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

  it('returns non-secret health status on GET /api/vixora with default model and without exposing keys', async () => {
    const missingHealth = await handleVixoraApiRequest({
      method: 'GET',
      url: '/api/vixora',
      env: {},
    });
    assert.equal(missingHealth.status, 200);
    assert.equal(missingHealth.body.configured, false);
    assert.equal(missingHealth.body.missingKey, true);
    assert.equal(missingHealth.body.cloudSqlUsed, false);
    assert.equal(missingHealth.body.defaultModel, 'gemini-3.8-flash');
    assert.equal(Array.isArray(missingHealth.body.availableModels), true);

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

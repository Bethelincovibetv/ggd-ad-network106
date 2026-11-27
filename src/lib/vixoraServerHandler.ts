import { GoogleGenAI, Modality } from '@google/genai';
import {
  DEFAULT_VIXORA_MODEL,
  LEGACY_TEXT_RESPONSE_DIRECTIVE,
  VIXORA_CHAT_MODELS,
  formatLegacyDirectResponse,
  isGemmaModel,
  normalizeSelectedVixoraModel,
} from './vixoraModels';

export {
  DEFAULT_VIXORA_MODEL,
  VIXORA_CHAT_MODELS,
  formatLegacyDirectResponse,
  isGemmaModel,
} from './vixoraModels';

export const MISSING_GEMINI_API_KEY_MESSAGE =
  'GEMINI_API_KEY is not configured. Add GEMINI_API_KEY in Vercel Project Settings -> Environment Variables (or your environment Secrets) and redeploy or restart the server.';

export type VixoraApiAction =
  | 'health'
  | 'agent'
  | 'assistant'
  | 'generate'
  | 'tts'
  | 'coach-strategy';

export interface VixoraRequestInput {
  method?: string;
  url?: string;
  body?: any;
  env?: Record<string, string | undefined>;
  fallbackKeys?: string[];
  disabledFeatures?: string[];
}

export interface VixoraResponseOutput {
  status: number;
  body: Record<string, any>;
}

const KNOWN_PLACEHOLDER_OR_LEAKED_KEYS = [
  'your_gemini_api_key_here',
  'undefined',
  'null',
  'AIzaSyAd6JjVFP5LYmtiSUXLH-HZGIPlHcseohA',
  'AIzaSyAeCyBC9daZbvXNRtfLjxBWwpF3MwXJggk',
  'AIzaSyCBO1PRv5h9aQAB3rWb',
];

export function isValidGeminiKey(key?: string | null): boolean {
  if (!key || typeof key !== 'string') return false;
  const clean = key.trim();
  if (clean.length < 20) return false;
  if (clean.startsWith('AIzaSy...')) return false;
  for (const bad of KNOWN_PLACEHOLDER_OR_LEAKED_KEYS) {
    if (clean === bad || clean.includes(bad)) return false;
  }
  return true;
}

export function resolveCandidateGeminiKeys(
  env: Record<string, string | undefined> = process.env,
  fallbackKeys: Array<string | undefined> = []
): string[] {
  const raw = [
    env.GEMINI_API_KEY,
    env.API_KEY,
    env.VITE_GEMINI_API_KEY,
    ...fallbackKeys,
  ];
  const valid = raw
    .filter((k): k is string => isValidGeminiKey(k))
    .map((k) => k.trim());
  return Array.from(new Set(valid));
}

export function resolvePrimaryGeminiKey(
  env: Record<string, string | undefined> = process.env,
  fallbackKeys: Array<string | undefined> = []
): string | null {
  const candidates = resolveCandidateGeminiKeys(env, fallbackKeys);
  return candidates[0] || null;
}

export function normalizeVixoraModel(
  requested?: string,
  kind: 'text' | 'tts' = 'text'
): string {
  if (kind === 'tts') {
    if (requested && requested.includes('tts')) return requested.trim();
    return 'gemini-3.8-flash-lite-tts';
  }

  return normalizeSelectedVixoraModel(requested);
}

export function buildCandidateModels(
  requested?: string,
  kind: 'text' | 'tts' = 'text'
): string[] {
  const primary = normalizeVixoraModel(requested, kind);
  if (kind === 'tts') {
    return Array.from(
      new Set([primary, 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview'])
    );
  }
  return Array.from(new Set([primary, DEFAULT_VIXORA_MODEL, 'gemini-3.5-flash-lite']));
}

export function prepareModelGeneratePayload(params: {
  model: string;
  contents: any;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  functionDeclarations?: any[];
}): { contents: any; config?: Record<string, any> } {
  const {
    model,
    contents,
    systemInstruction = '',
    temperature,
    responseMimeType,
    functionDeclarations,
  } = params;

  const trimmedSys = systemInstruction.trim();
  const directiveSys = trimmedSys
    ? `${trimmedSys}\n\n${LEGACY_TEXT_RESPONSE_DIRECTIVE}`
    : LEGACY_TEXT_RESPONSE_DIRECTIVE;

  if (isGemmaModel(model)) {
    const config: Record<string, any> = {};
    if (typeof temperature === 'number') {
      config.temperature = temperature;
    }

    let effectiveContents = contents;
    if (typeof contents === 'string') {
      effectiveContents = `${directiveSys}\n\nUser Request:\n${contents}`;
    } else if (Array.isArray(contents)) {
      effectiveContents = [
        { role: 'user', parts: [{ text: `Instructions:\n${directiveSys}` }] },
        { role: 'model', parts: [{ text: 'Understood. I will reply clearly and directly.' }] },
        ...contents,
      ];
    }

    return {
      contents: effectiveContents,
      config: Object.keys(config).length > 0 ? config : undefined,
    };
  }

  const config: Record<string, any> = {
    systemInstruction: directiveSys,
  };
  if (typeof temperature === 'number') {
    config.temperature = temperature;
  }
  if (typeof responseMimeType === 'string' && responseMimeType.trim()) {
    config.responseMimeType = responseMimeType.trim();
  }
  if (Array.isArray(functionDeclarations) && functionDeclarations.length > 0) {
    config.tools = [{ functionDeclarations }];
  }

  return { contents, config };
}

export function inferVixoraAction(url?: string, body?: any): VixoraApiAction {
  const explicit = typeof body?.action === 'string' ? body.action.trim().toLowerCase() : '';
  if (
    explicit === 'health' ||
    explicit === 'agent' ||
    explicit === 'assistant' ||
    explicit === 'generate' ||
    explicit === 'tts' ||
    explicit === 'coach-strategy'
  ) {
    return explicit;
  }

  const path = (url || '').toLowerCase();
  if (path.includes('health')) return 'health';
  if (path.includes('vixora-agent')) return 'agent';
  if (path.includes('/tts') || path.includes('audio/tts')) return 'tts';
  if (path.includes('coach-strategy')) return 'coach-strategy';
  if (path.includes('/assistant') || path.includes('/ai/chat')) return 'assistant';
  if (Array.isArray(body?.functionDeclarations) && body.functionDeclarations.length > 0) {
    return 'agent';
  }
  return 'generate';
}

function pcmBase64ToWavBase64(pcmBase64: string, sampleRate = 24000, numChannels = 1): string {
  const pcmBuffer = Buffer.from(pcmBase64, 'base64');
  const wavHeader = Buffer.alloc(44);
  const totalDataLen = pcmBuffer.length;
  const totalFileLen = totalDataLen + 36;
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;

  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(totalFileLen, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(16, 34);
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(totalDataLen, 40);

  return Buffer.concat([wavHeader, pcmBuffer]).toString('base64');
}

function resolveGoogleVoiceName(voice?: string): string {
  const v = (voice || 'Kore').toLowerCase();
  if (v.includes('aoede')) return 'Aoede';
  if (v.includes('puck')) return 'Puck';
  if (v.includes('charon')) return 'Charon';
  if (v.includes('fenrir')) return 'Fenrir';
  if (v.includes('zephyr')) return 'Zephyr';
  return 'Kore';
}

export async function handleVixoraApiRequest(
  input: VixoraRequestInput
): Promise<VixoraResponseOutput> {
  const method = (input.method || 'POST').toUpperCase();
  const body = input.body && typeof input.body === 'object' ? input.body : {};
  const env = input.env || process.env;
  const fallbackKeys = input.fallbackKeys || [];
  const candidateKeys = resolveCandidateGeminiKeys(env, fallbackKeys);
  const action = method === 'GET' ? 'health' : inferVixoraAction(input.url, body);

  if (method === 'OPTIONS') {
    return { status: 200, body: { ok: true } };
  }

  if (action === 'health' || method === 'GET') {
    return {
      status: 200,
      body: {
        ok: true,
        service: 'Vixora AI Serverless Gateway',
        defaultModel: DEFAULT_VIXORA_MODEL,
        availableModels: VIXORA_CHAT_MODELS.map((m) => m.id),
        configured: candidateKeys.length > 0,
        missingKey: candidateKeys.length === 0,
        cloudSqlUsed: false,
        setupMessage: candidateKeys.length === 0 ? MISSING_GEMINI_API_KEY_MESSAGE : null,
        timestamp: new Date().toISOString(),
      },
    };
  }

  if (candidateKeys.length === 0) {
    return {
      status: 503,
      body: {
        ok: false,
        missingKey: true,
        setupRequired: true,
        code: 'MISSING_GEMINI_API_KEY',
        error: MISSING_GEMINI_API_KEY_MESSAGE,
        text: '',
        functionCalls: [],
      },
    };
  }

  // Handle TTS action
  if (action === 'tts') {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return {
        status: 400,
        body: { ok: false, error: 'Field "text" is required for voiceover synthesis.' },
      };
    }

    const googleVoiceName = resolveGoogleVoiceName(body.voice);
    const speed = typeof body.speed === 'number' ? body.speed : 1.0;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const estimatedDurationSec = Math.max(3, Math.round(((wordCount / 140) * 60) / speed));
    const models = buildCandidateModels(body.model, 'tts');

    let lastErr: any = null;
    for (const apiKey of candidateKeys) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      for (const model of models) {
        try {
          const speechRes = await ai.models.generateContent({
            model,
            contents: text,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: googleVoiceName },
                },
              },
            },
          });
          const inlineData = speechRes.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (inlineData?.data) {
            const base64Audio = pcmBase64ToWavBase64(inlineData.data, 24000, 1);
            return {
              status: 200,
              body: {
                ok: true,
                provider: 'google.gemini',
                model,
                voice: googleVoiceName,
                text,
                speed,
                estimated_duration_seconds: estimatedDurationSec,
                audio_format: 'wav',
                audio_base64: base64Audio,
                status: 'ready',
                message: `Google AI Voice (${googleVoiceName}) synthesized successfully`,
                audio_stream_url: `data:audio/wav;base64,${base64Audio}`,
              },
            };
          }
        } catch (err: any) {
          lastErr = err;
        }
      }
    }

    return {
      status: 200,
      body: {
        ok: true,
        provider: 'google.gemini',
        voice: googleVoiceName,
        text,
        speed,
        estimated_duration_seconds: estimatedDurationSec,
        audio_format: 'browser-speech',
        status: 'ready',
        message: lastErr?.message
          ? `Prepared browser voice playback (${lastErr.message})`
          : `Google AI Voice (${googleVoiceName}) prepared for playback`,
        audio_stream_url: '',
      },
    };
  }

  // Handle Coach 4-Week Strategy JSON action
  if (action === 'coach-strategy') {
    const niche = typeof body.niche === 'string' && body.niche.trim() ? body.niche.trim() : 'General';
    const goal = typeof body.goal === 'string' && body.goal.trim() ? body.goal.trim() : 'Viral Audience Growth';
    const prompt = `Create a 4-week Viral Content Roadmap for the niche "${niche}" with goal "${goal}".
Return strictly valid JSON with keys: title, niche, platform, goal, faithAlignment, roadmapItems (array of objects with week, topic, hook, platform, monetizationAngle).`;

    const models = buildCandidateModels(body.model, 'text');
    let lastError = 'Gemini strategy generation failed.';
    for (const apiKey of candidateKeys) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      for (const model of models) {
        try {
          const resAI = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: 'application/json' },
          });
          if (resAI.text) {
            return {
              status: 200,
              body: { ok: true, model, data: JSON.parse(resAI.text) },
            };
          }
        } catch (err: any) {
          lastError = err?.message || lastError;
        }
      }
    }
    return {
      status: 502,
      body: { ok: false, error: lastError },
    };
  }

  // Build contents & config for agent / assistant / generate
  let contents = body.contents;
  let systemInstruction = typeof body.systemInstruction === 'string' ? body.systemInstruction : '';

  if (action === 'assistant' && !contents) {
    const userFullName = typeof body.userFullName === 'string' && body.userFullName.trim() ? body.userFullName.trim() : 'Creator';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const historyTurns = Array.isArray(body.messages) ? body.messages.slice(-10) : [];
    contents = [
      ...historyTurns,
      { role: 'user', parts: [{ text: prompt || 'Hello Vixora!' }] },
    ];
    if (!systemInstruction) {
      systemInstruction = `You are 'Vixora' (Visora AI), the energetic, warm, and brilliant Nigerian AI Creator Assistant & Video Producer! Address the user warmly by name (${userFullName}). Speak clearly without markdown asterisks (*). All AI generation is handled server-side; never ask the user to enter an API key.`;
    }
  }

  const hasEmptyContents =
    !contents ||
    (Array.isArray(contents) && contents.length === 0) ||
    (typeof contents === 'string' && !contents.trim());

  if (hasEmptyContents) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'Missing contents or prompt payload.',
        text: '',
        functionCalls: [],
      },
    };
  }

  if (Array.isArray(input.disabledFeatures) && input.disabledFeatures.length > 0) {
    systemInstruction = `${systemInstruction}\n\n[PLATFORM CONSTRAINTS]: The following features are strictly DISABLED and must NEVER be mentioned, promoted, suggested, or referenced: ${input.disabledFeatures.join(', ')}.`;
  }

  const resolvedTemperature =
    typeof body.temperature === 'number'
      ? body.temperature
      : action === 'agent'
      ? 0.4
      : undefined;
  const resolvedResponseMimeType =
    typeof body.responseMimeType === 'string' && body.responseMimeType.trim()
      ? body.responseMimeType.trim()
      : undefined;
  const resolvedFunctionDeclarations =
    Array.isArray(body.functionDeclarations) && body.functionDeclarations.length > 0
      ? body.functionDeclarations
      : undefined;

  const models = buildCandidateModels(body.model, 'text');
  let lastErrorMessage = 'Gemini API request failed.';
  let lastStatus = 502;

  for (const apiKey of candidateKeys) {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    for (const model of models) {
      try {
        const prepared = prepareModelGeneratePayload({
          model,
          contents,
          systemInstruction,
          temperature: resolvedTemperature,
          responseMimeType: resolvedResponseMimeType,
          functionDeclarations: resolvedFunctionDeclarations,
        });

        const response = await ai.models.generateContent({
          model,
          contents: prepared.contents,
          config: prepared.config,
        });

        const functionCalls = (response.functionCalls || []).map((fc: any) => ({
          name: fc.name,
          args: fc.args || {},
        }));

        if (functionCalls.length > 0 || response.text) {
          return {
            status: 200,
            body: {
              ok: true,
              model,
              text: formatLegacyDirectResponse(response.text || ''),
              functionCalls,
              candidates: response.candidates || [],
            },
          };
        }
      } catch (err: any) {
        const msg = String(err?.message || err || 'Unknown Gemini error');
        lastErrorMessage = msg;
        const lowerMsg = msg.toLowerCase();
        // Only treat invalid/leaked key errors as auth failures; retry next candidate or model otherwise
        if (lowerMsg.includes('api_key_invalid') || lowerMsg.includes('api key not valid')) {
          lastStatus = 401;
        }
      }
    }
  }

  return {
    status: lastStatus,
    body: {
      ok: false,
      error: lastErrorMessage,
      text: '',
      functionCalls: [],
    },
  };
}

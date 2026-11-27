export interface VixoraModelOption {
  id: string;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
  supportsTools: boolean;
  isGemma: boolean;
}

export const DEFAULT_VIXORA_MODEL = 'gemini-3.8-flash';
export const VIXORA_MODEL_STORAGE_KEY = 'vixora_selected_model';

export const VIXORA_CHAT_MODELS: readonly VixoraModelOption[] = [
  {
    id: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash',
    shortLabel: '3.8 Flash',
    badge: 'Default · Free Tier',
    description: 'Latest flagship Flash model with tool support and crisp direct answers.',
    supportsTools: true,
    isGemma: false,
  },
  {
    id: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    shortLabel: '3.6 Flash',
    badge: 'Free Tier',
    description: 'Fast conversational synthesis for ad copy, products, and marketing plans.',
    supportsTools: true,
    isGemma: false,
  },
  {
    id: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash Lite',
    shortLabel: '3.5 Flash Lite',
    badge: 'Free Tier',
    description: 'Lightweight low-latency model for quick everyday replies.',
    supportsTools: true,
    isGemma: false,
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    shortLabel: '3.1 Flash Lite',
    badge: 'Free Tier',
    description: 'Compact high-throughput option for rapid questions and drafts.',
    supportsTools: true,
    isGemma: false,
  },
  {
    id: 'gemma-4-31b-it',
    label: 'Gemma 4 31B IT',
    shortLabel: 'Gemma 4 31B',
    badge: 'Free Tier · Open',
    description: 'Open-weight 31B instruction-tuned model for direct legacy-style text.',
    supportsTools: false,
    isGemma: true,
  },
] as const;

const ALLOWED_MODEL_IDS = new Set<string>(VIXORA_CHAT_MODELS.map((m) => m.id));

export function isGemmaModel(modelId?: string | null): boolean {
  return /^gemma-/i.test(String(modelId || '').trim());
}

export function getVixoraModelOption(modelId?: string | null): VixoraModelOption {
  const normalized = normalizeSelectedVixoraModel(modelId);
  return VIXORA_CHAT_MODELS.find((m) => m.id === normalized) || VIXORA_CHAT_MODELS[0];
}

export function normalizeSelectedVixoraModel(requested?: string | null): string {
  const raw = String(requested || '').trim();
  if (!raw) return DEFAULT_VIXORA_MODEL;

  const lower = raw.toLowerCase();
  if (
    lower === 'gemini-4-hydrogen' ||
    lower.startsWith('gemini-1.5') ||
    lower.startsWith('gemini-2.0') ||
    lower === 'gemini-pro'
  ) {
    return DEFAULT_VIXORA_MODEL;
  }

  if (ALLOWED_MODEL_IDS.has(lower)) {
    return lower;
  }

  return raw;
}

export function getStoredVixoraModel(): string {
  if (typeof window === 'undefined') return DEFAULT_VIXORA_MODEL;
  try {
    const saved = window.localStorage?.getItem(VIXORA_MODEL_STORAGE_KEY);
    return normalizeSelectedVixoraModel(saved);
  } catch {
    return DEFAULT_VIXORA_MODEL;
  }
}

export function setStoredVixoraModel(modelId: string): string {
  const normalized = normalizeSelectedVixoraModel(modelId);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage?.setItem(VIXORA_MODEL_STORAGE_KEY, normalized);
      window.dispatchEvent(new CustomEvent('vixora-model-changed', { detail: { model: normalized } }));
    } catch {
      // Non-blocking storage error
    }
  }
  return normalized;
}

/**
 * Normalizes AI output into clear, direct, legacy-style plain text
 * without noisy markdown asterisks or heading hashes.
 */
export function formatLegacyDirectResponse(rawText?: string | null): string {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const LEGACY_TEXT_RESPONSE_DIRECTIVE =
  'RESPONSE STYLE: Reply in clear, direct, legacy-style plain text. Get straight to the point with concise sentences or plain numbered steps. Never use markdown asterisks (* or **) or markdown hash headings (#).';

import type { CopilotGender, Lang } from './types';

export const CHAT_MODEL = 'sarvam-105b-conversations';

export const STT_MODEL = 'saaras:v3';
export const TTS_MODEL = 'bulbul:v3';

export const MAX_RECORDING_SECONDS = 25;
export const VENDOR_STALL_MULTIPLIER = 1.45;

export const COPILOT_GENDER: CopilotGender = 'female';

export const TTS_PACE_DEFAULT = 1.05;
export const TTS_PACE_FAST = 1.2;

export const VOICES: Record<'vendor' | 'customer', Record<Lang, string>> = {
  vendor: {
    'hi-IN': 'shubh',
    'mr-IN': 'ratan',
  },
  customer: {
    'hi-IN': 'priya',
    'mr-IN': 'priya',
  },
};

export const FORCE_FALLBACK = process.env.FORCE_FALLBACK === '1';

import type { z } from 'zod';
import { CHAT_MODEL, STT_MODEL, TTS_MODEL } from './config';
import type { Lang } from './types';

const BASE_URL = 'https://api.sarvam.ai';
const TIMEOUT_MS = 12_000;

export class SarvamError extends Error {
  status: number;
  body: string;
  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'SarvamError';
    this.status = status;
    this.body = body;
  }
}

function apiKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new SarvamError('SARVAM_API_KEY is not set', 0, '');
  return key;
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await attempt(fn);
    console.log(`[sarvam] ${label} ok in ${Date.now() - start}ms`);
    return result;
  } catch (err) {
    console.log(`[sarvam] ${label} failed after ${Date.now() - start}ms: ${String(err)}`);
    throw err;
  }
}

async function attempt<T>(fn: () => Promise<T>, retried = false): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const retryable =
      err instanceof SarvamError && (err.status === 429 || err.status >= 500 || err.status === 0);
    if (!retried && retryable) {
      return attempt(fn, true);
    }
    throw err;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new SarvamError('Sarvam request timed out', 0, '');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export interface SttResult {
  transcript: string;
  languageCode: string | null;
  requestId: string | null;
}

export async function stt(audio: Blob, lang?: Lang): Promise<SttResult> {
  return withRetry('stt', async () => {
    const form = new FormData();
    form.append('file', audio, 'audio.webm');
    form.append('model', STT_MODEL);
    form.append('mode', 'transcribe');
    if (lang) form.append('language_code', lang);

    const res = await fetchWithTimeout(`${BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey() },
      body: form,
    });

    const text = await res.text();
    if (!res.ok) throw new SarvamError('STT request failed', res.status, text);

    const json = JSON.parse(text) as {
      transcript?: string;
      language_code?: string | null;
      request_id?: string | null;
    };
    return {
      transcript: json.transcript ?? '',
      languageCode: json.language_code ?? null,
      requestId: json.request_id ?? null,
    };
  });
}

export interface TtsResult {
  base64: string;
  mime: string;
}

export async function tts(opts: {
  text: string;
  lang: Lang;
  speaker: string;
  pace?: number;
}): Promise<TtsResult> {
  return withRetry('tts', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/text-to-speech`, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text: opts.text.slice(0, 2500),
        target_language_code: opts.lang,
        speaker: opts.speaker,
        model: TTS_MODEL,
        pace: opts.pace ?? 1.0,
      }),
    });

    const text = await res.text();
    if (!res.ok) throw new SarvamError('TTS request failed', res.status, text);

    const json = JSON.parse(text) as { audios?: string[] };
    const base64 = json.audios?.[0];
    if (!base64) throw new SarvamError('TTS response had no audio', res.status, text);
    return { base64, mime: 'audio/wav' };
  });
}

function stripThink(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function extractJson(content: string): string {
  let s = stripThink(content).trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return s;
  return s.slice(start, end + 1);
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatJSON<T>(
  schema: z.ZodType<T>,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<T> {
  return withRetry('chat', async () => {
    const res = await fetchWithTimeout(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages,
        temperature: opts.temperature ?? 0,
        max_tokens: opts.maxTokens ?? 300,
        reasoning_effort: null,
      }),
    });

    const text = await res.text();
    if (!res.ok) throw new SarvamError('Chat request failed', res.status, text);

    const json = JSON.parse(text) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? '';
    const jsonStr = extractJson(content);
    const parsed = JSON.parse(jsonStr);
    return schema.parse(parsed);
  });
}

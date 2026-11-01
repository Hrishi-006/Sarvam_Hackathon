'use client';

let sharedAudio: HTMLAudioElement | null = null;
let unlocked = false;

// 50ms of silence — a real (if inaudible) clip, so play() actually decodes and
// starts playback within the click handler's gesture. A muted play() on an
// element with no `src` never truly plays anything, so it doesn't register as
// genuine engagement and later unmuted play() calls (after an awaited fetch,
// which breaks the gesture chain) get silently blocked by autoplay policy.
const SILENCE_WAV =
  'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.setAttribute('playsinline', 'true');
  }
  return sharedAudio;
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function unlockAudio(): Promise<boolean> {
  const audio = getSharedAudio();
  audio.src = SILENCE_WAV;
  return audio
    .play()
    .then(() => {
      unlocked = true;
      return true;
    })
    .catch(() => {
      unlocked = false;
      return false;
    });
}

export function base64ToUrl(base64: string, mime: string): string {
  return `data:${mime};base64,${base64}`;
}

export class AudioBlockedError extends Error {
  constructor() {
    super('audio playback was blocked by the browser — call unlockAudio() from a click handler');
    this.name = 'AudioBlockedError';
  }
}

export function playBase64(base64: string, mime: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = getSharedAudio();
    audio.src = base64ToUrl(base64, mime);
    const onEnded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('audio playback failed'));
    };
    const cleanup = () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.play().catch((err) => {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        unlocked = false;
        cleanup();
        reject(new AudioBlockedError());
        return;
      }
      onError();
    });
  });
}

export function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

export class Recorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private audioCtx: AudioContext | null = null;
  private levelRaf: number | null = null;
  onLevel?: (level: number) => void;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start();
    this.setupLevelMeter();
  }

  private setupLevelMeter() {
    if (!this.stream) return;
    try {
      this.audioCtx = new AudioContext();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      const tick = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        this.onLevel?.(avg / 255);
        this.levelRaf = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // level meter is a nice-to-have; ignore failures
    }
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob());
        return;
      }
      const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mimeType });
        this.cleanup();
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.levelRaf) cancelAnimationFrame(this.levelRaf);
    this.audioCtx?.close().catch(() => {});
    this.stream = null;
    this.audioCtx = null;
    this.analyser = null;
  }
}

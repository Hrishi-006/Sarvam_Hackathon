import { COPILOT_GENDER, TTS_PACE_DEFAULT, VOICES } from '@/lib/config';
import { decideCustomer } from '@/lib/engine/customer';
import { extractHeard } from '@/lib/extract';
import { ITEMS } from '@/lib/items';
import { phraseCustomer } from '@/lib/phrase';
import { copilotTurnJsonSchema } from '@/lib/schemas';
import { stt, tts } from '@/lib/sarvam';
import type { VendorHeard } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  const timings: Record<string, number> = {};
  const mark = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    const result = await fn();
    timings[label] = Date.now() - start;
    return result;
  };

  try {
    const contentType = req.headers.get('content-type') ?? '';
    let payload: unknown;
    let audio: Blob | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const payloadRaw = form.get('payload');
      payload = typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : {};
      const file = form.get('audio');
      if (file instanceof Blob && file.size > 0) audio = file;
    } else {
      payload = await req.json();
    }

    const body = copilotTurnJsonSchema.parse(payload);
    const item = ITEMS[body.itemId];

    let transcript = '';
    if (body.state.round === 0 && !audio && !body.vendorText) {
      transcript = '';
    } else if (audio) {
      const sttResult = await mark('stt', () => stt(audio as Blob, body.lang));
      transcript = sttResult.transcript;
    } else {
      transcript = body.vendorText ?? '';
    }

    let heard: VendorHeard;
    if (body.state.round === 0 && !transcript) {
      heard = { price: null, saidLastPrice: false, vendorAcceptedOffer: false, tactic: 'NONE', englishGloss: '' };
    } else {
      heard = await mark('extract', () => extractHeard(transcript, body.state.lastOffer));
    }

    const engineHeard: VendorHeard = body.groundTruth
      ? {
          ...heard,
          price: body.groundTruth.price,
          saidLastPrice: body.groundTruth.saidLastPrice,
          vendorAcceptedOffer: body.groundTruth.vendorAcceptedOffer,
        }
      : heard;

    const { decision, nextState } = decideCustomer(item, body.state, engineHeard);

    const itemNameLocal = body.lang === 'hi-IN' ? item.name.hi : item.name.mr;
    const { line, english } = await mark('phrase', () =>
      phraseCustomer({
        action: decision.action,
        amount: decision.amount,
        itemNameLocal,
        lang: body.lang,
        gender: COPILOT_GENDER,
        vendorLastLine: transcript || null,
        round: body.state.round,
        recentLines: body.history ?? [],
      }),
    );

    const audioResult = await mark('tts', () =>
      tts({ text: line, lang: body.lang, speaker: VOICES.customer[body.lang], pace: TTS_PACE_DEFAULT }),
    );

    return Response.json({
      transcript,
      heard,
      decision,
      line,
      english,
      nextState,
      audio: audioResult,
      timings,
    });
  } catch (err) {
    console.error('[api/copilot/turn] error', err);
    return Response.json({ error: 'copilot turn failed' }, { status: 500 });
  }
}

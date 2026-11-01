import { TTS_PACE_DEFAULT, VOICES } from '@/lib/config';
import { decideVendor, initialVendorState } from '@/lib/engine/vendor';
import { ITEMS } from '@/lib/items';
import { phraseVendor } from '@/lib/phrase';
import { vendorTurnSchema } from '@/lib/schemas';
import { tts } from '@/lib/sarvam';

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
    const body = vendorTurnSchema.parse(await req.json());
    const item = ITEMS[body.itemId];
    const state = body.state ?? initialVendorState(item);

    const { decision, nextState } = decideVendor(item, state, body.customerDecision);

    const itemNameLocal = body.lang === 'hi-IN' ? item.name.hi : item.name.mr;
    const { line, english } = await mark('phrase', () =>
      phraseVendor({
        tactic: decision.tactic,
        price: decision.price,
        mood: decision.mood,
        itemNameLocal,
        lang: body.lang,
        customerLastLine: body.customerLine ?? null,
        recentLines: body.history ?? [],
      }),
    );

    const audioResult = await mark('tts', () =>
      tts({ text: line, lang: body.lang, speaker: VOICES.vendor[body.lang], pace: body.pace ?? TTS_PACE_DEFAULT }),
    );

    return Response.json({ decision, line, english, nextState, audio: audioResult, timings });
  } catch (err) {
    console.error('[api/vendor/turn] error', err);
    return Response.json({ error: 'vendor turn failed' }, { status: 500 });
  }
}

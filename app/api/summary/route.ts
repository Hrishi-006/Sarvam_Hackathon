import { COPILOT_GENDER, TTS_PACE_DEFAULT, VOICES } from '@/lib/config';
import { ITEMS } from '@/lib/items';
import { phraseSummary } from '@/lib/phrase';
import { summarySchema } from '@/lib/schemas';
import { tts } from '@/lib/sarvam';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = summarySchema.parse(await req.json());
    const item = ITEMS[body.itemId];
    const { customerState, vendorOpen } = body;
    const itemNameLocal = body.lang === 'hi-IN' ? item.name.hi : item.name.mr;

    const outcome = customerState.outcome ?? 'walked';
    const finalPrice = customerState.finalPrice ?? 0;
    const saved = outcome === 'deal' ? vendorOpen - finalPrice : 0;
    const percentSaved = outcome === 'deal' && vendorOpen > 0 ? Math.round((saved / vendorOpen) * 100) : 0;
    const rounds = customerState.round;
    const threatUsed = customerState.threatUsed;

    const stats = { itemNameLocal, vendorOpen, finalPrice, saved, percentSaved, rounds, threatUsed, outcome };

    const { line, english } = await phraseSummary({
      itemNameLocal,
      lang: body.lang,
      gender: COPILOT_GENDER,
      vendorOpen,
      finalPrice,
      saved,
      percentSaved,
      rounds,
      threatUsed,
      outcome,
    });

    const audioResult = await tts({
      text: line,
      lang: body.lang,
      speaker: VOICES.customer[body.lang],
      pace: TTS_PACE_DEFAULT,
    });

    return Response.json({ stats, line, english, audio: audioResult });
  } catch (err) {
    console.error('[api/summary] error', err);
    return Response.json({ error: 'summary failed' }, { status: 500 });
  }
}

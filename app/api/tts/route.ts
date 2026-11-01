import { tts } from '@/lib/sarvam';
import { ttsRequestSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = ttsRequestSchema.parse(await req.json());
    const result = await tts({ text: body.text, lang: body.lang, speaker: body.speaker, pace: body.pace });
    return Response.json({ audio: result });
  } catch (err) {
    console.error('[api/tts] error', err);
    return Response.json({ error: 'tts failed' }, { status: 500 });
  }
}

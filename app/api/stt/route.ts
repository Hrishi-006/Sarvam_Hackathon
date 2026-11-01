import { stt } from '@/lib/sarvam';
import { langSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      return Response.json({ error: 'missing file' }, { status: 400 });
    }
    const langRaw = form.get('lang');
    const lang = typeof langRaw === 'string' ? langSchema.optional().parse(langRaw) : undefined;

    const result = await stt(file, lang);
    return Response.json(result);
  } catch (err) {
    console.error('[api/stt] error', err);
    return Response.json({ error: 'stt failed' }, { status: 500 });
  }
}

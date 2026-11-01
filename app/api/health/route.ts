export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET() {
  return Response.json({ ok: true, hasKey: Boolean(process.env.SARVAM_API_KEY) });
}

import { config } from 'dotenv';
config({ path: '.env.local' });

import { z } from 'zod';
import { chatJSON, stt, tts } from '../lib/sarvam';

async function main() {
  console.log('1. Chat completion...');
  const chatResult = await chatJSON(
    z.object({ reply: z.string() }),
    [
      {
        role: 'system',
        content: 'Reply with JSON only: {"reply": "<one short sentence>"}',
      },
      { role: 'user', content: 'Say hello in one short sentence.' },
    ],
    { temperature: 0.5 },
  );
  console.log('   ->', chatResult.reply);

  console.log('2. Text-to-speech...');
  const ttsResult = await tts({
    text: 'भैया, यह कितने का है?',
    lang: 'hi-IN',
    speaker: 'priya',
  });
  console.log('   -> got base64 audio, length', ttsResult.base64.length);

  console.log('3. Speech-to-text (feeding TTS output back in)...');
  const buffer = Buffer.from(ttsResult.base64, 'base64');
  const blob = new Blob([buffer], { type: 'audio/wav' });
  const sttResult = await stt(blob, 'hi-IN');
  console.log('   -> transcript:', sttResult.transcript);

  console.log('\nSmoke test passed.');
}

main().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});

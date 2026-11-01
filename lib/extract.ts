import { FORCE_FALLBACK } from './config';
import { buildExtractorMessages, regexPriceFallback, vendorHeardSchema } from './prompts';
import { chatJSON } from './sarvam';
import type { VendorHeard } from './types';

export async function extractHeard(transcript: string, lastCustomerOffer: number | null): Promise<VendorHeard> {
  if (!transcript.trim()) {
    return { price: null, saidLastPrice: false, vendorAcceptedOffer: false, tactic: 'NONE', englishGloss: '' };
  }

  if (FORCE_FALLBACK) {
    return {
      price: regexPriceFallback(transcript),
      saidLastPrice: /last price|फायनल|लास्ट प्राइस|कमी नाही|कम नहीं/i.test(transcript),
      vendorAcceptedOffer: false,
      tactic: 'NONE',
      englishGloss: transcript,
    };
  }

  try {
    return await chatJSON(vendorHeardSchema, buildExtractorMessages(transcript, lastCustomerOffer), {
      temperature: 0,
    });
  } catch {
    return {
      price: regexPriceFallback(transcript),
      saidLastPrice: /last price|फायनल|लास्ट प्राइस|कमी नाही|कम नहीं/i.test(transcript),
      vendorAcceptedOffer: false,
      tactic: 'NONE',
      englishGloss: transcript,
    };
  }
}

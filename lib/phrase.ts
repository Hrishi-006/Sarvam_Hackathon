import { FORCE_FALLBACK } from './config';
import { customerFallback, vendorFallback } from './fallbacks';
import {
  buildCustomerPhraseMessages,
  buildSummaryMessages,
  buildVendorPhraseMessages,
  lineSchema,
} from './prompts';
import { chatJSON } from './sarvam';
import type { CopilotGender, CustomerAction, Lang, VendorTactic } from './types';

interface Line {
  line: string;
  english: string;
}

function containsNumber(line: string, amount: number): boolean {
  return line.includes(String(amount));
}

export async function phraseCustomer(opts: {
  action: CustomerAction;
  amount: number | null;
  itemNameLocal: string;
  lang: Lang;
  gender: CopilotGender;
  vendorLastLine: string | null;
  round: number;
  recentLines: string[];
}): Promise<Line> {
  const fallback = customerFallback(opts.action, opts.amount, opts.lang);
  if (FORCE_FALLBACK) return fallback;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await chatJSON(lineSchema, buildCustomerPhraseMessages(opts), { temperature: 0.7 });
      if (opts.amount == null || containsNumber(result.line, opts.amount)) return result;
    } catch {
      // fall through to retry / fallback
    }
  }
  return fallback;
}

export async function phraseVendor(opts: {
  tactic: VendorTactic;
  price: number;
  mood: string;
  itemNameLocal: string;
  lang: Lang;
  customerLastLine: string | null;
  recentLines: string[];
}): Promise<Line> {
  const fallback = vendorFallback(opts.tactic, opts.price, opts.lang);
  if (FORCE_FALLBACK) return fallback;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await chatJSON(lineSchema, buildVendorPhraseMessages(opts), { temperature: 0.9, maxTokens: 300 });
      if (containsNumber(result.line, opts.price)) return result;
    } catch {
      // fall through to retry / fallback
    }
  }
  return fallback;
}

export async function phraseSummary(opts: {
  itemNameLocal: string;
  lang: Lang;
  gender: CopilotGender;
  vendorOpen: number;
  finalPrice: number;
  saved: number;
  percentSaved: number;
  rounds: number;
  threatUsed: boolean;
  outcome: 'deal' | 'walked';
}): Promise<Line> {
  const fallback: Line =
    opts.outcome === 'deal'
      ? {
          line:
            opts.lang === 'hi-IN'
              ? `डील हो गई, ${opts.finalPrice} में! ${opts.saved} रुपये बचाए।`
              : `डील झाली, ${opts.finalPrice} मध्ये! ${opts.saved} रुपये वाचले.`,
          english: `Deal done at ₹${opts.finalPrice}, saved ₹${opts.saved}.`,
        }
      : {
          line: opts.lang === 'hi-IN' ? 'कोई बात नहीं, अगली दुकान में कोशिश करते हैं।' : 'काही नाही, पुढच्या दुकानात बघू.',
          english: 'No worries, let\'s try the next shop.',
        };

  if (FORCE_FALLBACK) return fallback;

  try {
    return await chatJSON(lineSchema, buildSummaryMessages(opts), { temperature: 0.7 });
  } catch {
    return fallback;
  }
}

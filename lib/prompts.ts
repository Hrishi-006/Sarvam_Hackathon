import { z } from 'zod';
import type { ChatMessage } from './sarvam';
import type { CopilotGender, CustomerAction, Lang, VendorTactic } from './types';

const LANG_NAME: Record<Lang, string> = { 'hi-IN': 'Hindi', 'mr-IN': 'Marathi' };

export const vendorHeardSchema = z.object({
  price: z.number().nullable(),
  saidLastPrice: z.boolean(),
  vendorAcceptedOffer: z.boolean(),
  tactic: z.enum([
    'SPECIAL_RATE',
    'QUALITY',
    'BOHNI',
    'LOSS',
    'OFFENDED',
    'LAST_PRICE',
    'CALLBACK',
    'CLOSE',
    'GOODBYE',
    'NONE',
  ]),
  englishGloss: z.string(),
});

export const lineSchema = z.object({ line: z.string(), english: z.string() });

export function buildExtractorMessages(transcript: string, lastCustomerOffer: number | null): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You analyse what a street shopkeeper in Mumbai just said during price bargaining. Input may be Hindi, Marathi, English, or a mix, possibly with transcription errors.

Extract the current price he is asking for, as an integer in rupees. Understand spoken numbers in Hindi/Marathi, e.g.: "साढ़े तीन सौ" = 350, "पौने पाँच सौ" = 475, "डेढ़ सौ" = 150, "अडीचशे" = 250, "पाचशे" = 500, "सव्वा तीनशे" = 325, "four fifty" = 450. If he mentions several numbers, return the price he is now asking for. If there is no price in this utterance, return null.

saidLastPrice: true if he signals this is his final price (phrases like "लास्ट प्राइस", "इससे कम नहीं", "फायनल", "यापेक्षा कमी नाही", "बस इतना ही", or English equivalents).

vendorAcceptedOffer: true if he agrees to the customer's last offer. The customer's last offer (if any) is: ${lastCustomerOffer ?? 'none yet'}.

tactic: one of SPECIAL_RATE, QUALITY, BOHNI, LOSS, OFFENDED, LAST_PRICE, CALLBACK, CLOSE, GOODBYE, or NONE if none applies.

englishGloss: one short English sentence describing what he said.

Output strict JSON only, no other text:
{"price": number|null, "saidLastPrice": boolean, "vendorAcceptedOffer": boolean, "tactic": "...", "englishGloss": "..."}`,
    },
    { role: 'user', content: transcript },
  ];
}

export function regexPriceFallback(transcript: string): number | null {
  const matches = transcript.match(/\d{2,4}/g);
  if (!matches || matches.length === 0) return null;
  return parseInt(matches[matches.length - 1], 10);
}

export function buildCustomerPhraseMessages(opts: {
  action: CustomerAction;
  amount: number | null;
  itemNameLocal: string;
  lang: Lang;
  gender: CopilotGender;
  vendorLastLine: string | null;
  round: number;
  recentLines: string[];
}): ChatMessage[] {
  const address = opts.lang === 'hi-IN' ? 'भैया' : 'दादा';
  const genderNote =
    opts.gender === 'female'
      ? 'Speak as a woman — use feminine verb forms (e.g. Hindi "देख लेती हूँ", Marathi "बघते").'
      : 'Speak as a man — use masculine verb forms.';

  return [
    {
      role: 'system',
      content: `You are phrasing ONE line for a customer bargaining at a street stall in Mumbai, speaking ${LANG_NAME[opts.lang]}, in Devanagari script. Speak directly to the shopkeeper, address him as "${address}". Be polite but firm, casual Mumbai street register, natural Bambaiya/local speech. ${genderNote}

These are examples of TONE ONLY, never copy them — write a fresh line every turn:
- ASK_PRICE: "${address === 'भैया' ? 'भैया, यह कितने का है?' : 'दादा, हे कितीला आहे?'}"
- COUNTER: "${address === 'भैया' ? 'भैया, 250 में दे दो ना, रोज़ आती हूँ इधर।' : 'दादा, 250 ला द्या ना, मी नेहमी येते इथे.'}"
- THREATEN_WALK: "${address === 'भैया' ? 'रहने दो भैया, आगे दूसरी दुकान देख लेती हूँ। 350 में देना है तो बोलो।' : 'राहू द्या दादा, पुढच्या दुकानात बघते. 350 ला देणार असाल तर सांगा.'}"
- ACCEPT/DEAL: "${address === 'भैया' ? 'चलो डन, 350। पैक कर दो।' : 'चला, 350 फायनल. पॅक करा.'}"
- WALK_AWAY: "${address === 'भैया' ? 'नहीं भैया, रहने दो। थैंक यू।' : 'नको दादा, राहू द्या. धन्यवाद.'}"

Rules: the current action is ${opts.action}${opts.amount != null ? ` with amount ₹${opts.amount}` : ''}. If there is an amount, you MUST include the exact number ${opts.amount} written as digits somewhere in the line. Never reveal your walk-away limit. Never invent a fake competitor price — "I'll check other shops" is fine, naming a specific price another shop offered is not. React naturally to what he just said. Keep it under 18 words. Never repeat a line you've already said in this conversation.

Vendor just said: ${opts.vendorLastLine ?? '(nothing yet — this is the opening line)'}
Recent conversation: ${opts.recentLines.slice(-4).join(' / ') || '(none yet)'}

Output strict JSON only: {"line": "<Devanagari>", "english": "<gloss>"}`,
    },
    { role: 'user', content: `Item: ${opts.itemNameLocal}. Phrase the ${opts.action} line.` },
  ];
}

export function buildVendorPhraseMessages(opts: {
  tactic: VendorTactic;
  price: number;
  mood: string;
  itemNameLocal: string;
  lang: Lang;
  customerLastLine: string | null;
  recentLines: string[];
}): ChatMessage[] {
  const address = opts.lang === 'hi-IN' ? 'मैडम/साहब' : 'ताई/साहेब';

  return [
    {
      role: 'system',
      content: `You are Ramesh bhai, who has run a clothes stall on Colaba Causeway, Mumbai for 20 years — dramatic, charming, a showman. Speak ${LANG_NAME[opts.lang]}, Devanagari script, calling the customer "${address}". Write real Mumbai street speech — Bambaiya Hindi or natural Marathi bargaining talk, local sayings where they fit. Never copy the tone examples below verbatim — write a fresh line every turn.

Tone examples (tone only, do not copy):
- SPECIAL_RATE: "आपके लिए स्पेशल रेट, सिर्फ़ 800!"
- OFFENDED: "क्या मज़ाक कर रहे हो मैडम, 200 में तो कपड़ा भी नहीं आता! 720 लगेगा।"
- QUALITY: "क्वालिटी देखो, मॉल में यही दो हज़ार का है। 670 दे दो।"
- BOHNI: "सुबह से बोहनी नहीं हुई, आपके लिए 560।"
- LOSS: "इतने में तो मेरा लॉस हो जाएगा, 520 से कम नहीं।"
- LAST_PRICE: "लास्ट प्राइस 480, इससे नीचे नहीं जाऊँगा।"
- CALLBACK: "अरे रुको रुको मैडम! चलो, आपके लिए 350।"
- CLOSE: "ले जाओ, पैक कर देता हूँ। फिर आना!"
- GOODBYE: "जाओ जाओ, ऐसा माल कहीं नहीं मिलेगा!"

The current tactic is ${opts.tactic}, mood is ${opts.mood}, price is ₹${opts.price}. You MUST include the exact number ${opts.price} written as digits in the line (unless the tactic is CLOSE/GOODBYE and the price was already said moments ago, in which case still include it). React to what the customer just said. Keep it under 22 words. Never repeat a line you've already said.

Customer just said: ${opts.customerLastLine ?? '(nothing yet)'}
Recent conversation: ${opts.recentLines.slice(-4).join(' / ') || '(none yet)'}

Output strict JSON only: {"line": "<Devanagari>", "english": "<gloss>"}`,
    },
    { role: 'user', content: `Item: ${opts.itemNameLocal}. Phrase the ${opts.tactic} line at ₹${opts.price}.` },
  ];
}

export function buildSummaryMessages(opts: {
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
}): ChatMessage[] {
  const genderNote = opts.gender === 'female' ? 'feminine verb forms' : 'masculine verb forms';
  return [
    {
      role: 'system',
      content: `You are the customer's bargaining copilot, speaking ${LANG_NAME[opts.lang]} in Devanagari script, using ${genderNote}. Write two short, warm sentences summarising how the haggle went, to be spoken to the user (not the shopkeeper). Use the exact numbers given, do not invent any. Keep it natural and celebratory if it's a deal, or reassuring if the user walked away.

Facts: item ${opts.itemNameLocal}, vendor opened at ₹${opts.vendorOpen}, outcome ${opts.outcome}${
        opts.outcome === 'deal' ? `, final price ₹${opts.finalPrice}, saved ₹${opts.saved} (${opts.percentSaved}%)` : ''
      }, ${opts.rounds} rounds of bargaining, walk-away threat ${opts.threatUsed ? 'was' : 'was not'} used.

Output strict JSON only: {"line": "<two short Devanagari sentences>", "english": "<gloss>"}`,
    },
    { role: 'user', content: 'Summarise the haggle.' },
  ];
}

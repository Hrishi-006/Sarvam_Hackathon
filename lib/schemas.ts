import { z } from 'zod';

export const itemIdSchema = z.enum(['tshirt', 'hoodie', 'jeans']);
export const langSchema = z.enum(['hi-IN', 'mr-IN']);

export const customerStateSchema = z.object({
  round: z.number(),
  lastOffer: z.number().nullable(),
  vendorPrice: z.number().nullable(),
  priceHistory: z.array(z.number()),
  offerHistory: z.array(z.number()),
  stuck: z.number(),
  threatUsed: z.boolean(),
  done: z.boolean(),
  outcome: z.enum(['deal', 'walked']).nullable(),
  finalPrice: z.number().nullable(),
});

export const vendorTacticSchema = z.enum([
  'SPECIAL_RATE',
  'QUALITY',
  'BOHNI',
  'LOSS',
  'OFFENDED',
  'LAST_PRICE',
  'CALLBACK',
  'CLOSE',
  'GOODBYE',
]);

export const vendorStateSchema = z.object({
  round: z.number(),
  price: z.number(),
  lastPriceSaid: z.boolean(),
  calledBack: z.boolean(),
  mood: z.enum(['friendly', 'offended', 'pushy', 'desperate', 'happy', 'sad']),
  done: z.boolean(),
  outcome: z.enum(['deal', 'walked']).nullable(),
  finalPrice: z.number().nullable(),
});

export const customerDecisionSchema = z.object({
  action: z.enum(['ASK_PRICE', 'COUNTER', 'THREATEN_WALK', 'ACCEPT', 'DEAL', 'WALK_AWAY']),
  amount: z.number().nullable(),
  reasonEn: z.string(),
});

export const copilotTurnJsonSchema = z.object({
  itemId: itemIdSchema,
  lang: langSchema,
  state: customerStateSchema,
  mode: z.enum(['speak', 'whisper']),
  vendorText: z.string().optional(),
  history: z.array(z.string()).optional(),
  groundTruth: z
    .object({
      price: z.number().nullable(),
      saidLastPrice: z.boolean(),
      vendorAcceptedOffer: z.boolean(),
    })
    .optional(),
});

export const vendorTurnSchema = z.object({
  itemId: itemIdSchema,
  lang: langSchema,
  state: vendorStateSchema.nullable(),
  customerDecision: customerDecisionSchema.nullable(),
  customerLine: z.string().nullable().optional(),
  history: z.array(z.string()).optional(),
});

export const summarySchema = z.object({
  itemId: itemIdSchema,
  lang: langSchema,
  customerState: customerStateSchema,
  vendorOpen: z.number(),
});

export const ttsRequestSchema = z.object({
  text: z.string(),
  lang: langSchema,
  speaker: z.string(),
  pace: z.number().optional(),
});

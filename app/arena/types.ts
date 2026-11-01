import type { CustomerDecision, CustomerState, ItemId, Lang, VendorDecision, VendorState } from '@/lib/types';

export interface ArenaBubble {
  speaker: 'vendor' | 'customer';
  line: string;
  english: string;
  round: number;
  heardNote?: string;
}

export interface CopilotTurnResponse {
  transcript: string;
  heard: { price: number | null; saidLastPrice: boolean; vendorAcceptedOffer: boolean; tactic: string; englishGloss: string };
  decision: CustomerDecision;
  line: string;
  english: string;
  nextState: CustomerState;
  audio: { base64: string; mime: string };
  timings: Record<string, number>;
}

export interface VendorTurnResponse {
  decision: VendorDecision;
  line: string;
  english: string;
  nextState: VendorState;
  audio: { base64: string; mime: string };
  timings: Record<string, number>;
}

export interface SummaryResponse {
  stats: {
    itemNameLocal: string;
    vendorOpen: number;
    finalPrice: number;
    saved: number;
    percentSaved: number;
    rounds: number;
    threatUsed: boolean;
    outcome: 'deal' | 'walked';
  };
  line: string;
  english: string;
  audio: { base64: string; mime: string };
}

export interface ArenaConfig {
  itemId: ItemId;
  lang: Lang;
}

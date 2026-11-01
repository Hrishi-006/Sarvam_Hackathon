export type ItemId = 'tshirt' | 'hoodie' | 'jeans';
export type Lang = 'hi-IN' | 'mr-IN';
export type CopilotGender = 'female' | 'male';

export type CustomerAction =
  | 'ASK_PRICE'
  | 'COUNTER'
  | 'THREATEN_WALK'
  | 'ACCEPT'
  | 'DEAL'
  | 'WALK_AWAY';

export interface CustomerState {
  round: number;
  lastOffer: number | null;
  vendorPrice: number | null;
  priceHistory: number[];
  offerHistory: number[];
  stuck: number;
  threatUsed: boolean;
  done: boolean;
  outcome: 'deal' | 'walked' | null;
  finalPrice: number | null;
}

export type VendorTactic =
  | 'SPECIAL_RATE'
  | 'QUALITY'
  | 'BOHNI'
  | 'LOSS'
  | 'OFFENDED'
  | 'LAST_PRICE'
  | 'CALLBACK'
  | 'CLOSE'
  | 'GOODBYE';

export interface VendorHeard {
  price: number | null;
  saidLastPrice: boolean;
  vendorAcceptedOffer: boolean;
  tactic: VendorTactic | 'NONE';
  englishGloss: string;
}

export interface CustomerDecision {
  action: CustomerAction;
  amount: number | null;
  reasonEn: string;
}

export type VendorMood = 'friendly' | 'offended' | 'pushy' | 'desperate' | 'happy' | 'sad';

export interface VendorState {
  round: number;
  price: number;
  lastPriceSaid: boolean;
  calledBack: boolean;
  mood: VendorMood;
  done: boolean;
  outcome: 'deal' | 'walked' | null;
  finalPrice: number | null;
}

export interface VendorDecision {
  tactic: VendorTactic;
  price: number;
  mood: VendorMood;
  isFinal: boolean;
}

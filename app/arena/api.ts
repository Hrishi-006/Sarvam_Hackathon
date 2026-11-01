import type { CustomerDecision, CustomerState, ItemId, Lang, VendorState } from '@/lib/types';
import type { CopilotTurnResponse, SummaryResponse, VendorTurnResponse } from './types';

export async function fetchVendorTurn(opts: {
  itemId: ItemId;
  lang: Lang;
  state: VendorState | null;
  customerDecision: CustomerDecision | null;
  customerLine: string | null;
  history: string[];
  pace?: number;
}): Promise<VendorTurnResponse> {
  const res = await fetch('/api/vendor/turn', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error('vendor turn failed');
  return res.json();
}

export async function fetchCopilotTurn(opts: {
  itemId: ItemId;
  lang: Lang;
  state: CustomerState;
  mode: 'speak' | 'whisper';
  audioBlob?: Blob | null;
  vendorText?: string;
  groundTruth?: { price: number | null; saidLastPrice: boolean; vendorAcceptedOffer: boolean };
  history: string[];
  pace?: number;
}): Promise<CopilotTurnResponse> {
  if (opts.audioBlob && opts.audioBlob.size > 0) {
    const form = new FormData();
    form.append(
      'payload',
      JSON.stringify({
        itemId: opts.itemId,
        lang: opts.lang,
        state: opts.state,
        mode: opts.mode,
        groundTruth: opts.groundTruth,
        history: opts.history,
        pace: opts.pace,
      }),
    );
    form.append('audio', opts.audioBlob, 'vendor.wav');
    const res = await fetch('/api/copilot/turn', { method: 'POST', body: form });
    if (!res.ok) throw new Error('copilot turn failed');
    return res.json();
  }

  const res = await fetch('/api/copilot/turn', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      itemId: opts.itemId,
      lang: opts.lang,
      state: opts.state,
      mode: opts.mode,
      vendorText: opts.vendorText,
      groundTruth: opts.groundTruth,
      history: opts.history,
      pace: opts.pace,
    }),
  });
  if (!res.ok) throw new Error('copilot turn failed');
  return res.json();
}

export async function fetchSummary(opts: {
  itemId: ItemId;
  lang: Lang;
  customerState: CustomerState;
  vendorOpen: number;
}): Promise<SummaryResponse> {
  const res = await fetch('/api/summary', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error('summary failed');
  return res.json();
}

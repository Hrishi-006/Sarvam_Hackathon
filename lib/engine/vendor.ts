import { VENDOR_STALL_MULTIPLIER } from '../config';
import { roundTo10 } from './customer';
import type { Item } from '../items';
import type { CustomerDecision, VendorDecision, VendorState } from '../types';

const P = [0, 0.4, 0.75, 1.0];

export function initialVendorState(item: Item): VendorState {
  return {
    round: 0,
    price: item.vendor.open,
    lastPriceSaid: false,
    calledBack: false,
    mood: 'friendly',
    done: false,
    outcome: null,
    finalPrice: null,
  };
}

export function decideVendor(
  item: Item,
  state: VendorState,
  customerDecision: CustomerDecision | null,
): { decision: VendorDecision; nextState: VendorState } {
  const { open, floor } = item.vendor;
  const stall = roundTo10(floor * VENDOR_STALL_MULTIPLIER);
  const next: VendorState = { ...state };

  const finish = (decision: VendorDecision, outcome: 'deal' | 'walked', finalPrice: number) => {
    next.price = decision.price;
    next.mood = decision.mood;
    next.done = true;
    next.outcome = outcome;
    next.finalPrice = finalPrice;
    return { decision, nextState: next };
  };

  const ongoing = (decision: VendorDecision) => {
    next.price = decision.price;
    next.mood = decision.mood;
    next.round += 1;
    return { decision, nextState: next };
  };

  // Opening move.
  if (customerDecision == null || customerDecision.action === 'ASK_PRICE') {
    return ongoing({ tactic: 'SPECIAL_RATE', price: open, mood: 'friendly', isFinal: false });
  }

  // Customer accepted / closed the deal.
  if (customerDecision.action === 'ACCEPT' || customerDecision.action === 'DEAL') {
    const price = customerDecision.amount ?? state.price;
    return finish({ tactic: 'CLOSE', price, mood: 'happy', isFinal: true }, 'deal', price);
  }

  // Customer walked away.
  if (customerDecision.action === 'WALK_AWAY') {
    return finish({ tactic: 'GOODBYE', price: state.price, mood: 'sad', isFinal: true }, 'walked', state.price);
  }

  // Customer threatened to walk.
  if (customerDecision.action === 'THREATEN_WALK') {
    const offer = customerDecision.amount ?? 0;
    next.calledBack = true;
    if (offer >= floor) {
      return ongoing({ tactic: 'CALLBACK', price: offer, mood: 'desperate', isFinal: false });
    }
    const price = Math.max(floor, roundTo10(floor + (state.price - floor) * 0.2));
    return ongoing({ tactic: 'CALLBACK', price, mood: 'desperate', isFinal: false });
  }

  // Customer countered.
  if (customerDecision.action === 'COUNTER') {
    const offer = customerDecision.amount ?? 0;

    if (offer >= floor && offer >= state.price * 0.85) {
      return finish({ tactic: 'CLOSE', price: offer, mood: 'happy', isFinal: true }, 'deal', offer);
    }

    if (state.lastPriceSaid) {
      return ongoing({ tactic: 'LAST_PRICE', price: state.price, mood: 'pushy', isFinal: false });
    }

    const r = state.round + 1;
    const offended = offer < state.price * 0.3;
    const idx = Math.min(r, 3);
    const progress = offended ? (P[idx - 1] + P[idx]) / 2 : P[idx];
    let newPrice = Math.max(stall, roundTo10(open - (open - stall) * progress));
    newPrice = Math.min(newPrice, state.price);

    if (offended) {
      return ongoing({ tactic: 'OFFENDED', price: newPrice, mood: 'offended', isFinal: false });
    }
    if (newPrice === stall) {
      next.lastPriceSaid = true;
      return ongoing({ tactic: 'LAST_PRICE', price: newPrice, mood: 'pushy', isFinal: false });
    }
    if (r === 1) {
      return ongoing({ tactic: 'QUALITY', price: newPrice, mood: 'friendly', isFinal: false });
    }
    if (r === 2) {
      return ongoing({ tactic: 'BOHNI', price: newPrice, mood: 'friendly', isFinal: false });
    }
    return ongoing({ tactic: 'LOSS', price: newPrice, mood: 'friendly', isFinal: false });
  }

  // Should never reach here for a well-formed CustomerDecision.
  return ongoing({ tactic: 'SPECIAL_RATE', price: state.price, mood: state.mood, isFinal: false });
}

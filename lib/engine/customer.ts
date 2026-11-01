import type { Item } from '../items';
import type { CustomerDecision, CustomerState, VendorHeard } from '../types';

export function roundTo10(n: number): number {
  return Math.round(n / 10) * 10;
}

const SCHEDULE = [0, 0.35, 0.6, 0.8, 1.0];

export function initialCustomerState(): CustomerState {
  return {
    round: 0,
    lastOffer: null,
    vendorPrice: null,
    priceHistory: [],
    offerHistory: [],
    stuck: 0,
    threatUsed: false,
    done: false,
    outcome: null,
    finalPrice: null,
  };
}

export function decideCustomer(
  item: Item,
  state: CustomerState,
  heard: VendorHeard,
): { decision: CustomerDecision; nextState: CustomerState } {
  const { start, good, max } = item.customer;
  const next: CustomerState = {
    ...state,
    priceHistory: [...state.priceHistory],
    offerHistory: [...state.offerHistory],
  };

  const finish = (
    decision: CustomerDecision,
    outcome: 'deal' | 'walked',
    finalPrice: number | null,
  ) => {
    next.done = true;
    next.outcome = outcome;
    next.finalPrice = finalPrice;
    if (decision.amount != null) next.offerHistory.push(decision.amount);
    return { decision, nextState: next };
  };

  const ongoing = (decision: CustomerDecision) => {
    next.round += 1;
    if (decision.amount != null) next.offerHistory.push(decision.amount);
    return { decision, nextState: next };
  };

  // 1. Vendor accepted our offer.
  if (heard.vendorAcceptedOffer && state.lastOffer != null) {
    return finish(
      { action: 'DEAL', amount: state.lastOffer, reasonEn: `He accepted your offer of ₹${state.lastOffer}. Deal!` },
      'deal',
      state.lastOffer,
    );
  }

  // 2. Figure out the price in play.
  const price = heard.price ?? state.vendorPrice;
  if (price == null) {
    return ongoing({ action: 'ASK_PRICE', amount: null, reasonEn: 'No price heard yet — ask what he wants for it.' });
  }

  // 3. Stuck tracking.
  if (state.vendorPrice != null && price >= state.vendorPrice) {
    next.stuck += 1;
  }
  next.priceHistory.push(price);
  next.vendorPrice = price;

  // 4. Good price — take it.
  if (price <= good) {
    return finish(
      { action: 'ACCEPT', amount: price, reasonEn: `₹${price} is at or below your target of ₹${good} — take it.` },
      'deal',
      price,
    );
  }

  // 5. After a threat has already been used.
  if (state.threatUsed) {
    if (price <= max) {
      return finish(
        { action: 'ACCEPT', amount: price, reasonEn: `He came down to ₹${price}, within your ₹${max} limit — take it.` },
        'deal',
        price,
      );
    }
    return finish(
      { action: 'WALK_AWAY', amount: null, reasonEn: `Still ₹${price}, above your ₹${max} limit after the threat — walk away.` },
      'walked',
      null,
    );
  }

  // 6. Pressure point.
  if (heard.saidLastPrice || next.stuck >= 1 || state.round >= 4) {
    if (price <= max && state.round >= 4) {
      return finish(
        { action: 'ACCEPT', amount: price, reasonEn: `₹${price} is within your ₹${max} limit and we're deep into the haggle — take it.` },
        'deal',
        price,
      );
    }
    next.threatUsed = true;
    next.lastOffer = good;
    return ongoing({
      action: 'THREATEN_WALK',
      amount: good,
      reasonEn: `He said "last price" at ₹${price} — above your ₹${max} limit. Time to threaten to walk.`,
    });
  }

  // 7. Counter.
  const target = start + (good - start) * SCHEDULE[Math.min(state.round, 4)];
  let offer = roundTo10(Math.max(target, state.lastOffer ?? 0));
  offer = Math.min(offer, good, price - 10);
  next.lastOffer = offer;
  return ongoing({
    action: 'COUNTER',
    amount: offer,
    reasonEn: `He's at ₹${price}. Counter with ₹${offer} to keep working him down toward ₹${good}.`,
  });
}

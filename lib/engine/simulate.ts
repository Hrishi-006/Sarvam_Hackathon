import type { Item } from '../items';
import type { CustomerDecision, CustomerState, VendorDecision, VendorHeard, VendorState } from '../types';
import { decideCustomer, initialCustomerState } from './customer';
import { decideVendor, initialVendorState } from './vendor';

export interface SimTurn {
  speaker: 'vendor' | 'customer';
  vendorDecision?: VendorDecision;
  customerDecision?: CustomerDecision;
}

export interface SimResult {
  turns: SimTurn[];
  customerState: CustomerState;
  vendorState: VendorState;
}

function toHeard(vendorDecision: VendorDecision, customerDecision: CustomerDecision | null): VendorHeard {
  const vendorAcceptedOffer =
    vendorDecision.tactic === 'CLOSE' ||
    (vendorDecision.tactic === 'CALLBACK' &&
      customerDecision?.amount != null &&
      vendorDecision.price === customerDecision.amount);
  return {
    price: vendorDecision.price,
    saidLastPrice: vendorDecision.tactic === 'LAST_PRICE',
    vendorAcceptedOffer,
    tactic: vendorDecision.tactic,
    englishGloss: '',
  };
}

export function simulate(item: Item, maxTurns = 20): SimResult {
  let customerState = initialCustomerState();
  let vendorState = initialVendorState(item);
  const turns: SimTurn[] = [];

  let lastCustomerDecision: CustomerDecision | null = null;
  let safety = 0;

  while (!vendorState.done && safety < maxTurns) {
    safety += 1;
    const { decision: vendorDecision, nextState: nextVendorState } = decideVendor(
      item,
      vendorState,
      lastCustomerDecision,
    );
    vendorState = nextVendorState;
    turns.push({ speaker: 'vendor', vendorDecision });

    if (vendorState.done) break;

    const heard = toHeard(vendorDecision, lastCustomerDecision);
    const { decision: customerDecision, nextState: nextCustomerState } = decideCustomer(
      item,
      customerState,
      heard,
    );
    customerState = nextCustomerState;
    turns.push({ speaker: 'customer', customerDecision });
    lastCustomerDecision = customerDecision;
  }

  return { turns, customerState, vendorState };
}

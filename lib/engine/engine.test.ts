import { describe, expect, it } from 'vitest';
import { ITEMS, ITEM_IDS } from '../items';
import { decideCustomer, initialCustomerState, roundTo10 } from './customer';
import { decideVendor, initialVendorState } from './vendor';
import { simulate } from './simulate';
import type { CustomerState, VendorHeard } from '../types';

describe('roundTo10', () => {
  it('rounds to the nearest 10', () => {
    expect(roundTo10(252.5)).toBe(250);
    expect(roundTo10(478.5)).toBe(480);
    expect(roundTo10(255)).toBe(260);
  });
});

describe('happy path simulation', () => {
  for (const id of ITEM_IDS) {
    it(`${id} ends at the target price`, () => {
      const item = ITEMS[id];
      const { vendorState, customerState } = simulate(item);
      expect(vendorState.outcome).toBe('deal');
      expect(vendorState.finalPrice).toBe(item.customer.good);
      expect(customerState.outcome).toBe('deal');
      expect(customerState.finalPrice).toBe(item.customer.good);
    });
  }
});

describe('customer engine edge cases', () => {
  const item = ITEMS.tshirt;

  it('asks for the price when none has been heard', () => {
    const state = initialCustomerState();
    const heard: VendorHeard = { price: null, saidLastPrice: false, vendorAcceptedOffer: false, tactic: 'NONE', englishGloss: '' };
    const { decision } = decideCustomer(item, state, heard);
    expect(decision.action).toBe('ASK_PRICE');
  });

  it('threatens to walk when the vendor repeats the same price', () => {
    const state: CustomerState = { ...initialCustomerState(), round: 1, vendorPrice: 500 };
    const heard: VendorHeard = { price: 500, saidLastPrice: false, vendorAcceptedOffer: false, tactic: 'NONE', englishGloss: '' };
    const { decision } = decideCustomer(item, state, heard);
    expect(decision.action).toBe('THREATEN_WALK');
    expect(decision.amount).toBe(item.customer.good);
  });

  it('walks away if still above max after the threat', () => {
    const state: CustomerState = { ...initialCustomerState(), round: 5, threatUsed: true, vendorPrice: 500 };
    const heard: VendorHeard = { price: 500, saidLastPrice: false, vendorAcceptedOffer: false, tactic: 'NONE', englishGloss: '' };
    const { decision } = decideCustomer(item, state, heard);
    expect(decision.action).toBe('WALK_AWAY');
  });

  it('accepts immediately if the vendor drops to the target price early', () => {
    const state = initialCustomerState();
    const heard: VendorHeard = { price: 300, saidLastPrice: false, vendorAcceptedOffer: false, tactic: 'NONE', englishGloss: '' };
    const { decision } = decideCustomer(item, state, heard);
    expect(decision.action).toBe('ACCEPT');
    expect(decision.amount).toBe(300);
  });

  it('accepts when the vendor comes within the limit after the threat', () => {
    const state: CustomerState = { ...initialCustomerState(), round: 5, threatUsed: true, vendorPrice: 500 };
    const heard: VendorHeard = { price: 380, saidLastPrice: false, vendorAcceptedOffer: false, tactic: 'NONE', englishGloss: '' };
    const { decision } = decideCustomer(item, state, heard);
    expect(decision.action).toBe('ACCEPT');
    expect(decision.amount).toBe(380);
  });
});

describe('invariants across simulated games', () => {
  for (const id of ITEM_IDS) {
    it(`${id}: customer never offers above good before a threat`, () => {
      const item = ITEMS[id];
      const { turns } = simulate(item);
      let threatUsed = false;
      for (const t of turns) {
        if (t.speaker !== 'customer' || !t.customerDecision) continue;
        if (t.customerDecision.action === 'COUNTER') {
          expect(threatUsed).toBe(false);
          expect(t.customerDecision.amount!).toBeLessThanOrEqual(item.customer.good);
        }
        if (t.customerDecision.action === 'THREATEN_WALK') threatUsed = true;
      }
    });

    it(`${id}: customer never accepts above max`, () => {
      const item = ITEMS[id];
      const { turns } = simulate(item);
      for (const t of turns) {
        if (t.speaker === 'customer' && t.customerDecision?.action === 'ACCEPT') {
          expect(t.customerDecision.amount!).toBeLessThanOrEqual(item.customer.max);
        }
      }
    });

    it(`${id}: customer offers never decrease`, () => {
      const item = ITEMS[id];
      const { customerState } = simulate(item);
      const offers = customerState.offerHistory;
      for (let i = 1; i < offers.length; i++) {
        expect(offers[i]).toBeGreaterThanOrEqual(offers[i - 1]);
      }
    });

    it(`${id}: WALK_AWAY only happens after THREATEN_WALK`, () => {
      const item = ITEMS[id];
      const { turns } = simulate(item);
      let threatUsed = false;
      for (const t of turns) {
        if (t.speaker !== 'customer' || !t.customerDecision) continue;
        if (t.customerDecision.action === 'WALK_AWAY') expect(threatUsed).toBe(true);
        if (t.customerDecision.action === 'THREATEN_WALK') threatUsed = true;
      }
    });

    it(`${id}: vendor price never goes below floor and never increases`, () => {
      const item = ITEMS[id];
      const { turns } = simulate(item);
      let lastPrice = Infinity;
      for (const t of turns) {
        if (t.speaker !== 'vendor' || !t.vendorDecision) continue;
        expect(t.vendorDecision.price).toBeGreaterThanOrEqual(item.vendor.floor);
        expect(t.vendorDecision.price).toBeLessThanOrEqual(lastPrice);
        lastPrice = t.vendorDecision.price;
      }
    });
  }
});

describe('vendor engine', () => {
  const item = ITEMS.tshirt;

  it('opens at the configured open price', () => {
    const state = initialVendorState(item);
    const { decision } = decideVendor(item, state, null);
    expect(decision.tactic).toBe('SPECIAL_RATE');
    expect(decision.price).toBe(item.vendor.open);
  });

  it('closes when the customer accepts', () => {
    const state = initialVendorState(item);
    const { decision } = decideVendor(item, state, { action: 'ACCEPT', amount: 350, reasonEn: '' });
    expect(decision.tactic).toBe('CLOSE');
    expect(decision.isFinal).toBe(true);
    expect(decision.price).toBe(350);
  });

  it('says goodbye when the customer walks away', () => {
    const state = initialVendorState(item);
    const { decision } = decideVendor(item, state, { action: 'WALK_AWAY', amount: null, reasonEn: '' });
    expect(decision.tactic).toBe('GOODBYE');
    expect(decision.isFinal).toBe(true);
  });
});

import { ITEMS, ITEM_IDS } from '../lib/items';
import { simulate } from '../lib/engine/simulate';

for (const id of ITEM_IDS) {
  const item = ITEMS[id];
  console.log(`\n=== ${item.name.en} (open ₹${item.vendor.open}, target ₹${item.customer.good}, limit ₹${item.customer.max}) ===`);
  const { turns, customerState, vendorState } = simulate(item);

  for (const turn of turns) {
    if (turn.speaker === 'vendor' && turn.vendorDecision) {
      const d = turn.vendorDecision;
      console.log(`  vendor   [${d.tactic}] ₹${d.price}  (mood: ${d.mood}${d.isFinal ? ', final' : ''})`);
    }
    if (turn.speaker === 'customer' && turn.customerDecision) {
      const d = turn.customerDecision;
      console.log(`  customer [${d.action}] ${d.amount != null ? `₹${d.amount}` : ''}  — ${d.reasonEn}`);
    }
  }

  console.log(
    `  => outcome: ${vendorState.outcome ?? customerState.outcome}, final price: ${
      vendorState.finalPrice ?? customerState.finalPrice
    }`,
  );
}

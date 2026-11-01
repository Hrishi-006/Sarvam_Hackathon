# The Haggler
Link: https://sarvam-project-tawny.vercel.app/
A voice bargaining copilot for street markets, starting with Colaba Causeway,
Mumbai. Colaba has two prices: one for locals, one for everyone else. The
Haggler gets everyone the local price.

Hold up your phone while the shopkeeper talks. It transcribes him (Saaras
v3), extracts the price and tactic (Sarvam-105B), decides the next move with
a **deterministic price engine written in code**, phrases that move in
Hindi or Marathi (Sarvam-105B), and speaks it out loud (Bulbul v3).

**The LLM speaks. Code decides the money.** Prices and strategy are
deterministic; the LLM only understands and phrases. That makes the copilot
impossible to jailbreak into overpaying, and every demo run repeatable.

An AI shopkeeper ("Ramesh bhai") exists only to demo AI-vs-AI bargaining on
stage at `/arena`. The real product, for the customer, is at `/copilot`.

Will be updated with OCR to better predict a just value.
## Architecture

```
Shopkeeper's voice
  -> Saaras v3           (speech-to-text)
  -> Sarvam-105B          (understand: price + tactic)
  -> price engine (code)  (decide: counter / threaten / accept / walk)
  -> Sarvam-105B          (phrase the move, Hindi/Marathi)
  -> Bulbul v3            (text-to-speech)
  -> spoken reply
```

All Sarvam calls happen server-side in Next.js route handlers
(`app/api/**`) — the API key never reaches the client. Client holds all
bargaining state as plain JSON and sends it with each request; the server
is stateless.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in SARVAM_API_KEY
npm run smoke                # proves the full voice loop + API key in one command
npm run sim                  # prints a full text-only haggle simulation for each item
npm test                     # engine unit tests
npm run dev                  # http://localhost:3000
```

## Price board

| Item     | Your opening offer | Target | Walk-away limit |
| -------- | ------------------- | ------ | ---------------- |
| T-shirt  | ₹200                | ₹350   | ₹400             |
| Hoodie   | ₹300                | ₹350   | ₹450             |
| Jeans    | ₹500                | ₹600   | ₹700             |

(Vendor opening quotes and floors are demo-only tunables in `lib/items.ts`.)

## Stage demo script (3 minutes)

1. **20s — landing page.** "Colaba has a local price and a tourist price.
   The Haggler gets everyone the local price."
2. **90s — `/arena`, T-shirt, Hindi.** Ramesh bhai opens at ₹800, gets
   offended at a lowball counter, pulls "bohni nahi hui", says "last price
   ₹480". The copilot threatens to walk. "Arre ruko ruko!" Deal at ₹350.
   Scorecard: ₹450 saved.
3. **40s — `/copilot` on a phone.** A teammate or judge plays the
   shopkeeper live in Marathi; the phone answers him.
4. **30s — "LLM speaks, code decides" section.** Why it can't be talked
   into overpaying, and that the vendor is demo-only — the product is for
   the customer.

## Deploy

```bash
npx vercel
```

Set `SARVAM_API_KEY` in the Vercel project's environment variables (Project
Settings → Environment Variables). All API routes already declare
`runtime = 'nodejs'` and `maxDuration = 30`.

See `DECISIONS.md` for build-time decisions, including where the live
Sarvam docs disagreed with early assumptions.

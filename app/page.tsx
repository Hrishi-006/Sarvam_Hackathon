import Link from 'next/link';
import { ITEM_IDS, ITEMS } from '@/lib/items';
import { Nav } from './components/Nav';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-[var(--border)]">
          <div className="h-1.5 w-full bg-[repeating-linear-gradient(45deg,var(--taxi)_0,var(--taxi)_14px,var(--ink)_14px,var(--ink)_28px)]" />
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
            <div>
              <span className="inline-block rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-medium text-[var(--ink-soft)]">
                Built on Sarvam AI · हिंदी · मराठी
              </span>
              <h1 className="font-display mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
                Colaba ka local price. Ab sabke liye.
              </h1>
              <p className="devanagari-display mt-3 text-2xl text-[var(--teal)]">मोल-भाव, अब आपके फ़ोन से।</p>
              <p className="mt-5 max-w-lg text-[var(--ink-soft)]">
                The Haggler is a bargaining copilot for street markets. Hold up your phone while the
                shopkeeper talks. It listens, works out the right counter-offer, and says it back in
                Hindi or Marathi. It even knows when to walk away.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/copilot"
                  className="min-h-12 rounded-full bg-[var(--chilli)] px-6 py-3 font-medium text-white transition-transform hover:scale-[1.02]"
                >
                  Start bargaining
                </Link>
                <Link
                  href="/arena"
                  className="min-h-12 rounded-full border border-[var(--border)] bg-[var(--card)] px-6 py-3 font-medium transition-transform hover:scale-[1.02]"
                >
                  Watch AI vs AI
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <p className="text-xs font-medium text-[var(--ink-soft)]">Live haggle · T-shirt</p>
              <div className="mt-4 space-y-3 text-lg">
                <p className="flex items-center justify-between">
                  <span className="line-through text-[var(--ink-soft)]">₹800</span>
                  <span className="text-xs text-[var(--ink-soft)]">opening quote</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="font-medium text-[var(--marigold)]">₹480 — last price</span>
                  <span className="text-xs text-[var(--ink-soft)]">vendor holds firm</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="rounded-full bg-[var(--chilli)]/10 px-2 py-1 text-sm font-medium text-[var(--chilli)]">
                    threatened to walk away
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="font-bold text-[var(--leaf)]">₹350 ✅ Deal</span>
                  <span className="text-xs text-[var(--ink-soft)]">saved ₹450</span>
                </p>
              </div>
              <div className="mt-5 flex items-center gap-1.5">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-[var(--teal)]"
                    style={{ height: `${8 + ((i * 7) % 20)}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            The two-price problem
          </h2>
          <p className="mt-4 max-w-2xl text-[var(--ink-soft)]">
            Colaba Causeway quotes one price to locals and another to everyone else. Tourists, people
            new to Mumbai, people who don&apos;t speak Hindi or Marathi, and people who just hate
            confrontation pay the first price.
          </p>
          <p className="mt-4 text-xl font-medium">
            Opening quote <span className="line-through text-[var(--ink-soft)]">₹800</span> · Local
            price <span className="text-[var(--leaf)]">₹350</span>
          </p>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--card)]/50 py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              <Step
                title="Pick the item"
                body="T-shirt, hoodie or jeans. Your target and walk-away price load automatically."
              />
              <Step
                title="Let it listen"
                body={'Hold the button while the shopkeeper talks. It catches the price and the tactic: "last price", "bohni nahi hui", "loss ho jayega".'}
              />
              <Step
                title="Let it answer"
                body="It says the counter-offer out loud in Hindi or Marathi, or shows it for you to say. When he won't move, it threatens to walk away — and usually he calls you back."
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            The LLM speaks. Code decides the money.
          </h2>
          <p className="mt-4 max-w-2xl text-[var(--ink-soft)]">
            Prices come from a fixed price board. The bargaining strategy is deterministic code — not
            a prompt. The AI never reveals your limit, never invents a fake competitor price, and
            can&apos;t be talked into overpaying. That makes every demo run repeatable.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
            {[
              'Shopkeeper’s voice',
              'Saaras v3',
              'Sarvam-105B (understand)',
              'Price engine (decide)',
              'Sarvam-105B (phrase)',
              'Bulbul v3',
              'Spoken reply',
            ].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2 whitespace-nowrap">
                <span
                  className={`rounded-full px-3 py-1.5 ${
                    step.startsWith('Price engine') ? 'bg-[var(--teal)] text-white font-medium' : 'bg-[var(--paper)]'
                  }`}
                >
                  {step}
                </span>
                {i < arr.length - 1 && <span className="text-[var(--ink-soft)]">→</span>}
              </span>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--card)]/50 py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Powered by Sarvam</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              <Step title="Saaras v3" body="Hears noisy, code-mixed Mumbai street speech in Hindi and Marathi." />
              <Step title="Sarvam-105B" body="Understands bargaining tactics and talks like a local." />
              <Step title="Bulbul v3" body="Says it out loud, naturally, in Hindi or Marathi." />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Today&apos;s price board
          </h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--ink-soft)]">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Your opening offer</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Walk-away limit</th>
                </tr>
              </thead>
              <tbody>
                {ITEM_IDS.map((id) => {
                  const item = ITEMS[id];
                  return (
                    <tr key={id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {item.emoji} {item.name.en}
                      </td>
                      <td className="px-4 py-3">₹{item.customer.start}</td>
                      <td className="px-4 py-3 text-[var(--leaf)]">₹{item.customer.good}</td>
                      <td className="px-4 py-3 text-[var(--chilli)]">₹{item.customer.max}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] px-4 py-8 text-sm text-[var(--ink-soft)] sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p>
            Demo note: the shopkeeper in Arena mode is an AI built for the demo. The product is for the
            customer.
          </p>
          <p className="mt-1">Made at a hackathon with Sarvam AI.</p>
        </div>
      </footer>
    </div>
  );
}

function Step({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">{body}</p>
    </div>
  );
}

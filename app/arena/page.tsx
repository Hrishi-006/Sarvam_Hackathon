'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ITEM_IDS, ITEMS } from '@/lib/items';
import type {
  CustomerDecision,
  CustomerState,
  ItemId,
  Lang,
  VendorDecision,
  VendorMood,
  VendorState,
} from '@/lib/types';
import { initialCustomerState } from '@/lib/engine/customer';
import { AudioBlockedError, base64ToBlob, playBase64, unlockAudio } from '@/lib/audio';
import { Nav } from '../components/Nav';
import { fetchCopilotTurn, fetchSummary, fetchVendorTurn } from './api';
import { PriceChart, type PricePoint } from './PriceChart';
import type { CopilotTurnResponse, SummaryResponse } from './types';

const MOOD_EMOJI: Record<VendorMood, string> = {
  friendly: '😊',
  offended: '😤',
  pushy: '😏',
  desperate: '😰',
  happy: '🤝',
  sad: '😢',
};

interface Bubble {
  id: string;
  speaker: 'vendor' | 'customer';
  line: string;
  english: string;
  note?: string;
}

function computeGroundTruth(vendorDecision: VendorDecision, lastCustomerDecision: CustomerDecision | null) {
  const vendorAcceptedOffer =
    vendorDecision.tactic === 'CLOSE' ||
    (vendorDecision.tactic === 'CALLBACK' &&
      lastCustomerDecision?.amount != null &&
      vendorDecision.price === lastCustomerDecision.amount);
  return {
    price: vendorDecision.price,
    saidLastPrice: vendorDecision.tactic === 'LAST_PRICE',
    vendorAcceptedOffer,
  };
}

function pipelineNote(resp: CopilotTurnResponse, vendorPrice: number): string {
  const match = resp.heard.price === vendorPrice;
  const lastPrice = resp.heard.saidLastPrice ? " · 'last price'" : '';
  return `Heard via Saaras: ₹${resp.heard.price ?? '—'}${lastPrice} ${match ? '✅' : '⚠️'}`;
}

export default function ArenaPage() {
  const [itemId, setItemId] = useState<ItemId>('tshirt');
  const [lang, setLang] = useState<Lang>('hi-IN');
  const [speed, setSpeed] = useState<1.0 | 1.2>(1.0);
  const [phase, setPhase] = useState<'setup' | 'running' | 'done'>('setup');
  const [paused, setPaused] = useState(false);
  const [thinking, setThinking] = useState<'vendor' | 'customer' | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [pricePoints, setPricePoints] = useState<PricePoint[]>([]);
  const [vendorMood, setVendorMood] = useState<VendorMood>('friendly');
  const [vendorTactic, setVendorTactic] = useState<string>('—');
  const [customerAction, setCustomerAction] = useState<string>('—');
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const [timings, setTimings] = useState<Record<string, number>>({});
  const [audioBlocked, setAudioBlocked] = useState(false);

  async function safePlay(base64: string, mime: string) {
    try {
      await playBase64(base64, mime);
    } catch (err) {
      if (err instanceof AudioBlockedError) setAudioBlocked(true);
    }
  }

  const pausedRef = useRef(paused);
  const speedRef = useRef(speed);
  const runIdRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') setDevOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [bubbles]);

  async function waitWhilePaused(runId: number) {
    while (pausedRef.current && runIdRef.current === runId) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  function appendBubble(b: Omit<Bubble, 'id'>) {
    setBubbles((prev) => [...prev, { ...b, id: `${prev.length}-${Date.now()}` }]);
  }

  function pushPricePoint(p: PricePoint) {
    setPricePoints((prev) => [...prev, p]);
  }

  async function startArena() {
    const runId = ++runIdRef.current;
    setBubbles([]);
    setPricePoints([]);
    setSummary(null);
    setTimings({});
    setPhase('running');
    const ok = await unlockAudio();
    setAudioBlocked(!ok);

    const item = ITEMS[itemId];
    let vendorState: VendorState | null = null;
    let customerState: CustomerState = initialCustomerState();
    let lastCustomerDecision: CustomerDecision | null = null;
    let lastCustomerLine: string | null = null;
    let history: string[] = [];
    let utterances = 0;

    const pushHistory = (line: string) => {
      history = [...history, line].slice(-6);
    };

    try {
      while (utterances < 14 && runIdRef.current === runId) {
        await waitWhilePaused(runId);
        if (runIdRef.current !== runId) return;

        setThinking('vendor');
        const vendorResp = await fetchVendorTurn({
          itemId,
          lang,
          state: vendorState,
          customerDecision: lastCustomerDecision,
          customerLine: lastCustomerLine,
          history,
          pace: speedRef.current,
        });
        if (runIdRef.current !== runId) return;
        utterances += 1;
        vendorState = vendorResp.nextState;
        setThinking(null);
        setVendorMood(vendorResp.decision.mood);
        setVendorTactic(vendorResp.decision.tactic);
        setTimings((t) => ({ ...t, [`vendor-${utterances}`]: vendorResp.timings.phrase ?? 0 }));
        appendBubble({ speaker: 'vendor', line: vendorResp.line, english: vendorResp.english });
        pushHistory(vendorResp.line);
        pushPricePoint({
          turn: utterances,
          vendor: vendorResp.decision.price,
          customer: null,
          threat: lastCustomerDecision?.action === 'THREATEN_WALK',
        });

        if (vendorState.done) {
          await safePlay(vendorResp.audio.base64, vendorResp.audio.mime);
          break;
        }

        setThinking('customer');
        const vendorBlob = base64ToBlob(vendorResp.audio.base64, vendorResp.audio.mime);
        const groundTruth = computeGroundTruth(vendorResp.decision, lastCustomerDecision);

        const [, copilotResp] = await Promise.all([
          safePlay(vendorResp.audio.base64, vendorResp.audio.mime),
          fetchCopilotTurn({
            itemId,
            lang,
            state: customerState,
            mode: 'speak',
            audioBlob: vendorBlob,
            groundTruth,
            history,
            pace: speedRef.current,
          }),
        ]);
        if (runIdRef.current !== runId) return;
        utterances += 1;
        customerState = copilotResp.nextState;
        lastCustomerDecision = copilotResp.decision;
        lastCustomerLine = copilotResp.line;
        setThinking(null);
        setCustomerAction(copilotResp.decision.action);
        setTimings((t) => ({ ...t, [`customer-${utterances}`]: copilotResp.timings.phrase ?? 0 }));
        appendBubble({
          speaker: 'customer',
          line: copilotResp.line,
          english: copilotResp.english,
          note: pipelineNote(copilotResp, vendorResp.decision.price),
        });
        pushHistory(copilotResp.line);
        pushPricePoint({
          turn: utterances,
          vendor: null,
          customer: copilotResp.decision.amount,
          threat: copilotResp.decision.action === 'THREATEN_WALK',
        });

        await waitWhilePaused(runId);
        if (runIdRef.current !== runId) return;
        setThinking('vendor');
        await safePlay(copilotResp.audio.base64, copilotResp.audio.mime);
      }

      if (runIdRef.current !== runId) return;
      setThinking(null);
      setPhase('done');

      const summaryResp = await fetchSummary({
        itemId,
        lang,
        customerState,
        vendorOpen: item.vendor.open,
      });
      if (runIdRef.current !== runId) return;
      setSummary(summaryResp);
      await safePlay(summaryResp.audio.base64, summaryResp.audio.mime);
    } catch (err) {
      console.error('[arena] run failed', err);
      setThinking(null);
    }
  }

  function resetArena() {
    runIdRef.current += 1;
    setPhase('setup');
    setBubbles([]);
    setPricePoints([]);
    setSummary(null);
    setPaused(false);
    setThinking(null);
  }

  const item = ITEMS[itemId];

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Arena: Ramesh bhai vs The Haggler
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--ink-soft)]">
            The shopkeeper is an AI built for this demo. Watch the copilot handle him.
          </p>
        </div>

        {phase === 'setup' && (
          <div className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div>
              <p className="mb-2 text-sm font-medium">Item</p>
              <div className="flex flex-wrap gap-3">
                {ITEM_IDS.map((id) => (
                  <button
                    key={id}
                    onClick={() => setItemId(id)}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left transition-colors ${
                      itemId === id
                        ? 'border-[var(--teal)] bg-[var(--teal)]/10'
                        : 'border-[var(--border)] hover:bg-[var(--paper)]'
                    }`}
                  >
                    <span className="text-2xl">{ITEMS[id].emoji}</span>
                    <span>
                      <span className="block font-medium">{ITEMS[id].name.en}</span>
                      <span className="block text-xs text-[var(--ink-soft)]">
                        target ₹{ITEMS[id].customer.good}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Language</p>
              <div className="flex gap-2">
                {(['hi-IN', 'mr-IN'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium ${
                      lang === l ? 'border-[var(--teal)] bg-[var(--teal)]/10' : 'border-[var(--border)]'
                    }`}
                  >
                    {l === 'hi-IN' ? 'हिंदी' : 'मराठी'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startArena}
              className="min-h-12 rounded-full bg-[var(--chilli)] px-6 py-3 font-medium text-white transition-transform hover:scale-[1.02]"
            >
              Start haggle
            </button>
          </div>
        )}

        {phase !== 'setup' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setPaused((p) => !p)}
                className="min-h-12 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium"
              >
                {paused ? 'Resume' : 'Pause'}
              </button>
              <div className="flex gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] p-1 text-sm">
                {[1.0, 1.2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s as 1.0 | 1.2)}
                    className={`rounded-full px-3 py-1.5 ${speed === s ? 'bg-[var(--teal)] text-white' : ''}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <button
                onClick={resetArena}
                className="min-h-12 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium"
              >
                New haggle
              </button>
              <span className="text-sm text-[var(--ink-soft)]">
                {item.emoji} {item.name.en} · target ₹{item.customer.good} · limit ₹{item.customer.max}
              </span>
              {audioBlocked && (
                <button
                  onClick={async () => {
                    const ok = await unlockAudio();
                    setAudioBlocked(!ok);
                  }}
                  className="min-h-12 rounded-full bg-[var(--marigold)] px-4 py-2 text-sm font-medium text-white"
                >
                  🔇 Tap to enable sound
                </button>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Column
                emoji="🧔"
                name="Ramesh bhai"
                badge={`${MOOD_EMOJI[vendorMood]} ${vendorTactic}`}
                thinking={thinking === 'vendor'}
                thinkingLabel="Ramesh bhai is thinking 🤔"
                bubbles={bubbles.filter((b) => b.speaker === 'vendor')}
              />
              <Column
                emoji="🙋‍♀️"
                name="The Haggler"
                badge={customerAction}
                thinking={thinking === 'customer'}
                thinkingLabel="Copilot is thinking 🧠"
                bubbles={bubbles.filter((b) => b.speaker === 'customer')}
              />
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="mb-2 text-sm font-medium">Price chart</p>
              <PriceChart
                points={pricePoints}
                target={item.customer.good}
                limit={item.customer.max}
                open={item.vendor.open}
              />
              <div className="mt-2 flex gap-4 text-xs text-[var(--ink-soft)]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: 'var(--chilli)' }} /> vendor asking
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: 'var(--teal)' }} /> customer offer
                </span>
              </div>
            </div>

            <AnimatePresence>
              {phase === 'done' && summary && (
                <Scorecard summary={summary} vendorOpen={item.vendor.open} />
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {devOpen && (
        <div className="fixed bottom-4 right-4 max-h-64 w-72 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-xs shadow-lg">
          <p className="mb-1 font-medium">Dev timings (press D to hide)</p>
          {Object.entries(timings).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span>{k}</span>
              <span>{v}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Column({
  emoji,
  name,
  badge,
  thinking,
  thinkingLabel,
  bubbles,
}: {
  emoji: string;
  name: string;
  badge: string;
  thinking: boolean;
  thinkingLabel: string;
  bubbles: Bubble[];
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <span className="font-medium">{name}</span>
        </div>
        <span className="rounded-full bg-[var(--paper)] px-3 py-1 text-xs font-medium">{badge}</span>
      </div>
      <div className="flex-1 space-y-3">
        <AnimatePresence initial={false}>
          {bubbles.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-[var(--paper)] p-3"
            >
              <p className="devanagari text-lg leading-snug">{b.line}</p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">{b.english}</p>
              {b.note && <p className="mt-1 text-xs text-[var(--teal)]">{b.note}</p>}
            </motion.div>
          ))}
        </AnimatePresence>
        {thinking && <p className="text-sm text-[var(--ink-soft)]">{thinkingLabel}</p>}
      </div>
    </div>
  );
}

function Scorecard({ summary, vendorOpen }: { summary: SummaryResponse; vendorOpen: number }) {
  const { stats } = summary;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6"
    >
      <p className="mb-4 text-sm font-medium text-[var(--ink-soft)]">Final scorecard</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Opening quote" value={`₹${vendorOpen}`} />
        <Stat label="Final price" value={stats.outcome === 'deal' ? `₹${stats.finalPrice}` : '—'} />
        <Stat
          label="Saved"
          value={stats.outcome === 'deal' ? `₹${stats.saved} (${stats.percentSaved}%)` : '—'}
          highlight
        />
        <Stat label="Rounds" value={String(stats.rounds)} />
      </div>
      <p className="mt-4 text-sm">
        Walk-away threat used {stats.threatUsed ? '✓' : '✗'}
      </p>
      <p className="devanagari mt-4 text-lg">{summary.line}</p>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">{summary.english}</p>
    </motion.div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[var(--ink-soft)]">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${highlight ? 'text-[var(--leaf)]' : ''}`}>{value}</p>
    </div>
  );
}

'use client';

import { useRef, useState } from 'react';
import { ITEM_IDS, ITEMS } from '@/lib/items';
import type { ItemId } from '@/lib/types';
import type { CustomerState, Lang } from '@/lib/types';
import { initialCustomerState } from '@/lib/engine/customer';
import { Recorder, playBase64, unlockAudio } from '@/lib/audio';
import { MAX_RECORDING_SECONDS } from '@/lib/config';
import { Nav } from '../components/Nav';
import type { CopilotTurnResponse, SummaryResponse } from '../arena/types';

interface LogEntry {
  id: string;
  transcript: string;
  heardPrice: number | null;
  action: string;
  line: string;
  english: string;
}

const ACTION_COLOR: Record<string, string> = {
  COUNTER: 'var(--teal)',
  THREATEN_WALK: 'var(--chilli)',
  ACCEPT: 'var(--leaf)',
  DEAL: 'var(--leaf)',
  WALK_AWAY: 'var(--chilli)',
  ASK_PRICE: 'var(--marigold)',
};

export default function CopilotPage() {
  const [itemId, setItemId] = useState<ItemId>('tshirt');
  const [lang, setLang] = useState<Lang>('hi-IN');
  const [mode, setMode] = useState<'speak' | 'whisper'>('speak');
  const [state, setState] = useState<CustomerState>(initialCustomerState());
  const [log, setLog] = useState<LogEntry[]>([]);
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastAudio, setLastAudio] = useState<{ base64: string; mime: string } | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [typedPrice, setTypedPrice] = useState('');
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<Recorder | null>(null);
  const historyRef = useRef<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const item = ITEMS[itemId];
  const latest = log[log.length - 1];

  function reset() {
    setState(initialCustomerState());
    setLog([]);
    setSummary(null);
    setError(null);
  }

  async function sendTurn(opts: { audioBlob?: Blob; vendorText?: string }) {
    setBusy(true);
    setError(null);
    try {
      let res: Response;
      if (opts.audioBlob) {
        const form = new FormData();
        form.append(
          'payload',
          JSON.stringify({ itemId, lang, state, mode, history: historyRef.current }),
        );
        form.append('audio', opts.audioBlob, 'rec.webm');
        res = await fetch('/api/copilot/turn', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/copilot/turn', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            itemId,
            lang,
            state,
            mode,
            vendorText: opts.vendorText,
            history: historyRef.current,
          }),
        });
      }
      if (!res.ok) throw new Error('Request failed');
      const data: CopilotTurnResponse = await res.json();

      setState(data.nextState);
      historyRef.current = [...historyRef.current, data.line].slice(-6);
      setLog((prev) => [
        ...prev,
        {
          id: `${prev.length}-${Date.now()}`,
          transcript: data.transcript || '(opening move)',
          heardPrice: data.heard.price,
          action: data.decision.action,
          line: data.line,
          english: data.english,
        },
      ]);
      setLastAudio(data.audio);

      if (mode === 'speak') {
        unlockAudio();
        playBase64(data.audio.base64, data.audio.mime).catch(() => {});
      }

      if (data.nextState.done) {
        const summaryRes = await fetch('/api/summary', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ itemId, lang, customerState: data.nextState, vendorOpen: item.vendor.open }),
        });
        if (summaryRes.ok) {
          const summaryData: SummaryResponse = await summaryRes.json();
          setSummary(summaryData);
          if (mode === 'speak') playBase64(summaryData.audio.base64, summaryData.audio.mime).catch(() => {});
        }
      }
    } catch (err) {
      console.error(err);
      setError("Didn't catch that — try again, or use the typed fallback below.");
    } finally {
      setBusy(false);
    }
  }

  async function startRecording() {
    try {
      unlockAudio();
      const recorder = new Recorder();
      recorder.onLevel = setLevel;
      recorderRef.current = recorder;
      await recorder.start();
      setRecording(true);
      timeoutRef.current = setTimeout(() => stopRecording(), MAX_RECORDING_SECONDS * 1000);
    } catch {
      setError('Mic access denied — use the typed fallback below.');
      setShowFallback(true);
    }
  }

  async function stopRecording() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!recorderRef.current) return;
    setRecording(false);
    const blob = await recorderRef.current.stop();
    recorderRef.current = null;
    if (blob.size > 0) await sendTurn({ audioBlob: blob });
  }

  const barPct = Math.max(0, Math.min(100, ((state.vendorPrice ?? item.vendor.open) / item.vendor.open) * 100));
  const barColor =
    state.vendorPrice == null
      ? 'var(--ink-soft)'
      : state.vendorPrice <= item.customer.good
        ? 'var(--leaf)'
        : state.vendorPrice <= item.customer.max
          ? 'var(--marigold)'
          : 'var(--chilli)';

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Your copilot</h1>
        <p className="mt-2 text-[var(--ink-soft)]">Hold up your phone while the shopkeeper talks.</p>

        <div className="mt-6 flex flex-wrap gap-2">
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
          <button
            onClick={() => setMode(mode === 'speak' ? 'whisper' : 'speak')}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium"
          >
            Mode: {mode === 'speak' ? 'Speak for me' : 'Whisper'}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {ITEM_IDS.map((id) => (
            <button
              key={id}
              onClick={() => {
                setItemId(id);
                reset();
              }}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${
                itemId === id ? 'border-[var(--teal)] bg-[var(--teal)]/10' : 'border-[var(--border)]'
              }`}
            >
              <span className="text-2xl">{ITEMS[id].emoji}</span>
              <span className="font-medium">{ITEMS[id].name.en}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-[var(--ink-soft)]">Their price</p>
              <p className="text-3xl font-bold tabular-nums">
                {state.vendorPrice != null ? `₹${state.vendorPrice}` : '—'}
              </p>
            </div>
            <div className="text-right text-sm">
              <p>
                Target <span className="font-medium">₹{item.customer.good}</span>
              </p>
              <p>
                Limit <span className="font-medium">₹{item.customer.max}</span>
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--paper)]">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${barPct}%`, background: barColor }}
            />
          </div>

          {latest && (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{ background: ACTION_COLOR[latest.action] ?? 'var(--ink-soft)' }}
              >
                {latest.action.replace('_', ' ')}
              </span>
              <p className="devanagari mt-3 text-xl leading-snug">{latest.line}</p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">{latest.english}</p>
              {lastAudio && (
                <button
                  onClick={() => playBase64(lastAudio.base64, lastAudio.mime).catch(() => {})}
                  className="mt-2 text-sm font-medium text-[var(--teal)]"
                >
                  ▶ Replay
                </button>
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-[var(--chilli)]">{error}</p>}

        {!summary && (
          <div className="mt-6 flex flex-col items-center gap-3">
            {log.length === 0 ? (
              <button
                disabled={busy}
                onClick={() => sendTurn({ vendorText: '' })}
                className="min-h-12 rounded-full bg-[var(--chilli)] px-6 py-3 font-medium text-white disabled:opacity-50"
              >
                Start: ask the price
              </button>
            ) : (
              <button
                disabled={busy}
                onPointerDown={startRecording}
                onPointerUp={stopRecording}
                className={`flex h-24 w-24 min-h-12 items-center justify-center rounded-full font-medium text-white transition-transform disabled:opacity-50 ${
                  recording ? 'scale-110 bg-[var(--chilli)]' : 'bg-[var(--teal)]'
                }`}
                style={recording ? { boxShadow: `0 0 0 ${8 + level * 20}px rgba(215,38,61,0.15)` } : undefined}
              >
                {recording ? 'Listening' : 'Hold'}
              </button>
            )}
            <p className="text-sm text-[var(--ink-soft)]">
              {log.length === 0 ? 'Begins the haggle for you' : 'Hold while the shopkeeper talks'}
            </p>

            <button
              onClick={() => setShowFallback((v) => !v)}
              className="text-sm text-[var(--teal)] underline"
            >
              Mic not working?
            </button>
            {showFallback && (
              <div className="w-full space-y-2 rounded-xl border border-[var(--border)] p-4">
                <input
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="Type what he said"
                  className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                />
                <div className="flex gap-2">
                  <input
                    value={typedPrice}
                    onChange={(e) => setTypedPrice(e.target.value)}
                    placeholder="He said ₹___"
                    inputMode="numeric"
                    className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                  />
                  <button
                    disabled={busy}
                    onClick={() => {
                      const text = typedText || (typedPrice ? `${typedPrice}` : '');
                      setTypedText('');
                      setTypedPrice('');
                      sendTurn({ vendorText: text });
                    }}
                    className="min-h-12 rounded-lg bg-[var(--teal)] px-4 py-2 font-medium text-white"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {summary && (
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <p className="text-sm font-medium text-[var(--ink-soft)]">
              {summary.stats.outcome === 'deal' ? 'Deal!' : 'Walked away'}
            </p>
            {summary.stats.outcome === 'deal' && (
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--leaf)]">
                ₹{summary.stats.finalPrice} · saved ₹{summary.stats.saved} ({summary.stats.percentSaved}%)
              </p>
            )}
            <p className="devanagari mt-3 text-lg">{summary.line}</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{summary.english}</p>
            <button
              onClick={reset}
              className="mt-4 min-h-12 rounded-full bg-[var(--chilli)] px-6 py-3 font-medium text-white"
            >
              New haggle
            </button>
          </div>
        )}

        <div className="mt-8 max-h-60 space-y-2 overflow-y-auto rounded-xl border border-[var(--border)] p-3 text-sm">
          {log.map((entry) => (
            <div key={entry.id} className="border-b border-[var(--border)] pb-2 last:border-0">
              <p className="text-[var(--ink-soft)]">{entry.transcript}</p>
              <p>
                {entry.action} {entry.heardPrice != null ? `· ₹${entry.heardPrice}` : ''}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

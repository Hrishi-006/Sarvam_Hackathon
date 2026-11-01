# Decisions log — The Haggler

Running log of choices made while building, especially where the brief was
ambiguous or the live Sarvam docs disagreed with the brief's notes.

## Naming
- Product is called **The Haggler** throughout (brand name), per explicit
  instruction overriding the brief's working title "Mol-Bhav". The Hindi/Marathi
  taglines and copy from the brief are kept as-is; only the product name changed.

## Sarvam API — verified against https://docs.sarvam.ai (fetched 2026-11-01)

### Speech-to-Text (`POST /speech-to-text`)
- Multipart fields: `file`, `model` (`saaras:v3` per brief — docs default to the
  newer `saaras:v4` but v3 is still available and explicitly requested by the brief),
  `mode` (`transcribe` default, also `translate`/`verbatim`/`translit`/`codemix`).
- The REST reference table does **not** list `language_code` as a request field —
  docs say detection is automatic. We still send an optional `language_code` hint
  (`hi-IN` / `mr-IN`) when the user has picked a language, since the field is
  accepted defensively by the API and costs nothing if ignored; we never rely on it.
- Response: `{ request_id, transcript, language_code }`. `language_code` is `null`
  if undetected.
- Sync REST cap: 30s of audio. We cap client recording at 25s (brief's number).
- Supported formats include WAV, MP3, OGG/Opus, WebM — brief's WebM-first,
  WAV-fallback plan stands.

### Text-to-Speech (`POST /text-to-speech`)
- Model: `bulbul:v3`.
- Request fields used: `text`, `target_language_code`, `speaker`, `model`, `pace`.
  (One doc summary rendered this field as `language_code`; we go with
  `target_language_code`, which matches the brief and the established Sarvam TTS
  contract — noted here in case smoke testing shows otherwise.)
- `pitch` / `loudness` are confirmed **unsupported** on v3 — never sent.
- Max 2500 characters per request.
- Response: `{ request_id, audios: string[] }` — base64-encoded WAV, decode client/
  server side before playback.
- Speakers (Bulbul v3, from docs' speaker-selection-by-language table):
  - hi-IN male: `shubh`, `ashutosh`; female: `priya`, `suhani`
  - mr-IN male: `ratan`; female: `priya`, `ritu`
  - Chosen defaults: vendor (male) → `shubh` (hi-IN) / `ratan` (mr-IN).
    Customer copilot (female, per brief default) → `priya` for both languages
    (available in both lists, keeps voice identity consistent across languages).

### Chat completions (`POST /v1/chat/completions`)
- Models: `sarvam-105b` (128K ctx, flagship) and `sarvam-105b-conversations`
  (32K ctx, lower latency) — we use the latter for all real-time turns per brief.
- Reasoning is **on by default** (`reasoning_effort: "low"`). Disable by sending
  `reasoning_effort: null`. We do this for every real-time call.
- No documented `response_format` / structured-output support for this model —
  we do NOT rely on it. We ask for JSON-only in the system prompt and parse
  robustly (strip code fences, extract first `{...}`, validate with zod, regex
  fallback for price extraction).
- Response is OpenAI-compatible: `choices[0].message.content`. No documented
  `reasoning_content` field or `<think>` tags for this model, but we still strip
  any `<think>...</think>` block defensively as the brief requires, since
  behavior can change without notice.
- `max_tokens: 300`. Temperature 0 for extraction, 0.7 for customer/summary
  phrasing, 0.9 for vendor phrasing (per Section 6.6 "sound local" amendment).

## Other defaults
- TTS pace default 1.05 (customer/vendor), Arena speed toggle swaps to 1.2.
- `VENDOR_STALL_MULTIPLIER = 1.45` as specified.
- No database, no auth — all state is client-held JSON per the brief.

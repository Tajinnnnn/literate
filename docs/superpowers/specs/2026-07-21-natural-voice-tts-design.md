# Natural Voice TTS (Kokoro, in-extension)

## Problem

Literate reads aloud via the browser's built-in `speechSynthesis` API. Even with the existing "Natural Voice Defaults" work (auto-picking the best-sounding OS voice), the ceiling is whatever voice the OS/browser ships — often still robotic compared to modern neural TTS. The user asked for something closer to Ollama's "run a real model locally" model, applied to voice: genuinely natural-sounding speech, generated locally, no cloud API, no per-character cost, no sending page text to a third party.

Ollama itself only does text generation, not speech synthesis, so it can't be used directly. `kokoro-js` (npm, actively maintained) runs the Kokoro-82M neural TTS model entirely in-browser via WASM/ONNX Runtime Web — no separate server process, no cloud call after the model is cached locally.

## Goals

- A "Natural Voice" mode that produces meaningfully better-sounding speech than the OS voices Literate already supports, fully local (no text ever leaves the machine).
- Model weights fetched once (from Hugging Face's CDN, like `ollama pull`) and cached locally afterward — fully offline from then on.
- Keeps Literate's core identity — word-by-word highlighting, hover toolbar, hotkeys, pause/resume, rate control — working in this mode too, even without native word-boundary events.
- Never breaks or degrades the existing System Voice mode; Natural Voice is strictly additive.

## Non-goals

- Replacing `speechSynthesis`/System Voice mode. It stays the default, always available, and is the fallback if Natural Voice fails to load.
- Perfectly synced word highlighting in Natural Voice mode. Estimated (duration-proportional) timing is accepted as good enough; exact phoneme-level alignment is out of scope.
- Supporting every Kokoro voice/language variant on day one. Ship with a small, curated voice list; expanding it is a cheap follow-up.
- Any cloud/hosted TTS API (OpenAI, ElevenLabs, Google/Amazon Polly). Explicitly rejected for the same reasons as the earlier Natural Voice Defaults work: no host permissions to a third party, no API key, no per-character cost, text never leaves the machine.
- Vendoring model weight files into the git repo/extension package. Too large to commit sensibly; fetched at runtime and cached instead (see Approach below).

## Approach

### Architecture

A new `NaturalVoiceEngine` (in `src/pages/Content/modules/naturalVoiceEngine.js`) sits alongside the existing `TTSEngine`, not in place of it:

- Kokoro synthesis takes real wall-clock time per chunk, unlike `speechSynthesis.speak()`, which starts near-instantly. A mode switch (not a silent swap) sets the right expectation.
- If the model fails to load (no internet on first use, WASM/ONNX unsupported, a download error), System Voice keeps working untouched — Natural Voice is never a single point of failure for the whole reading feature.

`readerBootstrap.js` (already shared between the content script and the PDF viewer, per the local-file-support work) picks whichever engine is active, so both surfaces get Natural Voice for free with no separate integration.

The popup gets a "Natural Voice" toggle next to the existing OS-voice dropdown:

- **Off** (default): today's behavior, byte-for-byte unchanged.
- **On**: `NaturalVoiceEngine` takes over playback in place of `speechSynthesis`, using whatever text is already wrapped into `<span>` words by `wordWrapper.js` — no changes needed there.

### Synthesis & playback pipeline

Reuses the existing chunking pattern from `ttsEngine.js`'s `_findChunkEnd` (break at sentence ends near a character cap), since Kokoro also synthesizes best over bounded text spans rather than an entire document at once. For each chunk, in order:

1. Synthesize the chunk's text to a PCM audio buffer via `kokoro-js`.
2. Play it through the Web Audio API (`AudioContext` + `AudioBufferSourceNode`), not an `<audio>` element — gives sample-accurate playback and clean volume/rate control without fighting a media element's event quirks.
3. While the current chunk plays, synthesize the **next** chunk in the background, so there's no dead air waiting on inference between chunks (synthesis is not instant, unlike native `speechSynthesis` chunk-chaining).
4. Estimate word highlighting: divide the chunk's audio duration proportionally across its words by character length, and advance the highlighted word against `AudioContext.currentTime` on an animation-frame loop, rather than via boundary events (none exist for this engine).

Rate maps to `AudioBufferSourceNode.playbackRate`; volume maps to a `GainNode`. Both apply to the *next* scheduled chunk's playback node (matching the existing "settings change requires restarting the current utterance" behavior in `ttsEngine.js`'s `_restartFromCurrent`).

### Manifest, model lifecycle, and UI

- **Manifest**: add `"wasm-unsafe-eval"` to the extension pages' CSP (required for ONNX Runtime Web's WASM backend), and a `host_permissions` entry scoped to the Hugging Face CDN domain `kokoro-js` downloads from.
- **First use**: toggling Natural Voice on for the first time shows an inline progress state in the popup ("Downloading voice model… X MB") while `kokoro-js` fetches the model and the browser's Cache Storage persists it. Every use after that loads from cache near-instantly — fully offline from then on, same as `ollama pull` followed by fully-local inference.
- **Voice choice**: Kokoro ships a handful of built-in voices. Expose a small, separate picker for these (distinct from the existing OS-voice dropdown, since it's a different pool) once the model has loaded.
- **Error handling**: no internet on first attempt, WASM/ONNX unsupported in the browser, or a mid-read synthesis error all surface a clear inline message in the popup and leave System Voice fully usable — never a silent dead end, never a state where reading stops working entirely.

## Testing

- Manual/UAT (this can't be meaningfully unit-tested — it depends on real WASM/ONNX execution, a real model download, and real audio playback):
  - First-time toggle-on with internet available: confirm the download-progress UI appears, completes, and reading starts in the new voice.
  - Toggle Natural Voice on again after a browser restart: confirm it loads from cache with no network request and no perceptible delay.
  - Toggle-on with no internet and nothing cached yet: confirm the clear inline error, and that System Voice still reads normally.
  - Confirm word highlighting, hover toolbar controls, hotkeys, pause/resume, and rate/volume changes all work while Natural Voice is active, on both a regular webpage and the PDF viewer.
  - Confirm toggling Natural Voice off mid-read cleanly stops it and hands back to System Voice without overlapping audio.

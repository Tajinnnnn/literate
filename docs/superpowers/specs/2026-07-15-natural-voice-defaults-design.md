# Natural Voice Defaults

## Problem

Literate reads pages aloud via the browser's built-in `speechSynthesis` API. Today it does nothing to steer users toward a good-sounding voice: the popup's voice picker defaults to whatever the OS/browser marks as `default` (often a low-quality compact/legacy voice), and the dropdown lists voices alphabetically with no quality signal. Most users never open the picker, so they hear the worst-sounding option the system offers.

## Goals

- Auto-select the best-sounding available voice when the user hasn't explicitly chosen one, with no added permissions, API keys, or network calls — stay fully offline.
- Make the manual picker quality-aware: best voices sorted to the top and visibly labeled.
- Work across macOS, Windows, and Chrome/ChromeOS without hardcoding a voice-name list per OS.

## Non-goals

- No cloud/neural TTS integration (OpenAI, ElevenLabs, Google/Amazon Polly). Explicitly rejected — would require new host permissions, an API key, sending page text to a third party, per-character cost, and streaming-audio plumbing. Out of scope for this change.
- No changes to rate/pitch defaults, highlighting behavior, or non-English voice handling.

## Approach

OS/browser vendors already encode voice quality into the name string `speechSynthesis.getVoices()` returns:

- **macOS**: Enhanced/Premium Siri voices append the tier to the name — `"Ava (Premium)"`, `"Samantha (Enhanced)"`.
- **Windows/Edge**: natural neural voices read `"Microsoft Aria Online (Natural) - English (United States)"`; legacy SAPI5 voices say `"Desktop"`.
- **Chrome** (Windows/Linux/ChromeOS): Google's network voices read `"Google US English"`; the eSpeak fallback contains `"eSpeak"`.

A substring-scoring heuristic on the voice name can rank quality reasonably well across all three platforms without a per-OS lookup table.

### `scoreVoiceQuality(name)`

A pure function, colocated in `ttsEngine.js`, that scores a voice name via keyword matching:

- Positive signal (higher score): `premium`, `enhanced`, `neural`, `natural`, `online`, `google`
- Negative signal (lower score): `desktop`, `compact`, `espeak`, `mobile`
- No match: neutral/default score

Exact weights are an implementation detail; the ordering only needs to be directionally correct (premium/enhanced/neural voices outrank plain/legacy ones).

### Voice list

`TTSEngine.getVoices()` sorts its existing filtered list (US/UK English, novelty voices excluded — unchanged) by quality score descending, breaking ties alphabetically by name. The top-scoring entry is flagged so the UI can label it.

### Auto-selection

In the `TTSEngine` constructor, after loading stored settings: if `ttsVoiceURI` was never set in `chrome.storage.sync` (i.e. the user has not explicitly picked a voice), compute the best-scoring voice from `cachedVoices` at construction time and use it as `this.voiceURI` for the session. This pick is **not** persisted to sync storage — since `chrome.storage.sync` shares settings across a user's browsers/devices, and the best available voice is device/OS-specific, persisting one machine's pick would force it onto other devices where it may not exist or may not be the best choice there. Recomputing at runtime lets each device/browser independently land on its own best voice.

If the user does explicitly pick a voice via the popup (`setVoice`), that choice is persisted and respected as today — auto-selection only fills the gap when no explicit choice exists.

### Popup UI

`src/pages/Popup/Popup.jsx`'s voice `<select>`: list order follows the new `getVoices()` sort (best-first), and the recommended voice's option label gets a `" — Recommended"` suffix so manual pickers can see which one the extension considers best.

## Testing

- Unit-test `scoreVoiceQuality` directly with representative name strings from each platform (Premium/Enhanced, Online (Natural), Desktop, Google, eSpeak, plain names) to confirm ordering.
- Manual/UAT: verify in the actual popup that the dropdown lists a sensible voice first and that a fresh install (no stored `ttsVoiceURI`) speaks using that voice without requiring the user to open the popup.

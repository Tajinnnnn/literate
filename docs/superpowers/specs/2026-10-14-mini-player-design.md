# Literate audio player and reading text

Approved direction: Audio player mockup, extended by the user's requests for Spotify-like scrolling text, a persistent mini-player for passive viewing, and the FLEUR palette.

Use the actual FLEUR Relay tokens: background #08080c, panels #12121a/#191922, line #2a2a3a, text #e8e8f2, pink #ff3d8b, periwinkle #9aa0ff, cyan #4de8f0. Keep Heart as the default natural voice. Preserve reading controls, natural voice selection, volume, speed, highlighting, shortcuts, and page dark-mode controls.

The action popup becomes a compact audio player with an optional scrolling reading-text panel. The current sentence stays centered, the current word is emphasized, and surrounding sentences remain visible. Timing uses the existing approximate word timing from synthesized chunks; it is not forced alignment. Reading progress is word-based, not invented exact audio time.

A pop-out control opens the same interface as a separate Chrome popup window. It remains open on focus/tab changes and is bound explicitly to its original source tab, including when the popup is reopened or the service worker restarts. Closing/navigating the source must show an unavailable state, never send controls to an unrelated active tab. This is an ordinary separate window; OS-level always-on-top is not promised.

Cache sentence/index mappings per reading session, provide them on a separate message, and poll only lightweight playback state. Current word calculation must use AudioContext time when state is requested, independently of source-page animation frames. Keep last session text visible after stop/completion; replace it on a new read.

Verify sentence mapping, long sentences, paragraph boundaries, progress/paused audio-clock calculations and pinned-tab parsing with focused tests. Re-run the existing isolated-world loader regression. Build, lint changed files, and test the actual extension: read, show text, pause/resume, detach, switch source tabs, and confirm the mini-player retains its original page.

## Compact toolbar revision

User clarified that the whole toolbar popup should be smaller. The toolbar view is now 300px wide, with source title, status, progress, transport, settings and pop-out. Decorative art, reading text and footer remain in the detached player. Voice, rate and volume are available in toolbar settings. Chrome verified the compact view and settings controls; targeted lint and production build pass.

## Minimal light and dark revision

The user preferred Challenge Smasher's professional, minimal style and requested both modes. Adopt its warm off-white (#f5f2e9), white panels, charcoal (#181818/#222222), restrained sage accent, neutral dividers and sans typography. Remove visible decorative artwork and monogram. Keep the compact toolbar and detached synchronized text. Header sun/moon control saves playerTheme in chrome.storage.local; storage change listeners keep open player surfaces aligned. Page dark-mode action remains separate from player appearance.

Targeted lint and production build pass. Chrome visual review confirmed light and dark toolbar and mini-player views, readable text/controls and intact sizing. Dark mode persisted after closing/reopening the toolbar popup; the detached player inherited it and switched successfully to light.

## Smaller pinned player and word seeking

User requested always-on-top behavior, a smaller mini-player and Spotify-like click-to-jump text. Regular player now opens/reuses at 340×440. Playback settings moved behind Settings; the small main view keeps source, progress, transport and text. A Keep on top header button uses Document Picture-in-Picture (340×390 requested), moves the existing React root and styles, and minimizes the supporting extension window. Unpin/close restores the root and host. Light/dark changes apply to both documents. Chrome requires a user click for PiP, so pin is an explicit action after opening. The supporting window must remain open while pinned.

Each transcript word is a keyboard-accessible button. SEEK_WORD includes session ID and index; the engine rejects stale/out-of-range requests, cancels the old chunk, clears its clock, and resumes from the chosen word. A completed/stopped session can resume from its retained transcript without re-extracting different page text.

Verification: all 14 regression tests pass; targeted lint and production build pass with existing bundler warnings. Actual Chrome opened the native PiP window; pin/unpin restored the paused player. Clicking Good jumped to 65% and continued playback. After completion, clicking Keep restarted at 85%; pause held it at 92%. Left pinned and paused.

## Configurable accent

User requested Challenge Smasher-style accent choices and explicitly selected Periwinkle as the default (#9aa0ff). Settings offers eight named presets plus a custom native color picker. playerAccent is validated, stored locally, and shared across open player surfaces via storage events. Contrast-derived tokens keep the accent readable on light/dark backgrounds and action fills. PiP inherits inline tokens on creation and receives live changes. This does not change page highlighting.

Verification: all 16 tests pass, including preset/custom-extreme contrast and corrupt-preference recovery. Targeted lint and production build pass with existing warnings. Chrome showed Periwinkle selected and all preset/custom controls. Further UI selection checks were interrupted by concurrent user interaction.

## Playback latency revision — 2026-10-15

User reported slow voice startup and the same wait on speed changes. Model generation previously baked in the rate and restarted inference on each adjustment. Audio now plays through a pitch-preserving media element, generated at base speed; rate/volume update the current media directly. Word position follows media.currentTime, including after live speed changes. First/seek audio renders a short sentence (110-character cap) before longer prefetched continuations. A bounded eight-entry in-memory cache reuses recent audio by voice and text; changing voice remains a separate generation. Loading help no longer labels every per-page initialization first-time setup.

Compared Heart on this Mac through a local Chrome/WebGPU harness, same sentence: fp32 cached load 2.17s, first generation 1.48s, warm 1.03s; fp16 initial load/download 23.60s, first 4.39s, warm 1.65s; q8 cached load 1.24s, first 32.22s, warm 35.09s. Load figures have different cache states and are not directly comparable. Kept recommended fp32 WebGPU, with the existing q8 WASM fallback. A smaller file was not faster inference here. No new TTS model/provider or cloud speech service.

Verification: all 21 regression tests pass; targeted lint and production build pass with existing warnings. Actual Chrome played the updated short-first-chunk narration through to completion. A subsequent 1.0→1.1× adjustment continued in NOW READING state with advancing text rather than regenerating; restored the prior 1.0× setting and paused the test. Recent-audio caching was added afterward and verified by tests and the final build. Existing selected Onyx voice, Gold accent and volume were preserved. Fresh pages still instantiate their own model; centralized model ownership is not implemented.

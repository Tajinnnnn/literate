# Literate mini-player implementation plan

Goal: Apply the selected audio-player design with FLEUR colors and synchronized reading text in a persistent, source-bound window.
Architecture: The existing content-script engine owns narration and session text. The popup polls its clock-based state and requests transcript lines once per session. The background worker opens/reuses the detached window with an explicit source tab ID.

- [x] Add failing tests for sentence/index mapping, audio-clock position, and pinned source parsing. Implement pure helpers and pass the tests.
- [x] Cache transcript lines per NaturalVoiceEngine session, expose clock-derived playback progress independently of requestAnimationFrame, and add GET_TRANSCRIPT to the existing message protocol.
- [x] Replace popup markup/styles with the approved player structure and FLEUR tokens. Add auto-scrolling text, accessible transport, persistent voice/volume/speed settings, clear model/error/empty states and a detachable-window button.
- [x] Implement source-bound pop-out open/reuse in the background worker; keep controls on the original source even after another tab becomes active.
- [x] Run regression tests, lint changed files, and build while retaining previous generated assets. Reload Chrome, verify actual reading/text and detached behavior, and report any limits.

Preserve existing uncommitted work. Do not commit, delete user files, change the live VoiceStudio setup, or add cloud processing.

## Verification — 2026-10-14

All 10 regression tests pass. Targeted lint and production build pass (existing bundler size/import warnings remain). In Chrome, Heart completed the 60-word sample with synchronized sentence/word highlighting. Pause held progress steady; resume completed while a different tab was selected. The detached player retained its original source title and reached 100%. It is a separate Chrome window, without an OS always-on-top guarantee.

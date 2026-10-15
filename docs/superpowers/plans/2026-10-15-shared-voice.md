# Shared voice model implementation plan

Goal: Keep one Kokoro model resident across reading pages and ship Literate independently of VoiceStudio.
Architecture: A Chrome offscreen document owns a dedicated model worker. The service worker ensures one host and routes requests. Content scripts retain reading/audio controls and request generated audio through a small client. Generation is serialized and recent audio cached centrally. No server or native installation.

- [x] Test concurrent initialization, serialized generation and transport.
- [x] Add the model worker, offscreen host and lifecycle router; replace per-page model loading with a remote facade.
- [x] Verify new-page reuse in Chrome and existing playback/appearance tests; build with runtime assets locally bundled.
- [x] Document first-use download, offline cache and distribution requirements; produce a standalone extension ZIP if verification passes.

Preserve dirty work; no commits, deletion, cloud narration or live VoiceStudio changes. Require Chrome 116+ for runtime.getContexts and existing document PiP. Add offscreen permission solely to host the dedicated inference worker (WORKERS reason).

Verification: 27 tests pass; targeted lint passed after declaring the worker global for the older ESLint environment. Production build passes with existing size/import warnings. Chrome shared-worker identity stayed 1792041566837-wmfon2xtsle and loadCount stayed 1 across fresh document connections; warm reconnection measured 11 ms. Shared synthesis produced test audio in 3288 ms, and actual article narration completed. Navigating to a different article showed READY TO LISTEN without another model download. Standalone beta ZIP is 11.3 MiB; runtime closure and ZIP integrity verified.

# Chrome Web Store submission kit

Candidate: 1.0.5. Both Kokoro and installed device voices remain available. This directory prepares a listing; it does not mean the extension is published or approved.

## Files

- security-review.md: security changes, dependency findings, and verification limits.
- listing.md: listing copy, public support/privacy links and reviewer steps.
- privacy-fields.md: purpose, permission justifications and data-use guidance.
- assets/: actual UI screenshots, store icon and 440×280 promotional tile.
- demo/index.html: original sample article for screenshots and manual reading checks.
- ../releases/literate-1.0.5-store-candidate.zip: runtime-only upload candidate; manifest at its root. Do not upload the GitHub source ZIP.

## Remaining release gates

1. Resolve the embedded eSpeak NG redistribution terms before submitting the Kokoro-inclusive artifact. phonemizer 1.2.1 declares Apache-2.0 for its wrapper but embeds eSpeak NG. Upstream eSpeak NG is GPLv3-or-later with component exceptions. The npm package does not supply an exact corresponding native source/build recipe. An Apache wrapper license alone does not settle the embedded engine obligations. Determine the corresponding source, preserve all notices, and determine whether the distributed combination requires GPL-compatible licensing. Do not silently change Literate's MIT license. GPL allows commercial distribution when its conditions are met; this is not a blanket ban on monetization.
2. Fresh-profile check of the exact extracted candidate: both modes, multi-paragraph continuation, seek, rate change, local PDF, dark mode, popup, pinning, model cold/warm load, extension errors and offline device voice. Existing installed-profile checks do not establish fresh-store installation behavior. Include a Windows test; current local OS is macOS.
3. Check no executable is fetched remotely during Natural mode cold load. Local ONNX runtime paths are configured; library fallback paths and future dependency upgrades still need checking against the final artifact. Preserve a network-request record with no private page content. Static URL scanning alone cannot prove this.
4. Confirm that the public privacy link opens signed out and the dashboard disclosures match the build. Use the linked GitHub policy; no separate hosting is necessary. Set publisher/contact email in the developer dashboard and verify it. Any support reports on GitHub are public unless handled separately.
5. The account owner must register/sign in to the Chrome Web Store developer dashboard, enable required account security, pay any displayed registration fee, and accept publisher agreements. Review distribution countries and any trader-status requirements shown for that account. Then upload the ZIP, paste the prepared fields, upload required assets, and submit for review. Do not make unsupported accessibility/commercial-license guarantees.

## Evidence and references

Prepared on October 15, 2026. Package report is generated beside the ZIP with a SHA-256 and file list; its checks cover packaging, not store approval or legal clearance.

- https://developer.chrome.com/docs/webstore/images (128×128 icon, mandatory 440×280 promo tile, at least one 1280×800 or 640×400 screenshot).
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy (single purpose, minimum permissions, data declarations).
- https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code (remote JavaScript and WASM prohibited; data distinguished from executable code).
- https://developer.chrome.com/docs/webstore/register (publisher account requirements).
- https://github.com/xenova/phonemizer.js and https://github.com/espeak-ng/espeak-ng/blob/master/COPYING (embedded engine license provenance).

Suggested rollout: unlisted store testing with outside users before public promotion. No billing has been added. Store publication will produce a new extension identity unless an existing store item's identity is reused; unpacked beta settings/model caches do not automatically migrate to a new identity.

## Screenshot provenance

The two listing images compose actual macOS Chrome mini-player captures from this session alongside promotional copy. Only the OS title bar was cropped; UI text/colors/layout were not redrawn. The player was paused using Samantha with the original demo article. These are installed-profile interface captures, not evidence of a clean install or proof that every voice works. Periwinkle is shown; the user's saved theme/accent are restored after capture. Image dimensions were checked programmatically. The promotional tile is original vector artwork; the icon is the existing Literate master with Chrome's recommended transparent padding. `render-assets.cjs` regenerates the compositions from `/private/tmp/literate-store-dark.png` and `/private/tmp/literate-store-light.png` when run from the repository root.

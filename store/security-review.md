# Literate security review

Reviewed October 15, 2026. Scope: extension source, permissions/CSP, page and PDF inputs, messages between extension contexts, model transport, browser bundles, release packaging and locked dependencies. This is a source/dependency review with regression tests, not a penetration-test certification.

## Changes

- **Local development server exposure:** the old configuration disabled host checks and granted cross-origin access to every website. Removed wildcard CORS and unrestricted hosts. The updated server binds to loopback and allows only loopback hostnames. Upgraded the server and refresh/copy plugins to supported patched releases. The server config is checked against its installed version's schema. Do not expose this development server publicly.
- **Message boundaries:** background player requests now require the actual extension popup as sender. Reader controls accept extension controllers/background, not content-script callers. The voice broker validates same-extension identity, top-level content context, command, text size, and voice identifier. The offscreen host rejects direct calls from content scripts. Only the broker forwards the validated command/payload. Chrome supplies sender metadata; the code does not trust identity in the message body. These are defense-in-depth changes: ordinary websites could not call these internal listeners directly through an exposed external-message API, and none has been added.
- **PDF input:** the reader accepts local .pdf files only, rejects remote URLs/network shares and unexpected query/fragment inputs before fetch, limits incoming bytes to 100 MB while streaming, limits documents to 2,000 pages and 10 million extracted characters, and releases the PDF parser after extraction. It explicitly disables PDF.js code evaluation and font loading. Extracted text remains textContent, not interpreted HTML. Limits reduce resource exhaustion; they do not sandbox arbitrary parser memory use. PDF.js 4.10.38 is outside the affected ranges of CVE-2024-4367 and CVE-2026-16633; this change is precautionary hardening, not a claim that those CVEs affected this build.
- **Narration work:** bounded to 16 outstanding unique synthesis jobs, with an explicit busy response rather than an unlimited queue. Requested voices must exist in the loaded model's own voice list. Kokoro already validates voice names internally; the new checks also protect the extension's boundary and queue.
- **Extension policy:** page-accessible runtime bundles were removed during store preparation. Executable code is restricted to bundled files. Worker sources are self only; remote executable scripts and objects are not permitted. Connections are restricted to the extension, local-file reads and the existing Hugging Face model-delivery hosts. Blob audio and inline style declarations support playback and styling; they do not permit inline executable scripts. Chrome rejected an initial worker-src blob directive; it was removed and a regression check added before the final candidate.
- **Build/package chain:** compatible npm patches removed all four critical dependency advisories. Sharp was explicitly updated to 0.35.5, including the transitive copy. Install scripts were disabled. A compilation graph check fails if the known Node/development-only advisory paths enter browser bundles. Packaging uses assets emitted by the current compilation rather than a fixed PDF worker chunk number or stale files in build/. No debug pages or source maps are added to the store candidate.

## Dependency result

npm audit initially reported **57 affected dependency entries: 4 critical, 27 high, 21 moderate, 5 low**. After updates it reports **24 entries: 0 critical, 18 high, 6 moderate**. These counts include parent packages that inherit a transitive alert; they are not counts of distinct extension exploits.

The remaining entries trace to **braces <=3.0.3** (stack-exhaustion with deeply nested glob patterns in development tooling) and **sprintf-js <=1.1.3** (unbounded format precision in a Node-only logger dependency). At this review's registry check, their latest published versions were still flagged. npm's proposed forced “fixes” include downgrades and do not constitute a tested remediation. The browser compilation excludes braces, webpack-dev-server, sharp, onnxruntime-node, global-agent, roarr and sprintf-js; packaging verifies the graph result. Remaining build-tool use is limited to trusted repository inputs and a loopback server. These unpatched upstream alerts remain tracked, rather than being suppressed or reported as zero vulnerabilities.

## Network and privacy boundaries

Instant mode resolves only localService device voices. Natural mode downloads model/tokenizer/config/voice data from the named Hugging Face repositories and synthesizes in the local worker. The reviewed application code has no paid speech API, hosted inference endpoint, analytics endpoint, account system or billing service. Model weights/voice data are fetched from upstream main and may change; no independent model digest pinning is claimed. Preferences in Chrome sync follow the user's browser settings. A clean-profile cold-load network trace is still needed before store submission; the CSP and module graph are enforceable boundaries but do not replace a real network trace.

No credentials were added to this work. Public demos use original text. GitHub support reports are public; do not include private reading text, local file paths or access tokens in reports.

## Verification and remaining gates

Regression coverage exercises real message handlers with foreign/content senders, permitted local PDFs and rejected remote/network-share inputs, stream limits, queue limits, unknown voice rejection, host/CORS configuration, manifest worker policy, and fresh asset inventory in the presence of stale chunks. Production build and static analysis are required alongside the full test suite. Per-artifact SHA-256 and packaging checks live in releases/*.report.json. The working browser must reload to pick up manifest/CSP changes; source/build tests do not establish that reload or browser playback succeeded.

Before public submission: verify both voice modes and PDF playback after the corrected manifest reload; test the exact extracted candidate in a clean profile and on Windows; collect a cold-load network trace; resolve the separate embedded eSpeak redistribution/source obligations in README.md. Nothing in this review clears that license issue or guarantees Chrome Web Store approval.

## References

- [Chrome messaging security](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [Chrome security guidance](https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure)
- [PDF.js 2024 advisory](https://github.com/advisories/GHSA-wgrm-67xf-hhpq)
- [PDF.js 2026 advisory](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j)
- [Braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [sprintf-js advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)

## Browser check after corrected reload

Chrome's extension details reported 1.0.5 without the manifest-load failure. The original demo article played with Samantha and advanced through multiple sentences, and the mini-player opened. Heart then generated locally under the corrected policy and advanced to 56% of the same 135-word article. A newly created two-page local PDF loaded through the current generated PDF worker, extracted both pages, and Heart narrated all 21 words to a 100% Reading complete state. These checks use the existing macOS profile and cached model assets; clean-profile, Windows and cold-network checks remain outstanding. Automated suite: 64 tests pass; full source lint and production compilation pass, with large-asset/performance warnings only.

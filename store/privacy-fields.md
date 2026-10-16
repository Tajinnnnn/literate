# Dashboard privacy and permissions

Single purpose: Make page text, selected passages, and text-based local PDFs accessible as on-device audio with synchronized reading controls.

storage: Save voice, speed, volume, highlight, appearance and optional shortcut preferences. Some preferences use Chrome sync. Voice model data is cached locally by the browser runtime.

contextMenus: Offer Read page, Read selection, and Read from here from the page context menu.

webNavigation: Detect top-level local .pdf navigation and open Literate's text-extracting PDF reader when the user has enabled file-URL access. Navigation is not logged or sent to the developer.

offscreen: Own a shared local speech worker so Kokoro does not have to load separately for each page. No microphone recording occurs.

Host access to huggingface.co and *.hf.co: Download optional Kokoro model, configuration, tokenizer, and voice data. Requests do not include the text being narrated. Delivery services receive ordinary network metadata. No remote JS/WASM execution is needed.

Content-script access to HTTP/HTTPS pages: Extract the requested article/selection/section, highlight spoken words, allow optional page appearance changes and show controls. Chrome blocks execution on its internal/protected pages. File URLs support local PDFs only after the user's explicit browser grant. Reading content and URLs are not transmitted to the developer.

Remote code: Select “No, I am not using remote code” only after the final artifact's runtime audit is complete. All executable JS/WASM must be local. This is separate from optional model data downloads; do not equate a model weight with a remote script.

Data use: The extension accesses website content (and the active title/address) locally to provide its reading features. It does not send this content or browsing history to the developer or a third-party speech API. Preferences may sync through Chrome. Hugging Face sees model-download network metadata. Read the current dashboard's precise definition of “collected” before selecting data-category checkboxes; do not certify “no data handled.” If the field covers local access, disclose Website content and the limited active-page address use. Keep the public privacy policy and answers consistent with the actual build.

Limited-use certifications: Certify only statements that remain true: no sale of user data; no unrelated use/transfer; no use for creditworthiness/lending. No ads, analytics, accounts or monetization are implemented in this build.

Policy: https://github.com/Tajinnnnn/literate/blob/main/PRIVACY.md

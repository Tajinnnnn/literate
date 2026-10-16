# Chrome Web Store listing

Status: prepared candidate; do not submit until the release gates in README.md are complete.

## Name
Literate

## Summary
Listen to articles, selected text, and local PDFs with on-device voices, word highlighting, and a compact player.

## Category and language
Productivity (choose the closest current dashboard category). English.

## Description
Make room for reading with Literate. Listen to an article, selected text, or a local PDF while following the words in a compact player.

• Two on-device voice options: Natural with Kokoro, or Instant with installed device voices.
• Word highlighting and a scrolling transcript. Click a word to continue reading from that point.
• Read the main article or choose a specific section of the page.
• Pop out a mini-player and pin it above other windows where supported.
• Adjust playback speed and volume.
• Light and dark player themes, custom accent colors, and page appearance controls.
• Optional shortcuts that stay empty until you assign them.

Your reading content stays on your device. No Literate account, voice-service API key, VoiceStudio installation, or developer tools are required.

Natural mode downloads voice-model data from Hugging Face the first time you use it. The WebGPU model download is approximately 315 MB, with a smaller quantized fallback on supported CPU paths. Loading and narration speed depend on your device; first use is not instant. Installed device voices offer the fastest start and do not require a model download. Instant mode currently lists local US and UK English voices; availability and word-timing support depend on your operating system and browser.

Local PDFs require enabling “Allow access to file URLs” in Chrome's extension settings. Literate extracts embedded text; scanned PDFs need OCR elsewhere. Complex layouts may need section selection or may not read in the intended order. Chrome internal pages and some protected pages cannot be read.

Support: https://github.com/Tajinnnnn/literate/issues
Privacy: https://github.com/Tajinnnnn/literate/blob/main/PRIVACY.md

## Links
Homepage: https://github.com/Tajinnnnn/literate
Support: https://github.com/Tajinnnnn/literate/issues
Privacy policy: https://github.com/Tajinnnnn/literate/blob/main/PRIVACY.md

## Reviewer instructions
No login or purchase is needed. Open a normal article, open Literate, choose Settings → Instant — device voices, then play. Install an English system voice if none is offered. Verify that playback continues beyond the first sentence. Pause and click a transcript word to seek. Use “Choose section” on a page with a main article and sidebar. Toggle the player theme separately from Page appearance. Open the mini-player and use its pin button where Document Picture-in-Picture is supported.

For Natural mode select Natural — Kokoro and play. Allow the first model download to complete while online. JavaScript and WASM are packaged in the extension; downloaded files are model/tokenizer/config/voice data. Keep the source tab open. Test a text-based local PDF after enabling file access. No audio is sent to a hosted service.

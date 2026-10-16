# Literate: a little more room to read

Animation production plan • October 16, 2026

A practical introduction for someone who has just installed Literate. The goal is to get one article playing, then show how to control what is read and keep the player nearby.

The finished animation is 64.367 seconds at 1920×1080 and 30 fps. Its visuals illustrate the extension's features; they are not a live UI recording. The approved 157-word script is narrated by Literate's actual Kokoro Heart voice, recorded locally. The final H.264/AAC export, captions, poster, original capture, and verification records are saved in the parent vault's `media/video/literate-walkthrough-2026-10-16/` folder. Editable source is in [walkthrough/](walkthrough/). The extension's release checks remain separate from video production.

## Format

- Target duration: **64.35 seconds**, English, 1920×1080 landscape. Allow 1.5 seconds for the introduction, 60.35 seconds for narration, and 2.5 seconds for the closing hold.
- Eight animated chapters, one per approved script paragraph. Align chapter transitions to the recorded narration rather than the earlier 90-second timing targets.
- Professional, minimal presentation: periwinkle accent, neutral dark and warm light surfaces, generous spacing, and a large, readable player illustration.
- One short instruction at a time. Use gentle transitions, restrained cursor cues, and clear control labels. The player is an illustration, so its text movement must not imply a captured, word-accurate live session.
- Use the actual local extension narration with **Kokoro Heart (`af_heart`)** throughout. No screen recordings, B-roll, or additional VoiceStudio dubbing are required for this version.

## Animated chapters

The spoken wording below is unchanged from [narration.txt](narration.txt). Keep action text concise enough to read while listening.

| Chapter | Animation | Narration | Short screen text |
| --- | --- | --- | --- |
| 1. Meet Literate | Introduce the existing logo, then bring in a large player illustration beside article, selection, and PDF symbols. | Meet Literate: a free, open-source reader for articles, selected text, and local PDFs. | A little more room to read. |
| 2. Choose your voice | Present two clear voice-option cards using the actual Settings labels. Reveal the first-download note with Natural. | In Settings, choose Instant for the quickest start with installed device voices. Or choose Natural for Kokoro, which downloads its model before first use. | Instant — device voices. Natural — Kokoro. First model download: about 326 MB on GPU / 92 MB on CPU, plus voice files. |
| 3. Page or passage | Animate a Play cue on an article illustration, then select a short passage and reveal the Read selection aloud label. | Open an article, click Literate, and press Play. Follow the highlighted words. For a shorter passage, select the text, right-click, and choose Read selection aloud. | Read a page. Or just a passage. |
| 4. Choose section | Outline an article region while a sidebar recedes. Use a restrained pointer cue to illustrate the selection. | Want to skip a sidebar? Choose section, point at the part you want, and click. Literate reads that section. | Choose section → point → click. |
| 5. Keep the player nearby | Bring the player illustration forward, emphasize a clickable word, then show a pin above abstract window cards. This explains seeking without staging a live playback jump. | Open the mini-player to follow the scrolling words. Click a word to jump there. Use the pin to keep the player above other windows. | Click a word to jump. Keep on top.* |
| 6. Make it yours | Animate the speed value, a player light/dark transition, and a small accent palette ending on Periwinkle. | Adjust the speed, switch between light and dark, and choose your accent color. | Your pace. Your appearance. |
| 7. Local PDFs | Pair a PDF illustration with a clearly labeled file-access setting, then turn the page into simple readable text blocks. | For local PDFs, enable Allow access to file URLs in Chrome’s extension settings. Then open the PDF. Scanned documents need text recognition first. | Allow access to file URLs. Scanned PDFs need OCR first. |
| 8. On-device listening | Connect the player and its still-open source page on one device. Finish on the existing logo and a readable GitHub help link. | Your reading stays on your device. Keep the original page open, find your pace, and listen. | Free and open source. Speech runs on your device. github.com/Tajinnnnn/literate |

*Pinning requires a browser with Document Picture-in-Picture support. The original reading page must remain open; navigating or refreshing it disconnects that mini-player session.

## Narration source and timing

The clean spoken script is in [narration.txt](narration.txt), one paragraph per chapter. The [reading page](reading-script.html) was used to have the real extension read that script locally.

- Voice: actual **Literate / Kokoro Heart (`af_heart`)**, recorded on the device. The animation uses this complete extension read, not the earlier VoiceStudio opening audition.
- Source interval: **29.75–90.10 seconds** of the captured recording, yielding **60.35 seconds** of narration.
- Preserve the original capture and trimmed master. The final copy is normalized to approximately **−19 LUFS**, with a **−1.5 dBTP** ceiling, for clear playback. No words, internal pauses, or playback speed are changed.
- Place narration at **1.50 seconds**. The narration clip ends at **61.85 seconds**; the closing hold ends at the **64.35-second** target.
- Keep the approved wording and natural cadence. Do not replace individual phrases or stretch the voice to meet the former 90-second outline.
- Check complete first and last words, paragraph joins, pronunciation, and audible clarity before final delivery. Animation cues follow the actual voice; they do not establish word-level timing accuracy in the extension.

## Production notes and checks

- Clearly present an **animated explainer with actual extension narration**, not live UI footage. Illustrations may simplify layout, but must retain truthful control labels and behavior.
- Natural mode downloads model/voice files from Hugging Face; speech generation runs locally. Do not imply that Kokoro starts instantly on every device or that the extension never connects to the internet.
- Instant mode requires a compatible installed local US/UK English voice. Availability and quality depend on the device.
- Article detection is best effort. Choose section provides a more precise reading scope; it is not an OCR or automatic-content guarantee.
- The PDF reader extracts and reflows existing text. Local PDFs require file access, and scanned/image-only documents need OCR elsewhere first.
- Player light/dark mode is separate from the Page appearance control. Accent color defaults to Periwinkle. Optional shortcuts remain unassigned; do not illustrate old P/L bindings.
- Keep text large and brief, contrast readable in light and dark scenes, and the final GitHub help link visible through the closing hold. Include no private documents, personal paths, or account details.
- Do not show a Chrome Web Store badge or imply store approval. Link the beta installation guide below the video.
- Before confirming completion, inspect rendered chapter boundaries, text clipping, narration continuity, audio levels, and the final hold. Keep source audio and editable composition files.

## Sources for accuracy

- [Current features and setup](../../README.md)
- [Actual popup controls](../../src/pages/Popup/Popup.jsx)
- [Section selection](../../src/pages/Content/modules/sectionPicker.js)
- [Floating player](../../src/pages/Popup/floatingPlayer.js)
- [Local PDF reader](../../src/pages/PdfViewer/index.js)
- [Model files and approximate sizes](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/tree/main/onnx)

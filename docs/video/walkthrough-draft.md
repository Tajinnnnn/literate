# Literate: a little more room to read

Draft storyboard and narration • October 15, 2026

A practical introduction for someone who has just installed Literate. The goal is to get one article playing, then show how to control what is read and keep the player nearby.

This is a script/storyboard draft, not a rendered video or a generated voice track. The extension's release checks remain separate from video production.

## Proposed format

- About 90 seconds, English, 1920×1080 landscape. Proposed for a YouTube walkthrough or embedded help; destination and exact length can be revised.
- Actual extension footage with restrained cursor highlights and close-ups of the control being used. Professional, minimal presentation using Literate's periwinkle accent, neutral dark and warm light surfaces.
- One short instruction at a time. Readable captions, gentle transitions and brief holds after each click. No fabricated controls, fake download progress or exaggerated performance claims.
- Female VoiceStudio narration, following the user's earlier voice preference. Confirm the exact existing voice by listening to a short take before producing all eight clips.
- Stop at this draft for review. Recording, voice generation, animation and final rendering follow the reviewed script.

## Storyboard

Timings are editorial targets. Actual VoiceStudio take lengths determine final cuts; allow space for people to see each action.

| Time | What we show | Narration | Short screen text |
| --- | --- | --- | --- |
| 0:00–0:07 | Open on the real mini-player following an original demo article. Brief title with the existing logo. | Meet Literate: a free, open-source reader for articles, selected text, and local PDFs. | A little more room to read. |
| 0:07–0:21 | Zoom into Settings → Voice engine. Show both real options. Select Instant for the quick-start demonstration. Explain Natural before asking anyone to press Play. | In Settings, choose Instant for the quickest start with installed device voices. Or choose Natural for Kokoro, which downloads its model before first use. | Instant: installed local English voices. Natural: first model download ≈326 MB on GPU / ≈92 MB on CPU, plus voice files. |
| 0:21–0:33 | Open Literate on the original sample article. Click the large play button. Show several highlighted words. Cut to a selected passage and the real Read selection aloud context menu. | Open an article, click Literate, and press Play. Follow the highlighted words. For a shorter passage, select the text, right-click, and choose Read selection aloud. | Read a page. Or just a passage. |
| 0:33–0:43 | Use a sample page with an article and sidebar. Click Choose section, hover the article, then click. Let the outline and resulting scope be visible. | Want to skip a sidebar? Choose section, point at the part you want, and click. Literate reads that section. | Choose section → point → click. |
| 0:43–0:57 | Click Open mini-player. Show scrolling Reading text, click one word and demonstrate playback starting there. Click Keep on top and show the actual floating window over another harmless window. | Open the mini-player to follow the scrolling words. Click a word to jump there. Use the pin to keep the player above other windows. | Click a word to jump. Pin to keep on top.* |
| 0:57–1:07 | Change speed with + or the numeric × control. Briefly demonstrate the player's light/dark switch and Settings → Accent color with Periwinkle. Include a clearly labeled cut to Page appearance → Dark to distinguish page styling from player styling. | Adjust the speed, switch between light and dark, and choose your accent color. | Your pace. Your appearance. |
| 1:07–1:22 | Show Chrome's real Literate extension details with Allow access to file URLs. Open an original text-based PDF, then press Play in Literate's extracted-text reader. | For local PDFs, enable Allow access to file URLs in Chrome’s extension settings. Then open the PDF. Scanned documents need text recognition first. | Local PDFs: enable file access. Scanned PDFs need OCR first. |
| 1:22–1:30 | Return to the mini-player on the article, with source tab visibly open. Finish on the logo and a readable help link. | Your reading stays on your device. Keep the original page open, find your pace, and listen. | Free and open source. No account or speech-service subscription. github.com/Tajinnnnn/literate |

*Pinning requires a browser with Document Picture-in-Picture support. Use supported desktop Chrome for the recording. The original reading page must remain open; navigating or refreshing it disconnects that mini-player session.

## VoiceStudio dubbing plan

The clean spoken script is in [narration.txt](narration.txt), one paragraph per scene.

1. Use the already working local VoiceStudio audio API and the installed Chatterbox engine from the earlier comparison. Do not download the unused OmniVoice model or change the user's saved desktop setup. The viewer does not need VoiceStudio to use Literate.
2. Audition the opening in the desired female voice before generating the remaining takes. The exact voice/preset is not yet locked. Use an existing suitable stock/reference setup with permission; no new personal voice clone is required.
3. Generate eight separate clips, each named for its scene. Short takes avoid the approximately 40-second single-request cap observed in the installed Chatterbox adapter.
4. Keep the original audio takes. Listen for pronunciation of “Literate,” “Kokoro,” and “PDFs,” omitted words, clipped endings and unnatural pacing. Regenerate short sections when needed. The installed adapter ignored its speed argument in the earlier test, so do not rely on that parameter to hit exact timing.
5. Fit the visual edit to the measured narration. Leave brief pauses after visible actions. Avoid stretching the whole narration to force a 90-second duration. Keep narration clean and prominent; a music bed is optional and not part of this first draft.
6. Keep narration and actual extension audio distinct. If a real Heart/Samantha sample is included later, label it and briefly duck the narrator; VoiceStudio narration must not be presented as a sample of Literate's selected voice.

## Recording checklist

- Record only original demonstration articles/PDFs. The existing [sample article](../../store/demo/index.html) is available; add a clearly separate sidebar for the section-selection example.
- Use a clean browser view. Hide private tabs, bookmarks, account names, notifications, local personal file paths and unrelated applications.
- Use the existing logo and a periwinkle player. Capture real UI at readable size; the store screenshots provide a framing reference, not substitutes for demonstrations of clicks.
- Leave optional shortcuts empty; do not demonstrate old P/L bindings.
- Do not say Kokoro is instant on every device or that the extension never connects to the internet. Model/voice files come from Hugging Face; narration generation runs locally. Device voices require a compatible installed local US/UK English voice.
- The PDF reader extracts/reflows text, rather than preserving the full original PDF layout. It does not perform OCR. Keep the PDF demonstration simple enough that the result is clear.
- Use the current GitHub help/install link at the close. Do not show a Chrome Web Store badge or claim store approval until publication actually happens. The full beta installation guide can be linked beneath the video instead of crowding the walkthrough.
- No paid generation, hosted voice service, model download or finished render has been started for this draft.

## Sources for accuracy

- [Current features and setup](../../README.md)
- [Actual popup controls](../../src/pages/Popup/Popup.jsx)
- [Section selection](../../src/pages/Content/modules/sectionPicker.js)
- [Floating player](../../src/pages/Popup/floatingPlayer.js)
- [Local PDF reader](../../src/pages/PdfViewer/index.js)
- [Model files and approximate sizes](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/tree/main/onnx)
- Earlier local VoiceStudio comparison: `media/audio/voicestudio-test-2026-10-14/test-notes.txt` in the parent vault. This is production context, not a public video asset or a file to upload.

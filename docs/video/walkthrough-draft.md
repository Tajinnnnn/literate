# Literate: a little more room to read

Draft storyboard and narration • October 15, 2026

A practical introduction for someone who has just installed Literate. The goal is to get one article playing, then show how to control what is read and keep the player nearby.

The script/storyboard is approved for the opening audition. A 6.325-second opening sample has been generated locally in VoiceStudio using Kokoro Heart. The real extension also loaded all 157 script words with Heart and displayed them in its mini-player; playback is paused for review. This is not a rendered video. The extension's release checks remain separate from video production.

## Proposed format

- About 90 seconds, English, 1920×1080 landscape. Proposed for a YouTube walkthrough or embedded help; destination and exact length can be revised.
- Actual extension footage with restrained cursor highlights and close-ups of the control being used. Professional, minimal presentation using Literate's periwinkle accent, neutral dark and warm light surfaces.
- One short instruction at a time. Readable captions, gentle transitions and brief holds after each click. No fabricated controls, fake download progress or exaggerated performance claims.
- Heart (`af_heart`) from Kokoro is the selected voice. Audition the opening through VoiceStudio; record Literate actually reading the script for the demonstration segments.
- Current step: audition the opening and prepare the real reading page. The full recording, animation and final render follow the accepted voice sample.

## Storyboard

Timings are editorial targets. Actual VoiceStudio take lengths determine final cuts; allow space for people to see each action.

| Time | What we show | Narration | Short screen text |
| --- | --- | --- | --- |
| 0:00–0:07 | Open on the real mini-player following this walkthrough script, using Literate's actual Heart audio. Brief title with the existing logo. If using the VoiceStudio opening instead, show the title without active word highlighting. | Meet Literate: a free, open-source reader for articles, selected text, and local PDFs. | A little more room to read. |
| 0:07–0:21 | In a separate settings demonstration, zoom into Settings → Voice engine and show both real options. Select Instant for the quick-start example. Restore Natural — Kokoro → Heart before returning to the script's live playback. | In Settings, choose Instant for the quickest start with installed device voices. Or choose Natural for Kokoro, which downloads its model before first use. | Instant: installed local English voices. Natural: first model download ≈326 MB on GPU / ≈92 MB on CPU, plus voice files. |
| 0:21–0:33 | Cut to a separate demonstration on the original sample article. Click Play and use that page's actual audio while showing highlighted words. Cut to a selected passage and the real Read selection aloud context menu. | Open an article, click Literate, and press Play. Follow the highlighted words. For a shorter passage, select the text, right-click, and choose Read selection aloud. | Read a page. Or just a passage. |
| 0:33–0:43 | Use a sample page with an article and sidebar. Click Choose section, hover the article, then click. Let the outline and resulting scope be visible. | Want to skip a sidebar? Choose section, point at the part you want, and click. Literate reads that section. | Choose section → point → click. |
| 0:43–0:57 | Click Open mini-player. Show scrolling Reading text, click one word and demonstrate playback starting there. Click Keep on top and show the actual floating window over another harmless window. | Open the mini-player to follow the scrolling words. Click a word to jump there. Use the pin to keep the player above other windows. | Click a word to jump. Pin to keep on top.* |
| 0:57–1:07 | Change speed with + or the numeric × control. Briefly demonstrate the player's light/dark switch and Settings → Accent color with Periwinkle. Include a clearly labeled cut to Page appearance → Dark to distinguish page styling from player styling. | Adjust the speed, switch between light and dark, and choose your accent color. | Your pace. Your appearance. |
| 1:07–1:22 | Show Chrome's real Literate extension details with Allow access to file URLs. Open an original text-based PDF, then press Play in Literate's extracted-text reader. | For local PDFs, enable Allow access to file URLs in Chrome’s extension settings. Then open the PDF. Scanned documents need text recognition first. | Local PDFs: enable file access. Scanned PDFs need OCR first. |
| 1:22–1:30 | Return to the walkthrough reading page's mini-player, with its source tab visibly open. Use that page's actual Heart audio, then finish on the logo and a readable help link. | Your reading stays on your device. Keep the original page open, find your pace, and listen. | Free and open source. No account or speech-service subscription. github.com/Tajinnnnn/literate |

*Pinning requires a browser with Document Picture-in-Picture support. Use supported desktop Chrome for the recording. The original reading page must remain open; navigating or refreshing it disconnects that mini-player session.

## VoiceStudio dubbing plan

The clean spoken script is in [narration.txt](narration.txt), one paragraph per scene.

1. The user selected **Kokoro Heart (`af_heart`)**. VoiceStudio's MLX Audio adapter supports that exact stock preset. Use the cached Kokoro model through the local API; no Chatterbox approximation, voice cloning or unused OmniVoice download.
2. Audition the first paragraph through VoiceStudio as a standalone WAV. Preserve the unprocessed original and record model, voice, speed, duration and generation route. Do not claim identical waveforms across VoiceStudio's MLX and Literate's ONNX runtimes.
3. The main demonstration should show **Literate reading its own script**, using [reading-script.html](reading-script.html). Record the actual word highlighting, mini-player transcript and genuine extension audio. Use that real audio wherever the screen is presented as a live speech demonstration.
4. Record an uninterrupted master read first. Then capture separate control demonstrations and edit them into the corresponding sections. A seek click changes what the reader says; do not fake uninterrupted audio or desynchronize the highlighted words to hide that.
5. VoiceStudio can provide the opening, outro or explanatory inserts. Do not replace a supposedly live Literate sample with a VoiceStudio take. Clearly separate inserts from live playback, even though both use Heart.
6. Keep all original takes. Listen for pronunciation of “Literate,” “Kokoro,” and “PDFs,” omitted words and clipped endings. Fit the cut to measured audio, leaving space after visible actions. No music has been selected; keep this first audition clean.

Opening audition: `heart-opening-voicestudio.wav`, stored with provenance and local verification in the parent vault's `media/audio/literate-walkthrough-2026-10-15/`. Original response: 6.325 seconds, 24 kHz mono, speed 1.0, with no tempo processing. Local transcription recovered the full sentence through “local PDFs”; pronunciation of the product name remains a listening check. The original WAV is not included in this repository.

## Recording checklist

- Use the [walkthrough reading page](reading-script.html) for the primary demonstration. Record only original articles/PDFs. The existing [sample article](../../store/demo/index.html) is available; add a clearly separate sidebar for the section-selection example.
- Use a clean browser view. Hide private tabs, bookmarks, account names, notifications, local personal file paths and unrelated applications.
- Use the existing logo and a periwinkle player. Capture real UI at readable size; the store screenshots provide a framing reference, not substitutes for demonstrations of clicks.
- Leave optional shortcuts empty; do not demonstrate old P/L bindings.
- Do not say Kokoro is instant on every device or that the extension never connects to the internet. Model/voice files come from Hugging Face; narration generation runs locally. Device voices require a compatible installed local US/UK English voice.
- The PDF reader extracts/reflows text, rather than preserving the full original PDF layout. It does not perform OCR. Keep the PDF demonstration simple enough that the result is clear.
- Use the current GitHub help/install link at the close. Do not show a Chrome Web Store badge or claim store approval until publication actually happens. The full beta installation guide can be linked beneath the video instead of crowding the walkthrough.
- The opening audition uses a local VoiceStudio backend and cached Heart model assets. No paid/cloud speech service or finished video render is part of this step.

## Sources for accuracy

- [Current features and setup](../../README.md)
- [Actual popup controls](../../src/pages/Popup/Popup.jsx)
- [Section selection](../../src/pages/Content/modules/sectionPicker.js)
- [Floating player](../../src/pages/Popup/floatingPlayer.js)
- [Local PDF reader](../../src/pages/PdfViewer/index.js)
- [Model files and approximate sizes](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/tree/main/onnx)
- Earlier local VoiceStudio comparison: `media/audio/voicestudio-test-2026-10-14/test-notes.txt` in the parent vault. This is production context, not a public video asset or a file to upload.

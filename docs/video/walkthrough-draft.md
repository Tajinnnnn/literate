# Literate: a little more room to read

Animation production record • October 16, 2026

A practical overview for someone who has just installed Literate, describing its reading and voice options without directing the viewer through a sequence of commands.

The user selected a fully animated explainer. The v3 canonical script has **219 words in eight paragraphs**, including the revised opening, balanced voice tradeoffs, and customization wording. Its visuals illustrate the features; they are not a live UI recording. The actual local Kokoro Heart recording provides **87.130583 seconds** of edited narration for a **91.130583-second authored film**. The final **91.133333-second export is verified**, including all 219 words, captions, and both mini player phrases. The previous verified v2 export is preserved. Editable source is in [walkthrough/](walkthrough/). The extension's release checks remain separate from video production.

## Format

- English, 1920×1080 landscape, 30 fps. **Verified v3 export: 91.133333 seconds**. The authored 91.130583-second timeline comprises a 1.5-second introduction, 87.130583-second narration, and 2.5-second closing hold. Output filename: `literate-walkthrough-v3.mp4`.
- Eight animated chapters, one per approved script paragraph. Their transitions follow the revised audio's measured paragraph cues.
- Professional, minimal presentation: periwinkle accent, neutral dark and warm light surfaces, generous spacing, and a larger, readable player illustration.
- One idea at a time, with descriptive headings and short explanations of the available options. Use gentle transitions and restrained pointer cues. The illustrated text movement must not imply a captured, word-accurate live session.
- Actual local extension narration with **Kokoro Heart (`af_heart`)** throughout. No screen recordings, B-roll, or additional VoiceStudio dubbing are required for this revision.
- A quiet music bed supports the voice. Speech remains clear and prominent.

## Animated chapters

The canonical wording below matches [narration.txt](narration.txt). Descriptive chapter headings orient the viewer; genuine UI labels such as Read selection aloud and Choose section remain labels rather than commands. Both reading pages use the same canonical wording, with the pronunciation spelling documented below.

| Chapter | Animation | Narration | Short screen heading |
| --- | --- | --- | --- |
| 1. Intro | The existing logo and a large player illustration introduce article, selection, and PDF reading. | Literate is a free, open-source extension built to read to you. It works with articles, selected text, and local PDFs. | Your reading, out loud. |
| 2. Voices | Balanced option cards pair Instant with quick startup and variable voice quality, and Natural with a downloaded model, a more natural sound, and possible warmup. | Instant voice mode uses voices already installed on your device and can start almost immediately, even on slower devices, though some voices may sound robotic. Natural voice mode uses a downloaded Kokoro model for more natural narration, but may need time to warm up before playback. Its files stay cached for later reading. | Two ways to listen. |
| 3. Reading | An article illustration highlights words; a selected passage reveals the Read selection aloud label. | On an article, you can listen to the main text with words highlighted as it plays. Selected passages also have a right-click option: Read selection aloud. | Articles. Selected text. |
| 4. Section | An outline emphasizes the selected article region while the sidebar recedes. | The section picker lets you focus on a particular part of the page, leaving sidebars and related stories outside the reading area. | A focused reading area. |
| 5. Player | A larger player illustration shows scrolling text, clickable words, and an optional pin above abstract window cards. | The mini player keeps scrolling text nearby. You can click individual words to jump around, or pin the player above other windows in supported browsers. | Text that stays nearby. |
| 6. Appearance | The speed value, player light/dark appearance, and accent palette animate without turning into step-by-step commands. | You can customize the narration speed and the extension’s appearance, with light and dark modes and a choice of accent colors. Periwinkle is the default. | Your pace. Your appearance. |
| 7. Pdf | A PDF illustration pairs with the Allow access to file URLs label, then becomes readable text blocks. | Local PDFs are supported with Chrome’s file-access permission. The reader works with existing text, while scanned documents need text recognition first. | Local PDFs, with a voice. |
| 8. Outro | The player and its still-open source page share one device, followed by the existing logo and GitHub help link. | The speech runs on your device. Kokoro’s files download from Hugging Face, and the source page needs to remain open while the mini player is in use. | Private listening. Your own pace. |

## Narration source and timing

The canonical script is in [narration.txt](narration.txt), one paragraph per chapter. The repository [reading page](reading-script.html) preserves the same display wording.

- Voice: actual **Literate / Kokoro Heart (`af_heart`)**, recorded locally from the extension. The complete revised read contains all **219 words in eight paragraphs**.
- **Pronunciation:** the canonical script uses **mini player** with a space at both occurrences to cue “MIN-ee player.” Both reading pages and captions follow that exact wording. Existing UI labels and the illustrated design may retain **MINI-PLAYER**; no separate spoken alias is used.
- Edited narration duration: **87.130583 seconds**. Raw/cut boundaries and the complete wording are verified; v2 source intervals and cues do not apply to this read.
- Cleanup shortens exactly **one silent buffering gap from 4.2394167 seconds to 0.550 seconds**. No spoken samples are removed, and playback speed remains unchanged. Preserve the original capture alongside the edited master and its processing record.
- Narration begins at **1.500000 seconds** and ends at **88.630583 seconds**. The 2.5-second closing hold ends at the **91.130583-second** authored endpoint. The verified container duration is **91.133333 seconds**, a **2.75 ms** increase from frame rounding.

## Music

The background track is **[Sunset Plains by Yoiyami](https://opengameart.org/content/sunset-plains)**. Its original OpenGameArt page declares **CC0**, including use without required attribution; checked October 16, 2026. Retain the source and license record beside the editable assets. A source credit can also accompany the published video's description.

A quiet derived excerpt supports the local Heart narration. The verified actual encoded v3 mix measures **−15.98 LUFS** and **−1.17 dBTP**.

## Production notes and checks

- Clearly present an **animated explainer with actual extension narration**, not live UI footage. Illustrations may simplify layout, but must retain truthful control labels and behavior.
- Natural mode downloads model and voice files from Hugging Face; speech generation runs locally. Do not imply instant Kokoro startup on every device or zero network activity. First model download is about 326 MB on GPU or 92 MB on CPU, plus voice files.
- Instant mode requires a compatible installed local US/UK English voice. Availability and quality depend on the device.
- Article detection is best effort. Choose section provides a more precise reading scope; it is not an OCR or automatic-content guarantee.
- Pinning requires browser support for Document Picture-in-Picture. The original reading page needs to remain open; navigating or refreshing it disconnects that mini-player session.
- The PDF reader extracts and reflows existing text. Local PDFs require file access, and scanned/image-only documents need OCR elsewhere first.
- Player light/dark mode is separate from the Page appearance control. Accent color defaults to Periwinkle. Optional shortcuts remain unassigned; do not illustrate old P/L bindings.
- Keep text large and brief, contrast readable, and the final GitHub help link visible through the closing hold. Include no private documents, personal paths, or account details.
- Do not show a Chrome Web Store badge or imply store approval. The beta installation guide can accompany the video.
- Final verification inspected **11 decoded frames from the actual export**, covering all eight chapters, both sides of the theme toggle, and the final hold. Layout and text are clean. A separate lossless comparison confirmed that the appearance title's glyphs are complete and identical, resolving a downsample/readback concern. All **219 spoken words**, captions, both **mini player** phrases, and the final encoded mix are verified. Earlier exports, original audio, and editable composition files are preserved.

## Sources for accuracy

- [Current features and setup](../../README.md)
- [Actual popup controls](../../src/pages/Popup/Popup.jsx)
- [Section selection](../../src/pages/Content/modules/sectionPicker.js)
- [Floating player](../../src/pages/Popup/floatingPlayer.js)
- [Local PDF reader](../../src/pages/PdfViewer/index.js)
- [Model files and approximate sizes](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/tree/main/onnx)
- [Sunset Plains: original music source and CC0 declaration](https://opengameart.org/content/sunset-plains)

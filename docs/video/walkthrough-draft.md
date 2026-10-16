# Literate: a little more room to read

Animation production record • October 16, 2026

A practical overview for someone who has just installed Literate, describing its reading and voice options without directing the viewer through a sequence of commands.

The user selected a fully animated explainer. The approved narration has **176 words in eight paragraphs** and uses Literate's actual Kokoro Heart voice, recorded locally. Its visuals illustrate the features; they are not a live UI recording. The verified second revised take provides **71.100 seconds** of narration for the completed **75.100-second** v2 export at **1920×1080, 30 fps**. Final video and audio verification are complete. Editable source is in [walkthrough/](walkthrough/). The extension's release checks remain separate from video production.

## Format

- English, 1920×1080 landscape, 30 fps. **Runtime: 75.1 seconds**, including a 1.5-second introduction, 71.1-second narration, and 2.5-second closing hold.
- Eight animated chapters, one per approved script paragraph. Their transitions follow the revised audio's measured paragraph cues.
- Professional, minimal presentation: periwinkle accent, neutral dark and warm light surfaces, generous spacing, and a larger, readable player illustration.
- One idea at a time, with descriptive headings and short explanations of the available options. Use gentle transitions and restrained pointer cues. The illustrated text movement must not imply a captured, word-accurate live session.
- Actual local extension narration with **Kokoro Heart (`af_heart`)** throughout. No screen recordings, B-roll, or additional VoiceStudio dubbing are required for this revision.
- A quiet music bed supports the voice. Speech remains clear and prominent.

## Animated chapters

The spoken wording below matches [narration.txt](narration.txt). The chapter headings reflect the revised descriptive copy in [chapters.json](walkthrough/chapters.json); genuine UI labels such as Read selection aloud and Choose section remain labels rather than commands to the viewer.

| Chapter | Animation | Narration | Short screen heading |
| --- | --- | --- | --- |
| 1. Intro | The existing logo and a large player illustration introduce article, selection, and PDF reading. | Literate is a free, open-source way to listen to articles, selected text, and local PDFs. | Your reading, out loud. |
| 2. Voices | Two voice-option cards show Instant and Natural, with an initial-download cue beside Kokoro. | There are two voice options. Instant uses installed device voices. Natural uses Kokoro, with an initial model download. The files stay cached for later reading. | Two ways to listen. |
| 3. Reading | An article illustration highlights words; a selected passage reveals the Read selection aloud label. | On an article, you can listen to the main text with words highlighted as it plays. Selected passages also have a right-click option: Read selection aloud. | Articles. Selected text. |
| 4. Section | An outline emphasizes the selected article region while the sidebar recedes. | The section picker lets you focus on a particular part of the page, leaving sidebars and related stories outside the reading area. | A focused reading area. |
| 5. Player | A larger player illustration shows scrolling text, clickable words, and an optional pin above abstract window cards. | The mini-player keeps scrolling text nearby. You can click individual words to jump around, or pin the player above other windows in supported browsers. | Text that stays nearby. |
| 6. Appearance | The speed value, player light/dark appearance, and accent palette animate without turning into step-by-step commands. | Speed, light and dark modes, and accent colors can all be adjusted. Periwinkle is the starting color. | Your pace. Your appearance. |
| 7. Pdf | A PDF illustration pairs with the Allow access to file URLs label, then becomes readable text blocks. | Local PDFs are supported with Chrome’s file-access permission. The reader works with existing text, while scanned documents need text recognition first. | Local PDFs, with a voice. |
| 8. Outro | The player and its still-open source page share one device, followed by the existing logo and GitHub help link. | The speech runs on your device. Kokoro’s files download from Hugging Face, and the source page needs to remain open while the mini-player is in use. | Private listening. Your own pace. |

## Narration source and timing

The clean spoken script is in [narration.txt](narration.txt), one paragraph per chapter. The [reading page](reading-script.html) contains the same eight paragraphs for the extension's local read.

- Voice: actual **Literate / Kokoro Heart (`af_heart`)**, recorded on the device. The animation uses the revised complete extension read, not the earlier VoiceStudio opening audition or the previous narration.
- Source: raw **take02**, interval **10.850–81.950 seconds**, yielding the verified **71.100-second** trimmed narration. The original capture, processing records, and paragraph cues are retained with the audio assets.
- Narration starts at **1.500 seconds** and ends at **72.600 seconds**. The 2.500-second closing hold ends at **75.100 seconds**. Chapter boundaries follow the measured revised recording.
- Keep the approved wording and natural cadence. Do not stretch the voice or reuse old cues to fit the revised script.
- The final audio contains the complete **176-word** script. Heart's timing and natural cadence remain unchanged. Animation cues follow the voice; they do not establish word-level timing accuracy in the extension.

## Music

The background track is **[Sunset Plains by Yoiyami](https://opengameart.org/content/sunset-plains)**. Its original OpenGameArt page declares **CC0**, including use without required attribution; checked October 16, 2026. Retain the source and license record beside the editable assets. A source credit can also accompany the published video's description.

A quiet derived excerpt is mixed locally below the narration. The verified final mix measures approximately **−15.9 LUFS** and **−1.2 dBTP**, with Heart's timing unchanged.

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
- Final verification covered **10 frames from the actual export**, including all eight chapters, the theme transition, and the closing hold. The complete narration and final voice/music mix were verified. Original audio and editable composition files are preserved.

## Sources for accuracy

- [Current features and setup](../../README.md)
- [Actual popup controls](../../src/pages/Popup/Popup.jsx)
- [Section selection](../../src/pages/Content/modules/sectionPicker.js)
- [Floating player](../../src/pages/Popup/floatingPlayer.js)
- [Local PDF reader](../../src/pages/PdfViewer/index.js)
- [Model files and approximate sizes](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/tree/main/onnx)
- [Sunset Plains: original music source and CC0 declaration](https://opengameart.org/content/sunset-plains)

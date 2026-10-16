---
workflow: general-video
flow: automation
storyboard: no
message: Explain Literate’s reading and voice options through a clear animated overview with Heart narration.
aspect: 1920x1080
language: en
voice: Kokoro Heart
length: measured revised narration plus a 1.5-second opening and 2.5-second closing hold
---

## Intent

A finished, clean animated overview of the free, open-source Literate extension. The user approved the animation style, then requested informative Heart narration describing the available options instead of directing the viewer through commands. On-screen copy follows the same descriptive tone. A larger illustrated mini-player is one chapter’s visual, presented as animation throughout.

## Assets

- `../narration.txt` — approved eight-paragraph narration, read through the real extension.
- `assets/narration.wav` — actual extension Heart playback, recorded locally, trimmed at the ends and normalized for listening level. No voice replacement, tempo edits or internal cuts; exact processing is recorded in `assets/timings.json`.
- `assets/timings.json` — measured audio duration and paragraph starts, obtained from the recording and transcript.
- `assets/logo.svg` — existing Literate mark from the extension source; no redraw.
- `assets/music-bed.wav` — a quiet derived excerpt of “Sunset Plains” by Yoiyami, declared CC0 at its original OpenGameArt source. The source, license and processing are recorded beside the asset.
- `assets/film-mix.wav` — the full film’s frozen PCM mix, derived locally from those preserved inputs. It is the composition’s only audio track.

## Customizations

- Large, clean illustrated mini-player and restrained feature animations. No OS title bar, browser border, private tabs, or unrelated content.
- Periwinkle on neutral dark, professional and minimal.
- Genuine extension Heart narration drives the timing. The animation does not pretend to show live playback or captured clicks.
- Quiet, copyright-safe background music, locally mixed with short fades beneath the voice. Existing approved layout and animations remain intact.
- Parent has recorded explicit user authorization for the finished video render. No further render-approval question is needed.

## Notes

- No cloud generation, paid provider, avatar, unrelated footage, or simulated live word highlighting.
- Revised measured narration controls the duration. It starts at 1.5 seconds, followed by a 2.5-second closing hold. Paragraph cues are shifted by that same opening offset; the current schedule is recorded in `media-metadata.json`.
- Original reading tab must remain open. Pin support depends on Document Picture-in-Picture. Natural speech downloads model/voice assets before local inference; do not claim zero network activity.
- The recorded narration contains only the approved overview text. License/store-release verification remains separate. Capture-led source is preserved in `archive/`; it is not part of the current composition.
- Audio QA found a short stereo anomaly in the component-mixed AAC candidate. The isolated carved bed was clean. The final uses a direct FFmpeg mix of the preserved voice and quiet fade-only bed, followed by AAC encoding with perceptual noise substitution and intensity stereo disabled. Candidate and isolated evidence are preserved; no voice timing or gain changed.

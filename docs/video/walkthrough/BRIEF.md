---
workflow: general-video
flow: automation
storyboard: no
message: Show how to use Literate through a clear animated guide, narrated by its actual Heart voice.
aspect: 1920x1080
language: en
voice: Kokoro Heart
length: 64.350s
---

## Intent

A finished, clean animated walkthrough of the free, open-source Literate extension. The user approved the script and then chose “Just make an animation,” replacing the detailed screen-recording approach. Large typography and simple feature diagrams explain one action at a time. A larger illustrated mini-player is one chapter’s visual, presented as animation throughout.

## Assets

- `../narration.txt` — approved eight-paragraph narration, read through the real extension.
- `assets/narration.wav` — actual extension Heart playback, recorded locally, trimmed at the ends and normalized for listening level. No voice replacement, tempo edits or internal cuts; exact processing is recorded in `assets/timings.json`.
- `assets/timings.json` — measured audio duration and paragraph starts, obtained from the recording and transcript.
- `assets/logo.svg` — existing Literate mark from the extension source; no redraw.

## Customizations

- Large, clean illustrated mini-player and restrained feature animations. No OS title bar, browser border, private tabs, or unrelated content.
- Periwinkle on neutral dark, professional and minimal.
- Genuine extension Heart narration drives the timing. The animation does not pretend to show live playback or captured clicks.
- Parent has recorded explicit user authorization for the finished video render. No further render-approval question is needed.

## Notes

- No cloud generation, music, paid provider, avatar, additional capture, or simulated live word highlighting.
- The measured narration is 60.350 seconds. It starts at 1.5 seconds, followed by a 2.5-second closing hold. Paragraph cues are shifted by that same 1.5-second offset. Total length is 64.350 seconds.
- Original reading tab must remain open. Pin support depends on Document Picture-in-Picture. Natural speech downloads model/voice assets before local inference; do not claim zero network activity.
- The recorded narration contains only the original walkthrough text. License/store-release verification remains separate. Capture-led source is preserved in `archive/`; it is not part of the current composition.

# Literate animated walkthrough

A 64.350-second, 1920×1080 guide with the real extension’s locally recorded Kokoro Heart narration. Visuals are illustrations, not a live extension recording. No music, cloud generation, or paid provider was used.

`assets/timings.json` records the audio source, processing, hashes, and measured paragraph cues. The audio is 60.350 seconds, starts at 1.5 seconds, and leaves 2.5 seconds at the end. `media-metadata.json` records the resulting chapter schedule.

Rebuild the HTML and its eight chapter compositions with `node build-animation.mjs`. Run `npm run check` before rendering. The scaffold pins HyperFrames 0.8.163. Studio preview should be started with `npx hyperframes@0.8.163 preview --background` and its status verified before sharing the local URL.

`index.html` is the entry. `chapters.json` supplies concise copy. `build-animation.mjs` generates each chapter from measured narration cues. `BRIEF.md`, `frame.md`, and `STORYBOARD.md` document the final intent and structure. Source for the abandoned capture-led layout is preserved in `archive/` and excluded from the active entry.

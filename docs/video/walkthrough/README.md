# Literate animated walkthrough

A 1920×1080 animated overview with the real extension’s locally recorded Kokoro Heart narration. Version 3 uses the revised introduction, explains the Instant/Natural startup and sound tradeoffs, and describes the customization options. Visuals are illustrations, not a live extension recording. Quiet background music uses a CC0 excerpt of [Sunset Plains by Yoiyami](https://opengameart.org/content/sunset-plains), mixed locally. No cloud generation or paid provider is used.

`assets/timings.json` records the voice source, processing, hashes, and measured paragraph cues. The voice starts at 1.5 seconds and leaves 2.5 seconds at the end. `media-metadata.json` records the measured film duration, chapter schedule, and music provenance. [Music license and source](assets/music-license.md) documents the CC0 declaration.

V3 preserves all spoken samples from the actual extension recording. The only internal cleanup shortens one 4.239-second silent buffering pause between the intro’s sentences to 0.55 seconds, without changing playback speed. Cues and captions follow that cleanup; the unedited capture remains preserved.

Rebuild the HTML, eight chapter compositions, and frozen full-film PCM audio with `node build-animation.mjs`. FFmpeg and FFprobe are required; `FFMPEG_PATH` can specify the FFmpeg binary. The build requires matching revised voice cues, a licensed local music bed, and its metadata. It sums the unchanged voice at its 1.5-second offset with the quiet bed and 0.8-second entrance/2-second exit fades. The composition plays only `assets/film-mix.wav`, so preview matches the final mix without overlapping live stems.

The first component-mixed AAC candidate showed AAC stereo reconstruction during a voice fricative. The isolated carved music was clean; no audible click or carve defect was established. The final uses the stable PCM mix with a quiet fade-only bed. Delivery copies the approved video frames and encodes that PCM directly with FFmpeg AAC at 256 kbit/s, `-aac_pns 0 -aac_is 0`; voice timing and gain stay unchanged. Run `node finalize-video.mjs candidate.mp4 final.mp4` after rendering. It preserves the input and rejects an existing output unless `--overwrite` is explicit. The first candidate and isolated evidence remain preserved outside the repository.

Run `npm run check` before rendering. The CLI scripts pin HyperFrames 0.8.164; the retained audio-core dependency is 0.8.163. Studio preview should be started with `npx hyperframes@0.8.164 preview --background` and its status verified before sharing the local URL. The revised delivery is `literate-walkthrough-v3.mp4`; earlier exports and their source inputs remain preserved separately. Verify the actual encoded audio and decoded frames before delivery.

V3 updates the CLI pin from 0.8.163 to 0.8.164 after the official latest-version probe. The existing composition passed the new CLI’s lint, runtime, layout, and contrast checks before retiming; the final revision is checked again before export.

`index.html` is the entry. `chapters.json` supplies concise copy. `build-animation.mjs` generates each chapter from measured narration cues. `BRIEF.md`, `frame.md`, and `STORYBOARD.md` document the final intent and structure. Source for the abandoned capture-led layout is preserved in `archive/` and excluded from the active entry.

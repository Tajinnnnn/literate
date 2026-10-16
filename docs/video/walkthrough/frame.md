# Literate walkthrough design

Concept: Literate’s options become easy to understand. The real extension’s Heart voice describes them while oversized typography and simple animated diagrams show what each option provides.

- Canvas: 1920×1080, 30 fps, solid neutral dark `#111215` on a full-frame child, foreground `#f2f0f5`, muted copy `#b6b8c6`, periwinkle `#9aa0ff`, rules `#30323b`.
- Layout: 80 px side safe area, 64 px vertical safe area. Each chapter uses a 760 px copy column, 80 px gap, and 920 px feature illustration. Persistent logo and URL anchor the frame.
- Focal elements: the current large feature statement and its animated illustration. The illustration changes state to explain the option; there is no fabricated recording.
- Type: bundled Montserrat 900 for large statements and Montserrat 400 for explanation; bundled IBM Plex Mono 400 for chapter labels and URL. Sans is the friendly voice; mono marks exact control names and location.
- Scale: headings 88 px, body 31 px, chapter labels/URL 22 px. The smaller metadata remains subordinate; all descriptions are large enough for 1080p playback.
- Anchors: existing logo and Literate wordmark upper left, chapter content below, and a tutorial progress rule and repository URL along the lower edge.
- Motion: smooth `power3.out` entrances, restrained control compression/release, selection sweeps, section emphasis, a scrolling illustrative text block, a theme change and speed state, and a PDF permission check. One paused timeline per chapter; the root owns the measured audio and guide progress. Rules: `spring-pop-entrance`, `press-release-spring`, and `stat-bars-and-fills`.
- Sparse flat field is intentional. No glows, fake cursors, background drift, gradients, sound marks, or simulated karaoke timing. The intro’s abstract bars illustrate listening and do not claim to be an audio meter.
- Imagery: existing Literate logo plus simple native vector/HTML feature diagrams. The persistent “An animated guide” label makes their role clear. No footage, provider imagery or supporting screenshots are needed.
- Audio: genuine Heart narration in front, with a quiet CC0 music excerpt underneath and short entrance/exit fades. A frozen full-film PCM mix preserves the voice’s timing and avoids the evidenced component-mixed AAC anomaly; final AAC encoding disables perceptual noise substitution and intensity stereo. No transition sound effects are added.
- Copy: descriptive statements, not commands. Exact names such as “Choose section” and “Read selection aloud” remain visible as control names.

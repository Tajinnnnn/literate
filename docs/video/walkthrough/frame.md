# Literate walkthrough design

Concept: reading becomes a small, understandable sequence of actions. The real extension’s Heart voice explains them while oversized typography and simple animated diagrams make each action easy to follow.

- Canvas: 1920×1080, 30 fps, solid neutral dark `#111215` on a full-frame child, foreground `#f2f0f5`, muted copy `#b6b8c6`, periwinkle `#9aa0ff`, rules `#30323b`.
- Layout: 80 px side safe area, 64 px vertical safe area. Each chapter uses a 760 px instruction column, 80 px gap, and 920 px feature illustration. Persistent logo and URL anchor the frame.
- Focal elements: the current large instruction and its animated feature illustration. The illustration changes state to explain the action; there is no fabricated recording.
- Type: bundled Montserrat 900 for large statements and Montserrat 400 for explanation; bundled IBM Plex Mono 400 for chapter labels and URL. Sans is the friendly voice; mono marks exact control names and location.
- Scale: headings 88 px, body 31 px, chapter labels/URL 22 px. The smaller metadata remains subordinate; all instructions are large enough for 1080p playback.
- Anchors: existing logo and Literate wordmark upper left, chapter content below, and a tutorial progress rule and repository URL along the lower edge.
- Motion: smooth `power3.out` entrances, restrained control compression/release, selection sweeps, section emphasis, a scrolling illustrative text block, a theme change and speed state, and a PDF permission check. One paused timeline per chapter; the root owns the measured audio and guide progress. Rules: `spring-pop-entrance`, `press-release-spring`, and `stat-bars-and-fills`.
- Sparse flat field is intentional. No glows, fake cursors, background drift, gradients, sound marks, or simulated karaoke timing. The intro’s abstract bars illustrate listening and do not claim to be an audio meter.
- Imagery: existing Literate logo plus simple native vector/HTML feature diagrams. The persistent “An animated guide” label makes their role clear. No footage, provider assets or supporting screenshots are needed.

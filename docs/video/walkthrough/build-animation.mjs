import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const audioStart = 1.5;
const outroHold = 2.5;
const timing = JSON.parse(fs.readFileSync(path.join(root, 'assets/timings.json'), 'utf8'));
const measured = JSON.parse(execFileSync('/opt/homebrew/bin/ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path.join(root, 'assets/narration.wav')], { encoding: 'utf8' }));
const audioDuration = Number(measured.format.duration);
if (!Number.isFinite(audioDuration) || Math.abs(audioDuration - timing.audioDuration) > .03) throw new Error('Narration metadata differs from measured audio.');
const duration = audioStart + audioDuration + outroHold;
const chapters = JSON.parse(fs.readFileSync(path.join(root, 'chapters.json'), 'utf8'));
if (chapters.length !== timing.chapters.length) throw new Error('Every approved narration paragraph needs a matching chapter.');
const starts = timing.chapters.map((chapter, i) => i === 0 ? 0 : audioStart + chapter.audioStart);
if (starts.some((start, i) => !Number.isFinite(start) || (i && start <= starts[i - 1]))) throw new Error('Measured chapter starts must increase.');
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const logo = fs.readFileSync(path.join(root, 'assets/logo.svg'), 'utf8').replace(/\s+role="[^"]*"|\s+aria-labelledby="[^"]*"/g, '').replace(/<title[^>]*>.*?<\/title>/s, '');
const line = (width = 100, cls = '') => `<div class="line ${cls}" style="width:${width}%"></div>`;
const lines = () => [100, 94, 98, 79, 96, 64].map(w => line(w)).join('');
const svg = (content, cls = '') => `<svg class="symbol ${cls}" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
const play = svg('<path d="m40 26 34 24-34 24Z"/>');
const computer = svg('<rect x="12" y="16" width="76" height="52" rx="6"/><path d="M4 82h92M38 68v14m24-14v14"/>');
const pin = svg('<path d="M35 12h30l-5 28 18 18H22l18-18-5-28ZM50 58v30"/>');
const check = svg('<path d="m20 52 20 20 42-44"/>');
const lock = svg('<rect x="22" y="43" width="56" height="43" rx="8"/><path d="M34 43V28a16 16 0 0 1 32 0v15"/>');
const visuals = {
  intro: `<div id="intro-logo" class="hero-logo">${logo}</div><div class="wave">${[72, 116, 166, 116, 72].map((h, i) => `<div id="intro-wave-${i}" style="height:${h}px"></div>`).join('')}</div><p class="art-caption">Read. Follow. Listen.</p>`,
  voices: `<div id="voices-device" class="voice-row"><div class="voice-symbol">${computer}</div><div><h2>Instant</h2><p>Installed device voices</p></div></div><div id="voices-natural" class="voice-row natural"><div class="voice-symbol">${svg('<path d="M22 50v-8a28 28 0 0 1 56 0v8"/><rect x="14" y="46" width="18" height="32" rx="7"/><rect x="68" y="46" width="18" height="32" rx="7"/>')}</div><div><h2>Natural</h2><p>Kokoro, on your device</p></div><div class="download-note">First use: download model</div></div><div id="voices-model" class="model-chip">MODEL ${svg('<path d="M50 14v58m-21-21 21 21 21-21M18 86h64"/>')}</div>`,
  reading: `<div id="reading-page" class="paper"><p class="paper-label">AN ARTICLE</p>${lines()}<div id="reading-selection" class="selected-line">A selected passage</div>${line(85)}${line(68)}</div><div id="reading-play" class="play-orb">${play}</div><div id="reading-menu" class="selection-label">Read selection aloud</div>`,
  section: `<div id="section-main" class="article-pane"><p class="paper-label">ARTICLE</p>${lines()}${line(94)}${line(75)}</div><div id="section-sidebar" class="sidebar"><p class="paper-label">RELATED</p>${lines()}</div><div id="section-outline" class="selection-outline"></div><div id="section-caption" class="selection-label">Choose section</div>`,
  player: `<div id="player-window" class="player-pane"><div class="player-top"><span>MINI-PLAYER</span><div id="player-pin">${pin}</div></div><div class="player-text"><p>Your reading,</p><p>out loud.</p></div><div class="player-transport"><span class="short-rule"></span><div class="small-play">${play}</div><span class="short-rule"></span></div><div class="lyric-window" data-layout-allow-overflow><div id="player-lyrics"><p>Follow the words.</p><p class="accent">Find your place.</p><p>Keep listening.</p></div></div></div><div id="player-word" class="jump-note">Click a word to jump</div>`,
  appearance: `<div id="appearance-panel" class="appearance-pane"><p class="panel-label">PLAYBACK SPEED</p><div class="speed-number"><span id="appearance-one">1.0×</span><span id="appearance-two">1.2×</span></div><div class="speed-track"><div id="appearance-knob"></div></div><div class="theme-labels"><span>Light</span><span>Dark</span></div></div><div class="swatches"><div id="swatch-blue" style="background:#9aa0ff"></div><div style="background:#8bdbb5"></div><div style="background:#ff918d"></div></div>`,
  pdf: `<div id="pdf-sheet" class="pdf-sheet"><p>PDF</p>${lines()}${line(83)}</div><div id="pdf-permission" class="permission-note"><div class="permission-check">${check}</div><p>Allow access to file URLs</p></div>`,
  outro: `<div id="outro-logo" class="hero-logo">${logo}</div><div id="outro-private" class="privacy-mark">${lock}<p>On your device.</p></div><p class="art-caption">Free and open source.</p>`
};
const motion = {
  intro: `tl.fromTo('#intro-logo',{scale:.72,opacity:0},{scale:1,opacity:1,duration:.75,ease:'power3.out'},.1); [0,1,2,3,4].forEach(i=>tl.fromTo('#intro-wave-'+i,{scaleY:.38},{scaleY:1,duration:.52,yoyo:true,repeat:5,ease:'sine.inOut'},1.2+i*.08));`,
  voices: `tl.fromTo('#voices-device',{x:48,opacity:0},{x:0,opacity:1,duration:.55,ease:'power3.out'},.15); tl.fromTo('#voices-natural',{x:48,opacity:0},{x:0,opacity:1,duration:.6,ease:'power3.out'},2.8); tl.fromTo('#voices-model',{y:-24,opacity:0},{y:0,opacity:1,duration:.55,ease:'power3.out'},4.5);`,
  reading: `tl.fromTo('#reading-page',{y:32,opacity:0},{y:0,opacity:1,duration:.65,ease:'power3.out'},.1); tl.fromTo('#reading-play',{scale:.7,opacity:0},{scale:1,opacity:1,duration:.5,ease:'power3.out'},1.3); tl.to('#reading-play',{scale:.93,duration:.12,ease:'power1.in'},2); tl.to('#reading-play',{scale:1,duration:.24,ease:'power3.out'},2.12); tl.fromTo('#reading-selection',{scaleX:0},{scaleX:1,duration:.65,ease:'power2.out'},4.2); tl.fromTo('#reading-menu',{y:14,opacity:0},{y:0,opacity:1,duration:.4,ease:'power3.out'},5.3);`,
  section: `tl.fromTo('#section-main',{y:24,opacity:0},{y:0,opacity:1,duration:.55,ease:'power3.out'},.1); tl.fromTo('#section-sidebar',{x:32,opacity:0},{x:0,opacity:1,duration:.55,ease:'power3.out'},.25); tl.fromTo('#section-outline',{opacity:0,scale:1.035},{opacity:1,scale:1,duration:.5,ease:'power3.out'},1.7); tl.fromTo('#section-caption',{y:12,opacity:0},{y:0,opacity:1,duration:.4,ease:'power3.out'},2.1); tl.to('#section-sidebar',{opacity:.25,duration:.6,ease:'power2.inOut'},2.6);`,
  player: `tl.fromTo('#player-window',{y:28,scale:.94,opacity:0},{y:0,scale:1,opacity:1,duration:.7,ease:'power3.out'},.1); tl.fromTo('#player-lyrics',{y:0},{y:-62,duration:1.2,ease:'power2.inOut'},1.5); tl.fromTo('#player-word',{y:16,opacity:0},{y:0,opacity:1,duration:.4,ease:'power3.out'},2.9); tl.to('#player-pin',{color:'#9aa0ff',scale:1.12,duration:.3,ease:'power2.out'},4.6);`,
  appearance: `tl.fromTo('#appearance-panel',{scale:.94,opacity:0},{scale:1,opacity:1,duration:.55,ease:'power3.out'},.1); tl.set('#appearance-two',{opacity:0},0); tl.set('#appearance-one',{opacity:0},1.3); tl.set('#appearance-two',{opacity:1},1.3); tl.fromTo('#appearance-knob',{x:0},{x:290,duration:.65,ease:'power2.inOut'},1.1); tl.set('#appearance-panel',{backgroundColor:'#20222a',color:'#f2f0f5'},2.1); tl.fromTo('#swatch-blue',{scale:.85},{scale:1.15,duration:.4,ease:'power3.out'},3.1);`,
  pdf: `tl.fromTo('#pdf-sheet',{y:32,opacity:0},{y:0,opacity:1,duration:.6,ease:'power3.out'},.1); tl.fromTo('#pdf-permission',{y:26,opacity:0},{y:0,opacity:1,duration:.5,ease:'power3.out'},1.6); tl.fromTo('#pdf-permission .permission-check',{scale:0},{scale:1,duration:.45,ease:'power3.out'},3.2);`,
  outro: `tl.fromTo('#outro-logo',{scale:.84,opacity:0},{scale:1,opacity:1,duration:.65,ease:'power3.out'},.15); tl.fromTo('#outro-private',{y:16,opacity:0},{y:0,opacity:1,duration:.5,ease:'power3.out'},1.4);`
};
const css = `
ROOT { position:absolute; inset:0; width:1920px; height:1080px; padding:210px 80px 150px; display:grid; grid-template-columns:760px 920px; gap:80px; color:#f2f0f5; font-family:Montserrat,sans-serif; }
ROOT * { box-sizing:border-box; margin:0; }
ROOT .copy { padding-top:18px; }
ROOT .label { color:#9aa0ff; font-family:'IBM Plex Mono',monospace; font-size:22px; letter-spacing:.04em; margin-bottom:34px; line-height:1.4; }
ROOT h1 { font-size:88px; line-height:1.04; font-weight:900; letter-spacing:-.045em; width:760px; margin-bottom:34px; }
ROOT h1 span { display:block; }
ROOT .body { width:730px; font-size:31px; line-height:1.45; color:#e3e1ea; letter-spacing:-.014em; }
ROOT .note { width:710px; font-size:24px; line-height:1.4; color:#b6b8c6; margin-top:28px; }
ROOT .visual { width:920px; height:690px; position:relative; }
ROOT .symbol { width:100px; height:100px; }
ROOT .hero-logo { position:absolute; width:300px; height:300px; left:310px; top:34px; }
ROOT .hero-logo svg { width:100%; height:100%; }
ROOT .art-caption { position:absolute; bottom:62px; width:100%; text-align:center; color:#b6b8c6; font-size:30px; letter-spacing:-.02em; }
ROOT .wave { position:absolute; top:382px; left:270px; width:380px; height:170px; display:flex; align-items:center; justify-content:center; gap:20px; }
ROOT .wave div { width:32px; border-radius:20px; background:#9aa0ff; transform-origin:center; }
ROOT .voice-row { position:absolute; left:10px; top:20px; width:900px; height:230px; border:2px solid #353742; border-radius:30px; background:#1c1e25; padding:50px 42px; display:flex; gap:34px; align-items:center; }
ROOT .voice-row.natural { top:280px; height:280px; padding-top:34px; align-items:flex-start; }
ROOT .voice-row h2 { font-size:46px; font-weight:700; margin-bottom:12px; letter-spacing:-.03em; }
ROOT .voice-row p { font-size:28px; color:#b6b8c6; }
ROOT .voice-symbol { color:#9aa0ff; }
ROOT .download-note { position:absolute; left:176px; bottom:36px; font-size:25px; color:#9aa0ff; }
ROOT .model-chip { position:absolute; bottom:30px; left:330px; display:flex; align-items:center; gap:18px; font-family:'IBM Plex Mono',monospace; font-size:25px; color:#9aa0ff; }
ROOT .model-chip .symbol { width:50px; height:50px; }
ROOT .paper, ROOT .article-pane { position:absolute; background:#1c1e25; border:2px solid #353742; border-radius:30px; padding:44px; }
ROOT .paper { width:670px; height:604px; left:80px; top:20px; }
ROOT .paper-label { font-family:'IBM Plex Mono',monospace; color:#b6b8c6; font-size:22px; margin-bottom:34px; }
ROOT .line { height:17px; border-radius:6px; background:#555a6c; margin-bottom:25px; }
ROOT .selected-line { height:58px; padding:8px 15px; background:#9aa0ff; color:#161726; border-radius:8px; font-size:29px; font-weight:700; margin-bottom:25px; transform-origin:left center; }
ROOT .play-orb { position:absolute; width:142px; height:142px; left:690px; top:456px; background:#9aa0ff; color:#202234; border:8px solid #111215; border-radius:50%; display:grid; place-items:center; }
ROOT .play-orb .symbol { width:76px; height:76px; }
ROOT .selection-label { position:absolute; left:200px; bottom:4px; padding:19px 27px; border:2px solid #656bad; background:#25283b; color:#dddfff; border-radius:14px; font-size:28px; }
ROOT .article-pane { width:610px; height:560px; left:8px; top:24px; }
ROOT .sidebar { position:absolute; width:246px; height:480px; top:24px; right:0; padding:35px 26px; background:#1c1e25; border:2px solid #353742; border-radius:24px; }
ROOT .sidebar .paper-label { font-size:21px; }
ROOT .selection-outline { position:absolute; left:0; top:16px; width:626px; height:576px; border:5px solid #9aa0ff; border-radius:36px; }
ROOT .player-pane { position:absolute; left:26px; top:10px; width:868px; height:580px; border-radius:36px; background:#1c1e25; border:2px solid #353742; padding:36px 44px; overflow:hidden; }
ROOT .player-top { display:flex; justify-content:space-between; align-items:center; font-family:'IBM Plex Mono',monospace; font-size:24px; color:#b6b8c6; }
ROOT .player-top .symbol { width:42px; height:42px; }
ROOT .player-text { margin-top:24px; font-size:54px; font-weight:700; letter-spacing:-.035em; line-height:1.15; }
ROOT .player-transport { display:flex; align-items:center; justify-content:center; gap:44px; margin:22px 0; }
ROOT .short-rule { width:66px; height:4px; background:#555a6c; }
ROOT .small-play { width:72px; height:72px; border-radius:50%; background:#9aa0ff; color:#202234; display:grid; place-items:center; }
ROOT .small-play .symbol { width:44px; height:44px; }
ROOT .lyric-window { height:120px; overflow:hidden; border-top:2px solid #353742; padding-top:16px; }
ROOT .lyric-window p { font-size:38px; line-height:62px; color:#b6b8c6; letter-spacing:-.025em; }
ROOT .lyric-window p.accent { color:#b4b8ff; }
ROOT .jump-note { position:absolute; bottom:22px; width:100%; text-align:center; font-size:29px; color:#b4b8ff; }
ROOT .appearance-pane { position:absolute; width:780px; height:520px; left:70px; top:20px; background:#f5f2e9; border-radius:38px; padding:42px 64px; color:#232636; }
ROOT .panel-label { font-family:'IBM Plex Mono',monospace; font-size:24px; }
ROOT .speed-number { position:relative; height:210px; font-size:142px; line-height:1.3; font-weight:700; letter-spacing:-.05em; }
ROOT .speed-number span { position:absolute; left:0; top:0; }
ROOT .speed-track { width:620px; height:10px; background:#7e83bd; border-radius:8px; margin:16px 0 48px; }
ROOT .speed-track div { width:42px; height:42px; transform:translateY(-16px); border-radius:50%; background:#9aa0ff; }
ROOT .theme-labels { display:flex; justify-content:space-between; font-size:32px; }
ROOT .swatches { position:absolute; bottom:38px; left:300px; display:flex; gap:32px; }
ROOT .swatches div { width:76px; height:76px; border-radius:50%; border:4px solid #111215; outline:2px solid #454958; }
ROOT .pdf-sheet { position:absolute; width:450px; height:570px; left:235px; top:2px; background:#e9e7f1; color:#31364e; padding:38px; border-radius:24px; }
ROOT .pdf-sheet p { font-family:'IBM Plex Mono',monospace; font-size:64px; font-weight:700; margin-bottom:42px; }
ROOT .pdf-sheet .line { background:#989aac; height:13px; }
ROOT .permission-note { position:absolute; bottom:24px; left:16px; width:888px; height:108px; display:flex; gap:22px; align-items:center; padding:22px 28px; border:2px solid #656bad; border-radius:20px; background:#25283b; color:#dddfff; }
ROOT .permission-note p { font-size:31px; font-weight:700; letter-spacing:-.02em; }
ROOT .permission-check { width:54px; height:54px; color:#b4b8ff; }
ROOT .permission-check .symbol { width:54px; height:54px; }
ROOT .privacy-mark { position:absolute; top:388px; left:240px; width:440px; display:flex; gap:22px; align-items:center; justify-content:center; color:#b4b8ff; }
ROOT .privacy-mark .symbol { width:64px; height:64px; }
ROOT .privacy-mark p { font-size:32px; }
`;
fs.mkdirSync(path.join(root, 'compositions/chapters'), { recursive: true });
const slots = [];
chapters.forEach((chapter, i) => {
  const id = `scene-${chapter.id}`;
  const length = (starts[i + 1] ?? duration) - starts[i];
  const title = chapter.title.map(t => `<span>${esc(t)}</span>`).join('');
  const body = chapter.id === 'outro' ? 'Private, on-device listening. Keep the source page open and find your pace.' : chapter.body;
  const note = chapter.id === 'player' ? 'Illustrated guide. Pin support varies by browser.' : chapter.note;
  const content = `<template><style>${css.replaceAll('ROOT', `#${id}`)}</style><div id="${id}" data-composition-id="${id}" data-width="1920" data-height="1080"><div class="copy"><p class="label">${esc(chapter.label)}</p><h1>${title}</h1><p class="body">${esc(body)}</p>${note ? `<p class="note">${esc(note)}</p>` : ''}</div><div id="${chapter.id}-visual" class="visual">${visuals[chapter.id]}</div></div><script>const tl=gsap.timeline({paused:true}); tl.fromTo('#${id} .copy',{y:18,opacity:0},{y:0,opacity:1,duration:.48,ease:'power3.out'},.08); ${motion[chapter.id]} window.__timelines['${id}']=tl;</script></template>`;
  fs.writeFileSync(path.join(root, `compositions/chapters/${chapter.id}.html`), content);
  slots.push(`<div id="slot-${id}" class="scene-slot clip" data-composition-id="${id}" data-composition-src="compositions/chapters/${chapter.id}.html" data-start="${starts[i].toFixed(3)}" data-duration="${length.toFixed(3)}" data-track-index="1" data-width="1920" data-height="1080"></div>`);
});
const index = `<!doctype html><html lang="en" data-resolution="landscape"><head><meta charset="UTF-8"><meta name="viewport" content="width=1920, height=1080"><title>Literate — an animated guide</title><script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script><style>*{box-sizing:border-box;margin:0}html,body{width:1920px;height:1080px;overflow:hidden;background:#111215}#root{position:relative;width:1920px;height:1080px;color:#f2f0f5;font-family:Montserrat,sans-serif}.backdrop{position:absolute;inset:0;background:#111215}.scene-slot{position:absolute;inset:0;width:1920px;height:1080px}.brand{position:absolute;left:80px;top:64px;display:flex;align-items:center;gap:18px;height:56px;z-index:5}.brand img{width:56px;height:56px}.brand p{font-size:34px;font-weight:700;letter-spacing:-.04em}.guide-label{position:absolute;right:80px;top:82px;color:#b6b8c6;font:22px 'IBM Plex Mono',monospace;letter-spacing:.04em;z-index:5}.footer{position:absolute;left:80px;right:80px;bottom:58px;z-index:5}.progress-track{height:3px;width:1760px;background:#30323b;margin-bottom:24px}#progress-fill{height:100%;width:100%;background:#9aa0ff;transform-origin:left center}.footer p{color:#b6b8c6;font:22px 'IBM Plex Mono',monospace;letter-spacing:-.02em}</style></head><body><main id="root" data-composition-id="literate-walkthrough" data-start="0" data-duration="${duration.toFixed(3)}" data-width="1920" data-height="1080" data-fps="30"><div class="backdrop"></div>${slots.join('')}<header class="brand"><img src="assets/logo.svg" alt=""><p>Literate</p></header><p class="guide-label">AN ANIMATED GUIDE</p><footer class="footer"><div class="progress-track"><div id="progress-fill"></div></div><p>github.com/Tajinnnnn/literate</p></footer><audio id="heart-narration" src="assets/narration.wav" data-start="${audioStart}" data-duration="${audioDuration.toFixed(3)}" data-volume="1" data-track-index="2"></audio></main><script>const tl=gsap.timeline({paused:true});tl.fromTo('#progress-fill',{scaleX:0},{scaleX:1,duration:${duration.toFixed(3)},ease:'none'},0);window.__timelines['literate-walkthrough']=tl;</script></body></html>`;
fs.writeFileSync(path.join(root, 'index.html'), index);
fs.writeFileSync(path.join(root, 'media-metadata.json'), JSON.stringify({ status: 'measured-animated-guide', duration, audioStart, audioDuration, outroHold, source: timing.source, processing: timing.processing, sourceSHA256: timing.sourceSHA256, audioSHA256: timing.audioSHA256, chapters: chapters.map((c, i) => ({ id: c.id, start: starts[i], duration: (starts[i + 1] ?? duration) - starts[i] })) }, null, 2) + '\n');
console.log(`Built ${chapters.length} animated chapters, ${duration.toFixed(3)} seconds; real Heart narration starts at ${audioStart}s.`);

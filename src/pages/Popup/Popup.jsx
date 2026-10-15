import React, { useCallback, useEffect, useRef, useState } from 'react';
import './Popup.css';
import { floatPlayer } from './floatingPlayer';
import { DEFAULT_ACCENT, ACCENT_COLORS, normalizeAccent, applyAccent } from '../../shared/playerAccent.mjs';
import { MSG, DEFAULT_HOTKEYS } from '../../shared/messages';
import { findActiveLine } from '../../shared/readingTranscript.mjs';
import { playerSource } from '../../shared/playerSource.mjs';

const SOURCE = playerSource(window.location.search);
const SOURCE_SURFACE = new URLSearchParams(window.location.search).get('surfaceId');
const HOTKEY_FIELDS = [
  ['readPage', 'Read page'], ['pausePlay', 'Play / pause'], ['lock', 'Scroll lock'],
  ['readFromHere', 'Read from here'], ['slowDown', 'Slower'], ['speedUp', 'Faster'],
];

function Icon({ name, size = 18 }) {
  // Locally rendered marks: no remote icon scripts in an extension page.
  const paths = {
    play: <path d="m9 5 11 7-11 7Z" />,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    previous: <><path d="M5 5v14M19 5 8 12l11 7Z" /></>,
    next: <><path d="M19 5v14M5 5l11 7L5 19Z" /></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="1" />,
    headphones: <><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="3" y="12" width="4" height="8" rx="2" /><rect x="17" y="12" width="4" height="8" rx="2" /></>,
    settings: <><path d="M4 7h8m4 0h4M4 17h3m4 0h9" /><circle cx="14" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
    popout: <><path d="M14 4h6v6m0-6-9 9M10 4H4v16h16v-6" /></>,
    volume: <><path d="m11 5-6 4H2v6h3l6 4Z" /><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    text: <><path d="M4 5h16M4 10h16M4 15h12M4 20h9" /></>,
    pin: <><path d="m9 3 6 0-1 6 4 4H6l4-4-1-6ZM12 13v8" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    moon: <path d="M20 15.3A8.5 8.5 0 0 1 8.7 4 8.5 8.5 0 1 0 20 15.3Z" />,
    back: <path d="m15 5-7 7 7 7" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function getSourceTab() {
  return new Promise(resolve => {
    if (SOURCE.detached) {
      if (!SOURCE.tabId) { resolve(null); return; }
      chrome.tabs.get(SOURCE.tabId, tab => resolve(chrome.runtime.lastError ? null : tab));
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0] || null));
    }
  });
}

function sendToSource(message) {
  return getSourceTab().then(tab => new Promise(resolve => {
    if (!tab?.id) { resolve(null); return; }
    chrome.tabs.sendMessage(tab.id, { ...message, expectedSurfaceId: SOURCE.detached ? SOURCE_SURFACE : undefined }, response => resolve(chrome.runtime.lastError ? null : response));
  }));
}

export default function Popup() {
  const [state, setState] = useState(null);
  const [theme, setTheme] = useState('light');
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [pinned, setPinned] = useState(false);
  const floatingWindow = useRef(null);
  const [unavailable, setUnavailable] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showText, setShowText] = useState(true);
  const [lines, setLines] = useState([]);
  const [hotkeys, setHotkeys] = useState(DEFAULT_HOTKEYS);
  const [rateText, setRateText] = useState('1.0');
  const [editingRate, setEditingRate] = useState(false);
  const [actionError, setActionError] = useState('');
  const [fileAccessDenied, setFileAccessDenied] = useState(false);
  const transcriptSession = useRef(null);
  const transcriptRequest = useRef(0);
  const activeLineRef = useRef(null);
  const textViewport = useRef(null);
  const polling = useRef(false);

  useEffect(() => {
    chrome.storage.local.get(['playerTheme', 'playerAccent'], saved => {
      setTheme(saved.playerTheme === 'dark' ? 'dark' : 'light');
      setAccent(normalizeAccent(saved.playerAccent));
    });
    const onChange = (changes, area) => {
      if (area !== 'local') return;
      if (changes.playerTheme) setTheme(changes.playerTheme.newValue === 'dark' ? 'dark' : 'light');
      if (changes.playerAccent) setAccent(normalizeAccent(changes.playerAccent.newValue));
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    applyAccent(document, accent, theme);
    if (floatingWindow.current && !floatingWindow.current.closed) {
      floatingWindow.current.document.documentElement.dataset.theme = theme;
      applyAccent(floatingWindow.current.document, accent, theme);
    }
  }, [theme, accent]);
  function changeAccent(value) {
    const next = normalizeAccent(value);
    setAccent(next);
    chrome.storage.local.set({ playerAccent: next });
  }
  async function togglePinned() {
    if (floatingWindow.current && !floatingWindow.current.closed) { floatingWindow.current.close(); return; }
    try {
      floatingWindow.current = await floatPlayer(() => { floatingWindow.current = null; setPinned(false); });
      setPinned(true);
    } catch (error) { setActionError(error.message || 'Could not pin the player.'); }
  }
  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    chrome.storage.local.set({ playerTheme: next });
  }

  const refresh = useCallback(async () => {
    if (polling.current) return;
    polling.current = true;
    try {
      const next = await sendToSource({ type: MSG.GET_STATE });
      setUnavailable(!next);
      if (!next) return;
      setState(next);
      if (transcriptSession.current !== next.sessionId) {
        const request = ++transcriptRequest.current;
        const transcript = await sendToSource({ type: MSG.GET_TRANSCRIPT });
        if (request === transcriptRequest.current && transcript?.sessionId === next.sessionId) {
          transcriptSession.current = transcript.sessionId;
          setLines(transcript.lines || []);
        }
      }
    } finally { polling.current = false; }
  }, []);

  useEffect(() => {
    document.title = SOURCE.detached ? 'Literate mini-player' : 'Literate';
    refresh();
    const interval = setInterval(refresh, 250);
    chrome.extension?.isAllowedFileSchemeAccess?.(allowed => setFileAccessDenied(!allowed));
    return () => clearInterval(interval);
  }, [refresh]);
  useEffect(() => {
    if (!editingRate && state?.rate) setRateText(state.rate.toFixed(1));
  }, [state?.rate, editingRate]);
  useEffect(() => { if (state?.hotkeys) setHotkeys(state.hotkeys); }, [state?.hotkeys]);

  const activeLine = findActiveLine(lines, state?.currentIndex ?? -1);
  useEffect(() => {
    const row = activeLineRef.current;
    const viewport = textViewport.current;
    if (!showText || !row || !viewport) return;
    const top = row.offsetTop - viewport.clientHeight / 2 + row.clientHeight / 2;
    viewport.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [activeLine, showText, showSettings]);

  async function command(type, extra = {}) {
    setActionError('');
    const result = await sendToSource({ type, ...extra });
    if (!result) setActionError('The page is no longer connected. Refresh the source page and try again.');
    if (result?.ok === false && result.reason !== 'model-error') setActionError('No readable text found on this page.');
    await refresh();
  }
  async function chooseSection() {
    const result = await sendToSource({ type: MSG.PICK_SECTION });
    if (!result?.ok) { setActionError('Open a readable webpage to choose a section.'); return; }
    if (SOURCE.detached) {
      const tab = await getSourceTab();
      if (tab) { chrome.tabs.update(tab.id, { active: true }); chrome.windows.update(tab.windowId, { focused: true }); }
    } else window.close();
  }
  async function openPlayer() {
    const tab = await getSourceTab();
    if (!tab?.id) return;
    chrome.runtime.sendMessage({ type: MSG.OPEN_PLAYER, tabId: tab.id, surfaceId: state?.surfaceId }, result => {
      if (chrome.runtime.lastError || !result?.ok) setActionError('Could not open the mini-player. Try again.');
    });
  }
  function setRate(rate) { command(MSG.SET_RATE, { rate: Math.min(2, Math.max(0.5, Math.round(rate * 10) / 10)) }); }
  function commitRate() {
    const number = Number(rateText);
    if (Number.isFinite(number) && number > 0) setRate(number);
    else setRateText((state?.rate || 1).toFixed(1));
    setEditingRate(false);
  }
  function commitHotkey(key, value) {
    if (value !== '' && !/^\S$/.test(value)) return;
    const next = { ...hotkeys, [key]: value.toLowerCase() };
    setHotkeys(next); command(MSG.SET_HOTKEYS, { hotkeys: next });
  }

  const voice = state?.naturalVoice || { status: 'idle', voices: [], voiceId: 'af_heart' };
  const voiceName = voice.voices.find(v => v.id === voice.voiceId)?.name || 'Heart';
  const active = !!state?.active;
  const paused = !!state?.isPaused;
  const preparing = active && state?.isSynthesizing;
  const wordCount = state?.wordCount || 0;
  const progress = wordCount ? Math.min(100, Math.max(0, ((state.currentIndex + 1) / wordCount) * 100)) : 0;
  const status = unavailable ? 'Page unavailable' : voice.status === 'loading' ? 'Getting your voice ready' : voice.status === 'error' ? 'Voice needs attention' : preparing ? 'Preparing narration' : state?.completed ? 'Reading complete' : paused ? 'Paused' : active ? 'Now reading' : 'Ready to listen';

  const playbackControls = <>
        <div className="player-controls"><label className="voice-control"><span className="sr-only">Natural voice</span><select aria-label="Natural voice" value={voice.voiceId || 'af_heart'} disabled={!voice.voices.length || unavailable} onChange={e => command(MSG.SET_NATURAL_VOICE, { voiceId: e.target.value })}>{voice.voices.length ? voice.voices.map(v => <option key={v.id} value={v.id}>{v.name} · {v.lang || v.language}</option>) : <option value="af_heart">Heart</option>}</select></label>
          <div className="rate-control"><button aria-label="Read slower" disabled={unavailable} onClick={() => setRate((state?.rate || 1) - .1)}>−</button><label><input aria-label="Playback speed" inputMode="decimal" value={rateText} onFocus={() => setEditingRate(true)} onChange={e => setRateText(e.target.value)} onBlur={commitRate} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /><span>×</span></label><button aria-label="Read faster" disabled={unavailable} onClick={() => setRate((state?.rate || 1) + .1)}>+</button></div>
        </div>
        <label className="player-volume"><Icon name="volume" size={16} /><input aria-label="Volume" type="range" min="0" max="1" step=".05" value={state?.volume ?? 1} disabled={unavailable} onChange={e => command(MSG.SET_VOLUME, { volume: Number(e.target.value) })} /></label>
  </>;

  return <div className={`tts-popup ${SOURCE.detached ? 'is-detached' : 'is-compact'}`}>
    <header className="player-header">
      <span className="player-brand"><img src={chrome.runtime.getURL('icon-32.png')} alt="" width="20" height="20" />Literate</span>
      <div className="header-actions">
        {SOURCE.detached && <button className={`icon-button ${pinned ? 'is-selected' : ''}`} title={pinned ? 'Unpin player' : 'Keep on top'} aria-label={pinned ? 'Unpin player' : 'Keep on top'} aria-pressed={pinned} onClick={togglePinned}><Icon name="pin" size={16} /></button>}
        <button className="icon-button" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={toggleTheme}><Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} /></button>
        {!SOURCE.detached && <button className="icon-button" title="Open mini-player" aria-label="Open mini-player" onClick={openPlayer} disabled={unavailable}><Icon name="popout" size={16} /></button>}
        <button className={`icon-button ${showSettings ? 'is-selected' : ''}`} title={showSettings ? 'Back to player' : 'Settings'} aria-label={showSettings ? 'Back to player' : 'Settings'} onClick={() => setShowSettings(v => !v)}><Icon name={showSettings ? 'back' : 'settings'} size={17} /></button>
      </div>
    </header>

    {showSettings ? <section className="player-settings">
      <p className="section-kicker">Make it yours</p><h1>Reading preferences</h1>
      <section className="accent-settings" aria-label="Accent color">
        <h2>Accent color</h2>
        <div className="accent-presets">{ACCENT_COLORS.map(({name, color}) => <button key={color} type="button" className="accent-swatch" style={{'--swatch': color}} aria-label={`${name} accent`} aria-pressed={accent === color} title={name} onClick={() => changeAccent(color)} />)}</div>
        <label className="custom-accent">Custom color<input type="color" aria-label="Custom accent color" value={accent} onChange={e => changeAccent(e.target.value)} /></label>
      </section>
      <div className="settings-playback">{playbackControls}</div>
      <label className="settings-row">Page appearance<button className="small-button" onClick={() => command(MSG.TOGGLE_DARK_MODE)}>{state?.darkMode ? 'Dark' : 'Light'}</button></label>
      <label className="settings-row">Highlight color<input type="color" aria-label="Highlight color" value={state?.highlightColor || '#ffe58a'} onChange={e => command(MSG.SET_HIGHLIGHT_COLOR, { color: e.target.value })} /></label>
      <h2>Keyboard shortcuts</h2>
      <p className="page-subtitle">Optional. Leave a field empty to disable it.</p>
      {HOTKEY_FIELDS.map(([key, label]) => <label className="settings-row" key={key}>{label}<input className="shortcut-input" aria-label={`${label} shortcut`} value={(hotkeys[key] || '').toUpperCase()} maxLength={1} onChange={e => commitHotkey(key, e.target.value)} /></label>)}
      {fileAccessDenied && <div className="player-notice">To read local PDFs, enable file access for Literate.<button className="small-button" onClick={() => chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` })}>Open extension settings</button></div>}
    </section> : <>
      <main className="player-main">

        <div className={`player-status ${active && !paused ? 'is-live' : ''}`}><span />{status}</div>
        <h1 className="page-title">{state?.title || (unavailable ? 'Find something worth listening to.' : 'Your page, in a new voice.')}</h1>
        <p className="page-subtitle">{unavailable ? (SOURCE.detached ? 'The original page was closed, navigated, or refreshed.' : 'Open a regular webpage to start reading.') : `${voiceName} · ${state?.site || 'Natural narration'}`}</p>

        <div className="reading-progress"><progress aria-label="Reading progress" max="100" value={progress} /><div className="progress-labels"><span>{wordCount ? `${Math.round(progress)}% read` : 'Your own pace'}</span><span>{wordCount ? `${wordCount} words` : 'On-device voice'}</span></div></div>
        <div className="player-transport">
          <button className="icon-button" aria-label="Previous paragraph" title="Previous paragraph" disabled={!active} onClick={() => command(MSG.REWIND)}><Icon name="previous" size={20} /></button>
          <button className="play-button" aria-label={active ? (paused ? 'Resume reading' : 'Pause reading') : 'Read page'} title={active ? (paused ? 'Resume reading' : 'Pause reading') : 'Read page'} disabled={unavailable || voice.status === 'error'} onClick={() => command(active ? MSG.TOGGLE_PAUSE : MSG.READ_PAGE)}><Icon name={active && !paused ? 'pause' : 'play'} size={25} /></button>
          <button className="icon-button" aria-label="Next paragraph" title="Next paragraph" disabled={!active} onClick={() => command(MSG.FAST_FORWARD)}><Icon name="next" size={20} /></button>
          <button className="stop-button icon-button" aria-label="Stop reading" title="Stop reading" disabled={!active} onClick={() => command(MSG.STOP)}><Icon name="stop" size={15} /></button>
        </div>

        <div className="reading-scope"><button type="button" disabled={unavailable} onClick={chooseSection}>Choose section</button>{state?.readingScope === 'section' && <><span>Section selected</span><button type="button" onClick={() => command(MSG.RESET_SECTION)}>Read article</button></>}</div>
        {voice.status === 'loading' && <p className="voice-help">{typeof voice.progress === 'number' ? `${voice.progress}% · ` : ''}Warming up your shared voice.</p>}
        {voice.status === 'error' && <div className="player-notice error" role="alert">{voice.error}<button className="small-button" onClick={() => command(MSG.SET_NATURAL_VOICE_ENABLED, { enabled: true })}>Retry voice download</button></div>}
        {actionError && <p className="player-notice error" role="alert">{actionError}</p>}
      </main>

      {SOURCE.detached && <section className="reading-text"><button className="text-toggle" aria-expanded={showText} onClick={() => setShowText(v => !v)}><span><Icon name="text" size={15} />Reading text</span><span>{showText ? '−' : '+'}</span></button>
        {showText && <div className="lyrics-viewport" ref={textViewport} role="region" aria-label="Synchronized reading text">
          {lines.length ? <div className="lyrics-lines">{lines.map((line, index) => <p key={line.startWord} ref={index === activeLine ? activeLineRef : null} aria-current={index === activeLine ? 'true' : undefined} className={`lyric-line ${index === activeLine ? 'is-current' : ''} ${index < activeLine ? 'is-past' : ''}`}>
            {line.text.split(' ').map((word, i) => <React.Fragment key={i}><button type="button" className={`lyric-word ${line.startWord + i === state?.currentIndex ? 'current-word' : ''}`} disabled={unavailable} title={`Read from “${word}”`} onClick={() => command(MSG.SEEK_WORD, { index: line.startWord + i, sessionId: state?.sessionId })}>{word}</button>{' '}</React.Fragment>)}
          </p>)}</div> : <div className="lyrics-empty"><Icon name="text" size={22} /><p>The words will follow along here.</p><span>Press play to start reading.</span></div>}
        </div>}
      </section>}
    </>}
    {SOURCE.detached && <footer className="player-footer"><Icon name="lock" size={11} /><span>Private, on-device listening</span><span className="footer-dot" />Kokoro voices</footer>}
  </div>;
}

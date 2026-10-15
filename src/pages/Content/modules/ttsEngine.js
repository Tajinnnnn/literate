import { wrapPageWords, wrapSelectionWords, wrapElementWords, unwrapWords, computeRewindIndex, computeForwardIndex } from './wordWrapper';
import { HoverToolbar } from './hoverToolbar';
import { buildTranscriptLines } from '../../../shared/readingTranscript.mjs';

const ACTIVE_CLASS = '__ttsxr_word_active';
const MIN_RATE = 0.1;
const MAX_RATE = 10;
const DEFAULT_RATE = 1;
const DEFAULT_VOLUME = 1;
const DEFAULT_HIGHLIGHT_COLOR = '#ffe58a';

// Chrome silently stops speaking partway through a single very long
// SpeechSynthesisUtterance — no error event, just a premature `end` — once
// the text passes some undocumented length (see crbug.com/335907 and its
// long tail of duplicates). Capping each utterance to a safe character
// budget and chaining to the next slice keeps long documents (a whole PDF,
// as opposed to a typical web article) readable end to end.
const MAX_UTTERANCE_CHARS = 600;

let cachedVoices = [];
if ('speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoices = window.speechSynthesis.getVoices();
  });
}

// System "novelty" voices (macOS's Bells/Boing/Zarvox/etc.) are named after
// the sound effect they mimic rather than being normal speech, and read
// poorly. Filter them out of the picker.
const NOVELTY_VOICE_NAMES = new Set([
  'albert',
  'bad news',
  'bahh',
  'bells',
  'boing',
  'bubbles',
  'cellos',
  'deranged',
  'good news',
  'hysterical',
  'jester',
  'organ',
  'pipe organ',
  'superstar',
  'trinoids',
  'whisper',
  'wobble',
  'zarvox',
]);

function isNoveltyVoice(name) {
  return NOVELTY_VOICE_NAMES.has((name || '').trim().toLowerCase());
}

function isUsOrUkEnglish(lang) {
  const normalized = (lang || '').toLowerCase().replace('_', '-');
  return normalized === 'en-us' || normalized === 'en-gb';
}

export function getContrastTextColor(hex) {
  const c = (hex || '').replace('#', '');
  if (c.length !== 6) return '#1a1a1a';
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1a1a1a' : '#ffffff';
}

export class TTSEngine {
  constructor() {
    this.words = [];
    this.transcript = { sessionId: 0, lines: [], wordCount: 0 };
    this.completed = false;
    this.spans = [];
    this.boundaries = [];
    this.currentIndex = -1;
    this.currentSpan = null;
    this.indexBase = 0;
    this.rate = DEFAULT_RATE;
    this.volume = DEFAULT_VOLUME;
    this.voiceURI = null;
    this.highlightColor = DEFAULT_HIGHLIGHT_COLOR;
    this.followLock = true;
    this.utterance = null;
    this.active = false;
    // Tracked explicitly rather than read live off window.speechSynthesis.paused:
    // Chrome can leave that flag stuck true after a cancel()+speak() cycle (the
    // cancel()/pause() interaction is a known Web Speech API rough edge), which
    // both mislabels the pause/resume control AND - since onboundary below
    // bails out while "paused" - silently freezes word highlighting while
    // audio keeps playing. A locally-owned flag can't drift from what we
    // actually told the engine to do.
    this._paused = false;

    this.toolbar = new HoverToolbar(this);

    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(
        ['ttsRate', 'ttsVolume', 'ttsVoiceURI', 'ttsHighlightColor', 'ttsFollowLock'],
        (res) => {
          if (res.ttsRate) this.rate = res.ttsRate;
          if (typeof res.ttsVolume === 'number') this.volume = res.ttsVolume;
          if (res.ttsVoiceURI) this.voiceURI = res.ttsVoiceURI;
          if (res.ttsHighlightColor) this.highlightColor = res.ttsHighlightColor;
          if (typeof res.ttsFollowLock === 'boolean') this.followLock = res.ttsFollowLock;
          this.toolbar.refresh();
        }
      );
    }
  }

  getVoices() {
    return cachedVoices
      .filter((v) => v.localService && isUsOrUkEnglish(v.lang) && !isNoveltyVoice(v.name))
      .map((v) => ({
        name: v.name,
        voiceURI: v.voiceURI,
        lang: v.lang,
        default: v.default,
      }))
      .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
  }

  getState() {
    return {
      active: this.active,
      readingScope: this.readingRoot?.isConnected ? 'section' : 'article',
      sessionId: this.transcript.sessionId,
      completed: this.completed,
      isPaused: this.isPaused(),
      rate: this.rate,
      volume: this.volume,
      voiceURI: this.voiceURI,
      highlightColor: this.highlightColor,
      wordCount: this.transcript.wordCount,
      currentIndex: this.completed ? this.transcript.wordCount - 1 : this.currentIndex,
    };
  }

  isPaused() {
    return this._paused;
  }

  getTranscript() { return this.transcript; }

  startSection(element) {
    this.readingRoot = element;
    return this.start('page');
  }

  seekToWord(index, sessionId) {
    if (sessionId !== this.transcript.sessionId || !Number.isInteger(index) || index < 0 || index >= this.transcript.wordCount) return { ok: false };
    if (!this.active) {
      if (!this._sessionWords?.length) return { ok: false };
      this._beginReading({words: [...this._sessionWords], spans: [], boundaries: [...this._sessionBoundaries]}, index);
    } else {
      this._paused = false;
      this._jumpTo(index);
    }
    return { ok: true };
  }

  start(mode) {
    this.stop();
    const result = mode === 'selection' ? wrapSelectionWords() : (this.readingRoot?.isConnected ? wrapElementWords(this.readingRoot) : wrapPageWords());
    if (!result || result.words.length === 0) return { ok: false, reason: 'no-text' };
    this._beginReading(result);
    return { ok: true };
  }

  // Reads the whole page, but starts at the word nearest to wherever the
  // user right-clicked (used by the "Read from here" context menu item).
  startFromElement(targetElement) {
    this.stop();
    const result = wrapPageWords();
    if (!result || result.words.length === 0) return { ok: false, reason: 'no-text' };

    let startIndex = 0;
    if (targetElement) {
      const found = result.spans.findIndex((span) => this._isAtOrAfter(span, targetElement));
      if (found >= 0) startIndex = found;
    }

    this._beginReading(result, startIndex);
    return { ok: true };
  }

  _isAtOrAfter(span, target) {
    if (span === target || target.contains(span)) return true;
    const pos = target.compareDocumentPosition(span);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return true;
    if (pos & Node.DOCUMENT_POSITION_CONTAINED_BY) return true;
    return false;
  }

  // Reads the whole page starting at a specific word index — used for "Read
  // from here" when there's an active text selection, so it starts exactly
  // at the selection rather than just the nearest clicked element.
  startFromWordIndex(index) {
    this.stop();
    const result = wrapPageWords();
    if (!result || result.words.length === 0) return { ok: false, reason: 'no-text' };
    const startIndex = typeof index === 'number' ? Math.min(Math.max(index, 0), result.words.length - 1) : 0;
    this._beginReading(result, startIndex);
    return { ok: true };
  }

  _beginReading(result, startIndex = 0) {
    this.words = result.words;
    this.spans = result.spans;
    this.boundaries = result.boundaries || [];
    this._sessionWords = [...this.words];
    this._sessionBoundaries = [...this.boundaries];
    this.transcript = { sessionId: this.transcript.sessionId + 1, lines: buildTranscriptLines(this.words, this.boundaries), wordCount: this.words.length };
    this.completed = false;
    this.currentIndex = -1;
    this.currentSpan = null;
    this.active = true;
    this._paused = false;
    this.toolbar.show();
    this._speakFrom(startIndex);
  }

  _resolveVoice() {
    const local = cachedVoices.filter(v => v.localService && isUsOrUkEnglish(v.lang) && !isNoveltyVoice(v.name));
    return local.find(v => v.voiceURI === this.voiceURI) || local.find(v => v.default) || local[0] || null;
  }

  // Chrome can leave speechSynthesis.speaking/pending true for a beat after
  // onend actually fires; calling speak() while either is still true is what
  // silently drops the next chunk instead of queuing it. Poll for a true
  // idle state rather than guessing a fixed delay (capped so a wedged synth
  // can't hang playback forever).
  _scheduleNextChunk(chunkEnd, prevUtterance, attempt = 0) {
    if (this.utterance !== prevUtterance) return;
    const synth = window.speechSynthesis;
    if ((synth.speaking || synth.pending) && attempt < 40) {
      setTimeout(() => this._scheduleNextChunk(chunkEnd, prevUtterance, attempt + 1), 50);
      return;
    }
    this._speakFrom(chunkEnd);
  }

  // Finds the end of the word slice starting at indexBase that fits under
  // MAX_UTTERANCE_CHARS, preferring to break right after a sentence-ending
  // word (one ending in . ! or ?) near the limit so the gap between chunks
  // lands on a natural pause instead of mid-sentence.
  _findChunkEnd(indexBase) {
    let cursor = 0;
    let end = indexBase;
    let lastSentenceEnd = -1;
    while (end < this.words.length) {
      const nextCursor = cursor + this.words[end].length + 1;
      if (end > indexBase && nextCursor > MAX_UTTERANCE_CHARS) break;
      cursor = nextCursor;
      end++;
      if (/[.!?]$/.test(this.words[end - 1])) lastSentenceEnd = end;
    }
    if (lastSentenceEnd > indexBase && lastSentenceEnd < end) return lastSentenceEnd;
    return end;
  }

  _speakFrom(indexBase) {
    if (indexBase >= this.words.length) {
      this.stop({ completed: true });
      return;
    }
    this.indexBase = indexBase;
    const chunkEnd = this._findChunkEnd(indexBase);
    const slice = this.words.slice(indexBase, chunkEnd);
    const text = slice.join(' ');

    const offsets = [];
    let cursor = 0;
    slice.forEach((w) => {
      offsets.push(cursor);
      cursor += w.length + 1;
    });

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.rate;
    utterance.volume = this.volume;
    const voice = this._resolveVoice();
    // Never let the browser silently substitute a network-backed default.
    if (!voice) { this.stop(); return; }
    utterance.voice = voice;

    utterance.onstart = () => this._setCurrentWord(indexBase);

    utterance.onboundary = (e) => {
      if (e.name && e.name !== 'word') return;
      // Chrome can deliver a stray/late boundary event right as pause() takes
      // effect, or replay one after resume(); ignore those so the highlight
      // doesn't jump away from the word actually being spoken. Uses the
      // tracked flag, not the live API, so a stuck browser-side paused flag
      // can't also freeze highlighting while audio keeps going.
      if (this._paused) return;

      let localIndex = 0;
      for (let i = offsets.length - 1; i >= 0; i--) {
        if (offsets[i] <= e.charIndex) {
          localIndex = i;
          break;
        }
      }
      const globalIndex = indexBase + localIndex;
      // Speech only ever moves forward within a single utterance; a boundary
      // event reporting an earlier index is a stale/duplicate event.
      if (globalIndex < this.currentIndex) return;
      this._setCurrentWord(globalIndex);
    };

    utterance.onend = () => {
      if (this.utterance !== utterance) return;
      if (chunkEnd < this.words.length) {
        this._scheduleNextChunk(chunkEnd, utterance);
      } else {
        this.stop({ completed: true });
      }
    };
    utterance.onerror = (e) => {
      if (this.utterance !== utterance) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      this.stop();
    };

    this.utterance = utterance;
    window.speechSynthesis.speak(utterance);
    // Any new utterance - initial start, next chunk, or a cancel+respeak
    // from rewind/fast-forward/rate change - must re-honor an existing
    // pause request, since cancel() clears the browser's own paused state.
    if (this._paused) window.speechSynthesis.pause();
  }

  _setCurrentWord(i) {
    if (this.currentSpan) {
      this.currentSpan.classList.remove(ACTIVE_CLASS);
      this.currentSpan.style.backgroundColor = '';
      this.currentSpan.style.color = '';
    }
    this.currentIndex = i;
    this.currentSpan = this.spans[i] || null;
    if (this.currentSpan) {
      this.currentSpan.classList.add(ACTIVE_CLASS);
      this.currentSpan.style.backgroundColor = this.highlightColor;
      this.currentSpan.style.color = getContrastTextColor(this.highlightColor);
      if (this.followLock) this._keepCentered(this.currentSpan);
    }
  }

  // While scroll lock is on, keep the word being read centered in the
  // viewport at all times (rather than only nudging the page once the word
  // nears the edge).
  _keepCentered(span) {
    span.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  toggleFollowLock() {
    this.followLock = !this.followLock;
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ ttsFollowLock: this.followLock });
    }
    this.toolbar.refresh();
    if (this.followLock && this.currentSpan) this._keepCentered(this.currentSpan);
    return this.followLock;
  }

  togglePause() {
    if (!this.active) return;
    const synth = window.speechSynthesis;
    this._paused = !this._paused;
    if (this._paused) {
      if (synth.speaking) synth.pause();
    } else if (synth.paused) {
      synth.resume();
    }
    this.toolbar.refresh();
  }

  // Web Speech utterances lock in rate/volume/voice at speak() time, so any
  // change requires cancelling and re-speaking from the current word. Pause
  // state isn't handled here - _speakFrom re-honors this._paused for every
  // new utterance, including this one.
  _restartFromCurrent() {
    if (!this.active || this.currentIndex < 0) return;
    const resumeIndex = this.currentIndex;
    window.speechSynthesis.cancel();
    this._speakFrom(resumeIndex);
  }

  // Jumps to a specific index: cancels current speech, immediately moves
  // currentIndex/highlight there (so a rapid repeat press computes its next
  // target from the just-requested position, not a stale one still waiting
  // on an async boundary event that this same cancel() may have wiped out
  // before it ever fired), then kicks off speech from there.
  _jumpTo(target) {
    window.speechSynthesis.cancel();
    this._setCurrentWord(target);
    this._speakFrom(target);
    this.toolbar.refresh();
  }

  // Jumps to the previous paragraph's first word (or word 0, once already in
  // the first paragraph).
  rewind() {
    if (!this.active) return;
    this._jumpTo(computeRewindIndex(this.boundaries, this.currentIndex));
  }

  // Jumps to the next paragraph's first word; no-ops once already in the
  // last paragraph rather than jumping past the end of the content.
  fastForward() {
    if (!this.active) return;
    const target = computeForwardIndex(this.boundaries, this.currentIndex);
    if (target === null) return;
    this._jumpTo(target);
  }

  adjustRate(delta) {
    const next = Math.min(MAX_RATE, Math.max(MIN_RATE, Math.round((this.rate + delta) * 10) / 10));
    this.setRate(next);
  }

  setRate(rate) {
    this.rate = Math.min(MAX_RATE, Math.max(MIN_RATE, Math.round(rate * 10) / 10));
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ ttsRate: this.rate });
    }
    this._restartFromCurrent();
    this.toolbar.refresh();
  }

  setVolume(volume) {
    this.volume = Math.min(1, Math.max(0, volume));
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ ttsVolume: this.volume });
    }
    this._restartFromCurrent();
  }

  setVoice(voiceURI) {
    this.voiceURI = voiceURI || null;
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ ttsVoiceURI: this.voiceURI });
    }
    this._restartFromCurrent();
  }

  setHighlightColor(hex) {
    this.highlightColor = hex || DEFAULT_HIGHLIGHT_COLOR;
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ ttsHighlightColor: this.highlightColor });
    }
    if (this.currentSpan) {
      this.currentSpan.style.backgroundColor = this.highlightColor;
      this.currentSpan.style.color = getContrastTextColor(this.highlightColor);
    }
  }

  stop({ completed = false } = {}) {
    this.completed = completed;
    if (this.utterance) {
      this.utterance.onend = null;
      this.utterance.onerror = null;
      this.utterance.onboundary = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (this.currentSpan) {
      this.currentSpan.classList.remove(ACTIVE_CLASS);
      this.currentSpan.style.backgroundColor = '';
      this.currentSpan.style.color = '';
    }

    unwrapWords(this.spans);

    this.words = [];
    this.spans = [];
    this.boundaries = [];
    this.currentIndex = -1;
    this.currentSpan = null;
    this.utterance = null;
    this.active = false;
    this._paused = false;
    this.toolbar.hide();
  }
}

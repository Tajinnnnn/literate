import { wrapPageWords, wrapSelectionWords, unwrapWords } from './wordWrapper';
import { HoverToolbar } from './hoverToolbar';

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

function getContrastTextColor(hex) {
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
    this.spans = [];
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
      .filter((v) => isUsOrUkEnglish(v.lang) && !isNoveltyVoice(v.name))
      .map((v) => ({
        name: v.name,
        voiceURI: v.voiceURI,
        lang: v.lang,
        default: v.default,
      }))
      .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
  }

  getState() {
    const synth = window.speechSynthesis;
    return {
      active: this.active,
      isPaused: !!(synth && synth.paused),
      rate: this.rate,
      volume: this.volume,
      voiceURI: this.voiceURI,
      highlightColor: this.highlightColor,
      wordCount: this.words.length,
      currentIndex: this.currentIndex,
    };
  }

  start(mode) {
    this.stop();
    const result = mode === 'selection' ? wrapSelectionWords() : wrapPageWords();
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
    this.currentIndex = -1;
    this.currentSpan = null;
    this.active = true;
    this.toolbar.show();
    this._speakFrom(startIndex);
  }

  _resolveVoice() {
    if (!this.voiceURI) return null;
    return cachedVoices.find((v) => v.voiceURI === this.voiceURI) || null;
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
      this.stop();
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
    if (voice) utterance.voice = voice;

    // TEMP DIAGNOSTIC (see PDF-skip investigation): log exactly what text
    // each utterance covers, so a skip can be pinned to "this whole chunk
    // never played" vs. "the engine jumped forward mid-utterance".
    utterance.onstart = () => {
      console.log('[literate] chunk start', { indexBase, chunkEnd, length: text.length, text });
    };

    utterance.onboundary = (e) => {
      if (e.name && e.name !== 'word') return;
      // Chrome can deliver a stray/late boundary event right as pause() takes
      // effect, or replay one after resume(); ignore those so the highlight
      // doesn't jump away from the word actually being spoken.
      if (window.speechSynthesis.paused) return;

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
        this.stop();
      }
    };
    utterance.onerror = (e) => {
      if (this.utterance !== utterance) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      this.stop();
    };

    this.utterance = utterance;
    window.speechSynthesis.speak(utterance);
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
    const synth = window.speechSynthesis;
    if (!this.active) return;
    if (synth.paused) {
      synth.resume();
    } else if (synth.speaking) {
      synth.pause();
    }
    this.toolbar.refresh();
  }

  // Web Speech utterances lock in rate/volume/voice at speak() time, so any
  // change requires cancelling and re-speaking from the current word. This
  // preserves whether playback was paused so tweaking a setting mid-pause
  // doesn't unexpectedly resume speech (a source of the highlight seeming to
  // jump while "paused").
  _restartFromCurrent() {
    if (!this.active || this.currentIndex < 0) return;
    const resumeIndex = this.currentIndex;
    const wasPaused = !!(window.speechSynthesis && window.speechSynthesis.paused);
    window.speechSynthesis.cancel();
    this._speakFrom(resumeIndex);
    if (wasPaused) window.speechSynthesis.pause();
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

  stop() {
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
    this.currentIndex = -1;
    this.currentSpan = null;
    this.utterance = null;
    this.active = false;
    this.toolbar.hide();
  }
}

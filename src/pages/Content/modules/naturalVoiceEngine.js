import { wrapPageWords, wrapSelectionWords, wrapElementWords, unwrapWords, computeRewindIndex, computeForwardIndex } from './wordWrapper';
import { HoverToolbar } from './hoverToolbar';
import { getContrastTextColor } from './ttsEngine';
import { connectVoice } from '../../../shared/voiceClient';
import { voiceAudioBlob, firstChunkEnd } from '../../../shared/voiceAudio.mjs';
import { buildTranscriptLines, audioWordIndex } from '../../../shared/readingTranscript.mjs';

const ACTIVE_CLASS = '__ttsxr_word_active';
const MIN_RATE = 0.1;
const MAX_RATE = 10;
const DEFAULT_RATE = 1;
const DEFAULT_VOLUME = 1;
const DEFAULT_HIGHLIGHT_COLOR = '#ffe58a';

// Preserve the natural voice with pitch-preserving media playback. Speed
// updates reuse existing audio instead of restarting model inference.
const KOKORO_SPEED_MIN = 0.5;
const KOKORO_SPEED_MAX = 2;

// Kept shorter than the System Voice engine's per-utterance cap (600 chars)
// since synthesis here costs real wall-clock time per chunk — smaller
// chunks mean a shorter perceptible gap on the very first chunk, and a
// faster turnaround when rate/voice changes trigger a resynthesis.
const MAX_CHUNK_CHARS = 400;

const DEFAULT_VOICE_ID = 'af_heart';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export class NaturalVoiceEngine {
  constructor() {
    this.words = [];
    this.transcript = { sessionId: 0, lines: [], wordCount: 0 };
    this.completed = false;
    this.spans = [];
    this.boundaries = [];
    this.currentIndex = -1;
    this.currentSpan = null;
    this.rate = DEFAULT_RATE;
    this.volume = DEFAULT_VOLUME;
    this.highlightColor = DEFAULT_HIGHLIGHT_COLOR;
    this.followLock = true;
    this.voiceId = DEFAULT_VOICE_ID;
    this.active = false;

    this.tts = null;
    this.modelStatus = 'idle'; // 'idle' | 'loading' | 'ready' | 'error'
    this.modelProgress = null;
    this.modelError = null;
    this._modelLoadPromise = null;

    this.audioContext = null;
    this.audioElement = null;
    this.gainNode = null;
    this.currentSource = null;
    this.currentChunk = null; // { indexBase, chunkEnd, thresholds }
    this._chunkStartContextTime = 0;
    this._pendingNextChunk = null;
    this._bufferedChunks = new Map();
    this._prefetchTask = null;
    this._rafHandle = null;
    this._generation = 0;
    // Persistent, explicitly-owned pause state - checked by _playChunk for
    // every newly scheduled chunk (start, continuation, or a restart from
    // rewind/fast-forward) so a chunk boundary never silently
    // resumes playback the user paused, and isPaused()/the UI label can't
    // drift from what was actually last requested.
    this._paused = false;

    this.toolbar = new HoverToolbar(this);

    // Rate/volume/highlight color/follow-lock are shared with the System
    // Voice engine (same storage keys) so switching modes doesn't reset
    // settings the user already dialed in via the popup.
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(
        ['ttsRate', 'ttsVolume', 'ttsHighlightColor', 'ttsFollowLock', 'ttsNaturalVoiceId'],
        (res) => {
          if (res.ttsRate) this.rate = res.ttsRate;
          if (typeof res.ttsVolume === 'number') this.volume = res.ttsVolume;
          if (res.ttsHighlightColor) this.highlightColor = res.ttsHighlightColor;
          if (typeof res.ttsFollowLock === 'boolean') this.followLock = res.ttsFollowLock;
          if (res.ttsNaturalVoiceId) this.voiceId = res.ttsNaturalVoiceId;
          this.toolbar.refresh();
        }
      );
    }
  }

  isPaused() {
    return this._paused;
  }

  getState() {
    if (this.active && (this.audioElement || this.audioContext)) this._syncCurrentWord();
    return {
      active: this.active,
      readingScope: this.readingRoot?.isConnected ? 'section' : 'article',
      isPaused: this.isPaused(),
      rate: this.rate,
      volume: this.volume,
      voiceURI: null,
      highlightColor: this.highlightColor,
      wordCount: this.transcript.wordCount,
      currentIndex: this.completed ? this.transcript.wordCount - 1 : this.currentIndex,
      sessionId: this.transcript.sessionId,
      completed: this.completed,
      isSynthesizing: this.active && !this.currentSource,
    };
  }

  getTranscript() {
    return this.transcript;
  }

  // Model status/voice list are meaningful even when this engine isn't the
  // active one (e.g. so the popup can show load progress right after the
  // user flips the toggle, before they've pressed play).
  getNaturalVoiceMeta() {
    return {
      status: this.modelStatus,
      backend: this.executionBackend || null,
      instanceId: this.modelInstanceId || null,
      loadCount: this.modelLoadCount || 0,
      progress: this.modelProgress,
      error: this.modelError,
      voiceId: this.voiceId,
      voices: this._voiceList(),
    };
  }

  _voiceList() {
    if (!this.tts) return [];
    return Object.entries(this.tts.voices).map(([id, meta]) => ({
      id,
      name: meta.name,
      language: meta.language,
      gender: meta.gender,
    }));
  }

  ensureModelLoaded() {
    if (this.modelStatus === 'ready') return Promise.resolve();
    if (this._modelLoadPromise) return this._modelLoadPromise;

    this.modelStatus = 'loading';
    this.modelProgress = 0;
    this.modelError = null;

    this._modelLoadPromise = (async () => {
      try {
        this.tts = await connectVoice(meta => {
          this.modelProgress = meta.progress;
          this.executionBackend = meta.backend;
          this.modelInstanceId = meta.instanceId;
          this.modelLoadCount = meta.loadCount;
        });
        this.modelStatus = 'ready';
        this.modelProgress = 100;
      } catch (err) {
        this.modelStatus = 'error';
        this.modelError = (err && err.message) || 'Failed to load voice model';
        this._modelLoadPromise = null;
        throw err;
      }
    })();

    return this._modelLoadPromise;
  }

  async start(mode) {
    this.stop();
    const result = mode === 'selection' ? wrapSelectionWords() : (this.readingRoot?.isConnected ? wrapElementWords(this.readingRoot) : wrapPageWords());
    if (!result || result.words.length === 0) return { ok: false, reason: 'no-text' };
    return this._beginReading(result);
  }

  async startSection(element) {
    this.readingRoot = element;
    return this.start('page');
  }

  async startFromElement(targetElement) {
    this.stop();
    const result = wrapPageWords();
    if (!result || result.words.length === 0) return { ok: false, reason: 'no-text' };

    let startIndex = 0;
    if (targetElement) {
      const found = result.spans.findIndex((span) => this._isAtOrAfter(span, targetElement));
      if (found >= 0) startIndex = found;
    }
    return this._beginReading(result, startIndex);
  }

  _isAtOrAfter(span, target) {
    if (span === target || target.contains(span)) return true;
    const pos = target.compareDocumentPosition(span);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return true;
    if (pos & Node.DOCUMENT_POSITION_CONTAINED_BY) return true;
    return false;
  }

  async startFromWordIndex(index) {
    this.stop();
    const result = wrapPageWords();
    if (!result || result.words.length === 0) return { ok: false, reason: 'no-text' };
    const startIndex = typeof index === 'number' ? Math.min(Math.max(index, 0), result.words.length - 1) : 0;
    return this._beginReading(result, startIndex);
  }

  async _beginReading(result, startIndex = 0) {
    this.words = result.words;
    this._sessionWords = [...result.words];
    this._sessionBoundaries = [...(result.boundaries || [])];
    this.spans = result.spans;
    this.boundaries = result.boundaries || [];
    this.transcript = {
      sessionId: this.transcript.sessionId + 1,
      lines: buildTranscriptLines(this.words, this.boundaries),
      wordCount: this.words.length,
    };
    this.completed = false;
    this.currentIndex = -1;
    this.currentSpan = null;
    this.active = true;
    this._paused = false;
    this.toolbar.show();

    try {
      await this.ensureModelLoaded();
    } catch {
      // modelStatus/modelError already set by ensureModelLoaded; unwind the
      // in-progress read so the UI doesn't show a stuck "active" state.
      this.active = false;
      this.toolbar.hide();
      unwrapWords(this.spans);
      this.words = [];
      this.spans = [];
      return { ok: false, reason: 'model-error' };
    }

    this._setCurrentWord(startIndex);
    this._playFrom(startIndex);
    return { ok: true };
  }

  async seekToWord(index, sessionId) {
    if (sessionId !== this.transcript.sessionId || !Number.isSafeInteger(index) || index < 0 || index >= this.transcript.wordCount) return { ok: false, reason: 'invalid-seek' };
    if (!this.active) {
      if (!this._sessionWords?.length) return { ok: false, reason: 'no-text' };
      return this._beginReading({ words: [...this._sessionWords], spans: [], boundaries: [...this._sessionBoundaries] }, index);
    }
    this._paused = false;
    this._setCurrentWord(index);
    this._restartFrom(index);
    this.toolbar.refresh();
    return { ok: true };
  }

  _findChunkEnd(indexBase) {
    // CPU inference needs smaller continuations to avoid long silent gaps.
    if (this.executionBackend === 'wasm') return firstChunkEnd(this.words, indexBase);
    let cursor = 0;
    let end = indexBase;
    let lastSentenceEnd = -1;
    while (end < this.words.length) {
      const nextCursor = cursor + this.words[end].length + 1;
      if (end > indexBase && nextCursor > MAX_CHUNK_CHARS) break;
      cursor = nextCursor;
      end++;
      if (/[.!?]$/.test(this.words[end - 1])) lastSentenceEnd = end;
    }
    if (lastSentenceEnd > indexBase && lastSentenceEnd < end) return lastSentenceEnd;
    return end;
  }

  async _synthesizeChunk(indexBase, chunkEnd) {
    const text = this.words.slice(indexBase, chunkEnd).join(' ');
    const key = `${this.voiceId}\n${text}`;
    this._audioCache ||= new Map();
    let pending = this._audioCache.get(key);
    if (!pending) {
      pending = this.tts.generate(text, { voice: this.voiceId, speed: 1 });
      this._audioCache.set(key, pending);
      // Retain a small recent reading window, without keeping an entire book.
      if (this._audioCache.size > 8) this._audioCache.delete(this._audioCache.keys().next().value);
    } else {
      this._audioCache.delete(key); this._audioCache.set(key, pending);
    }
    try {
      const rawAudio = await pending;
      return { indexBase, chunkEnd, audio: rawAudio.audio, samplingRate: rawAudio.sampling_rate };
    } catch (error) {
      this._audioCache.delete(key);
      throw error;
    }
  }

  _buildWordThresholds(indexBase, chunkEnd, durationSeconds) {
    const slice = this.words.slice(indexBase, chunkEnd);
    const totalChars = slice.reduce((sum, w) => sum + w.length, 0) || 1;
    let cumulative = 0;
    return slice.map((w) => {
      const start = (cumulative / totalChars) * durationSeconds;
      cumulative += w.length;
      return start;
    });
  }

  async _playFrom(indexBase, chunkEnd = firstChunkEnd(this.words, indexBase)) {
    if (indexBase >= this.words.length) {
      this.stop({ completed: true });
      return;
    }
    const generation = this._generation;

    let chunk;
    try {
      chunk = await this._synthesizeChunk(indexBase, chunkEnd);
    } catch {
      if (generation === this._generation) this.stop();
      return;
    }
    if (generation !== this._generation) return; // stopped/restarted meanwhile

    this._playChunk(chunk);
  }

  _playChunk({ indexBase, chunkEnd, audio, samplingRate }) {
    this._bufferedChunks?.delete(indexBase);
    const media = new Audio();
    const url = URL.createObjectURL(voiceAudioBlob(audio, samplingRate));
    media.src = url;
    media.preservesPitch = true;
    media.playbackRate = clamp(this.rate, KOKORO_SPEED_MIN, KOKORO_SPEED_MAX);
    media.volume = this.volume;
    const source = {
      onended: null,
      stop: () => { media.onended = null; media.pause(); media.removeAttribute('src'); media.load(); URL.revokeObjectURL(url); },
    };
    media.onended = () => { URL.revokeObjectURL(url); source.onended?.(); };
    this.audioElement = media;
    const durationSeconds = audio.length / samplingRate;
    const thresholds = this._buildWordThresholds(indexBase, chunkEnd, durationSeconds);

    const generation = this._generation;
    source.onended = () => {
      if (this.currentSource !== source || generation !== this._generation) return;
      this._setCurrentWord(chunkEnd - 1);
      this.currentSource = null;
      this.audioElement = null;
      this.currentChunk = null;
      if (this._rafHandle) cancelAnimationFrame(this._rafHandle);
      if (chunkEnd < this.words.length) {
        const pending = this._bufferedChunks?.get(chunkEnd);
        this._bufferedChunks?.delete(chunkEnd);
        this._pendingNextChunk = null;
        if (pending && pending.indexBase === chunkEnd) {
          this._playChunk(pending);
        } else {
          // Request exactly the prefetched range so a slow, unfinished
          // synthesis is shared instead of queuing a second shorter chunk.
          this._playFrom(chunkEnd, this._findChunkEnd(chunkEnd));
        }
      } else {
        this.stop({ completed: true });
      }
    };

    this.currentSource = source;
    this.currentChunk = { indexBase, chunkEnd, thresholds };
    this._chunkStartContextTime = 0;
    if (!this._paused) media.play().catch(() => {
      if (this.currentSource === source) { this._paused = true; this.toolbar.refresh(); }
    });
    if (this._paused) this._setCurrentWord(indexBase);
    else this._startHighlightLoop();
    this._prefetchNextChunk(chunkEnd);
  }

  _prefetchNextChunk(afterIndex) {
    if (afterIndex >= this.words.length) return;
    const generation = this._generation;
    if (this._prefetchTask?.generation === generation) return this._prefetchTask.promise;
    this._bufferedChunks ||= new Map();
    const task = { generation };
    this._prefetchTask = task;
    task.promise = (async () => {
      let index = afterIndex;
      while (this.active && generation === this._generation && index < this.words.length) {
        const ready = this._bufferedChunks.get(index);
        if (ready) { index = ready.chunkEnd; continue; }
        if (this._bufferedChunks.size >= 3) break;
        const result = await this._synthesizeChunk(index, this._findChunkEnd(index));
        if (generation !== this._generation || !this.active) return;
        this._bufferedChunks.set(index, result);
        index = result.chunkEnd;
      }
    })().catch(() => {
      // Playback retries the next chunk on demand if prefetch fails.
    }).finally(() => {
      if (this._prefetchTask === task) this._prefetchTask = null;
    });
    return task.promise;
  }

  _startHighlightLoop() {
    const tick = () => {
      if (!this.active || !this.currentChunk || (!this.audioElement && !this.audioContext)) return;
      this._syncCurrentWord();
      this._rafHandle = requestAnimationFrame(tick);
    };
    if (this._rafHandle) cancelAnimationFrame(this._rafHandle);
    this._rafHandle = requestAnimationFrame(tick);
  }

  _syncCurrentWord() {
    const time = this.audioElement ? this.audioElement.currentTime : this.audioContext.currentTime;
    const index = audioWordIndex(this.currentChunk, time,
      this.audioElement ? 0 : this._chunkStartContextTime, this._paused, this.currentIndex);
    if (index !== this.currentIndex) this._setCurrentWord(index);
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
      if (this.followLock) this.currentSpan.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  toggleFollowLock() {
    this.followLock = !this.followLock;
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ ttsFollowLock: this.followLock });
    }
    this.toolbar.refresh();
    if (this.followLock && this.currentSpan) {
      this.currentSpan.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return this.followLock;
  }

  togglePause() {
    if (!this.active) return;
    this._paused = !this._paused;
    if (this.audioElement) {
      if (this._paused) this.audioElement.pause();
      else {
        this.audioElement.play().catch(() => { this._paused = true; this.toolbar.refresh(); });
        this._startHighlightLoop();
      }
      this.toolbar.refresh();
      return;
    }
    if (!this.audioContext) {
      this.toolbar.refresh();
      return;
    }
    if (!this._paused) {
      this.audioContext.resume().catch(() => {});
      this._startHighlightLoop();
    } else {
      this.audioContext.suspend();
      if (this._rafHandle) cancelAnimationFrame(this._rafHandle);
    }
    this.toolbar.refresh();
  }

  // Shared cancel-current-chunk-and-restart-from-index mechanics, used by
  // voice changes, rewind, and fast-forward. Pause state is retained by
  // _playChunk for the newly scheduled media element.
  _restartFrom(index) {
    if (!this.active) return;
    this._generation++;
    if (this.currentSource) {
      this.currentSource.onended = null;
      try {
        this.currentSource.stop();
      } catch {
        // already stopped
      }
      this.currentSource = null;
    }
    this.audioElement = null;
    if (this._rafHandle) cancelAnimationFrame(this._rafHandle);
    this._pendingNextChunk = null;
    this._bufferedChunks?.clear();
    this.currentChunk = null; // The old audio clock must not override the requested position.
    this._playFrom(index);
  }

  // A new voice needs new audio; speed changes reuse the current recording.
  _restartFromCurrent() {
    if (this.currentIndex < 0) return;
    this._restartFrom(this.currentIndex);
  }

  // Jumps to the previous paragraph's first word (or word 0, once already in
  // the first paragraph). Moves currentIndex/highlight there synchronously
  // before kicking off the (async) resynthesis, so a rapid repeat press
  // computes its next target from the just-requested position rather than a
  // stale one still waiting on the highlight loop to catch up to audio that
  // may get cancelled before it ever plays.
  rewind() {
    if (!this.active) return;
    const target = computeRewindIndex(this.boundaries, this.currentIndex);
    this._setCurrentWord(target);
    this._restartFrom(target);
    this.toolbar.refresh();
  }

  // Jumps to the next paragraph's first word; no-ops once already in the
  // last paragraph rather than jumping past the end of the content.
  fastForward() {
    if (!this.active) return;
    const target = computeForwardIndex(this.boundaries, this.currentIndex);
    if (target === null) return;
    this._setCurrentWord(target);
    this._restartFrom(target);
    this.toolbar.refresh();
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
    if (this.audioElement) this.audioElement.playbackRate = clamp(this.rate, KOKORO_SPEED_MIN, KOKORO_SPEED_MAX);
    this.toolbar.refresh();
  }

  setVolume(volume) {
    this.volume = Math.min(1, Math.max(0, volume));
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ ttsVolume: this.volume });
    }
    if (this.gainNode) this.gainNode.gain.value = this.volume;
    if (this.audioElement) this.audioElement.volume = this.volume;
  }

  setVoice(voiceId) {
    this.voiceId = voiceId || DEFAULT_VOICE_ID;
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ ttsNaturalVoiceId: this.voiceId });
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
    this._generation++;
    if (this.currentSource) {
      this.currentSource.onended = null;
      try {
        this.currentSource.stop();
      } catch {
        // already stopped
      }
      this.currentSource = null;
    }
    this.audioElement = null;
    if (this._rafHandle) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
    this._pendingNextChunk = null;
    this._bufferedChunks?.clear();
    this.currentChunk = null;

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
    this.active = false;
    this._paused = false;
    this.toolbar.hide();
  }
}

import { trustedController } from './security.mjs';
import { pickReadingSection } from '../pages/Content/modules/sectionPicker';
import { TTSEngine } from '../pages/Content/modules/ttsEngine';
import { NaturalVoiceEngine } from '../pages/Content/modules/naturalVoiceEngine';
import { getWordIndexBeforeSelection } from '../pages/Content/modules/wordWrapper';
import { initDarkMode, isDarkModeActive, toggleDarkMode } from '../pages/Content/modules/darkMode';
import { MSG, DEFAULT_HOTKEYS } from './messages';

// Wires up the TTS engines, hotkeys, context-menu/message handling, and dark
// mode against whatever document this runs in — the live webpage (content
// script) or an extension-hosted reading surface (e.g. the PDF viewer). Both
// need identical reading behavior, so this is the one place it's defined.
export function initReadingSurface() {
  const surfaceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const systemEngine = new TTSEngine();
  const naturalEngine = new NaturalVoiceEngine();
  initDarkMode();

  // Respect device mode before answering the popup, so opening it never
  // starts a model download when the user chose instant native speech.
  let naturalVoiceEnabled = true;
  const preferencesReady = new Promise(resolve => {
    if (!chrome.storage?.sync) { resolve(); return; }
    chrome.storage.sync.get(['ttsNaturalVoiceEnabled'], saved => {
      naturalVoiceEnabled = saved.ttsNaturalVoiceEnabled !== false;
      resolve();
    });
  });

  function activeEngine() {
    return naturalVoiceEnabled ? naturalEngine : systemEngine;
  }

  let hotkeys = { ...DEFAULT_HOTKEYS };
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['ttsHotkeys'], (res) => {
      if (res.ttsHotkeys) hotkeys = { ...DEFAULT_HOTKEYS, ...res.ttsHotkeys };
    });
    // Other tabs (or this one, via the popup) can change hotkeys at any time;
    // pick the update up immediately rather than only at page load.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.ttsNaturalVoiceEnabled) {
        const enabled = changes.ttsNaturalVoiceEnabled.newValue !== false;
        if (enabled !== naturalVoiceEnabled) {
          activeEngine().stop();
          naturalVoiceEnabled = enabled;
        }
      }
      if (area === 'sync' && changes.ttsHotkeys) {
        hotkeys = { ...DEFAULT_HOTKEYS, ...(changes.ttsHotkeys.newValue || {}) };
      }
    });
  }

  // Captured just before the native context menu opens, so the "Read from
  // here" menu item knows where on the page the user right-clicked.
  let lastContextMenuTarget = null;
  let cancelSectionPicker = null;
  document.addEventListener(
    'contextmenu',
    (e) => {
      lastContextMenuTarget = e.target;
    },
    true
  );

  // Tracked for the optional "Read from here" shortcut, which has no click position of its
  // own to fall back on — it uses whatever the mouse is currently over.
  let lastMouseX = 0;
  let lastMouseY = 0;
  document.addEventListener(
    'mousemove',
    (e) => {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    },
    true
  );

  // If a text selection is active, its start position (as a word index) is
  // preferred over the fallback target — it survives the page being
  // re-wrapped into word spans, whereas a reference to the selection's own
  // text node would not.
  function readFromHere(fallbackTarget) {
    const selectionIndex = getWordIndexBeforeSelection();
    return selectionIndex !== null
      ? activeEngine().startFromWordIndex(selectionIndex)
      : activeEngine().startFromElement(fallbackTarget);
  }

  function fullState() {
    return {
      ...activeEngine().getState(),
      title: document.title || 'Untitled page',
      site: window.location.hostname || 'Local document',
      surfaceId,
      darkMode: isDarkModeActive(),
      hotkeys,
      naturalVoiceEnabled,
      deviceVoices: systemEngine.getVoices(),
      naturalVoice: naturalEngine.getNaturalVoiceMeta(),
    };
  }

  function isEditableTarget(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
  }

  // User-configurable shortcuts (see the settings panel): read the page,
  // pause/resume, toggle scroll lock, read from here (the current selection,
  // or wherever the mouse is hovering), and slow down/speed up playback.
  // Ignored while typing in a field, or if a modifier key is held (so
  // browser/site shortcuts like Cmd+P for print are untouched).
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (isEditableTarget(document.activeElement)) return;

    const key = e.key.toLowerCase();
    if (key && key === hotkeys.readPage) {
      activeEngine().start('page');
    } else if (key && key === hotkeys.pausePlay) {
      activeEngine().togglePause();
    } else if (key && key === hotkeys.lock) {
      activeEngine().toggleFollowLock();
    } else if (key && key === hotkeys.readFromHere) {
      readFromHere(document.elementFromPoint(lastMouseX, lastMouseY));
    } else if (key && key === hotkeys.slowDown) {
      activeEngine().adjustRate(-0.1);
    } else if (key && key === hotkeys.speedUp) {
      activeEngine().adjustRate(0.1);
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !trustedController(sender, chrome.runtime)) return false;
    // A detached player must never control a different document after navigation.
    if (message.expectedSurfaceId && message.expectedSurfaceId !== surfaceId) {
      sendResponse(null);
      return false;
    }
    (async () => {
      await preferencesReady;
      switch (message.type) {
        case MSG.GET_STATE:
          // Merely inspecting settings must not trigger a model download.
          // Natural speech loads on Play or an explicit engine selection.
          sendResponse(fullState());
          break;
        case MSG.SEEK_WORD:
          sendResponse({ ...(await activeEngine().seekToWord(message.index, message.sessionId)), state: fullState() });
          break;
        case MSG.GET_TRANSCRIPT:
          sendResponse(activeEngine().getTranscript());
          break;
        case MSG.GET_VOICES: {
          // Always the OS voice list — a separate, always-visible picker
          // from the Kokoro voices under naturalVoice.voices in fullState().
          const voices = systemEngine.getVoices();
          if (voices.length) {
            sendResponse({ voices });
          } else {
            setTimeout(() => sendResponse({ voices: systemEngine.getVoices() }), 300);
          }
          break;
        }
        case MSG.PICK_SECTION: {
          cancelSectionPicker?.();
          const engine = activeEngine();
          const wasPlaying = engine.active && !engine.isPaused();
          if (wasPlaying) engine.togglePause();
          cancelSectionPicker = pickReadingSection(element => {
            cancelSectionPicker = null; engine.startSection(element);
          }, () => {
            cancelSectionPicker = null;
            if (wasPlaying && engine.active && engine.isPaused()) engine.togglePause();
          });
          sendResponse({ ok: true });
          break;
        }
        case MSG.RESET_SECTION:
          activeEngine().readingRoot = null;
          sendResponse({ ...(await activeEngine().start('page')), state: fullState() });
          break;
        case MSG.READ_PAGE:
          sendResponse({ ...(await activeEngine().start('page')), state: fullState() });
          break;
        case MSG.READ_SELECTION:
          sendResponse({ ...(await activeEngine().start('selection')), state: fullState() });
          break;
        case MSG.READ_FROM_HERE: {
          const result = await readFromHere(lastContextMenuTarget);
          sendResponse({ ...result, state: fullState() });
          break;
        }
        case MSG.TOGGLE_PAUSE:
          activeEngine().togglePause();
          sendResponse(fullState());
          break;
        case MSG.REWIND:
          activeEngine().rewind();
          sendResponse(fullState());
          break;
        case MSG.FAST_FORWARD:
          activeEngine().fastForward();
          sendResponse(fullState());
          break;
        case MSG.STOP:
          activeEngine().stop();
          sendResponse(fullState());
          break;
        case MSG.SET_RATE:
          activeEngine().setRate(message.rate);
          sendResponse(fullState());
          break;
        case MSG.SET_VOICE:
          // OS voice — always targets System Voice, regardless of which
          // mode is currently active, so the choice is there when the user
          // switches back to it.
          systemEngine.setVoice(message.voiceURI);
          sendResponse(fullState());
          break;
        case MSG.SET_VOLUME:
          activeEngine().setVolume(message.volume);
          sendResponse(fullState());
          break;
        case MSG.SET_HIGHLIGHT_COLOR:
          activeEngine().setHighlightColor(message.color);
          sendResponse(fullState());
          break;
        case MSG.TOGGLE_DARK_MODE:
          toggleDarkMode();
          sendResponse(fullState());
          break;
        case MSG.SET_HOTKEYS:
          hotkeys = { ...DEFAULT_HOTKEYS, ...message.hotkeys };
          if (chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.set({ ttsHotkeys: hotkeys });
          }
          sendResponse(fullState());
          break;
        case MSG.SET_NATURAL_VOICE_ENABLED:
          // Stop whichever engine was mid-read before switching — both
          // wrap the same live page into word spans, so leaving the old
          // one active would fight the new one over the same DOM.
          systemEngine.stop();
          naturalEngine.stop();
          naturalVoiceEnabled = !!message.enabled;
          if (chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.set({ ttsNaturalVoiceEnabled: naturalVoiceEnabled });
          }
          if (naturalVoiceEnabled) naturalEngine.ensureModelLoaded().catch(() => {});
          sendResponse(fullState());
          break;
        case MSG.SET_NATURAL_VOICE:
          naturalEngine.setVoice(message.voiceId);
          sendResponse(fullState());
          break;
        default:
          break;
      }
    })();
    return true;
  });

  return { systemEngine, naturalEngine };
}

import { TTSEngine } from '../pages/Content/modules/ttsEngine';
import { getWordIndexBeforeSelection } from '../pages/Content/modules/wordWrapper';
import { initDarkMode, isDarkModeActive, toggleDarkMode } from '../pages/Content/modules/darkMode';
import { MSG, DEFAULT_HOTKEYS } from './messages';

// Wires up the TTS engine, hotkeys, context-menu/message handling, and dark
// mode against whatever document this runs in — the live webpage (content
// script) or an extension-hosted reading surface (e.g. the PDF viewer). Both
// need identical reading behavior, so this is the one place it's defined.
export function initReadingSurface() {
  const engine = new TTSEngine();
  initDarkMode();

  let hotkeys = { ...DEFAULT_HOTKEYS };
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['ttsHotkeys'], (res) => {
      if (res.ttsHotkeys) hotkeys = { ...DEFAULT_HOTKEYS, ...res.ttsHotkeys };
    });
    // Other tabs (or this one, via the popup) can change hotkeys at any time;
    // pick the update up immediately rather than only at page load.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.ttsHotkeys) {
        hotkeys = { ...DEFAULT_HOTKEYS, ...(changes.ttsHotkeys.newValue || {}) };
      }
    });
  }

  // Captured just before the native context menu opens, so the "Read from
  // here" menu item knows where on the page the user right-clicked.
  let lastContextMenuTarget = null;
  document.addEventListener(
    'contextmenu',
    (e) => {
      lastContextMenuTarget = e.target;
    },
    true
  );

  // Tracked for the "I" keyboard shortcut, which has no click position of its
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
      ? engine.startFromWordIndex(selectionIndex)
      : engine.startFromElement(fallbackTarget);
  }

  function fullState() {
    return { ...engine.getState(), darkMode: isDarkModeActive(), hotkeys };
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
      engine.start('page');
    } else if (key && key === hotkeys.pausePlay) {
      engine.togglePause();
    } else if (key && key === hotkeys.lock) {
      engine.toggleFollowLock();
    } else if (key && key === hotkeys.readFromHere) {
      readFromHere(document.elementFromPoint(lastMouseX, lastMouseY));
    } else if (key && key === hotkeys.slowDown) {
      engine.adjustRate(-0.1);
    } else if (key && key === hotkeys.speedUp) {
      engine.adjustRate(0.1);
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case MSG.GET_STATE:
        sendResponse(fullState());
        break;
      case MSG.GET_VOICES: {
        const voices = engine.getVoices();
        if (voices.length) {
          sendResponse({ voices });
        } else {
          setTimeout(() => sendResponse({ voices: engine.getVoices() }), 300);
        }
        break;
      }
      case MSG.READ_PAGE:
        sendResponse({ ...engine.start('page'), state: fullState() });
        break;
      case MSG.READ_SELECTION:
        sendResponse({ ...engine.start('selection'), state: fullState() });
        break;
      case MSG.READ_FROM_HERE: {
        const result = readFromHere(lastContextMenuTarget);
        sendResponse({ ...result, state: fullState() });
        break;
      }
      case MSG.TOGGLE_PAUSE:
        engine.togglePause();
        sendResponse(fullState());
        break;
      case MSG.STOP:
        engine.stop();
        sendResponse(fullState());
        break;
      case MSG.SET_RATE:
        engine.setRate(message.rate);
        sendResponse(fullState());
        break;
      case MSG.SET_VOICE:
        engine.setVoice(message.voiceURI);
        sendResponse(fullState());
        break;
      case MSG.SET_VOLUME:
        engine.setVolume(message.volume);
        sendResponse(fullState());
        break;
      case MSG.SET_HIGHLIGHT_COLOR:
        engine.setHighlightColor(message.color);
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
      default:
        break;
    }
    return true;
  });

  return engine;
}

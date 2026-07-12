import { TTSEngine } from './modules/ttsEngine';
import { getWordIndexBeforeSelection } from './modules/wordWrapper';
import { initDarkMode, isDarkModeActive, toggleDarkMode } from './modules/darkMode';
import { MSG } from '../../shared/messages';

const engine = new TTSEngine();
initDarkMode();

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
  return { ...engine.getState(), darkMode: isDarkModeActive() };
}

function isEditableTarget(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
}

// Bare-letter shortcuts: O to read the page, P to pause/resume, L to toggle
// scroll lock, I to read from here (the current selection, or wherever the
// mouse is hovering). Ignored while typing in a field, or if a modifier key
// is held (so browser/site shortcuts like Cmd+P for print are untouched).
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  if (isEditableTarget(document.activeElement)) return;

  const key = e.key.toLowerCase();
  if (key === 'o') {
    engine.start('page');
  } else if (key === 'p') {
    engine.togglePause();
  } else if (key === 'l') {
    engine.toggleFollowLock();
  } else if (key === 'i') {
    readFromHere(document.elementFromPoint(lastMouseX, lastMouseY));
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
    default:
      break;
  }
  return true;
});

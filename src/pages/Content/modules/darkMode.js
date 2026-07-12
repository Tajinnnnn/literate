const DARK_CLASS = '__ttsxr_dark_mode__';

// Backgrounds at or above this luminance are considered "bright" and get
// darkened; text at or below this luminance is considered "dark" (meant to
// sit on a bright background) and gets lightened.
const LIGHT_BG_THRESHOLD = 0.4;
const DARK_TEXT_THRESHOLD = 0.4;

// Target lightness (HSL %) for the darkened/lightened result. Kept low/high
// respectively so the page reliably reads as dark, rather than a half-measure.
const DARK_TARGET_L = 3;
const LIGHT_TARGET_L = 88;

let active = false;
let observer = null;
const touched = new Map(); // element -> { bg: original inline background, color: original inline color }

function relativeLuminance(r, g, b) {
  const linear = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function parseColor(str) {
  if (!str) return null;
  const m = str.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/i);
  if (!m) return null;
  let a = 1;
  if (m[4] !== undefined) {
    a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  }
  return { r: parseFloat(m[1]), g: parseFloat(m[2]), b: parseFloat(m[3]), a };
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

// Deliberately neutral (0 saturation) rather than hue-preserving: a tinted
// dark background (e.g. dark yellow, dark blue) reads as "still colored",
// not truly dark. A plain gray/black scale is what actually looks like a
// dark theme. Lightness is nudged slightly by the original color so nested
// panels keep a hint of depth instead of every element becoming identical.
function darken(rgb) {
  const { l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const newL = Math.min(DARK_TARGET_L + l * 0.04, 8);
  const { r, g, b } = hslToRgb(0, 0, newL);
  return `rgb(${r}, ${g}, ${b})`;
}

function lighten(rgb) {
  const { l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const newL = Math.max(LIGHT_TARGET_L - (100 - l) * 0.08, 80);
  const { r, g, b } = hslToRgb(0, 0, newL);
  return `rgb(${r}, ${g}, ${b})`;
}

function shouldSkip(el) {
  return (
    el.hasAttribute('data-ttsxr-ignore') ||
    el.classList.contains('__ttsxr_word') ||
    el.tagName === 'SCRIPT' ||
    el.tagName === 'STYLE'
  );
}

function remember(el) {
  if (!touched.has(el)) {
    touched.set(el, { bg: el.style.backgroundColor, color: el.style.color });
  }
}

// Split into a read pass (collectChanges) and a write pass (applyChanges)
// rather than reading getComputedStyle and writing an inline style for the
// same element back to back. Interleaving reads and writes across hundreds
// or thousands of elements forces the browser to do a synchronous style
// recalculation on every single element (layout thrashing); batching all
// reads first, then all writes, lets it compute styles once for the whole
// pass instead.
function collectChanges(elements) {
  const changes = [];
  elements.forEach((el) => {
    if (el.nodeType !== Node.ELEMENT_NODE || shouldSkip(el)) return;
    const style = window.getComputedStyle(el);

    let bgValue = null;
    const bg = parseColor(style.backgroundColor);
    if (bg && bg.a > 0.05 && relativeLuminance(bg.r, bg.g, bg.b) >= LIGHT_BG_THRESHOLD) {
      bgValue = darken(bg);
    }

    let colorValue = null;
    const fg = parseColor(style.color);
    if (fg && relativeLuminance(fg.r, fg.g, fg.b) <= DARK_TEXT_THRESHOLD) {
      colorValue = lighten(fg);
    }

    if (bgValue || colorValue) changes.push({ el, bgValue, colorValue });
  });
  return changes;
}

function applyChanges(changes) {
  changes.forEach(({ el, bgValue, colorValue }) => {
    if (bgValue) {
      remember(el);
      el.style.setProperty('background-color', bgValue, 'important');
    }
    if (colorValue) {
      remember(el);
      el.style.setProperty('color', colorValue, 'important');
    }
  });
}

function applyToTree(root) {
  const elements = root.querySelectorAll ? [root, ...root.querySelectorAll('*')] : [root];
  applyChanges(collectChanges(elements));
}

function revertAll() {
  touched.forEach((orig, el) => {
    el.style.backgroundColor = orig.bg;
    el.style.color = orig.color;
  });
  touched.clear();
}

function startObserving() {
  observer = new MutationObserver((mutations) => {
    // Gather every added element across the whole batch of mutations first,
    // so a burst of DOM changes (e.g. infinite scroll loading several items
    // at once) gets one combined read pass and one combined write pass
    // instead of a separate thrashing read/write cycle per node.
    const elements = [];
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        elements.push(node);
        if (node.querySelectorAll) elements.push(...node.querySelectorAll('*'));
      });
    });
    if (elements.length) applyChanges(collectChanges(elements));
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function stopObserving() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

function enable() {
  if (active) return;
  active = true;
  document.documentElement.classList.add(DARK_CLASS);
  applyToTree(document.documentElement);
  startObserving();
}

function disable() {
  if (!active) return;
  active = false;
  stopObserving();
  document.documentElement.classList.remove(DARK_CLASS);
  revertAll();
}

export function isDarkModeActive() {
  return active;
}

export function toggleDarkMode() {
  if (active) disable();
  else enable();
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set({ ttsDarkMode: active });
  }
  return active;
}

export function initDarkMode() {
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['ttsDarkMode'], (res) => {
      if (res.ttsDarkMode) enable();
    });
  }
}

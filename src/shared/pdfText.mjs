function codePointRange(start, end) {
  const chars = [];
  for (let cp = start; cp <= end; cp++) chars.push(String.fromCharCode(cp));
  return chars.join('');
}

const UNSAFE_CHAR_SET =
  codePointRange(0x00, 0x08) +
  codePointRange(0x0b, 0x0c) +
  codePointRange(0x0e, 0x1f) +
  codePointRange(0x7f, 0x9f) +
  String.fromCharCode(0xad) +
  codePointRange(0x200b, 0x200f) +
  codePointRange(0x202a, 0x202e) +
  codePointRange(0x2060, 0x206f) +
  String.fromCharCode(0xfeff);
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = new RegExp('[' + UNSAFE_CHAR_SET + ']', 'g');
const MODIFIER_APOSTROPHE = new RegExp(String.fromCharCode(0x2bc), 'g');

function sanitizeExtractedText(str) {
  return str.normalize('NFKC').replace(MODIFIER_APOSTROPHE, "'").replace(UNSAFE_CHARS, '');
}

function geometry(item) {
  const t = item.transform;
  if (!Array.isArray(t) || t.length < 6 || !t.every(Number.isFinite) || !Number.isFinite(item.width)) return null;
  const scale = Math.hypot(t[0], t[1]) || 1;
  return { x: t[4], y: t[5], ux: t[0] / scale, uy: t[1] / scale,
    height: item.height || Math.hypot(t[2], t[3]) || scale, width: item.width };
}

// PDF.js items are positioned glyph runs, not words. Keep content-stream
// order, using physical gaps to distinguish font/letter fragments from spaces.
export function reflowPdfText(items) {
  let text = '', previous = null, explicitSpace = false, lineEnd = false;
  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    const clean = sanitizeExtractedText(item.str).replace(/\s+/g, ' ');
    let word = clean.trim();
    if (!word) {
      explicitSpace ||= /\s/.test(clean);
      lineEnd ||= !!item.hasEOL;
      continue;
    }
    const position = geometry(item);
    // Some PDFs encode decorative tracking as literal spaces INSIDE a
    // glyph run. Compact runs of four or more capitals are single words;
    // keep separate runs, short initials and widely spaced letters intact.
    if (position && /^\p{Lu}(?: \p{Lu}){3,}$/u.test(word)) {
      const letters = word.replace(/ /g, '');
      if (position.width / letters.length <= position.height * 0.85) word = letters;
    }
    if (previous) {
      const before = previous.position;
      let separator = ' ';
      if (before && position) {
        const dx = position.x - before.x, dy = position.y - before.y;
        const height = Math.max(before.height, position.height);
        const baselineGap = Math.abs(dx * -before.uy + dy * before.ux);
        const gap = dx * before.ux + dy * before.uy - before.width;
        const newLine = lineEnd || previous.item.hasEOL || baselineGap > height * 0.5;
        if (newLine) {
          separator = baselineGap > height * 1.65 ? '\n\n' : ' ';
          // Soft hyphens are discretionary; visible hyphens may belong to
          // real compounds, so retain them and join only the line break.
          if (/^\p{Ll}/u.test(word) && (/\u00ad\s*$/.test(previous.item.str) || /[-\u2010]$/.test(text))) separator = '';
        } else {
          separator = explicitSpace || /^\s/.test(clean) || /\s$/.test(previous.clean) || gap > height * 0.14 ? ' ' : '';
        }
      }
      text += separator;
    }
    text += word;
    previous = { item, position, clean };
    explicitSpace = false;
    lineEnd = false;
  }
  return text.trim();
}

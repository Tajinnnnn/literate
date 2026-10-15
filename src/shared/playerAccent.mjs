export const DEFAULT_ACCENT = '#9aa0ff';
export const ACCENT_COLORS = [
  { name: 'Periwinkle', color: DEFAULT_ACCENT },
  { name: 'Moss', color: '#46654e' },
  { name: 'Gold', color: '#ffd66b' },
  { name: 'Lilac', color: '#bba8ff' },
  { name: 'Coral', color: '#ff918d' },
  { name: 'Mint', color: '#8bdbb5' },
  { name: 'Ice', color: '#90c7ff' },
  { name: 'Rose', color: '#f5a6dc' },
];
export function normalizeAccent(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : DEFAULT_ACCENT;
}
function channels(color) { return color.slice(1).match(/../g).map(part => parseInt(part, 16)); }
function mix(color, target, weight) {
  const end = channels(target);
  return '#' + channels(color).map((c, i) => Math.round(c + (end[i] - c) * weight).toString(16).padStart(2, '0')).join('');
}
function luminance(color) {
  const linear = channels(color).map(c => { const n = c / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
export function contrastRatio(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
export function accentTokens(value, theme) {
  const base = normalizeAccent(value);
  const dark = theme === 'dark';
  const surfaces = dark ? ['#181818', '#222222'] : ['#f5f2e9', '#ffffff'];
  const target = dark ? '#ffffff' : '#000000';
  let accent = base;
  for (let step = 0; step <= 100; step++) {
    accent = mix(base, target, step / 100);
    if (surfaces.every(bg => contrastRatio(accent, bg) >= 4.5)) break;
  }
  return { '--accent': accent, '--accent-hover': mix(accent, target, .12), '--on-accent': dark ? '#181818' : '#ffffff', '--focus': accent };
}
export function applyAccent(doc, value, theme) {
  Object.entries(accentTokens(value, theme)).forEach(([key, color]) => doc.documentElement.style.setProperty(key, color));
}

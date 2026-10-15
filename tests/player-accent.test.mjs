import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_ACCENT, ACCENT_COLORS, normalizeAccent, accentTokens, contrastRatio} from '../src/shared/playerAccent.mjs';
test('periwinkle is the default and malformed stored colors recover safely',()=>{
 assert.equal(DEFAULT_ACCENT,'#9aa0ff');
 for(const input of [null,undefined,{},'#fff','red','url(x)']) assert.equal(normalizeAccent(input),DEFAULT_ACCENT);
 assert.equal(normalizeAccent('#AAbbCC'),'#aabbcc');
});
test('presets and custom extremes remain readable on both surfaces and action buttons',()=>{
 for(const color of [...ACCENT_COLORS.map(c=>c.color),'#ffffff','#000000','#ff0000','#00ff00','#0000ff']) {
  for(const mode of ['light','dark']) {
   const tokens=accentTokens(color,mode);
   for(const surface of mode==='dark'?['#181818','#222222']:['#f5f2e9','#ffffff']) assert.ok(contrastRatio(tokens['--accent'],surface)>=4.5,`${color} ${mode} ${surface}`);
   for(const fill of ['--accent','--accent-hover']) assert.ok(contrastRatio(tokens[fill],tokens['--on-accent'])>=4.5,`${color} ${mode} ${fill}`);
  }
 }
});

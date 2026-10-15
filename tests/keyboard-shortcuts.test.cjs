const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('users can assign and clear a shortcut without changing other assignments', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/pages/Popup/Popup.jsx'), 'utf8');
  const body = source.match(/function commitHotkey\(key, value\) \{([\s\S]*?)\n  \}/)[1];
  const saved = [];
  const context = vm.createContext({
    hotkeys: { readPage: '', pausePlay: 'p' },
    MSG: { SET_HOTKEYS: 'save' },
    setHotkeys: next => { context.hotkeys = next; },
    command: (type, payload) => saved.push(payload.hotkeys),
  });
  vm.runInContext(`function commitHotkey(key, value) {${body}\n}`, context);
  context.commitHotkey('readPage', 'K');
  assert.equal(context.hotkeys.readPage, 'k');
  context.commitHotkey('readPage', '');
  assert.equal(context.hotkeys.readPage, '');
  assert.equal(saved.at(-1).readPage, '');
  assert.equal(saved.at(-1).pausePlay, 'p');
  context.commitHotkey('readPage', ' ');
  assert.equal(saved.length, 2);
});

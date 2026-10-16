const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const babel = require('@babel/core');
function compiled(file) { return babel.transformFileSync(path.join(__dirname, '../src', file), { babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code; }
const id = 'test';
const internal = { id, url: `chrome-extension://${id}/popup.html` };
function run(file, chrome, extra = {}) {
 const listeners = [];
 chrome.runtime = { id, getURL: p => `chrome-extension://${id}/${p}`, onMessage: { addListener: fn => listeners.push(fn) }, ...chrome.runtime };
 vm.runInNewContext(compiled(file), { exports: {}, URL, URLSearchParams, Promise, setTimeout, clearTimeout, ...extra, chrome, require(name) {
  if (name.endsWith('messages')) return { MSG: { OPEN_PLAYER: 'open' } };
  if (name.endsWith('security.mjs')) return require('../src/shared/security.mjs');
  return {};
 } });
 return listeners;
}
test('player window requests reject foreign senders and content scripts before querying tabs', () => {
 let queries = 0;
 const [listener] = run('pages/Background/index.js', { runtime: { onInstalled: { addListener() {} } }, contextMenus: { onClicked: { addListener() {} } }, webNavigation: { onBeforeNavigate: { addListener() {} } }, tabs: { get() { queries++; } } });
 for (const sender of [{ id: 'foreign' }, { id, url: 'https://example.test', tab: { id: 7 } }]) {
  assert.equal(listener({ type: 'open', tabId: 9 }, sender, () => {}), false);
 }
 assert.equal(queries, 0);
});
test('offscreen host rejects a content script even when it has our extension id', () => {
 let workers = 0;
 const [listener] = run('pages/VoiceHost/index.js', {}, { Worker: class { constructor() { workers++; } postMessage() {} } });
 assert.equal(listener({ type: 'TTSXR_VOICE_HOST', command: 'ensure' }, { id, url: 'https://example.test', tab: { id: 7 } }, () => {}), false);
 assert.equal(workers, 0);
});
test('voice broker rejects unknown commands and oversized text before creating its host', () => {
 let contexts = 0;
 const [listener] = run('pages/Background/voiceHost.js', { runtime: { getContexts() { contexts++; return Promise.resolve([]); }, sendMessage() {} }, offscreen: { createDocument: async () => {} } });
 const sender = { id, url: 'https://example.test', frameId: 0, tab: { id: 7 } };
 for (const message of [{ type: 'TTSXR_VOICE_REQUEST', command: 'unknown' }, { type: 'TTSXR_VOICE_REQUEST', command: 'generate', payload: { text: 'x'.repeat(1001), voice: 'af_heart' } }, { type: 'TTSXR_VOICE_REQUEST', command: 'generate', payload: { text: 'hi', voice: '../../config' } }]) {
  assert.equal(listener(message, sender, () => {}), false);
 }
 assert.equal(contexts, 0);
});
function pdfEntry(address) {
 const fetched = []; let options;
 const element = () => ({ appendChild() {}, setAttribute() {}, innerHTML: '' });
 vm.runInNewContext(compiled('pages/PdfViewer/index.js'), {
  URL, URLSearchParams, Uint8Array, window: { location: { search: '?file=' + encodeURIComponent(address) } },
  chrome: {}, document: { getElementById: element, createElement: element },
  fetch: async url => { fetched.push(url); return { ok: true, headers: { get: () => null }, arrayBuffer: async () => new Uint8Array([37,80,68,70]).buffer }; },
  require(name) {
   if (name === 'pdfjs-dist/webpack.mjs') return { getDocument(value) { options = value; return { promise: Promise.reject(new Error('fixture parser stop')) }; } };
   if (name.endsWith('security.mjs')) return require('../src/shared/security.mjs');
   if (name.endsWith('pdfSafety.mjs')) return require('../src/shared/pdfSafety.mjs');
   return {};
  },
 });
 return { fetched, options: () => options };
}
test('PDF entry rejects remote, non-PDF, data, and network-share addresses before fetching', async () => {
 for (const url of ['https://huggingface.co/private.pdf', 'file:///etc/passwd', 'file://server/share/secret.pdf', 'data:application/pdf,hello', 'file:///tmp/a.pdf?remote=1']) {
  const result = pdfEntry(url); await new Promise(resolve => setImmediate(resolve));
  assert.equal(result.fetched.length, 0, url);
 }
});
test('local PDFs remain supported with dynamic code evaluation disabled', async () => {
 const result = pdfEntry('file:///tmp/notes.pdf'); await new Promise(resolve => setImmediate(resolve));
 assert.equal(result.fetched.length, 1);
 assert.equal(result.options().isEvalSupported, false);
 assert.equal(result.options().disableFontFace, true);
});
test('development server does not expose source to arbitrary web origins or hostnames', () => {
 let options;
 vm.runInNewContext(require('node:fs').readFileSync(path.join(__dirname, '../utils/webserver.js'), 'utf8'), {
  process: { env: {} }, __dirname: path.join(__dirname, '../utils'),
  require(name) {
   if (name === 'webpack-dev-server') return class { constructor(value) { options = value; } async start() {} };
   if (name === 'webpack') return () => ({});
   if (name === '../webpack.config') return { entry: {}, chromeExtensionBoilerplate: {} };
   if (name === './env') return { PORT: 3000 };
   if (name === 'path') return path;
   throw new Error(name);
  },
 });
 const schemaPath = path.join(path.dirname(require.resolve('webpack-dev-server')), 'options.json');
 require('schema-utils').validate(JSON.parse(require('node:fs').readFileSync(schemaPath)), options);
 assert.notEqual(options.allowedHosts, 'all');
 assert.notEqual(options.headers?.['Access-Control-Allow-Origin'], '*');
 assert.ok(['localhost', '127.0.0.1'].includes(options.host));
});
test('extension worker policy permits only bundled worker files', () => {
 const manifest = JSON.parse(require('node:fs').readFileSync(path.join(__dirname, '../src/manifest.json')));
 const directives = Object.fromEntries(manifest.content_security_policy.extension_pages.split(';').filter(part => part.trim()).map(part => { const [name, ...values] = part.trim().split(/\s+/); return [name, values]; }));
 assert.deepEqual(directives['worker-src'], ["'self'"]);
 assert.ok(!directives['script-src'].includes("'unsafe-eval'"));
});

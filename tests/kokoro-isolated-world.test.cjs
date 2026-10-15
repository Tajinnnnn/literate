const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const webpack = require('webpack');

test('Kokoro loads in the content-script world without executing scripts in the host page', async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'literate-isolated-'));
  const loader = path.resolve(__dirname, '../src/pages/Content/modules/loadKokoro.js');
  const entry = path.join(output, 'entry.js');
  fs.writeFileSync(entry, `const { loadKokoro } = require(${JSON.stringify(loader)}); globalThis.result = loadKokoro().then(m => ({ factory: typeof m.KokoroTTS.from_pretrained, wasmPaths: m.env.wasmPaths }));`);
  await new Promise((resolve, reject) => {
    webpack({ mode: 'development', devtool: false, entry, target: 'web', output: { path: output, filename: 'reader.js', publicPath: 'chrome-extension://literate/' }, resolve: { alias: { 'fs/promises': false, path: false } } }, (err, stats) => {
      if (err || stats.hasErrors()) reject(err || new Error(stats.toString({ all: false, errors: true })));
      else resolve();
    });
  });
  const shared = { console, URL, URLSearchParams, TextEncoder, TextDecoder, Blob, AbortController, WebAssembly, DecompressionStream, CompressionStream, ReadableStream, TransformStream, performance, setTimeout, clearTimeout, atob, btoa, navigator: { userAgent: 'Chrome' }, chrome: { runtime: { getURL: p => 'chrome-extension://literate/' + p } } };
  const page = vm.createContext({ ...shared }); page.self = page;
  const insertedScripts = [];
  const document = {
    baseURI: "https://example.test/article",
    currentScript: { src: 'chrome-extension://literate/reader.js', tagName: 'SCRIPT' },
    getElementsByTagName: () => [],
    createElement: () => ({ setAttribute() {}, getAttribute() {}, parentNode: { removeChild() {} } }),
    head: { appendChild(script) {
      insertedScripts.push(script.src);
      const filename = script.src.split('/').at(-1);
      // Chrome executes DOM-inserted script tags in the WEBSITE world.
      vm.runInContext(fs.readFileSync(path.join(output, filename), 'utf8'), page);
      setTimeout(() => script.onload({ type: 'load', target: script }), 0);
    } },
  };
  const reader = vm.createContext({ ...shared, document });reader.self = reader;reader.window = reader;
  vm.runInContext(fs.readFileSync(path.join(output, 'reader.js'), 'utf8'), reader);
  const loaded = await reader.result;
  assert.equal(loaded.factory, 'function');
  assert.equal(loaded.wasmPaths, 'chrome-extension://literate/');
  assert.deepEqual(insertedScripts, []);
});

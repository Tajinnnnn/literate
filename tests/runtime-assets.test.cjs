const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const webpack = require('webpack');
const RuntimeAssetsPlugin = require('../utils/runtime-assets.cjs');
test('asset inventory excludes stale files and records the emitted asynchronous chunk', async () => {
 const output = fs.mkdtempSync(path.join(os.tmpdir(), 'literate-asset-inventory-'));
 fs.writeFileSync(path.join(output, 'old.bundle.js'), 'stale');
 fs.writeFileSync(path.join(output, 'entry.js'), 'import("./lazy.js").then(console.log)');
 fs.writeFileSync(path.join(output, 'lazy.js'), 'export const value = 42');
 await new Promise((resolve, reject) => webpack({ mode: 'production', context: output, entry: './entry.js', output: { path: output, filename: 'main.bundle.js', chunkFilename: '[id].bundle.js', clean: false }, plugins: [new RuntimeAssetsPlugin()] }, (error, stats) => error || stats.hasErrors() ? reject(error || Error(stats.toString())) : resolve()));
 const inventory = JSON.parse(fs.readFileSync(path.join(output, 'runtime-assets.json')));
 assert.ok(inventory.files.includes('main.bundle.js'));
 assert.ok(inventory.files.some(name => /^\d+\.bundle\.js$/.test(name)));
 assert.ok(!inventory.files.includes('old.bundle.js'));
 assert.deepEqual(inventory.forbiddenBrowserModules, []);
});

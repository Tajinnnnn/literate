import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localPdfUrl, readPdfBytes, MAX_PDF_BYTES } from '../src/shared/pdfSafety.mjs';
test('local PDF paths support encoded spaces and Windows drives', () => {
 assert.equal(localPdfUrl('file:///Users/test/My%20Notes.PDF'), 'file:///Users/test/My%20Notes.PDF');
 assert.equal(localPdfUrl('file:///C:/Users/test/notes.pdf'), 'file:///C:/Users/test/notes.pdf');
 for (const input of ['file:///tmp/a%2Etxt', 'file://remote/a.pdf', 'https://example.test/a.pdf', 'file:///tmp/a.pdf#x']) assert.throws(() => localPdfUrl(input));
});
test('an oversized advertised PDF is rejected before allocating its buffer', async () => {
 let buffered = false;
 await assert.rejects(readPdfBytes({ headers: { get: () => String(MAX_PDF_BYTES + 1) }, arrayBuffer: async () => { buffered = true; } }), /100 MB/);
 assert.equal(buffered, false);
});
test('an unadvertised oversized stream is canceled and its lock released', async () => {
 let canceled = false, released = false;
 const response = { headers: { get: () => null }, body: { getReader: () => ({
  read: async () => ({ value: { byteLength: MAX_PDF_BYTES + 1 }, done: false }),
  cancel: async () => { canceled = true; }, releaseLock: () => { released = true; },
 }) } };
 await assert.rejects(readPdfBytes(response), /100 MB/);
 assert.equal(canceled, true); assert.equal(released, true);
});
test('normal PDF stream bytes retain their order', async () => {
 const chunks = [new Uint8Array([37,80]), new Uint8Array([68,70])];
 const data = await readPdfBytes({ body: { getReader: () => ({ read: async () => chunks.length ? { done: false, value: chunks.shift() } : { done: true }, releaseLock() {} }) } });
 assert.deepEqual([...data], [37,80,68,70]);
});

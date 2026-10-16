export const MAX_PDF_BYTES = 100 * 1024 * 1024;
export const MAX_PDF_PAGES = 2000;
export const MAX_PDF_TEXT = 10_000_000;
export function localPdfUrl(value) {
  const url = new URL(value);
  const pathname = decodeURIComponent(url.pathname);
  // Empty-host file URLs can still express UNC shares using extra slashes;
  // encoded backslashes must not acquire Windows path semantics after parsing.
  if (url.protocol !== 'file:' || (url.hostname && url.hostname !== 'localhost')
      || pathname.startsWith('//') || pathname.includes('\\')
      || url.search || url.hash || !pathname.toLowerCase().endsWith('.pdf')) {
    throw new Error('Choose a local .pdf file. Web addresses and network shares are not supported.');
  }
  return url.href;
}
export async function readPdfBytes(response) {
  if (Number(response.headers?.get('content-length')) > MAX_PDF_BYTES) throw new Error('PDF exceeds the 100 MB reading limit.');
  // File streams may omit Content-Length, so enforce the same limit while reading.
  if (!response.body?.getReader) {
    const data = new Uint8Array(await response.arrayBuffer());
    if (data.byteLength > MAX_PDF_BYTES) throw new Error('PDF exceeds the 100 MB reading limit.');
    return data;
  }
  const reader = response.body.getReader();
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_PDF_BYTES) {
        await reader.cancel();
        throw new Error('PDF exceeds the 100 MB reading limit.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

// The WORKERS offscreen reason owns this dedicated inference worker.
let worker;
let nextId = 0;
const pending = new Map();
function getWorker() {
  if (worker) return worker;
  worker = new Worker(chrome.runtime.getURL('voiceWorker.bundle.js'));
  worker.onmessage = ({ data }) => {
    const finish = pending.get(data.id);
    if (finish) { pending.delete(data.id); finish(data); }
  };
  worker.onerror = event => {
    for (const finish of pending.values()) finish({ ok: false, error: event.message || 'The voice worker stopped. Retry loading the voice.' });
    pending.clear(); worker.terminate(); worker = null;
  };
  return worker;
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'TTSXR_VOICE_HOST' || sender.id !== chrome.runtime.id) return false;
  const id = ++nextId;
  pending.set(id, sendResponse);
  getWorker().postMessage({ id, command: message.command, payload: message.payload, assetBase: chrome.runtime.getURL('') });
  return true;
});

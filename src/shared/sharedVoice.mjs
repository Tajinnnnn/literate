// Shared between the worker and tests. One load; one inference at a time.
export function sharedVoiceService(loadModel) {
  let modelPromise, model, tail = Promise.resolve();
  let state = { status: 'idle', progress: 0, backend: null, instanceId: `${Date.now()}-${Math.random().toString(36).slice(2)}`, loadCount: 0 };
  const cache = new Map();
  let queued = 0;
  async function ensure() {
    if (!modelPromise) {
      state = { ...state, status: 'loading', error: null };
      modelPromise = loadModel(update => { state = { ...state, ...update }; }).then(result => {
        model = result;
        state = { ...state, status: 'ready', progress: 100, voices: model.voices, loadCount: state.loadCount + 1 };
        return state;
      }).catch(error => { modelPromise = null; state = { ...state, status: 'error', error: error.message }; throw error; });
    }
    return modelPromise;
  }
  async function generate(text, voice) {
    if (typeof text !== 'string' || !text.trim() || text.length > 1000) throw new Error('Invalid narration text');
    await ensure();
    if (!Object.prototype.hasOwnProperty.call(model.voices, voice)) throw new Error('Unknown narration voice');
    const key = `${voice}\n${text}`;
    let pending = cache.get(key);
    if (!pending) {
      if (queued >= 16) throw new Error('The narration queue is busy. Retry shortly.');
      queued++;
      pending = tail.then(() => model.generate(text, { voice, speed: 1 })).finally(() => { queued--; });
      tail = pending.catch(() => {});
      cache.set(key, pending);
      if (cache.size > 8) cache.delete(cache.keys().next().value);
      pending.catch(() => { if (cache.get(key) === pending) cache.delete(key); });
    }
    return pending;
  }
  return { ensure, generate, status: () => ({ ...state }) };
}
export function encodeBytes(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export function decodeAudio(encoded) {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const audio = new Float32Array((bytes.length - 44) / 2);
  for (let i = 0; i < audio.length; i++) audio[i] = view.getInt16(44 + i * 2, true) / 32768;
  return { audio, sampling_rate: view.getUint32(24, true) };
}

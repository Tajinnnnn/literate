/* global globalThis */
import { KokoroTTS, env } from 'kokoro-js';
import { sharedVoiceService, encodeBytes } from '../../shared/sharedVoice.mjs';
import { voiceAudioBlob } from '../../shared/voiceAudio.mjs';

const service = sharedVoiceService(async update => {
  const adapter = await navigator.gpu?.requestAdapter?.().catch(() => null);
  const progress_callback = info => { if (typeof info.progress === 'number') update({ progress: Math.round(info.progress) }); };
  const modelId = 'onnx-community/Kokoro-82M-v1.0-ONNX';
  if (adapter) {
    try {
      const model = await KokoroTTS.from_pretrained(modelId, { dtype: 'fp32', device: 'webgpu', progress_callback });
      update({ backend: 'webgpu' }); return model;
    } catch { /* Retain the natural voice on machines without working WebGPU. */ }
  }
  const model = await KokoroTTS.from_pretrained(modelId, { dtype: 'q8', device: 'wasm', progress_callback });
  update({ backend: 'wasm' }); return model;
});

globalThis.onmessage = async ({ data }) => {
  const { id, command, payload, assetBase } = data;
  env.wasmPaths = assetBase;
  try {
    let result;
    if (command === 'status') result = service.status();
    else if (command === 'ensure') result = await service.ensure();
    else if (command === 'generate') {
      if (typeof payload?.text !== 'string' || payload.text.length > 1000 || typeof payload.voice !== 'string') throw new Error('Invalid narration request');
      const raw = await service.generate(payload.text, payload.voice);
      result = { encoded: encodeBytes(await voiceAudioBlob(raw.audio, raw.sampling_rate).arrayBuffer()) };
    } else throw new Error('Unknown voice request');
    globalThis.postMessage({ id, ok: true, result });
  } catch (error) { globalThis.postMessage({ id, ok: false, error: error.message }); }
};

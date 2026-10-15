import { decodeAudio } from './sharedVoice.mjs';
export function requestVoice(command, payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'TTSXR_VOICE_REQUEST', command, payload }, response => {
      const error = chrome.runtime.lastError;
      if (error || !response?.ok) reject(new Error(error?.message || response?.error || 'Voice worker unavailable'));
      else resolve(response.result);
    });
  });
}
export async function connectVoice(onStatus) {
  const poll = setInterval(() => { requestVoice('status').then(onStatus).catch(() => {}); }, 300);
  try {
    const status = await requestVoice('ensure');
    onStatus(status);
    return { voices: status.voices, async generate(text, { voice }) {
      const result = await requestVoice('generate', { text, voice });
      return decodeAudio(result.encoded);
    } };
  } finally { clearInterval(poll); }
}

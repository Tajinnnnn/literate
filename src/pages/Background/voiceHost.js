import { voiceRequester, validVoiceRequest } from '../../shared/security.mjs';
let creating;
export async function ensureVoiceHost() {
  const url = chrome.runtime.getURL('voice-host.html');
  if (creating) return creating;
  creating = (async () => {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [url] });
    if (contexts.length) return;
    await chrome.offscreen.createDocument({ url: 'voice-host.html', reasons: ['WORKERS'], justification: 'Run a dedicated local speech inference worker shared across reading tabs.' });
  })();
  try { await creating; } finally { creating = null; }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'TTSXR_VOICE_REQUEST' || !voiceRequester(sender, chrome.runtime) || !validVoiceRequest(message)) return false;
  (async () => {
    try {
      await ensureVoiceHost();
      const result = await chrome.runtime.sendMessage({ type: 'TTSXR_VOICE_HOST', command: message.command, payload: message.payload });
      sendResponse(result || { ok: false, error: 'Voice worker did not respond.' });
    } catch (error) { sendResponse({ ok: false, error: error.message }); }
  })();
  return true;
});

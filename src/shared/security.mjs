// Chrome supplies MessageSender; never take identity fields from a payload.
export function ownSender(sender, runtime) {
  return !!runtime.id && sender?.id === runtime.id;
}
function extensionPage(sender, runtime) {
  if (!ownSender(sender, runtime)) return false;
  try {
    const url = new URL(sender.url);
    return url.protocol === 'chrome-extension:' && url.hostname === runtime.id;
  } catch { return false; }
}
export function trustedController(sender, runtime) {
  // Service-worker messages can omit url and never carry a source tab.
  return extensionPage(sender, runtime) || (ownSender(sender, runtime) && !sender.tab && !sender.url);
}
export function playerSender(sender, runtime) {
  if (!extensionPage(sender, runtime)) return false;
  return new URL(sender.url).pathname === '/popup.html';
}
export function voiceRequester(sender, runtime) {
  if (trustedController(sender, runtime)) return true;
  if (!ownSender(sender, runtime) || !sender.tab || sender.frameId !== 0) return false;
  try { return ['http:', 'https:', 'file:'].includes(new URL(sender.url).protocol); }
  catch { return false; }
}
export function voiceBroker(sender, runtime) {
  return ownSender(sender, runtime) && !sender.tab && trustedController(sender, runtime);
}
export function validVoiceRequest(message) {
  if (!message || typeof message !== 'object') return false;
  if (message.command === 'status' || message.command === 'ensure') return true;
  return message.command === 'generate' && typeof message.payload?.text === 'string'
    && message.payload.text.trim().length > 0 && message.payload.text.length <= 1000
    && typeof message.payload.voice === 'string' && /^[a-z]{2}_[a-z0-9_]{1,40}$/.test(message.payload.voice);
}

// PCM WAV lets the browser preserve pitch while changing playback speed live.
export function voiceAudioBlob(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  write(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((value, i) => { const n = Math.max(-1, Math.min(1, value)); view.setInt16(44 + i * 2, Math.round(n * (n < 0 ? 32768 : 32767)), true); });
  return new Blob([buffer], { type: 'audio/wav' });
}

export function firstChunkEnd(words, indexBase, limit = 110) {
  let chars = 0, end = indexBase;
  while (end < words.length) {
    const word = words[end];
    if (end > indexBase && chars + word.length + 1 > limit) break;
    chars += word.length + 1; end++;
    if (/[.!?]["')\]]?$/.test(word)) break;
  }
  return end;
}

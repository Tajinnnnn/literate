// Word indices remain identical to the source engine, including selections.
export function buildTranscriptLines(words, boundaries = []) {
  const starts = new Set(boundaries);
  const lines = [];
  let startWord = 0;
  for (let i = 0; i < words.length; i++) {
    const endWord = i + 1;
    if (/[.!?]["')\]]?$/.test(words[i]) || starts.has(endWord) || endWord - startWord >= 18 || endWord === words.length) {
      lines.push({ startWord, endWord, text: words.slice(startWord, endWord).join(' ') });
      startWord = endWord;
    }
  }
  return lines;
}

export function findActiveLine(lines, wordIndex) {
  if (wordIndex < 0) return -1;
  return lines.findIndex(line => wordIndex >= line.startWord && wordIndex < line.endWord);
}

// Reading state must also advance while the source tab has no animation frames.
export function audioWordIndex(chunk, audioTime, startedAt, paused, currentIndex) {
  if (!chunk || paused || !chunk.thresholds.length) return currentIndex;
  const elapsed = Math.max(0, audioTime - startedAt);
  for (let i = chunk.thresholds.length - 1; i >= 0; i--) {
    if (chunk.thresholds[i] <= elapsed) return chunk.indexBase + i;
  }
  return chunk.indexBase;
}

import { selectReadingRoot, isRelatedSection } from '../../../shared/readingRoot.mjs';
export const WORD_CLASS = '__ttsxr_word';

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'OPTION',
  'SVG',
  'CANVAS',
  'IFRAME',
]);

// Semantic landmarks for chrome that isn't the main reading content (site
// header, navigation, sidebars, footer). Only excluded for whole-page reads —
// an explicit text selection inside one of these should still be honored.
const LANDMARK_TAGS = new Set(['HEADER', 'NAV', 'FOOTER', 'ASIDE']);
const LANDMARK_ROLES = new Set(['navigation', 'banner', 'contentinfo', 'complementary', 'search', 'form']);

function isElementHidden(el) {
  const style = window.getComputedStyle(el);
  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    parseFloat(style.opacity) === 0
  );
}

// ---- Paragraph/section boundary detection (for rewind) --------------------
// A "boundary" is the word index where a new block-level ancestor begins.
// Computed-style detection (not a tag whitelist) so this works uniformly
// across arbitrary live web pages' div-heavy layouts, not just semantic
// <p>/<li>/<h2> markup.
const BLOCK_DISPLAYS = new Set(['block', 'list-item', 'table-row', 'table-cell', 'flex', 'grid']);

function getBlockAncestor(node, root) {
  let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (el && el !== root) {
    if (BLOCK_DISPLAYS.has(window.getComputedStyle(el).display)) return el;
    el = el.parentElement;
  }
  return root;
}

function isSkippableAncestor(node, excludeLandmarks, root) {
  let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.hasAttribute && el.hasAttribute('data-ttsxr-ignore')) return true;
    if (excludeLandmarks && el !== root && root.contains(el)) {
      if (LANDMARK_TAGS.has(el.tagName)) return true;
      if (isRelatedSection(el)) return true;
      const role = el.getAttribute && el.getAttribute('role');
      if (role && LANDMARK_ROLES.has(role.toLowerCase())) return true;
    }
    if (isElementHidden(el)) return true;
    el = el.parentElement;
  }
  return false;
}

export function getPageRoot() {
  return selectReadingRoot(document);
}

function collectTextNodes(root, filterNode, excludeLandmarks) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (isSkippableAncestor(node, excludeLandmarks, root)) return NodeFilter.FILTER_REJECT;
      if (filterNode && !filterNode(node)) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  let n = walker.nextNode();
  while (n) {
    nodes.push(n);
    n = walker.nextNode();
  }
  return nodes;
}

// Shared by wrapPageWords/wrapSelectionWords: wraps every node's words and
// records the word index of each new paragraph/block-level boundary along
// the way, sharing the getComputedStyle lookup pattern with isElementHidden.
function wrapNodesWithBoundaries(nodes, root) {
  const words = [];
  const spans = [];
  const boundaries = [];
  let lastBlock = null;
  nodes.forEach((node) => {
    const block = getBlockAncestor(node, root);
    if (block !== lastBlock) {
      boundaries.push(words.length);
      lastBlock = block;
    }
    wrapTextNode(node, words, spans);
  });
  return { words, spans, boundaries };
}

function wrapTextNode(textNode, words, spans) {
  const text = textNode.nodeValue;
  const regex = /\S+/g;
  let lastIndex = 0;
  let match = regex.exec(text);
  if (!match) return;

  const frag = document.createDocumentFragment();
  while (match) {
    if (match.index > lastIndex) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const span = document.createElement('span');
    span.className = WORD_CLASS;
    span.textContent = match[0];
    frag.appendChild(span);
    words.push(match[0]);
    spans.push(span);
    lastIndex = match.index + match[0].length;
    match = regex.exec(text);
  }
  if (lastIndex < text.length) {
    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
  textNode.parentNode.replaceChild(frag, textNode);
}

export function wrapPageWords() {
  const root = getPageRoot();
  const nodes = collectTextNodes(root, null, true);
  const { words, spans, boundaries } = wrapNodesWithBoundaries(nodes, root);
  return { words, spans, boundaries, root };
}

// Honor the chosen root (even a sidebar), while skipping nested page chrome.
export function wrapElementWords(root) {
  if (!root?.isConnected) return null;
  const nodes = collectTextNodes(root, null, true);
  return { ...wrapNodesWithBoundaries(nodes, root), root };
}

export function wrapSelectionWords() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0).cloneRange();

  if (range.endContainer.nodeType === Node.TEXT_NODE && range.endOffset < range.endContainer.length) {
    range.endContainer.splitText(range.endOffset);
  }
  if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
    const newStart = range.startContainer.splitText(range.startOffset);
    range.setStart(newStart, 0);
  }

  const container =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  if (!container) return null;

  const nodes = collectTextNodes(container, (node) => range.intersectsNode(node), false);
  sel.removeAllRanges();

  const { words, spans, boundaries } = wrapNodesWithBoundaries(nodes, container);
  return { words, spans, boundaries, root: container };
}

function countWords(text) {
  const matches = text.match(/\S+/g);
  return matches ? matches.length : 0;
}

// Word index (into what wrapPageWords() will produce) at the start of the
// current selection, if any. Computed against the live, unwrapped DOM —
// wrapping later replaces the underlying text nodes, so a node reference
// captured now wouldn't survive; a plain word count does.
export function getWordIndexBeforeSelection() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const root = getPageRoot();
  const nodes = collectTextNodes(root, null, true);

  let index = 0;
  for (const node of nodes) {
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(node);
    if (nodeRange.compareBoundaryPoints(Range.END_TO_START, range) < 0) {
      // This node ends before the selection starts — count all its words.
      index += countWords(node.nodeValue);
      continue;
    }
    // This is the node the selection starts in (or the first node at/after it).
    if (range.startContainer === node) {
      index += countWords(node.nodeValue.slice(0, range.startOffset));
    }
    break;
  }
  return index;
}

// Finds the boundary of the paragraph containing currentIndex (the last
// boundary <= currentIndex).
function currentBoundaryIndex(boundaries, currentIndex) {
  let i = -1;
  for (let b = 0; b < boundaries.length; b++) {
    if (boundaries[b] <= currentIndex) i = b;
    else break;
  }
  return i;
}

// Always steps to the previous paragraph's first word (not a restart of the
// current one) - clamps to the very first word once already in the first
// paragraph.
export function computeRewindIndex(boundaries, currentIndex) {
  if (!boundaries || !boundaries.length) return 0;
  const i = currentBoundaryIndex(boundaries, currentIndex);
  if (i <= 0) return 0;
  return boundaries[i - 1];
}

// Steps to the next paragraph's first word - no-op (returns null) once
// already in the last paragraph, so the caller can leave playback alone
// rather than jumping past the end of the content.
export function computeForwardIndex(boundaries, currentIndex) {
  if (!boundaries || !boundaries.length) return null;
  const i = currentBoundaryIndex(boundaries, currentIndex);
  const next = i + 1;
  return next < boundaries.length ? boundaries[next] : null;
}

export function unwrapWords(spans) {
  const parents = new Set();
  spans.forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    parents.add(parent);
    parent.replaceChild(document.createTextNode(span.textContent), span);
  });
  parents.forEach((p) => p.normalize());
}

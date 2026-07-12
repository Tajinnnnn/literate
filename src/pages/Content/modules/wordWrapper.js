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

function isSkippableAncestor(node, excludeLandmarks) {
  let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.hasAttribute && el.hasAttribute('data-ttsxr-ignore')) return true;
    if (excludeLandmarks) {
      if (LANDMARK_TAGS.has(el.tagName)) return true;
      const role = el.getAttribute && el.getAttribute('role');
      if (role && LANDMARK_ROLES.has(role.toLowerCase())) return true;
    }
    if (isElementHidden(el)) return true;
    el = el.parentElement;
  }
  return false;
}

export function getPageRoot() {
  return (
    document.querySelector('main, [role="main"]') ||
    document.querySelector('article') ||
    document.body
  );
}

function collectTextNodes(root, filterNode, excludeLandmarks) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (isSkippableAncestor(node, excludeLandmarks)) return NodeFilter.FILTER_REJECT;
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
  const words = [];
  const spans = [];
  nodes.forEach((node) => wrapTextNode(node, words, spans));
  return { words, spans, root };
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

  const words = [];
  const spans = [];
  nodes.forEach((node) => wrapTextNode(node, words, spans));
  return { words, spans, root: container };
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

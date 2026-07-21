import * as pdfjsLib from 'pdfjs-dist/webpack.mjs';
import { initReadingSurface } from '../../shared/readerBootstrap';
import './pdfViewer.styles.css';

const root = document.getElementById('app-root');

function showBanner() {
  const banner = document.createElement('div');
  banner.className = 'pdfxr-banner';
  banner.setAttribute('data-ttsxr-ignore', '');
  const text = document.createElement('span');
  text.textContent = 'Enable "Allow access to file URLs" for Literate to read local PDFs.';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Open extension settings';
  button.addEventListener('click', () => {
    chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
  });
  banner.appendChild(text);
  banner.appendChild(button);
  document.body.prepend(banner);
}

function checkFileAccess() {
  if (!chrome.extension || !chrome.extension.isAllowedFileSchemeAccess) return;
  chrome.extension.isAllowedFileSchemeAccess((allowed) => {
    if (!allowed) showBanner();
  });
}

function renderMessage(className, message) {
  root.innerHTML = '';
  const el = document.createElement('div');
  el.className = className;
  el.textContent = message;
  root.appendChild(el);
}

function fileNameFromUrl(url) {
  try {
    return decodeURIComponent(url.split('/').pop() || url);
  } catch {
    return url;
  }
}

// PDFs with subsetted/custom-encoded fonts routinely decode to characters
// that never render visibly but still sit in the extracted string -- format
// controls, zero-width/bidi marks, a stray BOM, or private-use-area
// codepoints standing in for a glyph with no proper Unicode mapping. Native
// speechSynthesis engines can choke on these mid-utterance and silently skip
// ahead over a stretch of text rather than erroring, which reads as "it just
// skipped a section" with no console error to show for it. Stripping them
// (and normalizing the modifier-letter apostrophe PDFs often emit in place
// of a plain apostrophe -- codepoint 0x2bc) at the extraction point keeps
// the fix scoped to PDF input rather than papering over it in the shared
// reading engine.
//
// Built from numeric code points rather than literal escapes/characters
// typed into source, so the ranges stay unambiguous no matter what an
// editor or tool along the way does with invisible characters.
function codePointRange(start, end) {
  const chars = [];
  for (let cp = start; cp <= end; cp++) chars.push(String.fromCharCode(cp));
  return chars.join('');
}

const UNSAFE_CHAR_SET =
  codePointRange(0x00, 0x08) +
  codePointRange(0x0b, 0x0c) +
  codePointRange(0x0e, 0x1f) +
  codePointRange(0x7f, 0x9f) +
  String.fromCharCode(0xad) +
  codePointRange(0x200b, 0x200f) +
  codePointRange(0x202a, 0x202e) +
  codePointRange(0x2060, 0x206f) +
  String.fromCharCode(0xfeff);
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = new RegExp('[' + UNSAFE_CHAR_SET + ']', 'g');
const MODIFIER_APOSTROPHE = new RegExp(String.fromCharCode(0x2bc), 'g');

function sanitizeExtractedText(str) {
  return str.normalize('NFKC').replace(MODIFIER_APOSTROPHE, "'").replace(UNSAFE_CHARS, '');
}

async function extractPageText(pdf, pageNumber) {
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const raw = textContent.items
    .map((item) => item.str)
    .filter(Boolean)
    .join(' ');
  return sanitizeExtractedText(raw);
}

async function loadPdf(fileUrl) {
  renderMessage('pdfxr-loading', 'Loading PDF...');

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error('could not read file (HTTP ' + response.status + ')');
  }
  const data = await response.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const header = document.createElement('header');
  header.className = 'pdfxr-header';
  header.setAttribute('data-ttsxr-ignore', '');
  header.textContent =
    fileNameFromUrl(fileUrl) + ' -- ' + pdf.numPages + ' page' + (pdf.numPages === 1 ? '' : 's');

  const main = document.createElement('main');
  main.className = 'pdfxr-content';

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const text = await extractPageText(pdf, pageNumber);
    const pageEl = document.createElement('section');
    pageEl.className = 'pdfxr-page';

    const label = document.createElement('span');
    label.className = 'pdfxr-page-number';
    label.setAttribute('data-ttsxr-ignore', '');
    label.textContent = 'Page ' + pageNumber;

    const p = document.createElement('p');
    p.textContent = text || '(no extractable text on this page)';

    pageEl.appendChild(label);
    pageEl.appendChild(p);
    main.appendChild(pageEl);
  }

  root.innerHTML = '';
  root.appendChild(header);
  root.appendChild(main);

  initReadingSurface();
}

function init() {
  checkFileAccess();

  const params = new URLSearchParams(window.location.search);
  const fileUrl = params.get('file');
  if (!fileUrl) {
    renderMessage('pdfxr-error', 'No PDF file specified.');
    return;
  }

  loadPdf(fileUrl).catch((err) => {
    renderMessage('pdfxr-error', 'Failed to load PDF: ' + err.message);
  });
}

init();

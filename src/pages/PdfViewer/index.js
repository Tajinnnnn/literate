import * as pdfjsLib from 'pdfjs-dist/webpack.mjs';
import { reflowPdfText } from '../../shared/pdfText.mjs';
import { initReadingSurface } from '../../shared/readerBootstrap';
import './pdfViewer.styles.css';
import '../Content/content.styles.css';

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

async function extractPageText(pdf, pageNumber) {
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent();
  return reflowPdfText(textContent.items);
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

    pageEl.appendChild(label);
    for (const paragraph of (text || '(no extractable text on this page)').split(/\n{2,}/)) {
      const p = document.createElement('p');
      p.textContent = paragraph;
      pageEl.appendChild(p);
    }
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

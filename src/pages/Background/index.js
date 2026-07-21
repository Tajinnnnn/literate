import { MSG } from '../../shared/messages';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ttsxr-read-selection',
    title: 'Read selection aloud',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'ttsxr-read-page',
    title: 'Read page aloud',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'ttsxr-read-from-here',
    title: 'Read from here',
    contexts: ['all'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  if (info.menuItemId === 'ttsxr-read-selection') {
    chrome.tabs.sendMessage(tab.id, { type: MSG.READ_SELECTION });
  } else if (info.menuItemId === 'ttsxr-read-page') {
    chrome.tabs.sendMessage(tab.id, { type: MSG.READ_PAGE });
  } else if (info.menuItemId === 'ttsxr-read-from-here') {
    chrome.tabs.sendMessage(tab.id, { type: MSG.READ_FROM_HERE });
  }
});

// Chrome's built-in PDF viewer is a sandboxed renderer that content scripts
// can't reach, so local PDFs get redirected to Literate's own viewer (which
// extracts real text via pdf.js) instead. This only fires once "Allow access
// to file URLs" is granted — Chrome doesn't deliver webNavigation events for
// file:// at all until then, so there's no separate state to track here.
chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    if (details.frameId !== 0) return;
    const viewerUrl =
      chrome.runtime.getURL('pdfviewer.html') + '?file=' + encodeURIComponent(details.url);
    chrome.tabs.update(details.tabId, { url: viewerUrl });
  },
  { url: [{ urlMatches: '(?i)^file://.*\\.pdf$' }] }
);

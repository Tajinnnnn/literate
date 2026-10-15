import './voiceHost';
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

// Discover existing player windows instead of relying on service-worker memory.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== MSG.OPEN_PLAYER) return false;
  const tabId = message.tabId;
  if (!Number.isSafeInteger(tabId) || tabId <= 0) {
    sendResponse({ ok: false });
    return false;
  }
  chrome.tabs.get(tabId, (sourceTab) => {
    if (chrome.runtime.lastError || !sourceTab) {
      sendResponse({ ok: false });
      return;
    }
    const base = chrome.runtime.getURL('popup.html');
    const url = `${base}?mini=1&tabId=${tabId}&surfaceId=${encodeURIComponent(message.surfaceId || '')}`;
    chrome.windows.getAll({ populate: true }, (windows) => {
      const existing = windows.find(w => w.type === 'popup' && w.tabs?.some(t => t.url?.startsWith(`${base}?mini=1&`)));
      if (existing) {
        const playerTab = existing.tabs.find(t => t.url?.startsWith(`${base}?mini=1&`));
        if (playerTab.url !== url) chrome.tabs.update(playerTab.id, { url });
        chrome.windows.update(existing.id, { focused: true, width: 340, height: 440 });
        sendResponse({ ok: true });
      } else {
        chrome.windows.create({ url, type: 'popup', width: 340, height: 440, focused: true }, () => {
          const error = chrome.runtime.lastError;
          sendResponse({ ok: !error });
        });
      }
    });
  });
  return true;
});

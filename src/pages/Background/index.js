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

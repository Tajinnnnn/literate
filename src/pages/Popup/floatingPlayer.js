// Move the existing React root so its controls/session remain intact in PiP.
export async function floatPlayer(onClose) {
  if (!window.documentPictureInPicture?.requestWindow) throw new Error('This Chrome version does not support an always-on-top player.');
  const pip = await window.documentPictureInPicture.requestWindow({ width: 340, height: 390, preferInitialWindowPlacement: true });
  const root = document.getElementById('app-container');
  const parent = root.parentNode;
  pip.document.title = 'Literate';
  pip.document.documentElement.className = 'detached-player';
  pip.document.documentElement.dataset.theme = document.documentElement.dataset.theme;
  pip.document.documentElement.style.cssText = document.documentElement.style.cssText;
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => pip.document.head.appendChild(node.cloneNode(true)));
  pip.document.body.appendChild(root);
  let hostId;
  chrome.windows.getCurrent(host => {
    hostId = host.id;
    chrome.windows.update(hostId, { state: 'minimized' }, () => { void chrome.runtime.lastError; });
  });
  pip.addEventListener('pagehide', () => {
    parent.appendChild(root);
    onClose();
    if (hostId) chrome.windows.update(hostId, { state: 'normal', focused: true }, () => { void chrome.runtime.lastError; });
  }, { once: true });
  return pip;
}

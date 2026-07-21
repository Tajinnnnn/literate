# Local File Support (file:// HTML and PDF)

## Problem

Literate only works on `http(s)://` pages today (`src/manifest.json`'s `content_scripts.matches`). Dragging a local HTML file or PDF into a Chrome tab opens it as a `file://` URL, where Literate currently does nothing — no content script runs, no hover toolbar, no reading. PDFs have a second, separate problem: even if a content script were allowed to run there, Chrome's built-in PDF viewer is a sandboxed renderer that content scripts can't reach or extract text from.

## Goals

- Reading, word-highlighting, hover toolbar, hotkeys, and context menu all work on local HTML files the same way they do on the web.
- PDFs opened from disk get real text extraction (not OCR, not skipped) so the same reading experience — including "read from here" and word highlighting — works on them too.
- Make it obvious when Literate can't do any of this yet because Chrome's file-access toggle is off, since that's a per-install manual step we cannot flip programmatically.

## Non-goals

- Other local file types (`.txt`, `.epub`, `.docx`, etc.) — out of scope for this change; can be a follow-up if wanted.
- Any change to the `speechSynthesis`-based reading engine itself, voice handling, or highlighting logic (`ttsEngine.js`, `wordWrapper.js`) — this change only gets more kinds of text *into* the existing engine.
- OCR or scanned-image PDF support — only PDFs with an extractable text layer are in scope.

## Approach

### 1. Local HTML pages

Chrome will only run content scripts on `file://` pages if (a) the manifest's `content_scripts.matches` includes a file pattern, and (b) the user has flipped "Allow access to file URLs" for the extension in `chrome://extensions` — a Chrome security gate that no manifest setting or extension code can set on the user's behalf.

Change: add `"file:///*"` to the existing `matches` array in `src/manifest.json` alongside `http://*/*` and `https://*/*`. No other content-script code changes — `Content/index.js`, `ttsEngine.js`, `hoverToolbar.js`, `wordWrapper.js`, hotkeys, and the context menu all work unchanged once the script is allowed to run there.

### 2. PDF viewer

Chrome's native PDF viewer can't be scripted, so PDFs opened from disk are redirected to a viewer Literate ships itself:

- **New extension page**: `src/pages/PdfViewer/` (own `index.html`/`index.jsx`/webpack entry, same pattern as `Popup`/`Options`). Uses `pdfjs-dist` (new dependency) to load the PDF and render its text layer into the DOM.
- **Reuse, don't rebuild, the reading engine**: the rendered text layer is a normal DOM the existing `TTSEngine`, `wordWrapper`, and `hoverToolbar` modules already know how to wrap and read — the PdfViewer page imports and initializes them the same way `Content/index.js` does. No new reading logic.
- **Redirect trigger**: background service worker adds a `chrome.webNavigation.onBeforeNavigate` listener (new `"webNavigation"` permission) matching `file:///*.pdf`. On match, `chrome.tabs.update(tabId, { url: chrome.runtime.getURL('pdfviewer.html') + '?file=' + encodeURIComponent(pdfUrl) })`.
- **Loading the bytes**: the PdfViewer page `fetch()`s the original `file://` URL directly — extension pages can read `file://` resources once file access is granted, the same gate as Section 1. No new permission needed for this beyond what file access already implies.

This redirect only fires once file access is already granted (Chrome doesn't deliver `webNavigation` events for `file://` at all until then), so there's no separate on/off state to manage for PDFs versus HTML.

### 3. Nudging the user to enable file access

Since the toggle can't be set programmatically, the popup should say so instead of silently doing nothing:

- Check `chrome.extension.isAllowedFileSchemeAccess()` (returns a promise/boolean).
- If false, show a small banner in `Popup.jsx`: *"Enable 'Allow access to file URLs' for Literate to read local files"* with a button that opens `chrome://extensions/?id=<chrome.runtime.id>` — gets the user to the right screen; they still flip the toggle themselves.

## Manifest changes summary

- `content_scripts[0].matches`: add `"file:///*"`.
- `permissions`: add `"webNavigation"`.
- New page entry for PdfViewer in `webpack.config.js` (mirroring the existing Popup/Options entries) plus its `index.html`.

## Testing

- Manual/UAT (this can't be meaningfully unit-tested — it depends on real Chrome file-access permission state and the native PDF/file:// pipeline):
  - With file access **off**: confirm the popup banner appears and its button opens the correct `chrome://extensions` page.
  - With file access **on**: drag a local `.html` file into a tab, confirm reading/highlighting/hover toolbar/hotkeys/context-menu all work as on a normal page.
  - With file access **on**: drag a local `.pdf` into a tab, confirm it redirects to the PdfViewer page, text extracts correctly, and reading/highlighting work.
  - Confirm a PDF opened from an `http(s)://` URL (not `file://`) is unaffected — only local PDFs redirect.

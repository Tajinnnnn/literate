// Must be imported first, before anything that might trigger a dynamic
// import() (e.g. NaturalVoiceEngine's lazy `import('kokoro-js')`).
//
// The content script executes inside the host page (e.g. https://x.com),
// not the extension. Webpack's default chunk-loading resolves lazy chunk
// URLs relative to the current document, which for a content script means
// the WEBSITE's origin ("https://x.com/744.bundle.js") rather than the
// extension's own ("chrome-extension://<id>/744.bundle.js") -- the chunk
// genuinely doesn't exist there, so the load fails. Pointing webpack's
// public path at the extension's own origin fixes it. Popup/options/the
// PDF viewer don't need this: they're already loaded as chrome-extension://
// pages, so the default resolution is correct there.
// eslint-disable-next-line no-undef, camelcase
__webpack_public_path__ = chrome.runtime.getURL('/');

// DOM-inserted webpack chunks execute in the website world, not the
// content script's isolated world. Keep the library in this bundle;
// import() still defers its evaluation until Natural Voice is needed.
// Model weights remain downloaded only on first use and then cached.
export function loadKokoro() {
  return import(/* webpackMode: "eager" */ 'kokoro-js').then((library) => {
    // A CDN module is blocked by extension CSP. Both runtime files ship
    // with the extension under their original names.
    library.env.wasmPaths = chrome.runtime.getURL('');
    return library;
  });
}

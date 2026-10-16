# Literate standalone extension

Literate runs independently of VoiceStudio. End users do not install Node, Python, a speech server, or an API key. The ZIP is a Chrome extension beta, not a native macOS/Windows application.

## Installation for testing

1. Extract the ZIP into a permanent folder.
2. Open Chrome's Extensions page, enable Developer mode, choose Load unpacked, and select that folder.
3. Open an article and click Literate. Allow the first model download/warm-up to complete.

Requires Chrome 116 or later. WebGPU gives the best performance; the same voice model has a WASM fallback. The GPU model download is approximately 326 MB; Chrome caches downloaded model files. The extension package includes the executable JavaScript and WASM runtime, but not the model weights. Reinstalling the extension or clearing its storage can require another download. Offline use depends on the required weights/tokenizer/voice assets remaining cached.

One shared worker keeps the voice resident across pages while Chrome is running. Closing Chrome, reloading/updating the extension, or a browser/worker crash can require warming it again. Page navigation does not create another model. Page audio/highlighting still belongs to that reading page.

## Distribution

The beta ZIP can be loaded unpacked for testing; it has not been published or approved by the Chrome Web Store. A public release needs its store listing, screenshots, privacy disclosures and third-party distribution/license review. The existing eSpeak NG component inside phonemizer.js must be covered in that dependency review; the package's top-level Apache license alone is not a complete analysis of embedded components.

Kokoro weights and the ONNX model are published under Apache 2.0, permitting commercial uses subject to that license: https://huggingface.co/hexgrad/Kokoro-82M and https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX . This beta includes installed dependency license texts, not a claim of public-release legal clearance.

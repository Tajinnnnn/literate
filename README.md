<img src="src/assets/img/logo.svg" width="64" alt="Literate logo" />

# Literate

A minimal Chrome extension that turns articles, selected text, and local PDFs into natural speech. Speech runs locally with Kokoro—no VoiceStudio, account, API key, or speech server required.

## Install the beta

1. Download the ZIP from [Releases](https://github.com/Tajinnnnn/literate/releases).
2. Extract it into a permanent folder.
3. Open Chrome's Extensions page, enable **Developer mode**, choose **Load unpacked**, and select the extracted folder.
4. Open an article and click Literate. The first use downloads and warms the voice model.

Chrome 116 or newer is required. A compatible GPU gives the best performance; a CPU/WASM fallback is included. The GPU model download is approximately 315 MB and is cached separately from the extension. The shared worker keeps one loaded model across pages until Chrome or the extension restarts.

## Reading

- **Play** reads the main article. Detection prefers the article body and skips navigation, sidebars, and common related-story blocks.
- **Choose section** outlines a page element. Point at the text, use **↑** to expand or **↓** to narrow, then click or press Enter. Escape cancels. The selection remains the reading scope on that page; **Read article** resets it.
- Highlight text and use the **Read selection aloud** context menu for a precise text selection.
- Open the **mini-player** for synchronized text. Click any word to resume from there.
- Use **Keep on top** in the mini-player to open Chrome's floating Picture-in-Picture window.
- Change speed during playback without regenerating the voice. Settings also offers voices, volume, shortcuts, and page highlighting.
- Choose light or dark mode and an accent color. Periwinkle is the default.

Automatic article detection is best effort; Choose section is available when a site's layout needs a more precise reading area. Local PDFs require enabling **Allow access to file URLs** for Literate in Chrome's extension settings.

## Build from source

Requires Node.js 22.12+ (Node 24 recommended) and npm.

```sh
npm ci
npm test
npm run build
```

Load the generated `build` folder as an unpacked extension. `npm run build` also produces a ZIP in `zip/`. To generate the curated standalone beta package with privacy instructions and dependency license texts:

```sh
python3 utils/package-release.py
```

The curated ZIP is written to `releases/`. End users do not need Node or Python; these are developer build tools only. Run `npm run icons` to export Chrome icon sizes from the editable [SVG logo](src/assets/img/logo.svg).

## Privacy and licensing

Article text and generated speech stay on the device. Model, tokenizer, and voice files are fetched from Hugging Face; those downloads expose ordinary network metadata to the host. Some reading preferences use Chrome sync storage; theme and accent use local storage. See [Privacy](PRIVACY.md) and [Distribution](DISTRIBUTION.md) for details, including cache behavior and public-release review requirements.

Kokoro and its ONNX weights are published under Apache 2.0. The beta includes dependency license notices; embedded components such as eSpeak NG still need review before a public product release. This project retains the [MIT license](LICENSE) and attribution of the original extension boilerplate.

This is an unpacked beta, not a Chrome Web Store publication.

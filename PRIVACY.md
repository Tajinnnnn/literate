# Literate privacy

Updated: October 15, 2026. Applies to Literate 1.0.5.

Literate extracts text from the page or selection you ask it to read. Natural speech generation runs locally in a worker owned by the extension. Instant mode uses installed local device voices through the browser's speech API; network-backed voices are excluded. Page text is not sent to a speech API or VoiceStudio.

Hugging Face hosts model, tokenizer and voice files downloaded by the runtime. Those file requests expose ordinary network metadata, such as an IP address, to the host. They do not contain the article text. Downloaded assets are cached by Chrome.

Voice, rate, volume, page-highlighting and shortcut preferences use Chrome extension storage; some existing reading preferences use Chrome sync storage and may follow your Chrome sync settings. Player theme/accent use local extension storage. Recent generated audio is cached in memory, bounded to a recent reading window.

Permissions support local settings, reading context menus, local-PDF navigation, and an offscreen document hosting the shared speech worker. File-URL access is optional and enabled by the user for local PDFs. There are no analytics, accounts, billing or cloud speech services in this build.

## Data access and retention

Literate accesses website content, selected text, and local PDF content to provide reading, highlighting, section selection, and page appearance. It uses the active document title and site address in the player and a local file address to open a PDF. This content is processed on your device; Literate does not transmit it to the developer or a speech service. Reading state and generated audio are temporary, and are released when the owning page or speech host closes. Preferences and downloaded voice assets remain in browser storage until cleared. Chrome controls the lifetime of the offscreen speech host and can reclaim it.

Literate does not collect browsing history or sell or share reading content. It does not use content for advertising, credit decisions, or model training. The developer cannot read your pages through Literate. If you voluntarily include a page excerpt in a support report, it is shared with GitHub and the people who can access that report; avoid including private material in public issues.

## Your choices

Use Instant mode to avoid model downloads. Natural mode downloads model data from Hugging Face over HTTPS; its hosting and delivery services receive the network metadata needed to deliver those files. Your browser's sync settings govern syncing of preferences stored with Chrome sync. File access is off unless you enable it in the extension's browser settings. You can stop playback at any time, disable site access using the browser's extension controls, or uninstall Literate. Uninstalling removes extension settings and extension-owned cached assets from that browser profile; synced preferences are governed by Chrome sync.

## Limited use and contact

Literate's use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including its Limited Use requirements. Data is used only to provide the reading features described above.

For privacy questions or deletion of information you voluntarily supplied in a support report, contact the maintainer through [Literate support](https://github.com/Tajinnnnn/literate/issues). Do not post sensitive information publicly. This policy will be updated when Literate's data practices change.

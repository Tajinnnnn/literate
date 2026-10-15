# Literate privacy

Literate extracts text from the page or selection you ask it to read. Speech generation runs locally in a worker owned by the extension. Page text is not sent to a speech API or VoiceStudio.

Hugging Face hosts model, tokenizer and voice files downloaded by the runtime. Those file requests expose ordinary network metadata, such as an IP address, to the host. They do not contain the article text. Downloaded assets are cached by Chrome.

Voice, rate, volume, page-highlighting and shortcut preferences use Chrome extension storage; some existing reading preferences use Chrome sync storage and may follow your Chrome sync settings. Player theme/accent use local extension storage. Recent generated audio is cached in memory, bounded to a recent reading window.

Permissions support local settings, reading context menus, local-PDF navigation, and an offscreen document hosting the shared speech worker. File-URL access is optional and enabled by the user for local PDFs. There are no analytics, accounts, billing or cloud speech services in this build.

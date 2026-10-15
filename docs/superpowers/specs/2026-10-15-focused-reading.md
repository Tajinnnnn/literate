# Focused reading

User requested article-body reading without related stories, plus reading one specific page element.

Automatic reading now prefers schema articleBody, then prose-heavy article, then main/body. Existing hidden-content, navigation and sidebar exclusions remain; common related-article/post/story widgets are excluded even when nested in an article. Heuristics are best effort across sites.

Choose section opens a temporary shadow-DOM overlay. Pointer movement previews an element; Up expands to a parent, Down returns to a narrower element, click/Enter reads the chosen section, Escape/Cancel exits. Link clicks are intercepted while picking. Existing playback pauses during picking and resumes on cancellation if it had been playing. The chosen connected DOM root remains the scope for subsequent Play on that document. Read article resets that scope and starts automatic article reading. Navigating/replacing that element falls back to automatic reading. Explicitly selecting a sidebar is honored, while nested navigation and related widgets stay excluded.

Verification: 32 regression tests pass; targeted lint and production build pass with existing warnings. A real browser preview of the actual extraction/picker modules read exactly 33 article words, excluding navigation, a related block nested inside the body, external sidebar and footer. A chosen paragraph yielded exactly seven words; choosing the article-body element still excluded the nested related block. Escape removed the picker. Native Chrome automation returned noWindowsAvailable, so installed-extension reload and popup-to-source handoff remain a manual verification step. The updated standalone beta ZIP passed integrity/runtime-file checks.

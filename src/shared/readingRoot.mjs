function score(element) {
  const text = (element.textContent || '').trim();
  const links = [...element.querySelectorAll('a')].reduce((sum, link) => sum + (link.textContent || '').length, 0);
  return Math.max(0, text.length - links * 2);
}
export function selectReadingRoot(doc) {
  for (const selector of ['[itemprop="articleBody"]', 'article', 'main, [role="main"]']) {
    const candidates = [...doc.querySelectorAll(selector)].filter(el => score(el) > 0);
    if (candidates.length) return candidates.sort((a, b) => score(b) - score(a))[0];
  }
  return doc.body;
}
export function isRelatedSection(element) {
  const names = `${element.id || ''} ${typeof element.className === 'string' ? element.className : ''}`;
  return /(?:^|\s)(?:related[-_](?:articles|posts|stories)|recommended[-_](?:articles|posts|stories)|article[-_]recommendations)(?:[-_\s]|$)/i.test(names);
}

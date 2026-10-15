// A visual, temporary selector. It never follows links or changes the site's styles.
export function pickReadingSection(onPick, onCancel) {
  let current = null;
  const children = [];
  const host = document.createElement('div');
  host.setAttribute('data-ttsxr-ignore', '');
  host.setAttribute('data-ttsxr-theme-ignore', '');
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    .outline{position:fixed;box-sizing:border-box;border:2px solid #9aa0ff;border-radius:5px;background:#9aa0ff18;box-shadow:0 0 0 9999px #00000025;pointer-events:none}
    .hint{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:calc(100vw - 32px);box-sizing:border-box;padding:12px 16px;border:1px solid #444;border-radius:10px;background:#222;color:#fff;font:13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 4px 24px #0003;pointer-events:auto}
    button{margin-left:12px;background:transparent;color:#ddd;border:1px solid #666;border-radius:5px;padding:3px 8px;cursor:pointer}
    .label{color:#bbb;font-size:11px;margin-top:3px}
  </style><div class="outline" hidden></div><div class="hint" role="status">Point to a section · ↑ expand · ↓ narrow · click to read<button type="button">Cancel</button><div class="label">Esc to cancel</div></div>`;
  const outline = shadow.querySelector('.outline');
  const label = shadow.querySelector('.label');
  document.documentElement.appendChild(host);
  const ignored = target => !target || host.contains(target) || target.closest?.('[data-ttsxr-ignore]');
  function draw() {
    outline.hidden = !current?.isConnected;
    if (outline.hidden) return;
    const rect = current.getBoundingClientRect();
    Object.assign(outline.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    const count = (current.textContent || '').trim().split(/\s+/).filter(Boolean).length;
    label.textContent = `${current.tagName.toLowerCase()} · about ${count} words · Enter to read · Esc to cancel`;
  }
  function move(event) {
    if (ignored(event.target)) return;
    const target = event.target.closest?.('p,li,blockquote,pre,td,h1,h2,h3,section,article,main,div') || document.body;
    if (!target?.textContent?.trim() || target === current) return;
    current = target; children.length = 0; draw();
  }
  function cleanup() {
    window.removeEventListener('mousemove', move, true);
    window.removeEventListener('click', click, true);
    window.removeEventListener('keydown', key, true);
    window.removeEventListener('scroll', draw, true);
    window.removeEventListener('resize', draw);
    window.removeEventListener('pagehide', cleanup);
    host.remove();
  }
  function cancel() { cleanup(); onCancel?.(); }
  function choose() {
    if (!current?.isConnected) return;
    const target = current; cleanup(); onPick(target);
  }
  function click(event) {
    if (ignored(event.target)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    // A click before the first mousemove should still select the pointed section.
    if (!current) move(event);
    choose();
  }
  function key(event) {
    if (!['Escape', 'Enter', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.key === 'Escape') cancel();
    else if (event.key === 'Enter') choose();
    else if (event.key === 'ArrowUp' && current?.parentElement && current !== document.body) {
      children.push(current); current = current.parentElement; draw();
    } else if (event.key === 'ArrowDown' && children.length) { current = children.pop(); draw(); }
  }
  shadow.querySelector('button').addEventListener('click', cancel);
  window.addEventListener('mousemove', move, true);
  window.addEventListener('click', click, true);
  window.addEventListener('keydown', key, true);
  window.addEventListener('scroll', draw, true);
  window.addEventListener('resize', draw);
  window.addEventListener('pagehide', cleanup);
  return cancel;
}

const EDGE_MARGIN = 20;

export class HoverToolbar {
  constructor(engine) {
    this.engine = engine;
    this.position = null; // { left, top } in px, once known
    this.dragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.host = document.createElement('div');
    this.host.setAttribute('data-ttsxr-ignore', '');
    this.host.setAttribute('data-ttsxr-theme-ignore', '');
    this.host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;display:none;';
    (document.body || document.documentElement).appendChild(this.host);

    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>
        .bar {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          color: #fff;
          padding: 5px 6px;
          border-radius: 8px;
          font: 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
          white-space: nowrap;
          cursor: grab;
        }
        .bar.dragging {
          cursor: grabbing;
        }
        button {
          all: unset;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 6px;
        }
        button:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .grip {
          color: rgba(255, 255, 255, 0.35);
          font-size: 14px;
          padding: 0 2px;
          user-select: none;
        }
        .rate-group {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .rate {
          all: unset;
          width: 28px;
          text-align: center;
          font-variant-numeric: tabular-nums;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          padding: 2px 0;
          cursor: text;
        }
        .rate:focus {
          background: rgba(255, 255, 255, 0.2);
        }
      </style>
      <div class="bar" title="Drag the empty space to move">
        <span class="grip" title="Drag to move">⠿</span>
        <button class="lock" title="Lock scroll to reading position">🔓</button>
        <button class="rewind" title="Back to previous paragraph">⏮</button>
        <button class="playpause" title="Play / pause">⏸</button>
        <button class="forward" title="Forward to next paragraph">⏭</button>
        <div class="rate-group">
          <button class="slower" title="Slower">−</button>
          <input class="rate" type="text" inputmode="decimal" value="1.0" title="Speed" />
          <button class="faster" title="Faster">+</button>
        </div>
      </div>
    `;

    this.bar = this.shadow.querySelector('.bar');
    this.playBtn = this.shadow.querySelector('.playpause');
    this.lockBtn = this.shadow.querySelector('.lock');
    this.rewindBtn = this.shadow.querySelector('.rewind');
    this.forwardBtn = this.shadow.querySelector('.forward');
    this.rateInput = this.shadow.querySelector('.rate');

    this.lockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.engine.toggleFollowLock();
    });
    this.rewindBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.engine.rewind();
    });
    this.playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.engine.togglePause();
    });
    this.forwardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.engine.fastForward();
    });
    this.shadow.querySelector('.slower').addEventListener('click', (e) => {
      e.stopPropagation();
      this.engine.adjustRate(-0.1);
    });
    this.shadow.querySelector('.faster').addEventListener('click', (e) => {
      e.stopPropagation();
      this.engine.adjustRate(0.1);
    });

    this.rateInput.addEventListener('click', (e) => e.stopPropagation());
    this.rateInput.addEventListener('input', () => {
      const cleaned = this.rateInput.value.replace(/[^0-9.]/g, '');
      if (cleaned !== this.rateInput.value) this.rateInput.value = cleaned;
    });
    this.rateInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.rateInput.blur();
    });
    this.rateInput.addEventListener('blur', () => this._commitRate());

    this._onDragStart = this._onDragStart.bind(this);
    this._onDragMove = this._onDragMove.bind(this);
    this._onDragEnd = this._onDragEnd.bind(this);
    this._clampToViewport = this._clampToViewport.bind(this);

    // Only clicks on empty chrome (the bar's own background, or the empty
    // space around the speed controls) start a drag — clicks on a
    // button/input still work.
    this.bar.addEventListener('mousedown', this._onDragStart);
    window.addEventListener('resize', this._clampToViewport);

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['ttsToolbarPos'], (res) => {
        if (
          res.ttsToolbarPos &&
          typeof res.ttsToolbarPos.left === 'number' &&
          typeof res.ttsToolbarPos.top === 'number'
        ) {
          this.position = res.ttsToolbarPos;
          this._applyPosition();
        }
      });
    }
  }

  _isDragHandle(target) {
    return (
      target === this.bar || target.classList.contains('rate-group') || target.classList.contains('grip')
    );
  }

  _onDragStart(e) {
    if (!this._isDragHandle(e.target)) return;
    e.preventDefault();
    this.dragging = true;
    this.bar.classList.add('dragging');
    const rect = this.host.getBoundingClientRect();
    this.dragOffsetX = e.clientX - rect.left;
    this.dragOffsetY = e.clientY - rect.top;
    document.addEventListener('mousemove', this._onDragMove);
    document.addEventListener('mouseup', this._onDragEnd);
  }

  _onDragMove(e) {
    if (!this.dragging) return;
    const width = this.host.offsetWidth;
    const height = this.host.offsetHeight;
    let left = e.clientX - this.dragOffsetX;
    let top = e.clientY - this.dragOffsetY;
    left = Math.min(Math.max(4, left), window.innerWidth - width - 4);
    top = Math.min(Math.max(4, top), window.innerHeight - height - 4);
    this.position = { left, top };
    this.host.style.left = `${left}px`;
    this.host.style.top = `${top}px`;
  }

  _onDragEnd() {
    if (!this.dragging) return;
    this.dragging = false;
    this.bar.classList.remove('dragging');
    document.removeEventListener('mousemove', this._onDragMove);
    document.removeEventListener('mouseup', this._onDragEnd);
    if (this.position && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ ttsToolbarPos: this.position });
    }
  }

  _clampToViewport() {
    if (!this.position || this.host.style.display === 'none') return;
    const width = this.host.offsetWidth;
    const height = this.host.offsetHeight;
    const left = Math.min(Math.max(4, this.position.left), window.innerWidth - width - 4);
    const top = Math.min(Math.max(4, this.position.top), window.innerHeight - height - 4);
    this.position = { left, top };
    this.host.style.left = `${left}px`;
    this.host.style.top = `${top}px`;
  }

  _applyPosition() {
    if (this.position) {
      this._clampToViewport();
      return;
    }
    const width = this.host.offsetWidth || 150;
    const height = this.host.offsetHeight || 36;
    this.host.style.left = `${window.innerWidth - width - EDGE_MARGIN}px`;
    this.host.style.top = `${window.innerHeight - height - EDGE_MARGIN}px`;
  }

  _commitRate() {
    const parsed = parseFloat(this.rateInput.value);
    if (!Number.isNaN(parsed)) {
      this.engine.setRate(parsed);
    } else {
      this.refresh();
    }
  }

  show() {
    this.refresh();
    this.host.style.display = 'block';
    this._applyPosition();
  }

  hide() {
    this.host.style.display = 'none';
  }

  refresh() {
    this.playBtn.textContent = this.engine.isPaused() ? '▶' : '⏸';
    this.lockBtn.textContent = this.engine.followLock ? '🔒' : '🔓';
    this.lockBtn.title = this.engine.followLock
      ? 'Scroll lock: on (page follows the reader)'
      : 'Scroll lock: off (free scroll)';
    if (this.shadow.activeElement !== this.rateInput) {
      this.rateInput.value = this.engine.rate.toFixed(1);
    }
  }
}

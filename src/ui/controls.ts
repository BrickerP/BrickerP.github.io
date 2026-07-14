import type { AppState } from '../app/BeijingLoopApp';
import type { ViewMode } from '../rendering/theme';

export interface UICallbacks {
  onTogglePlay(): void;
  onSetMode(mode: ViewMode): void;
  onToggleFullscreen(): void;
  onToggleDebug(): void;
  onRecord(): void;
}

/**
 * Builds the restrained overlay UI: top-right icon controls (play/pause, the
 * three view modes, fullscreen), a bottom-left status readout, a small
 * "artistic visualization" + attribution footer, and a debug panel toggled
 * with D. Every button has an aria-label + title and a >=44px touch target.
 */
export class Controls {
  private readonly root: HTMLElement;
  private playBtn!: HTMLButtonElement;
  private modeBtns = new Map<ViewMode, HTMLButtonElement>();
  private statusMode!: HTMLElement;
  private statusProgress!: HTMLElement;
  private progressBar!: HTMLElement;
  private debugPanel!: HTMLElement;
  private recordBtn!: HTMLButtonElement;

  constructor(mount: HTMLElement, private readonly cb: UICallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'ui-root';
    this.root.innerHTML = this.template();
    mount.appendChild(this.root);
    this.wire();
  }

  private template(): string {
    return `
      <div class="ui-topright" role="toolbar" aria-label="View controls">
        <button class="ui-btn" data-act="play" aria-label="Play or pause" title="Play / Pause (Space)">
          ${ICON.pause}
        </button>
        <div class="ui-seg" role="group" aria-label="Camera view mode">
          <button class="ui-btn seg" data-mode="follow" aria-label="Follow view" title="Follow (1)">${ICON.follow}</button>
          <button class="ui-btn seg" data-mode="overview" aria-label="Overview" title="Overview (2)">${ICON.overview}</button>
          <button class="ui-btn seg" data-mode="fractal" aria-label="Fractal zoom view" title="Fractal (3)">${ICON.fractal}</button>
        </div>
        <button class="ui-btn" data-act="record" aria-label="Record a 12-second loop clip" title="Record 12s loop (WebM)">${ICON.record}</button>
        <button class="ui-btn" data-act="fs" aria-label="Toggle fullscreen" title="Fullscreen (F)">${ICON.fullscreen}</button>
      </div>

      <div class="ui-status" aria-hidden="false">
        <div class="ui-title">BEIJING INFINITE LOOP</div>
        <div class="ui-sub"><span class="ui-mode">FRACTAL</span> · 2nd&nbsp;ring&nbsp;<span class="ui-prog">0%</span></div>
        <div class="ui-progress"><span class="ui-progressbar"></span></div>
      </div>

      <div class="ui-footer">Artistic visualization, not for navigation. · Composition © this project · No third-party map tiles.</div>

      <div class="ui-debug" hidden>
        <div>DEBUG (press D)</div>
        <div class="dbg-line" data-dbg="fps">fps: –</div>
        <div class="dbg-line" data-dbg="progress">progress: –</div>
        <div class="dbg-line" data-dbg="angle">angle: –</div>
        <div class="dbg-line" data-dbg="phase">phase: –</div>
        <div class="dbg-line" data-dbg="mode">mode: –</div>
      </div>

      <div class="ui-rec" hidden>● REC <span class="rec-time">0.0s</span></div>
    `;
  }

  private wire(): void {
    this.playBtn = this.q('[data-act="play"]');
    this.recordBtn = this.q('[data-act="record"]');
    this.statusMode = this.q('.ui-mode');
    this.statusProgress = this.q('.ui-prog');
    this.progressBar = this.q('.ui-progressbar');
    this.debugPanel = this.q('.ui-debug');

    this.playBtn.addEventListener('click', () => this.cb.onTogglePlay());
    this.recordBtn.addEventListener('click', () => this.cb.onRecord());
    this.q('[data-act="fs"]').addEventListener('click', () => this.cb.onToggleFullscreen());

    for (const mode of ['follow', 'overview', 'fractal'] as ViewMode[]) {
      const btn = this.q(`[data-mode="${mode}"]`) as HTMLButtonElement;
      this.modeBtns.set(mode, btn);
      btn.addEventListener('click', () => this.cb.onSetMode(mode));
    }
  }

  private q<T extends HTMLElement = HTMLElement>(sel: string): T {
    const el = this.root.querySelector(sel);
    if (!el) throw new Error(`missing UI element ${sel}`);
    return el as T;
  }

  /** Reflect app state into the DOM (called on every state change). */
  sync(s: AppState): void {
    this.playBtn.innerHTML = s.playing ? ICON.pause : ICON.play;
    this.playBtn.setAttribute('aria-pressed', String(s.playing));
    for (const [mode, btn] of this.modeBtns) {
      btn.classList.toggle('active', s.mode === mode);
      btn.setAttribute('aria-pressed', String(s.mode === mode));
    }
    this.statusMode.textContent = s.mode.toUpperCase();
    const pct = Math.round(s.progress * 100);
    this.statusProgress.textContent = `${pct}%`;
    this.progressBar.style.width = `${pct}%`;
    this.debugPanel.hidden = !s.debug;
  }

  /** Per-frame debug values (only meaningful while debug panel is visible). */
  syncDebug(s: AppState): void {
    if (this.debugPanel.hidden) return;
    this.setDbg('fps', `fps: ${s.fps.toFixed(0)}`);
    this.setDbg('progress', `progress: ${s.progress.toFixed(4)}`);
    this.setDbg('angle', `angle: ${((s.angle * 180) / Math.PI).toFixed(1)}°`);
    this.setDbg('phase', `phase: ${s.phase.toFixed(4)}`);
    this.setDbg('mode', `mode: ${s.mode}`);
  }

  private setDbg(key: string, text: string): void {
    const el = this.root.querySelector(`[data-dbg="${key}"]`);
    if (el) el.textContent = text;
  }

  setRecording(active: boolean, seconds = 0): void {
    const rec = this.q('.ui-rec');
    rec.hidden = !active;
    if (active) this.q('.rec-time').textContent = `${seconds.toFixed(1)}s`;
    this.recordBtn.classList.toggle('active', active);
  }
}

// Minimal, crisp line icons (currentColor) — no external assets.
const ICON = {
  play: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
  follow:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3l7 16-7-4-7 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  overview:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  fractal:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="7.5" y="7.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="10.5" y="10.5" width="3" height="3" fill="currentColor"/></svg>',
  fullscreen:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  record:
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>',
};

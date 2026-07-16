import type { AppState } from '../app/BeijingLoopApp';
import type { ViewMode } from '../rendering/theme';

export interface UICallbacks {
  onTogglePlay(): void;
  onSetMode(mode: ViewMode): void;
  onToggleFullscreen(): void;
  onToggleDebug(): void;
  onRecord(): void;
}

/** Builds the small semantic control layer around the full-screen artwork. */
export class Controls {
  private readonly root: HTMLElement;
  private playBtn!: HTMLButtonElement;
  private recordBtn!: HTMLButtonElement;
  private modeLabel!: HTMLElement;
  private debugPanel!: HTMLElement;
  private modeBtns = new Map<ViewMode, HTMLButtonElement>();

  constructor(mount: HTMLElement, private readonly callbacks: UICallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'ui-root';
    this.root.innerHTML = this.template();
    mount.appendChild(this.root);
    this.wire();
  }

  private template(): string {
    return `
      <header class="ui-brand">
        <div class="ui-eyebrow">BEIJING <span>/ 北京</span></div>
        <div class="ui-title">SECOND RING</div>
        <div class="ui-sub"><span class="ui-mode">INFINITE</span> · INFINITE STUDY</div>
      </header>

      <div class="ui-actions" role="toolbar" aria-label="Playback and export controls">
        <button class="ui-btn ui-icon-btn" data-act="play" aria-label="Pause animation" aria-pressed="true" title="Pause animation (Space)">
          ${ICON.pause}
        </button>
        <button class="ui-btn ui-icon-btn" data-act="record" aria-label="Record one 12-second loop" aria-pressed="false" title="Record loop (R)">
          ${ICON.record}
        </button>
        <button class="ui-btn ui-icon-btn" data-act="fs" aria-label="Toggle fullscreen" title="Fullscreen (F)">
          ${ICON.fullscreen}
        </button>
      </div>

      <nav class="ui-dock" aria-label="View mode">
        <button class="ui-btn ui-mode-btn" data-mode="fractal" aria-label="Infinite view" aria-pressed="true">
          ${ICON.infinite}<span>INFINITE</span>
        </button>
        <button class="ui-btn ui-mode-btn" data-mode="overview" aria-label="Plan view" aria-pressed="false">
          ${ICON.plan}<span>PLAN</span>
        </button>
      </nav>

      <div class="ui-footer" aria-label="Artistic study. Not for navigation. No third-party map tiles.">
        ARTISTIC STUDY · NOT FOR NAVIGATION
      </div>

      <div class="ui-debug" hidden>
        <div>DEBUG · PRESS D</div>
        <div data-dbg="fps">fps: –</div>
        <div data-dbg="progress">progress: –</div>
        <div data-dbg="angle">angle: –</div>
        <div data-dbg="phase">phase: –</div>
        <div data-dbg="mode">mode: –</div>
      </div>

      <div class="ui-rec" role="status" aria-live="polite" hidden>
        <span aria-hidden="true">●</span> REC <span class="rec-time">0.0s</span>
      </div>
    `;
  }

  private wire(): void {
    this.playBtn = this.query('[data-act="play"]');
    this.recordBtn = this.query('[data-act="record"]');
    this.modeLabel = this.query('.ui-mode');
    this.debugPanel = this.query('.ui-debug');

    this.playBtn.addEventListener('click', () => this.callbacks.onTogglePlay());
    this.recordBtn.addEventListener('click', () => this.callbacks.onRecord());
    this.query('[data-act="fs"]').addEventListener('click', () =>
      this.callbacks.onToggleFullscreen(),
    );

    for (const mode of ['fractal', 'overview'] as const) {
      const button = this.query<HTMLButtonElement>(`[data-mode="${mode}"]`);
      this.modeBtns.set(mode, button);
      button.addEventListener('click', () => this.callbacks.onSetMode(mode));
    }
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector(selector);
    if (!element) throw new Error(`missing UI element ${selector}`);
    return element as T;
  }

  sync(state: AppState): void {
    this.playBtn.innerHTML = state.playing ? ICON.pause : ICON.play;
    this.playBtn.setAttribute('aria-pressed', String(state.playing));
    this.playBtn.setAttribute('aria-label', state.playing ? 'Pause animation' : 'Play animation');
    this.playBtn.title = `${state.playing ? 'Pause' : 'Play'} animation (Space)`;

    const publicMode = state.mode;
    for (const [mode, button] of this.modeBtns) {
      const active = mode === publicMode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    this.modeLabel.textContent = publicMode === 'fractal' ? 'INFINITE' : 'PLAN';
    this.debugPanel.hidden = !state.debug;
  }

  syncDebug(state: AppState): void {
    if (this.debugPanel.hidden) return;
    this.setDebug('fps', `fps: ${state.fps.toFixed(0)}`);
    this.setDebug('progress', `progress: ${state.progress.toFixed(4)}`);
    this.setDebug('angle', `angle: ${((state.angle * 180) / Math.PI).toFixed(1)}°`);
    this.setDebug('phase', `phase: ${state.phase.toFixed(4)}`);
    this.setDebug('mode', `mode: ${state.mode}`);
  }

  private setDebug(key: string, text: string): void {
    this.query(`[data-dbg="${key}"]`).textContent = text;
  }

  setRecording(active: boolean, seconds = 0): void {
    const recording = this.query('.ui-rec');
    recording.hidden = !active;
    this.recordBtn.classList.toggle('recording', active);
    this.recordBtn.setAttribute('aria-pressed', String(active));
    if (active) this.query('.rec-time').textContent = `${seconds.toFixed(1)}s`;
  }
}

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
  record:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.5" fill="currentColor"/></svg>',
  fullscreen:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  infinite:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 8.3c-2.4 0-4.1 1.6-4.1 3.7s1.7 3.7 4.1 3.7c3.7 0 5.6-7.4 9.2-7.4 2.4 0 4.1 1.6 4.1 3.7s-1.7 3.7-4.1 3.7c-3.7 0-5.5-7.4-9.2-7.4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  plan:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="8.3" y="7.3" width="7.4" height="9.4" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
} as const;

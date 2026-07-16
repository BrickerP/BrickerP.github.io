/** The small state surface needed by the cinematic HUD. */
export interface ControlState {
  playing: boolean;
  debug?: boolean;
  fps?: number;
  progress?: number;
  phase?: number;
}

export interface UICallbacks {
  onTogglePlay(): void;
  onToggleFullscreen(): void;
  onRecord(): void;
  onAbout(): void;
}

export interface ControlCapabilities {
  recording: boolean;
  fullscreen: boolean;
}

/** Builds the restrained control layer over the full-screen first-person drive. */
export class Controls {
  private readonly root: HTMLElement;
  private playBtn!: HTMLButtonElement;
  private recordBtn!: HTMLButtonElement;
  private fullscreenBtn!: HTMLButtonElement;
  private aboutBtn!: HTMLButtonElement;
  private debugPanel!: HTMLElement;
  private debugFps!: HTMLElement;
  private debugProgress!: HTMLElement;
  private debugPhase!: HTMLElement;
  private recordingStatus!: HTMLElement;
  private recordingTime!: HTMLElement;
  private recordDescription!: HTMLElement;
  private fullscreenDescription!: HTMLElement;
  private liveRegion!: HTMLElement;
  private capabilities: ControlCapabilities = { recording: true, fullscreen: true };
  private recording = false;
  private aboutOpen = false;

  constructor(mount: HTMLElement, private readonly callbacks: UICallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'ui-root';
    this.root.innerHTML = this.template();
    mount.appendChild(this.root);
    this.wire();
  }

  private template(): string {
    return `
      <header class="ui-brand" aria-labelledby="experience-title">
        <p class="ui-eyebrow">BEIJING <span>/ 北京</span></p>
        <h1 class="ui-title" id="experience-title">ENDLESS SECOND RING</h1>
        <p class="ui-sub">ARTISTIC NIGHT DRIVE</p>
      </header>

      <div class="ui-actions" role="toolbar" aria-label="Playback, capture, and personal intro controls">
        <button
          class="ui-btn ui-icon-btn"
          data-act="play"
          type="button"
          aria-label="Pause the drive"
          aria-pressed="true"
          aria-keyshortcuts="Space"
          title="Pause the drive (Space)"
        >${ICON.pause}</button>
        <button
          class="ui-btn ui-icon-btn"
          data-act="record"
          type="button"
          aria-label="Record one complete loop"
          aria-pressed="false"
          aria-keyshortcuts="R"
          aria-describedby="record-capability"
          title="Record one complete loop (R)"
        >${ICON.record}</button>
        <button
          class="ui-btn ui-icon-btn"
          data-act="fs"
          type="button"
          aria-label="Enter fullscreen"
          aria-pressed="false"
          aria-keyshortcuts="F"
          aria-describedby="fullscreen-capability"
          title="Enter fullscreen (F)"
        >${ICON.fullscreen}</button>
        <button
          class="ui-btn ui-icon-btn"
          data-act="about"
          type="button"
          aria-label="Open personal intro"
          aria-pressed="false"
          aria-haspopup="dialog"
          title="Open personal intro"
        >${ICON.about}</button>
      </div>

      <p class="ui-footer">ARTISTIC COMPOSITION <span aria-hidden="true">·</span> NOT FOR NAVIGATION</p>

      <div class="ui-debug" hidden>
        <div>DRIVE TELEMETRY · D</div>
        <div data-dbg="fps">fps: –</div>
        <div data-dbg="progress">progress: –</div>
        <div data-dbg="phase">cycle: –</div>
      </div>

      <div class="ui-rec" role="status" aria-live="polite" aria-atomic="true" hidden>
        <span class="rec-dot" aria-hidden="true"></span>
        <span>REC</span>
        <span class="rec-time" aria-hidden="true">0.0s</span>
      </div>

      <p class="sr-only" id="record-capability">Records and downloads one 16-second WebM loop.</p>
      <p class="sr-only" id="fullscreen-capability">Expands the drive to fill the screen.</p>
      <p class="sr-only" data-ui-live role="status" aria-live="polite" aria-atomic="true"></p>
    `;
  }

  private wire(): void {
    this.playBtn = this.query('[data-act="play"]');
    this.recordBtn = this.query('[data-act="record"]');
    this.fullscreenBtn = this.query('[data-act="fs"]');
    this.aboutBtn = this.query('[data-act="about"]');
    this.debugPanel = this.query('.ui-debug');
    this.debugFps = this.query('[data-dbg="fps"]');
    this.debugProgress = this.query('[data-dbg="progress"]');
    this.debugPhase = this.query('[data-dbg="phase"]');
    this.recordingStatus = this.query('.ui-rec');
    this.recordingTime = this.query('.rec-time');
    this.recordDescription = this.query('#record-capability');
    this.fullscreenDescription = this.query('#fullscreen-capability');
    this.liveRegion = this.query('[data-ui-live]');

    this.playBtn.addEventListener('click', () => this.callbacks.onTogglePlay());
    this.recordBtn.addEventListener('click', () => this.callbacks.onRecord());
    this.fullscreenBtn.addEventListener('click', () => this.callbacks.onToggleFullscreen());
    this.aboutBtn.addEventListener('click', () => this.callbacks.onAbout());
    document.addEventListener('fullscreenchange', () => this.syncFullscreen());
    this.syncFullscreen();
  }

  /** Returns the About control for focus restore after the panel closes. */
  aboutControl(): HTMLButtonElement {
    return this.aboutBtn;
  }

  setAboutOpen(open: boolean): void {
    this.aboutOpen = open;
    this.aboutBtn.setAttribute('aria-pressed', String(open));
    this.aboutBtn.setAttribute(
      'aria-label',
      open ? 'Close personal intro' : 'Open personal intro',
    );
    this.aboutBtn.title = open ? 'Close personal intro' : 'Open personal intro';
    this.syncDisabledState();
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector(selector);
    if (!element) throw new Error(`missing UI element ${selector}`);
    return element as T;
  }

  sync(state: ControlState): void {
    this.playBtn.innerHTML = state.playing ? ICON.pause : ICON.play;
    this.playBtn.setAttribute('aria-pressed', String(state.playing));
    this.playBtn.setAttribute('aria-label', state.playing ? 'Pause the drive' : 'Resume the drive');
    this.playBtn.title = `${state.playing ? 'Pause' : 'Resume'} the drive (Space)`;
    this.debugPanel.hidden = !state.debug;
  }

  syncDebug(state: ControlState): void {
    if (this.debugPanel.hidden) return;
    this.debugFps.textContent = `fps: ${format(state.fps, 0)}`;
    this.debugProgress.textContent = `progress: ${format(state.progress, 4)}`;
    this.debugPhase.textContent = `cycle: ${format(state.phase, 4)}`;
  }

  setCapabilities(capabilities: ControlCapabilities): void {
    this.capabilities = capabilities;
    this.recordDescription.textContent = capabilities.recording
      ? 'Records and downloads one complete 16-second WebM loop.'
      : 'Recording is unavailable because this browser cannot capture the canvas as WebM video.';
    this.fullscreenDescription.textContent = capabilities.fullscreen
      ? 'Expands the drive to fill the screen.'
      : 'Fullscreen is unavailable in this browser.';
    this.syncDisabledState();
    this.syncFullscreen();
  }

  private syncFullscreen(): void {
    if (!this.capabilities.fullscreen) {
      this.fullscreenBtn.setAttribute('aria-pressed', 'false');
      this.fullscreenBtn.setAttribute('aria-label', 'Fullscreen unavailable in this browser');
      this.fullscreenBtn.title = 'Fullscreen unavailable in this browser';
      return;
    }
    const active = Boolean(document.fullscreenElement);
    this.fullscreenBtn.setAttribute('aria-pressed', String(active));
    this.fullscreenBtn.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
    this.fullscreenBtn.title = `${active ? 'Exit' : 'Enter'} fullscreen (F)`;
  }

  setRecording(active: boolean, seconds = 0): void {
    if (active) this.recordingTime.textContent = `${seconds.toFixed(1)}s`;
    if (this.recording === active) return;

    this.recording = active;
    this.root.classList.toggle('is-recording', active);
    this.recordingStatus.hidden = !active;
    this.recordBtn.classList.toggle('recording', active);
    this.recordBtn.setAttribute('aria-pressed', String(active));
    this.recordBtn.setAttribute(
      'aria-label',
      active
        ? 'Recording one complete loop'
        : this.capabilities.recording
          ? 'Record one complete loop'
          : 'Recording unavailable in this browser',
    );
    this.syncDisabledState();
  }

  announce(message: string): void {
    // Clearing first ensures repeated recording attempts are announced again.
    this.liveRegion.textContent = '';
    requestAnimationFrame(() => {
      this.liveRegion.textContent = message;
    });
  }

  private syncDisabledState(): void {
    this.playBtn.disabled = this.recording;
    this.playBtn.setAttribute('aria-disabled', String(this.recording));

    const recordingDisabled = this.recording || !this.capabilities.recording;
    this.recordBtn.disabled = recordingDisabled;
    this.recordBtn.setAttribute('aria-disabled', String(recordingDisabled));
    if (!this.recording) {
      this.recordBtn.setAttribute(
        'aria-label',
        this.capabilities.recording
          ? 'Record one complete loop'
          : 'Recording unavailable in this browser',
      );
      this.recordBtn.title = this.capabilities.recording
        ? 'Record one complete loop (R)'
        : 'Recording unavailable: canvas capture is not supported';
    }

    this.fullscreenBtn.disabled = !this.capabilities.fullscreen;
    this.fullscreenBtn.setAttribute(
      'aria-disabled',
      String(!this.capabilities.fullscreen),
    );

    this.aboutBtn.disabled = this.recording;
    this.aboutBtn.setAttribute('aria-disabled', String(this.recording));
    if (this.recording && !this.aboutOpen) {
      this.aboutBtn.setAttribute('aria-label', 'Personal intro unavailable while recording');
      this.aboutBtn.title = 'Personal intro unavailable while recording';
    }
  }
}

function format(value: number | undefined, digits: number): string {
  return Number.isFinite(value) ? value!.toFixed(digits) : '–';
}

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.6v12.8L18.8 12 8.5 5.6Z" fill="currentColor"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.25 5.5h3.5v13h-3.5zM13.25 5.5h3.5v13h-3.5z" fill="currentColor"/></svg>',
  record:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.25" fill="currentColor"/></svg>',
  fullscreen:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 9V4.5H9M19.5 9V4.5H15M4.5 15v4.5H9M19.5 15v4.5H15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square"/></svg>',
  about:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.1" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.8 19.2c1.3-3.1 3.5-4.6 6.2-4.6s4.9 1.5 6.2 4.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
} as const;

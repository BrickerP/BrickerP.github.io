import {
  ACESFilmicToneMapping,
  Color,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import {
  BeijingDriveScene,
  type CapturePerformanceState,
} from '../rendering/BeijingDriveScene';
import { FirstPersonCameraRig } from '../rendering/FirstPersonCameraRig';
import {
  pathHeading,
  samplePathFrame,
  wrapProgress,
} from '../rendering/drivePath';
import { DRIVE, PALETTE } from '../rendering/theme';

export interface AppState {
  playing: boolean;
  debug: boolean;
  reducedMotion: boolean;
  progress: number;
  phase: number;
  fps: number;
  angle: number;
}

const MAX_DT = 1 / 20;
const REDUCED_MOTION_POSTER_PHASE = 0.1;
const CAPTURE_WIDTH = 320;
const CAPTURE_HEIGHT = 180;

/** Owns the deterministic clock and the Three.js render lifecycle. */
export class BeijingLoopApp {
  readonly state: AppState;
  readonly canvas: HTMLCanvasElement;

  private readonly renderer: WebGLRenderer;
  private readonly city = new BeijingDriveScene();
  private readonly cameraRig: FirstPersonCameraRig;
  private readonly pathFrame = samplePathFrame(0);
  private clock = 0;
  private deterministicCapture = false;
  private viewportWidth = 1;
  private viewportHeight = 1;
  private devicePixelRatio = 1;
  private onState?: (state: AppState) => void;

  constructor(
    mount: HTMLElement,
    reducedMotion: boolean,
    width = window.innerWidth,
    height = window.innerHeight,
  ) {
    this.clock = reducedMotion
      ? REDUCED_MOTION_POSTER_PHASE * DRIVE.duration
      : 0;
    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: false,
      depth: true,
      // Required by deterministic pixel QA and canvas.captureStream recording.
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setClearColor(new Color(PALETTE.skyTop), 1);

    this.canvas = this.renderer.domElement;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    mount.appendChild(this.canvas);

    this.cameraRig = new FirstPersonCameraRig(width / Math.max(1, height));
    this.state = {
      playing: !reducedMotion,
      debug: false,
      reducedMotion,
      progress: 0,
      phase: 0,
      fps: 0,
      angle: 0,
    };

    this.resize(width, height, window.devicePixelRatio || 1);
    this.render();
  }

  onStateChange(callback: (state: AppState) => void): void {
    this.onState = callback;
  }

  togglePlay(): void {
    this.state.playing = !this.state.playing;
    this.emit();
  }

  setPlaying(playing: boolean): void {
    if (this.state.playing === playing) return;
    this.state.playing = playing;
    this.emit();
  }

  /**
   * Lets the recorder own the scene clock while ordinary playback is paused.
   * This also bypasses the reduced-motion poster frame for explicit capture.
   */
  setDeterministicCapture(active: boolean): void {
    if (this.deterministicCapture === active) return;
    this.deterministicCapture = active;
    this.city.setCapturePerformanceMode(active);
    this.applyRenderSize();
    this.render();
  }

  readCapturePerformanceState(): CapturePerformanceState {
    return this.city.readCapturePerformanceState();
  }

  toggleDebug(): void {
    this.state.debug = !this.state.debug;
    this.emit();
  }

  seekToCycleStart(): void {
    this.clock = 0;
    this.render();
  }

  /** Set an exact test/export time without accumulating frame error. */
  seek(seconds: number): void {
    this.clock = wrapProgress(seconds / DRIVE.duration) * DRIVE.duration;
    this.render();
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    this.viewportWidth = Math.max(1, Math.floor(width));
    this.viewportHeight = Math.max(1, Math.floor(height));
    this.devicePixelRatio = Math.max(1, devicePixelRatio);
    this.applyRenderSize();
    this.render();
  }

  private applyRenderSize(): void {
    if (this.deterministicCapture) {
      // Keep the capture track fixed-size while responsive UI tests resize the
      // viewport. A small 16:9 buffer sustains real-time software rendering.
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(CAPTURE_WIDTH, CAPTURE_HEIGHT, false);
      this.cameraRig.resize(CAPTURE_WIDTH / CAPTURE_HEIGHT);
      return;
    }
    const mobile = this.viewportWidth < 720;
    const maxRatio = this.state.reducedMotion ? 1 : mobile ? 1.35 : 1.8;
    this.renderer.setPixelRatio(Math.min(this.devicePixelRatio, maxRatio));
    this.renderer.setSize(this.viewportWidth, this.viewportHeight, false);
    this.cameraRig.resize(this.viewportWidth / this.viewportHeight);
  }

  update(dt: number): void {
    const safeDt = Number.isFinite(dt) ? Math.min(Math.max(0, dt), MAX_DT) : 0;
    if (this.state.playing) {
      this.clock = (this.clock + safeDt) % DRIVE.duration;
    }
    if (safeDt > 0) {
      const instantaneous = 1 / safeDt;
      this.state.fps =
        this.state.fps === 0
          ? instantaneous
          : this.state.fps + (instantaneous - this.state.fps) * 0.08;
    }
    this.render();
  }

  render(): void {
    const posterFrame =
      this.state.reducedMotion && !this.state.playing && !this.deterministicCapture;
    const phase = posterFrame
      ? REDUCED_MOTION_POSTER_PHASE
      : wrapProgress(this.clock / DRIVE.duration);
    this.state.progress = phase;
    this.state.phase = phase;

    samplePathFrame(phase, this.pathFrame);
    this.state.angle = pathHeading(this.pathFrame.tangent);

    this.city.update(phase);
    this.cameraRig.update(phase, this.state.reducedMotion);
    this.renderer.render(this.city.scene, this.cameraRig.camera);
  }

  dispose(): void {
    this.city.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }

  private emit(): void {
    this.onState?.(this.state);
  }
}

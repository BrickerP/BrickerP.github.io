import {
  ACESFilmicToneMapping,
  Color,
  DepthFormat,
  DepthTexture,
  HalfFloatType,
  PCFSoftShadowMap,
  SRGBColorSpace,
  UnsignedIntType,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HeroFocusPass } from '../rendering/focusPass';
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

export interface RenderTelemetry {
  renderCount: number;
  lastRenderTimestampMs: number;
  phase: number;
}

// Poster frame: Tiananmen facade ahead with sky still in the vanishing band.
const REDUCED_MOTION_POSTER_PHASE = 0.53 / 48;
const CAPTURE_WIDTH = 320;
const CAPTURE_HEIGHT = 180;

/** Owns the deterministic clock and the Three.js render lifecycle. */
export class BeijingLoopApp {
  readonly state: AppState;
  readonly canvas: HTMLCanvasElement;

  private readonly renderer: WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly city = new BeijingDriveScene();
  private readonly cameraRig: FirstPersonCameraRig;
  private readonly pathFrame = samplePathFrame(0);
  private clock = 0;
  private deterministicCapture = false;
  private viewportWidth = 1;
  private viewportHeight = 1;
  private devicePixelRatio = 1;
  private onState?: (state: AppState) => void;
  private readonly renderTelemetry: RenderTelemetry = {
    renderCount: 0,
    lastRenderTimestampMs: 0,
    phase: 0,
  };

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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setClearColor(new Color(PALETTE.skyTop), 1);

    this.canvas = this.renderer.domElement;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    mount.appendChild(this.canvas);

    this.cameraRig = new FirstPersonCameraRig(width / Math.max(1, height));
    const renderPass = new RenderPass(this.city.scene, this.cameraRig.camera);
    const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.22, 0.4, 0.86);
    this.bloom = bloom;
    const renderTarget = new WebGLRenderTarget(1, 1, {
      type: HalfFloatType,
      depthBuffer: true,
    });
    renderTarget.depthTexture = new DepthTexture(1, 1, UnsignedIntType);
    renderTarget.depthTexture.format = DepthFormat;
    this.composer = new EffectComposer(this.renderer, renderTarget);
    this.composer.addPass(renderPass);
    this.composer.addPass(new HeroFocusPass(this.cameraRig.camera));
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());
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

  readRenderTelemetry(): RenderTelemetry {
    return { ...this.renderTelemetry };
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
      this.composer.setPixelRatio(1);
      this.composer.setSize(CAPTURE_WIDTH, CAPTURE_HEIGHT);
      this.fitBloom(CAPTURE_WIDTH, CAPTURE_HEIGHT);
      this.cameraRig.resize(CAPTURE_WIDTH / CAPTURE_HEIGHT);
      return;
    }
    const mobile = this.viewportWidth < 720;
    const maxRatio = this.state.reducedMotion ? 1 : mobile ? 1 : 1.25;
    const ratio = Math.min(this.devicePixelRatio, maxRatio);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(this.viewportWidth, this.viewportHeight, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(this.viewportWidth, this.viewportHeight);
    this.fitBloom(this.viewportWidth, this.viewportHeight);
    this.cameraRig.resize(this.viewportWidth / this.viewportHeight);
  }

  /** Glow is soft. Quarter-size blur keeps the halo and drops most of its fill cost. */
  private fitBloom(width: number, height: number): void {
    this.bloom.setSize(
      Math.max(1, Math.floor(width / 4)),
      Math.max(1, Math.floor(height / 4)),
    );
  }

  update(dt: number): void {
    const safeDt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
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
    this.composer.render();
    this.renderTelemetry.renderCount += 1;
    this.renderTelemetry.lastRenderTimestampMs = performance.now();
    this.renderTelemetry.phase = phase;
  }

  dispose(): void {
    this.city.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }

  private emit(): void {
    this.onState?.(this.state);
  }
}

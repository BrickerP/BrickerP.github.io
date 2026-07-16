import type p5 from 'p5';
import type { BeijingMap } from '../data/mapTypes';
import type { PathSampler } from '../path/pathSampler';
import { DistanceField } from '../path/distanceToPath';
import { buildLoopPath } from '../path/loopPath';
import type { Vec2 } from '../path/geometry';
import { clamp } from '../path/geometry';
import { MapRenderer, type LayerParams } from '../rendering/MapRenderer';
import { VehicleRenderer, type VehicleView, type SensorState } from '../rendering/VehicleRenderer';
import { FractalRenderer } from '../rendering/FractalRenderer';
import { CameraController } from '../rendering/CameraController';
import { FRACTAL, RGB, type ViewMode } from '../rendering/theme';

export interface AppState {
  mode: ViewMode;
  playing: boolean;
  debug: boolean;
  reducedMotion: boolean;
  progress: number; // 0..1 car position on loop
  phase: number; // 0..1 fractal cycle
  fps: number;
  angle: number;
}

// One lap per exported fractal cycle keeps the full frame periodic at 12s.
const LOOP_SECONDS = FRACTAL.duration;
const MAX_DT = 1 / 20; // clamp dt so a backgrounded tab can't jump the sim

/**
 * The orchestrator: owns state, the fixed simulation clock, and the per-frame
 * update → render pipeline for both public view modes. Deliberately thin — the
 * heavy lifting lives in the path, data and rendering modules.
 */
export class BeijingLoopApp {
  readonly state: AppState;
  private readonly sampler: PathSampler;
  private readonly field: DistanceField;
  private readonly mapR: MapRenderer;
  private readonly vehicleR = new VehicleRenderer();
  private readonly fractalR = new FractalRenderer();
  private readonly camera = new CameraController();
  private readonly anchor: Vec2;
  private readonly loopSamples: readonly Vec2[];
  /** simulation clock (seconds) — only advances while playing; drives fractal. */
  private clock = 0;
  private onState?: (s: AppState) => void;

  constructor(
    private readonly map: BeijingMap,
    reducedMotion: boolean,
  ) {
    this.sampler = buildLoopPath(map.loopControl);
    this.field = new DistanceField(this.sampler, 22);
    this.mapR = new MapRenderer(map);
    this.loopSamples = this.sampler.getSamples();
    // Fractal anchor: near the central-axis midpoint (NOT a precise geo point).
    this.anchor = { x: 0, y: 6 };
    this.state = {
      mode: 'fractal',
      playing: true,
      debug: false,
      reducedMotion,
      progress: 0,
      phase: 0,
      fps: 0,
      angle: 0,
    };
  }

  onStateChange(cb: (s: AppState) => void): void {
    this.onState = cb;
  }

  setMode(mode: ViewMode): void {
    if (this.state.mode === mode) return;
    this.state.mode = mode;
    this.camera.onModeChange();
    this.emit();
  }

  togglePlay(): void {
    this.state.playing = !this.state.playing;
    this.emit();
  }

  setPlaying(v: boolean): void {
    if (this.state.playing !== v) {
      this.state.playing = v;
      this.emit();
    }
  }

  toggleDebug(): void {
    this.state.debug = !this.state.debug;
    this.emit();
  }

  private emit(): void {
    this.onState?.(this.state);
  }

  /** For the recorder: jump the whole sim to a phase in [0,1) deterministically. */
  seekToCycleStart(): void {
    this.clock = 0;
  }

  /** Deterministic visual-test hook; normal playback still advances by dt. */
  seek(seconds: number): void {
    const duration = FRACTAL.duration;
    this.clock = ((seconds % duration) + duration) % duration;
  }

  worldRadius(): number {
    const b = this.map.bounds;
    return Math.hypot(b.maxX - b.minX, b.maxY - b.minY) / 2;
  }

  applyPerspective(p: p5): void {
    this.camera.applyPerspective(p);
  }

  /**
   * Advance the simulation and render one frame.
   * @param p    p5 instance (WEBGL)
   * @param dt   real seconds since last frame (already clamped by caller too)
   */
  update(p: p5, dt: number): void {
    const clamped = Math.min(dt, MAX_DT);

    // ---- advance the single simulation clock (only while playing) -------
    if (this.state.playing) {
      // reduced motion: crawl the car, freeze the fractal zoom entirely.
      const rate = this.state.reducedMotion ? 0.18 : 1;
      this.clock += clamped * rate;
    }

    const progress = this.sampler.wrapProgress(this.clock / LOOP_SECONDS);
    const phase = this.state.reducedMotion ? 0 : this.fractalR.phase(this.clock);
    this.state.progress = progress;
    this.state.phase = phase;

    // ---- vehicle kinematics (city-unit space) --------------------------
    const carPos = this.sampler.getPointAt(progress);
    const tan = this.sampler.getTangentAt(progress);
    const angle = Math.atan2(tan.y, tan.x);
    this.state.angle = angle;

    // sensors: ahead of the nose, splayed left/right (city units)
    const ahead = 24;
    const side = 11;
    const nx = -tan.y; // left normal in city space
    const ny = tan.x;
    const leftPos: Vec2 = {
      x: carPos.x + tan.x * ahead + nx * side,
      y: carPos.y + tan.y * ahead + ny * side,
    };
    const rightPos: Vec2 = {
      x: carPos.x + tan.x * ahead - nx * side,
      y: carPos.y + tan.y * ahead - ny * side,
    };
    const SENSOR_RANGE = 20;
    const onLine = (pt: Vec2): number =>
      clamp(1 - this.field.distanceTo(pt) / SENSOR_RANGE, 0, 1);
    const left: SensorState = { pos: leftPos, onLine: onLine(leftPos) };
    const right: SensorState = { pos: rightPos, onLine: onLine(rightPos) };

    // ---- camera --------------------------------------------------------
    const b = this.map.bounds;
    const mapCenterWorld: Vec2 = {
      x: (b.minX + b.maxX) / 2,
      y: -(b.minY + b.maxY) / 2,
    };
    this.camera.update(
      p,
      this.state.mode,
      {
        anchorWorld: { x: this.anchor.x, y: -this.anchor.y },
        mapCenterWorld,
        worldRadius: this.worldRadius(),
      },
      clamped,
    );
    const pxPerUnit = this.camera.pxPerUnit(p);

    // ---- render --------------------------------------------------------
    this.renderScene(p, phase, pxPerUnit, progress, angle, { pos: carPos, left, right });
  }

  private renderScene(
    p: p5,
    phase: number,
    pxPerUnit: number,
    progress: number,
    angle: number,
    car: { pos: Vec2; left: SensorState; right: SensorState },
  ): void {
    p.background(RGB.pageBg[0], RGB.pageBg[1], RGB.pageBg[2]);

    // Flat-graphic look: no scene lights, speculars, bloom or model shading.
    p.noStroke();

    // Context is always rendered exactly once. Only the orange loop motif is
    // recursive in Fractal mode, so faint echoes never multiply line detail.
    const [contextLayer] = this.fractalR.baseLayers(this.anchor, pxPerUnit);
    this.mapR.draw(p, {
      ...contextLayer,
      alpha: this.state.mode === 'fractal' ? 0.72 : 1,
    });

    const loopLayers: LayerParams[] =
      this.state.mode === 'fractal'
        ? this.fractalR.fractalLayers(phase, this.anchor, pxPerUnit)
        : this.fractalR.baseLayers(this.anchor, pxPerUnit);

    const unitsPerPx = 1 / pxPerUnit;
    const view: VehicleView = {
      pos: car.pos,
      angle,
    };

    for (const L of loopLayers) {
      this.drawLoop(p, L, progress);
    }

    const weights = loopLayers.map((layer) => Math.max(0, layer.alpha - 0.1));
    const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
    for (const [index, L] of loopLayers.entries()) {
      const vehicleAlpha =
        this.state.mode === 'fractal'
          ? Math.min(L.alpha, (weights[index] / weightTotal) * 1.15)
          : 1;
      this.vehicleR.draw(p, view, {
        anchor: L.anchor,
        worldScale: L.worldScale,
        alpha: vehicleAlpha,
      });
    }

    if (this.state.debug) this.drawDebug(p, unitsPerPx, car);
  }

  /** The orange 2nd-ring loop, drawn per layer with screen-stable width. */
  private drawLoop(p: p5, L: LayerParams, progress: number): void {
    const a = L.alpha;
    if (a <= 0.004) return;
    const pts = this.loopSamples;
    p.push();
    p.noFill();
    p.stroke(RGB.loop[0], RGB.loop[1], RGB.loop[2], 235 * a);
    p.strokeWeight(3.2 / L.pxPerUnit);
    p.beginShape();
    for (const pt of pts) {
      const wx = L.anchor.x + (pt.x - L.anchor.x) * L.worldScale;
      const wy = L.anchor.y + (pt.y - L.anchor.y) * L.worldScale;
      p.vertex(wx, -wy, 0.9 * L.worldScale);
    }
    const p0 = pts[0];
    p.vertex(
      L.anchor.x + (p0.x - L.anchor.x) * L.worldScale,
      -(L.anchor.y + (p0.y - L.anchor.y) * L.worldScale),
      0.9 * L.worldScale,
    );
    p.endShape();

    // A short warm trail marks direction without becoming a glow effect.
    const glowN = 16;
    p.stroke(RGB.highlight[0], RGB.highlight[1], RGB.highlight[2], 100 * a);
    p.strokeWeight(3.3 / L.pxPerUnit);
    p.beginShape();
    for (let i = 0; i < glowN; i++) {
      const t = this.sampler.wrapProgress(progress - (i / glowN) * 0.035);
      const pt = this.sampler.getPointAt(t);
      const wx = L.anchor.x + (pt.x - L.anchor.x) * L.worldScale;
      const wy = L.anchor.y + (pt.y - L.anchor.y) * L.worldScale;
      p.vertex(wx, -wy, 1.0 * L.worldScale);
    }
    p.endShape();
    p.pop();
  }

  private drawDebug(
    p: p5,
    unitsPerPx: number,
    car: { pos: Vec2; left: SensorState; right: SensorState },
  ): void {
    // control points of the loop as small dots
    p.push();
    p.noStroke();
    p.fill(255, 255, 255, 150);
    for (const c of this.map.loopControl) {
      p.push();
      p.translate(c.x, -c.y, 2);
      p.sphere(2 * unitsPerPx, 5, 4);
      p.pop();
    }
    // car centre
    p.fill(RGB.highlight[0], RGB.highlight[1], RGB.highlight[2]);
    p.push();
    p.translate(car.pos.x, -car.pos.y, 3);
    p.sphere(3 * unitsPerPx, 6, 5);
    p.pop();

    // Sensor whiskers are diagnostic geometry only.
    p.stroke(RGB.highlight[0], RGB.highlight[1], RGB.highlight[2], 175);
    p.strokeWeight(unitsPerPx);
    p.line(car.pos.x, -car.pos.y, 2, car.left.pos.x, -car.left.pos.y, 2);
    p.line(car.pos.x, -car.pos.y, 2, car.right.pos.x, -car.right.pos.y, 2);
    p.pop();
  }
}

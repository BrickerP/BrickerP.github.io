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
import { RGB, type ViewMode } from '../rendering/theme';

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

const LOOP_SECONDS = 26; // seconds for the car to complete one lap
const MAX_DT = 1 / 20; // clamp dt so a backgrounded tab can't jump the sim

/**
 * The orchestrator: owns state, the fixed simulation clock, and the per-frame
 * update → render pipeline for all three view modes. Deliberately thin — the
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
    const carWorld: Vec2 = { x: carPos.x, y: -carPos.y };
    const carForward: Vec2 = { x: tan.x, y: -tan.y };
    const b = this.map.bounds;
    const mapCenterWorld: Vec2 = {
      x: (b.minX + b.maxX) / 2,
      y: -(b.minY + b.maxY) / 2,
    };
    this.camera.update(
      p,
      this.state.mode,
      {
        carWorld,
        carForward,
        anchorWorld: { x: this.anchor.x, y: -this.anchor.y },
        mapCenterWorld,
        worldRadius: this.worldRadius(),
      },
      clamped,
      this.clock,
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

    // Flat-graphic look: no scene lights, so the map renders at its exact
    // palette colours (boundary #D6DEE8, dark land fills). The vehicle reads
    // as 3D via its stacked-box bevel, warm headlights and forward wedge —
    // not via speculars/bloom, which we deliberately avoid.
    p.noStroke();

    // map layers (fractal stack, or a single base layer)
    const layers: LayerParams[] =
      this.state.mode === 'fractal'
        ? this.fractalR.fractalLayers(phase, this.anchor, pxPerUnit)
        : this.fractalR.baseLayers(this.anchor, pxPerUnit);

    const unitsPerPx = 1 / pxPerUnit;
    const view: VehicleView = {
      pos: car.pos,
      angle,
      left: car.left,
      right: car.right,
    };

    // Back-to-front: for each nested copy draw map → loop → the car ON that
    // copy. Because every copy is self-similar (scale S apart) and shares the
    // same clock, the composite — car included — is continuous at the wrap:
    // the car on copy k lands exactly where the car on copy k+1 was.
    for (const L of layers) {
      this.mapR.draw(p, L);
      this.drawLoop(p, L, progress);
      this.vehicleR.draw(p, view, {
        anchor: L.anchor,
        worldScale: L.worldScale,
        alpha: L.alpha,
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
    p.strokeWeight(2.6 / L.pxPerUnit);
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

    // faint travelling highlight trailing the car along the loop
    const glowN = 24;
    p.stroke(RGB.highlight[0], RGB.highlight[1], RGB.highlight[2], 150 * a);
    p.strokeWeight(3.4 / L.pxPerUnit);
    p.beginShape();
    for (let i = 0; i < glowN; i++) {
      const t = this.sampler.wrapProgress(progress - (i / glowN) * 0.05);
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
    p.pop();
  }
}


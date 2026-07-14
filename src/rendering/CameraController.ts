import type p5 from 'p5';
import type { Vec2 } from '../path/geometry';
import { damp } from '../path/geometry';
import type { ViewMode } from './theme';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraTarget {
  /** vehicle position in WORLD space (city x, -city y). */
  carWorld: Vec2;
  /** vehicle forward direction in WORLD space (unit). */
  carForward: Vec2;
  /** fractal pivot in world space. */
  anchorWorld: Vec2;
  /** map bbox centre in world space (Overview framing). */
  mapCenterWorld: Vec2;
  /** half-diagonal of the full map in world units (for overview framing). */
  worldRadius: number;
}

/**
 * Owns the WEBGL camera for all three view modes and smooths every move with
 * frame-rate-independent exponential damping (alpha = 1 - e^(-k*dt)), never a
 * fixed lerp constant. Also exposes pxPerUnit so renderers can keep line and
 * vehicle sizes stable in screen space.
 */
export class CameraController {
  private eye: Vec3 = { x: 0, y: 400, z: 900 };
  private center: Vec3 = { x: 0, y: 0, z: 0 };
  private up: Vec3 = { x: 0, y: 0, z: 1 };
  private initialised = false;
  private fov = Math.PI / 3;

  /** Reset smoothing when switching modes so we don't sweep across the map. */
  onModeChange(): void {
    this.initialised = false;
  }

  /** Update perspective for the current viewport. Call on setup + resize. */
  applyPerspective(p: p5): void {
    const aspect = p.width / p.height;
    const far = 12000;
    this.fov = aspectFov(aspect);
    p.perspective(this.fov, aspect, 1, far);
  }

  update(
    p: p5,
    mode: ViewMode,
    t: CameraTarget,
    dt: number,
    elapsed: number,
  ): void {
    const desired = this.desired(mode, t, elapsed);

    if (!this.initialised) {
      this.eye = { ...desired.eye };
      this.center = { ...desired.center };
      this.up = { ...desired.up };
      this.initialised = true;
    } else {
      const kPos = mode === 'follow' ? 4.5 : 2.4;
      const kCen = mode === 'follow' ? 6.0 : 3.0;
      this.eye.x = damp(this.eye.x, desired.eye.x, kPos, dt);
      this.eye.y = damp(this.eye.y, desired.eye.y, kPos, dt);
      this.eye.z = damp(this.eye.z, desired.eye.z, kPos, dt);
      this.center.x = damp(this.center.x, desired.center.x, kCen, dt);
      this.center.y = damp(this.center.y, desired.center.y, kCen, dt);
      this.center.z = damp(this.center.z, desired.center.z, kCen, dt);
      // up vector is fixed per mode; set directly (already continuous)
      this.up = desired.up;
    }

    p.camera(
      this.eye.x,
      this.eye.y,
      this.eye.z,
      this.center.x,
      this.center.y,
      this.center.z,
      this.up.x,
      this.up.y,
      this.up.z,
    );
  }

  /** Screen pixels per world unit at the focal plane (for stable line widths). */
  pxPerUnit(p: p5): number {
    const d = Math.hypot(
      this.eye.x - this.center.x,
      this.eye.y - this.center.y,
      this.eye.z - this.center.z,
    );
    return p.height / 2 / (d * Math.tan(this.fov / 2));
  }

  private desired(
    mode: ViewMode,
    t: CameraTarget,
    elapsed: number,
  ): { eye: Vec3; center: Vec3; up: Vec3 } {
    switch (mode) {
      case 'follow': {
        const back = 150;
        const height = 115;
        const ahead = 120;
        const f = t.carForward;
        return {
          eye: {
            x: t.carWorld.x - f.x * back,
            y: t.carWorld.y - f.y * back,
            z: height,
          },
          center: { x: t.carWorld.x + f.x * ahead, y: t.carWorld.y + f.y * ahead, z: 0 },
          up: { x: 0, y: 0, z: 1 },
        };
      }
      case 'overview': {
        // fit whole map: eye straight up over the map CENTRE. up=(0,+1,0) puts
        // city-north at the top of the screen and keeps east on the right.
        const r = t.worldRadius;
        const z = (r * 1.2) / Math.tan(this.fov / 2);
        return {
          eye: { x: t.mapCenterWorld.x, y: t.mapCenterWorld.y - 1, z },
          center: { x: t.mapCenterWorld.x, y: t.mapCenterWorld.y, z: 0 },
          up: { x: 0, y: 1, z: 0 },
        };
      }
      case 'fractal':
      default: {
        // High, near-top-down view over the anchor with a very slow orbit and
        // gentle breathing so the nested-map zoom (done by the layer stack)
        // reads as a living composition. Fully periodic -> seamless.
        const r = t.worldRadius * 0.62;
        const orbit = elapsed * 0.06;
        const tilt = 0.16 + Math.sin(elapsed * 0.18) * 0.05;
        const z = (r * 1.15) / Math.tan(this.fov / 2);
        return {
          eye: {
            x: t.anchorWorld.x + Math.cos(orbit) * z * tilt,
            y: t.anchorWorld.y + Math.sin(orbit) * z * tilt,
            z,
          },
          center: { x: t.anchorWorld.x, y: t.anchorWorld.y, z: 0 },
          up: { x: 0, y: -1, z: 0 },
        };
      }
    }
  }
}

/** Widen the vertical fov on portrait screens so the map still fits. */
function aspectFov(aspect: number): number {
  if (aspect >= 1) return Math.PI / 3; // 60°
  // portrait: increase vertical fov up to ~85°
  const f = (Math.PI / 3) / Math.max(0.55, aspect);
  return Math.min(f, (85 * Math.PI) / 180);
}

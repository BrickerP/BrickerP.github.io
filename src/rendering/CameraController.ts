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
  /** fractal pivot in world space. */
  anchorWorld: Vec2;
  /** map bbox centre in world space (Overview framing). */
  mapCenterWorld: Vec2;
  /** half-diagonal of the full map in world units (for overview framing). */
  worldRadius: number;
}

/**
 * Owns the WEBGL camera for both public view modes and smooths every move with
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
  private aspect = 1;

  /** Reset smoothing when switching modes so we don't sweep across the map. */
  onModeChange(): void {
    this.initialised = false;
  }

  /** Update perspective for the current viewport. Call on setup + resize. */
  applyPerspective(p: p5): void {
    const aspect = p.width / p.height;
    this.aspect = aspect;
    const far = 12000;
    this.fov = aspectFov(aspect);
    p.perspective(this.fov, aspect, 1, far);
  }

  update(
    p: p5,
    mode: ViewMode,
    t: CameraTarget,
    dt: number,
  ): void {
    const desired = this.desired(mode, t);

    if (!this.initialised) {
      this.eye = { ...desired.eye };
      this.center = { ...desired.center };
      this.up = { ...desired.up };
      this.initialised = true;
    } else {
      this.eye.x = damp(this.eye.x, desired.eye.x, 2.4, dt);
      this.eye.y = damp(this.eye.y, desired.eye.y, 2.4, dt);
      this.eye.z = damp(this.eye.z, desired.eye.z, 2.4, dt);
      this.center.x = damp(this.center.x, desired.center.x, 3, dt);
      this.center.y = damp(this.center.y, desired.center.y, 3, dt);
      this.center.z = damp(this.center.z, desired.center.z, 3, dt);
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
  ): { eye: Vec3; center: Vec3; up: Vec3 } {
    switch (mode) {
      case 'overview': {
        // fit whole map: eye straight up over the map CENTRE. up=(0,+1,0) puts
        // city-north at the top of the screen and keeps east on the right.
        const r = t.worldRadius;
        const padding = this.aspect < 1 ? 1.72 : 1.2;
        const z = (r * padding) / Math.tan(this.fov / 2);
        return {
          eye: { x: t.mapCenterWorld.x, y: t.mapCenterWorld.y - 1, z },
          center: { x: t.mapCenterWorld.x, y: t.mapCenterWorld.y, z: 0 },
          up: { x: 0, y: 1, z: 0 },
        };
      }
      case 'fractal': {
        // The scale transition supplies all motion. A fixed north-up camera
        // keeps the recurring loop calm, exactly periodic and easy to read.
        const portraitDistance = this.aspect < 1 ? 1.28 : 1;
        const r = t.worldRadius * 0.34 * portraitDistance;
        const z = (r * 1.15) / Math.tan(this.fov / 2);
        return {
          eye: { x: t.anchorWorld.x, y: t.anchorWorld.y - 1, z },
          center: { x: t.anchorWorld.x, y: t.anchorWorld.y, z: 0 },
          up: { x: 0, y: 1, z: 0 },
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

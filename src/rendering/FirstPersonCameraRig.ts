import { PerspectiveCamera, Vector3 } from 'three';
import { DRIVE } from './theme';
import { samplePathFrame, wrapProgress } from './drivePath';

/**
 * The authored path uses compact composition units. Scaling its centreline
 * into scene metres keeps one 48 second lap near urban-road speed while road
 * widths, props and the camera retain human-scale dimensions.
 */
export const DRIVE_PATH_SCALE = 0.19;
export const DRIVE_EYE_HEIGHT = DRIVE.cameraHeight;

const LANDSCAPE_FOV = 58;
const PORTRAIT_FOV = 72;
// Normalized path fractions scaled for the 48s circuit so look-ahead metres
// stay comparable to the earlier 16s / 32s drives.
const LANDSCAPE_AHEAD_PHASE = 0.0175;
const PORTRAIT_AHEAD_PHASE = 0.0215;
const ASPECT_MIX_START = 0.75;
const ASPECT_MIX_END = 1.25;
const PORTRAIT_LANE_OFFSET = -0.72;
const CLEARANCE_LANE_OFFSET = -0.72;
const CLEARANCE_START_PHASE = 0.988;
const CLEARANCE_FADE_PHASE = 0.02;
const CLEARANCE_HOLD_PHASE = 0.06;
const BOB_CYCLES = 24;
const BOB_HEIGHT = 0.012;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const normalized = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return normalized * normalized * (3 - 2 * normalized);
}

function mix(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function centralAxisClearanceMix(progress: number): number {
  const position = wrapProgress(progress - CLEARANCE_START_PHASE);
  const fadeOutStart = CLEARANCE_FADE_PHASE + CLEARANCE_HOLD_PHASE;
  return (
    smoothstep(0, CLEARANCE_FADE_PHASE, position) *
    (1 -
      smoothstep(
        fadeOutStart,
        fadeOutStart + CLEARANCE_FADE_PHASE,
        position,
      ))
  );
}

/** Pure phase-derived first-person camera for the closed authored drive path. */
export class FirstPersonCameraRig {
  readonly camera: PerspectiveCamera;

  private readonly lookTarget = new Vector3();
  private readonly currentFrame = samplePathFrame(0);
  private readonly futureFrame = samplePathFrame(0);
  private aspect: number;

  constructor(aspect: number) {
    const safeAspect = Math.max(0.01, aspect);
    this.aspect = safeAspect;
    this.camera = new PerspectiveCamera(
      this.fovForAspect(safeAspect),
      safeAspect,
      0.08,
      420,
    );
    this.camera.up.set(0, 1, 0);
    this.camera.rotation.order = 'YXZ';
    this.update(0, true);
  }

  /** Update viewport projection without coupling the rig to a renderer. */
  resize(aspect: number): void {
    const safeAspect = Math.max(0.01, aspect);
    this.aspect = safeAspect;
    this.camera.aspect = safeAspect;
    this.camera.fov = this.fovForAspect(safeAspect);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Resolve the complete camera transform from phase alone. Reduced motion
   * suppresses secondary bob; the caller owns the authored poster phase.
   */
  update(phase: number, reducedMotion: boolean): void {
    const progress = wrapProgress(phase);
    const frame = samplePathFrame(progress, this.currentFrame);
    const bob = reducedMotion
      ? 0
      : Math.sin(progress * Math.PI * 2 * BOB_CYCLES) * BOB_HEIGHT;
    const aspectMix = this.aspectMix();
    const baseLaneOffset = mix(
      PORTRAIT_LANE_OFFSET,
      DRIVE.laneOffset,
      aspectMix,
    );
    const clearanceMix = centralAxisClearanceMix(progress);
    const laneOffset = mix(
      baseLaneOffset,
      CLEARANCE_LANE_OFFSET,
      clearanceMix,
    );
    const aheadPhase = mix(
      PORTRAIT_AHEAD_PHASE,
      LANDSCAPE_AHEAD_PHASE,
      aspectMix,
    );
    samplePathFrame(
      progress + aheadPhase,
      this.futureFrame,
    );

    this.camera.position
      .set(
        frame.point.x * DRIVE_PATH_SCALE,
        DRIVE_EYE_HEIGHT + bob,
        frame.point.z * DRIVE_PATH_SCALE,
      )
      .addScaledVector(frame.normal, laneOffset);

    this.lookTarget.set(
      this.futureFrame.point.x * DRIVE_PATH_SCALE,
      DRIVE_EYE_HEIGHT - 0.08,
      this.futureFrame.point.z * DRIVE_PATH_SCALE,
    );
    this.lookTarget.addScaledVector(this.futureFrame.normal, laneOffset);
    this.camera.lookAt(this.lookTarget);
    this.camera.updateMatrixWorld();
  }

  private fovForAspect(aspect: number): number {
    return mix(PORTRAIT_FOV, LANDSCAPE_FOV, this.aspectMix(aspect));
  }

  private aspectMix(aspect = this.aspect): number {
    return smoothstep(ASPECT_MIX_START, ASPECT_MIX_END, aspect);
  }
}

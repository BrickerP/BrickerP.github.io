import { PerspectiveCamera, Vector3 } from 'three';
import { DRIVE } from './theme';
import { samplePathFrame, wrapProgress } from './drivePath';

/**
 * The authored path uses compact composition units. Scaling its centreline
 * into scene metres keeps one 16 second lap near urban-road speed while road
 * widths, props and the camera retain human-scale dimensions.
 */
export const DRIVE_PATH_SCALE = 0.19;
export const DRIVE_EYE_HEIGHT = DRIVE.cameraHeight;

const LANDSCAPE_FOV = 58;
const PORTRAIT_FOV = 72;
const LANDSCAPE_AHEAD_PHASE = 0.052;
const PORTRAIT_AHEAD_PHASE = 0.064;
const BOB_CYCLES = 8;
const BOB_HEIGHT = 0.012;

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
    const portrait = this.aspect < 1;
    const laneOffset = portrait ? -0.72 : DRIVE.laneOffset;
    samplePathFrame(
      progress + (portrait ? PORTRAIT_AHEAD_PHASE : LANDSCAPE_AHEAD_PHASE),
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
    return aspect < 1 ? PORTRAIT_FOV : LANDSCAPE_FOV;
  }
}

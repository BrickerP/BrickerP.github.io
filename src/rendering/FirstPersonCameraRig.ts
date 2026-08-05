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
const PORTRAIT_FOV = 74;
const LANDSCAPE_LOOK_HEIGHT = -0.08;
const PORTRAIT_LOOK_HEIGHT = -0.15;
// Normalized path fractions scaled for the 48s circuit so look-ahead metres
// stay comparable to the earlier 16s / 32s drives.
const LANDSCAPE_AHEAD_PHASE = 0.0175;
const PORTRAIT_AHEAD_PHASE = 0.0215;
const ASPECT_MIX_START = 0.75;
const ASPECT_MIX_END = 1.25;
const PORTRAIT_LANE_OFFSET = -0.72;
const PORTRAIT_FOCUS_MIX_START = 0.62;
const PORTRAIT_FOCUS_MIX_END = 0.9;
const CLEARANCE_LANE_OFFSET = -0.72;
const CLEARANCE_START_PHASE = 0.988;
const CLEARANCE_FADE_PHASE = 0.02;
const CLEARANCE_HOLD_PHASE = 0.06;
const BOB_CYCLES = 24;
const BOB_HEIGHT = 0.012;

export type DriveAnimationMode = 'cinematic' | 'graphic-poster' | 'breathing-city';

const CINEMATIC_ROLL = {
  actOne: 0.0065,
  actTwo: -0.004,
  actThree: 0.005,
} as const;

const CINEMATIC_LOOK_OFFSET = {
  actOne: -0.24,
  actTwo: -0.1,
  actThree: 0.2,
} as const;

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

function focusWindow(
  progress: number,
  start: number,
  full: number,
  release: number,
  end: number,
): number {
  return (
    smoothstep(start, full, progress) *
    (1 - smoothstep(release, end, progress))
  );
}

/** Smooth portrait-only framing cues calibrated to each left-side hero. */
function portraitLandmarkCue(
  progress: number,
  whiteDagoba: number,
  yonghegong: number,
  templeOfHeaven: number,
): number {
  return (
    focusWindow(progress, 0.167, 0.184, 0.232, 0.25) * whiteDagoba +
    focusWindow(progress, 0.583, 0.605, 0.648, 0.667) * yonghegong +
    focusWindow(progress, 0.75, 0.77, 0.815, 0.833) * templeOfHeaven
  );
}

/** Three-act rhythm cue used by the cinematic option. */
function cinematicActProfile(progress: number): {
  actOne: number;
  actTwo: number;
  actThree: number;
} {
  return {
    actOne: focusWindow(progress, 0.01, 0.10, 0.17, 0.26),
    actTwo: focusWindow(progress, 0.30, 0.44, 0.54, 0.64),
    actThree: focusWindow(progress, 0.72, 0.78, 0.88, 0.98),
  };
}

/** Pure phase-derived first-person camera for the closed authored drive path. */
export class FirstPersonCameraRig {
  readonly camera: PerspectiveCamera;

  private readonly lookTarget = new Vector3();
  private readonly currentFrame = samplePathFrame(0);
  private readonly futureFrame = samplePathFrame(0);
  private readonly animationMode: DriveAnimationMode;
  private aspect: number;

  constructor(aspect: number, animationMode: DriveAnimationMode = 'cinematic') {
    const safeAspect = Math.max(0.01, aspect);
    this.aspect = safeAspect;
    this.animationMode = animationMode;
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
    const portraitFocusMix =
      1 -
      smoothstep(
        PORTRAIT_FOCUS_MIX_START,
        PORTRAIT_FOCUS_MIX_END,
        this.aspect,
      );
    const portraitLookOffset =
      portraitLandmarkCue(progress, -2.4, -1.8, -1) * portraitFocusMix;
    const portraitFovBoost =
      portraitLandmarkCue(progress, 8, 14, 0) * portraitFocusMix;

    const { actOne, actTwo, actThree } =
      this.animationMode === 'cinematic'
        ? cinematicActProfile(progress)
        : {
            actOne: 0,
            actTwo: 0,
            actThree: 0,
          };
    const cinematicMix = this.animationMode === 'cinematic' ? 1 - this.aspectMix() : 0;

    const cinematicRoll = cinematicMix > 0
      ? (CINEMATIC_ROLL.actOne * actOne +
          CINEMATIC_ROLL.actTwo * actTwo +
          CINEMATIC_ROLL.actThree * actThree) * cinematicMix
      : 0;

    const cinematicLookOffset = cinematicMix > 0
      ? mix(
          mix(
            CINEMATIC_LOOK_OFFSET.actOne * actOne,
            CINEMATIC_LOOK_OFFSET.actTwo * actTwo,
            cinematicMix,
          ),
          CINEMATIC_LOOK_OFFSET.actThree * actThree,
          cinematicMix,
        )
      : 0;

    const posterLookBoost = this.animationMode === 'graphic-poster'
      ? 0.06
      : 0;
    const breathingLookBoost = this.animationMode === 'breathing-city'
      ? Math.sin(progress * Math.PI * 2) * 0.02
      : 0;
    const nextFov = this.fovForAspect(this.aspect) + portraitFovBoost;
    if (this.camera.fov !== nextFov) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
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
      DRIVE_EYE_HEIGHT + mix(
        PORTRAIT_LOOK_HEIGHT,
        LANDSCAPE_LOOK_HEIGHT,
        aspectMix,
      ),
      this.futureFrame.point.z * DRIVE_PATH_SCALE,
    );
    this.lookTarget.addScaledVector(
      this.futureFrame.normal,
      laneOffset + portraitLookOffset + cinematicLookOffset + posterLookBoost + breathingLookBoost,
    );
    this.camera.lookAt(this.lookTarget);
    this.camera.rotation.z = cinematicRoll;
    this.camera.updateMatrixWorld();
  }

  private fovForAspect(aspect: number): number {
    return mix(PORTRAIT_FOV, LANDSCAPE_FOV, this.aspectMix(aspect));
  }

  private aspectMix(aspect = this.aspect): number {
    return smoothstep(ASPECT_MIX_START, ASPECT_MIX_END, aspect);
  }
}

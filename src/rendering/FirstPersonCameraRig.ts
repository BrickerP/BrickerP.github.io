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

type CameraCueWeight = {
  lane: number;
  lookOffset: number;
  lookHeight: number;
  ahead: number;
  fov: number;
  roll: number;
  headingWeight: number;
};

interface CameraCueProfile extends CameraCueWeight {
  center: number;
  halfWidth: number;
}

interface CameraActProfile extends CameraCueWeight {
  start: number;
  full: number;
  release: number;
  end: number;
}

const LANDMARK_PROFILES: Array<CameraCueProfile> = [
  {
    center: 0.058,
    halfWidth: 0.022,
    lane: 0.16,
    lookOffset: -1.65,
    lookHeight: 0.008,
    ahead: 0.001,
    fov: 3.2,
    roll: 0.02,
    headingWeight: 1,
  },
  {
    center: 0.16,
    halfWidth: 0.015,
    lane: -0.06,
    lookOffset: -1.15,
    lookHeight: 0.002,
    ahead: 0.0008,
    fov: 1.8,
    roll: 0.012,
    headingWeight: 0.98,
  },
  {
    center: 0.248,
    halfWidth: 0.026,
    lane: 0.21,
    lookOffset: -2.1,
    lookHeight: -0.004,
    ahead: 0.002,
    fov: 4.8,
    roll: -0.01,
    headingWeight: 1,
  },
  {
    center: 0.329,
    halfWidth: 0.018,
    lane: -0.07,
    lookOffset: -1.45,
    lookHeight: 0.004,
    ahead: 0.001,
    fov: 2.2,
    roll: 0.01,
    headingWeight: 0.9,
  },
  {
    center: 0.367,
    halfWidth: 0.018,
    lane: 0.01,
    lookOffset: -1.58,
    lookHeight: 0.006,
    ahead: 0.0009,
    fov: 2.4,
    roll: 0.014,
    headingWeight: 0.88,
  },
  {
    center: 0.498,
    halfWidth: 0.02,
    lane: -0.12,
    lookOffset: 0.84,
    lookHeight: -0.002,
    ahead: 0.001,
    fov: 2.1,
    roll: -0.008,
    headingWeight: 0.82,
  },
  {
    center: 0.666,
    halfWidth: 0.024,
    lane: 0.18,
    lookOffset: -1.95,
    lookHeight: 0.001,
    ahead: 0.0016,
    fov: 4.2,
    roll: 0.012,
    headingWeight: 1,
  },
  {
    center: 0.746,
    halfWidth: 0.022,
    lane: -0.03,
    lookOffset: 0.22,
    lookHeight: -0.01,
    ahead: -0.0004,
    fov: 1.7,
    roll: -0.012,
    headingWeight: 0.75,
  },
  {
    center: 0.832,
    halfWidth: 0.028,
    lane: 0.14,
    lookOffset: -1.45,
    lookHeight: -0.004,
    ahead: 0.0017,
    fov: 5,
    roll: 0.016,
    headingWeight: 0.96,
  },
];

const ACT_PROFILES: Array<CameraActProfile> = [
  {
    start: 0,
    full: 0.09,
    release: 0.22,
    end: 0.33,
    lane: 0.14,
    lookOffset: -0.3,
    lookHeight: 0.006,
    ahead: 0.001,
    fov: 2.0,
    roll: 0.013,
    headingWeight: 1,
  },
  {
    start: 0.33,
    full: 0.43,
    release: 0.58,
    end: 0.67,
    lane: -0.02,
    lookOffset: 0,
    lookHeight: -0.002,
    ahead: 0.0005,
    fov: -0.2,
    roll: 0,
    headingWeight: 1,
  },
  {
    start: 0.67,
    full: 0.76,
    release: 0.91,
    end: 0.99,
    lane: -0.18,
    lookOffset: 0.2,
    lookHeight: -0.01,
    ahead: 0.0014,
    fov: 3.0,
    roll: -0.02,
    headingWeight: 1,
  },
];

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

function blendCues(progress: number): CameraCueWeight & { confidence: number } {
  let confidence = 0;
  const accum: CameraCueWeight = {
    lane: 0,
    lookOffset: 0,
    lookHeight: 0,
    ahead: 0,
    fov: 0,
    roll: 0,
    headingWeight: 0,
  };

  for (const cue of LANDMARK_PROFILES) {
    const weight = focusWindow(
      progress,
      cue.center - cue.halfWidth,
      cue.center - cue.halfWidth * 0.5,
      cue.center + cue.halfWidth * 0.5,
      cue.center + cue.halfWidth,
    );
    confidence += weight;
    accum.lane += cue.lane * weight;
    accum.lookOffset += cue.lookOffset * weight;
    accum.lookHeight += cue.lookHeight * weight;
    accum.ahead += cue.ahead * weight;
    accum.fov += cue.fov * weight;
    accum.roll += cue.roll * weight;
    accum.headingWeight += cue.headingWeight * weight;
  }

  if (confidence <= 0.0001) {
    return { ...accum, headingWeight: 1, confidence: 0 };
  }

  const inv = 1 / confidence;
  return {
    lane: accum.lane * inv,
    lookOffset: accum.lookOffset * inv,
    lookHeight: accum.lookHeight * inv,
    ahead: accum.ahead * inv,
    fov: accum.fov * inv,
    roll: accum.roll * inv,
    headingWeight: accum.headingWeight * inv,
    confidence,
  };
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

function blendActs(progress: number): CameraCueWeight & { confidence: number } {
  let confidence = 0;
  const accum: CameraCueWeight = {
    lane: 0,
    lookOffset: 0,
    lookHeight: 0,
    ahead: 0,
    fov: 0,
    roll: 0,
    headingWeight: 0,
  };

  for (const act of ACT_PROFILES) {
    const weight = focusWindow(progress, act.start, act.full, act.release, act.end);
    confidence += weight;
    accum.lane += act.lane * weight;
    accum.lookOffset += act.lookOffset * weight;
    accum.lookHeight += act.lookHeight * weight;
    accum.ahead += act.ahead * weight;
    accum.fov += act.fov * weight;
    accum.roll += act.roll * weight;
    accum.headingWeight += act.headingWeight * weight;
  }

  if (confidence <= 0.0001) {
    return { ...accum, confidence: 0, headingWeight: 1 };
  }

  const inv = 1 / confidence;
  return {
    lane: accum.lane * inv,
    lookOffset: accum.lookOffset * inv,
    lookHeight: accum.lookHeight * inv,
    ahead: accum.ahead * inv,
    fov: accum.fov * inv,
    roll: accum.roll * inv,
    headingWeight: accum.headingWeight * inv,
    confidence,
  };
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
    const portraitFocusMix =
      1 -
      smoothstep(
        PORTRAIT_FOCUS_MIX_START,
        PORTRAIT_FOCUS_MIX_END,
        this.aspect,
      );

    const acts = blendActs(progress);
    const landmarks = blendCues(progress);
    const motionEnergy = Math.min(1, (acts.confidence + landmarks.confidence) * 1.1);
    const cinematicWeight = mix(
      0,
      (acts.headingWeight + landmarks.headingWeight) * 0.5,
      portraitFocusMix,
    );

    const laneAct = mix(acts.lane, acts.lane + landmarks.lane, landmarks.confidence);
    const lookOffsetAct =
      mix(acts.lookOffset, acts.lookOffset + landmarks.lookOffset, landmarks.confidence);
    const lookHeightAct =
      mix(acts.lookHeight, acts.lookHeight + landmarks.lookHeight, landmarks.confidence);
    const aheadAct = mix(acts.ahead, acts.ahead + landmarks.ahead, landmarks.confidence);
    const rollAct =
      mix(acts.roll, acts.roll + landmarks.roll, landmarks.confidence) *
      landmarks.headingWeight;

    const cinematicLane = laneAct * cinematicWeight * motionEnergy;
    const landmarkLookOffset = portraitLandmarkCue(progress, -2.4, -1.8, -1);
    const cinematicLookOffset =
      lookOffsetAct * cinematicWeight * motionEnergy +
      landmarkLookOffset * portraitFocusMix;
    const cinematicLookHeight = lookHeightAct * cinematicWeight * motionEnergy;
    const cinematicAhead = aheadAct * cinematicWeight * motionEnergy;
    const cinematicRoll = rollAct * cinematicWeight * motionEnergy;

    const baseLaneOffset = mix(
      PORTRAIT_LANE_OFFSET,
      DRIVE.laneOffset,
      aspectMix,
    );
    const clearanceMix = centralAxisClearanceMix(progress);
    const laneOffsetBase = mix(
      baseLaneOffset,
      CLEARANCE_LANE_OFFSET,
      clearanceMix,
    );
    const laneOffset = laneOffsetBase + cinematicLane;
    const aheadPhase =
      mix(
        PORTRAIT_AHEAD_PHASE,
        LANDSCAPE_AHEAD_PHASE,
        aspectMix,
      ) + cinematicAhead;

    const nextFov =
      this.fovForAspect(this.aspect) +
      portraitLandmarkCue(progress, 8, 14, 0) * portraitFocusMix;
    if (this.camera.fov !== nextFov) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
    samplePathFrame(progress + aheadPhase, this.futureFrame);

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
      ) + cinematicLookHeight,
      this.futureFrame.point.z * DRIVE_PATH_SCALE,
    );
    this.lookTarget.addScaledVector(
      this.futureFrame.normal,
      laneOffset + cinematicLookOffset,
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

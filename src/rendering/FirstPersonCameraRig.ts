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

/** Three-act film grammar with minimal code: push-in, drift, then pull-off. */
function blendActProfile(progress: number): CameraCueWeight & { confidence: number } {
  const actA = focusWindow(progress, 0, 0.09, 0.22, 0.33);
  const actB = focusWindow(progress, 0.33, 0.43, 0.58, 0.67);
  const actC = focusWindow(progress, 0.67, 0.76, 0.91, 0.99);
  const confidence = actA + actB + actC;
  if (confidence <= 0.0001) {
    return { lane: 0, lookOffset: 0, lookHeight: 0, ahead: 0, fov: 0, roll: 0, headingWeight: 1, confidence: 0 };
  }
  return {
    lane: (0.14 * actA + -0.02 * actB + -0.18 * actC) / confidence,
    lookOffset: (-0.3 * actA + 0 * actB + 0.2 * actC) / confidence,
    lookHeight: (0.006 * actA + -0.002 * actB + -0.01 * actC) / confidence,
    ahead: (0.001 * actA + 0.0005 * actB + 0.0014 * actC) / confidence,
    fov: (2.0 * actA + -0.2 * actB + 3.0 * actC) / confidence,
    roll: (0.013 * actA + 0 * actB + -0.02 * actC) / confidence,
    headingWeight: 1,
    confidence,
  };
}

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
  const dagoba = focusWindow(progress, 0.036, 0.047, 0.073, 0.08);
  const yonghegong = focusWindow(progress, 0.145, 0.1525, 0.1675, 0.175);
  const cityGate = focusWindow(progress, 0.23, 0.239, 0.257, 0.266);
  const archerTower = focusWindow(progress, 0.321, 0.331, 0.338, 0.347);
  const arrowBridge = focusWindow(progress, 0.358, 0.367, 0.376, 0.386);
  const cbdEdge = focusWindow(progress, 0.642, 0.654, 0.678, 0.69);
  const bridgeNorth = focusWindow(progress, 0.724, 0.735, 0.757, 0.768);
  const temple = focusWindow(progress, 0.804, 0.818, 0.844, 0.86);
  const confidence =
    dagoba +
    yonghegong +
    cityGate +
    archerTower +
    arrowBridge +
    cbdEdge +
    bridgeNorth +
    temple;
  if (confidence <= 0.0001) {
    return {
      lane: 0,
      lookOffset: 0,
      lookHeight: 0,
      ahead: 0,
      fov: 0,
      roll: 0,
      headingWeight: 1,
      confidence: 0,
    };
  }
  return {
    lane:
      (0.16 * dagoba +
        -0.06 * yonghegong +
        0.21 * cityGate +
        -0.07 * archerTower +
        0.01 * arrowBridge +
        0.18 * cbdEdge +
        -0.03 * bridgeNorth +
        0.14 * temple) / confidence,
    lookOffset:
      (-1.65 * dagoba +
        -1.15 * yonghegong +
        -2.1 * cityGate +
        -1.45 * archerTower +
        -1.58 * arrowBridge +
        -1.95 * cbdEdge +
        0.22 * bridgeNorth +
        -1.45 * temple) / confidence,
    lookHeight:
      (0.008 * dagoba +
        0.002 * yonghegong +
        -0.004 * cityGate +
        0.004 * archerTower +
        0.006 * arrowBridge +
        0.001 * cbdEdge +
        -0.01 * bridgeNorth +
        -0.004 * temple) / confidence,
    ahead:
      (0.001 * dagoba +
        0.0008 * yonghegong +
        0.002 * cityGate +
        0.001 * archerTower +
        0.0009 * arrowBridge +
        0.0016 * cbdEdge +
        -0.0004 * bridgeNorth +
        0.0017 * temple) / confidence,
    fov:
      (3.2 * dagoba +
        1.8 * yonghegong +
        4.8 * cityGate +
        2.2 * archerTower +
        2.4 * arrowBridge +
        4.2 * cbdEdge +
        1.7 * bridgeNorth +
        5 * temple) / confidence,
    roll:
      (0.02 * dagoba +
        0.012 * yonghegong +
        -0.01 * cityGate +
        0.01 * archerTower +
        0.014 * arrowBridge +
        0.0 * cbdEdge +
        -0.012 * bridgeNorth +
        0.016 * temple) / confidence,
    headingWeight: 1,
    confidence: confidence,
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

    const acts = blendActProfile(progress);
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

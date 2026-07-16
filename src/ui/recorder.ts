import { DRIVE } from '../rendering/theme';

export const RECORDING_FPS = 60;
export const RECORDING_FRAME_COUNT = Math.round(DRIVE.duration * RECORDING_FPS);

export interface RecordingTick {
  /** Wall-clock time since MediaRecorder started. */
  elapsedSeconds: number;
  /** Exact deterministic scene time represented by this capture frame. */
  sceneSeconds: number;
  frameIndex: number;
  totalFrames: number;
}

export interface RecordingResult {
  status: 'complete' | 'cancelled' | 'failed';
  elapsedSeconds: number;
  finalSceneSeconds: number;
  finalFrameIndex: number;
  totalFrames: number;
  blobSize: number;
  trackCount: number;
  tracksStopped: number;
  error?: string;
}

export type RecordingStartResult =
  | { started: true }
  | { started: false; error: string };

type StopStatus = RecordingResult['status'];

const WEBM_MIME_CANDIDATES = [
  'video/webm;codecs=vp8',
  'video/webm;codecs=vp9',
  'video/webm',
] as const;

// `MediaRecorder.stop()` may overtake the canvas capture / video encoder on
// software-rendered CI. Keep the already-rendered terminal frame unchanged
// while the encoder drains; this does not add another scene frame.
const COMPLETE_ENCODER_DRAIN_MS = 180;

/** Records one deterministic street circuit as a WebM download. */
export class LoopRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTime = 0;
  private raf = 0;
  private flushTimer = 0;
  private completionPending = false;
  private mime = 'video/webm';
  private requestedStatus: StopStatus | null = null;
  private failureMessage: string | undefined;
  private onDone: ((result: RecordingResult) => void) | null = null;
  private lastTick: RecordingTick = frameTick(0, 0);
  private finalized = false;

  get active(): boolean {
    return this.recorder !== null;
  }

  elapsed(): number {
    return this.active ? Math.max(0, (performance.now() - this.startTime) / 1000) : 0;
  }

  isSupported(canvas: HTMLCanvasElement): boolean {
    if (
      typeof MediaRecorder === 'undefined' ||
      typeof canvas.captureStream !== 'function'
    ) {
      return false;
    }
    return (
      typeof MediaRecorder.isTypeSupported !== 'function' ||
      pickMime() !== undefined
    );
  }

  start(
    canvas: HTMLCanvasElement,
    onTick: (tick: RecordingTick) => void,
    onDone: (result: RecordingResult) => void,
  ): RecordingStartResult {
    if (this.active) {
      return { started: false, error: 'A recording is already in progress.' };
    }
    if (!this.isSupported(canvas)) {
      return {
        started: false,
        error: 'This browser cannot capture the canvas as WebM video.',
      };
    }

    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    try {
      stream = canvas.captureStream(RECORDING_FPS);
      const mime = pickMime();
      recorder = new MediaRecorder(stream, {
        videoBitsPerSecond: 2_000_000,
        ...(mime ? { mimeType: mime } : {}),
      });
      const recorderMime =
        typeof recorder.mimeType === 'string' ? recorder.mimeType.trim() : '';
      const actualMime = recorderMime || mime || '';
      if (!isWebmMime(actualMime)) {
        stopStreamTracks(stream);
        return {
          started: false,
          error: `The browser selected ${actualMime || 'an unknown format'} instead of a WebM container.`,
        };
      }
      this.mime = actualMime;
    } catch (error) {
      stopStreamTracks(stream);
      return {
        started: false,
        error: errorMessage(error, 'The browser could not create a video recorder.'),
      };
    }

    this.stream = stream;
    this.recorder = recorder;
    this.chunks = [];
    this.requestedStatus = null;
    this.completionPending = false;
    this.failureMessage = undefined;
    this.onDone = onDone;
    this.lastTick = frameTick(0, 0);
    this.finalized = false;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    recorder.onerror = (event) => {
      const mediaError = 'error' in event && event.error instanceof Error ? event.error.message : '';
      this.failureMessage = mediaError || 'The browser stopped the recording unexpectedly.';
      this.stop('failed');
    };
    recorder.onstop = () => this.finalize();

    try {
      this.startTime = performance.now();
      recorder.start();
    } catch (error) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      this.recorder = null;
      this.stream = null;
      this.onDone = null;
      stopStreamTracks(stream);
      return {
        started: false,
        error: errorMessage(error, 'The browser could not start video recording.'),
      };
    }

    // Render frame zero synchronously so the stream begins at the canonical seam.
    try {
      onTick(this.lastTick);
    } catch (error) {
      return this.abortStart(
        errorMessage(error, 'The first recording frame could not be rendered.'),
      );
    }
    this.raf = requestAnimationFrame(() => this.tick(onTick));
    return { started: true };
  }

  stop(status: StopStatus = 'cancelled'): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    clearTimeout(this.flushTimer);
    this.flushTimer = 0;
    this.completionPending = false;
    if (!this.recorder) return;

    if (this.requestedStatus !== 'failed') this.requestedStatus = status;
    try {
      if (this.recorder.state !== 'inactive') {
        this.recorder.stop();
      } else {
        this.finalize();
      }
    } catch (error) {
      this.requestedStatus = 'failed';
      this.failureMessage = error instanceof Error ? error.message : 'Recording could not stop.';
      this.finalize();
    }
  }

  private tick(onTick: (tick: RecordingTick) => void): void {
    if (!this.active) return;

    const elapsedSeconds = this.elapsed();
    const frameIndex = Math.min(
      RECORDING_FRAME_COUNT - 1,
      Math.floor(elapsedSeconds * RECORDING_FPS),
    );
    this.lastTick = frameTick(elapsedSeconds, frameIndex);
    try {
      onTick(this.lastTick);
    } catch (error) {
      this.failureMessage = errorMessage(
        error,
        'A recording frame could not be rendered.',
      );
      this.stop('failed');
      return;
    }

    if (elapsedSeconds >= DRIVE.duration) {
      // Reaching the terminal frame is not yet proof of a completed recording.
      // Keep requestedStatus unset until our own post-drain stop call; an
      // unsolicited `stop` event during this window must finalize as failed.
      this.completionPending = true;
      // Automatic captureStream(60) sampling remains authoritative throughout
      // the lap. Request only this final, non-duplicate frame explicitly so a
      // slow compositor cannot leave it behind when recording stops.
      requestTerminalFrame(this.stream);
      // Cross one paint boundary before asking MediaRecorder to flush. Then keep
      // the canvas unchanged for a short encoder-drain window before stopping.
      this.raf = requestAnimationFrame(() => this.flushCompleteRecording());
      return;
    }

    this.raf = requestAnimationFrame(() => this.tick(onTick));
  }

  private flushCompleteRecording(): void {
    this.raf = 0;
    if (!this.recorder || !this.completionPending) return;

    requestRecorderData(this.recorder);
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = 0;
      if (!this.recorder || !this.completionPending) return;
      requestRecorderData(this.recorder);
      this.stop('complete');
    }, COMPLETE_ENCODER_DRAIN_MS);
  }

  private finalize(): void {
    if (this.finalized) return;
    this.finalized = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    clearTimeout(this.flushTimer);
    this.flushTimer = 0;
    this.completionPending = false;

    const elapsedSeconds = Math.max(0, (performance.now() - this.startTime) / 1000);
    const blob = new Blob(this.chunks, { type: this.mime.split(';')[0] });
    let status = this.requestedStatus;
    if (!status) {
      status = 'failed';
      this.failureMessage ??= 'The browser stopped the recording unexpectedly.';
    }
    if (status === 'complete' && blob.size === 0) {
      status = 'failed';
      this.failureMessage = 'The browser produced an empty recording.';
    }
    const trackResult = stopStreamTracks(this.stream);
    const done = this.onDone;
    const result: RecordingResult = {
      status,
      elapsedSeconds,
      finalSceneSeconds: this.lastTick.sceneSeconds,
      finalFrameIndex: this.lastTick.frameIndex,
      totalFrames: RECORDING_FRAME_COUNT,
      blobSize: blob.size,
      trackCount: trackResult.trackCount,
      tracksStopped: trackResult.tracksStopped,
      ...(this.failureMessage ? { error: this.failureMessage } : {}),
    };

    const recorder = this.recorder;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
    }
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    this.onDone = null;

    if (status === 'complete' && blob.size > 0) {
      download(blob, 'beijing-first-person-loop.webm');
    }
    done?.(result);
  }

  private abortStart(error: string): { started: false; error: string } {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    clearTimeout(this.flushTimer);
    this.flushTimer = 0;
    this.completionPending = false;
    const recorder = this.recorder;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        // The capture tracks are stopped below even if MediaRecorder cannot stop.
      }
    }
    stopStreamTracks(this.stream);
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    this.onDone = null;
    this.requestedStatus = null;
    this.failureMessage = undefined;
    this.finalized = true;
    return { started: false, error };
  }
}

function requestTerminalFrame(stream: MediaStream | null): void {
  const track = stream?.getVideoTracks()[0] as
    | (MediaStreamTrack & { requestFrame?: () => void })
    | undefined;
  try {
    track?.requestFrame?.();
  } catch {
    // The following paint and recorder flush remain the compatibility path.
  }
}

function requestRecorderData(recorder: MediaRecorder): void {
  try {
    if (recorder.state !== 'inactive') recorder.requestData();
  } catch {
    // `stop()` still flushes the final data chunk on conforming implementations.
  }
}

function frameTick(elapsedSeconds: number, frameIndex: number): RecordingTick {
  return {
    elapsedSeconds,
    sceneSeconds: frameIndex / RECORDING_FPS,
    frameIndex,
    totalFrames: RECORDING_FRAME_COUNT,
  };
}

function stopStreamTracks(stream: MediaStream | null): {
  trackCount: number;
  tracksStopped: number;
} {
  const tracks = stream?.getTracks() ?? [];
  let tracksStopped = 0;
  for (const track of tracks) {
    try {
      track.stop();
      tracksStopped += 1;
    } catch {
      // Continue so one bad track cannot leak the remaining tracks.
    }
  }
  return { trackCount: tracks.length, tracksStopped };
}

function pickMime(): string | undefined {
  if (
    typeof MediaRecorder === 'undefined' ||
    typeof MediaRecorder.isTypeSupported !== 'function'
  ) {
    return undefined;
  }
  for (const candidate of WEBM_MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function isWebmMime(mime: string): boolean {
  return /^video\/webm(?:\s*;|$)/i.test(mime.trim());
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

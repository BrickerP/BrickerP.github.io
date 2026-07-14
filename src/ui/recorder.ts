import { FRACTAL } from '../rendering/theme';

/**
 * Records exactly one fractal cycle (FRACTAL.duration seconds) of the canvas
 * into a WebM using canvas.captureStream() + MediaRecorder, then triggers a
 * download of `beijing-infinite-loop.webm`. Recording begins only once the
 * caller has reset the sim to phase 0 (see main.ts), so the clip loops
 * seamlessly.
 */
export class LoopRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTime = 0;
  private raf = 0;

  get active(): boolean {
    return this.recorder !== null;
  }

  /** Seconds elapsed in the current recording. */
  elapsed(): number {
    return this.active ? (performance.now() - this.startTime) / 1000 : 0;
  }

  isSupported(canvas: HTMLCanvasElement): boolean {
    return (
      typeof MediaRecorder !== 'undefined' &&
      typeof canvas.captureStream === 'function'
    );
  }

  /**
   * @param canvas   the p5 WEBGL canvas
   * @param onTick   called ~30x/s with elapsed seconds (for UI)
   * @param onDone   called when the clip has been downloaded
   */
  start(
    canvas: HTMLCanvasElement,
    onTick: (s: number) => void,
    onDone: () => void,
  ): boolean {
    if (this.active || !this.isSupported(canvas)) return false;
    const stream = canvas.captureStream(60);
    const mime = pickMime();
    try {
      this.recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 6_000_000,
      });
    } catch {
      return false;
    }
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: mime.split(';')[0] });
      download(blob, 'beijing-infinite-loop.webm');
      this.recorder = null;
      onDone();
    };

    this.startTime = performance.now();
    this.recorder.start();

    const tick = () => {
      if (!this.active) return;
      const e = this.elapsed();
      onTick(e);
      if (e >= FRACTAL.duration) {
        this.stop();
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    return true;
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
  }
}

function pickMime(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return 'video/webm';
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

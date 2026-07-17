import './styles/main.css';
import { BeijingLoopApp, type AppState } from './app/BeijingLoopApp';
import { AboutPanel } from './ui/about';
import { Controls } from './ui/controls';
import {
  LoopRecorder,
  RECORDING_FRAME_COUNT,
  type RecordingResult,
  type RecordingTick,
} from './ui/recorder';

interface RecordingTelemetry {
  active: boolean;
  status: 'idle' | 'recording' | RecordingResult['status'];
  elapsedSeconds: number;
  sceneSeconds: number;
  frameIndex: number;
  totalFrames: number;
  previousPlaying: boolean;
  error?: string;
  result?: RecordingResult;
}

interface BeijingLoopTestHook {
  seek(seconds: number): void;
  readState(): AppState;
  startRecording(): void;
  readRecording(): RecordingTelemetry;
  readCapturePerformance(): ReturnType<
    BeijingLoopApp['readCapturePerformanceState']
  >;
  redraw(): void;
}

declare global {
  interface Window {
    __BEIJING_LOOP_TEST__?: BeijingLoopTestHook;
  }
}

const mount = requireMount('app');

function requireMount(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id} mount`);
  return element;
}

const boot = document.createElement('div');
boot.className = 'boot';
boot.setAttribute('role', 'status');
boot.setAttribute('aria-live', 'polite');
boot.setAttribute('aria-atomic', 'true');
boot.textContent = 'Beijing endless drive — preparing the road';
mount.appendChild(boot);

function showBootError(message: string): void {
  boot.className = 'boot error';
  boot.setAttribute('role', 'alert');
  boot.setAttribute('aria-live', 'assertive');
  boot.setAttribute('aria-atomic', 'true');
  boot.textContent = message;
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

function fullscreenAvailable(): boolean {
  return (
    typeof document.documentElement.requestFullscreen === 'function' &&
    typeof document.exitFullscreen === 'function'
  );
}

function main(): void {
  if (!webglAvailable()) {
    showBootError(
      'This visualization needs WebGL, which is unavailable or disabled in this browser. ' +
        'Enable hardware acceleration / WebGL and reload.',
    );
    return;
  }

  const reducedMotion =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  let app: BeijingLoopApp;
  try {
    app = new BeijingLoopApp(mount, reducedMotion);
  } catch (error) {
    showBootError(
      'The first-person scene could not start. Try reloading with hardware acceleration enabled. ' +
        (error instanceof Error ? error.message : ''),
    );
    return;
  }

  const canvas = app.canvas;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute(
    'aria-label',
    'A seamless first-person night drive through an imagined Beijing',
  );
  canvas.setAttribute('aria-describedby', 'artwork-description');
  boot.remove();

  const recorder = new LoopRecorder();
  let frameRequest = 0;
  let lastTime = performance.now();
  let recordingPreviousPlaying = false;
  let unloading = false;
  let recordingTelemetry: RecordingTelemetry = {
    active: false,
    status: 'idle',
    elapsedSeconds: 0,
    sceneSeconds: 0,
    frameIndex: 0,
    totalFrames: RECORDING_FRAME_COUNT,
    previousPlaying: false,
  };
  const capabilities = {
    recording: recorder.isSupported(canvas),
    fullscreen: fullscreenAvailable(),
  };

  const about = new AboutPanel(mount, {
    onClose: () => closeAbout(),
  });

  const controls = new Controls(mount, {
    onTogglePlay: () => {
      if (recorder.active || about.isOpen) return;
      app.togglePlay();
      app.render();
      controls.sync(app.state);
      if (app.state.playing) requestFrame();
    },
    onToggleFullscreen: () => {
      if (about.isOpen) return;
      toggleFullscreen();
    },
    onRecord: () => toggleRecording(),
    onAbout: () => toggleAbout(),
  });
  controls.setCapabilities(capabilities);
  controls.sync(app.state);
  app.onStateChange((state) => controls.sync(state));

  function openAbout(): void {
    if (recorder.active || about.isOpen) return;
    about.open(controls.aboutControl());
    controls.setAboutOpen(true);
    controls.announce('Personal intro opened.');
  }

  function closeAbout(): void {
    if (!about.isOpen) return;
    about.close();
    controls.setAboutOpen(false);
    controls.announce('Personal intro closed.');
  }

  function toggleAbout(): void {
    if (about.isOpen) closeAbout();
    else openAbout();
  }

  function requestFrame(): void {
    if (frameRequest === 0 && !document.hidden && !recorder.active) {
      frameRequest = requestAnimationFrame(drawFrame);
    }
  }

  function drawFrame(now: number): void {
    frameRequest = 0;
    if (recorder.active) return;
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 1 / 60;
    app.update(dt);
    controls.syncDebug(app.state);
    if (app.state.playing) requestFrame();
  }

  function toggleRecording(): void {
    if (recorder.active) {
      cancelRecording();
      return;
    }
    startRecording();
  }

  function cancelRecording(): void {
    if (!recorder.active) return;
    recorder.stop('cancelled');
  }

  function startRecording(): void {
    if (recorder.active) return;
    if (about.isOpen) closeAbout();
    if (!capabilities.recording) {
      controls.announce(
        'Recording is unavailable because this browser cannot capture WebM video.',
      );
      return;
    }

    recordingPreviousPlaying = app.state.playing;
    recordingTelemetry = {
      active: true,
      status: 'recording',
      elapsedSeconds: 0,
      sceneSeconds: 0,
      frameIndex: 0,
      totalFrames: RECORDING_FRAME_COUNT,
      previousPlaying: recordingPreviousPlaying,
    };

    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    app.setPlaying(false);
    app.setDeterministicCapture(true);
    app.seekToCycleStart();

    const startResult = recorder.start(
      canvas,
      (tick) => updateRecordingFrame(tick),
      (result) => finishRecording(result),
    );
    if (!startResult.started) {
      recordingTelemetry = {
        ...recordingTelemetry,
        active: false,
        status: 'failed',
        error: startResult.error,
      };
      controls.setRecording(false);
      app.setDeterministicCapture(false);
      app.seekToCycleStart();
      app.setPlaying(recordingPreviousPlaying);
      app.render();
      controls.announce(
        `Recording could not start: ${startResult.error} No video was created.`,
      );
      lastTime = performance.now();
      if (app.state.playing) requestFrame();
      return;
    }
    controls.setRecording(true, 0);
  }

  function updateRecordingFrame(tick: RecordingTick): void {
    // The recording wall clock maps directly to a canonical 60fps frame index.
    // Ordinary `update(dt)` never runs during capture, so stalls cannot shorten
    // the travelled loop or double-advance the camera.
    app.seek(tick.sceneSeconds);
    recordingTelemetry = {
      ...recordingTelemetry,
      active: true,
      status: 'recording',
      elapsedSeconds: tick.elapsedSeconds,
      sceneSeconds: tick.sceneSeconds,
      frameIndex: tick.frameIndex,
      totalFrames: tick.totalFrames,
    };
    controls.setRecording(true, tick.elapsedSeconds);
    controls.syncDebug(app.state);
  }

  function finishRecording(result: RecordingResult): void {
    recordingTelemetry = {
      ...recordingTelemetry,
      active: false,
      status: result.status,
      elapsedSeconds: result.elapsedSeconds,
      sceneSeconds: result.finalSceneSeconds,
      frameIndex: result.finalFrameIndex,
      totalFrames: result.totalFrames,
      result: { ...result },
    };
    if (unloading) return;

    controls.setRecording(false);
    app.setDeterministicCapture(false);
    app.seekToCycleStart();
    app.setPlaying(recordingPreviousPlaying);
    app.render();
    controls.sync(app.state);
    lastTime = performance.now();

    if (result.status === 'complete') {
      controls.announce('Recording complete. The 48-second WebM loop is ready.');
    } else if (result.status === 'cancelled') {
      controls.announce('Recording cancelled. No video was downloaded.');
    } else if (result.status === 'failed') {
      controls.announce(
        result.error
          ? `Recording failed: ${result.error}`
          : 'Recording failed. No complete video was created.',
      );
    }
    if (app.state.playing) requestFrame();
  }

  function toggleFullscreen(): void {
    if (!capabilities.fullscreen) {
      controls.announce('Fullscreen is unavailable in this browser.');
      return;
    }
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen?.()
        .catch((error) => {
          console.warn('Could not enter fullscreen:', error);
          controls.announce('Could not enter fullscreen. The browser denied the request.');
        });
    } else {
      document
        .exitFullscreen?.()
        .catch((error) => {
          console.warn('Could not exit fullscreen:', error);
          controls.announce('Could not exit fullscreen. The browser denied the request.');
        });
    }
  }

  window.addEventListener('resize', () => {
    app.resize(
      window.innerWidth,
      window.innerHeight,
      window.devicePixelRatio || 1,
    );
  });

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (about.isOpen) return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.closest('button, a, input, select, textarea, [role="button"]'))
    ) {
      return;
    }

    switch (event.key) {
      case ' ':
        event.preventDefault();
        if (recorder.active) break;
        app.togglePlay();
        app.render();
        if (app.state.playing) requestFrame();
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case 'd':
      case 'D':
        app.toggleDebug();
        controls.sync(app.state);
        controls.syncDebug(app.state);
        break;
      case 'r':
      case 'R':
        toggleRecording();
        break;
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frameRequest);
      frameRequest = 0;
    } else {
      lastTime = performance.now();
      app.render();
      if (app.state.playing) requestFrame();
    }
  });

  const qaEnabled =
    import.meta.env.DEV || new URLSearchParams(window.location.search).get('qa') === '1';
  if (qaEnabled) {
    window.__BEIJING_LOOP_TEST__ = {
      seek(seconds: number) {
        if (recorder.active) return;
        app.setPlaying(false);
        app.seek(seconds);
        lastTime = performance.now();
        controls.sync(app.state);
        controls.syncDebug(app.state);
      },
      readState: () => ({ ...app.state }),
      startRecording: () => startRecording(),
      readRecording: () => ({
        ...recordingTelemetry,
        ...(recordingTelemetry.result
          ? { result: { ...recordingTelemetry.result } }
          : {}),
      }),
      readCapturePerformance: () => app.readCapturePerformanceState(),
      redraw: () => app.render(),
    };
  }

  window.addEventListener(
    'beforeunload',
    () => {
      unloading = true;
      cancelAnimationFrame(frameRequest);
      recorder.stop();
      app.dispose();
    },
    { once: true },
  );

  if (app.state.playing) requestFrame();
}

main();

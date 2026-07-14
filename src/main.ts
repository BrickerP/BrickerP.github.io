import p5 from 'p5';
import './styles/main.css';
import { loadBeijingMap } from './data/mapLoader';
import { BeijingLoopApp } from './app/BeijingLoopApp';
import { Controls } from './ui/controls';
import { LoopRecorder } from './ui/recorder';
import type { ViewMode } from './rendering/theme';

const mount = document.getElementById('app')!;

// boot message while data + p5 initialise
const boot = document.createElement('div');
boot.className = 'boot';
boot.textContent = 'Beijing Infinite Loop — loading';
mount.appendChild(boot);

const prefersReduced =
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Detect WebGL support up front so we can show a message instead of a blank canvas. */
function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(
      c.getContext('webgl2') ||
      c.getContext('webgl') ||
      c.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  if (!webglAvailable()) {
    boot.className = 'boot error';
    boot.textContent =
      'This visualization needs WebGL, which is unavailable or disabled in this browser. ' +
      'Enable hardware acceleration / WebGL and reload.';
    return;
  }

  let map;
  try {
    map = await loadBeijingMap();
  } catch (err) {
    boot.className = 'boot error';
    boot.textContent =
      'Could not load map data. Try running `npm run gen:map`, then reload. ' +
      (err instanceof Error ? err.message : '');
    return;
  }

  const app = new BeijingLoopApp(map, prefersReduced);
  const recorder = new LoopRecorder();
  let controls: Controls;
  let lastT = performance.now();
  let hidden = document.hidden;
  let canvasEl: HTMLCanvasElement | null = null;

  // p5 in instance mode so nothing leaks onto window and TS stays happy.
  const sketch = (p: p5) => {
    p.setup = () => {
      const c = p.createCanvas(window.innerWidth, window.innerHeight, p.WEBGL);
      canvasEl = (c as unknown as { elt: HTMLCanvasElement }).elt;
      const density = Math.min(window.devicePixelRatio || 1, 2);
      p.pixelDensity(prefersReduced ? 1 : density);
      p.setAttributes('antialias', true);
      app.applyPerspective(p);
      boot.remove();
    };

    p.draw = () => {
      const now = performance.now();
      let dt = (now - lastT) / 1000;
      lastT = now;
      // guard against huge dt right after the tab becomes visible again
      if (dt > 0.1) dt = 1 / 60;

      app.state.fps = p.frameRate();
      app.update(p, dt);
      controls?.syncDebug(app.state);
    };

    p.windowResized = () => {
      p.resizeCanvas(window.innerWidth, window.innerHeight);
      const density = Math.min(window.devicePixelRatio || 1, 2);
      p.pixelDensity(prefersReduced ? 1 : density);
      app.applyPerspective(p);
    };
  };

  const instance = new p5(sketch, mount);

  // --- UI wiring --------------------------------------------------------
  const cb = {
    onTogglePlay: () => app.togglePlay(),
    onSetMode: (m: ViewMode) => app.setMode(m),
    onToggleFullscreen: () => toggleFullscreen(),
    onToggleDebug: () => app.toggleDebug(),
    onRecord: () => startRecording(),
  };
  controls = new Controls(mount, cb);
  controls.sync(app.state);
  app.onStateChange((s) => controls.sync(s));

  function startRecording(): void {
    if (!canvasEl || recorder.active) return;
    // reset the sim to phase 0 so the clip is a clean, seamless cycle
    app.seekToCycleStart();
    app.setPlaying(true);
    const ok = recorder.start(
      canvasEl,
      (s) => controls.setRecording(true, s),
      () => controls.setRecording(false),
    );
    if (!ok) {
      alert('Recording is not supported in this browser.');
      return;
    }
    controls.setRecording(true, 0);
  }

  // --- keyboard ---------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case ' ':
        e.preventDefault();
        app.togglePlay();
        break;
      case '1':
        app.setMode('follow');
        break;
      case '2':
        app.setMode('overview');
        break;
      case '3':
        app.setMode('fractal');
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case 'd':
      case 'D':
        app.toggleDebug();
        break;
      case 'r':
      case 'R':
        startRecording();
        break;
    }
  });

  // --- visibility: pause the loop when the tab is hidden ----------------
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hidden = true;
      instance.noLoop();
    } else if (hidden) {
      hidden = false;
      lastT = performance.now(); // avoid a huge dt on resume
      instance.loop();
    }
  });

  function toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }
}

void main();

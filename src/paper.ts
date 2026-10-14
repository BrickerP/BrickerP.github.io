/**
 * Living paper — the homepage grid gains a local ripple under the cursor.
 *
 * A coarse wave field on the grid's own 24px cell steps with a damped 2D
 * wave equation. Pointer motion injects energy; a click drops a spot of
 * ink plus a stronger impulse; pressing `K` splashes ink across the sheet.
 * While the field or the ink is alive this module paints the full graph
 * paper on a fixed canvas; once it settles the canvas clears and the CSS
 * background takes over again, so an idle page costs nothing. Mouse only,
 * and never under reduced motion.
 */

const PAPER = '#F6F1E4';
const INK = '31,58,95';
/** Wave-field spacing — aligned with the fine 24px grid. */
const CELL = 24;
const FINE = 24;
const COARSE = 120;
/** Pixels of line travel per unit of field. */
const AMP = 9;
/** Wave stiffness; stability needs < 0.5. */
const C2 = 0.32;
const DAMP = 0.992;
/** Distance between samples along a line, in pixels. */
const STEP_PX = 8;
const SPLAT_MS = 1500;
/** Peak field below which the render loop may sleep. */
const SLEEP = 0.015;
const SPLASH_COUNT = 24;

type Splat = { x: number; y: number; born: number; seed: number };

/** Deterministic fuzz for ink shapes — no state, same seed, same blot. */
function fuzz(seed: number, n: number): number {
  const value = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/** The -1px background offset, wrapped into [0, pitch). */
function phase(scrollY: number, pitch: number): number {
  const raw = (-1 - scrollY) % pitch;
  return raw < 0 ? raw + pitch : raw;
}

export function bootPaper(): void {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(pointer: fine)');
  if (mq.matches || !fine.matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'paper-ripple';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const context = canvas.getContext('2d');
  if (!context) return;
  const ctx: CanvasRenderingContext2D = context;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let cols = 2;
  let rows = 2;
  let cur = new Float32Array(4);
  let prev = new Float32Array(4);
  let splats: Splat[] = [];
  let raf = 0;
  let awake = false;
  let pendingX = 0;
  let pendingY = 0;
  let pending = 0;
  let lastX = 0;
  let lastY = 0;
  let lastScroll = window.scrollY;
  let pointerSeen = false;

  function resize(): void {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    cols = Math.ceil(width / CELL) + 2;
    rows = Math.ceil(height / CELL) + 2;
    cur = new Float32Array(cols * rows);
    prev = new Float32Array(cols * rows);
  }

  /** Bilinear displacement of the field at a viewport point, in pixels. */
  function sample(x: number, y: number): number {
    const gx = Math.min(cols - 1.0001, Math.max(0, x / CELL));
    const gy = Math.min(rows - 1.0001, Math.max(0, y / CELL));
    const i = Math.floor(gx);
    const j = Math.floor(gy);
    const fx = gx - i;
    const fy = gy - j;
    const k = j * cols + i;
    const v =
      cur[k]! * (1 - fx) * (1 - fy) +
      cur[k + 1]! * fx * (1 - fy) +
      cur[k + cols]! * (1 - fx) * fy +
      cur[k + cols + 1]! * fx * fy;
    return v * AMP;
  }

  /** Kick the previous buffer — the wave equation reads it as velocity. */
  function inject(x: number, y: number, power: number): void {
    const gx = Math.min(cols - 2.0001, Math.max(0, x / CELL));
    const gy = Math.min(rows - 2.0001, Math.max(0, y / CELL));
    const i = Math.floor(gx);
    const j = Math.floor(gy);
    const fx = gx - i;
    const fy = gy - j;
    const k = j * cols + i;
    prev[k]! -= power * (1 - fx) * (1 - fy);
    prev[k + 1]! -= power * fx * (1 - fy);
    prev[k + cols]! -= power * (1 - fx) * fy;
    prev[k + cols + 1]! -= power * fx * fy;
  }

  /** One wave-equation step; returns the peak absolute displacement. */
  function step(): number {
    let peak = 0;
    for (let j = 1; j < rows - 1; j += 1) {
      const row = j * cols;
      for (let i = 1; i < cols - 1; i += 1) {
        const k = row + i;
        const lap = cur[k - 1]! + cur[k + 1]! + cur[k - cols]! + cur[k + cols]! - 4 * cur[k]!;
        const next = (cur[k]! * 2 - prev[k]! + lap * C2) * DAMP;
        prev[k] = next;
        const abs = next < 0 ? -next : next;
        if (abs > peak) peak = abs;
      }
    }
    const swap = cur;
    cur = prev;
    prev = swap;
    return peak;
  }

  function strokes(pitch: number, scrollY: number, style: string): void {
    ctx.strokeStyle = style;
    ctx.lineWidth = 1;
    const startY = phase(scrollY, pitch);
    const startX = phase(0, pitch);
    for (let x = startX; x <= width; x += pitch) {
      ctx.beginPath();
      for (let y = 0; y <= height; y += STEP_PX) {
        const dx = sample(x, y);
        if (y === 0) ctx.moveTo(x + dx, y);
        else ctx.lineTo(x + dx, y);
      }
      ctx.stroke();
    }
    for (let y = startY; y <= height; y += pitch) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += STEP_PX) {
        const dy = sample(x, y);
        if (x === 0) ctx.moveTo(x, y + dy);
        else ctx.lineTo(x, y + dy);
      }
      ctx.stroke();
    }
  }

  function paintInk(now: number): void {
    for (const splat of splats) {
      const age = (now - splat.born) / SPLAT_MS;
      if (age >= 1) continue;
      const radius = 2.6 + age * 3.4;
      // A faint bleed ring first — ink on paper spreads before it dries.
      ctx.fillStyle = `rgba(${INK},${(0.08 * (1 - age)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(splat.x, splat.y, radius * 2.1, 0, Math.PI * 2);
      ctx.fill();
      const alpha = (0.4 * (1 - age) * (1 - age)).toFixed(3);
      ctx.fillStyle = `rgba(${INK},${alpha})`;
      for (let n = 0; n < 3; n += 1) {
        const angle = fuzz(splat.seed, n) * Math.PI * 2;
        const spread = radius * 0.42;
        ctx.beginPath();
        ctx.arc(
          splat.x + Math.cos(angle) * spread,
          splat.y + Math.sin(angle) * spread,
          Math.max(0.7, radius * (0.5 + fuzz(splat.seed, n + 3) * 0.4)),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      for (let n = 0; n < 3; n += 1) {
        const angle = fuzz(splat.seed, n + 7) * Math.PI * 2;
        const distance = radius * (1.5 + fuzz(splat.seed, n + 11) * 1.6);
        ctx.beginPath();
        ctx.arc(
          splat.x + Math.cos(angle) * distance,
          splat.y + Math.sin(angle) * distance,
          0.6 + fuzz(splat.seed, n + 13) * 0.9,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  function render(now: number): void {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, width, height);
    const scrollY = window.scrollY;
    strokes(FINE, scrollY, `rgba(${INK},.075)`);
    strokes(COARSE, scrollY, `rgba(${INK},.14)`);
    if (splats.length > 0) paintInk(now);
  }

  function sleep(): void {
    if (!awake) return;
    awake = false;
    document.documentElement.classList.remove('paper-live');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function wake(): void {
    document.documentElement.classList.add('paper-live');
    awake = true;
    if (raf === 0) raf = requestAnimationFrame(frame);
  }

  function frame(now: number): void {
    raf = 0;
    if (mq.matches || !awake) return;
    if (pending > 0) {
      inject(pendingX, pendingY, Math.min(0.85, pending * 0.02));
      pending = 0;
    }
    const peak = step();
    render(now);
    splats = splats.filter((splat) => now - splat.born < SPLAT_MS);
    const scrollMoved = window.scrollY !== lastScroll;
    lastScroll = window.scrollY;
    if (peak > SLEEP || splats.length > 0 || scrollMoved || pending > 0) {
      raf = requestAnimationFrame(frame);
    } else {
      sleep();
    }
  }

  function drop(x: number, y: number, scale: number): void {
    splats.push({ x, y, born: performance.now(), seed: Math.random() * 999 });
    inject(x, y, 1.6 * scale);
    pending = 0;
    wake();
  }

  resize();
  window.addEventListener('resize', () => {
    resize();
    if (awake) wake();
  });

  window.addEventListener('pointermove', (event) => {
    if (mq.matches || event.pointerType !== 'mouse') return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    if (!pointerSeen) {
      pointerSeen = true;
      return;
    }
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 1.5) return;
    pending = Math.min(60, pending + distance);
    pendingX = event.clientX;
    pendingY = event.clientY;
    wake();
  }, { passive: true });

  window.addEventListener('pointerdown', (event) => {
    if (mq.matches || event.button !== 0) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('a,button,input,select,textarea,label,[role="button"]')
    ) {
      return;
    }
    pointerSeen = true;
    lastX = event.clientX;
    lastY = event.clientY;
    drop(event.clientX, event.clientY, 1);
  }, { passive: true });

  window.addEventListener('keydown', (event) => {
    if (mq.matches) return;
    if (event.key !== 'k' && event.key !== 'K') return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('input,textarea,select,[contenteditable]')
    ) {
      return;
    }
    for (let i = 0; i < SPLASH_COUNT; i += 1) {
      drop(Math.random() * width, Math.random() * height, 0.65);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      sleep();
    }
  });

  mq.addEventListener('change', () => {
    if (mq.matches) {
      cancelAnimationFrame(raf);
      raf = 0;
      sleep();
    }
  });
}

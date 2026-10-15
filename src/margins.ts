/**
 * Margin life — the small living traces around the notebook page.
 *
 * A hand-drawn pencil keeps your place in the right margin: it steps
 * toward the reading position in visible ~7px increments with a 1° wobble
 * (a flipbook walk, frozen the moment you stop). The page corner at the
 * bottom right gets lifted by gusts of wind — ambient ones now and then,
 * and one "wind of your own" after fast scrolling — fluttering in ~10fps
 * steps; if the pencil is in the lower half of the page it leans in and
 * presses the corner flat. The page number counts your visits and a stamp
 * logs the current Pacific time. All of it is decorative: aria-hidden,
 * pointer-transparent, absent under reduced motion, and harmless when
 * storage or time-zone data is unavailable.
 */

import { rng, wander } from './hand';

const NS = 'http://www.w3.org/2000/svg';
const PAGE_KEY = 'brickerp-notebook-page';
/** Pencil stepping: at most one 7px step per ~82ms (~12 fps flipbook). */
const STEP_MS = 82;
const STEP_PX = 7;
const WOBBLE = 1.1;
/** The pencil lies on the page at a slant, tip toward the text. */
const BASE_TILT = 12;
/** Gust flutter: ten ~96ms frames, three decreasing flutters. */
const GUST_MS = 96;
const GUST_SHAPE = [0.34, 0.6, 0.12, 0.86, 0.3, 1, 0.22, 0.5, 0.16, 0.07];
const REST_LIFT = 0.07;
const FULL_LIFT = 0.58;
const GUST_GAP_MIN = 22_000;
const GUST_GAP_MAX = 34_000;
const GUST_COOLDOWN = 12_000;

export function bootMargins(): void {
  pageNumber();
  stamp();
  const pencil = placePencil();
  cornerPaper(pencil);
}

/** “Notebook · p. N · 2026” — N grows once per visit on this machine. */
function pageNumber(): void {
  const el = document.getElementById('notebook-page');
  if (!el) return;
  try {
    const seen = Number(window.localStorage.getItem(PAGE_KEY)) || 0;
    const current = Math.min(seen + 1, 9999);
    window.localStorage.setItem(PAGE_KEY, String(current));
    el.textContent = String(current);
  } catch {
    // Storage blocked — the static “1” stands.
  }
}

/** “logged 14:22 PT” — the notebook says when it was last opened. */
function stamp(): void {
  const el = document.getElementById('notebook-stamp');
  if (!el) return;
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'America/Los_Angeles',
    });
    format.format(new Date());
  } catch {
    return;
  }
  const paint = (): void => {
    el.textContent = `logged ${format.format(new Date())} PT`;
  };
  paint();
  el.hidden = false;
  window.setInterval(paint, 30_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) paint();
  });
}

interface Pencil {
  /** Lean the pencil into the page for a moment, as if pressing it flat. */
  press(): void;
  /** Whether the pencil currently rests in the lower half of the page. */
  low(): boolean;
}

/**
 * The pencil, drawn top-down with the tip pointing at the page. Every edge
 * wanders a little (a seeded hand, so it is the same pencil every visit):
 * rounded eraser, crimped ferrule, a barrel with two facet lines and pencil
 * hatching on its shaded side, a sharpened cone with its scalloped paint
 * edge and grain, and the graphite tip.
 */
function drawPencil(svg: SVGSVGElement): void {
  const random = rng(7);
  const add = (cls: string, d: string): void => {
    const node = document.createElementNS(NS, 'path');
    node.setAttribute('class', cls);
    node.setAttribute('d', d);
    svg.appendChild(node);
  };
  svg.setAttribute('viewBox', '0 0 24 110');
  add('pencil-eraser', 'M4.7 11.2 L4.7 6.3 Q4.9 1.6 12 1.4 Q19.1 1.6 19.3 6.3 L19.3 11.2 Z');
  add('pencil-ferrule', wander([[4.7, 11.2], [19.3, 11.2], [19.3, 21.2], [4.7, 21.2]], true, random, 0.12));
  for (const y of [13.6, 15.9, 18.2]) add('pencil-line', wander([[5.1, y], [18.9, y]], false, random, 0.1));
  add('pencil-body', wander([[4.7, 21.2], [19.3, 21.2], [19.3, 86.5], [4.7, 86.5]], true, random, 0.2));
  add('pencil-line', wander([[8.7, 22], [8.7, 85.8]], false, random, 0.18));
  add('pencil-line', wander([[15.3, 22], [15.3, 85.8]], false, random, 0.18));
  for (let y = 29; y <= 84; y += 4.6) {
    add('pencil-hatch', wander([[5.1, y], [8.3, y - 2.9]], false, random, 0.08, 4));
  }
  add('pencil-wood', wander([[4.7, 86.5], [19.3, 86.5], [12, 107]], true, random, 0.14));
  add('pencil-line', 'M4.9 86.8 Q8.4 91.6 12 87 Q15.6 91.6 19.1 86.8');
  add('pencil-line', wander([[8.8, 93], [10.9, 99.4]], false, random, 0.1, 4));
  add('pencil-line', wander([[15.2, 93], [13.1, 99.4]], false, random, 0.1, 4));
  add('pencil-lead', wander([[10.3, 99.6], [13.7, 99.6], [12, 107.3]], true, random, 0.06, 4));
}

/** The reader's pencil: a flipbook bookmark that keeps your place. */
function placePencil(): Pencil | null {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  if (!window.matchMedia('(min-width: 1340px)').matches) return null;

  const host = document.createElement('div');
  host.className = 'margin-flip';
  host.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(NS, 'svg');
  drawPencil(svg);
  host.appendChild(svg);
  document.body.appendChild(host);

  let topPx = window.innerHeight * 0.12;
  let targetPx = topPx;
  let wobbleDeg = 0;
  let lastStep = 0;
  let pressUntil = 0;
  let raf = 0;

  const place = (): void => {
    host.style.top = `${topPx.toFixed(1)}px`;
    const tilt = BASE_TILT + (performance.now() < pressUntil ? 4.5 : wobbleDeg);
    host.style.transform = `rotate(${tilt.toFixed(2)}deg)`;
  };

  const progress = (): number => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  };

  const pull = (): void => {
    targetPx = window.innerHeight * (0.12 + progress() * 0.7);
    if (raf === 0) raf = requestAnimationFrame(step);
  };

  const step = (now: number): void => {
    raf = 0;
    const moving = Math.abs(targetPx - topPx) > 0.5;
    if (moving && now - lastStep >= STEP_MS) {
      lastStep = now;
      topPx += Math.sign(targetPx - topPx) * Math.min(STEP_PX, Math.abs(targetPx - topPx));
      wobbleDeg = wobbleDeg >= 0 ? -WOBBLE : WOBBLE;
      place();
    }
    if (moving || now < pressUntil) {
      raf = requestAnimationFrame(step);
    } else if (topPx !== targetPx) {
      topPx = targetPx;
      place();
    }
  };

  window.addEventListener('scroll', pull, { passive: true });
  window.addEventListener('resize', pull);
  place();
  pull();

  return {
    press: () => {
      pressUntil = performance.now() + 620;
      if (raf === 0) raf = requestAnimationFrame(step);
    },
    low: () => topPx > window.innerHeight * 0.45,
  };
}

/** The page corner and its gusts; the pencil presses when it can. */
function cornerPaper(pencil: Pencil | null): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(min-width: 760px)').matches) return;

  const host = document.createElement('div');
  host.className = 'margin-curl';
  host.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  // The underside of the lifted sheet: darker at the hinge, bright at the
  // free edge — the one cue that makes a folded triangle read as paper.
  const defs = document.createElementNS(NS, 'defs');
  const sheen = document.createElementNS(NS, 'linearGradient');
  sheen.setAttribute('id', 'curl-sheen');
  sheen.setAttribute('x1', '1');
  sheen.setAttribute('y1', '1');
  sheen.setAttribute('x2', '0');
  sheen.setAttribute('y2', '0');
  for (const [offset, color] of [['0', '#E3DCC8'], ['0.45', '#F6F1E4'], ['1', '#FFFFFF']] as const) {
    const stop = document.createElementNS(NS, 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', color);
    sheen.appendChild(stop);
  }
  defs.appendChild(sheen);
  svg.appendChild(defs);
  const path = (cls: string): SVGPathElement => {
    const node = document.createElementNS(NS, 'path');
    node.setAttribute('class', cls);
    svg.appendChild(node);
    return node;
  };
  const under = path('curl-under');
  const shade = path('curl-shade');
  const flap = path('curl-flap');
  host.appendChild(svg);
  document.body.appendChild(host);

  const fixed = (value: number): string => value.toFixed(1);
  const paint = (lift: number, jitter: number): void => {
    const t = lift;
    const hinge = 100 - 62 * t;
    const tip = 100 - 46 * t;
    const c1x = 100 - 8 * t + jitter;
    const c1y = 100 - 58 * t - jitter;
    const c2x = 100 - 58 * t - jitter;
    const c2y = 100 - 8 * t + jitter;
    const inner = 100 - 26 * t;
    under.setAttribute('d', `M100 ${fixed(hinge)}L100 100L${fixed(hinge)} 100Z`);
    shade.setAttribute('d', `M100 ${fixed(inner)}L100 100L${fixed(inner)} 100Z`);
    flap.setAttribute(
      'd',
      `M100 ${fixed(hinge)}Q${fixed(c1x)} ${fixed(c1y)} ${fixed(tip)} ${fixed(tip)}` +
        `Q${fixed(c2x)} ${fixed(c2y)} ${fixed(hinge)} 100Z`,
    );
  };
  paint(REST_LIFT, 0);

  let gusting = false;
  let nextGust = performance.now() + GUST_GAP_MIN + Math.random() * (GUST_GAP_MAX - GUST_GAP_MIN);
  let cooldownUntil = 0;

  const flutter = (index: number): void => {
    if (index >= GUST_SHAPE.length) {
      gusting = false;
      paint(REST_LIFT, 0);
      return;
    }
    const t = REST_LIFT + GUST_SHAPE[index]! * FULL_LIFT;
    paint(t, Math.sin(index * 12.9) * 1.5);
    if (GUST_SHAPE[index]! >= 0.86 && pencil?.low()) pencil.press();
    window.setTimeout(() => flutter(index + 1), GUST_MS);
  };

  const gust = (): void => {
    if (gusting || document.hidden) return;
    gusting = true;
    flutter(0);
  };

  window.setInterval(() => {
    if (gusting || document.hidden) return;
    if (performance.now() >= nextGust) {
      gust();
      nextGust = performance.now() + GUST_GAP_MIN + Math.random() * (GUST_GAP_MAX - GUST_GAP_MIN);
    }
  }, 4000);

  // Fast scrolling raises the wind of your own; after it stops, one gust.
  let lastScroll = window.scrollY;
  let fastFor = 0;
  let fastAt = 0;
  window.addEventListener('scroll', () => {
    const now = performance.now();
    const delta = Math.abs(window.scrollY - lastScroll);
    lastScroll = window.scrollY;
    if (now - fastAt > 350) fastFor = 0;
    fastAt = now;
    fastFor += delta;
    if (fastFor > 900 && !gusting && now >= cooldownUntil) {
      fastFor = 0;
      cooldownUntil = now + GUST_COOLDOWN;
      nextGust = now + 320;
    }
    // The very end of the page wants to turn; let the corner go.
    const max = document.documentElement.scrollHeight - window.innerHeight;
    host.style.opacity = max > 0 && window.scrollY > max - 140 ? '0' : '';
  }, { passive: true });
}

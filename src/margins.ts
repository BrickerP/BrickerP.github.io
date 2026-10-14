/**
 * Margin life — the small living traces around the notebook page.
 *
 * A flipbook doodle walks through the right margin as you scroll; frames
 * advance one step per stretch of scroll distance on purpose (8–12 fps
 * stop-motion feel, frozen when you stop). The page number counts your
 * visits, and a stamp logs the current Pacific time. All of it is
 * decorative: aria-hidden, pointer-transparent, absent under reduced
 * motion, and harmless when storage or time-zone data is unavailable.
 */

const NS = 'http://www.w3.org/2000/svg';
const PAGE_KEY = 'brickerp-notebook-page';
/** Scroll distance that advances one flipbook frame. */
const WALK_PX = 150;
/** Frame cadence floor — never faster than ~11 fps. */
const WALK_MS = 90;
const FRAMES = 6;

export function bootMargins(): void {
  pageNumber();
  stamp();
  walker();
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

/** The walker: one step of the cycle per stretch of scroll. */
function walker(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(min-width: 1340px)').matches) return;

  const host = document.createElement('div');
  host.className = 'margin-flip';
  host.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 48');
  const figure = document.createElementNS(NS, 'path');
  figure.setAttribute('class', 'flip-figure');
  const head = document.createElementNS(NS, 'circle');
  head.setAttribute('class', 'flip-head');
  head.setAttribute('cx', '20');
  head.setAttribute('cy', '9');
  head.setAttribute('r', '3.3');
  const pencil = document.createElementNS(NS, 'path');
  pencil.setAttribute('class', 'flip-pencil');
  svg.append(figure, head, pencil);
  host.appendChild(svg);
  document.body.appendChild(host);

  const fixed = (value: number): string => value.toFixed(1);
  let painted = -1;

  const paint = (frame: number): void => {
    if (frame === painted) return;
    painted = frame;
    const step = (frame / FRAMES) * Math.PI * 2;
    const sway = Math.sin(step);
    const lift = Math.max(0, Math.cos(step));
    const hipY = 26 - lift * 1.4;
    const headY = 9 - lift * 0.6;
    const footAx = 20 + 8 * sway;
    const footAy = 44 - Math.max(0, Math.cos(step)) * 3;
    const footBx = 20 - 8 * sway;
    const footBy = 44 - Math.max(0, -Math.cos(step)) * 3;
    const handAx = 20 - 6.5 * sway;
    const handBx = 20 + 6.5 * sway;
    figure.setAttribute(
      'd',
      `M20 15L20 ${fixed(hipY)}` +
        `M20 ${fixed(hipY)}L${fixed(footAx)} ${fixed(footAy)}` +
        `M20 ${fixed(hipY)}L${fixed(footBx)} ${fixed(footBy)}` +
        `M20 15L${fixed(handAx)} 23` +
        `M20 15L${fixed(handBx)} 23`,
    );
    head.setAttribute('cy', fixed(headY));
    pencil.setAttribute('d', `M${fixed(handBx)} 23L${fixed(handBx + 4.4)} 25.4`);
  };

  let lastScroll = window.scrollY;
  let carry = 0;
  let lastStep = 0;
  let frame = 0;

  window.addEventListener('scroll', () => {
    const now = window.scrollY;
    carry = Math.min(carry + Math.abs(now - lastScroll), WALK_PX * 2);
    lastScroll = now;
    const time = performance.now();
    if (carry >= WALK_PX && time - lastStep >= WALK_MS) {
      carry -= WALK_PX;
      lastStep = time;
      frame = (frame + 1) % FRAMES;
      paint(frame);
    }
  }, { passive: true });

  paint(0);
}

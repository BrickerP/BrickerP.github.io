/**
 * The reader's pen — hand-inked underlines for the lab entries.
 *
 * Each entry gets one key phrase underlined by two strokes, the way a
 * reader marks a textbook: a pressured centre line with tapered ends and
 * ragged edges, then a thinner second pass a beat later. The five hands
 * are deliberately unlike one another — confident, slipped, looped, lazy,
 * hesitant. Strokes are filled shapes revealed in stepped frames (a few
 * chunks of ink at a time, stop-motion style) on hover or focus.
 * Decorative: aria-hidden, pointer-transparent, drawn in real pixels so
 * nothing is stretched, and redrawn whenever the phrase changes width.
 */

import { rng, wobble } from './hand';

const NS = 'http://www.w3.org/2000/svg';
/** Free room on either side of the phrase for the overshoot of the pen. */
const PAD = 24;

interface Hand {
  seed: number;
  /** Start of the stroke from the phrase's left edge, in px (may be negative). */
  from: number;
  /** End of the stroke from the phrase's right edge, in px (positive overshoots). */
  to: number;
  /** Baseline of the stroke inside the 18px strip. */
  y: number;
  /** Net drop from start to end, in px. */
  tilt: number;
  /** Slow waviness. */
  amp: number;
  /** Fast tremble. */
  tremble: number;
  /** Peak width of the ink line. */
  w: number;
  /** Width left at the stroke ends, as a share of the peak. */
  floor: number;
  /** A dip as the pen lands. */
  hook?: number;
  /** A flick as the pen lifts. */
  flick?: number;
  /** A small curl as the pen leaves. */
  loop?: boolean;
  /** Draw only the trailing share of the phrase. */
  frac?: number;
}

/** One pair of hands per lab entry, in page order. */
const HANDS: ReadonlyArray<readonly [Hand, Hand]> = [
  // 0 · execution — confident: hooked landing, long overshoot, a shorter second pass
  [
    { seed: 11, from: -4, to: 11, y: 5.2, tilt: -1.1, amp: 0.7, tremble: 0.25, w: 2.9, floor: 0.3, hook: 1, flick: 0.4 },
    { seed: 12, from: 4, to: -13, y: 11.2, tilt: 0.5, amp: 0.6, tremble: 0.3, w: 2.1, floor: 0.25 },
  ],
  // 1 · Second Ring — the ruler slipped: the two passes drift apart
  [
    { seed: 23, from: -2, to: 6, y: 5.6, tilt: 1.6, amp: 0.9, tremble: 0.2, w: 3.2, floor: 0.22, flick: 1.2 },
    { seed: 24, from: 10, to: -3, y: 12.6, tilt: -1.4, amp: 0.8, tremble: 0.3, w: 2.2, floor: 0.2 },
  ],
  // 2 · open-ledger — wavy, and the second pass leaves with a curl
  [
    { seed: 35, from: -5, to: 4, y: 5.4, tilt: 0.4, amp: 1.5, tremble: 0.5, w: 2.8, floor: 0.3, hook: 0.8 },
    { seed: 36, from: 6, to: -8, y: 11.4, tilt: -0.6, amp: 1.1, tremble: 0.4, w: 2.0, floor: 0.28, loop: true },
  ],
  // 3 · cookiy-mcp — one long stroke, then a lazy half of a second
  [
    { seed: 47, from: -3, to: 14, y: 5.0, tilt: -0.4, amp: 0.6, tremble: 0.2, w: 3.3, floor: 0.18 },
    { seed: 48, from: 0, to: -2, y: 11.0, tilt: 0.9, amp: 0.5, tremble: 0.35, w: 2.0, floor: 0.3, frac: 0.55 },
  ],
  // 4 · revenue backend — private work, the least certain hand
  [
    { seed: 59, from: -2, to: 2, y: 5.6, tilt: 0.8, amp: 1.7, tremble: 1.1, w: 2.4, floor: 0.45, hook: 1.2 },
    { seed: 60, from: 8, to: -4, y: 11.8, tilt: -0.8, amp: 1.4, tremble: 1.2, w: 1.8, floor: 0.4, frac: 0.4 },
  ],
];

/** A tapered, ragged-edged ink polygon along a wandering centre line. */
function stroke(width: number, hand: Hand, start: number): string {
  const random = rng(hand.seed);
  const slow = wobble(random);
  const fast = wobble(random);
  const end = width + hand.to;
  const length = Math.max(8, end - start);
  const count = Math.max(12, Math.round(length / 5));
  const pts: Array<[number, number, number]> = [];
  for (let i = 0; i <= count; i += 1) {
    const u = i / count;
    let y = hand.y + hand.tilt * u + hand.amp * slow(u * 1.4) + hand.tremble * fast(u * 4.1);
    if (hand.hook && u < 0.08) y += (0.08 - u) * hand.hook * 16;
    if (hand.flick && u > 0.92) y += (u - 0.92) * hand.flick * 20;
    const pressure = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u * 0.9 + 0.05))), 0.6);
    pts.push([
      start + length * u + (random() - 0.5) * 0.5,
      y,
      hand.w * (hand.floor + (1 - hand.floor) * pressure) * (0.9 + 0.2 * random()),
    ]);
  }
  if (hand.loop) {
    const [ex, ey] = pts[pts.length - 1]!;
    for (let k = 1; k <= 14; k += 1) {
      const t = (k / 14) * Math.PI * 2 * 0.92;
      pts.push([ex + Math.sin(t) * 4.2 + k * 0.25, ey - (1 - Math.cos(t)) * 3.1, hand.w * 0.46]);
    }
  }
  const top: Array<[number, number]> = [];
  const bottom: Array<[number, number]> = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const norm = Math.hypot(tx, ty) || 1;
    tx /= norm;
    ty /= norm;
    const nx = -ty;
    const ny = tx;
    const half = pts[i]![2] / 2;
    top.push([
      pts[i]![0] + nx * half * (0.9 + 0.2 * random()),
      pts[i]![1] + ny * half * (0.9 + 0.2 * random()),
    ]);
    bottom.push([
      pts[i]![0] - nx * half * (0.9 + 0.2 * random()),
      pts[i]![1] - ny * half * (0.9 + 0.2 * random()),
    ]);
  }
  const cap = (point: readonly [number, number, number], dir: number): Array<[number, number]> => {
    const [x, y, w] = point;
    const out: Array<[number, number]> = [];
    for (let k = 1; k <= 4; k += 1) {
      const t = ((Math.PI / 2) * k) / 5;
      out.push([x + dir * Math.sin(t) * (w / 2) * 1.1, y + Math.cos(t) * (w / 2) * 0.1]);
    }
    return out;
  };
  const outline = [
    ...top,
    ...cap(pts[pts.length - 1]!, 1),
    ...bottom.reverse(),
    ...cap(pts[0]!, -1),
  ];
  return `M${outline.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z`;
}

function draw(span: HTMLElement, pair: readonly [Hand, Hand]): void {
  const width = span.getBoundingClientRect().width;
  if (width < 8) return;
  for (const old of span.querySelectorAll('svg.ink')) old.remove();
  const steps = Math.max(5, Math.round(width / 24));
  (['a', 'b'] as const).forEach((tag, index) => {
    const hand = pair[index]!;
    const start = hand.frac ? width * (1 - hand.frac) : hand.from;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', `ink ${tag}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', `${-PAD} 0 ${(width + PAD * 2).toFixed(1)} 18`);
    svg.style.width = `${(width + PAD * 2).toFixed(1)}px`;
    svg.style.setProperty('--n', String(steps));
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', stroke(width, hand, start));
    svg.appendChild(path);
    span.appendChild(svg);
  });
}

export function bootPens(): void {
  const spans = [...document.querySelectorAll<HTMLElement>('.ul[data-ink]')];
  const redraw = (span: HTMLElement): void => {
    const pair = HANDS[Number(span.dataset.ink)];
    if (pair) draw(span, pair);
  };
  if (typeof ResizeObserver === 'undefined') {
    spans.forEach(redraw);
    return;
  }
  const watcher = new ResizeObserver((entries) => {
    for (const entry of entries) redraw(entry.target as HTMLElement);
  });
  spans.forEach((span) => watcher.observe(span));
}

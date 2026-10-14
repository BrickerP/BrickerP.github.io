/**
 * Hand-drawn rulings — the notebook's boxes are ruled by a hand.
 *
 * Every element marked `data-ruled` gets three seeded wobbly rectangles
 * drawn in real pixels; the stylesheet shows one at a time on a .72s
 * loop, so the line "boils" the way a hand-drawn animation does. The
 * straight CSS border steps aside while a ruling is present. Decorative
 * (aria-hidden, pointer-transparent), redrawn when the box changes size,
 * and absent under reduced motion — there the CSS border stands.
 */

import { rng, wander } from './hand';

const NS = 'http://www.w3.org/2000/svg';
/** Free room around the box so the wobble never clips. */
const PAD = 4;
const FRAMES = 3;

/** One frame of the ruling: a closed rectangle with a wandering edge. */
function framePath(width: number, height: number, seed: number): string {
  const random = rng(seed);
  return wander(
    [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ],
    true,
    random,
    1.1,
    18,
  );
}

/** Draw (or redraw) the three boiling frames inside one ruled host. */
function draw(host: HTMLElement, fallbackSeed: number): void {
  const width = host.clientWidth;
  const height = host.clientHeight;
  if (width < 8 || height < 8) return;
  const seed = Number(host.dataset.rulingSeed ?? fallbackSeed);
  host.dataset.rulingSeed = String(seed);
  for (const old of host.querySelectorAll(':scope > .ruling')) old.remove();
  const layer = document.createElement('span');
  layer.className = 'ruling';
  layer.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `${-PAD} ${-PAD} ${width + PAD * 2} ${height + PAD * 2}`);
  for (let frame = 0; frame < FRAMES; frame += 1) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('class', `ruling__frame ruling__frame--${frame}`);
    path.setAttribute('d', framePath(width, height, seed + frame * 13));
    svg.appendChild(path);
  }
  layer.appendChild(svg);
  host.prepend(layer);
  host.classList.add('has-ruling');
}

export function bootRuling(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hosts = [...document.querySelectorAll<HTMLElement>('[data-ruled]')];
  if (hosts.length === 0) return;
  const seedOf = (index: number): number => 11 + index * 7;
  if (typeof ResizeObserver === 'undefined') {
    hosts.forEach((host, index) => draw(host, seedOf(index)));
    window.addEventListener('resize', () => hosts.forEach((host, index) => draw(host, seedOf(index))));
    return;
  }
  const watcher = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const host = entry.target as HTMLElement;
      const index = hosts.indexOf(host);
      draw(host, seedOf(index < 0 ? 0 : index));
    }
  });
  hosts.forEach((host) => watcher.observe(host));
  hosts.forEach((host, index) => draw(host, seedOf(index)));
}

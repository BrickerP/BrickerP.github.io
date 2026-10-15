/**
 * Hand-drawing helpers for the homepage's pen and pencil work: a seeded
 * random source (so a drawing is identical on every visit), a smooth
 * wobble, and a polyline that wanders the way a line drawn without a
 * ruler does.
 */

export type Point = readonly [number, number];

/** xorshift32 — tiny, seeded, and stable across visits. */
export function rng(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

/** A smooth value in [-1, 1]: three seeded sine waves of unequal weight. */
export function wobble(random: () => number): (u: number) => number {
  const waves = [0, 1, 2].map(() => ({
    f: 0.5 + random() * 2.2,
    p: random() * Math.PI * 2,
    w: 0.5 + random(),
  }));
  const total = waves.reduce((sum, wave) => sum + wave.w, 0);
  return (u) =>
    waves.reduce((sum, wave) => sum + Math.sin(u * wave.f * Math.PI * 2 + wave.p) * wave.w, 0) /
    total;
}

/** A path through the points whose edges wander by up to ±jitter. */
export function wander(
  points: readonly Point[],
  close: boolean,
  random: () => number,
  jitter = 0.22,
  segment = 9,
): string {
  const out: Array<[number, number]> = [];
  const edges = close ? points.length : points.length - 1;
  for (let i = 0; i < edges; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length === 0) continue;
    const parts = Math.max(1, Math.round(length / segment));
    const nx = -(b[1] - a[1]) / length;
    const ny = (b[0] - a[0]) / length;
    for (let j = 0; j < parts; j += 1) {
      const t = j / parts;
      const off = (j === 0 ? 0.4 : 1) * (random() - 0.5) * 2 * jitter;
      out.push([a[0] + (b[0] - a[0]) * t + nx * off, a[1] + (b[1] - a[1]) * t + ny * off]);
    }
  }
  if (!close) {
    const end = points[points.length - 1]!;
    out.push([end[0], end[1]]);
  }
  return `M${out.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('L')}${close ? 'Z' : ''}`;
}

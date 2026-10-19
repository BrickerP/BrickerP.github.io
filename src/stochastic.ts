/**
 * Fig. 2 — the derivation room's live exhibit: a price as a random
 * process, with one rule on top.
 *
 * The world row: a bell hands every future one normal draw per step,
 * the price takes that draw as a step, and nine futures fan out with
 * the model's median and its 5–95% envelope — the band is what the
 * model knows, the lines are luck. The rule row replays the same nine
 * futures under one stop — touch −15% and you leave the year (the pale
 * stretches are the days you sit out) — then measures the difference
 * over 999 seeded futures: two distributions of the year's end, with
 * the measured numbers printed beside them. The rule costs a little;
 * it covers a lot.
 *
 * Everything is seeded; Reseed rolls new dice. Reduced motion draws
 * the finished plate at once. No dependencies beyond the shared
 * seeded hand.
 */

import { rng } from './hand';

const S0 = 100;
const MU = 0.08;
const SIGMA = 0.2;
const STEPS = 48;
const DT = 1 / STEPS;
const NU = MU - (SIGMA * SIGMA) / 2;
/** The rule: touch −15% and you leave the year; you do not come back. */
const OUT_AT = 0.85;
const SHOWN = 9;
const MEASURED = 999;
/** 5–95% envelope of the lognormal model. */
const BAND_Z = 1.645;
const BASE_SEED = 2026;
const TICK_MS = 90;
const GROW_MS = 900;
const INK = '#1F3A5F';
const SOFT = '#5F6670';
const RED = '#C2412D';
const RULE = 'rgba(31,58,95,.28)';
const MONO = '"Notebook Mono", ui-monospace, Menlo, monospace';
const HAND = '"Notebook Hand", cursive';
/** Shared price window so the three path panels read on one scale. */
const Y_LO = 58;
const Y_HI = 162;

interface Plate {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

interface World {
  zs: number[][];
  paths: number[][];
}

interface Measured {
  hold: number[];
  timed: number[];
  worst: [number, number];
  median: [number, number];
  under: [number, number];
}

function gaussian(random: () => number): number {
  const u = Math.max(random(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

function fit(canvas: HTMLCanvasElement): Plate | null {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w < 8 || h < 8) return null;
  const width = Math.round(w * dpr);
  const height = Math.round(h * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

/** One year of the world: nine futures, one normal draw per step each. */
function roll(seed: number): World {
  const random = rng(seed);
  const zs: number[][] = [];
  const paths: number[][] = [];
  for (let p = 0; p < SHOWN; p += 1) {
    const draws: number[] = [];
    const path: number[] = [S0];
    let price = S0;
    for (let i = 0; i < STEPS; i += 1) {
      const z = gaussian(random);
      draws.push(z);
      price *= Math.exp(NU * DT + SIGMA * Math.sqrt(DT) * z);
      path.push(price);
    }
    zs.push(draws);
    paths.push(path);
  }
  return { zs, paths };
}

/** Where the rule holds or sits out, step by step (true = in market). */
function ruleFlags(path: readonly number[]): boolean[] {
  const flags: boolean[] = [true];
  let inMarket = true;
  for (let i = 1; i <= STEPS; i += 1) {
    if (inMarket && path[i]! <= S0 * OUT_AT) inMarket = false;
    flags.push(inMarket);
  }
  return flags;
}

function quantile(sorted: readonly number[], share: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(share * sorted.length)));
  return sorted[index]!;
}

/** 999 futures, both ways through them; everything measured, nothing claimed. */
function measure(seed: number): Measured {
  const random = rng(seed);
  const hold: number[] = [];
  const timed: number[] = [];
  for (let n = 0; n < MEASURED; n += 1) {
    let price = S0;
    let value = S0;
    let inMarket = true;
    for (let i = 0; i < STEPS; i += 1) {
      const previous = price;
      price *= Math.exp(NU * DT + SIGMA * Math.sqrt(DT) * gaussian(random));
      if (inMarket) value *= price / previous;
      if (inMarket && price <= S0 * OUT_AT) inMarket = false;
    }
    hold.push(price);
    timed.push(value);
  }
  const sortedHold = [...hold].sort((a, b) => a - b);
  const sortedTimed = [...timed].sort((a, b) => a - b);
  const under = (values: number[]): number =>
    values.filter((value) => value <= S0 * 0.8).length / values.length;
  return {
    hold,
    timed,
    worst: [quantile(sortedHold, 0.05), quantile(sortedTimed, 0.05)],
    median: [quantile(sortedHold, 0.5), quantile(sortedTimed, 0.5)],
    under: [under(hold), under(timed)],
  };
}

function percent(value: number, digits = 0): string {
  const share = (value / S0 - 1) * 100;
  const rounded = share.toFixed(digits);
  return `${share >= 0 ? '+' : '−'}${Math.abs(Number(rounded))}%`;
}

function boot(): void {
  const host = document.getElementById('fig2');
  if (!host) return;
  const noise = document.getElementById('fig2-noise') as HTMLCanvasElement | null;
  const walk = document.getElementById('fig2-walk') as HTMLCanvasElement | null;
  const futures = document.getElementById('fig2-futures') as HTMLCanvasElement | null;
  const policy = document.getElementById('fig2-policy') as HTMLCanvasElement | null;
  const measured = document.getElementById('fig2-measured') as HTMLCanvasElement | null;
  const stats = document.getElementById('fig2-stats');
  const reseed = document.getElementById('fig2-reseed') as HTMLButtonElement | null;
  if (!noise || !walk || !futures || !policy || !measured || !stats) return;

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let seed = BASE_SEED;
  let world = roll(seed);
  let flags = world.paths.map((path) => ruleFlags(path));
  let statsData = measure(seed + 5000);
  let stepsDone = 0;
  let grow = 0;
  let timer = 0;

  const xAt = (i: number, w: number, padL: number, padR: number): number =>
    padL + ((w - padL - padR) * i) / STEPS;
  const yAt = (price: number, h: number, padT: number, padB: number): number =>
    padT + ((Y_HI - price) / (Y_HI - Y_LO)) * (h - padT - padB);

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, padL: number, padR: number, padT: number, padB: number, labels: boolean): void {
    ctx.font = `10px ${MONO}`;
    ctx.textBaseline = 'middle';
    for (const price of [75, 100, 125]) {
      const y = yAt(price, h, padT, padB);
      ctx.strokeStyle = price === 100 ? RULE : 'rgba(31,58,95,.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      if (labels) {
        ctx.fillStyle = SOFT;
        ctx.textAlign = 'right';
        ctx.fillText(`$${price}`, padL - 6, y);
      }
    }
    ctx.fillStyle = SOFT;
    ctx.textAlign = 'left';
    ctx.fillText('one year', w - padR - 44, h - padB + 12);
  }

  function drawNoise(steps: number): void {
    const plate = fit(noise!);
    if (!plate) return;
    const { ctx, w, h } = plate;
    const padX = 14;
    const base = h - 26;
    const xAtZ = (z: number): number => padX + ((z + 3) / 6) * (w - padX * 2);
    const amp = base - 22;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const z = ((x - padX) / (w - padX * 2)) * 6 - 3;
      const y = base - Math.exp(-0.5 * z * z) * amp;
      if (x === 0) ctx.moveTo(x, Math.max(20, y));
      else ctx.lineTo(x, Math.max(20, y));
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(31,58,95,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, base);
    ctx.lineTo(w - padX, base);
    ctx.stroke();
    ctx.fillStyle = SOFT;
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('z', w / 2, base + 12);
    for (let i = Math.max(0, steps - 6); i < steps; i += 1) {
      const age = steps - i;
      const alpha = Math.max(0.1, 0.85 - age * 0.13);
      for (let p = 0; p < SHOWN; p += 1) {
        const z = world.zs[p]![i]!;
        const main = p === 0;
        ctx.fillStyle = `rgba(31,58,95,${(main ? alpha : alpha * 0.4).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(xAtZ(z), base - Math.exp(-0.5 * z * z) * amp + 3, main ? 2.6 : 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawWalk(steps: number): void {
    const plate = fit(walk!);
    if (!plate) return;
    const { ctx, w, h } = plate;
    const padL = 36;
    const padR = 10;
    const padT = 16;
    const padB = 24;
    drawGrid(ctx, w, h, padL, padR, padT, padB, true);
    const path = world.paths[0]!;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(xAt(0, w, padL, padR), yAt(path[0]!, h, padT, padB));
    for (let i = 1; i <= steps; i += 1) {
      ctx.lineTo(xAt(i, w, padL, padR), yAt(path[i]!, h, padT, padB));
    }
    ctx.stroke();
  }

  function bandPath(ctx: CanvasRenderingContext2D, steps: number, w: number, h: number, padL: number, padR: number, padT: number, padB: number): void {
    ctx.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const t = i * DT;
      const top = S0 * Math.exp(NU * t + BAND_Z * SIGMA * Math.sqrt(t));
      ctx.lineTo(xAt(i, w, padL, padR), yAt(top, h, padT, padB));
    }
    for (let i = steps; i >= 0; i -= 1) {
      const t = i * DT;
      const bottom = S0 * Math.exp(NU * t - BAND_Z * SIGMA * Math.sqrt(t));
      ctx.lineTo(xAt(i, w, padL, padR), yAt(bottom, h, padT, padB));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(31,58,95,.07)';
    ctx.fill();
  }

  function drawMedian(ctx: CanvasRenderingContext2D, steps: number, w: number, h: number, padL: number, padR: number, padT: number, padB: number): void {
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const y = yAt(S0 * Math.exp(NU * i * DT), h, padT, padB);
      ctx.lineTo(xAt(i, w, padL, padR), y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawFutures(steps: number): void {
    const plate = fit(futures!);
    if (!plate) return;
    const { ctx, w, h } = plate;
    const padL = 10;
    const padR = 10;
    const padT = 16;
    const padB = 24;
    drawGrid(ctx, w, h, padL, padR, padT, padB, false);
    if (steps > 0) {
      bandPath(ctx, steps, w, h, padL, padR, padT, padB);
      drawMedian(ctx, steps, w, h, padL, padR, padT, padB);
    }
    for (const path of world.paths) {
      ctx.strokeStyle = 'rgba(31,58,95,.8)';
      ctx.lineWidth = 1.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(xAt(0, w, padL, padR), yAt(path[0]!, h, padT, padB));
      for (let i = 1; i <= steps; i += 1) {
        ctx.lineTo(xAt(i, w, padL, padR), yAt(path[i]!, h, padT, padB));
      }
      ctx.stroke();
    }
  }

  function drawPolicy(steps: number): void {
    const plate = fit(policy!);
    if (!plate) return;
    const { ctx, w, h } = plate;
    const padL = 10;
    const padR = 10;
    const padT = 16;
    const padB = 24;
    drawGrid(ctx, w, h, padL, padR, padT, padB, false);
    const ruleY = yAt(S0 * OUT_AT, h, padT, padB);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, ruleY);
    ctx.lineTo(w - padR, ruleY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = RED;
    ctx.font = `13px ${HAND}`;
    ctx.textAlign = 'left';
    ctx.fillText('the rule: −15%', padL + 2, ruleY + 16);
    const exitMark = (x: number, y: number): void => {
      ctx.beginPath();
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x - 3.4, y - 2.4);
      ctx.lineTo(x + 3.4, y - 2.4);
      ctx.closePath();
      ctx.fillStyle = RED;
      ctx.fill();
    };
    for (let p = 0; p < world.paths.length; p += 1) {
      const path = world.paths[p]!;
      const flag = flags[p]!;
      for (let i = 1; i <= steps; i += 1) {
        const inMarket = flag[i - 1]!;
        ctx.strokeStyle = inMarket ? 'rgba(31,58,95,.8)' : 'rgba(95,102,112,.3)';
        ctx.lineWidth = inMarket ? 1.2 : 1;
        ctx.beginPath();
        ctx.moveTo(xAt(i - 1, w, padL, padR), yAt(path[i - 1]!, h, padT, padB));
        ctx.lineTo(xAt(i, w, padL, padR), yAt(path[i]!, h, padT, padB));
        ctx.stroke();
        if (flag[i - 1] && !flag[i]) {
          exitMark(xAt(i, w, padL, padR), yAt(path[i]!, h, padT, padB));
        }
      }
    }
  }

  function drawMeasured(progress: number): void {
    const plate = fit(measured!);
    if (!plate) return;
    const { ctx, w, h } = plate;
    const padL = 8;
    const padR = 8;
    const all = [...statsData.hold, ...statsData.timed];
    const lo = Math.min(...all) - 2;
    const hi = Math.max(...all) + 2;
    const xAtValue = (value: number): number =>
      padL + Math.min(1, Math.max(0, (value - lo) / (hi - lo))) * (w - padL - padR);
    const strips = [
      { data: statsData.hold, top: 8, label: 'hold' as const },
      { data: statsData.timed, top: h / 2 + 4, label: 'with the rule' as const },
    ];
    const bins = 48;
    ctx.font = `10px ${MONO}`;
    for (const strip of strips) {
      const height = h / 2 - 26;
      const counts = new Array<number>(bins).fill(0);
      for (const value of strip.data) {
        const bin = Math.min(bins - 1, Math.max(0, Math.floor(((value - lo) / (hi - lo)) * bins)));
        counts[bin] += 1;
      }
      const peak = Math.max(...counts);
      const scale = (height - 12) / peak;
      for (let bin = 0; bin < bins; bin += 1) {
        const share = Math.round(counts[bin]! * progress);
        if (share <= 0) continue;
        const x0 = xAtValue(lo + ((hi - lo) * bin) / bins);
        const x1 = xAtValue(lo + ((hi - lo) * (bin + 1)) / bins);
        const barHeight = share * scale;
        const center = lo + ((hi - lo) * (bin + 0.5)) / bins;
        const isPile =
          strip.label === 'with the rule' && center >= S0 * 0.81 && center <= S0 * 0.86;
        ctx.fillStyle = isPile ? 'rgba(194,65,45,.75)' : 'rgba(31,58,95,.72)';
        ctx.fillRect(x0 + 0.5, strip.top + height - barHeight, Math.max(1, x1 - x0 - 1), barHeight);
      }
      ctx.strokeStyle = 'rgba(31,58,95,.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, strip.top + height);
      ctx.lineTo(w - padR, strip.top + height);
      ctx.stroke();
      ctx.fillStyle = SOFT;
      ctx.textAlign = 'right';
      ctx.fillText(strip.label, w - padR - 2, strip.top + 10);
    }
    const ruleX = xAtValue(S0 * OUT_AT);
    ctx.strokeStyle = 'rgba(194,65,45,.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(ruleX, 6);
    ctx.lineTo(ruleX, h - 16);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = SOFT;
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    for (const mark of [75, 100, 125]) {
      ctx.fillText(`$${mark}`, xAtValue(mark), h - 3);
    }
    // The bottom strip's empty left flank is the story: the rule took the tail.
    ctx.fillStyle = 'rgba(194,65,45,.85)';
    ctx.textAlign = 'right';
    const note = ['the rule', 'took this', 'tail'];
    const flankX = ruleX - 15;
    ctx.font = `13px ${HAND}`;
    const widest = Math.max(...note.map((line) => ctx.measureText(line).width));
    ctx.font = `${Math.max(9, Math.min(13, (13 * (flankX - padL)) / widest))}px ${HAND}`;
    note.forEach((line, i) => ctx.fillText(line, flankX, strips[1]!.top + 18 + i * 13));
  }

  function render(steps: number, progress: number): void {
    drawNoise(steps);
    drawWalk(steps);
    drawFutures(steps);
    drawPolicy(steps);
    drawMeasured(progress);
  }

  function printStats(): void {
    const { worst, median, under } = statsData;
    const share = (value: number): string =>
      value * 100 >= 10 ? `${Math.round(value * 100)}%` : `${(value * 100).toFixed(1)}%`;
    const part = (label: string, before: string, after: string): string =>
      `<span class="stat">${label} <b>${before}</b> → <b>${after}</b></span>`;
    stats!.innerHTML = [
      part('median', percent(median[0]), percent(median[1])),
      part('worst 5%', percent(worst[0]), percent(worst[1])),
      part('years under −20%', share(under[0]), share(under[1])),
    ].join(' ');
    stats!.hidden = false;
  }

  function tick(): void {
    if (stepsDone < STEPS) {
      stepsDone += 1;
      render(stepsDone, 0);
      return;
    }
    grow = Math.min(1, grow + TICK_MS / GROW_MS);
    render(STEPS, grow);
    if (grow >= 1) {
      window.clearInterval(timer);
      timer = 0;
      printStats();
    }
  }

  function replay(): void {
    window.clearInterval(timer);
    timer = 0;
    stats!.hidden = true;
    stepsDone = 0;
    grow = 0;
    if (mq.matches) {
      stepsDone = STEPS;
      grow = 1;
      render(STEPS, 1);
      printStats();
      return;
    }
    render(0, 0);
    timer = window.setInterval(tick, TICK_MS);
  }

  function reroll(): void {
    seed += 7919;
    world = roll(seed);
    flags = world.paths.map((path) => ruleFlags(path));
    statsData = measure(seed + 5000);
    replay();
  }

  let started = false;
  const start = (): void => {
    if (started) return;
    started = true;
    replay();
  };

  if (mq.matches || typeof IntersectionObserver === 'undefined') {
    start();
  } else {
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            watcher.disconnect();
            start();
          }
        }
      },
      { threshold: 0.35 },
    );
    watcher.observe(host);
  }

  reseed?.addEventListener('click', () => {
    started = true;
    reroll();
  });

  window.addEventListener('resize', () => {
    if (!started) return;
    render(stepsDone, grow >= 1 ? 1 : grow);
  });

  mq.addEventListener('change', (event) => {
    if (event.matches && started && timer) {
      window.clearInterval(timer);
      timer = 0;
      stepsDone = STEPS;
      grow = 1;
      render(STEPS, 1);
      printStats();
    }
  });
}

export function bootStochastic(): void {
  boot();
}

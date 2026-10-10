import { PATH_METRES } from './pathSweep';

interface Span {
  p0: number;
  p1: number;
  l0: number;
  l1: number;
}

const occupied: Span[] = [];

export type Blocked = (progress: number, offset: number, along: number, across: number) => boolean;

export function resetOccupancy(): void {
  occupied.length = 0;
}

/** Register ground that is taken: a progress interval times a lateral interval, both in metres. */
export function claim(progress: number, offset: number, along: number, across: number): void {
  const dp = along / 2 / PATH_METRES;
  const dl = across / 2;
  occupied.push({ p0: progress - dp, p1: progress + dp, l0: offset - dl, l1: offset + dl });
}

export const blocked: Blocked = (progress, offset, along, across) => {
  const dp = along / 2 / PATH_METRES;
  const dl = across / 2;
  const p0 = progress - dp;
  const p1 = progress + dp;
  const l0 = offset - dl;
  const l1 = offset + dl;
  return occupied.some(
    (span) => p1 > span.p0 + 1e-4 && span.p1 > p0 + 1e-4 && l1 > span.l0 + 1e-4 && span.l1 > l0 + 1e-4,
  );
};

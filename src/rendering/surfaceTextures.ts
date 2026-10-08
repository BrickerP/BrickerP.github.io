/** Seeded 0–1 hash matching the scene generator (no Math.random). */
export function hash01(index: number, salt = 0): number {
  const value = Math.sin(index * 91.173 + salt * 47.77) * 43758.5453;
  return value - Math.floor(value);
}

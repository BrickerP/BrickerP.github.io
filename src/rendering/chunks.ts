/**
 * Instanced copies are grouped into cells of this size. One mesh for the whole
 * loop would have a bounding sphere the size of the city, so the camera and the
 * shadow map would draw every copy every frame. A cell the view misses is skipped,
 * and a cell that is on screen draws the same triangles as before.
 */
export const INSTANCE_CELL_METRES = 32;

export function instanceCell(x: number, z: number): string {
  return `${Math.floor(x / INSTANCE_CELL_METRES)}:${Math.floor(z / INSTANCE_CELL_METRES)}`;
}

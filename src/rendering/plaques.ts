import { Mesh, PlaneGeometry, type Object3D } from 'three';
import { createPlaqueFrame, plaqueCanopyTop } from './kit';
import type { CityHost } from './assembleCity';
import type { PlaqueSeat } from './buildings';

function plaqueMaterial(host: CityHost, text: string, canvasHeight: number, vertical = false) {
  return host.plaque(text, {
    width: vertical ? Math.round(canvasHeight * 0.34) : 640,
    height: canvasHeight,
    background: '#123E46',
    border: '#D4AD5C',
    color: '#F3D78D',
    font: vertical ? '700 150px "Songti SC", "STSong", serif' : '700 112px "Songti SC", "STSong", serif',
    vertical,
  });
}

/** Road gantry board. Building names use the framed board instead. */
export function hangPlaque(
  host: CityHost,
  parent: Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
): void {
  const material = plaqueMaterial(host, text, 220);
  if (!material) return;
  const panel = new Mesh(host.track(new PlaneGeometry(width, height)), material);
  panel.position.set(x, y, z);
  panel.rotation.y = Math.PI;
  parent.add(panel);
}

/** Frame, corner caps, canopy, and the painted board, centred on the given point and facing -Z. */
export function hangFramedPlaque(
  host: CityHost,
  parent: Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
): void {
  const frame = new Mesh(host.track(createPlaqueFrame(width, height)), host.mats.gold);
  frame.position.set(x, y, z);
  parent.add(frame);
  const material = plaqueMaterial(host, text, 220);
  if (!material) return;
  const panel = new Mesh(
    host.track(new PlaneGeometry(Math.max(0.2, width - 0.18), Math.max(0.12, height - 0.18))),
    material,
  );
  panel.position.set(x, y, z - 0.075);
  panel.rotation.y = Math.PI;
  parent.add(panel);
}

/** Hang a board in the middle bay, canopy touching the underside of the lintel. */
export function hangInBay(
  host: CityHost,
  parent: Object3D,
  text: string,
  width: number,
  height: number,
): void {
  const seat = parent.userData.plaqueSeat as PlaqueSeat | undefined;
  if (!seat || !Number.isFinite(seat.lintelBottom) || !Number.isFinite(seat.bayWidth)) {
    if (import.meta.env.DEV) console.assert(false, `${text} has no column bay to hang from`);
    return;
  }
  const boardWidth = Math.min(width, Math.max(0.6, seat.bayWidth - 0.35));
  hangFramedPlaque(
    host,
    parent,
    text,
    0,
    seat.lintelBottom - 0.03 - plaqueCanopyTop(height),
    seat.z,
    boardWidth,
    height,
  );
}

/** A vertical shop board, facing the driver. `face` is the rotation that turns its front toward travel. */
export function hangVerticalSign(
  host: CityHost,
  parent: Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  face: number,
): void {
  const material = plaqueMaterial(host, text, 420, true);
  if (!material) return;
  const panel = new Mesh(host.track(new PlaneGeometry(0.34, 1.14)), material);
  panel.position.set(x, y, z);
  panel.rotation.y = face;
  parent.add(panel);
}

import {
  Color,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';
import { DRIVE_PATH_SCALE } from './FirstPersonCameraRig';
import { pathHeading, samplePathFrame } from './drivePath';
import type { CityHost } from './assembleCity';

export interface Stamp {
  progress: number;
  offset: number;
  y?: number;
  heading?: number;
  scale?: number;
  /** Height scale when it differs from `scale`. */
  scaleY?: number;
  /** Per-instance colour multiplier, so one geometry does not read as a copy. */
  tint?: [number, number, number];
}

const UP = new Vector3(0, 1, 0);

/** Heading that turns a building's -Z face toward the road. */
export function faceRoad(offset: number): number {
  return offset > 0 ? -Math.PI / 2 : Math.PI / 2;
}

export function put(
  host: CityHost,
  object: Object3D,
  progress: number,
  offset: number,
  scale = 1,
  heading = 0,
): void {
  host.place(object, progress, offset, 0, heading);
  object.scale.setScalar(scale);
  host.tag(object);
  host.root.add(object);
}

/** One instanced mesh stamped along the road. */
export function scatter(
  host: CityHost,
  geometry: BufferGeometry,
  material: Material,
  stamps: Stamp[],
  cast = false,
): InstancedMesh | undefined {
  if (stamps.length === 0) return undefined;
  const mesh = new InstancedMesh(host.track(geometry), material, stamps.length);
  mesh.frustumCulled = false;
  mesh.castShadow = cast;
  mesh.receiveShadow = cast;
  const matrix = new Matrix4();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const colour = new Color();
  const tinted = stamps.some((stamp) => stamp.tint);
  stamps.forEach((stamp, index) => {
    const frame = samplePathFrame(stamp.progress);
    position.set(
      frame.point.x * DRIVE_PATH_SCALE + frame.normal.x * stamp.offset,
      stamp.y ?? 0,
      frame.point.z * DRIVE_PATH_SCALE + frame.normal.z * stamp.offset,
    );
    quaternion.setFromAxisAngle(UP, pathHeading(frame.tangent) + (stamp.heading ?? 0));
    const flat = stamp.scale ?? 1;
    scale.set(flat, stamp.scaleY ?? flat, flat);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
    if (tinted) {
      const [r, g, b] = stamp.tint ?? [1, 1, 1];
      mesh.setColorAt(index, colour.setRGB(r, g, b));
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  host.root.add(mesh);
  return mesh;
}

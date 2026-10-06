import {
  BufferGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Vector2,
} from 'three';

/** Straight prism roof. Street kit keeps this; heroes use the upturned eave. */
export function createPitchedRoofGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        -0.5, 0, -0.5,
        0.5, 0, -0.5,
        0, 1, -0.5,
        -0.5, 0, 0.5,
        0.5, 0, 0.5,
        0, 1, 0.5,
      ],
      3,
    ),
  );
  geometry.setIndex([
    0, 2, 1,
    3, 4, 5,
    0, 3, 5,
    0, 5, 2,
    1, 2, 5,
    1, 5, 4,
    0, 1, 4,
    0, 4, 3,
  ]);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Hip roof in the same unit box as the prism: corners lift, eave centres dip.
 * Plan stays inside ±0.5 so an existing hero scale does not grow into the road.
 */
export function createUpturnedEaveGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        0, 1, -0.18,
        0, 1, 0.18,
        -0.5, 0.34, -0.5,
        0.5, 0.34, -0.5,
        0.5, 0.34, 0.5,
        -0.5, 0.34, 0.5,
        0, 0, -0.5,
        0.5, 0, 0,
        0, 0, 0.5,
        -0.5, 0, 0,
      ],
      3,
    ),
  );
  geometry.setIndex([
    // Front
    0, 2, 6,
    0, 6, 3,
    // Right
    0, 3, 7,
    1, 0, 7,
    1, 7, 4,
    // Back
    1, 4, 8,
    1, 8, 5,
    // Left
    1, 5, 9,
    0, 1, 9,
    0, 9, 2,
    // Ridge underside is closed by the eave ring, viewed from below.
    2, 9, 6,
    3, 6, 7,
    4, 7, 8,
    5, 8, 9,
    6, 9, 8,
    6, 8, 7,
  ]);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Stylised stupa bowl: broad belly with a tightened crown. */
export function createDagobaBowlGeometry(): LatheGeometry {
  const geometry = new LatheGeometry(
    [
      new Vector2(0.62, -1),
      new Vector2(0.84, -0.84),
      new Vector2(0.98, -0.48),
      new Vector2(1, -0.08),
      new Vector2(0.92, 0.34),
      new Vector2(0.7, 0.7),
      new Vector2(0.4, 1),
    ],
    20,
  );
  geometry.computeBoundingSphere();
  return geometry;
}

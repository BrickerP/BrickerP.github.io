import { DataTexture, type Material, type MeshBasicMaterial, type MeshStandardMaterial, type Vector4 } from 'three';

let leafUvMap: DataTexture | undefined;

function leafMap(): DataTexture {
  if (!leafUvMap) {
    leafUvMap = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    leafUvMap.needsUpdate = true;
  }
  return leafUvMap;
}

/** World-metre surface patterns. The same brick size survives a scaled box. */
export type SurfaceKind =
  | 'streetBrick'
  | 'palaceBrick'
  | 'tile'
  | 'stone'
  | 'concrete'
  | 'bark'
  | 'glass'
  | 'leaf';

const KIND_INDEX: Record<SurfaceKind, number> = {
  streetBrick: 0,
  palaceBrick: 1,
  tile: 2,
  stone: 3,
  concrete: 4,
  bark: 5,
  glass: 6,
  leaf: 7,
};

const PATTERN = `
float surfaceHash(vec2 cell) {
  return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
}
float surfaceBrick(vec2 uv, vec2 brick, float mortar) {
  float row = floor(uv.y / brick.y);
  uv.x += mod(row, 2.0) * brick.x * 0.5;
  vec2 id = floor(uv / brick);
  vec2 cell = fract(uv / brick);
  vec2 aa = fwidth(uv / brick) * 1.25;
  float mortarX = smoothstep(mortar / brick.x, mortar / brick.x + aa.x, cell.x)
    * smoothstep(mortar / brick.x, mortar / brick.x + aa.x, 1.0 - cell.x);
  float mortarY = smoothstep(mortar / brick.y, mortar / brick.y + aa.y, cell.y)
    * smoothstep(mortar / brick.y, mortar / brick.y + aa.y, 1.0 - cell.y);
  float joint = mortarX * mortarY;
  float tone = 0.9 + 0.1 * surfaceHash(id);
  return mix(0.78, tone, joint);
}
vec2 surfaceUv(vec3 world, vec3 normal) {
  vec3 n = abs(normal);
  if (n.y > 0.96) return world.xz;
  if (n.y < 0.22) return n.x > n.z ? world.zy : world.xy;
  vec2 slope = normalize(normal.xz + vec2(0.0001));
  return vec2(dot(world.xz, vec2(-slope.y, slope.x)), world.y);
}
vec3 surfacePattern(vec3 world, vec3 normal, vec2 uv, float kind) {
  vec2 plane = surfaceUv(world, normal);
  float feature = 0.08;
  if (kind < 1.5) feature = 0.065;
  else if (kind < 2.5) feature = 0.15;
  else if (kind < 3.5) feature = 0.32;
  else if (kind < 4.5) feature = 0.6;
  if (length(fwidth(plane)) > feature * 2.2) {
    return vec3(0.94);
  }
  float value = 1.0;
  if (kind < 0.5) value = surfaceBrick(plane, vec2(0.24, 0.065), 0.012);
  else if (kind < 1.5) value = surfaceBrick(plane, vec2(0.32, 0.09), 0.016);
  else if (kind < 2.5) {
    float row = plane.y / 0.15;
    float ridge = abs(fract(row) - 0.72);
    float barrel = 0.5 + 0.5 * sin(plane.x / 0.14 * 6.28318);
    value = mix(0.86, 1.0, smoothstep(0.0, 0.22, ridge)) * (0.92 + 0.08 * barrel);
  } else if (kind < 3.5) {
    value = mix(0.9, surfaceBrick(plane, vec2(0.55, 0.32), 0.016), 0.7);
  } else if (kind < 4.5) {
    float seam = smoothstep(0.015, 0.04, abs(fract(plane.y / 0.6) - 0.5));
    float pore = step(0.93, surfaceHash(floor(plane * 5.5)));
    value = mix(0.92, seam, 0.4) * mix(1.0, 0.8, pore);
  } else if (kind < 5.5) {
    float groove = sin(plane.x / 0.065 * 6.28318);
    float fine = sin(plane.x / 0.05 * 6.28318 + plane.y * 3.0);
    value = 0.86 + 0.08 * groove + 0.04 * fine;
  } else if (kind < 6.5) {
    vec2 cell = fract(plane * vec2(1.6, 2.2));
    float mullion = step(0.08, cell.x) * step(0.08, cell.y);
    float lit = step(0.72, surfaceHash(floor(plane * vec2(1.6, 2.2))));
    value = mix(0.62, mix(0.8, 1.15, lit), mullion);
  }
  float metres = length(fwidth(world));
  float turn = smoothstep(0.12, 0.45, length(fwidth(normal)));
  float nearCorner = 1.0 - smoothstep(0.08, 0.2, metres);
  value *= mix(1.0, 0.65, clamp(turn * nearCorner, 0.0, 1.0));
  return vec3(value);
}
`;

/** Paint a world-metre pattern onto a standard or basic material, including capture proxies. */
export function bindSurface(material: Material, kind: SurfaceKind): void {
  const typed = material as MeshStandardMaterial | MeshBasicMaterial;
  typed.userData.surfaceKind = kind;
  if (kind === 'leaf' && !typed.map) typed.map = leafMap();
  const index = KIND_INDEX[kind];
  typed.onBeforeCompile = (shader) => {
    shader.uniforms.surfaceKind = { value: index };
    const rough = shader.fragmentShader.includes('#include <roughnessmap_fragment>');
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vSurfaceWorld;\nvarying vec2 vSurfaceUv;',
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
         vec4 surfaceLocal = vec4(transformed, 1.0);
         #ifdef USE_BATCHING
           surfaceLocal = batchingMatrix * surfaceLocal;
         #endif
         #ifdef USE_INSTANCING
           surfaceLocal = instanceMatrix * surfaceLocal;
         #endif
         vSurfaceWorld = (modelMatrix * surfaceLocal).xyz;
         #ifdef USE_MAP
           vSurfaceUv = vMapUv;
         #elif defined( USE_UV )
           vSurfaceUv = uv;
         #else
           vSurfaceUv = vec2(0.0);
         #endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vSurfaceWorld;
         varying vec2 vSurfaceUv;
         uniform float surfaceKind;
         ${PATTERN}
         ${rough ? 'float surfaceRoughMul;' : ''}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         if (surfaceKind > 6.5) {
           vec2 petal = vSurfaceUv - 0.5;
           float radius = length(petal);
           float lobe = 0.47 + 0.035 * sin(atan(petal.y, petal.x) * 5.0);
           if (radius > lobe && dot(vSurfaceUv, vSurfaceUv) > 0.0001) discard;
           diffuseColor.rgb *= 0.72 + 0.35 * (1.0 - radius);
           ${rough ? 'surfaceRoughMul = 0.95;' : ''}
         } else {
           vec3 face = normalize(cross(dFdx(vSurfaceWorld), dFdy(vSurfaceWorld)));
           vec3 shade = surfacePattern(vSurfaceWorld, face, vSurfaceUv, surfaceKind);
           diffuseColor.rgb *= shade;
           ${rough ? 'surfaceRoughMul = clamp(0.82 + 0.28 * (1.0 - shade.r), 0.7, 1.25);' : ''}
         }`,
      );
    if (rough) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         roughnessFactor = clamp(roughnessFactor * surfaceRoughMul, 0.04, 1.0);`,
      );
    }
  };
  typed.customProgramCacheKey = () => `surface-${kind}`;
}

/** Lamp streaks on asphalt, and the same streaks plus a fixed ripple on water. */
export function bindWetSurface(
  material: MeshStandardMaterial,
  wetLamps: Vector4[],
  surface: 'asphalt' | 'water',
): void {
  const shade =
    surface === 'water'
      ? `float band = sin(vWetWorld.x * 0.9 + vWetWorld.z * 1.4);
         float sheen = 0.62 + 0.38 * band * band;
         outgoingLight += wet * sheen + vec3(0.015, 0.04, 0.05) * sheen;`
      : 'outgoingLight += wet;';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.wetLamps = { value: wetLamps };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWetWorld;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
         vec4 surfaceLocal = vec4(transformed, 1.0);
         #ifdef USE_BATCHING
           surfaceLocal = batchingMatrix * surfaceLocal;
         #endif
         #ifdef USE_INSTANCING
           surfaceLocal = instanceMatrix * surfaceLocal;
         #endif
         vWetWorld = (modelMatrix * surfaceLocal).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vWetWorld;\nuniform vec4 wetLamps[24];',
      )
      .replace(
        '#include <opaque_fragment>',
        `
        vec3 wet = vec3(0.0);
        vec2 viewXZ = cameraPosition.xz - vWetWorld.xz;
        float viewLen = length(viewXZ);
        vec2 viewDir = viewLen > 0.001 ? viewXZ / viewLen : vec2(0.0, 1.0);
        for (int i = 0; i < 24; i++) {
          if (wetLamps[i].w <= 0.0) continue;
          vec2 toLamp = wetLamps[i].xz - vWetWorld.xz;
          float dist = length(toLamp);
          vec2 lampDir = dist > 0.001 ? toLamp / dist : vec2(0.0);
          float facing = pow(max(dot(lampDir, viewDir), 0.0), 10.0);
          float falloff = exp(-dist * 0.48);
          wet += vec3(1.0, 0.72, 0.36) * wetLamps[i].w * facing * falloff;
        }
        ${shade}
        #include <opaque_fragment>
        `,
      );
  };
  material.customProgramCacheKey = () => `wet-${surface}`;
}

/** Pane grid in world metres so a wide shopfront does not stretch into a light strip. */
export function bindWindowLattice(material: MeshStandardMaterial): void {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWindowWorld;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
         vec4 surfaceLocal = vec4(transformed, 1.0);
         #ifdef USE_BATCHING
           surfaceLocal = batchingMatrix * surfaceLocal;
         #endif
         #ifdef USE_INSTANCING
           surfaceLocal = instanceMatrix * surfaceLocal;
         #endif
         vWindowWorld = (modelMatrix * surfaceLocal).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWindowWorld;')
      .replace(
        '#include <opaque_fragment>',
        `
        vec3 face = abs(normalize(cross(dFdx(vWindowWorld), dFdy(vWindowWorld))));
        vec2 paneUv = face.x > face.z ? vWindowWorld.zy : vWindowWorld.xy;
        if (face.y > face.x && face.y > face.z) paneUv = vWindowWorld.xz;
        paneUv *= vec2(2.6, 3.4);
        vec2 cell = fract(paneUv);
        vec2 paneId = floor(paneUv);
        float mortar = step(0.18, cell.x) * step(0.18, cell.y);
        float seed = fract(sin(dot(paneId, vec2(12.9898, 78.233))) * 43758.5453);
        float lit = step(0.68, seed);
        vec3 glow = vec3(1.0, 0.74, 0.4) * mortar * lit;
        outgoingLight = mix(outgoingLight * 0.22, glow, mortar * lit);
        #include <opaque_fragment>
        `,
      );
  };
  material.customProgramCacheKey = () => 'window-lattice';
}

import {
  ShaderMaterial,
  Vector2,
  type PerspectiveCamera,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';

/**
 * A one-pixel focus falloff. The hero distance stays sharp; only the far
 * band and the immediate foreground soften. The radius is in pixels so the
 * 48s seam does not depend on the viewport size.
 */
export class HeroFocusPass extends Pass {
  private readonly camera: PerspectiveCamera;
  private readonly material: ShaderMaterial;
  private readonly quad: FullScreenQuad;

  constructor(camera: PerspectiveCamera) {
    super();
    this.camera = camera;
    this.material = new ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uResolution: { value: new Vector2(1, 1) },
        uCameraNear: { value: camera.near },
        uCameraFar: { value: camera.far },
        uFocusDistance: { value: 16 },
        uFalloff: { value: 46 },
        uRadiusPx: { value: 1.25 },
        uBypass: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform vec2 uResolution;
        uniform float uCameraNear;
        uniform float uCameraFar;
        uniform float uFocusDistance;
        uniform float uFalloff;
        uniform float uRadiusPx;
        uniform float uBypass;
        varying vec2 vUv;

        float viewDistance(const float depth) {
          float z = (uCameraNear * uCameraFar) / ((uCameraFar - uCameraNear) * depth - uCameraFar);
          return -z;
        }

        void main() {
          vec4 sharp = texture2D(tDiffuse, vUv);
          if (uBypass > 0.5) {
            gl_FragColor = sharp;
            return;
          }
          float dist = viewDistance(texture2D(tDepth, vUv).r);
          float coc = clamp(abs(dist - uFocusDistance) / uFalloff, 0.0, 1.0);
          vec2 texel = (uRadiusPx * coc) / uResolution;
          vec4 sum = sharp * 0.28;
          sum += texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)) * 0.18;
          sum += texture2D(tDiffuse, vUv - vec2(texel.x, 0.0)) * 0.18;
          sum += texture2D(tDiffuse, vUv + vec2(0.0, texel.y)) * 0.18;
          sum += texture2D(tDiffuse, vUv - vec2(0.0, texel.y)) * 0.18;
          gl_FragColor = sum;
        }
      `,
    });
    this.quad = new FullScreenQuad(this.material);
    this.needsSwap = true;
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
  ): void {
    const uniforms = this.material.uniforms;
    uniforms.tDiffuse.value = readBuffer.texture;
    uniforms.tDepth.value = readBuffer.depthTexture;
    uniforms.uBypass.value = readBuffer.depthTexture ? 0 : 1;
    uniforms.uCameraNear.value = this.camera.near;
    uniforms.uCameraFar.value = this.camera.far;
    uniforms.uResolution.value.set(
      Math.max(1, readBuffer.width),
      Math.max(1, readBuffer.height),
    );
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (this.clear) renderer.clear();
    this.quad.render(renderer);
  }

  override dispose(): void {
    this.material.dispose();
    this.quad.dispose();
  }
}

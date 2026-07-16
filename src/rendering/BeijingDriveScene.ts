import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import {
  createPathRibbon,
  pathHeading,
  samplePathFrame,
  wrapProgress,
} from './drivePath';
import { DRIVE_PATH_SCALE } from './FirstPersonCameraRig';
import { DRIVE, PALETTE } from './theme';

const TAU = Math.PI * 2;

export interface CapturePerformanceState {
  active: boolean;
  proxiedMeshCount: number;
  cachedProxyMaterialCount: number;
  visibleLampLightCount: number;
}

function hash01(index: number, salt = 0): number {
  const value = Math.sin(index * 91.173 + salt * 47.77) * 43758.5453;
  return value - Math.floor(value);
}

/** Unit triangular-prism roof: pitched in X, with its ridge running along Z. */
function createPitchedRoofGeometry(): BufferGeometry {
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
 * Procedural, locally-authored first-person Beijing drive world.
 *
 * One 32-second circuit crosses eight authored passages, each 1/8 of the
 * closed path:
 *   0.000–0.125  central axis — Zhengyangmen gate and a Tiananmen-style
 *                rostrum with huabiao columns and white balustrades
 *   0.125–0.250  Qianmen / Dashilar — pailou archway, hanging shop signs,
 *                red lanterns and warm shopfronts
 *   0.250–0.375  deep hutong — courtyard gates, door piers, locust canopy,
 *                power poles and lit windows
 *   0.375–0.500  Bell & Drum Tower plaza
 *   0.500–0.625  Shichahai waterfront — willows, humpback stone bridge,
 *                far-bank lanterns and a distant white dagoba
 *   0.625–0.750  palace moat — long red wall and the corner tower silhouette
 *   0.750–0.875  Deshengmen and the Second Ring — arrow tower, road sign,
 *                guardrails and a restrained modern skyline
 *   0.875–1.000  overpass return that hides the loop seam
 */
export class BeijingDriveScene {
  readonly scene: Scene;

  private readonly root = new Group();
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();
  private readonly textures = new Set<Texture>();
  private readonly lampLights: Array<{ light: PointLight; phase: number }> = [];
  private readonly unitBox: BoxGeometry;
  private readonly unitCylinder: CylinderGeometry;
  private readonly unitSphere: SphereGeometry;
  private readonly unitPitchedRoof: BufferGeometry;
  private readonly waterMaterial: MeshStandardMaterial;
  private readonly lampMaterial: MeshStandardMaterial;
  private readonly windowMaterial: MeshStandardMaterial;
  private readonly lanternMaterial: MeshStandardMaterial;
  private readonly keyLight: DirectionalLight;
  private readonly captureMaterialProxies = new Map<
    MeshStandardMaterial,
    MeshBasicMaterial
  >();
  private readonly captureOriginalMaterials = new Map<
    Mesh,
    Material | Material[]
  >();
  private capturePerformanceMode = false;
  private disposed = false;

  constructor() {
    this.scene = new Scene();
    this.scene.name = 'Beijing endless drive';
    this.scene.background = new Color(PALETTE.skyTop);
    this.scene.fog = new Fog(PALETTE.fog, 40, 165);
    this.scene.add(this.root);

    this.unitBox = this.trackGeometry(new BoxGeometry(1, 1, 1));
    this.unitCylinder = this.trackGeometry(new CylinderGeometry(1, 1, 1, 8));
    this.unitSphere = this.trackGeometry(new SphereGeometry(1, 10, 7));
    this.unitPitchedRoof = this.trackGeometry(createPitchedRoofGeometry());

    this.waterMaterial = this.standard(PALETTE.water, {
      emissive: '#0B202A',
      emissiveIntensity: 0.16,
      metalness: 0.08,
      roughness: 0.46,
    });
    this.lampMaterial = this.standard(PALETTE.lamp, {
      emissive: PALETTE.lamp,
      emissiveIntensity: 1.45,
      roughness: 0.55,
    });
    this.windowMaterial = this.standard('#E8B25F', {
      emissive: '#D89A45',
      emissiveIntensity: 0.62,
      roughness: 0.8,
    });
    this.lanternMaterial = this.standard(PALETTE.palaceRed, {
      emissive: '#A33420',
      emissiveIntensity: 0.85,
      roughness: 0.7,
    });

    this.scene.add(new HemisphereLight('#BED3DC', '#4C4740', 2.4));
    this.keyLight = new DirectionalLight('#F2D5B0', 1.55);
    this.keyLight.position.set(-42, 68, -24);
    this.scene.add(this.keyLight);

    this.buildSkyAndGround();
    this.buildRoad();
    this.buildDistantSkyline();
    this.buildCentralAxis();
    this.buildQianmenStreet();
    this.buildHutong();
    this.buildBellDrumPlaza();
    this.buildWaterfront();
    this.buildPalaceMoat();
    this.buildRingRoad();
    this.buildOverpass();
  }

  /** All changing values are reconstructed from phase, including the seam. */
  update(phase: number): void {
    const progress = wrapProgress(phase);
    const wave = 0.5 + 0.5 * Math.cos(progress * TAU);
    this.waterMaterial.emissiveIntensity = 0.13 + wave * 0.04;
    this.lampMaterial.emissiveIntensity = 1.38 + wave * 0.12;
    this.keyLight.intensity = 1.42 + wave * 0.1;

    for (const entry of this.lampLights) {
      entry.light.intensity =
        0.72 + 0.08 * Math.cos((progress + entry.phase) * TAU);
    }
    if (this.capturePerformanceMode) {
      for (const [source, proxy] of this.captureMaterialProxies) {
        this.applyCaptureColor(source, proxy);
      }
    }
  }

  /** Avoid software-renderer stalls while preserving the authored geometry. */
  setCapturePerformanceMode(active: boolean): void {
    if (this.capturePerformanceMode === active) return;
    this.capturePerformanceMode = active;
    for (const entry of this.lampLights) entry.light.visible = !active;

    if (active) {
      try {
        this.root.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          const original = object.material;
          const proxy = Array.isArray(original)
            ? original.map((material) => this.captureProxy(material))
            : this.captureProxy(original);
          if (proxy === original) return;
          if (
            Array.isArray(original) &&
            Array.isArray(proxy) &&
            proxy.every((material, index) => material === original[index])
          ) {
            return;
          }
          this.captureOriginalMaterials.set(object, original);
          object.material = proxy;
        });
      } catch (error) {
        this.restoreCaptureMaterials();
        this.capturePerformanceMode = false;
        for (const entry of this.lampLights) entry.light.visible = true;
        throw error;
      }
      return;
    }

    this.restoreCaptureMaterials();
  }

  /** QA evidence that capture-only simplifications are active and reversible. */
  readCapturePerformanceState(): CapturePerformanceState {
    return {
      active: this.capturePerformanceMode,
      proxiedMeshCount: this.captureOriginalMaterials.size,
      cachedProxyMaterialCount: this.captureMaterialProxies.size,
      visibleLampLightCount: this.lampLights.filter(({ light }) => light.visible).length,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.setCapturePerformanceMode(false);
    for (const texture of this.textures) texture.dispose();
    for (const material of this.materials) material.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    this.scene.clear();
  }

  private buildSkyAndGround(): void {
    const skyGeometry = this.trackGeometry(new SphereGeometry(360, 32, 14));
    const position = skyGeometry.getAttribute('position');
    const colors: number[] = [];
    const horizon = new Color(PALETTE.skyHorizon);
    const zenith = new Color(PALETTE.skyTop);
    const sample = new Color();
    for (let index = 0; index < position.count; index += 1) {
      const height = position.getY(index);
      const mix = Math.max(0, Math.min(1, (height + 22) / 190));
      sample.copy(horizon).lerp(zenith, mix * mix * (3 - 2 * mix));
      colors.push(sample.r, sample.g, sample.b);
    }
    skyGeometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    const skyMaterial = this.trackMaterial(
      new MeshBasicMaterial({
        vertexColors: true,
        side: BackSide,
        fog: false,
        depthWrite: false,
      }),
    );
    const sky = new Mesh(skyGeometry, skyMaterial);
    sky.renderOrder = -100;
    this.root.add(sky);

    const groundMaterial = this.standard('#1A2021', { roughness: 1 });
    const groundGeometry = this.trackGeometry(new PlaneGeometry(320, 320));
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    this.root.add(ground);
  }

  private buildRoad(): void {
    const roadMaterial = this.standard(PALETTE.asphalt, { roughness: 0.94 });
    const pavementMaterial = this.standard(PALETTE.pavement, { roughness: 1 });
    const laneMaterial = this.standard(PALETTE.lane, {
      emissive: '#29271F',
      emissiveIntensity: 0.18,
      roughness: 0.9,
    });

    this.root.add(
      new Mesh(
        this.trackGeometry(
          createPathRibbon(-DRIVE.roadHalfWidth, DRIVE.roadHalfWidth, 0, {
            centerScale: DRIVE_PATH_SCALE,
            segments: 840,
          }),
        ),
        roadMaterial,
      ),
    );
    this.root.add(
      new Mesh(
        this.trackGeometry(
          createPathRibbon(-6.35, -DRIVE.roadHalfWidth - 0.16, 0.04, {
            centerScale: DRIVE_PATH_SCALE,
            segments: 840,
          }),
        ),
        pavementMaterial,
      ),
      new Mesh(
        this.trackGeometry(
          createPathRibbon(DRIVE.roadHalfWidth + 0.16, 6.35, 0.04, {
            centerScale: DRIVE_PATH_SCALE,
            segments: 840,
          }),
        ),
        pavementMaterial,
      ),
    );

    for (let index = 0; index < 104; index += 1) {
      const dash = this.box(0.12, 0.025, 2.25, laneMaterial);
      this.place(dash, (index + 0.3) / 104, 0, 0.035);
      this.root.add(dash);
    }
  }

  private buildDistantSkyline(): void {
    const material = this.standard('#34414A', { roughness: 1 });
    const roofMaterial = this.standard(PALETTE.roof, { roughness: 1 });
    for (let index = 0; index < 40; index += 1) {
      const progress = (index + 0.5) / 40;
      const side = index % 2 === 0 ? -1 : 1;
      const width = 5 + hash01(index, 1) * 7;
      const height = 6 + hash01(index, 2) * 14;
      const depth = 6 + hash01(index, 3) * 8;
      // Far band: keeps the authored passage anchors in front of the skyline.
      const offset = side * (28 + hash01(index, 4) * 10);
      const block = this.box(width, height, depth, material);
      this.place(block, progress, offset, height / 2 - 0.02);
      this.root.add(block);

      if (index % 3 === 0) {
        const cap = this.box(width + 0.7, 0.45, depth + 0.7, roofMaterial);
        this.place(cap, progress, offset, height + 0.18);
        this.root.add(cap);
      }
    }
  }

  /** 0.000–0.125 — ceremonial central axis with two gate silhouettes. */
  private buildCentralAxis(): void {
    const red = this.standard(PALETTE.wallRed, { roughness: 0.92 });
    const stone = this.standard(PALETTE.stone, { roughness: 0.96 });

    for (let index = 0; index < 8; index += 1) {
      const progress = 0.006 + index * 0.0148;
      for (const side of [-1, 1]) {
        const wall = this.box(4.2, 2.55, 6.4, red);
        this.place(wall, progress, side * 9.2, 1.27);
        this.root.add(wall);
      }
    }

    this.buildAxisGate(0.045, 1, '正阳门');
    this.buildAxisGate(0.098, 1.24);

    // Huabiao columns and white balustrades announce the rostrum.
    for (const side of [-1, 1]) {
      const huabiao = new Group();
      this.place(huabiao, 0.088, side * 7.7, 0);
      const column = this.cylinder(0.24, 6.1, stone);
      column.position.y = 3.05;
      const capital = this.box(1.05, 0.2, 0.52, stone);
      capital.position.y = 5.55;
      const crown = new Mesh(this.unitSphere, stone);
      crown.scale.set(0.34, 0.42, 0.34);
      crown.position.y = 6.28;
      huabiao.add(column, capital, crown);
      this.root.add(huabiao);
    }
    for (let index = 0; index < 12; index += 1) {
      const progress = 0.072 + index * 0.0036;
      for (const side of [-1, 1]) {
        const post = this.box(0.28, 1.05, 0.28, stone);
        this.place(post, progress, side * 6.7, 0.55);
        const rail = this.box(0.18, 0.16, 2.3, stone);
        this.place(rail, progress, side * 6.7, 1.02);
        this.root.add(post, rail);
      }
    }

    for (const progress of [0.018, 0.052, 0.086, 0.118]) {
      this.addLamp(progress, -6.6, progress === 0.052);
      this.addLamp(progress, 6.6, progress === 0.086);
    }
    this.addTree(0.028, -12.3, 4.5);
    this.addTree(0.062, 12.1, 4.8);
    this.addTree(0.115, -12.5, 4.3);
  }

  /** Shared gate-tower silhouette for Zhengyangmen and the rostrum. */
  private buildAxisGate(progress: number, scale: number, plaqueText?: string): void {
    const palaceRed = this.standard(PALETTE.palaceRed, { roughness: 0.86 });
    const roof = this.standard(PALETTE.roof, { roughness: 1 });
    const roofEdge = this.standard(PALETTE.roofEdge, {
      emissive: '#2A1B09',
      emissiveIntensity: 0.15,
      roughness: 0.85,
    });

    const gate = new Group();
    this.place(gate, progress, 0, 0);
    gate.scale.setScalar(scale);
    const leftPier = this.box(4.5, 6.4, 4.8, palaceRed);
    leftPier.position.set(-7.15, 3.2, 0);
    const rightPier = this.box(4.5, 6.4, 4.8, palaceRed);
    rightPier.position.set(7.15, 3.2, 0);
    const upperHall = this.box(18.8, 2.25, 4.9, palaceRed);
    upperHall.position.y = 6.45;
    const roofMass = new Mesh(this.unitPitchedRoof, roof);
    roofMass.scale.set(7.1, 1.58, 21.2);
    roofMass.rotation.y = Math.PI / 2;
    roofMass.position.y = 7.5;
    const goldEdge = this.box(21.2, 0.18, 6.9, roofEdge);
    goldEdge.position.y = 7.52;
    const towerHall = this.box(13.2, 1.55, 3.55, palaceRed);
    towerHall.position.y = 9.05;
    const upperRoof = new Mesh(this.unitPitchedRoof, roof);
    upperRoof.scale.set(5.35, 1.18, 15.5);
    upperRoof.rotation.y = Math.PI / 2;
    upperRoof.position.y = 9.82;
    const upperGoldEdge = this.box(15.8, 0.14, 5.55, roofEdge);
    upperGoldEdge.position.y = 9.82;

    gate.add(
      leftPier,
      rightPier,
      upperHall,
      roofMass,
      goldEdge,
      towerHall,
      upperRoof,
      upperGoldEdge,
    );

    if (plaqueText) {
      const plaque = this.canvasPlaque(plaqueText, {
        width: 640,
        height: 224,
        background: '#123E46',
        border: '#D4AD5C',
        color: '#F3D78D',
        font: '700 112px "Songti SC", "STSong", serif',
      });
      if (plaque) {
        const panel = new Mesh(
          this.trackGeometry(new PlaneGeometry(3.8, 1.34)),
          plaque,
        );
        panel.position.set(0, 6.45, -2.48);
        panel.rotation.y = Math.PI;
        gate.add(panel);
      }
    }
    this.root.add(gate);
  }

  /** 0.125–0.250 — Qianmen / Dashilar shopping street. */
  private buildQianmenStreet(): void {
    const brick = this.standard('#5C6466', { roughness: 1 });
    const darkBrick = this.standard('#495254', { roughness: 1 });
    const roof = this.standard('#3A4341', { roughness: 1 });
    const signBoards = ['茶莊', '綢緞', '書局', '醬園'];

    for (let index = 0; index < 14; index += 1) {
      const progress = 0.128 + index * 0.008;
      for (const side of [-1, 1]) {
        const width = 3.7 + hash01(index, side + 21) * 1.5;
        const height = 4.3 + hash01(index, side + 25) * 1.2;
        const depth = 4.2 + hash01(index, side + 29) * 2;
        const group = new Group();
        this.place(group, progress, side * 8.35, 0);

        const wall = this.box(width, height, depth, index % 3 === 2 ? darkBrick : brick);
        wall.position.y = height / 2;
        const roofCap = new Mesh(this.unitPitchedRoof, roof);
        roofCap.scale.set(width + 0.8, 0.8, depth + 1);
        roofCap.position.y = height + 0.04;
        const roadFaceX = side > 0 ? width / 2 + 0.05 : -width / 2 - 0.05;
        group.add(wall, roofCap);
        // Mullioned shopfront: separate panes read as windows, not billboards.
        const paneSpan = Math.min(1.05, depth * 0.22);
        for (const along of [-paneSpan, 0.12, paneSpan]) {
          const pane = this.box(0.06, 0.78, paneSpan * 0.72, this.windowMaterial);
          pane.position.set(roadFaceX, 1.32, along);
          group.add(pane);
        }

        if (index % 2 === 0) {
          const board = this.buildVerticalSignBoard(
            signBoards[(index / 2 + (side > 0 ? 1 : 0)) % signBoards.length],
          );
          if (board) {
            board.position.set(
              side > 0 ? width / 2 - 0.55 : -width / 2 + 0.55,
              height - 1.6,
              side > 0 ? -depth / 2 - 0.32 : depth / 2 + 0.32,
            );
            group.add(board);
          }
        }
        if (index % 2 === 1) {
          for (const along of [-0.9, 0.9]) {
            const hanger = this.box(0.3, 0.05, 0.05, this.standard('#33291C', { roughness: 1 }));
            hanger.position.set(roadFaceX + (side > 0 ? 0.17 : -0.17), height - 0.62, along);
            const lantern = new Mesh(this.unitSphere, this.lanternMaterial);
            lantern.scale.set(0.19, 0.23, 0.19);
            lantern.position.set(roadFaceX + (side > 0 ? 0.34 : -0.34), height - 0.92, along);
            group.add(hanger, lantern);
          }
        }
        this.root.add(group);
      }
    }

    this.buildPailou(0.158, '大栅栏');
    this.buildPailou(0.238);

    this.addLamp(0.135, -6.5, true);
    this.addLamp(0.178, 6.5, false);
    this.addLamp(0.222, -6.5, true);
    this.addTree(0.148, 11.9, 4.2);
    this.addTree(0.205, -11.8, 4.4);
  }

  /** Wooden pailou archway spanning the full street. */
  private buildPailou(progress: number, plaqueText?: string): void {
    const palaceRed = this.standard(PALETTE.palaceRed, { roughness: 0.86 });
    const roof = this.standard(PALETTE.roof, { roughness: 1 });
    const timber = this.standard('#5A4630', { roughness: 0.92 });

    const arch = new Group();
    this.place(arch, progress, 0, 0);
    for (const x of [-7.4, -2.9, 2.9, 7.4]) {
      const column = this.cylinder(0.22, 6, palaceRed);
      column.position.set(x, 3, 0);
      arch.add(column);
    }
    const lowBeam = this.box(15.6, 0.5, 0.62, palaceRed);
    lowBeam.position.y = 5.05;
    const highBeam = this.box(15.9, 0.42, 0.58, timber);
    highBeam.position.y = 6.02;
    arch.add(lowBeam, highBeam);
    const bays: Array<[number, number]> = [
      [-5.15, 4.7],
      [0, 6.1],
      [5.15, 4.7],
    ];
    for (const [x, span] of bays) {
      const bayRoof = new Mesh(this.unitPitchedRoof, roof);
      bayRoof.scale.set(1.35, 0.72, span);
      bayRoof.rotation.y = Math.PI / 2;
      bayRoof.position.set(x, x === 0 ? 6.45 : 5.5, 0);
      arch.add(bayRoof);
    }

    if (plaqueText) {
      const plaque = this.canvasPlaque(plaqueText, {
        width: 512,
        height: 176,
        background: '#1C3A2E',
        border: '#C9A056',
        color: '#EFD494',
        font: '700 100px "Songti SC", "STSong", serif',
      });
      if (plaque) {
        const panel = new Mesh(
          this.trackGeometry(new PlaneGeometry(2.9, 1)),
          plaque,
        );
        panel.position.set(0, 5.55, -0.34);
        panel.rotation.y = Math.PI;
        arch.add(panel);
      }
    }
    this.root.add(arch);
  }

  /** Hanging vertical shop sign with stacked calligraphy. */
  private buildVerticalSignBoard(text: string): Group | undefined {
    const material = this.canvasPlaque(text, {
      width: 128,
      height: 384,
      background: '#20291F',
      border: '#B98F45',
      color: '#E4C377',
      font: '700 84px "Songti SC", "STSong", serif',
      vertical: true,
    });
    if (!material) return undefined;
    const group = new Group();
    const backing = this.box(0.56, 2.15, 0.1, this.standard('#242B26', { roughness: 0.95 }));
    const face = new Mesh(this.trackGeometry(new PlaneGeometry(0.5, 2.02)), material);
    face.position.z = -0.06;
    face.rotation.y = Math.PI;
    const bracket = this.box(0.08, 0.4, 0.08, this.standard('#33291C', { roughness: 1 }));
    bracket.position.y = 1.3;
    group.add(backing, face, bracket);
    return group;
  }

  /** 0.250–0.375 — deep residential hutong. */
  private buildHutong(): void {
    const brick = this.standard('#596162', { roughness: 1 });
    const darkBrick = this.standard('#454E50', { roughness: 1 });
    const roof = this.standard('#515A59', { roughness: 1 });
    const eave = this.standard('#303735', { roughness: 1 });
    const door = this.standard(PALETTE.wallRed, {
      emissive: '#260604',
      emissiveIntensity: 0.14,
      roughness: 0.9,
    });
    const stone = this.standard(PALETTE.stone, { roughness: 1 });
    const lintel = this.standard('#2C3230', { roughness: 1 });

    for (let index = 0; index < 17; index += 1) {
      const progress = 0.2535 + index * 0.0072;
      for (const side of [-1, 1]) {
        const width = 3.3 + hash01(index, side + 4) * 1.8;
        const depth = 4.1 + hash01(index, side + 8) * 2.9;
        const height = 2.7 + hash01(index, side + 12) * 1.35;
        const group = new Group();
        this.place(group, progress, side * 7.65, 0);
        const roadFaceX = side > 0 ? width / 2 + 0.045 : -width / 2 - 0.045;

        const wall = this.box(width, height, depth, index % 4 === 0 ? darkBrick : brick);
        wall.position.y = height / 2;
        const roofCap = new Mesh(this.unitPitchedRoof, roof);
        roofCap.scale.set(width + 0.78, 0.86, depth + 0.98);
        roofCap.position.y = height + 0.04;
        const roofEave = this.box(width + 0.98, 0.16, depth + 1.12, eave);
        roofEave.position.y = height + 0.06;
        group.add(wall, roofCap, roofEave);

        if ((index + (side > 0 ? 0 : 2)) % 3 === 1) {
          // Courtyard gate bay: recessed double door, lintel and door piers.
          const doorLeft = this.box(0.08, 1.78, 0.6, door);
          doorLeft.position.set(roadFaceX, 0.92, -0.33);
          const doorRight = this.box(0.08, 1.78, 0.6, door);
          doorRight.position.set(roadFaceX, 0.92, 0.33);
          const gateLintel = this.box(0.16, 0.24, 1.7, lintel);
          gateLintel.position.set(roadFaceX, 1.95, 0);
          const gateRoof = new Mesh(this.unitPitchedRoof, roof);
          gateRoof.scale.set(0.9, 0.42, 2.1);
          gateRoof.position.set(roadFaceX, 2.07, 0);
          const step = this.box(0.5, 0.12, 1.9, stone);
          step.position.set(roadFaceX + (side > 0 ? 0.22 : -0.22), 0.06, 0);
          group.add(doorLeft, doorRight, gateLintel, gateRoof, step);
          for (const along of [-0.78, 0.78]) {
            const pier = this.box(0.26, 0.4, 0.26, stone);
            pier.position.set(roadFaceX + (side > 0 ? 0.24 : -0.24), 0.2, along);
            group.add(pier);
          }
        } else {
          const doorPanel = this.box(0.08, 1.75, 1.05, door);
          doorPanel.position.set(roadFaceX, 0.9, depth * 0.12);
          group.add(doorPanel);
          if (index % 3 === 0) {
            const litWindow = this.box(0.06, 0.62, 0.9, this.windowMaterial);
            litWindow.position.set(roadFaceX, 1.45, -depth * 0.22);
            group.add(litWindow);
          }
        }
        this.root.add(group);
      }

      if (index % 4 === 1) {
        this.addLocustTree(progress + 0.002, index % 8 < 4 ? 6.45 : -6.45);
      }
    }

    // Leaning power poles with long catenary spans.
    const poleMaterial = this.standard('#2E2A24', { roughness: 1 });
    const polePositions: Array<[number, number]> = [
      [0.262, -6.9],
      [0.298, -6.9],
      [0.301, 6.9],
      [0.336, 6.9],
    ];
    for (const [progress, offset] of polePositions) {
      const group = new Group();
      this.place(group, progress, offset, 0);
      const pole = this.cylinder(0.09, 6, poleMaterial);
      pole.position.y = 3;
      pole.rotation.z = offset > 0 ? -0.03 : 0.03;
      const crossarm = this.box(1.5, 0.09, 0.09, poleMaterial);
      crossarm.position.y = 5.35;
      group.add(pole, crossarm);
      this.root.add(group);
    }
    for (const [fromProgress, toProgress, offset] of [
      [0.262, 0.298, -6.9],
      [0.301, 0.336, 6.9],
    ] as const) {
      const mid = (fromProgress + toProgress) / 2;
      const wire = this.box(0.035, 0.035, 19.2, poleMaterial);
      this.place(wire, mid, offset, 5.18);
      this.root.add(wire);
    }

    this.addLamp(0.27, -6.35, false);
    this.addLamp(0.315, 6.35, true);
    this.addLamp(0.358, -6.35, false);
    this.buildStreetPlaque(0.259, -5.7, '前门东河沿街', 'QIANMEN DONGHEYAN ST');
    this.buildStreetPlaque(0.363, 5.7, '烟袋斜街', 'YANDAI XIEJIE');
  }

  /** 0.375–0.500 — the Bell & Drum Tower pair above low grey shops. */
  private buildBellDrumPlaza(): void {
    const brick = this.standard('#565F60', { roughness: 1 });
    const roof = this.standard('#4B5453', { roughness: 1 });

    for (let index = 0; index < 9; index += 1) {
      const progress = 0.379 + index * 0.0102;
      for (const side of [-1, 1]) {
        if (side < 0 && index >= 4) continue; // clear the tower forecourt
        const width = 4 + hash01(index, side + 41) * 1.6;
        const height = 3 + hash01(index, side + 45) * 0.9;
        const depth = 4.4 + hash01(index, side + 49) * 2.2;
        const group = new Group();
        this.place(group, progress, side * 8.9, 0);
        const wall = this.box(width, height, depth, brick);
        wall.position.y = height / 2;
        const roofCap = new Mesh(this.unitPitchedRoof, roof);
        roofCap.scale.set(width + 0.7, 0.7, depth + 0.9);
        roofCap.position.y = height + 0.03;
        group.add(wall, roofCap);
        if (index % 3 === 1) {
          const roadFaceX = side > 0 ? width / 2 + 0.05 : -width / 2 - 0.05;
          const litWindow = this.box(0.06, 0.7, 1.3, this.windowMaterial);
          litWindow.position.set(roadFaceX, 1.4, 0);
          group.add(litWindow);
        }
        this.root.add(group);
      }
    }

    this.buildDrumTower(0.437, -14.5, 1.6);
    this.buildBellTower(0.487, -14, 1.5);

    this.addLamp(0.39, 6.5, true);
    this.addLamp(0.443, -6.4, true);
    this.addLamp(0.487, 6.5, false);
    this.addTree(0.41, 12.2, 4.6);
    this.addTree(0.46, 12.4, 4.2);
  }

  private buildBellTower(progress: number, offset: number, scale: number): void {
    const masonry = this.standard('#57636B', { roughness: 1 });
    const body = this.standard('#4A565E', { roughness: 1 });
    const roof = this.standard('#232E2E', { roughness: 1 });
    const group = new Group();
    this.place(group, progress, offset, 0);
    group.scale.setScalar(scale);

    const base = this.box(7.6, 2.9, 5.4, masonry);
    base.position.y = 1.45;
    const tower = this.box(5.2, 3.4, 3.9, body);
    tower.position.y = 4.5;
    const recess = this.box(1.5, 1.7, 4, roof);
    recess.position.y = 4.2;
    const lowerRoof = new Mesh(this.unitPitchedRoof, roof);
    lowerRoof.scale.set(4.7, 1, 7.3);
    lowerRoof.rotation.y = Math.PI / 2;
    lowerRoof.position.y = 6.2;
    const crown = this.box(3.6, 1, 2.7, body);
    crown.position.y = 7.5;
    const topRoof = new Mesh(this.unitPitchedRoof, roof);
    topRoof.scale.set(3.4, 0.95, 5.2);
    topRoof.rotation.y = Math.PI / 2;
    topRoof.position.y = 8;
    group.add(base, tower, recess, lowerRoof, crown, topRoof);
    this.root.add(group);
  }

  /** 0.500–0.625 — Shichahai bank: willows, stone bridge, far-bank lanterns. */
  private buildWaterfront(): void {
    const stone = this.standard(PALETTE.stone, {
      emissive: '#302D27',
      emissiveIntensity: 0.08,
      roughness: 0.98,
    });
    const oppositeWall = this.standard('#46545A', { roughness: 1 });
    const barWall = this.standard('#3E4A50', { roughness: 1 });

    // One continuous water body carries Shichahai into the palace moat.
    const water = new Mesh(
      this.trackGeometry(
        createPathRibbon(-22, -6.45, -0.06, {
          from: 0.503,
          to: 0.748,
          centerScale: DRIVE_PATH_SCALE,
          segments: 150,
        }),
      ),
      this.waterMaterial,
    );
    this.root.add(water);

    for (let index = 0; index < 20; index += 1) {
      const progress = 0.507 + index * 0.0058;
      const post = this.box(0.52, 1.5, 0.52, stone);
      this.place(post, progress, -6.38, 0.77);
      const cap = this.box(0.7, 0.16, 0.7, stone);
      this.place(cap, progress, -6.38, 1.56);
      const topRail = this.box(0.3, 0.24, 3.4, stone);
      this.place(topRail, progress, -6.38, 1.23);
      const lowerRail = this.box(0.24, 0.18, 3.4, stone);
      this.place(lowerRail, progress, -6.38, 0.55);
      this.root.add(post, cap, topRail, lowerRail);
    }

    // Far bank: low bar fronts with warm windows behind a lantern string.
    for (let index = 0; index < 10; index += 1) {
      const progress = 0.512 + index * 0.0115;
      const group = new Group();
      this.place(group, progress, -24.5, 0);
      const height = 2.7 + hash01(index, 61) * 0.9;
      const building = this.box(4.6, height, 5.4, index % 3 === 0 ? oppositeWall : barWall);
      building.position.y = height / 2;
      const glow = this.box(0.08, 0.6, 2.6, this.windowMaterial);
      glow.position.set(-2.36, 1.15, 0);
      group.add(building, glow);
      this.root.add(group);
    }
    // Houhai-style lantern string tracing the water's far edge.
    for (let index = 0; index < 16; index += 1) {
      const progress = 0.513 + index * 0.0068;
      const sag = index % 2 === 0 ? 0 : -0.28;
      const lantern = new Mesh(this.unitSphere, this.lanternMaterial);
      lantern.scale.set(0.3, 0.36, 0.3);
      this.place(lantern, progress, -21.6, 2.35 + sag);
      this.root.add(lantern);
    }

    // Opposite side of the road stays low and residential.
    for (const progress of [0.515, 0.55, 0.585, 0.62]) {
      const building = this.box(4.8, 3.4, 6, oppositeWall);
      this.place(building, progress, 10.2, 1.7);
      this.root.add(building);
    }

    this.buildHumpbackBridge(0.585, -13.8);
    this.buildWhiteDagoba(0.552, -35);

    for (const progress of [0.52, 0.548, 0.61]) {
      this.addWillow(progress, -5.9);
    }
    this.addLamp(0.535, -5.62, true);
    this.addLamp(0.59, -5.62, false);
    this.addLamp(0.612, 6.5, true);
    this.addTree(0.56, 8.2, 4.2);
    this.addTree(0.605, 8.5, 4.8);
  }

  /** Silver Ingot-style humpback stone bridge across the water. */
  private buildHumpbackBridge(progress: number, offset: number): void {
    const stone = this.standard(PALETTE.stone, {
      emissive: '#34312A',
      emissiveIntensity: 0.1,
      roughness: 1,
    });
    const group = new Group();
    this.place(group, progress, offset, 0, Math.PI / 2);
    const steps: Array<[number, number]> = [
      [-5, 1.15],
      [-2.6, 2.3],
      [0, 3.05],
      [2.6, 2.3],
      [5, 1.15],
    ];
    for (const [x, height] of steps) {
      const span = this.box(2.75, height, 3.2, stone);
      span.position.set(x, height / 2 - 0.05, 0);
      group.add(span);
      for (const z of [-1.66, 1.66]) {
        const parapet = this.box(2.75, 0.36, 0.2, stone);
        parapet.position.set(x, height + 0.13, z);
        group.add(parapet);
      }
    }
    this.root.add(group);
  }

  /** Beihai-style white dagoba floating above the far-bank roofline. */
  private buildWhiteDagoba(progress: number, offset: number): void {
    const white = this.standard('#E4DFD1', {
      emissive: '#3A382F',
      emissiveIntensity: 0.1,
      roughness: 0.9,
    });
    const gold = this.standard(PALETTE.roofEdge, { roughness: 0.85 });
    const group = new Group();
    this.place(group, progress, offset, 0);
    const platform = this.box(5.6, 1.4, 5.6, white);
    platform.position.y = 3.1;
    const body = new Mesh(this.unitSphere, white);
    body.scale.set(2.5, 2.7, 2.5);
    body.position.y = 6.1;
    const neck = this.cylinder(0.62, 2.6, white);
    neck.position.y = 9.3;
    const spire = this.cylinder(0.3, 1.8, gold);
    spire.position.y = 11.4;
    group.add(platform, body, neck, spire);
    this.root.add(group);
  }

  /** 0.625–0.750 — palace moat: long red wall and the corner tower. */
  private buildPalaceMoat(): void {
    const red = this.standard(PALETTE.wallRed, { roughness: 0.94 });
    const roof = this.standard(PALETTE.roof, { roughness: 1 });
    const stone = this.standard(PALETTE.stone, {
      emissive: '#302D27',
      emissiveIntensity: 0.08,
      roughness: 0.98,
    });

    for (let index = 0; index < 10; index += 1) {
      const progress = 0.629 + index * 0.0126;
      const wall = this.box(3.4, 3.9, 7.4, red);
      this.place(wall, progress, 9, 1.95);
      const cap = new Mesh(this.unitPitchedRoof, roof);
      cap.scale.set(4, 0.62, 7.9);
      this.place(cap, progress, 9, 3.9);
      this.root.add(wall, cap);
    }

    for (let index = 0; index < 18; index += 1) {
      const progress = 0.628 + index * 0.0066;
      const post = this.box(0.5, 1.45, 0.5, stone);
      this.place(post, progress, -6.38, 0.74);
      const rail = this.box(0.26, 0.2, 3.7, stone);
      this.place(rail, progress, -6.38, 1.18);
      this.root.add(post, rail);
    }

    this.buildCornerTower(0.699, -25);
    this.addLamp(0.643, 6.9, false);
    this.addLamp(0.694, -5.62, true);
    this.addLamp(0.738, 6.9, false);
    this.addTree(0.66, 12.6, 4.1);
    this.addTree(0.725, 12.3, 4.5);
  }

  /** Forbidden City corner tower silhouette across the moat. */
  private buildCornerTower(progress: number, offset: number): void {
    const red = this.standard(PALETTE.palaceRed, { roughness: 0.88 });
    const roof = this.standard('#242F2F', { roughness: 1 });
    const gold = this.standard(PALETTE.roofEdge, {
      emissive: '#2A1B09',
      emissiveIntensity: 0.15,
      roughness: 0.85,
    });
    const masonry = this.standard('#3E4A50', { roughness: 1 });

    const group = new Group();
    this.place(group, progress, offset, 0);
    const plinth = this.box(8.4, 2.2, 8.4, masonry);
    plinth.position.y = 1.1;
    const base = this.box(6.2, 2.6, 6.2, red);
    base.position.y = 3.5;
    group.add(plinth, base);

    const tiers: Array<[number, number, number]> = [
      [5, 1.05, 7.2],
      [3.9, 0.95, 5.7],
    ];
    let tierY = 4.9;
    for (const [halfSpanX, height, spanZ] of tiers) {
      for (const rotation of [0, Math.PI / 2]) {
        const eaves = new Mesh(this.unitPitchedRoof, roof);
        eaves.scale.set(halfSpanX, height, spanZ);
        eaves.rotation.y = rotation;
        eaves.position.y = tierY;
        group.add(eaves);
      }
      const edge = this.box(halfSpanX + 1.4, 0.12, halfSpanX + 1.4, gold);
      edge.position.y = tierY + 0.02;
      group.add(edge);
      tierY += 1.35;
      const body = this.box(halfSpanX - 1, 1.1, halfSpanX - 1, red);
      body.position.y = tierY - 0.4;
      group.add(body);
    }
    const crownRoof = new Mesh(this.unitPitchedRoof, roof);
    crownRoof.scale.set(3, 1.15, 3);
    crownRoof.position.y = tierY + 0.4;
    const crossCrown = crownRoof.clone();
    crossCrown.rotation.y = Math.PI / 2;
    const finial = new Mesh(this.unitSphere, gold);
    finial.scale.setScalar(0.3);
    finial.position.y = tierY + 1.75;
    group.add(crownRoof, crossCrown, finial);
    this.root.add(group);
  }

  /** 0.750–0.875 — Deshengmen arrow tower and the Second Ring roadway. */
  private buildRingRoad(): void {
    const concrete = this.standard('#69767C', { roughness: 0.96 });
    const glass = this.standard('#2C3A45', { roughness: 0.7, metalness: 0.15 });

    for (let index = 0; index < 14; index += 1) {
      const progress = 0.753 + index * 0.0088;
      for (const side of [-1, 1]) {
        const guard = this.box(0.36, 0.72, 3.7, concrete);
        this.place(guard, progress, side * 6.95, 0.55);
        this.root.add(guard);
      }
    }

    this.buildArrowTower(0.802, -13.5);
    this.buildSecondRingSign(0.838);

    // Restrained modern skyline: the ring road's time contrast.
    for (let index = 0; index < 5; index += 1) {
      const progress = 0.772 + index * 0.021;
      const height = 17 + hash01(index, 71) * 8;
      const width = 6.5 + hash01(index, 73) * 2.5;
      const towerOffset = 27 + hash01(index, 77) * 7;
      const tower = this.box(width, height, width, glass);
      this.place(tower, progress, towerOffset, height / 2);
      this.root.add(tower);
      const strip = this.box(0.18, height * 0.55, 0.18, this.windowMaterial);
      this.place(strip, progress - 0.0012, towerOffset - width / 2 + 0.4, height * 0.42);
      this.root.add(strip);
    }

    this.addLamp(0.762, -5.8, false);
    this.addLamp(0.826, 5.8, true);
    this.addLamp(0.862, -5.8, false);
  }

  /** Deshengmen-style arrow tower with ranked arrow windows. */
  private buildArrowTower(progress: number, offset: number): void {
    const masonry = this.standard('#4A5650', { roughness: 1 });
    const body = this.standard('#55625B', { roughness: 1 });
    const roof = this.standard('#222D2C', { roughness: 1 });
    const slot = this.standard('#161D1E', { roughness: 1 });

    const group = new Group();
    this.place(group, progress, offset, 0);
    const base = this.box(11.5, 2.4, 8.4, masonry);
    base.position.y = 1.2;
    const tower = this.box(10, 6.4, 7, body);
    tower.position.y = 5.6;
    group.add(base, tower);

    // Arrow windows rank across the road-facing side.
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        const window = this.box(0.1, 0.62, 0.48, slot);
        window.position.set(
          -5.06,
          3.6 + row * 1.7,
          -2.9 + column * 1.16,
        );
        group.add(window);
      }
    }

    const eaves = new Mesh(this.unitPitchedRoof, roof);
    eaves.scale.set(8.6, 1.9, 12.4);
    eaves.rotation.y = Math.PI / 2;
    eaves.position.y = 8.8;
    const ridge = this.box(12.7, 0.18, 0.45, this.standard('#3B3527', { roughness: 0.95 }));
    ridge.position.y = 10.72;
    group.add(eaves, ridge);
    this.root.add(group);
  }

  /** 0.875–1.000 — overpass compression that hides the loop seam. */
  private buildOverpass(): void {
    const concrete = this.standard('#69767C', {
      roughness: 0.96,
      side: DoubleSide,
    });
    const deepConcrete = this.standard('#48555C', {
      roughness: 1,
      side: DoubleSide,
    });

    const underside = new Mesh(
      this.trackGeometry(
        createPathRibbon(-7.1, 7.1, 5.75, {
          from: 0.8815,
          to: 0.9935,
          centerScale: DRIVE_PATH_SCALE,
          segments: 80,
        }),
      ),
      deepConcrete,
    );
    this.root.add(underside);

    for (let index = 0; index < 8; index += 1) {
      const progress = 0.884 + index * 0.0148;
      for (const side of [-1, 1]) {
        const column = this.box(0.9, 5.7, 0.9, concrete);
        this.place(column, progress, side * 6.55, 2.85);
        this.root.add(column);
      }
      const beam = this.box(15.2, 0.72, 1.05, concrete);
      this.place(beam, progress, 0, 5.42);
      this.root.add(beam);
    }

    for (let index = 0; index < 12; index += 1) {
      const progress = 0.878 + index * 0.0102;
      for (const side of [-1, 1]) {
        const guard = this.box(0.36, 0.72, 3.7, concrete);
        this.place(guard, progress, side * 6.95, 6.15);
        this.root.add(guard);
      }
    }

    this.addLamp(0.89, -5.8, false);
    this.addLamp(0.937, 5.8, false);
    this.addLamp(0.976, -5.8, false);
  }

  private buildStreetPlaque(
    progress: number,
    offset: number,
    name: string,
    latin: string,
  ): void {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 288;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = '#24618A';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#EEF4EE';
    context.lineWidth = 14;
    context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#FFFFFF';
    context.font = '800 84px "PingFang SC", "Microsoft YaHei", sans-serif';
    context.fillText(name, canvas.width / 2, 112);
    context.font = '650 31px Inter, Arial, sans-serif';
    context.letterSpacing = '3px';
    context.fillText(latin, canvas.width / 2, 221);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    this.textures.add(texture);
    const material = this.trackMaterial(
      new MeshBasicMaterial({
        map: texture,
        side: DoubleSide,
        fog: true,
        toneMapped: false,
      }),
    );
    const backingMaterial = this.standard('#293236', { roughness: 0.96 });
    const group = new Group();
    this.place(group, progress, offset, 0);
    const backing = this.box(3.86, 1.58, 0.16, backingMaterial);
    backing.position.y = 2.42;
    const sign = new Mesh(
      this.trackGeometry(new PlaneGeometry(3.68, 1.38)),
      material,
    );
    sign.position.set(0, 2.42, -0.09);
    sign.rotation.y = Math.PI;
    const leftPost = this.box(0.13, 1.6, 0.13, backingMaterial);
    leftPost.position.set(-1.46, 0.8, 0);
    const rightPost = leftPost.clone();
    rightPost.position.x = 1.46;
    group.add(backing, sign, leftPost, rightPost);
    this.root.add(group);
  }

  /** Reusable textured plaque material with an optional vertical layout. */
  private canvasPlaque(
    text: string,
    options: {
      width: number;
      height: number;
      background: string;
      border: string;
      color: string;
      font: string;
      vertical?: boolean;
    },
  ): MeshBasicMaterial | undefined {
    const canvas = document.createElement('canvas');
    canvas.width = options.width;
    canvas.height = options.height;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    context.fillStyle = options.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = options.border;
    context.lineWidth = Math.max(8, Math.round(canvas.width * 0.02));
    context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    context.fillStyle = options.color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = options.font;
    if (options.vertical) {
      const characters = [...text];
      const step = (canvas.height - 60) / characters.length;
      characters.forEach((character, index) => {
        context.fillText(character, canvas.width / 2, 30 + step * (index + 0.5));
      });
    } else {
      context.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
    }

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    this.textures.add(texture);
    return this.trackMaterial(
      new MeshBasicMaterial({ map: texture, side: DoubleSide, fog: true }),
    );
  }

  private buildDrumTower(progress: number, offset: number, scale = 1): void {
    const masonry = this.standard('#38464A', { roughness: 1 });
    const red = this.standard('#78352D', { roughness: 0.96 });
    const roof = this.standard('#202B2B', { roughness: 1 });
    const edge = this.standard('#86724B', { roughness: 0.92 });
    const group = new Group();
    this.place(group, progress, offset, 0);
    group.scale.setScalar(scale);

    const base = this.box(9.4, 3.5, 6.2, masonry);
    base.position.y = 1.75;
    const terrace = this.box(10.2, 0.42, 6.9, edge);
    terrace.position.y = 3.65;
    const hall = this.box(7.65, 2.45, 4.8, red);
    hall.position.y = 5.05;
    const lowerRoof = new Mesh(this.unitPitchedRoof, roof);
    lowerRoof.scale.set(6.45, 1.25, 10.4);
    lowerRoof.rotation.y = Math.PI / 2;
    lowerRoof.position.y = 6.25;
    const crown = this.box(5.3, 1.35, 3.45, red);
    crown.position.y = 7.72;
    const crownRoof = new Mesh(this.unitPitchedRoof, roof);
    crownRoof.scale.set(4.8, 1.08, 7.35);
    crownRoof.rotation.y = Math.PI / 2;
    crownRoof.position.y = 8.38;
    group.add(base, terrace, hall, lowerRoof, crown, crownRoof);
    this.root.add(group);
  }

  private buildSecondRingSign(progress: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = '#155B88';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#EAF4F5';
    context.lineWidth = 10;
    context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    context.fillStyle = '#FFFFFF';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '800 104px "PingFang SC", "Microsoft YaHei", sans-serif';
    context.fillText('二环', 222, canvas.height / 2 + 2);
    context.font = '700 64px Inter, Arial, sans-serif';
    context.fillText('SECOND RING', 662, canvas.height / 2 + 3);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    this.textures.add(texture);
    const signMaterial = this.trackMaterial(
      new MeshBasicMaterial({ map: texture, side: DoubleSide, fog: true }),
    );
    const signGeometry = this.trackGeometry(new PlaneGeometry(10.8, 2.5));

    const group = new Group();
    this.place(group, progress, 0, 0, Math.PI);
    const sign = new Mesh(signGeometry, signMaterial);
    sign.position.y = 4.22;
    const leftMount = this.box(0.18, 1.35, 0.18, this.standard('#69727A', { roughness: 1 }));
    leftMount.position.set(-4.35, 5.28, 0);
    const rightMount = leftMount.clone();
    rightMount.position.x = 4.35;
    group.add(sign, leftMount, rightMount);
    this.root.add(group);
  }

  private addLamp(progress: number, offset: number, castLight: boolean): void {
    const metal = this.standard('#3A4144', { metalness: 0.3, roughness: 0.72 });
    const group = new Group();
    this.place(group, progress, offset, 0);
    const pole = this.cylinder(0.065, 3.6, metal);
    pole.position.y = 1.8;
    const bulb = new Mesh(this.unitSphere, this.lampMaterial);
    bulb.scale.setScalar(0.24);
    bulb.position.y = 3.7;
    group.add(pole, bulb);

    if (castLight) {
      const light = new PointLight(PALETTE.lamp, 0.78, 15, 1.8);
      light.position.y = 3.58;
      group.add(light);
      this.lampLights.push({ light, phase: progress });
    }
    this.root.add(group);
  }

  private addTree(progress: number, offset: number, height: number): void {
    const trunkMaterial = this.standard('#3B3025', { roughness: 1 });
    const foliageMaterial = this.standard(PALETTE.foliage, { roughness: 1 });
    const group = new Group();
    this.place(group, progress, offset, 0);
    const trunk = this.cylinder(0.14, height * 0.58, trunkMaterial);
    trunk.position.y = height * 0.29;
    const canopy = new Mesh(this.unitSphere, foliageMaterial);
    canopy.scale.set(height * 0.38, height * 0.34, height * 0.42);
    canopy.position.y = height * 0.72;
    group.add(trunk, canopy);
    this.root.add(group);
  }

  /** Old locust street tree whose canopy leans over the hutong lane. */
  private addLocustTree(progress: number, offset: number): void {
    const trunkMaterial = this.standard('#39301F', { roughness: 1 });
    const foliageMaterial = this.standard(PALETTE.foliage, { roughness: 1 });
    const group = new Group();
    this.place(group, progress, offset, 0);
    const lean = offset > 0 ? 0.16 : -0.16;
    const trunk = this.cylinder(0.19, 3.6, trunkMaterial);
    trunk.position.set(0, 1.8, 0);
    trunk.rotation.z = lean;
    const bough = this.cylinder(0.12, 1.9, trunkMaterial);
    bough.position.set(lean * -8, 4.1, 0.4);
    bough.rotation.z = lean * 4;
    const canopy = new Mesh(this.unitSphere, foliageMaterial);
    canopy.scale.set(3.1, 1.55, 3.4);
    canopy.position.set(lean * -14, 5.15, 0);
    const drape = new Mesh(this.unitSphere, foliageMaterial);
    drape.scale.set(1.5, 1, 1.7);
    drape.position.set(lean * -22, 4.55, 1.4);
    group.add(trunk, bough, canopy, drape);
    this.root.add(group);
  }

  /** Waterfront willow with a drooping crown. */
  private addWillow(progress: number, offset: number): void {
    const trunkMaterial = this.standard('#3A3222', { roughness: 1 });
    const foliageMaterial = this.standard('#3C5A42', { roughness: 1 });
    const group = new Group();
    this.place(group, progress, offset, 0);
    const trunk = this.cylinder(0.16, 4.4, trunkMaterial);
    trunk.position.y = 2.2;
    trunk.rotation.z = offset < 0 ? 0.1 : -0.1;
    const crown = new Mesh(this.unitSphere, foliageMaterial);
    crown.scale.set(2.5, 1.35, 2.5);
    crown.position.set(offset < 0 ? -0.7 : 0.7, 4.55, 0);
    group.add(trunk, crown);
    for (const along of [-1.5, 0.2, 1.4]) {
      const drop = new Mesh(this.unitSphere, foliageMaterial);
      drop.scale.set(0.55, 1.5, 0.55);
      drop.position.set(offset < 0 ? -1.6 : 1.6, 3.4, along);
      group.add(drop);
    }
    this.root.add(group);
  }

  private place(
    object: Object3D,
    progress: number,
    offset: number,
    y: number,
    headingOffset = 0,
  ): void {
    const frame = samplePathFrame(progress);
    object.position.set(
      frame.point.x * DRIVE_PATH_SCALE + frame.normal.x * offset,
      y,
      frame.point.z * DRIVE_PATH_SCALE + frame.normal.z * offset,
    );
    object.rotation.y = pathHeading(frame.tangent) + headingOffset;
  }

  private box(
    width: number,
    height: number,
    depth: number,
    material: Material,
  ): Mesh {
    const mesh = new Mesh(this.unitBox, material);
    mesh.scale.set(width, height, depth);
    return mesh;
  }

  private cylinder(radius: number, height: number, material: Material): Mesh {
    const mesh = new Mesh(this.unitCylinder, material);
    mesh.scale.set(radius, height, radius);
    return mesh;
  }

  private standard(
    color: string,
    options: Omit<ConstructorParameters<typeof MeshStandardMaterial>[0], 'color'> = {},
  ): MeshStandardMaterial {
    return this.trackMaterial(
      new MeshStandardMaterial({ color, flatShading: true, ...options }),
    );
  }

  private trackGeometry<T extends BufferGeometry>(geometry: T): T {
    this.geometries.add(geometry);
    return geometry;
  }

  private trackMaterial<T extends Material>(material: T): T {
    this.materials.add(material);
    return material;
  }

  private captureProxy(material: Material): Material {
    if (!(material instanceof MeshStandardMaterial)) return material;
    const cached = this.captureMaterialProxies.get(material);
    if (cached) return cached;

    const proxy = this.trackMaterial(
      new MeshBasicMaterial({
        color: material.color,
        map: material.map,
        alphaMap: material.alphaMap,
        side: material.side,
        fog: material.fog,
        transparent: material.transparent,
        opacity: material.opacity,
        alphaTest: material.alphaTest,
        depthTest: material.depthTest,
        depthWrite: material.depthWrite,
        depthFunc: material.depthFunc,
        colorWrite: material.colorWrite,
        blending: material.blending,
        blendSrc: material.blendSrc,
        blendDst: material.blendDst,
        blendEquation: material.blendEquation,
        blendSrcAlpha: material.blendSrcAlpha,
        blendDstAlpha: material.blendDstAlpha,
        blendEquationAlpha: material.blendEquationAlpha,
        premultipliedAlpha: material.premultipliedAlpha,
        dithering: material.dithering,
        polygonOffset: material.polygonOffset,
        polygonOffsetFactor: material.polygonOffsetFactor,
        polygonOffsetUnits: material.polygonOffsetUnits,
        toneMapped: material.toneMapped,
        vertexColors: material.vertexColors,
        wireframe: material.wireframe,
      }),
    );
    proxy.name = material.name ? `${material.name} capture proxy` : 'capture proxy';
    proxy.visible = material.visible;
    this.applyCaptureColor(material, proxy);
    this.captureMaterialProxies.set(material, proxy);
    return proxy;
  }

  private applyCaptureColor(
    source: MeshStandardMaterial,
    proxy: MeshBasicMaterial,
  ): void {
    const emissiveWeight = Math.min(
      1,
      Math.max(0, source.emissiveIntensity * 0.42),
    );
    proxy.color.copy(source.color);
    proxy.color.r = Math.min(1, proxy.color.r + source.emissive.r * emissiveWeight);
    proxy.color.g = Math.min(1, proxy.color.g + source.emissive.g * emissiveWeight);
    proxy.color.b = Math.min(1, proxy.color.b + source.emissive.b * emissiveWeight);
  }

  private restoreCaptureMaterials(): void {
    for (const [mesh, material] of this.captureOriginalMaterials) {
      mesh.material = material;
    }
    this.captureOriginalMaterials.clear();
  }
}

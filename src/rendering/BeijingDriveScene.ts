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

/** Procedural, locally-authored first-person Beijing drive world. */
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

    this.scene.add(new HemisphereLight('#BED3DC', '#4C4740', 2.4));
    this.keyLight = new DirectionalLight('#F2D5B0', 1.55);
    this.keyLight.position.set(-42, 68, -24);
    this.scene.add(this.keyLight);

    this.buildSkyAndGround();
    this.buildRoad();
    this.buildDistantSkyline();
    this.buildCentralAxis();
    this.buildHutong();
    this.buildWaterfront();
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
            segments: 420,
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
            segments: 420,
          }),
        ),
        pavementMaterial,
      ),
      new Mesh(
        this.trackGeometry(
          createPathRibbon(DRIVE.roadHalfWidth + 0.16, 6.35, 0.04, {
            centerScale: DRIVE_PATH_SCALE,
            segments: 420,
          }),
        ),
        pavementMaterial,
      ),
    );

    for (let index = 0; index < 52; index += 1) {
      const dash = this.box(0.12, 0.025, 2.25, laneMaterial);
      this.place(dash, (index + 0.3) / 52, 0, 0.035);
      this.root.add(dash);
    }
  }

  private buildDistantSkyline(): void {
    const material = this.standard('#34414A', { roughness: 1 });
    const roofMaterial = this.standard(PALETTE.roof, { roughness: 1 });
    for (let index = 0; index < 26; index += 1) {
      const progress = (index + 0.5) / 26;
      const side = index % 2 === 0 ? -1 : 1;
      const width = 5 + hash01(index, 1) * 7;
      const height = 6 + hash01(index, 2) * 14;
      const depth = 6 + hash01(index, 3) * 8;
      const offset = side * (18 + hash01(index, 4) * 8);
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

  private buildCentralAxis(): void {
    const red = this.standard(PALETTE.wallRed, { roughness: 0.92 });
    const palaceRed = this.standard(PALETTE.palaceRed, { roughness: 0.86 });
    const roof = this.standard(PALETTE.roof, { roughness: 1 });
    const roofEdge = this.standard(PALETTE.roofEdge, {
      emissive: '#2A1B09',
      emissiveIntensity: 0.15,
      roughness: 0.85,
    });

    for (let index = 0; index < 7; index += 1) {
      const progress = 0.015 + index * 0.031;
      for (const side of [-1, 1]) {
        const wall = this.box(4.2, 2.55, 6.4, red);
        this.place(wall, progress, side * 9.2, 1.27);
        this.root.add(wall);
      }
    }

    const gate = new Group();
    this.place(gate, 0.082, 0, 0);
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

    const plaqueCanvas = document.createElement('canvas');
    plaqueCanvas.width = 640;
    plaqueCanvas.height = 224;
    const plaqueContext = plaqueCanvas.getContext('2d');
    let plaque: Mesh | undefined;
    if (plaqueContext) {
      plaqueContext.fillStyle = '#123E46';
      plaqueContext.fillRect(0, 0, plaqueCanvas.width, plaqueCanvas.height);
      plaqueContext.strokeStyle = '#D4AD5C';
      plaqueContext.lineWidth = 16;
      plaqueContext.strokeRect(12, 12, plaqueCanvas.width - 24, plaqueCanvas.height - 24);
      plaqueContext.fillStyle = '#F3D78D';
      plaqueContext.textAlign = 'center';
      plaqueContext.textBaseline = 'middle';
      plaqueContext.font = '700 112px "Songti SC", "STSong", serif';
      plaqueContext.fillText('正阳门', plaqueCanvas.width / 2, plaqueCanvas.height / 2 + 5);
      const plaqueTexture = new CanvasTexture(plaqueCanvas);
      plaqueTexture.colorSpace = SRGBColorSpace;
      plaqueTexture.minFilter = LinearFilter;
      plaqueTexture.magFilter = LinearFilter;
      this.textures.add(plaqueTexture);
      const plaqueMaterial = this.trackMaterial(
        new MeshBasicMaterial({ map: plaqueTexture, side: DoubleSide, fog: true }),
      );
      plaque = new Mesh(this.trackGeometry(new PlaneGeometry(3.8, 1.34)), plaqueMaterial);
      plaque.position.set(0, 6.45, -2.48);
      plaque.rotation.y = Math.PI;
    }
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
    if (plaque) gate.add(plaque);
    this.root.add(gate);

    for (const progress of [0.035, 0.095, 0.155]) {
      this.addLamp(progress, -6.6, true);
      this.addLamp(progress, 6.6, true);
    }
    this.addTree(0.055, -12.3, 4.5);
    this.addTree(0.11, 12.1, 4.8);
    this.addTree(0.165, -12.5, 4.3);
  }

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

    for (let index = 0; index < 14; index += 1) {
      const progress = 0.275 + index * 0.0156;
      for (const side of [-1, 1]) {
        const width = 3.3 + hash01(index, side + 4) * 1.8;
        const depth = 4.1 + hash01(index, side + 8) * 2.9;
        const height = 2.7 + hash01(index, side + 12) * 1.35;
        const group = new Group();
        this.place(group, progress, side * 8.75, 0);

        const wall = this.box(width, height, depth, index % 4 === 0 ? darkBrick : brick);
        wall.position.y = height / 2;
        const roofCap = new Mesh(this.unitPitchedRoof, roof);
        roofCap.scale.set(width + 0.78, 0.86, depth + 0.98);
        roofCap.position.y = height + 0.04;
        const roofEave = this.box(width + 0.98, 0.16, depth + 1.12, eave);
        roofEave.position.y = height + 0.06;
        const doorPanel = this.box(0.08, 1.75, 1.05, door);
        doorPanel.position.set(
          side > 0 ? width / 2 + 0.045 : -width / 2 - 0.045,
          0.9,
          depth * 0.12,
        );
        group.add(wall, roofCap, roofEave, doorPanel);
        this.root.add(group);
      }

      if (index % 3 === 1) {
        this.addTree(progress + 0.004, index % 2 ? 6.95 : -6.95, 3.4);
      }
    }
    this.addLamp(0.31, -6.5, false);
    this.addLamp(0.38, 6.5, true);
    this.addLamp(0.455, -6.5, false);
    this.buildHutongStreetPlaque(0.318, -5.15);
  }

  private buildWaterfront(): void {
    const stone = this.standard(PALETTE.stone, {
      emissive: '#302D27',
      emissiveIntensity: 0.08,
      roughness: 0.98,
    });
    const oppositeWall = this.standard('#46545A', { roughness: 1 });
    const water = new Mesh(
      this.trackGeometry(
        createPathRibbon(-30, -6.45, -0.06, {
          from: 0.505,
          to: 0.752,
          centerScale: DRIVE_PATH_SCALE,
          segments: 118,
        }),
      ),
      this.waterMaterial,
    );
    this.root.add(water);

    for (let index = 0; index < 20; index += 1) {
      const progress = 0.509 + index * 0.0124;
      const post = this.box(0.52, 1.5, 0.52, stone);
      this.place(post, progress, -6.38, 0.77);
      const cap = this.box(0.7, 0.16, 0.7, stone);
      this.place(cap, progress, -6.38, 1.56);
      const topRail = this.box(0.3, 0.24, 3.8, stone);
      this.place(topRail, progress, -6.38, 1.23);
      const lowerRail = this.box(0.24, 0.18, 3.8, stone);
      this.place(lowerRail, progress, -6.38, 0.55);
      this.root.add(post, cap, topRail, lowerRail);

      if (index % 3 === 0) {
        const building = this.box(4.8, 3.4, 6, oppositeWall);
        this.place(building, progress, 10.2, 1.7);
        this.root.add(building);
      }
    }

    for (const progress of [0.535, 0.605, 0.675, 0.735]) {
      this.addLamp(progress, -5.62, true);
    }
    this.addTree(0.56, 8.2, 4.2);
    this.addTree(0.64, 8.5, 4.8);
    this.addTree(0.71, 8.1, 4.1);
    this.buildDrumTower(0.65, -14.5);
  }

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
          from: 0.765,
          to: 0.987,
          centerScale: DRIVE_PATH_SCALE,
          segments: 112,
        }),
      ),
      deepConcrete,
    );
    this.root.add(underside);

    for (let index = 0; index < 7; index += 1) {
      const progress = 0.775 + index * 0.033;
      for (const side of [-1, 1]) {
        const column = this.box(0.9, 5.7, 0.9, concrete);
        this.place(column, progress, side * 6.55, 2.85);
        this.root.add(column);
      }
      const beam = this.box(15.2, 0.72, 1.05, concrete);
      this.place(beam, progress, 0, 5.42);
      this.root.add(beam);
    }

    for (let index = 0; index < 10; index += 1) {
      const progress = 0.77 + index * 0.023;
      for (const side of [-1, 1]) {
        const guard = this.box(0.36, 0.72, 3.7, concrete);
        this.place(guard, progress, side * 6.95, 6.15);
        this.root.add(guard);
      }
    }

    this.buildSecondRingSign(0.832);
    this.addLamp(0.79, -5.8, false);
    this.addLamp(0.865, 5.8, false);
    this.addLamp(0.955, -5.8, false);
  }

  private buildHutongStreetPlaque(progress: number, offset: number): void {
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
    context.fillText('前门东河沿街', canvas.width / 2, 112);
    context.font = '650 31px Inter, Arial, sans-serif';
    context.letterSpacing = '3px';
    context.fillText('QIANMEN DONGHEYAN ST', canvas.width / 2, 221);

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

  private buildDrumTower(progress: number, offset: number): void {
    const masonry = this.standard('#38464A', { roughness: 1 });
    const red = this.standard('#78352D', { roughness: 0.96 });
    const roof = this.standard('#202B2B', { roughness: 1 });
    const edge = this.standard('#86724B', { roughness: 0.92 });
    const group = new Group();
    this.place(group, progress, offset, 0);

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

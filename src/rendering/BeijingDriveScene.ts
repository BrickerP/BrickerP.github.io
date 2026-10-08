import {
  BackSide,
  Box3,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  Vector4,
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
import { hash01 } from './surfaceTextures';
import { assertPassageId, PASSAGES, type PassageId } from './passages';
import { DRIVE, PALETTE } from './theme';
import { bindSurface, bindWetSurface, bindWindowLattice, type SurfaceKind } from './surfaces';
import { createLampPole } from './kit';
import { CENTRAL_AXIS_LANDMARKS } from './spatialContract';
import { assembleCity, type CityMaterials } from './assembleCity';

const TAU = Math.PI * 2;
const OPEN_CIRCUIT_CARRIER_OFFSET = 0.62;
const OPEN_CIRCUIT_CARRIER_HALF_WIDTH = 0.05;
const OPEN_CIRCUIT_NODE_PHASE = 0.988;
const OPEN_CIRCUIT_CARRIER_NAME = 'LOOP 01 warm-white road carrier';
const OPEN_CIRCUIT_NODE_NAME = 'LOOP 01 closure node';

export interface OpenCircuitIdentityState {
  carrierCount: number;
  nodeCount: number;
  carrierColor: string | null;
  nodeColor: string | null;
  carrierVisible: boolean;
  nodeVisible: boolean;
}

export interface CapturePerformanceState {
  active: boolean;
  proxiedMeshCount: number;
  cachedProxyMaterialCount: number;
  visibleLampLightCount: number;
  staticSceneObjectCount: number;
  sceneMatrixWorldAutoUpdate: boolean;
  matrixWorldDirtyCount: number;
  openCircuitIdentity: OpenCircuitIdentityState;
}

/**
 * Procedural first-person Beijing drive.
 * Buildings come from the parametric kit. This class owns the road, light,
 * capture path, and the twelve-passage assembly order.
 */
export class BeijingDriveScene {
  readonly scene: Scene;

  private readonly root = new Group();
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();
  private readonly textures = new Set<Texture>();
  private readonly lampLights: PointLight[] = [];
  private readonly unitBox: BoxGeometry;
  private readonly lampPoleGeometry: BufferGeometry;
  private readonly lampBulbGeometry: SphereGeometry;
  private readonly waterMaterial: MeshStandardMaterial;
  private readonly lampMaterial: MeshBasicMaterial;
  private readonly cityMaterials: CityMaterials & { water: MeshStandardMaterial };
  private readonly keyLight: DirectionalLight;
  private readonly captureMaterialProxies = new Map<MeshStandardMaterial, MeshBasicMaterial>();
  private readonly captureOriginalMaterials = new Map<Mesh, Material | Material[]>();
  private openCircuitCarrier!: Mesh;
  private openCircuitNode!: Mesh;
  private readonly wetLamps = Array.from({ length: 24 }, () => new Vector4());
  private capturePerformanceMode = false;
  private disposed = false;
  private readonly builtPassages = new Set<PassageId>();

  constructor() {
    this.scene = new Scene();
    this.scene.name = 'Beijing endless drive';
    this.scene.background = new Color(PALETTE.skyTop);
    this.scene.fog = new Fog(PALETTE.fog, 28, 140);
    this.scene.add(this.root);

    this.unitBox = this.trackGeometry(new BoxGeometry(1, 1, 1));
    this.lampPoleGeometry = this.trackGeometry(createLampPole());
    this.lampBulbGeometry = this.trackGeometry(new SphereGeometry(1, 20, 14));
    this.cityMaterials = this.createCityMaterials();
    this.waterMaterial = this.cityMaterials.water;
    this.lampMaterial = this.cityMaterials.lampHead;

    this.scene.add(new HemisphereLight('#91AAB7', '#182A36', 0.85));
    this.keyLight = new DirectionalLight('#E4D2B8', 2.1);
    this.keyLight.position.set(-18, 24, -12);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(512, 512);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 64;
    this.keyLight.shadow.camera.left = -16;
    this.keyLight.shadow.camera.right = 16;
    this.keyLight.shadow.camera.top = 16;
    this.keyLight.shadow.camera.bottom = -16;
    this.keyLight.shadow.bias = -0.00035;
    this.keyLight.shadow.normalBias = 0.045;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.buildSkyAndGround();
    this.buildRoad();
    this.buildWater();
    this.buildOpenCircuitSignature();
    this.buildRingBridge();
    this.buildOverpassDeck();
    const zhengyangmen = CENTRAL_AXIS_LANDMARKS.zhengyangmen;
    const tiananmen = CENTRAL_AXIS_LANDMARKS.tiananmen;
    void zhengyangmen;
    void tiananmen;
    assembleCity({
      root: this.root,
      mats: this.cityMaterials,
      begin: (id) => this.beginPassage(id),
      place: (object, progress, offset, y, heading) => this.place(object, progress, offset, y, heading),
      tag: (object) => this.tagHero(object),
      track: (geometry) => this.trackGeometry(geometry),
      addLamp: (progress, offset, cast) => this.addLamp(progress, offset, cast),
      plaque: (text, options) => this.canvasPlaque(text, options),
    });
    this.assertPassagesBuilt();
    this.root.traverse((object) => {
      if (object instanceof Mesh) this.geometries.add(object.geometry);
    });

    this.scene.updateMatrixWorld(true);
    this.fillWetLampReflections();
    this.stampGroundContacts();
    this.consolidateRepeatedMeshes();
    this.scene.updateMatrixWorld(true);
    this.scene.matrixWorldAutoUpdate = false;
  }

  update(phase: number): void {
    const progress = wrapProgress(phase);
    const wave = 0.5 + 0.5 * Math.cos(progress * TAU);
    this.waterMaterial.emissiveIntensity = 0.18 + wave * 0.035;
    this.keyLight.intensity = 1.95 + wave * 0.16;
    const frame = samplePathFrame(progress);
    const focusX = frame.point.x * DRIVE_PATH_SCALE + frame.tangent.x * 14;
    const focusZ = frame.point.z * DRIVE_PATH_SCALE + frame.tangent.z * 14;
    this.keyLight.position.set(focusX - 14, 22, focusZ - 8);
    this.keyLight.target.position.set(focusX, 2.4, focusZ);
    this.keyLight.target.updateMatrixWorld();
    this.keyLight.updateMatrixWorld();

    if (this.capturePerformanceMode) {
      for (const [source, proxy] of this.captureMaterialProxies) {
        this.applyCaptureColor(source, proxy);
      }
    }
  }

  setCapturePerformanceMode(active: boolean): void {
    if (this.capturePerformanceMode === active) return;
    this.capturePerformanceMode = active;
    for (const light of this.lampLights) light.visible = !active;
    if (active) {
      try {
        this.root.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          const original = object.material;
          const proxy = Array.isArray(original)
            ? original.map((material) => this.captureProxy(material))
            : this.captureProxy(original);
          if (proxy === original) return;
          this.captureOriginalMaterials.set(object, original);
          object.material = proxy;
        });
      } catch (error) {
        this.restoreCaptureMaterials();
        this.capturePerformanceMode = false;
        for (const light of this.lampLights) light.visible = true;
        throw error;
      }
      return;
    }
    this.restoreCaptureMaterials();
  }

  readCapturePerformanceState(): CapturePerformanceState {
    let staticSceneObjectCount = 0;
    let matrixWorldDirtyCount = 0;
    let carrierCount = 0;
    let nodeCount = 0;
    this.scene.traverse((object) => {
      staticSceneObjectCount += 1;
      if (object.matrixWorldNeedsUpdate) matrixWorldDirtyCount += 1;
      if (object.name === OPEN_CIRCUIT_CARRIER_NAME) carrierCount += 1;
      if (object.name === OPEN_CIRCUIT_NODE_NAME) nodeCount += 1;
    });
    return {
      active: this.capturePerformanceMode,
      proxiedMeshCount: this.captureOriginalMaterials.size,
      cachedProxyMaterialCount: this.captureMaterialProxies.size,
      visibleLampLightCount: this.lampLights.filter((light) => light.visible).length,
      staticSceneObjectCount,
      sceneMatrixWorldAutoUpdate: this.scene.matrixWorldAutoUpdate,
      matrixWorldDirtyCount,
      openCircuitIdentity: {
        carrierCount,
        nodeCount,
        carrierColor: this.readMeshColor(this.openCircuitCarrier),
        nodeColor: this.readMeshColor(this.openCircuitNode),
        carrierVisible: this.openCircuitCarrier.visible,
        nodeVisible: this.openCircuitNode.visible,
      },
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

  private createCityMaterials(): CityMaterials & { water: MeshStandardMaterial } {
    const streetBrick = this.surface('#8C5A4E', 'streetBrick', {
      roughness: 0.9,
      emissive: '#3A221C',
      emissiveIntensity: 0.42,
    });
    const palaceBrick = this.surface('#B15A46', 'palaceBrick', {
      roughness: 0.86,
      emissive: '#4A2418',
      emissiveIntensity: 0.38,
    });
    const tile = this.surface('#6E7C78', 'tile', {
      roughness: 0.72,
      emissive: '#1C2826',
      emissiveIntensity: 0.28,
    });
    const stone = this.surface('#D5D0C4', 'stone', {
      roughness: 0.94,
      emissive: '#3A3832',
      emissiveIntensity: 0.16,
    });
    const concrete = this.surface('#8A98A0', 'concrete', {
      roughness: 0.84,
      emissive: '#243038',
      emissiveIntensity: 0.22,
    });
    const bark = this.surface('#6A5340', 'bark', {
      roughness: 0.94,
      emissive: '#2A2018',
      emissiveIntensity: 0.2,
    });
    const glass = this.surface('#405A6B', 'glass', {
      roughness: 0.42,
      metalness: 0.18,
      emissive: '#1C4054',
      emissiveIntensity: 0.28,
    });
    const timber = this.standard('#5A4630', { roughness: 0.9 });
    const gold = this.standard(PALETTE.roofEdge, {
      emissive: '#2A1B09',
      emissiveIntensity: 0.2,
      roughness: 0.72,
    });
    const white = this.surface('#EDE7DA', 'stone', {
      roughness: 0.9,
      emissive: '#CFC6B4',
      emissiveIntensity: 0.1,
    });
    const windowMaterial = this.standard('#1A140E', {
      emissive: '#FFC56A',
      emissiveIntensity: 0.35,
      roughness: 0.72,
    });
    windowMaterial.userData.preserveInCapture = true;
    bindWindowLattice(windowMaterial);
    const leaf = this.surface('#3E6A48', 'leaf', {
      roughness: 0.95,
      emissive: '#1A3020',
      emissiveIntensity: 0.28,
    });
    leaf.side = DoubleSide;
    const niche = this.standard('#1A1410', { roughness: 0.95 });
    const lampPole = this.surface('#3A4144', 'concrete', { roughness: 1, metalness: 0 });
    const lampHead = this.trackMaterial(
      new MeshBasicMaterial({
        color: new Color().setRGB(2.4, 1.57, 0.62),
        fog: true,
      }),
    );
    const lantern = this.standard(PALETTE.palaceRed, {
      emissive: '#7A3029',
      emissiveIntensity: 0.68,
      roughness: 0.7,
    });
    const water = this.standard(PALETTE.water, {
      emissive: '#123745',
      emissiveIntensity: 0.22,
      metalness: 0.4,
      roughness: 0.2,
    });
    water.userData.preserveInCapture = true;
    bindWetSurface(water, this.wetLamps, 'water');
    return {
      streetBrick,
      palaceBrick,
      tile,
      stone,
      concrete,
      bark,
      glass,
      timber,
      gold,
      white,
      window: windowMaterial,
      leaf,
      niche,
      lampPole,
      lampHead,
      lantern,
      water,
    };
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
    const sky = new Mesh(
      skyGeometry,
      this.trackMaterial(
        new MeshBasicMaterial({
          vertexColors: true,
          side: BackSide,
          fog: false,
          depthWrite: false,
        }),
      ),
    );
    sky.renderOrder = -100;
    this.root.add(sky);
    const ground = new Mesh(
      this.trackGeometry(new PlaneGeometry(320, 320)),
      this.cityMaterials.concrete,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    this.root.add(ground);
  }

  private buildRoad(): void {
    const roadMaterial = this.standard(PALETTE.asphalt, {
      roughness: 0.34,
      metalness: 0.22,
    });
    roadMaterial.userData.preserveInCapture = true;
    bindWetSurface(roadMaterial, this.wetLamps, 'asphalt');
    const road = new Mesh(
      this.trackGeometry(
        createPathRibbon(-DRIVE.roadHalfWidth, DRIVE.roadHalfWidth, 0, {
          centerScale: DRIVE_PATH_SCALE,
          segments: 960,
        }),
      ),
      roadMaterial,
    );
    road.receiveShadow = true;
    this.root.add(road);
    const pavement = this.cityMaterials.stone;
    this.root.add(
      new Mesh(
        this.trackGeometry(
          createPathRibbon(-6.35, -DRIVE.roadHalfWidth - 0.16, 0.04, {
            centerScale: DRIVE_PATH_SCALE,
            segments: 480,
          }),
        ),
        pavement,
      ),
      new Mesh(
        this.trackGeometry(
          createPathRibbon(DRIVE.roadHalfWidth + 0.16, 6.35, 0.04, {
            centerScale: DRIVE_PATH_SCALE,
            segments: 480,
          }),
        ),
        pavement,
      ),
    );
    const laneMaterial = this.standard(PALETTE.lane, {
      emissive: '#D5CBB4',
      emissiveIntensity: 0.32,
      roughness: 0.28,
      metalness: 0.08,
    });
    const laneSheen = this.trackMaterial(
      new MeshBasicMaterial({
        color: '#E7D7B0',
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }),
    );
    for (let index = 0; index < 140; index += 1) {
      const progress = (index + 0.3) / 140;
      const sheen = this.box(0.22, 0.008, 2.45, laneSheen);
      this.place(sheen, progress, 0, 0.022);
      const dash = this.box(0.12, 0.025, 2.25, laneMaterial);
      this.place(dash, progress, 0, 0.04);
      this.root.add(sheen, dash);
    }
  }

  private buildWater(): void {
    const water = new Mesh(
      this.trackGeometry(
        createPathRibbon(-22, -6.45, -0.06, {
          from: 0.085,
          to: 0.248,
          centerScale: DRIVE_PATH_SCALE,
          segments: 180,
        }),
      ),
      this.waterMaterial,
    );
    this.root.add(water);
  }

  private buildOpenCircuitSignature(): void {
    const carrierMaterial = this.trackMaterial(
      new MeshBasicMaterial({ color: PALETTE.warmWhite, fog: true }),
    );
    this.openCircuitCarrier = new Mesh(
      this.trackGeometry(
        createPathRibbon(
          OPEN_CIRCUIT_CARRIER_OFFSET - OPEN_CIRCUIT_CARRIER_HALF_WIDTH,
          OPEN_CIRCUIT_CARRIER_OFFSET + OPEN_CIRCUIT_CARRIER_HALF_WIDTH,
          0.058,
          { centerScale: DRIVE_PATH_SCALE, segments: 960 },
        ),
      ),
      carrierMaterial,
    );
    this.openCircuitCarrier.name = OPEN_CIRCUIT_CARRIER_NAME;
    this.openCircuitCarrier.renderOrder = 2;
    this.root.add(this.openCircuitCarrier);

    this.openCircuitNode = new Mesh(
      this.trackGeometry(new CylinderGeometry(0.22, 0.22, 0.016, 28)),
      this.standard(PALETTE.signature, { metalness: 0, roughness: 0.88 }),
    );
    this.openCircuitNode.name = OPEN_CIRCUIT_NODE_NAME;
    this.place(this.openCircuitNode, OPEN_CIRCUIT_NODE_PHASE, OPEN_CIRCUIT_CARRIER_OFFSET, 0.04);
    this.openCircuitNode.renderOrder = 3;
    this.root.add(this.openCircuitNode);
  }

  /** Curved second-ring flyover kept outside the carriageway. */
  private buildRingBridge(): void {
    const deckMaterial = this.cityMaterials.concrete;
    const bridge = new Group();
    this.place(bridge, 0.392, 14.8, 0, Math.PI / 2);
    const radius = 9.2;
    const startAngle = -0.96;
    const arc = 1.62;
    const segmentCount = 5;
    for (let index = 0; index < segmentCount; index += 1) {
      const angle = startAngle + ((index + 0.5) / segmentCount) * arc;
      const segmentLength = radius * (arc / segmentCount) + 0.08;
      const deck = this.box(2.12, 0.56, segmentLength, deckMaterial);
      deck.position.set(Math.cos(angle) * radius, 6.55, Math.sin(angle) * radius);
      deck.rotation.y = -angle;
      const railNear = this.box(0.16, 0.48, segmentLength, deckMaterial);
      railNear.position.set(Math.cos(angle) * (radius - 1), 6.95, Math.sin(angle) * (radius - 1));
      railNear.rotation.y = -angle;
      const railFar = this.box(0.16, 0.48, segmentLength, deckMaterial);
      railFar.position.set(Math.cos(angle) * (radius + 1), 6.95, Math.sin(angle) * (radius + 1));
      railFar.rotation.y = -angle;
      const cap = this.box(2.3, 0.28, 0.46, deckMaterial);
      cap.position.set(Math.cos(angle) * radius, 6.15, Math.sin(angle) * radius);
      cap.rotation.y = -angle;
      bridge.add(deck, railNear, railFar, cap);
    }
    this.root.add(bridge);
  }

  /** Deck and portal that hide the loop seam. The battered pier is assembled with the kit. */
  private buildOverpassDeck(): void {
    const concrete = this.cityMaterials.concrete;
    const underside = new Mesh(
      this.trackGeometry(
        createPathRibbon(-7.6, 7.6, 6.4, {
          from: 0.918,
          to: 0.999,
          centerScale: DRIVE_PATH_SCALE,
          segments: 110,
        }),
      ),
      concrete,
    );
    underside.receiveShadow = true;
    this.root.add(underside);
    for (let index = 0; index < 5; index += 1) {
      const progress = 0.928 + index * 0.013;
      for (const side of [-1, 1]) {
        const column = this.box(0.58, 7.5, 0.58, concrete);
        column.castShadow = true;
        this.place(column, progress, side * 8.25, 3.75);
        this.root.add(column);
        const guard = this.box(0.16, 0.5, 2.3, concrete);
        this.place(guard, progress, side * 7.15, 6.7);
        this.root.add(guard);
      }
      const beam = this.box(15.4, 0.32, 0.55, concrete);
      beam.castShadow = true;
      this.place(beam, progress, 0, 5.85);
      this.root.add(beam);
    }
    const portalProgress = 0.993;
    for (const side of [-1, 1]) {
      const cheek = this.box(0.7, 8.4, 2.4, concrete);
      this.place(cheek, portalProgress, side * 6.5, 4.2);
      this.root.add(cheek);
    }
    const lintel = this.box(14.2, 3.6, 2.2, concrete);
    this.place(lintel, portalProgress, 0, 8.6);
    this.root.add(lintel);
  }

  private addLamp(progress: number, offset: number, castLight: boolean): void {
    const group = new Group();
    this.place(group, progress, offset, 0);
    const pole = new Mesh(this.lampPoleGeometry, this.cityMaterials.lampPole);
    const bulb = new Mesh(this.lampBulbGeometry, this.lampMaterial);
    bulb.scale.setScalar(0.24);
    bulb.position.set(0.32, 3.62, 0);
    group.add(pole, bulb);
    if (castLight) {
      const intensity = 8.2 + hash01(Math.round(progress * 10_000), 91) * 1.8;
      const light = new PointLight(PALETTE.lamp, intensity, 13, 2);
      light.position.set(0.32, 3.62, 0);
      group.add(light);
      this.lampLights.push(light);
    }
    this.root.add(group);
  }

  private fillWetLampReflections(): void {
    const point = new Vector3();
    this.wetLamps.forEach((lamp) => lamp.set(0, 0, 0, 0));
    this.lampLights.forEach((light, index) => {
      if (index >= this.wetLamps.length) return;
      light.getWorldPosition(point);
      this.wetLamps[index].set(point.x, point.y, point.z, 0.42);
    });
  }

  private stampGroundContacts(): void {
    const material = this.trackMaterial(
      new MeshBasicMaterial({
        color: '#05080c',
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    const geometry = this.trackGeometry(new CircleGeometry(1, 8));
    geometry.rotateX(-Math.PI / 2);
    const bounds = new Box3();
    const stamps: Array<{ x: number; z: number; sx: number; sz: number; rotation: Quaternion }> = [];
    const worldPosition = new Vector3();
    const worldRotation = new Quaternion();
    this.root.traverse((object) => {
      if (!(object instanceof Mesh) || object instanceof InstancedMesh) return;
      bounds.setFromObject(object);
      if (!Number.isFinite(bounds.min.y)) return;
      const height = bounds.max.y - bounds.min.y;
      if (bounds.min.y > 0.35 || height < 1.1) return;
      object.getWorldPosition(worldPosition);
      object.getWorldQuaternion(worldRotation);
      const spanX = Math.abs(object.scale.x);
      const spanZ = Math.abs(object.scale.z);
      if (spanX > 18 || spanZ > 18) return;
      let sx = spanX * 0.5;
      let sz = spanZ * 0.5;
      if (height > 2.2 && sx < 1.05) sx = 1.15;
      if (height > 2.2 && sz < 1.05) sz = 1.15;
      if (sx < 0.2 || sz < 0.2) return;
      stamps.push({
        x: worldPosition.x,
        z: worldPosition.z,
        sx: Math.min(sx, 6),
        sz: Math.min(sz, 6),
        rotation: worldRotation.clone(),
      });
    });
    if (stamps.length === 0) return;
    const contacts = new InstancedMesh(geometry, material, stamps.length);
    contacts.frustumCulled = false;
    contacts.renderOrder = 1;
    const matrix = new Matrix4();
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    stamps.forEach((stamp, index) => {
      position.set(stamp.x, 0.02, stamp.z);
      rotation.copy(stamp.rotation);
      scale.set(Math.max(stamp.sx, 0.28), 1, Math.max(stamp.sz, 0.28));
      matrix.compose(position, rotation, scale);
      contacts.setMatrixAt(index, matrix);
    });
    contacts.instanceMatrix.needsUpdate = true;
    this.root.add(contacts);
  }

  private consolidateRepeatedMeshes(): void {
    const groups = new Map<string, Mesh[]>();
    this.root.updateWorldMatrix(true, true);
    this.root.traverse((object) => {
      if (!(object instanceof Mesh) || object instanceof InstancedMesh) return;
      if (object.geometry !== this.unitBox && object.geometry !== this.lampPoleGeometry) return;
      if (Array.isArray(object.material)) return;
      const key = `${object.geometry.uuid}:${object.material.uuid}`;
      const list = groups.get(key);
      if (list) list.push(object);
      else groups.set(key, [object]);
    });
    for (const meshes of groups.values()) {
      if (meshes.length < 6) continue;
      const source = meshes[0];
      const instanced = new InstancedMesh(source.geometry, source.material, meshes.length);
      instanced.castShadow = source.castShadow;
      instanced.receiveShadow = source.receiveShadow;
      instanced.frustumCulled = false;
      const matrix = new Matrix4();
      for (let index = 0; index < meshes.length; index += 1) {
        const mesh = meshes[index];
        matrix.copy(mesh.matrixWorld);
        instanced.setMatrixAt(index, matrix);
        mesh.removeFromParent();
      }
      instanced.instanceMatrix.needsUpdate = true;
      this.root.add(instanced);
    }
  }

  private beginPassage(id: PassageId): void {
    assertPassageId(id);
    if (this.builtPassages.has(id)) throw new Error(`Passage built twice: ${id}`);
    this.builtPassages.add(id);
  }

  private assertPassagesBuilt(): void {
    for (const passage of PASSAGES) {
      if (!this.builtPassages.has(passage.id)) throw new Error(`Passage was not built: ${passage.id}`);
    }
  }

  private tagHero(object: Object3D): void {
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      if (child instanceof InstancedMesh) {
        child.castShadow = false;
        child.receiveShadow = true;
        return;
      }
      const role = child.userData.shadowRole;
      if (role === 'skip') {
        child.castShadow = false;
        child.receiveShadow = true;
        return;
      }
      if (role === 'mass') {
        child.castShadow = true;
        child.receiveShadow = true;
        return;
      }
      const bulk = Math.abs(child.scale.x * child.scale.y * child.scale.z);
      child.castShadow = bulk >= 6 || child.geometry.attributes.position.count > 40;
      child.receiveShadow = bulk >= 2 || child.geometry.attributes.position.count > 20;
    });
  }

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
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    this.textures.add(texture);
    return this.trackMaterial(new MeshBasicMaterial({ map: texture, side: DoubleSide, fog: true }));
  }

  private place(object: Object3D, progress: number, offset: number, y: number, headingOffset = 0): void {
    const frame = samplePathFrame(progress);
    object.position.set(
      frame.point.x * DRIVE_PATH_SCALE + frame.normal.x * offset,
      y,
      frame.point.z * DRIVE_PATH_SCALE + frame.normal.z * offset,
    );
    object.rotation.y = pathHeading(frame.tangent) + headingOffset;
  }

  private box(width: number, height: number, depth: number, material: Material): Mesh {
    const mesh = new Mesh(this.unitBox, material);
    mesh.scale.set(width, height, depth);
    return mesh;
  }

  private surface(
    color: string,
    kind: SurfaceKind,
    options: { roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number } = {},
  ): MeshStandardMaterial {
    const material = this.standard(color, options);
    bindSurface(material, kind);
    return material;
  }

  private standard(
    color: string,
    options: { roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number } = {},
  ): MeshStandardMaterial {
    return this.trackMaterial(
      new MeshStandardMaterial({
        color,
        flatShading: false,
        roughness: options.roughness ?? 1,
        metalness: options.metalness ?? 0,
        ...(options.emissive ? { emissive: options.emissive, emissiveIntensity: options.emissiveIntensity ?? 0 } : {}),
      }),
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
    if (material.userData.preserveInCapture === true) return material;
    const cached = this.captureMaterialProxies.get(material);
    if (cached) return cached;
    const proxy = this.trackMaterial(
      new MeshBasicMaterial({
        color: material.color,
        map: material.map,
        side: material.side,
        fog: material.fog,
        transparent: material.transparent,
        opacity: material.opacity,
        alphaTest: material.alphaTest,
        depthWrite: material.depthWrite,
      }),
    );
    proxy.name = material.name ? `${material.name} capture proxy` : 'capture proxy';
    const kind = material.userData.surfaceKind as SurfaceKind | undefined;
    if (kind) bindSurface(proxy, kind);
    this.applyCaptureColor(material, proxy);
    this.captureMaterialProxies.set(material, proxy);
    return proxy;
  }

  private applyCaptureColor(source: MeshStandardMaterial, proxy: MeshBasicMaterial): void {
    const emissiveWeight = Math.min(1, Math.max(0, source.emissiveIntensity * 0.42));
    proxy.color.copy(source.color);
    proxy.color.r = Math.min(1, proxy.color.r + source.emissive.r * emissiveWeight);
    proxy.color.g = Math.min(1, proxy.color.g + source.emissive.g * emissiveWeight);
    proxy.color.b = Math.min(1, proxy.color.b + source.emissive.b * emissiveWeight);
  }

  private restoreCaptureMaterials(): void {
    for (const [mesh, material] of this.captureOriginalMaterials) mesh.material = material;
    this.captureOriginalMaterials.clear();
  }

  private readMeshColor(mesh: Mesh): string | null {
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!(material instanceof MeshBasicMaterial) && !(material instanceof MeshStandardMaterial)) return null;
    return `#${material.color.getHexString().toUpperCase()}`;
  }
}

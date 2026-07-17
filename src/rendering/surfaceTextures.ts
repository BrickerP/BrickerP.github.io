import {
  CanvasTexture,
  LinearFilter,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';

/** Seeded 0–1 hash matching the scene generator (no Math.random). */
export function hash01(index: number, salt = 0): number {
  const value = Math.sin(index * 91.173 + salt * 47.77) * 43758.5453;
  return value - Math.floor(value);
}

export type SurfaceAtlasId =
  | 'brick'
  | 'tileRoof'
  | 'bark'
  | 'glassGrid'
  | 'stoneGrain'
  | 'asphaltGrain'
  | 'lattice'
  | 'bluePanel';

function makeCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function finishTexture(
  canvas: HTMLCanvasElement,
  {
    repeat = 2,
    nearest = false,
  }: { repeat?: number; nearest?: boolean } = {},
): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.minFilter = nearest ? NearestFilter : LinearFilter;
  texture.magFilter = nearest ? NearestFilter : LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Boot-once mid-tier surface atlases — subtle rhythm under flat-shaded masses. */
export class SurfaceAtlasLibrary {
  private readonly atlases = new Map<SurfaceAtlasId, Texture>();
  private readonly owned: Texture[] = [];

  constructor() {
    this.atlases.set('brick', this.buildBrick());
    this.atlases.set('tileRoof', this.buildTileRoof());
    this.atlases.set('bark', this.buildBark());
    this.atlases.set('glassGrid', this.buildGlassGrid());
    this.atlases.set('stoneGrain', this.buildStoneGrain());
    this.atlases.set('asphaltGrain', this.buildAsphaltGrain());
    this.atlases.set('lattice', this.buildLattice());
    this.atlases.set('bluePanel', this.buildBluePanel());
  }

  get(id: SurfaceAtlasId): Texture {
    const texture = this.atlases.get(id);
    if (!texture) throw new Error(`missing surface atlas: ${id}`);
    return texture;
  }

  dispose(): void {
    for (const texture of this.owned) texture.dispose();
    this.owned.length = 0;
    this.atlases.clear();
  }

  private track(texture: CanvasTexture): CanvasTexture {
    this.owned.push(texture);
    return texture;
  }

  private buildBrick(): CanvasTexture {
    const size = 256;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.track(finishTexture(makeCanvas(4)));
    ctx.fillStyle = '#5A6264';
    ctx.fillRect(0, 0, size, size);
    const rows = 10;
    const cols = 8;
    for (let row = 0; row < rows; row += 1) {
      const y = (row / rows) * size;
      const offset = row % 2 === 0 ? 0 : size / (cols * 2);
      for (let col = 0; col < cols + 1; col += 1) {
        const x = offset + (col / cols) * size;
        const wobble = hash01(row * 17 + col, 3) * 2 - 1;
        ctx.strokeStyle = `rgba(30,34,36,${0.35 + hash01(row, col) * 0.25})`;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x + wobble, y, size / cols - 2, size / rows - 1.5);
      }
    }
    return this.track(finishTexture(canvas, { repeat: 3 }));
  }

  private buildTileRoof(): CanvasTexture {
    const size = 256;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.track(finishTexture(makeCanvas(4)));
    ctx.fillStyle = '#2E3735';
    ctx.fillRect(0, 0, size, size);
    for (let index = 0; index < 18; index += 1) {
      const y = (index / 18) * size;
      ctx.strokeStyle = `rgba(18,22,21,${0.4 + hash01(index, 8) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += 16) {
        ctx.lineTo(x, y + Math.sin(x * 0.08 + index) * 1.4);
      }
      ctx.stroke();
    }
    return this.track(finishTexture(canvas, { repeat: 2.5 }));
  }

  private buildBark(): CanvasTexture {
    const size = 128;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.track(finishTexture(makeCanvas(4)));
    ctx.fillStyle = '#3A3224';
    ctx.fillRect(0, 0, size, size);
    for (let index = 0; index < 22; index += 1) {
      const x = (index / 22) * size + hash01(index, 11) * 3;
      ctx.strokeStyle = `rgba(22,18,12,${0.35 + hash01(index, 12) * 0.4})`;
      ctx.lineWidth = 1 + hash01(index, 13) * 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y <= size; y += 8) {
        ctx.lineTo(x + Math.sin(y * 0.12 + index) * 2.2, y);
      }
      ctx.stroke();
    }
    return this.track(finishTexture(canvas, { repeat: 1.5, nearest: true }));
  }

  private buildGlassGrid(): CanvasTexture {
    const size = 256;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.track(finishTexture(makeCanvas(4)));
    ctx.fillStyle = '#2A3844';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(180,210,230,0.22)';
    ctx.lineWidth = 1;
    for (let index = 0; index <= 8; index += 1) {
      const p = (index / 8) * size;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    for (let index = 0; index < 24; index += 1) {
      if (hash01(index, 21) < 0.35) continue;
      const col = Math.floor(hash01(index, 22) * 8);
      const row = Math.floor(hash01(index, 23) * 8);
      ctx.fillStyle = `rgba(220,200,140,${0.08 + hash01(index, 24) * 0.18})`;
      ctx.fillRect((col / 8) * size + 2, (row / 8) * size + 2, size / 8 - 4, size / 8 - 4);
    }
    return this.track(finishTexture(canvas, { repeat: 2 }));
  }

  private buildStoneGrain(): CanvasTexture {
    const size = 128;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.track(finishTexture(makeCanvas(4)));
    ctx.fillStyle = '#C9C0AE';
    ctx.fillRect(0, 0, size, size);
    for (let index = 0; index < 80; index += 1) {
      const x = hash01(index, 31) * size;
      const y = hash01(index, 32) * size;
      ctx.fillStyle = `rgba(90,85,70,${0.05 + hash01(index, 33) * 0.12})`;
      ctx.fillRect(x, y, 2 + hash01(index, 34) * 4, 1 + hash01(index, 35) * 2);
    }
    return this.track(finishTexture(canvas, { repeat: 4 }));
  }

  private buildAsphaltGrain(): CanvasTexture {
    const size = 128;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.track(finishTexture(makeCanvas(4)));
    ctx.fillStyle = '#24292C';
    ctx.fillRect(0, 0, size, size);
    for (let index = 0; index < 120; index += 1) {
      ctx.fillStyle = `rgba(255,255,255,${0.015 + hash01(index, 41) * 0.04})`;
      ctx.fillRect(hash01(index, 42) * size, hash01(index, 43) * size, 1, 1);
    }
    return this.track(finishTexture(canvas, { repeat: 6, nearest: true }));
  }

  private buildLattice(): CanvasTexture {
    const size = 256;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.track(finishTexture(makeCanvas(4)));
    ctx.fillStyle = '#1A2224';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(140,150,140,0.55)';
    ctx.lineWidth = 3;
    for (let index = -8; index < 16; index += 1) {
      const p = (index / 8) * size;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p + size, size);
      ctx.moveTo(p + size, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
    }
    return this.track(finishTexture(canvas, { repeat: 3, nearest: true }));
  }

  private buildBluePanel(): CanvasTexture {
    const size = 256;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.track(finishTexture(makeCanvas(4)));
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#2F6F88');
    gradient.addColorStop(0.5, '#1F4F66');
    gradient.addColorStop(1, '#3A88A0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(200,230,240,0.25)';
    ctx.lineWidth = 2;
    for (let index = 0; index <= 6; index += 1) {
      const p = (index / 6) * size;
      ctx.strokeRect(4, p + 4, size - 8, size / 6 - 8);
    }
    return this.track(finishTexture(canvas, { repeat: 1.5 }));
  }
}

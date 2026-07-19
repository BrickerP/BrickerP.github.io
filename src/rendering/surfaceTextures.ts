import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
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
  }: { repeat?: number } = {},
): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 2;
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
    ctx.fillStyle = '#E3E5E5';
    ctx.fillRect(0, 0, size, size);
    const rows = 10;
    const cols = 8;
    for (let row = 0; row < rows; row += 1) {
      const y = (row / rows) * size;
      const offset = row % 2 === 0 ? 0 : size / (cols * 2);
      for (let col = 0; col < cols + 1; col += 1) {
        const x = offset + (col / cols) * size;
        const wobble = hash01(row * 17 + col, 3) * 2 - 1;
        ctx.strokeStyle = `rgba(54,60,62,${0.18 + hash01(row, col) * 0.16})`;
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
    ctx.fillStyle = '#DDE1DF';
    ctx.fillRect(0, 0, size, size);
    for (let index = 0; index < 18; index += 1) {
      const y = (index / 18) * size;
      ctx.strokeStyle = `rgba(46,54,52,${0.18 + hash01(index, 8) * 0.16})`;
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
    ctx.fillStyle = '#D8CDBE';
    ctx.fillRect(0, 0, size, size);
    for (let index = 0; index < 22; index += 1) {
      const x = (index / 22) * size + hash01(index, 11) * 3;
      ctx.strokeStyle = `rgba(63,49,35,${0.2 + hash01(index, 12) * 0.22})`;
      ctx.lineWidth = 1 + hash01(index, 13) * 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y <= size; y += 8) {
        ctx.lineTo(x + Math.sin(y * 0.12 + index) * 2.2, y);
      }
      ctx.stroke();
    }
    return this.track(finishTexture(canvas, { repeat: 1.5 }));
  }

  private buildGlassGrid(): CanvasTexture {
    const size = 256;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.track(finishTexture(makeCanvas(4)));
    ctx.fillStyle = '#D9E1E5';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(70,95,110,0.22)';
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
      ctx.fillStyle = `rgba(237,210,151,${0.1 + hash01(index, 24) * 0.16})`;
      ctx.fillRect((col / 8) * size + 2, (row / 8) * size + 2, size / 8 - 4, size / 8 - 4);
    }
    return this.track(finishTexture(canvas, { repeat: 2 }));
  }

  private buildStoneGrain(): CanvasTexture {
    const size = 128;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.track(finishTexture(makeCanvas(4)));
    ctx.fillStyle = '#ECEAE4';
    ctx.fillRect(0, 0, size, size);
    for (let index = 0; index < 80; index += 1) {
      const x = hash01(index, 31) * size;
      const y = hash01(index, 32) * size;
      ctx.fillStyle = `rgba(84,82,74,${0.04 + hash01(index, 33) * 0.09})`;
      ctx.fillRect(x, y, 2 + hash01(index, 34) * 4, 1 + hash01(index, 35) * 2);
    }
    return this.track(finishTexture(canvas, { repeat: 4 }));
  }

  private buildAsphaltGrain(): CanvasTexture {
    const size = 128;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.track(finishTexture(makeCanvas(4)));
    ctx.fillStyle = '#D7DCE0';
    ctx.fillRect(0, 0, size, size);
    for (let index = 0; index < 120; index += 1) {
      const light = hash01(index, 41) > 0.48 ? 255 : 76;
      ctx.fillStyle = `rgba(${light},${light},${light},${0.025 + hash01(index, 44) * 0.04})`;
      ctx.fillRect(hash01(index, 42) * size, hash01(index, 43) * size, 1, 1);
    }
    return this.track(finishTexture(canvas, { repeat: 6 }));
  }

  private buildLattice(): CanvasTexture {
    const size = 256;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.track(finishTexture(makeCanvas(4)));
    ctx.fillStyle = '#D7DADB';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(45,55,53,0.48)';
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
    return this.track(finishTexture(canvas, { repeat: 3 }));
  }

  private buildBluePanel(): CanvasTexture {
    const size = 256;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.track(finishTexture(makeCanvas(4)));
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#D4E0E5');
    gradient.addColorStop(0.5, '#E8EEF0');
    gradient.addColorStop(1, '#C8D8DE');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(55,92,108,0.24)';
    ctx.lineWidth = 2;
    for (let index = 0; index <= 6; index += 1) {
      const p = (index / 6) * size;
      ctx.strokeRect(4, p + 4, size - 8, size / 6 - 8);
    }
    return this.track(finishTexture(canvas, { repeat: 1.5 }));
  }
}

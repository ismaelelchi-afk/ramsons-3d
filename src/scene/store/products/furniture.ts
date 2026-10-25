import type { Material } from 'three';
import type { StaticBatch } from '../batch';
import type { Materials } from '../materials';
import { createRng, pick, range } from '../random';

/**
 * Muebles, colchones y decoración provisionales. Origen local = centro de la
 * huella sobre el suelo, frente hacia +Z (salvo la cama, cuyo cabecero está en -Z).
 */

// ---------------------------------------------------------------- cama

export interface BedOptions {
  /** Ancho del colchón (0.95 individual, 1.6 queen, 1.9 king). */
  w: number;
  blanket: 'gray' | 'beige' | 'charcoal';
  /** Camino rojo a los pies de la cama (acento de marca). */
  runner?: boolean;
}

export function drawBed(b: StaticBatch, m: Materials, o: BedOptions): void {
  const len = 2.0;
  const frameW = o.w + 0.1;
  const frameL = len + 0.08;
  const blanketMat =
    o.blanket === 'gray' ? m.blanketGray : o.blanket === 'beige' ? m.blanketBeige : m.blanketCharcoal;

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.box(m.woodDark, 0.07, 0.14, 0.07, sx * (frameW / 2 - 0.06), 0.07, sz * (frameL / 2 - 0.06));
    }
  }
  b.box(m.woodDark, frameW, 0.12, frameL, 0, 0.2, 0);

  // Colchón con una banda de costura visible en los laterales.
  b.box(m.mattressWhite, o.w, 0.26, len, 0, 0.39, 0);
  b.box(m.mattressGray, o.w + 0.004, 0.025, len + 0.004, 0, 0.33, 0);

  // Cabecero tapizado.
  b.box(m.woodDark, frameW, 1.0, 0.08, 0, 0.5, -frameL / 2 - 0.04);
  b.box(m.sofaGray, frameW - 0.12, 0.5, 0.05, 0, 0.78, -frameL / 2 + 0.025);

  // Almohadas.
  const pillows = o.w > 1.2 ? 2 : 1;
  const pillowW = pillows === 2 ? (o.w - 0.15) / 2 : o.w - 0.2;
  for (let i = 0; i < pillows; i += 1) {
    const x = pillows === 2 ? (i === 0 ? -1 : 1) * (pillowW / 2 + 0.03) : 0;
    b.box(m.pillow, pillowW, 0.13, 0.4, x, 0.52 + 0.06, -len / 2 + 0.3, { rx: -0.1 });
  }

  // Cobertor con doblez y caída lateral.
  const blanketLen = len * 0.62;
  const blanketZ = len / 2 - blanketLen / 2 + 0.01;
  b.box(blanketMat, o.w + 0.03, 0.06, blanketLen, 0, 0.55, blanketZ);
  b.box(m.pillow, o.w + 0.035, 0.065, 0.22, 0, 0.555, len / 2 - blanketLen + 0.11);
  for (const sx of [-1, 1]) {
    b.box(blanketMat, 0.03, 0.2, blanketLen, sx * (o.w / 2 + 0.015), 0.44, blanketZ);
  }
  if (o.runner) {
    b.box(m.red, o.w + 0.04, 0.066, 0.32, 0, 0.556, len / 2 - 0.45);
  }
}

export function drawNightstand(b: StaticBatch, m: Materials): void {
  b.box(m.woodLight, 0.45, 0.5, 0.4, 0, 0.25, 0);
  b.box(m.plastic, 0.4, 0.006, 0.01, 0, 0.28, 0.2);
  for (const y of [0.15, 0.39]) {
    b.sphere(m.chrome, 0.014, 0.014, 0.014, 0, y, 0.21, undefined, 8, 6);
  }
  // Lámpara de mesa con pantalla luminosa.
  b.cyl(m.plasticSoft, 0.06, 0.06, 0.02, 0, 0.51, 0, undefined, 12);
  b.cyl(m.silverDark, 0.01, 0.01, 0.2, 0, 0.62, 0, undefined, 8);
  b.cyl(m.lampShade, 0.075, 0.11, 0.17, 0, 0.78, 0, undefined, 14);
}

// ---------------------------------------------------------------- sofá

export interface SofaOptions {
  w: number;
  fabric: 'gray' | 'beige' | 'graphite';
  /** Añade cojines de acento (rojo y blanco). */
  accent?: boolean;
}

export function drawSofa(b: StaticBatch, m: Materials, o: SofaOptions): void {
  const depth = 0.92;
  const fabric = o.fabric === 'gray' ? m.sofaGray : o.fabric === 'beige' ? m.sofaBeige : m.sofaGraphite;
  const seatTop = 0.36;

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.box(m.woodDark, 0.05, 0.1, 0.05, sx * (o.w / 2 - 0.07), 0.05, sz * (depth / 2 - 0.08));
    }
  }
  b.box(fabric, o.w, 0.26, depth, 0, 0.23, 0);
  for (const sx of [-1, 1]) {
    b.box(fabric, 0.2, 0.6, depth, sx * (o.w / 2 - 0.1), 0.4, 0);
  }
  b.box(fabric, o.w - 0.4, 0.44, 0.22, 0, seatTop + 0.22, -depth / 2 + 0.11);

  const seats = Math.max(1, Math.round((o.w - 0.4) / 0.72));
  const seatW = (o.w - 0.4) / seats;
  for (let i = 0; i < seats; i += 1) {
    const x = -((o.w - 0.4) / 2) + seatW * (i + 0.5);
    b.box(fabric, seatW - 0.02, 0.14, 0.62, x, seatTop + 0.07, 0.1);
    b.box(fabric, seatW - 0.02, 0.42, 0.16, x, seatTop + 0.14 + 0.21, -depth / 2 + 0.3, { rx: -0.12 });
  }

  if (o.accent) {
    b.box(m.red, 0.36, 0.36, 0.12, -(o.w / 2 - 0.45), seatTop + 0.14 + 0.18, -depth / 2 + 0.42, { rx: -0.2, ry: 0.25 });
    b.box(m.pillow, 0.36, 0.36, 0.12, o.w / 2 - 0.45, seatTop + 0.14 + 0.18, -depth / 2 + 0.42, { rx: -0.2, ry: -0.25 });
  }
}

// ---------------------------------------------------------------- mesas y sillas

export function drawCoffeeTable(b: StaticBatch, m: Materials): void {
  b.box(m.woodLight, 1.0, 0.04, 0.55, 0, 0.4, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.box(m.woodDark, 0.04, 0.38, 0.04, sx * 0.45, 0.19, sz * 0.22);
    }
  }
  b.box(m.woodDark, 0.9, 0.02, 0.45, 0, 0.14, 0);
}

export function drawChair(b: StaticBatch, m: Materials): void {
  b.box(m.sofaGray, 0.44, 0.05, 0.44, 0, 0.45, 0);
  b.box(m.sofaGray, 0.44, 0.42, 0.04, 0, 0.7, -0.2, { rx: -0.08 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.box(m.woodDark, 0.04, 0.43, 0.04, sx * 0.19, 0.215, sz * 0.19);
    }
  }
}

export function drawDiningSet(b: StaticBatch, m: Materials, o: { seatsPerSide: number }): void {
  const length = 0.8 * o.seatsPerSide + 0.2;
  b.box(m.woodLight, length, 0.05, 0.9, 0, 0.75, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.box(m.graphite, 0.06, 0.73, 0.06, sx * (length / 2 - 0.1), 0.365, sz * 0.36);
    }
  }
  for (let i = 0; i < o.seatsPerSide; i += 1) {
    const x = -((o.seatsPerSide - 1) * 0.8) / 2 + i * 0.8;
    b.group(x, 0, -0.62, 0, () => drawChair(b, m));
    b.group(x, 0, 0.62, Math.PI, () => drawChair(b, m));
  }
}

// ---------------------------------------------------------------- almacenamiento

export function drawWardrobe(b: StaticBatch, m: Materials, o: { w: number }): void {
  const h = 2.2;
  const d = 0.6;
  const doors = Math.max(2, Math.round(o.w / 0.6));
  b.box(m.graphiteSoft, o.w - 0.06, 0.06, d - 0.06, 0, 0.03, 0);
  b.box(m.whiteGloss, o.w, h - 0.06, d, 0, 0.06 + (h - 0.06) / 2, 0);
  b.box(m.whiteGloss, o.w + 0.03, 0.05, d + 0.03, 0, h - 0.025, 0);
  const doorW = o.w / doors;
  for (let i = 0; i < doors; i += 1) {
    const x = -o.w / 2 + doorW * (i + 0.5);
    if (i > 0) {
      b.box(m.plastic, 0.006, h - 0.2, 0.01, x - doorW / 2, 1.1, d / 2);
    }
    const handleX = x + (i % 2 === 0 ? 1 : -1) * (doorW / 2 - 0.06);
    b.box(m.chrome, 0.014, 0.3, 0.02, handleX, 1.1, d / 2 + 0.014);
  }
}

export function drawBookshelf(b: StaticBatch, m: Materials, o: { w: number; seed: number }): void {
  const h = 1.9;
  const d = 0.32;
  const rng = createRng(o.seed);
  const bookMats = [m.boxWhite, m.boxGray, m.boxGraphite, m.cardboard, m.red, m.woodLight, m.blanketGray];

  b.box(m.woodLight, 0.03, h, d, -o.w / 2 + 0.015, h / 2, 0);
  b.box(m.woodLight, 0.03, h, d, o.w / 2 - 0.015, h / 2, 0);
  b.box(m.woodDark, o.w - 0.06, h, 0.01, 0, h / 2, -d / 2 + 0.005);
  const levels = [0.04, 0.4, 0.76, 1.12, 1.48, h - 0.02];
  for (const y of levels) {
    b.box(m.woodLight, o.w, 0.03, d, 0, y, 0);
  }
  for (let level = 0; level < levels.length - 1; level += 1) {
    const base = (levels[level] as number) + 0.015;
    let x = -o.w / 2 + 0.06;
    while (x < o.w / 2 - 0.1) {
      const bookW = range(rng, 0.025, 0.055);
      const bookH = range(rng, 0.2, 0.31);
      if (x + bookW > o.w / 2 - 0.05) break;
      if (rng() > 0.18) {
        b.box(pick(rng, bookMats), bookW, bookH, 0.2, x + bookW / 2, base + bookH / 2, 0.02);
      }
      x += bookW + 0.004;
    }
  }
}

// ---------------------------------------------------------------- colchones

export function drawMattressDisplay(b: StaticBatch, m: Materials, o: { w: number; len: number }): void {
  const { w, len } = o;
  b.box(m.graphiteSoft, w + 0.4, 0.14, len + 0.4, 0, 0.07, 0);

  const layers: Array<[Material, number]> = [
    [m.mattressBase, 0.05],
    [m.mattressBlue, 0.07],
    [m.mattressCream, 0.07],
    [m.mattressGray, 0.06],
    [m.mattressWhite, 0.08],
  ];
  let y = 0.14;
  layers.forEach(([material, thickness], index) => {
    const inset = (layers.length - 1 - index) * 0.008;
    b.box(material, w - inset, thickness, len - inset, 0, y + thickness / 2, 0);
    y += thickness;
  });
  // Costuras acolchadas en la cara superior.
  for (let i = -2; i <= 2; i += 1) {
    b.box(m.mattressGray, w - 0.12, 0.002, 0.012, 0, y + 0.001, i * (len / 6));
  }
}

// ---------------------------------------------------------------- decoración

export function drawPlant(b: StaticBatch, m: Materials, o: { scale: number }): void {
  const s = o.scale;
  b.cyl(m.pot, 0.2 * s, 0.15 * s, 0.38 * s, 0, 0.19 * s, 0, undefined, 14);
  b.cyl(m.soil, 0.19 * s, 0.19 * s, 0.02 * s, 0, 0.385 * s, 0, undefined, 12);
  b.sphere(m.leaf, 0.3 * s, 0.38 * s, 0.3 * s, 0, 0.85 * s, 0);
  b.sphere(m.leafDark, 0.22 * s, 0.3 * s, 0.22 * s, 0.2 * s, 0.7 * s, 0.1 * s);
  b.sphere(m.leaf, 0.2 * s, 0.28 * s, 0.2 * s, -0.2 * s, 0.68 * s, -0.08 * s);
  b.sphere(m.leafDark, 0.18 * s, 0.24 * s, 0.18 * s, 0.02 * s, 1.15 * s, 0.04 * s);
}

export function drawRug(b: StaticBatch, m: Materials, o: { w: number; d: number; red?: boolean }): void {
  b.box(o.red ? m.rugRed : m.rugGray, o.w, 0.012, o.d, 0, 0.006, 0);
}

export function drawPriceTag(b: StaticBatch, m: Materials): void {
  b.box(m.plastic, 0.05, 0.02, 0.04, 0, 0.01, -0.01);
  b.group(
    0,
    0.02,
    0,
    0,
    () => {
      b.box(m.tagWhite, 0.14, 0.085, 0.006, 0, 0.0425, 0);
      b.box(m.red, 0.14, 0.024, 0.0066, 0, 0.073, 0);
    },
    -0.3,
  );
}

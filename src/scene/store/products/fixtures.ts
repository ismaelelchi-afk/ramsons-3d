import type { Material } from 'three';
import type { StaticBatch } from '../batch';
import type { Materials } from '../materials';
import { pick, range, type Rng } from '../random';

/**
 * Mobiliario comercial: mesas de exposición, estanterías, mostradores, bancos, etc.
 * Origen local = centro de la huella sobre el suelo, frente hacia +Z.
 */

// ---------------------------------------------------------------- mesas y estanterías

export function drawDisplayTable(
  b: StaticBatch,
  m: Materials,
  o: { len: number; depth: number; h: number },
): void {
  const { len, depth, h } = o;
  b.box(m.whiteGloss, len, 0.05, depth, 0, h - 0.025, 0);
  b.box(m.graphite, len - 0.16, 0.1, depth - 0.16, 0, h - 0.1, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.box(m.graphite, 0.07, h - 0.05, 0.07, sx * (len / 2 - 0.1), (h - 0.05) / 2, sz * (depth / 2 - 0.1));
    }
  }
  b.box(m.redGlow, len - 0.3, 0.022, 0.008, 0, h - 0.1, (depth - 0.16) / 2 + 0.004);
  b.box(m.whiteGloss, len - 0.3, 0.03, depth - 0.3, 0, 0.2, 0);
}

export interface ShelfUnitOptions {
  w: number;
  h: number;
  d: number;
  /** Alturas (y) de las baldas. */
  levels: readonly number[];
}

/** Estructura de estantería comercial: montantes grafito, fondo blanco y baldas. */
export function drawShelfUnit(b: StaticBatch, m: Materials, o: ShelfUnitOptions): void {
  b.box(m.graphite, 0.05, o.h, o.d, -o.w / 2 + 0.025, o.h / 2, 0);
  b.box(m.graphite, 0.05, o.h, o.d, o.w / 2 - 0.025, o.h / 2, 0);
  b.box(m.wall, o.w - 0.1, o.h, 0.02, 0, o.h / 2, -o.d / 2 + 0.01);
  for (const y of o.levels) {
    b.box(m.whiteGloss, o.w - 0.1, 0.035, o.d, 0, y, 0);
  }
  b.box(m.graphite, o.w, 0.05, o.d, 0, o.h + 0.025, 0);
  b.box(m.red, o.w - 0.1, 0.04, 0.02, 0, o.h - 0.1, o.d / 2 - 0.01);
}

const CARTON_MATERIALS = ['boxWhite', 'boxWhite', 'boxGray', 'boxGraphite', 'cardboard'] as const;

/** Rellena una balda con cajas de producto (sin etiquetas legibles; solo una franja roja). */
export function fillShelfWithBoxes(
  b: StaticBatch,
  m: Materials,
  rng: Rng,
  o: { w: number; d: number; shelfY: number; maxH: number },
): void {
  let x = -o.w / 2 + 0.1;
  const limit = o.w / 2 - 0.1;
  while (x < limit - 0.18) {
    const bw = Math.min(range(rng, 0.2, 0.45), limit - x);
    const bh = range(rng, 0.18, o.maxH);
    const bd = Math.min(o.d - 0.08, range(rng, 0.22, 0.4));
    const material: Material = m[pick(rng, CARTON_MATERIALS)];
    const z = o.d / 2 - 0.04 - bd / 2;
    const y = o.shelfY + 0.0175 + bh / 2;
    b.box(material, bw, bh, bd, x + bw / 2, y, z);
    if (rng() > 0.45) {
      b.box(m.red, bw * 0.6, 0.035, 0.004, x + bw / 2, o.shelfY + 0.0175 + bh * 0.72, z + bd / 2 + 0.002);
    }
    x += bw + range(rng, 0.02, 0.06);
  }
}

// ---------------------------------------------------------------- mostradores

export interface CounterOptions {
  len: number;
  depth: number;
  h: number;
  front: 'red' | 'white';
}

export function drawCounter(b: StaticBatch, m: Materials, o: CounterOptions): void {
  const { len, depth, h } = o;
  const frontMaterial = o.front === 'red' ? m.red : m.whiteGloss;
  const baseDepth = depth - 0.12;
  b.box(m.graphite, len - 0.1, h - 0.06, baseDepth, 0, (h - 0.06) / 2, 0);
  b.box(frontMaterial, len - 0.1, h - 0.2, 0.025, 0, (h + 0.04) / 2, baseDepth / 2 + 0.0125);
  b.box(m.whiteGloss, len, 0.06, depth, 0, h - 0.03, 0);
  b.box(m.redGlow, len - 0.4, 0.02, 0.008, 0, h - 0.09, baseDepth / 2 + 0.004);
}

/**
 * Puesto de cobro. Origen = encimera. El monitor del cajero mira hacia -Z;
 * el datáfono del cliente y el lector miran hacia +Z.
 */
export function drawPosStation(b: StaticBatch, m: Materials): void {
  b.group(0, 0, -0.18, Math.PI, () => {
    b.box(m.plasticSoft, 0.2, 0.02, 0.2, 0, 0.01, 0);
    b.box(m.plasticSoft, 0.05, 0.2, 0.03, 0, 0.1, -0.03);
    b.box(m.plastic, 0.36, 0.25, 0.03, 0, 0.3, 0);
    b.box(m.screenDemo[3], 0.34, 0.23, 0.002, 0, 0.3, 0.0165);
  });
  b.group(0.34, 0, 0.18, 0, () => {
    b.box(m.plasticSoft, 0.1, 0.035, 0.15, 0, 0.0175, 0);
    b.box(m.screenOff, 0.07, 0.003, 0.05, 0, 0.037, -0.03, { rx: -0.1 });
    b.box(m.ledBlue, 0.04, 0.003, 0.012, 0, 0.037, 0.04);
  });
  b.group(-0.4, 0, 0.1, 0, () => {
    b.box(m.plastic, 0.12, 0.012, 0.14, 0, 0.006, 0);
    b.box(m.plasticSoft, 0.1, 0.09, 0.1, 0, 0.055, 0);
    b.box(m.redGlow, 0.07, 0.004, 0.003, 0, 0.07, 0.0515);
  });
}

// ---------------------------------------------------------------- asientos y señalización

export function drawBench(b: StaticBatch, m: Materials, o: { len: number }): void {
  b.box(m.graphite, o.len - 0.1, 0.38, 0.1, 0, 0.19, 0);
  b.box(m.graphite, 0.08, 0.4, 0.5, -o.len / 2 + 0.1, 0.2, 0);
  b.box(m.graphite, 0.08, 0.4, 0.5, o.len / 2 - 0.1, 0.2, 0);
  b.box(m.whiteGloss, o.len, 0.08, 0.5, 0, 0.42, 0.02);
  b.box(m.whiteGloss, o.len, 0.4, 0.08, 0, 0.7, -0.22, { rx: -0.1 });
  b.box(m.red, o.len * 0.3, 0.05, 0.01, 0, 0.78, -0.2);
}

export function drawOfficeChair(b: StaticBatch, m: Materials): void {
  b.cyl(m.graphite, 0.25, 0.25, 0.03, 0, 0.06, 0, undefined, 10);
  b.cyl(m.graphite, 0.025, 0.025, 0.36, 0, 0.24, 0, undefined, 8);
  b.box(m.sofaGraphite, 0.5, 0.08, 0.48, 0, 0.5, 0);
  b.box(m.sofaGraphite, 0.46, 0.5, 0.06, 0, 0.8, -0.22, { rx: -0.1 });
}

/** Tótem de turnos: columna roja con pantalla y ranura de tickets. */
export function drawTotem(b: StaticBatch, m: Materials): void {
  b.box(m.graphite, 0.54, 0.06, 0.34, 0, 0.03, 0);
  b.box(m.red, 0.46, 1.5, 0.26, 0, 0.81, 0);
  b.box(m.screenDemo[0], 0.36, 0.3, 0.004, 0, 1.3, 0.132);
  b.box(m.plastic, 0.2, 0.05, 0.02, 0, 0.95, 0.135);
  b.box(m.tagWhite, 0.1, 0.1, 0.004, 0, 0.7, 0.131);
}

export function drawStanchion(b: StaticBatch, m: Materials): void {
  b.cyl(m.graphite, 0.15, 0.15, 0.02, 0, 0.01, 0, undefined, 14);
  b.cyl(m.chrome, 0.02, 0.02, 0.9, 0, 0.47, 0, undefined, 8);
  b.sphere(m.chrome, 0.035, 0.035, 0.035, 0, 0.94, 0, undefined, 8, 6);
}

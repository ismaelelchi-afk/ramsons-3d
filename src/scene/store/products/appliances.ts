import * as THREE from 'three';
import type { StaticBatch } from '../batch';
import type { Materials } from '../materials';

/**
 * Electrodomésticos provisionales. Origen local = centro de la base sobre el suelo,
 * frente hacia +Z.
 */

export type Finish = 'white' | 'inox' | 'black';

function skinFor(m: Materials, finish: Finish): THREE.Material {
  if (finish === 'white') return m.applianceWhite;
  if (finish === 'inox') return m.inox;
  return m.applianceBlack;
}

// ---------------------------------------------------------------- refrigerador

export interface FridgeOptions {
  style: 'top' | 'bottom' | 'side' | 'french';
  w: number;
  h: number;
  finish: Finish;
}

export function drawFridge(b: StaticBatch, m: Materials, o: FridgeOptions): void {
  const { w, h } = o;
  const d = 0.68;
  const foot = 0.05;
  const bodyH = h - foot;
  const skin = skinFor(m, o.finish);
  const front = d / 2;

  b.box(m.plastic, w - 0.08, foot, d - 0.1, 0, foot / 2, -0.02);
  b.box(skin, w, bodyH, d, 0, foot + bodyH / 2, 0);

  const seamH = (y: number): void => b.box(m.plastic, w + 0.002, 0.007, 0.01, 0, y, front);
  const seamV = (x: number, y0: number, y1: number): void =>
    b.box(m.plastic, 0.007, y1 - y0, 0.01, x, (y0 + y1) / 2, front);
  const handleV = (x: number, y: number, len: number): void => {
    b.box(m.chrome, 0.022, len, 0.022, x, y, front + 0.04);
    b.box(m.chrome, 0.014, 0.02, 0.04, x, y + len / 2 - 0.03, front + 0.02);
    b.box(m.chrome, 0.014, 0.02, 0.04, x, y - len / 2 + 0.03, front + 0.02);
  };
  const handleH = (y: number, len: number): void => {
    b.box(m.chrome, len, 0.022, 0.022, 0, y, front + 0.035);
  };

  const yTop = foot + bodyH;
  switch (o.style) {
    case 'top': {
      const seam = foot + bodyH * 0.7;
      seamH(seam);
      handleV(w / 2 - 0.07, seam + (yTop - seam) / 2, 0.26);
      handleV(w / 2 - 0.07, seam - 0.4, 0.5);
      break;
    }
    case 'bottom': {
      const seam = foot + bodyH * 0.3;
      seamH(seam);
      handleV(w / 2 - 0.07, seam + 0.55, 0.6);
      handleH(seam - 0.08, w * 0.5);
      break;
    }
    case 'side': {
      seamV(0, foot, yTop);
      handleV(-0.05, foot + bodyH * 0.58, 0.7);
      handleV(0.05, foot + bodyH * 0.58, 0.7);
      b.box(m.glassDark, 0.2, 0.3, 0.012, -w / 4, foot + bodyH * 0.62, front + 0.004);
      b.box(m.ledBlue, 0.05, 0.02, 0.004, -w / 4, foot + bodyH * 0.7, front + 0.011);
      break;
    }
    case 'french': {
      const seam = foot + bodyH * 0.32;
      seamH(seam);
      seamV(0, seam, yTop);
      handleV(-0.05, seam + bodyH * 0.3, 0.6);
      handleV(0.05, seam + bodyH * 0.3, 0.6);
      handleH(seam - 0.08, w * 0.5);
      break;
    }
  }
}

// ---------------------------------------------------------------- lavadora / secadora

export interface WasherOptions {
  kind: 'washer' | 'dryer';
  finish: 'white' | 'inox';
}

export function drawWasher(b: StaticBatch, m: Materials, o: WasherOptions): void {
  const w = 0.6;
  const h = 0.85;
  const d = 0.6;
  const skin = skinFor(m, o.finish);
  const front = d / 2;

  b.box(m.plastic, w - 0.06, 0.03, d - 0.06, 0, 0.015, 0);
  b.box(skin, w, h - 0.03, d, 0, 0.03 + (h - 0.03) / 2, 0);

  // Panel superior con cajón, pantalla y selector.
  b.box(m.plasticSoft, w - 0.04, 0.1, 0.006, 0, h - 0.07, front + 0.002);
  b.box(m.plastic, 0.16, 0.045, 0.006, -0.17, h - 0.07, front + 0.006);
  b.box(m.ledBlue, 0.08, 0.026, 0.004, 0.02, h - 0.07, front + 0.007);
  b.cyl(m.chrome, 0.028, 0.028, 0.022, 0.2, h - 0.07, front + 0.012, { rx: Math.PI / 2 }, 14);

  // Puerta circular: aro cromado + cristal oscuro.
  const doorY = 0.4;
  const ring = o.kind === 'washer' ? 0.24 : 0.235;
  b.cyl(m.chrome, ring, ring, 0.03, 0, doorY, front + 0.005, { rx: Math.PI / 2 }, 24);
  b.cyl(m.silverDark, ring - 0.03, ring - 0.03, 0.034, 0, doorY, front + 0.006, { rx: Math.PI / 2 }, 24);
  b.cyl(m.glassDark, ring - 0.055, ring - 0.055, 0.04, 0, doorY, front + 0.008, { rx: Math.PI / 2 }, 24);
}

// ---------------------------------------------------------------- cocina

export interface StoveOptions {
  w?: number;
  finish: Finish;
}

export function drawStove(b: StaticBatch, m: Materials, o: StoveOptions): void {
  const w = o.w ?? 0.6;
  const h = 0.9;
  const d = 0.6;
  const foot = 0.05;
  const skin = skinFor(m, o.finish);
  const front = d / 2;

  b.box(m.plastic, w - 0.06, foot, d - 0.08, 0, foot / 2, 0);
  b.box(skin, w, h - foot, d, 0, foot + (h - foot) / 2, 0);

  // Encimera de vidrio con 4 hornillas y parrillas.
  b.box(m.applianceBlack, w - 0.02, 0.012, d - 0.04, 0, h + 0.006, -0.01);
  const dx = w * 0.22;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * dx;
      const z = sz * 0.14 - 0.01;
      b.cyl(m.graphiteSoft, 0.07, 0.07, 0.012, x, h + 0.018, z, undefined, 16);
      b.cyl(m.silverDark, 0.035, 0.035, 0.014, x, h + 0.02, z, undefined, 12);
      b.box(m.graphite, 0.17, 0.008, 0.012, x, h + 0.032, z);
      b.box(m.graphite, 0.012, 0.008, 0.17, x, h + 0.032, z);
    }
  }
  b.box(skin, w, 0.07, 0.03, 0, h + 0.035, -d / 2 + 0.015);

  // Panel de control con perillas.
  b.box(m.plasticSoft, w - 0.04, 0.07, 0.01, 0, h - 0.045, front + 0.002);
  for (let i = 0; i < 5; i += 1) {
    const x = -w / 2 + 0.07 + (i * (w - 0.14)) / 4;
    b.cyl(m.chrome, 0.02, 0.02, 0.022, x, h - 0.045, front + 0.014, { rx: Math.PI / 2 }, 12);
  }

  // Puerta del horno con ventana, asa y cajón inferior.
  b.box(skin, w - 0.03, 0.58, 0.02, 0, 0.46, front + 0.008);
  b.box(m.glassDark, w - 0.12, 0.34, 0.012, 0, 0.44, front + 0.019);
  b.box(m.chrome, w - 0.16, 0.022, 0.022, 0, 0.72, front + 0.06);
  for (const sx of [-1, 1]) {
    b.box(m.chrome, 0.02, 0.02, 0.04, sx * (w / 2 - 0.1), 0.72, front + 0.04);
  }
  b.box(m.plastic, w - 0.04, 0.006, 0.01, 0, 0.145, front + 0.01);
  b.box(m.chrome, 0.2, 0.012, 0.012, 0, 0.095, front + 0.02);
}

// ---------------------------------------------------------------- otros aparatos

export function drawMicrowave(b: StaticBatch, m: Materials, o: { finish: 'black' | 'silver' }): void {
  const w = 0.5;
  const h = 0.29;
  const d = 0.4;
  const body = o.finish === 'black' ? m.applianceBlack : m.silver;
  b.box(body, w, h, d, 0, h / 2, 0);
  b.box(m.glassDark, 0.33, 0.22, 0.01, -0.058, h / 2, d / 2 + 0.002);
  b.box(m.plasticSoft, 0.1, 0.22, 0.01, 0.163, h / 2, d / 2 + 0.002);
  b.box(m.ledBlue, 0.07, 0.025, 0.004, 0.163, h / 2 + 0.07, d / 2 + 0.008);
  for (let i = 0; i < 3; i += 1) {
    b.box(m.chrome, 0.07, 0.016, 0.006, 0.163, h / 2 - 0.01 - i * 0.04, d / 2 + 0.008);
  }
  b.box(m.chrome, 0.012, 0.16, 0.016, 0.1, h / 2, d / 2 + 0.014);
}

/** Aire acondicionado tipo split. Origen en el centro de la base (para colgar de la pared). */
export function drawAirConditioner(b: StaticBatch, m: Materials): void {
  b.box(m.applianceWhite, 0.96, 0.3, 0.22, 0, 0.15, 0);
  b.box(m.applianceWhite, 0.94, 0.02, 0.2, 0, 0.31, -0.005);
  b.box(m.plasticSoft, 0.88, 0.04, 0.14, 0, 0.03, 0.06);
  b.box(m.silver, 0.92, 0.006, 0.222, 0, 0.1, 0);
  b.box(m.ledBlue, 0.04, 0.012, 0.004, 0.4, 0.2, 0.111);
}

export function drawChestFreezer(b: StaticBatch, m: Materials): void {
  b.box(m.plastic, 1.0, 0.05, 0.6, 0, 0.025, 0);
  b.box(m.applianceWhite, 1.1, 0.8, 0.7, 0, 0.45, 0);
  b.box(m.applianceWhite, 1.12, 0.05, 0.72, 0, 0.875, 0);
  b.box(m.plastic, 1.1, 0.008, 0.012, 0, 0.84, 0.35);
  b.box(m.chrome, 0.3, 0.02, 0.03, 0, 0.9, 0.31);
}

export function drawAirFryer(b: StaticBatch, m: Materials): void {
  b.box(m.applianceBlack, 0.3, 0.3, 0.32, 0, 0.15, 0);
  b.box(m.plasticSoft, 0.28, 0.04, 0.3, 0, 0.32, 0);
  b.box(m.plasticSoft, 0.26, 0.17, 0.01, 0, 0.13, 0.163);
  b.box(m.plastic, 0.14, 0.025, 0.04, 0, 0.2, 0.185);
  b.box(m.ledBlue, 0.1, 0.03, 0.004, 0, 0.27, 0.162);
  for (const sx of [-1, 1]) {
    b.cyl(m.chrome, 0.018, 0.018, 0.016, sx * 0.1, 0.27, 0.166, { rx: Math.PI / 2 }, 10);
  }
}

export function drawBlender(b: StaticBatch, m: Materials): void {
  b.cyl(m.applianceBlack, 0.075, 0.085, 0.12, 0, 0.06, 0, undefined, 14);
  b.cyl(m.chrome, 0.015, 0.015, 0.016, 0, 0.06, 0.085, { rx: Math.PI / 2 }, 10);
  b.cyl(m.jarGlass, 0.078, 0.06, 0.26, 0, 0.25, 0, undefined, 14);
  b.cyl(m.applianceBlack, 0.072, 0.072, 0.03, 0, 0.395, 0, undefined, 14);
}

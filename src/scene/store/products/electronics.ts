import type { StaticBatch } from '../batch';
import type { Materials } from '../materials';

/**
 * Productos provisionales de electrónica, construidos con geometría simple.
 * Convención: el origen local está en el centro de la base (contacto con suelo o
 * mesa) y el frente mira hacia +Z.
 */

// ---------------------------------------------------------------- televisor

export interface TvOptions {
  /** Diagonal en pulgadas (formato 16:9). */
  inches: number;
  /** 'wall': colgado (origen = borde inferior); 'stand': con pies sobre mesa. */
  mount: 'wall' | 'stand';
  /** Índice de pantalla de demostración, o -1 para pantalla apagada. */
  screen?: number;
}

export function tvSize(inches: number): { w: number; h: number } {
  const diagonal = inches * 0.0254;
  return { w: diagonal * 0.8716, h: diagonal * 0.4903 };
}

export function drawTv(b: StaticBatch, m: Materials, o: TvOptions): void {
  const { w, h } = tvSize(o.inches);
  const depth = 0.045;
  const lift = o.mount === 'stand' ? 0.09 : 0;

  if (o.mount === 'stand') {
    for (const side of [-1, 1]) {
      b.box(m.plasticSoft, 0.11, 0.018, 0.24, side * w * 0.36, 0.009, 0.02);
      b.box(m.plastic, 0.05, 0.08, 0.03, side * w * 0.36, 0.055, -0.005);
    }
  }

  // Cuerpo con marco fino y abultamiento trasero.
  b.box(m.plastic, w, h, depth, 0, lift + h / 2, 0);
  b.box(m.plasticSoft, w * 0.5, h * 0.55, 0.035, 0, lift + h / 2, -depth / 2 - 0.0175);

  const screenMaterial =
    o.screen !== undefined && o.screen >= 0 ? m.screenDemo[o.screen % m.screenDemo.length] : m.screenOff;
  b.box(screenMaterial, w - 0.03, h - 0.03, 0.003, 0, lift + h / 2, depth / 2 + 0.005);

  // Pequeña barra de marca genérica en el marco inferior.
  b.box(m.silver, w * 0.05, 0.005, 0.004, 0, lift + 0.011, depth / 2 + 0.005);
}

// ---------------------------------------------------------------- audio

export function drawSoundbar(b: StaticBatch, m: Materials, o: { w: number }): void {
  b.box(m.plastic, o.w, 0.065, 0.1, 0, 0.0325, 0);
  b.box(m.plasticSoft, o.w - 0.04, 0.045, 0.003, 0, 0.0325, 0.0515);
  b.box(m.ledBlue, 0.012, 0.006, 0.003, o.w / 2 - 0.05, 0.05, 0.052);
}

export function drawSpeaker(b: StaticBatch, m: Materials, o: { h: number }): void {
  const depth = 0.26;
  b.box(m.plastic, 0.22, o.h, depth, 0, o.h / 2, 0);
  b.cyl(m.silverDark, 0.095, 0.095, 0.008, 0, o.h * 0.34, depth / 2 + 0.002, { rx: Math.PI / 2 }, 18);
  b.cyl(m.plasticSoft, 0.075, 0.075, 0.012, 0, o.h * 0.34, depth / 2 + 0.006, { rx: Math.PI / 2 }, 18);
  b.cyl(m.silverDark, 0.03, 0.03, 0.01, 0, o.h * 0.8, depth / 2 + 0.004, { rx: Math.PI / 2 }, 12);
}

export function drawGameConsole(b: StaticBatch, m: Materials): void {
  b.box(m.plastic, 0.32, 0.08, 0.26, 0, 0.04, 0);
  b.box(m.ledBlue, 0.1, 0.006, 0.003, -0.08, 0.06, 0.1315);
  b.box(m.plasticSoft, 0.2, 0.01, 0.2, 0.04, 0.0805, 0);
}

// ---------------------------------------------------------------- teléfono

export interface PhoneOptions {
  /** 0 = negro, 1 = plata, 2 = azul marino. */
  body: number;
  /** Índice de pantalla de demostración. */
  screen: number;
}

/** Smartphone delgado (a escala ~1.5× para que se reconozca a distancia) sobre un soporte inclinado. */
export function drawPhone(b: StaticBatch, m: Materials, o: PhoneOptions): void {
  const w = 0.105;
  const h = 0.22;
  const t = 0.011;
  const bodies = [m.phoneBlack, m.phoneSilver, m.phoneNavy];
  const bodyMaterial = bodies[o.body % bodies.length];

  b.box(m.plasticSoft, 0.1, 0.02, 0.075, 0, 0.01, 0);

  b.group(
    0,
    0.02,
    -0.012,
    0,
    () => {
      b.box(bodyMaterial, w, h, t, 0, h / 2, 0);
      b.box(m.screenDemo[o.screen % m.screenDemo.length], w - 0.008, h - 0.014, 0.002, 0, h / 2, t / 2 + 0.005);
      b.box(m.screenOff, 0.014, 0.005, 0.002, 0, h - 0.012, t / 2 + 0.006);
    },
    0,
    -0.22,
  );
}

// ---------------------------------------------------------------- portátil

export interface LaptopOptions {
  screen: number;
  /** true = carcasa plata, false = gris oscuro. */
  silver: boolean;
}

export function drawLaptop(b: StaticBatch, m: Materials, o: LaptopOptions): void {
  const shell = o.silver ? m.silver : m.silverDark;
  const w = 0.38;
  const depth = 0.26;
  b.box(shell, w, 0.016, depth, 0, 0.008, 0);
  b.box(m.plasticSoft, w - 0.06, 0.003, 0.11, 0, 0.0175, -0.045);
  b.box(m.keyTop, w - 0.08, 0.002, 0.095, 0, 0.0185, -0.045);
  b.box(shell, 0.1, 0.002, 0.06, 0, 0.0171, 0.08);

  // Tapa abierta ~105° respecto a la base (bisagra en el borde trasero).
  b.group(
    0,
    0.016,
    -depth / 2 + 0.005,
    0,
    () => {
      b.box(shell, w, 0.25, 0.008, 0, 0.125, 0);
      b.box(m.screenDemo[o.screen % m.screenDemo.length], w - 0.026, 0.226, 0.002, 0, 0.126, 0.009);
    },
    -0.26,
  );
}

// ---------------------------------------------------------------- escritorio

export function drawMonitor(b: StaticBatch, m: Materials, o: { w: number; screen: number }): void {
  const h = o.w * 0.5625;
  const panelBottom = 0.19;
  b.box(m.plasticSoft, 0.26, 0.012, 0.19, 0, 0.006, 0);
  b.box(m.plasticSoft, 0.05, panelBottom, 0.025, 0, panelBottom / 2, -0.03);
  b.box(m.plastic, o.w, h, 0.028, 0, panelBottom + h / 2, 0);
  b.box(m.plasticSoft, o.w * 0.3, h * 0.4, 0.04, 0, panelBottom + h / 2, -0.034);
  b.box(
    m.screenDemo[o.screen % m.screenDemo.length],
    o.w - 0.018,
    h - 0.018,
    0.002,
    0,
    panelBottom + h / 2,
    0.019,
  );
}

export function drawKeyboard(b: StaticBatch, m: Materials): void {
  b.box(m.plasticSoft, 0.44, 0.018, 0.14, 0, 0.009, 0);
  b.box(m.keyTop, 0.42, 0.004, 0.12, 0, 0.0195, 0);
  b.sphere(m.plasticSoft, 0.032, 0.014, 0.05, 0.31, 0.014, 0.02);
}

export function drawTower(b: StaticBatch, m: Materials): void {
  b.box(m.plastic, 0.21, 0.46, 0.46, 0, 0.23, 0);
  b.box(m.plasticSoft, 0.15, 0.3, 0.004, 0, 0.26, 0.232);
  b.box(m.redGlow, 0.006, 0.28, 0.004, 0.085, 0.26, 0.2345);
  b.cyl(m.silver, 0.014, 0.014, 0.008, 0, 0.42, 0.232, { rx: Math.PI / 2 }, 12);
}

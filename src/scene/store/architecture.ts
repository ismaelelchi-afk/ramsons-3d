import { BEAM_Z, PILLAR_X, PILLAR_Z, STORE } from './constants';
import type { StoreContext } from './context';

/**
 * Envolvente del local: suelo, muros, fachada con entrada, techo con estructura,
 * pilares y guías de pasillo. Todo en metros; la cara interior de los muros queda
 * exactamente en x = ±20 y z = ±28.
 */
export function buildArchitecture(ctx: StoreContext): void {
  ctx.batch.label = 'arquitectura';
  buildFloor(ctx);
  buildSideWalls(ctx);
  buildBackWall(ctx);
  buildFrontWall(ctx);
  buildEntrance(ctx);
  buildCeiling(ctx);
  buildPillars(ctx);
  buildAisleGuides(ctx);
}

const W = STORE.halfW;
const D = STORE.halfD;
const H = STORE.height;
const T = STORE.wallThickness;
/** Los muros sobresalen por encima del techo para cerrar el volumen. */
const WALL_H = H + 0.3;

function buildFloor({ batch: b, mats: m }: StoreContext): void {
  // La textura de baldosa de 1 m se repite 40 × 56 veces sobre la cara superior.
  b.box(m.floor, W * 2, 0.1, D * 2, 0, -0.05, 0);
}

function buildSideWalls({ batch: b, mats: m }: StoreContext): void {
  for (const side of [-1, 1]) {
    b.box(m.wall, T, WALL_H, D * 2 + T * 2, side * (W + T / 2), WALL_H / 2, 0);
    // Zócalo grafito y cenefa roja corrida.
    b.box(m.graphite, 0.04, 0.14, D * 2, side * (W - 0.02), 0.07, 0);
    b.box(m.red, 0.03, 0.18, D * 2, side * (W - 0.015), 4.95, 0);
  }
}

function buildBackWall({ batch: b, mats: m, signage }: StoreContext): void {
  b.box(m.wall, W * 2, WALL_H, T, 0, WALL_H / 2, -D - T / 2);

  // Zócalo y cenefa a ambos lados del panel central.
  for (const side of [-1, 1]) {
    b.box(m.graphite, 15, 0.14, 0.04, side * 12.5, 0.07, -D + 0.02);
    b.box(m.red, 15, 0.18, 0.03, side * 12.5, 4.95, -D + 0.015);
  }

  // Panel rojo central al fondo del pasillo, con la identificación provisional.
  b.box(m.red, 10, 5.9, 0.1, 0, 2.95, -D + 0.05);
  for (const side of [-1, 1]) {
    b.box(m.graphite, 0.2, 5.95, 0.14, side * 5.1, 2.975, -D + 0.07);
  }
  b.box(m.graphite, 10, 0.14, 0.12, 0, 0.07, -D + 0.06);
  signage.textPlane('RAMSONS 3D', 'textWhite', 0, 3.9, -D + 0.102, 8.6, 1.6);
  signage.textPlane('TECNOLOGÍA Y HOGAR', 'textWhite', 0, 2.55, -D + 0.102, 6.2, 0.6);
}

function buildFrontWall({ batch: b, mats: m }: StoreContext): void {
  const z = D + T / 2;
  const openHalf = 5;
  const doorH = 4.4;
  const windowBottom = 0.9;
  const windowTop = 3.9;
  const wingW = W - openHalf;
  const pierW = 0.5;
  const windowW = (wingW - pierW * 4) / 3;

  // Dintel sobre la abertura de entrada.
  b.box(m.wall, openHalf * 2, WALL_H - doorH, T, 0, doorH + (WALL_H - doorH) / 2, z);

  for (const side of [-1, 1]) {
    const centerX = side * (openHalf + wingW / 2);
    b.box(m.wall, wingW, windowBottom, T, centerX, windowBottom / 2, z);
    b.box(m.wall, wingW, WALL_H - windowTop, T, centerX, windowTop + (WALL_H - windowTop) / 2, z);

    const windowH = windowTop - windowBottom;
    const windowY = windowBottom + windowH / 2;
    for (let i = 0; i < 4; i += 1) {
      const px = openHalf + pierW / 2 + i * (windowW + pierW);
      b.box(m.wall, pierW, windowH, T, side * px, windowY, z);
    }
    for (let i = 0; i < 3; i += 1) {
      const gx = openHalf + pierW + windowW / 2 + i * (windowW + pierW);
      b.box(m.glass, windowW, windowH, 0.03, side * gx, windowY, z);
      b.box(m.graphite, windowW, 0.06, 0.12, side * gx, windowBottom + 0.03, z + 0.02);
    }
  }
}

function buildEntrance({ batch: b, mats: m, signage }: StoreContext): void {
  const z = D + T / 2;
  const openHalf = 5;
  const doorH = 4.4;

  // Jambas, riel superior y umbral.
  for (const side of [-1, 1]) {
    b.box(m.graphite, 0.1, doorH, T, side * (openHalf - 0.05), doorH / 2, z);
  }
  b.box(m.graphite, openHalf * 2, 0.16, 0.3, 0, doorH - 0.08, z);
  b.box(m.graphite, openHalf * 2, 0.02, 0.4, 0, 0.01, z);

  // Hojas correderas de vidrio estacionadas a cada lado de la entrada (abertura libre central).
  const leafW = 2.4;
  const leafH = 4.1;
  const leafBottom = 0.1;
  for (const side of [-1, 1]) {
    [
      { cx: side * 3.65, lz: D + 0.1 },
      { cx: side * 3.5, lz: D + 0.26 },
    ].forEach(({ cx, lz }) => {
      b.box(m.glass, leafW, leafH, 0.012, cx, leafBottom + leafH / 2, lz);
      b.box(m.graphite, leafW, 0.08, 0.06, cx, leafBottom + leafH - 0.04, lz);
      b.box(m.graphite, leafW, 0.14, 0.06, cx, leafBottom + 0.07, lz);
      for (const edge of [-1, 1]) {
        b.box(m.graphite, 0.06, leafH, 0.06, cx + edge * (leafW / 2 - 0.03), leafBottom + leafH / 2, lz);
      }
      b.box(m.chrome, 0.03, 0.9, 0.04, cx - side * (leafW / 2 - 0.2), 1.1, lz + 0.05);
    });
  }

  // Pavimento exterior (visible a través de la entrada y las ventanas).
  b.box(m.floorCarpet, 60, 0.1, 20, 0, -0.05, D + T + 10);

  // Felpudo y fachada exterior con la identificación provisional.
  b.box(m.rubber, 8, 0.015, 2.2, 0, 0.0075, D - 1.4);
  b.box(m.red, 13, 1.5, 0.12, 0, 5.2, D + T + 0.06);
  b.box(m.graphite, 13, 0.14, 2.6, 0, 4.33, D + T + 1.3);
  signage.textPlane('RAMSONS 3D', 'textWhite', 0, 5.2, D + T + 0.122, 9, 1.1);
  // Cara interior del dintel (visible al girar hacia la salida).
  signage.textPlane('GRACIAS POR SU VISITA', 'white', 0, 5.3, D - 0.015, 6, 0.7, Math.PI);
}

function buildCeiling({ batch: b, mats: m }: StoreContext): void {
  // Losa del techo y estructura vista: vigas transversales sobre la rejilla de pilares
  // y vigas longitudinales sobre los ejes del pasillo y de las zonas laterales.
  b.box(m.ceiling, W * 2, 0.3, D * 2, 0, H + 0.15, 0);
  for (const z of BEAM_Z) {
    b.box(m.graphite, W * 2, 0.45, 0.35, 0, H - 0.225, z);
  }
  for (const x of [-13, -5, 5, 13]) {
    b.box(m.graphiteSoft, 0.3, 0.3, D * 2, x, H - 0.15, 0);
  }
  // Cinta roja continua sobre el pasillo central.
  b.box(m.red, 1.2, 0.04, D * 2 - 4, 0, H - 0.02, 0);
}

function buildPillars({ batch: b, mats: m }: StoreContext): void {
  for (const x of PILLAR_X) {
    for (const z of PILLAR_Z) {
      b.box(m.graphite, 0.74, 0.15, 0.74, x, 0.075, z);
      b.box(m.wall, 0.62, H - 0.15, 0.62, x, 0.15 + (H - 0.15) / 2, z);
      b.box(m.red, 0.66, 0.4, 0.66, x, 3.5, z);
    }
  }
}

/** Líneas rojas de suelo que enmarcan el pasillo central y refuerzan la perspectiva. */
function buildAisleGuides({ batch: b, mats: m }: StoreContext): void {
  for (const side of [-1, 1]) {
    b.box(m.red, 0.12, 0.012, 51, side * 4.2, 0.026, -0.5);
  }
}

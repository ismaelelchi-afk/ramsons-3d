import type { StoreContext } from '../context';
import { drawDisplayTable, drawShelfUnit, fillShelfWithBoxes } from '../products/fixtures';
import { createRng } from '../random';
import { zonePatch } from './common';

/**
 * B. Teléfonos y computadoras (zona media izquierda).
 * Estantería de pared con cajas, mesas de teléfonos, portátiles y equipos de escritorio.
 * Origen local: centro de la zona (x = -12.6, z = -2.4).
 */
export function buildMobileDepartment(ctx: StoreContext): void {
  const { batch: b, mats: m, products: p, signage } = ctx;
  b.label = 'mobile';
  const rng = createRng(23);

  zonePatch(ctx, m.floorCool, -12.6, -2.4, 14.0, 16.8);

  b.group(-12.6, 0, -2.4, 0, () => {
    // Estantería de pared (mira hacia +X) con cajas de producto: 6 módulos de 2,6 m.
    const levels = [0.35, 0.95, 1.55, 2.15, 2.6];
    const unitH = 3.0;
    for (let bay = 0; bay < 6; bay += 1) {
      const z = -6.5 + bay * 2.6;
      b.group(-7.05, 0, z, Math.PI / 2, () => {
        drawShelfUnit(b, m, { w: 2.6, h: unitH, d: 0.6, levels });
        levels.forEach((level, index) => {
          const next = levels[index + 1] ?? unitH - 0.12;
          fillShelfWithBoxes(b, m, rng, { w: 2.6, d: 0.6, shelfY: level, maxH: Math.min(0.5, next - level - 0.04) });
        });
      });
    }

    // Mesas de teléfonos (con gradas) a z = -5.2.
    const phoneTable = (x: number, seedShift: number): void => {
      b.group(x, 0, -5.2, 0, () => {
        drawDisplayTable(b, m, { len: 4, depth: 1.4, h: 0.9 });
        b.box(m.whiteGloss, 3.7, 0.1, 0.4, 0, 0.95, 0);
        b.box(m.whiteGloss, 3.7, 0.2, 0.4, 0, 1.0, -0.42);
        const tiers = [
          { y: 0.9, z: 0.42 },
          { y: 1.0, z: 0 },
          { y: 1.1, z: -0.42 },
        ];
        tiers.forEach((tier, row) => {
          for (let i = 0; i < 9; i += 1) {
            p.place(
              'phone',
              { x: -1.6 + i * 0.4, y: tier.y, z: tier.z },
              { body: (i + row + seedShift) % 3, screen: (i * 2 + row + seedShift) % 4 },
            );
          }
        });
        for (let i = -2; i <= 2; i += 1) {
          p.place('priceTag', { x: i * 0.8, y: 0.9, z: 0.6 });
        }
      });
    };
    phoneTable(-3.4, 0);
    phoneTable(3.4, 1);

    // Mesas de portátiles abiertos a z = 0.
    const laptopTable = (x: number, seedShift: number): void => {
      b.group(x, 0, 0, 0, () => {
        drawDisplayTable(b, m, { len: 4, depth: 1.4, h: 0.8 });
        b.box(m.whiteGloss, 3.6, 0.12, 0.45, 0, 0.86, -0.3);
        for (let i = 0; i < 5; i += 1) {
          const lx = -1.5 + i * 0.75;
          p.place('laptop', { x: lx, y: 0.8, z: 0.3 }, { screen: (i + seedShift) % 4, silver: (i + seedShift) % 2 === 0 });
          p.place('laptop', { x: lx, y: 0.92, z: -0.3 }, { screen: (i + seedShift + 2) % 4, silver: (i + seedShift) % 2 === 1 });
        }
        for (let i = -2; i <= 2; i += 1) {
          p.place('priceTag', { x: i * 0.8, y: 0.8, z: 0.62 });
        }
      });
    };
    laptopTable(-3.4, 0);
    laptopTable(3.4, 1);

    // Mesas de equipos de escritorio a z = 5.2.
    const desktopTable = (x: number, monitors: readonly number[], seedShift: number): void => {
      b.group(x, 0, 5.2, 0, () => {
        drawDisplayTable(b, m, { len: 4, depth: 1.4, h: 0.75 });
        monitors.forEach((width, i) => {
          const sx = -1.3 + i * 1.3;
          p.place('monitor', { x: sx, y: 0.75, z: -0.3 }, { w: width, screen: (i + seedShift) % 4 });
          p.place('keyboard', { x: sx - 0.1, y: 0.75, z: 0.3 });
          p.place('tower', { x: sx + 0.5, y: 0.75, z: -0.3 });
        });
        for (let i = -2; i <= 2; i += 1) {
          p.place('priceTag', { x: i * 0.8, y: 0.75, z: 0.62 });
        }
      });
    };
    desktopTable(-3.4, [0.54, 0.62, 0.7], 0);
    desktopTable(3.4, [0.62, 0.8, 0.54], 2);

    signage.hanging('TELÉFONOS Y COMPUTADORAS', 0, 4.25, 8.0, 7.4);
  });
}

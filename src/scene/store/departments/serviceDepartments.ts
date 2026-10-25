import type { StoreContext } from '../context';
import {
  drawBench,
  drawCounter,
  drawOfficeChair,
  drawPosStation,
  drawShelfUnit,
  drawStanchion,
  drawTotem,
  fillShelfWithBoxes,
} from '../products/fixtures';
import { createRng } from '../random';
import { zonePatch } from './common';

/** E (1/2). Caja: mostrador principal rojo con puestos de cobro y filas guiadas. */
export function buildCheckoutDepartment(ctx: StoreContext): void {
  const { batch: b, mats: m, products: p, signage } = ctx;
  b.label = 'checkout';
  const rng = createRng(53);

  zonePatch(ctx, m.floorCool, 12.6, 12.5, 14.4, 9);

  // Mostrador principal (el cajero trabaja del lado -Z, el cliente llega por +Z).
  b.group(12, 0, 12, 0, () => {
    drawCounter(b, m, { len: 10, depth: 1.1, h: 1.05, front: 'red' });
    [-3.5, -1, 1.5, 4].forEach((x) => {
      b.group(x, 1.05, 0, 0, () => drawPosStation(b, m));
    });
  });

  // Estantería de accesorios y garantías detrás del mostrador.
  [8.9, 12.1, 15.3].forEach((x) => {
    b.group(x, 0, 9.9, 0, () => {
      const levels = [0.5, 1.1, 1.7];
      drawShelfUnit(b, m, { w: 3.1, h: 2.2, d: 0.45, levels });
      levels.forEach((level, index) => {
        const next = levels[index + 1] ?? 2.1;
        fillShelfWithBoxes(b, m, rng, { w: 3.1, d: 0.45, shelfY: level, maxH: Math.min(0.45, next - level - 0.04) });
      });
    });
  });

  // Postes y cintas de fila.
  const queueX = [7.6, 9.4, 11.2, 13.0, 14.8, 16.6];
  const queueZ = 15;
  queueX.forEach((x) => b.group(x, 0, queueZ, 0, () => drawStanchion(b, m)));
  for (let i = 0; i < queueX.length - 1; i += 1) {
    const x0 = queueX[i] as number;
    const x1 = queueX[i + 1] as number;
    b.box(m.red, x1 - x0 - 0.07, 0.04, 0.015, (x0 + x1) / 2, 0.88, queueZ);
  }

  p.place('plant', { x: 19, z: 25.5 }, { scale: 1.1 });
  p.place('plant', { x: 6.1, z: 26.9 }, { scale: 0.9 });
  p.place('plant', { x: 19, z: 8.2 }, { scale: 0.9 });

  signage.hanging('CAJA', 12, 4.1, 12.3, 3.2);
}

/** E (2/2). Atención al cliente: mostrador blanco, puestos de trabajo y sala de espera. */
export function buildServiceDepartment(ctx: StoreContext): void {
  const { batch: b, mats: m, products: p, signage } = ctx;
  b.label = 'service';

  zonePatch(ctx, m.floorCool, -12.5, 14, 14.2, 12);

  b.group(-12.5, 0, 12, 0, () => {
    drawCounter(b, m, { len: 9, depth: 1.1, h: 1.05, front: 'white' });
    [-3, 0, 3].forEach((x) => {
      b.group(x, 1.05, 0, 0, () => drawPosStation(b, m));
      b.group(x, 0, -1.3, 0, () => drawOfficeChair(b, m));
    });
  });

  // Panel trasero de información.
  b.box(m.graphite, 9, 2.6, 0.1, -12.5, 1.3, 8.6);
  signage.textPlane('GARANTÍAS Y ATENCIÓN', 'graphite', -12.5, 1.9, 8.656, 6, 0.6);

  // Sala de espera frente al mostrador (mirando hacia el fondo) y tótem de turnos.
  [-15.5, -9.5].forEach((x) => b.group(x, 0, 18, Math.PI, () => drawBench(b, m, { len: 2.4 })));
  b.group(-6.6, 0, 15.5, 0, () => drawTotem(b, m));

  p.place('plant', { x: -19, z: 25.5 }, { scale: 1.1 });
  p.place('plant', { x: -6.1, z: 26.9 }, { scale: 0.9 });
  p.place('plant', { x: -19, z: 8.2 }, { scale: 0.9 });

  signage.hanging('ATENCIÓN AL CLIENTE', -12.5, 4.1, 12.3, 5.8, 'graphite');
}

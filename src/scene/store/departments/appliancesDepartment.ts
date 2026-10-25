import type { FridgeOptions, Finish } from '../products/appliances';
import type { StoreContext } from '../context';
import { drawShelfUnit, fillShelfWithBoxes } from '../products/fixtures';
import { createRng } from '../random';
import { zonePatch } from './common';

/**
 * C. Electrodomésticos (fondo derecho).
 * Hilera de refrigeradores contra la pared, lavadoras y secadoras, cocinas,
 * pequeños aparatos en estantería y congeladores. Origen local: centro de la
 * pared del fondo de la zona (x = 12.8, z = -28).
 */
export function buildAppliancesDepartment(ctx: StoreContext): void {
  const { batch: b, mats: m, products: p, signage } = ctx;
  b.label = 'appliances';
  const rng = createRng(37);

  zonePatch(ctx, m.floorCool, 12.8, -20.1, 14.0, 15.7);

  b.group(12.8, 0, -28, 0, () => {
    // Panel de fondo con línea roja y aires acondicionados sobre él.
    b.box(m.graphiteSoft, 13.6, 2.7, 0.06, 0, 1.35, 0.03);
    b.box(m.redGlow, 13.6, 0.04, 0.02, 0, 2.72, 0.07);
    for (const x of [-4.6, 0, 4.6]) {
      p.place('airConditioner', { x, y: 3.2, z: 0.11 });
    }

    // Refrigeradores en varios estilos y acabados.
    const fridges: FridgeOptions[] = [
      { style: 'top', w: 0.7, h: 1.65, finish: 'white' },
      { style: 'top', w: 0.75, h: 1.75, finish: 'inox' },
      { style: 'top', w: 0.7, h: 1.7, finish: 'white' },
      { style: 'bottom', w: 0.7, h: 1.85, finish: 'inox' },
      { style: 'bottom', w: 0.7, h: 1.85, finish: 'white' },
      { style: 'french', w: 0.9, h: 1.8, finish: 'inox' },
      { style: 'side', w: 0.92, h: 1.78, finish: 'inox' },
      { style: 'side', w: 0.92, h: 1.78, finish: 'black' },
      { style: 'french', w: 0.9, h: 1.8, finish: 'white' },
      { style: 'side', w: 0.92, h: 1.8, finish: 'inox' },
    ];
    const gap = 0.4;
    const total = fridges.reduce((sum, f) => sum + f.w, 0) + gap * (fridges.length - 1);
    let cursor = -total / 2;
    for (const fridge of fridges) {
      p.place('fridge', { x: cursor + fridge.w / 2, z: 0.4 }, fridge);
      cursor += fridge.w + gap;
    }

    // Lavadoras (hilera izquierda) y secadoras sobre plataforma baja.
    const laundryZ = 4.4;
    b.box(m.whiteGloss, 8.2, 0.12, 0.85, 0, 0.06, laundryZ);
    const laundry: Array<{ kind: 'washer' | 'dryer'; finish: 'white' | 'inox' }> = [
      { kind: 'washer', finish: 'white' },
      { kind: 'washer', finish: 'white' },
      { kind: 'washer', finish: 'inox' },
      { kind: 'washer', finish: 'inox' },
      { kind: 'dryer', finish: 'white' },
      { kind: 'dryer', finish: 'white' },
      { kind: 'dryer', finish: 'inox' },
      { kind: 'dryer', finish: 'inox' },
    ];
    laundry.forEach((unit, i) => {
      const x = -3.325 + i * 0.95;
      p.place('washer', { x, y: 0.12, z: laundryZ }, unit);
      p.place('priceTag', { x, y: 0.12, z: laundryZ + 0.42 });
    });

    // Cocinas sobre plataforma.
    const stoveZ = 8.2;
    b.box(m.whiteGloss, 5.6, 0.1, 0.8, -3.9, 0.05, stoveZ);
    const stoves: Finish[] = ['white', 'inox', 'black', 'inox', 'white'];
    stoves.forEach((finish, i) => {
      const x = -6.0 + i * 1.05;
      p.place('stove', { x, y: 0.1, z: stoveZ }, { finish });
      p.place('priceTag', { x, y: 0.1, z: stoveZ + 0.4 });
    });

    // Estantería de pequeños aparatos: microondas, freidoras de aire y licuadoras.
    const bayZ = stoveZ;
    const levels = [0.45, 0.95, 1.45];
    [1.6, 3.6, 5.6].forEach((x, bay) => {
      b.group(x, 0, bayZ, 0, () => {
        drawShelfUnit(b, m, { w: 2.0, h: 1.9, d: 0.5, levels });
        levels.forEach((level, index) => {
          const y = level + 0.0175;
          if (bay === 0 && index < 2) {
            [-0.65, 0, 0.65].forEach((ix, k) =>
              p.place('microwave', { x: ix, y, z: 0 }, { finish: (k + index) % 2 === 0 ? 'black' : 'silver' }),
            );
          } else if (bay === 1 && index < 2) {
            [-0.75, -0.38, 0, 0.38, 0.75].forEach((ix) => p.place('airFryer', { x: ix, y, z: 0 }));
          } else if (bay === 1) {
            [-0.7, -0.35, 0, 0.35, 0.7].forEach((ix) => p.place('blender', { x: ix, y, z: 0 }));
          } else {
            fillShelfWithBoxes(b, m, rng, { w: 2.0, d: 0.5, shelfY: level, maxH: 0.36 });
          }
        });
      });
    });

    // Congeladores horizontales.
    const freezerZ = 11.8;
    [-5.4, -4.05, -2.7, -1.35].forEach((x) => {
      p.place('chestFreezer', { x, z: freezerZ });
      p.place('priceTag', { x, y: 0.9, z: freezerZ + 0.2 });
    });

    signage.hanging('ELECTRODOMÉSTICOS', 0, 4.65, 15.4, 5.4);
  });
}

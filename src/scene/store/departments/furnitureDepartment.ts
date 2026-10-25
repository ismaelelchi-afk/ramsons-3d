import type { StoreContext } from '../context';
import { zonePatch } from './common';

/**
 * D. Muebles y colchones (zona media derecha, suelo de madera).
 * Camas con mesitas de noche, exposición de colchones, salas con alfombra,
 * comedores y almacenaje contra la pared derecha.
 * Origen local: centro de la zona (x = 12.6, z = -2.4).
 */
export function buildFurnitureDepartment(ctx: StoreContext): void {
  const { batch: b, mats: m, products: p, signage } = ctx;
  b.label = 'furniture';

  zonePatch(ctx, m.floorWood, 12.6, -2.4, 14.0, 16.8);

  b.group(12.6, 0, -2.4, 0, () => {
    // Dormitorios: cabeceros hacia el fondo (el pie de la cama mira a la entrada).
    const bedZ = -7.1;
    p.place('bed', { x: -5.6, z: bedZ }, { w: 0.95, blanket: 'beige' });
    p.place('bed', { x: -3.0, z: bedZ }, { w: 1.6, blanket: 'gray' });
    p.place('bed', { x: 0.5, z: bedZ }, { w: 1.9, blanket: 'charcoal', runner: true });
    p.place('bed', { x: 3.9, z: bedZ }, { w: 1.6, blanket: 'beige' });
    for (const x of [-4.4, -1.35, 2.275, 5.5]) {
      p.place('nightstand', { x, z: -7.9 });
    }

    // Almacenaje contra la pared derecha (frente hacia -X).
    for (const z of [-6.2, -4.9]) {
      p.place('wardrobe', { x: 7.0, z, ry: -Math.PI / 2 }, { w: 1.2 });
    }
    [-3.7, -2.6].forEach((z, i) => {
      p.place('bookshelf', { x: 7.15, z, ry: -Math.PI / 2 }, { w: 1.0, seed: 90 + i });
    });

    // Exposición de colchones sobre plataformas.
    [
      { x: -4.5, w: 1.4 },
      { x: -1.5, w: 1.6 },
      { x: 1.5, w: 1.9 },
      { x: 4.5, w: 1.4 },
    ].forEach(({ x, w }) => {
      p.place('mattress', { x, z: -3.7 }, { w, len: 1.9 });
      p.place('priceTag', { x, z: -2.35 });
    });

    // Salas: sofás, mesas de centro y alfombras.
    const sofaZ = 0.7;
    p.place('rug', { x: -4.4, z: 1.6 }, { w: 3.2, d: 2.0 });
    p.place('rug', { x: 2.0, z: 1.7 }, { w: 3.4, d: 2.2, red: true });
    p.place('sofa', { x: -4.4, z: sofaZ }, { w: 2.2, fabric: 'gray' });
    p.place('sofa', { x: -1.2, z: sofaZ }, { w: 1.8, fabric: 'beige' });
    p.place('sofa', { x: 2.0, z: sofaZ }, { w: 2.4, fabric: 'graphite', accent: true });
    p.place('sofa', { x: 4.5, z: sofaZ }, { w: 1.0, fabric: 'beige' });
    p.place('coffeeTable', { x: -4.4, y: 0.012, z: 2.2 });
    p.place('coffeeTable', { x: 2.0, y: 0.012, z: 2.2 });

    // Comedores.
    p.place('diningSet', { x: -4.5, z: 6.2 }, { seatsPerSide: 2 });
    p.place('diningSet', { x: 2.0, z: 6.2 }, { seatsPerSide: 3 });
    p.place('plant', { x: 6.4, z: 7.4 }, { scale: 1.0 });
    p.place('plant', { x: -6.4, z: 7.4 }, { scale: 0.9 });

    signage.hanging('MUEBLES Y COLCHONES', 0, 4.25, 8.0, 5.8);
  });
}

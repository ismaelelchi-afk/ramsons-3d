import type { StoreContext } from '../context';
import { createRng } from '../random';
import { tvSize } from '../products/electronics';
import { zonePatch } from './common';

/**
 * A. Televisores y entretenimiento (fondo izquierdo).
 * Pared de pantallas, muebles bajos con audio/consolas, isla de exposición y
 * pedestales. Origen local: centro de la pared del fondo de la zona (x = -12.8, z = -28).
 */
export function buildTvDepartment(ctx: StoreContext): void {
  const { batch: b, mats: m, products: p, signage } = ctx;
  b.label = 'tv';
  const rng = createRng(11);
  const pickScreen = (): number => (rng() < 0.6 ? Math.floor(rng() * 4) : -1);

  zonePatch(ctx, m.floorCarpet, -12.8, -20.1, 13.9, 15.7);

  b.group(-12.8, 0, -28, 0, () => {
    // Panel de fondo grafito con línea roja superior.
    b.box(m.graphite, 13.6, 4.9, 0.08, 0, 2.45, 0.03);
    b.box(m.redGlow, 13.6, 0.04, 0.02, 0, 4.85, 0.08);

    // Pared de televisores: héroe central de 98", simétrico hacia los lados.
    const wallZ = 0.08 + 0.0225;
    const wallTv = (
      x: number,
      centerY: number,
      inches: number,
      screen: number,
      specId: string,
    ): void => {
      p.place('tv', { x, y: centerY - tvSize(inches).h / 2, z: wallZ }, { inches, mount: 'wall', screen, specId });
    };
    wallTv(0, 2.55, 98, 0, 'tv-98-0');
    wallTv(-2.215, 2.55, 75, 1, 'tv-75-0');
    wallTv(2.215, 2.55, 75, 3, 'tv-75-1');
    wallTv(-4.065, 2.55, 65, 2, 'tv-65-0');
    wallTv(4.065, 2.55, 65, 0, 'tv-65-1');
    wallTv(-5.694, 2.55, 55, -1, 'tv-55-0');
    wallTv(5.694, 2.55, 55, 1, 'tv-55-1');
    [-3.625, -2.175, -0.725, 0.725, 2.175, 3.625].forEach((x, index) => {
      wallTv(x, 3.95, 43, pickScreen(), `tv-43-${index}`);
    });
    [-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6].forEach((x, index) => {
      wallTv(x, 1.5, 32, pickScreen(), `tv-32-${index}`);
    });

    // Muebles bajos con barras de sonido, altavoces y consolas.
    const benchZ = 0.31;
    for (const x of [-5.1, -1.7, 1.7, 5.1]) {
      b.box(m.graphite, 3.1, 0.08, 0.4, x, 0.04, benchZ);
      b.box(m.whiteGloss, 3.2, 0.44, 0.45, x, 0.3, benchZ);
    }
    const top = 0.52;
    p.place('soundbar', { x: -5.6, y: top, z: benchZ }, { w: 0.9 });
    p.place('gameConsole', { x: -4.3, y: top, z: benchZ });
    p.place('speaker', { x: -2.7, y: top, z: benchZ }, { h: 0.35 });
    p.place('gameConsole', { x: -1.7, y: top, z: benchZ });
    p.place('speaker', { x: -0.7, y: top, z: benchZ }, { h: 0.35 });
    p.place('soundbar', { x: 1.7, y: top, z: benchZ }, { w: 1.1 });
    p.place('gameConsole', { x: 2.8, y: top, z: benchZ });
    p.place('speaker', { x: 4.0, y: top, z: benchZ }, { h: 0.35 });
    p.place('soundbar', { x: 5.5, y: top, z: benchZ }, { w: 0.9 });

    // Isla de exposición con cinco televisores de 55" sobre pies.
    const islandZ = 5.0;
    b.box(m.whiteGloss, 10.4, 0.45, 1.5, 0, 0.225, islandZ);
    b.box(m.redGlow, 10.2, 0.03, 0.01, 0, 0.12, islandZ + 0.755);
    [-3.8, -1.9, 0, 1.9, 3.8].forEach((x, index) => {
      p.place(
        'tv',
        { x, y: 0.45, z: islandZ },
        { inches: 55, mount: 'stand', screen: index % 4, specId: `tv-55-${index + 2}` },
      );
      p.place('priceTag', { x, y: 0.45, z: islandZ + 0.52 });
    });

    // Pedestales con televisores de 50".
    [-3.6, 0, 3.6].forEach((x, index) => {
      b.box(m.whiteGloss, 1.1, 0.8, 0.55, x, 0.4, 9.2);
      b.box(m.redGlow, 1.0, 0.025, 0.01, x, 0.25, 9.2 + 0.28);
      p.place(
        'tv',
        { x, y: 0.8, z: 9.2 },
        { inches: 50, mount: 'stand', screen: (index + 2) % 4, specId: `tv-50-${index}` },
      );
      p.place('priceTag', { x, y: 0.8, z: 9.2 + 0.2 });
    });

    signage.hanging('TELEVISORES Y ENTRETENIMIENTO', 0, 4.65, 15.4, 7.4);
  });
}

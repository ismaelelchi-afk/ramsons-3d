/**
 * Dimensiones, paleta y zonas de la tienda RAMSONS 3D (unidades: metros).
 *
 * Sistema de coordenadas:
 *  - X: izquierda (-) / derecha (+) visto desde la entrada.
 *  - Y: altura.
 *  - Z: fondo de la tienda (-) / entrada (+). La pared de la entrada está en z = +28.
 */

export const STORE = {
  /** Semiancho interior: x ∈ [-20, 20]. */
  halfW: 20,
  /** Semifondo interior: z ∈ [-28, 28]. */
  halfD: 28,
  /** Altura libre interior hasta la cara inferior del techo. */
  height: 6,
  /** Grosor de muros (se construyen hacia afuera: la cara interior queda exacta). */
  wallThickness: 0.4,
  /** Semiancho del pasillo central. */
  aisleHalfWidth: 5,
  /** Lado de la baldosa comercial del suelo. */
  tileSize: 1,
} as const;

export const COLORS = {
  /** Rojo de acento inspirado en Ramsons. */
  red: 0xdd2638,
  redDeep: 0xa5192a,
  white: 0xf5f5f3,
  offWhite: 0xe8e9ea,
  graphite: 0x2b2e34,
  graphiteSoft: 0x434850,
  floor: 0xd9dbde,
  ceiling: 0xe8ebee,
  /** Color de fondo visible solo a través de la entrada y las ventanas. */
  sky: 0xcfd9e2,
} as const;

/** Vigas transversales (rejilla de 8 m). */
export const BEAM_Z: readonly number[] = [20, 12, 4, -4, -12, -20];
/**
 * Pilares: flanquean el pasillo central. Se omite la fila junto a la entrada (z = 20)
 * para que no tapen los laterales en la vista inicial de la cámara.
 */
export const PILLAR_Z: readonly number[] = [12, 4, -4, -12, -20];
export const PILLAR_X: readonly number[] = [-5, 5];

export type ZoneId = 'tv' | 'appliances' | 'mobile' | 'furniture' | 'checkout' | 'service';

export interface Zone {
  id: ZoneId;
  label: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Zonas comerciales (huella en planta). Todo lo que construye un departamento
 * debe quedar dentro de su zona; la verificación automática lo comprueba.
 */
export const ZONES: Record<ZoneId, Zone> = {
  tv: { id: 'tv', label: 'Televisores y entretenimiento', minX: -19.95, maxX: -5.6, minZ: -27.95, maxZ: -12.2 },
  appliances: { id: 'appliances', label: 'Electrodomésticos', minX: 5.6, maxX: 19.95, minZ: -27.95, maxZ: -12.2 },
  mobile: { id: 'mobile', label: 'Teléfonos y computadoras', minX: -19.95, maxX: -5.6, minZ: -10.8, maxZ: 6.0 },
  furniture: { id: 'furniture', label: 'Muebles y colchones', minX: 5.6, maxX: 19.95, minZ: -10.8, maxZ: 6.0 },
  checkout: { id: 'checkout', label: 'Caja', minX: 5.2, maxX: 19.95, minZ: 6.5, maxZ: 27.9 },
  service: { id: 'service', label: 'Atención al cliente', minX: -19.95, maxX: -5.2, minZ: 6.5, maxZ: 27.9 },
};

/** Cámara fija: altura de una persona, cerca de la entrada, mirando hacia el interior. */
export const STORE_CAMERA = {
  position: [0, 1.65, 24.2] as const,
  target: [0, 2.3, -28] as const,
} as const;

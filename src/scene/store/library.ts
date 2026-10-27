import * as THREE from 'three';
import type { StaticBatch } from './batch';
import type { Materials } from './materials';
import {
  drawAirConditioner,
  drawAirFryer,
  drawBlender,
  drawChestFreezer,
  drawFridge,
  drawMicrowave,
  drawStove,
  drawWasher,
  type FridgeOptions,
  type StoveOptions,
  type WasherOptions,
} from './products/appliances';
import {
  drawGameConsole,
  drawKeyboard,
  drawLaptop,
  drawMonitor,
  drawPhone,
  drawSoundbar,
  drawSpeaker,
  drawTower,
  drawTv,
  tvLocalBounds,
  type LaptopOptions,
  type PhoneOptions,
  type TvOptions,
} from './products/electronics';
import {
  drawBed,
  drawBookshelf,
  drawChair,
  drawCoffeeTable,
  drawDiningSet,
  drawMattressDisplay,
  drawNightstand,
  drawPlant,
  drawPriceTag,
  drawRug,
  drawSofa,
  drawWardrobe,
  type BedOptions,
  type SofaOptions,
} from './products/furniture';
import {
  createWallTv32Resource,
  type WallTv32Resource,
} from './products/wallTv';
import { Tv55Resource } from './products/tv55';
import type { Tv55Asset } from '../../ui/tv/tv55Assets';

/**
 * Catálogo de productos provisionales.
 *
 * Cada tipo de producto se dibuja con geometría procedural simple, pero el resto
 * de la tienda solo conoce `ProductLibrary.place(kind, ...)`. Para sustituir un
 * producto por un modelo GLB en el futuro basta con registrar una fábrica:
 *
 *   library.registerOverride('tv', (options) => cloneDelModeloGlb(options));
 *
 * y todos los televisores de la tienda pasan a usar el modelo, sin tocar los
 * departamentos. Los objetos sustituidos viven en `library.overrides` (no se fusionan).
 */

export interface ProductOptionsMap {
  tv: TvOptions;
  soundbar: { w: number };
  speaker: { h: number };
  gameConsole: undefined;
  phone: PhoneOptions;
  laptop: LaptopOptions;
  monitor: { w: number; screen: number };
  keyboard: undefined;
  tower: undefined;
  fridge: FridgeOptions;
  washer: WasherOptions;
  stove: StoveOptions;
  microwave: { finish: 'black' | 'silver' };
  airConditioner: undefined;
  chestFreezer: undefined;
  airFryer: undefined;
  blender: undefined;
  bed: BedOptions;
  nightstand: undefined;
  sofa: SofaOptions;
  coffeeTable: undefined;
  chair: undefined;
  diningSet: { seatsPerSide: number };
  wardrobe: { w: number };
  bookshelf: { w: number; seed: number };
  mattress: { w: number; len: number };
  plant: { scale: number };
  rug: { w: number; d: number; red?: boolean };
  priceTag: undefined;
}

export type ProductKind = keyof ProductOptionsMap;

export interface Placement {
  x?: number;
  y?: number;
  z?: number;
  /** Giro alrededor de Y (radianes). */
  ry?: number;
}

/** Hit box invisible de un televisor, en coordenadas de mundo. */
export interface TvHit {
  specId: string;
  box: THREE.Box3;
}

type Drawers = {
  [K in ProductKind]: (b: StaticBatch, m: Materials, options: ProductOptionsMap[K]) => void;
};

const DRAWERS: Drawers = {
  tv: drawTv,
  soundbar: drawSoundbar,
  speaker: drawSpeaker,
  gameConsole: (b, m) => drawGameConsole(b, m),
  phone: drawPhone,
  laptop: drawLaptop,
  monitor: drawMonitor,
  keyboard: (b, m) => drawKeyboard(b, m),
  tower: (b, m) => drawTower(b, m),
  fridge: drawFridge,
  washer: drawWasher,
  stove: drawStove,
  microwave: drawMicrowave,
  airConditioner: (b, m) => drawAirConditioner(b, m),
  chestFreezer: (b, m) => drawChestFreezer(b, m),
  airFryer: (b, m) => drawAirFryer(b, m),
  blender: (b, m) => drawBlender(b, m),
  bed: drawBed,
  nightstand: (b, m) => drawNightstand(b, m),
  sofa: drawSofa,
  coffeeTable: (b, m) => drawCoffeeTable(b, m),
  chair: (b, m) => drawChair(b, m),
  diningSet: drawDiningSet,
  wardrobe: drawWardrobe,
  bookshelf: drawBookshelf,
  mattress: drawMattressDisplay,
  plant: drawPlant,
  rug: drawRug,
  priceTag: (b, m) => drawPriceTag(b, m),
};

type OptionsArgs<K extends ProductKind> = ProductOptionsMap[K] extends undefined
  ? []
  : [options: ProductOptionsMap[K]];

export class ProductLibrary {
  /** Objetos sueltos que sustituyen a productos geométricos (p. ej. modelos GLB). */
  public readonly overrides = new THREE.Group();
  /** Hit boxes de los televisores creados (coordenadas de mundo). */
  public readonly tvHits: TvHit[] = [];

  private readonly batch: StaticBatch;
  private readonly materials: Materials;
  private readonly factories = new Map<ProductKind, (options: unknown) => THREE.Object3D>();
  private wallTv32: WallTv32Resource | null | undefined;
  private tv55Asset: Tv55Asset | null;
  private tv55: Tv55Resource | null = null;
  private tv55Unavailable = false;

  constructor(
    batch: StaticBatch,
    materials: Materials,
    tv55Asset: Tv55Asset | null = null,
  ) {
    this.batch = batch;
    this.materials = materials;
    this.tv55Asset = tv55Asset;
    this.overrides.name = 'productos-sustituidos';
  }

  /** Registra una fábrica que reemplaza el dibujo geométrico de `kind`. */
  registerOverride<K extends ProductKind>(
    kind: K,
    factory: (options: ProductOptionsMap[K]) => THREE.Object3D,
  ): void {
    this.factories.set(kind, factory as (options: unknown) => THREE.Object3D);
  }

  /** Coloca un producto en la transformación actual del batch + `at`. */
  place<K extends ProductKind>(kind: K, at: Placement, ...args: OptionsArgs<K>): void {
    const options = args[0] as ProductOptionsMap[K];
    const x = at.x ?? 0;
    const y = at.y ?? 0;
    const z = at.z ?? 0;
    const ry = at.ry ?? 0;

    const factory = this.factories.get(kind);
    if (factory) {
      const object = factory(options);
      this.batch.placeObject(object, x, y, z, ry);
      this.overrides.add(object);
      return;
    }

    let realisticWallTv = false;
    let realisticTv55 = false;
    if (kind === 'tv') {
      const tvOptions = options as TvOptions;
      if (tvOptions.specId) {
        const box = tvLocalBounds(tvOptions).applyMatrix4(this.batch.worldMatrix(x, y, z, ry));
        this.tvHits.push({ specId: tvOptions.specId, box });
      }
      realisticWallTv = tvOptions.inches === 32 && tvOptions.mount === 'wall';
      realisticTv55 = tvOptions.inches === 55;
    }

    if (realisticWallTv) {
      const wallTv = this.getWallTv32();
      if (wallTv) {
        wallTv.place(this.batch, x, y, z, ry);
        return;
      }
    }

    if (realisticTv55) {
      const tv55 = this.getTv55();
      if (tv55) {
        tv55.place(this.batch, x, y, z, ry, (options as TvOptions).mount);
        return;
      }
    }

    const drawer = DRAWERS[kind] as (b: StaticBatch, m: Materials, o: ProductOptionsMap[K]) => void;
    this.batch.group(x, y, z, ry, () => drawer(this.batch, this.materials, options));
  }

  private getWallTv32(): WallTv32Resource | null {
    if (this.wallTv32 === undefined) {
      this.wallTv32 = createWallTv32Resource();
    }
    return this.wallTv32;
  }

  private getTv55(): Tv55Resource | null {
    if (this.tv55) return this.tv55;
    if (this.tv55Unavailable || !this.tv55Asset) return null;

    try {
      this.tv55 = new Tv55Resource(this.tv55Asset);
    } catch (error) {
      this.tv55Unavailable = true;
      console.warn('No se pudo preparar el modelo de TV de 55"; se usa el fallback:', error);
    }
    return this.tv55;
  }

  /** Actualiza la alternancia compartida de las pantallas de 32" y 55". */
  animate(now: number): void {
    this.tv55?.animate(now);
    this.wallTv32?.animate(now);
  }

  /** Libera los materiales y texturas de los modelos realistas. */
  dispose(): void {
    this.tv55?.dispose();
    this.tv55 = null;
    this.tv55Asset = null;
    this.wallTv32?.dispose();
    this.wallTv32 = null;
  }

  /** Devuelve el `specId` del televisor más cercano que intersecta el rayo. */
  pickTv(ray: THREE.Ray): string | null {
    const point = new THREE.Vector3();
    let bestId: string | null = null;
    let bestDistance = Infinity;
    for (const hit of this.tvHits) {
      const intersection = ray.intersectBox(hit.box, point);
      if (!intersection) {
        continue;
      }
      const distance = intersection.distanceTo(ray.origin);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestId = hit.specId;
      }
    }
    return bestId;
  }
}

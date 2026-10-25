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

  private readonly batch: StaticBatch;
  private readonly materials: Materials;
  private readonly factories = new Map<ProductKind, (options: unknown) => THREE.Object3D>();

  constructor(batch: StaticBatch, materials: Materials) {
    this.batch = batch;
    this.materials = materials;
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

    const drawer = DRAWERS[kind] as (b: StaticBatch, m: Materials, o: ProductOptionsMap[K]) => void;
    this.batch.group(x, y, z, ry, () => drawer(this.batch, this.materials, options));
  }
}

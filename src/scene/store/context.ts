import type { StaticBatch } from './batch';
import type { ProductLibrary } from './library';
import type { Materials } from './materials';
import type { Signage } from './signage';

/** Servicios compartidos que reciben todos los constructores de la tienda. */
export interface StoreContext {
  batch: StaticBatch;
  mats: Materials;
  products: ProductLibrary;
  signage: Signage;
}

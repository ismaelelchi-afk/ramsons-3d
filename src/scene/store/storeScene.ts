import * as THREE from 'three';
import { buildArchitecture } from './architecture';
import { StaticBatch } from './batch';
import { COLORS } from './constants';
import type { StoreContext } from './context';
import { buildAppliancesDepartment } from './departments/appliancesDepartment';
import { buildFurnitureDepartment } from './departments/furnitureDepartment';
import { buildMobileDepartment } from './departments/mobileDepartment';
import { buildCheckoutDepartment, buildServiceDepartment } from './departments/serviceDepartments';
import { buildTvDepartment } from './departments/tvDepartment';
import { buildCeilingFixtures, createStoreLights } from './lighting';
import { ProductLibrary } from './library';
import { createMaterials, disposeMaterials, type Materials } from './materials';
import { Signage } from './signage';

export interface StoreSceneOptions {
  /** Registra cajas envolventes por primitiva (solo para verificación automática). */
  trackBounds?: boolean;
}

/**
 * Escena de la tienda RAMSONS 3D (fase 1): local comercial con cinco departamentos,
 * construido solo con geometría procedural de Three.js.
 *
 * Es una escena estática: no tiene animación, por lo que `main.ts` solo necesita
 * renderizarla al inicio y al redimensionar la ventana.
 */
export class StoreScene {
  public readonly scene = new THREE.Scene();
  public readonly batch: StaticBatch;
  public readonly products: ProductLibrary;

  private readonly mats: Materials;
  private readonly signage: Signage;

  constructor(options: StoreSceneOptions = {}) {
    this.scene.name = 'tienda-ramsons-3d';
    this.scene.background = new THREE.Color(COLORS.sky);

    this.mats = createMaterials();
    this.batch = new StaticBatch(options.trackBounds === true);
    this.products = new ProductLibrary(this.batch, this.mats);
    this.signage = new Signage(this.batch, this.mats);

    const ctx: StoreContext = {
      batch: this.batch,
      mats: this.mats,
      products: this.products,
      signage: this.signage,
    };

    buildArchitecture(ctx);
    buildCeilingFixtures(ctx);
    buildTvDepartment(ctx);
    buildMobileDepartment(ctx);
    buildAppliancesDepartment(ctx);
    buildFurnitureDepartment(ctx);
    buildCheckoutDepartment(ctx);
    buildServiceDepartment(ctx);

    this.scene.add(this.batch.build('tienda-estatica'));
    this.scene.add(this.signage.group);
    this.scene.add(this.products.overrides);
    this.scene.add(createStoreLights());
  }

  /** La tienda es estática; existe para compartir la interfaz con TestScene. */
  animate(): void {}

  dispose(): void {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
      }
    });
    this.signage.dispose();
    disposeMaterials(this.mats);
  }
}

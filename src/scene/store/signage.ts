import * as THREE from 'three';
import type { StaticBatch } from './batch';
import { COLORS, STORE } from './constants';
import type { Materials } from './materials';
import { createSignTexture, type SignStyle } from './textures';

const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** Estilos de rótulo reutilizables (paleta roja / blanca / grafito). */
export const SIGN_STYLES = {
  red: { background: hex(COLORS.red), foreground: '#ffffff' } satisfies SignStyle,
  white: { background: '#ffffff', foreground: hex(COLORS.red), border: hex(COLORS.red) } satisfies SignStyle,
  graphite: { background: hex(COLORS.graphite), foreground: '#ffffff', accent: hex(COLORS.red) } satisfies SignStyle,
  textWhite: { background: null, foreground: '#ffffff' } satisfies SignStyle,
};

export type SignStyleName = keyof typeof SIGN_STYLES;

/**
 * Carteles geométricos con texto en canvas. Los paneles se fusionan en el batch;
 * solo las caras con texto son mallas sueltas (una por cartel, plano de 2 triángulos).
 */
export class Signage {
  /** Planos con texto (se añade a la escena). */
  public readonly group = new THREE.Group();

  private readonly batch: StaticBatch;
  private readonly mats: Materials;
  private readonly plane = new THREE.PlaneGeometry(1, 1);
  private readonly textMaterials: THREE.MeshBasicMaterial[] = [];

  constructor(batch: StaticBatch, mats: Materials) {
    this.batch = batch;
    this.mats = mats;
    this.group.name = 'rotulos';
  }

  /** Plano con texto en la transformación actual + (x, y, z, ry). */
  textPlane(
    text: string,
    style: SignStyleName,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    ry = 0,
  ): void {
    const pxW = 1024;
    const pxH = Math.max(96, Math.min(512, Math.round((pxW * h) / w)));
    const texture = createSignTexture(text, pxW, pxH, SIGN_STYLES[style]);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: SIGN_STYLES[style].background === null,
      toneMapped: false,
    });
    material.name = `sign:${text}`;
    this.textMaterials.push(material);

    const mesh = new THREE.Mesh(this.plane, material);
    mesh.name = `rotulo:${text}`;
    this.batch.placeObject(mesh, x, y, z, ry, w, h, 1);
    this.group.add(mesh);
  }

  /**
   * Cartel colgante de departamento: tablero grafito con cara de texto y dos varillas
   * hasta el techo. Mira hacia +Z (hacia quien entra a la tienda).
   */
  hanging(label: string, x: number, y: number, z: number, w: number, style: SignStyleName = 'red', h = 0.95): void {
    const b = this.batch;
    const depth = 0.12;
    b.box(this.mats.graphite, w, h, depth, x, y, z);
    this.textPlane(label, style, x, y, z + depth / 2 + 0.015, w - 0.1, h - 0.1);

    const rodLength = STORE.height - (y + h / 2);
    for (const side of [-1, 1]) {
      b.cyl(this.mats.silverDark, 0.012, 0.012, rodLength, x + side * w * 0.38, y + h / 2 + rodLength / 2, z, undefined, 6);
    }
  }

  dispose(): void {
    this.plane.dispose();
    this.textMaterials.forEach((material) => {
      material.map?.dispose();
      material.dispose();
    });
    this.textMaterials.length = 0;
  }
}

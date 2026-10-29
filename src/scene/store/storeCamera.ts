import type * as THREE from 'three';
import { STORE_CAMERA } from './constants';

/**
 * Cámara fija de la tienda: altura de una persona (1,65 m), a 3,8 m de la pared de
 * la entrada, mirando hacia el interior por el eje del pasillo central.
 *
 * No modifica `src/core/camera.ts`: se aplica sobre la cámara que esa clase ya crea.
 */
export function applyStoreCamera(camera: THREE.PerspectiveCamera): void {
  camera.position.set(...STORE_CAMERA.position);
  camera.lookAt(...STORE_CAMERA.target);
  updateStoreFov(camera);
}

/**
 * Campo de visión vertical adaptado a la pantalla: en horizontal conserva el valor base;
 * en vertical (teléfono) se amplía hasta 100° para no perder los laterales de la tienda.
 */
export function storeFovForAspect(aspect: number, baseFov = 70): number {
  return aspect >= 1.4 ? baseFov : Math.min(100, baseFov + (1.4 - aspect) * 45);
}

/** Aplica a la cámara la política de FOV actual de la tienda. */
export function updateStoreFov(camera: THREE.PerspectiveCamera): void {
  camera.fov = storeFovForAspect(camera.aspect, 70);
  camera.updateProjectionMatrix();
}

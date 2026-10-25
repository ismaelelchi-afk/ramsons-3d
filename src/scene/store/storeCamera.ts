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
 * Campo de visión vertical adaptado a la pantalla: en horizontal 70°; en vertical
 * (teléfono) se amplía hasta 100° para no perder los laterales de la tienda.
 */
export function updateStoreFov(camera: THREE.PerspectiveCamera): void {
  const base = 70;
  const aspect = camera.aspect;
  camera.fov = aspect >= 1.4 ? base : Math.min(100, base + (1.4 - aspect) * 45);
  camera.updateProjectionMatrix();
}

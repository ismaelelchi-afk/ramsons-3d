import * as THREE from 'three';
import { STORE } from './constants';
import type { StoreContext } from './context';

const FIXTURE_X: readonly number[] = [-16, -10, -2.5, 2.5, 10, 16];
const FIXTURE_Z: readonly number[] = [16, 8, 0, -8, -16, -24];

/**
 * Luminarias de techo (geometría emisiva fusionada en el batch): 36 paneles LED
 * lineales repartidos entre las vigas. No son luces reales, así que no cuestan
 * nada por píxel.
 */
export function buildCeilingFixtures({ batch: b, mats: m }: StoreContext): void {
  b.label = 'iluminacion';
  for (const x of FIXTURE_X) {
    for (const z of FIXTURE_Z) {
      b.box(m.graphite, 0.62, 0.05, 2.72, x, STORE.height - 0.025, z);
      b.box(m.lightPanel, 0.5, 0.02, 2.6, x, STORE.height - 0.06, z);
    }
  }
}

/**
 * Luces reales: solo 2 (hemisférica + direccional), sin sombras. Es lo más barato
 * posible para un teléfono; la sensación de iluminación comercial viene de las
 * luminarias emisivas del techo y del suelo brillante.
 */
export function createStoreLights(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'luces';

  group.add(new THREE.HemisphereLight(0xffffff, 0xdfe3e8, 2.3));

  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(-6, 14, 18);
  group.add(sun);

  return group;
}

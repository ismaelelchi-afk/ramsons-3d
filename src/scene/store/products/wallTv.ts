import * as THREE from 'three';
import {
  createTvScreenMaterial,
  type TvScreenMaterial,
} from '../../../ui/tv/screenMaterial';
import {
  createTvScreenTextures,
  type TvScreenTextures,
} from '../../../ui/tv/screenTextures';
import {
  createRealisticTvModel,
  type RealisticTvModel,
} from '../../../ui/tv/tvModel';
import type { StaticBatch } from '../batch';
import { tvSize } from './electronics';

const MODEL_INCHES = 32;
const MAX_ANISOTROPY = 4;
/** Mitad de la profundidad del televisor primitivo anterior. */
const PREVIOUS_BACK_HALF_DEPTH = 0.0225;
const REFERENCE_HOLD_SECONDS = 4;
const RAMSONS_HOLD_SECONDS = 4;
const FADE_SECONDS = 1.15;
const LOOP_SECONDS = REFERENCE_HOLD_SECONDS + FADE_SECONDS
  + RAMSONS_HOLD_SECONDS + FADE_SECONDS;

export interface WallTv32Resource {
  place(batch: StaticBatch, x: number, y: number, z: number, ry: number): void;
  animate(now: number): void;
  dispose(): void;
}

function canCreateCanvasTextures(): boolean {
  return typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined';
}

function smoothstep01(value: number): number {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Modelo realista compartido por las siete TVs de pared de 32".
 *
 * Se crea una sola plantilla con materiales y texturas compartidos y se fusiona
 * en el `StaticBatch` en cada colocación. Así no se añaden siete jerarquías de
 * mallas ni se multiplican las draw calls. El mismo material de pantalla anima
 * las siete TVs de forma sincronizada.
 */
function makeWallTv32Resource(
  screens: TvScreenTextures,
  screenMaterial: TvScreenMaterial,
  model: RealisticTvModel,
): WallTv32Resource {
  model.root.updateMatrixWorld(true);
  const localBounds = new THREE.Box3().setFromObject(model.root);
  const screenCenterY = model.screenMesh.position.y;
  const screenHalfHeight = tvSize(MODEL_INCHES).h / 2;

  let disposed = false;
  let lastFrame: number | null = null;
  let elapsed = 0;
  let lastMix = 0;

  return {
    place(batch, x, y, z, ry) {
      const visualY = y + screenHalfHeight - screenCenterY;
      const visualZ = z - PREVIOUS_BACK_HALF_DEPTH - localBounds.min.z;
      batch.mergeObject(model.root, x, visualY, visualZ, ry);
    },
    animate(now) {
      if (disposed) return;

      if (lastFrame === null) lastFrame = now;
      const delta = THREE.MathUtils.clamp((now - lastFrame) / 1000, 0, 0.05);
      lastFrame = now;
      elapsed = (elapsed + delta) % LOOP_SECONDS;

      let mix: number;
      if (elapsed < REFERENCE_HOLD_SECONDS) {
        mix = 0;
      } else if (elapsed < REFERENCE_HOLD_SECONDS + FADE_SECONDS) {
        mix = smoothstep01(
          (elapsed - REFERENCE_HOLD_SECONDS) / FADE_SECONDS,
        );
      } else if (elapsed < REFERENCE_HOLD_SECONDS + FADE_SECONDS + RAMSONS_HOLD_SECONDS) {
        mix = 1;
      } else {
        mix = 1 - smoothstep01(
          (elapsed - REFERENCE_HOLD_SECONDS - FADE_SECONDS - RAMSONS_HOLD_SECONDS)
            / FADE_SECONDS,
        );
      }

      if (Math.abs(mix - lastMix) >= 0.0001) {
        lastMix = mix;
        screenMaterial.setMix(mix);
      }
    },
    dispose() {
      disposed = true;
      lastFrame = null;
      model.dispose();
      screenMaterial.dispose();
      screens.dispose();
    },
  };
}

export function createWallTv32Resource(): WallTv32Resource | null {
  if (!canCreateCanvasTextures()) return null;

  let screens: TvScreenTextures | null = null;
  let screenMaterial: TvScreenMaterial | null = null;
  let model: RealisticTvModel | null = null;

  try {
    screens = createTvScreenTextures(MAX_ANISOTROPY);
    screenMaterial = createTvScreenMaterial(screens);
    screenMaterial.material.name = 'tv-wall-screen-loop';
    screenMaterial.setMix(0);
    model = createRealisticTvModel(screenMaterial.material, { mount: 'wall' });
    return makeWallTv32Resource(screens, screenMaterial, model);
  } catch (error) {
    model?.dispose();
    screenMaterial?.dispose();
    screens?.dispose();
    console.warn('No se pudo crear el modelo realista de TV de pared de 32":', error);
    return null;
  }
}

import * as THREE from 'three';
import {
  createTv55ScreenMaterial,
  type Tv55Asset,
  type Tv55Mount,
  type Tv55ScreenMaterial,
} from '../../../ui/tv/tv55Assets';
import type { StaticBatch } from '../batch';
import { tvSize } from './electronics';

const TV55_INCHES = 55;
const PREVIOUS_BACK_HALF_DEPTH = 0.0225;
const REFERENCE_HOLD_SECONDS = 4;
const RAMSONS_HOLD_SECONDS = 4;
const FADE_SECONDS = 1.15;
const LOOP_SECONDS = REFERENCE_HOLD_SECONDS + FADE_SECONDS
  + RAMSONS_HOLD_SECONDS + FADE_SECONDS;

function smoothstep01(value: number): number {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

export class Tv55Resource {
  private readonly asset: Tv55Asset;
  private readonly screenMaterial!: Tv55ScreenMaterial;
  private readonly wallVariant!: THREE.Group;
  private readonly standVariant!: THREE.Group;
  private readonly wallScreenCenterY!: number;
  private readonly wallMinZ!: number;
  private readonly standMinY!: number;

  private disposed = false;
  private lastFrame: number | null = null;
  private elapsed = 0;
  private lastMix = 0;

  constructor(asset: Tv55Asset) {
    this.asset = asset;
    asset.retain();

    try {
      this.screenMaterial = createTv55ScreenMaterial(asset);
      this.wallVariant = asset.createVariant('wall', this.screenMaterial.material);
      this.standVariant = asset.createVariant('stand', this.screenMaterial.material);
      this.wallScreenCenterY = asset.screenCenterY;
      this.wallMinZ = asset.wallMinZ;
      this.standMinY = asset.standMinY;
    } catch (error) {
      this.screenMaterial?.dispose();
      asset.release();
      throw error;
    }
  }

  place(
    batch: StaticBatch,
    x: number,
    y: number,
    z: number,
    ry: number,
    mount: Tv55Mount,
  ): void {
    if (mount === 'wall') {
      const visualY = y + tvSize(TV55_INCHES).h / 2 - this.wallScreenCenterY;
      const visualZ = z - PREVIOUS_BACK_HALF_DEPTH - this.wallMinZ;
      batch.mergeObject(this.wallVariant, x, visualY, visualZ, ry);
      return;
    }

    const visualY = y - this.standMinY;
    batch.mergeObject(this.standVariant, x, visualY, z, ry);
  }

  animate(now: number): void {
    if (this.disposed) return;

    if (this.lastFrame === null) this.lastFrame = now;
    const delta = THREE.MathUtils.clamp((now - this.lastFrame) / 1000, 0, 0.05);
    this.lastFrame = now;
    this.elapsed = (this.elapsed + delta) % LOOP_SECONDS;

    let mix: number;
    if (this.elapsed < REFERENCE_HOLD_SECONDS) {
      mix = 0;
    } else if (this.elapsed < REFERENCE_HOLD_SECONDS + FADE_SECONDS) {
      mix = smoothstep01((this.elapsed - REFERENCE_HOLD_SECONDS) / FADE_SECONDS);
    } else if (
      this.elapsed < REFERENCE_HOLD_SECONDS + FADE_SECONDS + RAMSONS_HOLD_SECONDS
    ) {
      mix = 1;
    } else {
      mix = 1 - smoothstep01(
        (this.elapsed - REFERENCE_HOLD_SECONDS - FADE_SECONDS - RAMSONS_HOLD_SECONDS)
          / FADE_SECONDS,
      );
    }

    if (Math.abs(mix - this.lastMix) >= 0.0001) {
      this.lastMix = mix;
      this.screenMaterial.setMix(mix);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.lastFrame = null;
    this.screenMaterial.dispose();
    this.wallVariant.clear();
    this.standVariant.clear();
    this.asset.release();
  }
}

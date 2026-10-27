import * as THREE from 'three';
import { createRealisticTvModel, type RealisticTvModel } from './tv/tvModel';
import { createTvScreenMaterial, type TvScreenMaterial } from './tv/screenMaterial';
import { createTvScreenTextures, type TvScreenTextures } from './tv/screenTextures';
import {
  createTv55ScreenMaterial,
  loadTv55Asset,
  type Tv55Asset,
  type Tv55Display,
  type Tv55ScreenMaterial,
} from './tv/tv55Assets';

const MODEL_INCHES = 32;
const REALISTIC_55_INCHES = 55;
const CAMERA_DISTANCE = 1.28;
const SCREEN_REFERENCE_HOLD_SECONDS = 4;
const SCREEN_RAMSONS_HOLD_SECONDS = 4;
const SCREEN_FADE_SECONDS = 1.15;
const SCREEN_LOOP_SECONDS = SCREEN_REFERENCE_HOLD_SECONDS
  + SCREEN_FADE_SECONDS
  + SCREEN_RAMSONS_HOLD_SECONDS
  + SCREEN_FADE_SECONDS;
const TWO_PI = Math.PI * 2;
const ROTATION_RADIANS_PER_SECOND = TWO_PI / 20;
const MANUAL_ROTATION_RADIANS_PER_PIXEL = TWO_PI / 240;
const AUTO_ROTATION_RESUME_DELAY_SECONDS = 1.5;
const AUTO_ROTATION_RESUME_RAMP_SECONDS = 0.6;
const INITIAL_ROTATION = -0.3;
const MAX_ANISOTROPY = 4;

interface Tv55PreviewState {
  asset: Tv55Asset;
  screen: Tv55ScreenMaterial;
  display: Tv55Display;
}

function smoothstep01(value: number): number {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function wrapAngle(angle: number): number {
  return ((angle + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
}

/** 4 s referencia → 1,15 s a RAMSONS → 4 s RAMSONS → 1,15 s de vuelta. */
function screenMixAt(elapsed: number): number {
  const phase = elapsed % SCREEN_LOOP_SECONDS;
  const fadeToRamsons = SCREEN_REFERENCE_HOLD_SECONDS;
  const ramsonsStart = fadeToRamsons + SCREEN_FADE_SECONDS;
  const fadeBack = ramsonsStart + SCREEN_RAMSONS_HOLD_SECONDS;

  if (phase < fadeToRamsons) return 0;
  if (phase < ramsonsStart) {
    return smoothstep01((phase - fadeToRamsons) / SCREEN_FADE_SECONDS);
  }
  if (phase < fadeBack) return 1;
  return 1 - smoothstep01((phase - fadeBack) / SCREEN_FADE_SECONDS);
}

/**
 * Vista 3D ligera para la ficha: usa el modelo realista de 32" en una escena
 * mínima. Solo se crea al abrir la ficha.
 */
export class TvPreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 2, 0.01, 20);
  private readonly turntable = new THREE.Group();
  private readonly screens: TvScreenTextures;
  private readonly screenMaterial: TvScreenMaterial;
  private readonly tv: RealisticTvModel;
  private readonly resizeObserver: ResizeObserver | null;
  private readonly reducedMotion: boolean;

  private tv55: Tv55PreviewState | null = null;
  private tv55Loading = false;
  private tv55Failed = false;
  private disposed = false;
  private inches = MODEL_INCHES;
  private active = false;
  private frame = 0;
  private lastTime = 0;
  private angle = INITIAL_ROTATION;
  private screenElapsed = 0;
  private screenMix = -1;
  private dragging = false;
  private pointerId: number | null = null;
  private lastPointerX = 0;
  private lastInteractionAt = -Infinity;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);

    const anisotropy = Math.min(
      MAX_ANISOTROPY,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    this.screens = createTvScreenTextures(anisotropy);
    this.screenMaterial = createTvScreenMaterial(this.screens);
    this.tv = createRealisticTvModel(this.screenMaterial.material);
    this.turntable.add(this.tv.root);
    this.turntable.rotation.y = this.angle;
    this.scene.add(this.turntable);
    this.canvas.style.touchAction = 'pan-y';

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(2.0, 3.5, 2.5);
    const fill = new THREE.DirectionalLight(0xdbeafe, 0.9);
    fill.position.set(-2.5, 1.8, 1.5);
    const rim = new THREE.DirectionalLight(0xffffff, 1.2);
    rim.position.set(0, 2.8, -3.0);
    this.scene.add(ambient, key, fill, rim);

    this.resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => this.resize());
    this.resizeObserver?.observe(canvas);

    if (this.resizeObserver === null) {
      window.addEventListener('resize', this.resize);
    }

    this.resize();
  }

  setInches(inches: number): void {
    this.inches = Number.isFinite(inches) && inches > 0 ? inches : MODEL_INCHES;
    this.updateModelVisibility();
    this.applyCamera();

    if (this.inches === REALISTIC_55_INCHES) this.ensure55();
    if (!this.active || this.reducedMotion) this.render();
  }

  private applyCamera(): void {
    const using55 = this.inches === REALISTIC_55_INCHES && this.tv55 !== null;
    const scale = using55
      ? 1
      : THREE.MathUtils.clamp(this.inches / MODEL_INCHES, 0.5, 4);
    const framingScale = this.inches === REALISTIC_55_INCHES
      ? REALISTIC_55_INCHES / MODEL_INCHES
      : scale;
    const targetY = using55
      ? this.tv55!.asset.totalHeight * 0.54
      : this.tv.dimensions.totalHeight * 0.54 * scale;

    this.turntable.scale.setScalar(scale);
    this.camera.position.set(
      0,
      targetY + 0.06 * framingScale,
      CAMERA_DISTANCE * framingScale,
    );
    this.camera.lookAt(0, targetY, 0);
    this.camera.near = 0.01;
    this.camera.far = Math.max(12, 12 * framingScale);
    this.camera.updateProjectionMatrix();
  }

  private updateModelVisibility(): void {
    const using55 = this.inches === REALISTIC_55_INCHES && this.tv55 !== null;
    this.tv.root.visible = !using55;
    if (this.tv55) this.tv55.display.root.visible = using55;
  }

  private ensure55(): void {
    if (this.tv55 || this.tv55Loading || this.tv55Failed || this.disposed) return;
    this.tv55Loading = true;

    void loadTv55Asset()
      .then((asset) => {
        if (this.disposed) return;
        asset.retain();

        let screen: Tv55ScreenMaterial | null = null;
        let display: Tv55Display | null = null;
        try {
          screen = createTv55ScreenMaterial(asset);
          display = asset.createDisplay('stand', screen.material);
        } catch (error) {
          display?.dispose();
          screen?.dispose();
          asset.release();
          throw error;
        }

        if (!screen || !display) {
          screen?.dispose();
          asset.release();
          return;
        }

        if (this.disposed) {
          display.dispose();
          screen.dispose();
          asset.release();
          return;
        }

        this.tv55 = { asset, screen, display };
        this.turntable.add(display.root);
        screen.setMix(Math.max(0, this.screenMix));
        this.updateModelVisibility();
        this.applyCamera();
        this.render();
      })
      .catch((error: unknown) => {
        this.tv55Failed = true;
        console.warn('No se pudo preparar la vista 3D de 55"; se usa el fallback:', error);
      })
      .finally(() => {
        this.tv55Loading = false;
      });
  }

  setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;

    if (!active) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.endPointerInteraction();
      this.detachPointerEvents();
      return;
    }

    this.lastInteractionAt = -Infinity;
    this.screenElapsed = 0;
    this.setScreenMix(this.reducedMotion ? 1 : 0);
    this.lastTime = performance.now();
    this.attachPointerEvents();
    this.render();

    if (!this.reducedMotion) {
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  private attachPointerEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('lostpointercapture', this.onLostPointerCapture);
  }

  private detachPointerEvents(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('lostpointercapture', this.onLostPointerCapture);
  }

  private endPointerInteraction(): void {
    const pointerId = this.pointerId;
    this.dragging = false;
    this.pointerId = null;
    this.lastPointerX = 0;
    if (pointerId === null) return;

    this.lastInteractionAt = performance.now();
    try {
      if (this.canvas.hasPointerCapture(pointerId)) {
        this.canvas.releasePointerCapture(pointerId);
      }
    } catch {
      // El navegador pudo liberar la captura antes del pointerup.
    }
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.active || !event.isPrimary || event.button !== 0 || this.dragging) return;

    this.dragging = true;
    this.pointerId = event.pointerId;
    this.lastPointerX = event.clientX;
    this.lastInteractionAt = performance.now();
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Sin captura el arrastre sigue funcionando dentro del canvas.
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.pointerId) return;

    const deltaX = event.clientX - this.lastPointerX;
    this.lastPointerX = event.clientX;
    if (deltaX === 0) return;

    this.angle = wrapAngle(this.angle + deltaX * MANUAL_ROTATION_RADIANS_PER_PIXEL);
    this.turntable.rotation.y = this.angle;
    if (this.reducedMotion) this.render();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.endPointerInteraction();
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.endPointerInteraction();
  };

  private readonly onLostPointerCapture = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.endPointerInteraction();
  };

  private setScreenMix(value: number): void {
    const next = THREE.MathUtils.clamp(value, 0, 1);
    if (Math.abs(next - this.screenMix) < 0.0001) return;
    this.screenMix = next;
    this.screenMaterial.setMix(next);
    this.tv55?.screen.setMix(next);
  }

  private readonly resize = (): void => {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  };

  private readonly tick = (time: number): void => {
    if (!this.active) return;

    const delta = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.screenElapsed = (this.screenElapsed + delta) % SCREEN_LOOP_SECONDS;

    if (!this.dragging) {
      const idleFor = (time - this.lastInteractionAt) / 1000;
      if (idleFor >= AUTO_ROTATION_RESUME_DELAY_SECONDS) {
        const resume = smoothstep01(
          (idleFor - AUTO_ROTATION_RESUME_DELAY_SECONDS) / AUTO_ROTATION_RESUME_RAMP_SECONDS,
        );
        this.angle = wrapAngle(
          this.angle + ROTATION_RADIANS_PER_SECOND * resume * delta,
        );
      }
    }

    this.turntable.rotation.y = this.angle;
    this.setScreenMix(screenMixAt(this.screenElapsed));

    this.render();
    this.frame = requestAnimationFrame(this.tick);
  };

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.active = false;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.endPointerInteraction();
    this.detachPointerEvents();
    this.resizeObserver?.disconnect();
    if (this.resizeObserver === null) {
      window.removeEventListener('resize', this.resize);
    }

    this.scene.remove(this.turntable);

    const tv55 = this.tv55;
    this.tv55 = null;
    tv55?.display.dispose();
    tv55?.screen.dispose();
    tv55?.asset.release();

    this.tv.dispose();
    this.screenMaterial.dispose();
    this.screens.dispose();
    this.renderer.dispose();
  }
}

/** La vista 3D solo se inicializa con un canvas real, nunca en las pruebas DOM. */
export function canUseTvPreview(canvas: HTMLCanvasElement): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    canvas instanceof HTMLCanvasElement
  );
}

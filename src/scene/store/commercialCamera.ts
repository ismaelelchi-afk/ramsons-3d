import * as THREE from 'three';
import { storeFovForAspect } from './storeCamera';

export type CommercialViewId =
  | 'entrada'
  | 'cajas'
  | 'telefonos'
  | 'muebles'
  | 'electro'
  | 'televisores'
  | 'garantias';

export interface CommercialViewPose {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
}

export interface CommercialView extends CommercialViewPose {
  id: CommercialViewId;
  label: string;
  /** FOV vertical base; se adapta al aspecto con la política actual de la tienda. */
  fov: number;
  durationMs: number;
}

export const COMMERCIAL_VIEWS: readonly CommercialView[] = [
  {
    id: 'entrada',
    label: 'Entrada',
    position: [0, 1.65, 24.2],
    target: [0, 2.3, -28],
    fov: 70,
    durationMs: 800,
  },
  {
    id: 'cajas',
    label: 'Caixas',
    position: [1.5, 1.7, 19.5],
    target: [12.3, 1.4, 12.0],
    fov: 70,
    durationMs: 800,
  },
  {
    id: 'telefonos',
    label: 'Telefones',
    position: [2.5, 1.7, 4.0],
    target: [-9.5, 1.35, -2.8],
    fov: 70,
    durationMs: 800,
  },
  {
    id: 'muebles',
    label: 'Móveis',
    position: [0.5, 1.7, 5.5],
    target: [12.6, 1.15, -3.5],
    fov: 70,
    durationMs: 800,
  },
  {
    id: 'electro',
    label: 'Eletro',
    position: [3.5, 1.75, -10.5],
    target: [12.8, 1.55, -25.5],
    fov: 70,
    durationMs: 800,
  },
  {
    id: 'televisores',
    label: 'Televisores',
    position: [-2.5, 1.75, -9.5],
    target: [-12.8, 2.15, -26.0],
    fov: 70,
    durationMs: 800,
  },
  {
    id: 'garantias',
    label: 'Garantias e atendimento',
    position: [-12.5, 1.7, 20.5],
    target: [-12.5, 1.65, 9.4],
    fov: 70,
    durationMs: 800,
  },
] as const;

interface CommercialTransition {
  fromPosition: THREE.Vector3;
  fromQuaternion: THREE.Quaternion;
  fromFov: number;
  toPosition: THREE.Vector3;
  toQuaternion: THREE.Quaternion;
  toFov: number;
  durationMs: number;
  startedAt: number;
}

const UP = new THREE.Vector3(0, 1, 0);

function cloneTriple(value: readonly [number, number, number]): [number, number, number] {
  return [value[0], value[1], value[2]];
}

const easeInOut = (t: number): number => t * t * (3 - 2 * t);

function targetQuaternion(view: CommercialView): THREE.Quaternion {
  const eye = new THREE.Vector3(...view.position);
  const target = new THREE.Vector3(...view.target);
  const matrix = new THREE.Matrix4().lookAt(eye, target, UP);
  return new THREE.Quaternion().setFromRotationMatrix(matrix);
}

function effectiveFov(camera: THREE.PerspectiveCamera, view: CommercialView): number {
  return storeFovForAspect(camera.aspect, view.fov);
}

/**
 * Director de la cámara comercial. Recibe la cámara de la tienda y opera sobre ella,
 * sin crear una segunda cámara ni un bucle propio.
 */
export class CommercialCameraDirector {
  private transition: CommercialTransition | null = null;
  private activeViewId: CommercialViewId;
  private readonly views: CommercialView[];

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    views: readonly CommercialView[] = COMMERCIAL_VIEWS,
  ) {
    this.views = views.map((view) => ({
      ...view,
      position: cloneTriple(view.position),
      target: cloneTriple(view.target),
    }));
    this.activeViewId = (this.views[0] as CommercialView).id;
  }

  getActiveViewId(): CommercialViewId {
    return this.activeViewId;
  }

  getView(id: CommercialViewId): CommercialView | undefined {
    return this.views.find((view) => view.id === id);
  }

  setActiveView(id: CommercialViewId): void {
    if (this.views.some((view) => view.id === id)) {
      this.activeViewId = id;
    }
  }

  setViewPose(id: CommercialViewId, pose: CommercialViewPose): void {
    const view = this.views.find((candidate) => candidate.id === id);
    if (!view) return;

    view.position = cloneTriple(pose.position);
    view.target = cloneTriple(pose.target);

    if (this.transition && this.activeViewId === id) {
      this.transition.toPosition.set(...view.position);
      this.transition.toQuaternion.copy(targetQuaternion(view));
      this.transition.toFov = effectiveFov(this.camera, view);
    }
  }

  /** Aplica una vista de inmediato, sin animación; útil para restaurar el estado inicial. */
  applyViewImmediately(id: CommercialViewId = this.activeViewId): void {
    const view = this.getView(id);
    if (!view) return;

    this.activeViewId = id;
    this.transition = null;
    this.camera.position.set(...view.position);
    this.camera.lookAt(new THREE.Vector3(...view.target));
    this.camera.fov = effectiveFov(this.camera, view);
    this.camera.updateProjectionMatrix();
  }

  isTransitioning(): boolean {
    return this.transition !== null;
  }

  /**
   * Detiene la transición en la pose visible actual, sin mover ni reencuadrar la
   * cámara, para ceder el control a una interacción manual.
   */
  cancelTransition(): void {
    this.transition = null;
  }

  /**
   * Inicia una transición desde la pose visible actual. Si ya había una transición,
   * se reemplaza limpiamente por la nueva sin animaciones duplicadas.
   */
  goTo(id: CommercialViewId): void {
    const view = this.views.find((candidate) => candidate.id === id);
    if (!view) {
      return;
    }

    this.activeViewId = id;
    this.transition = {
      fromPosition: this.camera.position.clone(),
      fromQuaternion: this.camera.quaternion.clone(),
      fromFov: this.camera.fov,
      toPosition: new THREE.Vector3(...view.position),
      toQuaternion: targetQuaternion(view),
      toFov: effectiveFov(this.camera, view),
      durationMs: view.durationMs,
      startedAt: performance.now(),
    };
  }

  /** Vuelve a la última vista comercial seleccionada desde la pose visible actual. */
  returnToLastView(): void {
    this.goTo(this.activeViewId);
  }

  /** Avanza la transición. Devuelve `true` mientras siga habiendo movimiento. */
  update(now = performance.now()): boolean {
    const transition = this.transition;
    if (!transition) {
      return false;
    }

    const elapsed = Math.max(0, now - transition.startedAt);
    const t = Math.min(1, elapsed / transition.durationMs);
    const k = easeInOut(t);

    this.camera.position.lerpVectors(transition.fromPosition, transition.toPosition, k);
    this.camera.quaternion.slerpQuaternions(
      transition.fromQuaternion,
      transition.toQuaternion,
      k,
    );
    this.camera.fov = transition.fromFov + (transition.toFov - transition.fromFov) * k;
    this.camera.updateProjectionMatrix();

    if (t >= 1) {
      this.camera.position.copy(transition.toPosition);
      this.camera.quaternion.copy(transition.toQuaternion);
      this.camera.fov = transition.toFov;
      this.camera.updateProjectionMatrix();
      this.transition = null;
      return false;
    }

    return true;
  }

  /**
   * Reaplica el FOV de la vista activa al cambiar el tamaño de pantalla. Si hay una
   * transición, actualiza solo el destino sin cortar la animación.
   */
  refreshFov(): void {
    const view = this.views.find((candidate) => candidate.id === this.activeViewId);
    if (!view) {
      return;
    }

    const fov = effectiveFov(this.camera, view);
    if (this.transition) {
      this.transition.toFov = fov;
      return;
    }

    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }
}

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface Rotation {
  rx?: number;
  ry?: number;
  rz?: number;
}

export interface PrimitiveBounds {
  /** Etiqueta del departamento / sección que creó la primitiva. */
  label: string;
  box: THREE.Box3;
}

/**
 * Acumula primitivas (cajas, cilindros, esferas) con una pila de transformaciones
 * y, al final, las fusiona en UNA malla por material.
 *
 * Así la escena completa se dibuja con ~60 draw calls en lugar de miles de objetos
 * sueltos, algo importante en un teléfono Android. Las geometrías base (caja,
 * cilindro, esfera) se crean una sola vez y se reutilizan escalándolas.
 *
 * Convenciones: no se usan escalas negativas (rompen el orden de las caras);
 * los ejes de rotación se aplican en orden YXZ.
 */
export class StaticBatch {
  /** Etiqueta asignada a las primitivas siguientes (para verificación de zonas). */
  public label = 'general';
  /** Cajas envolventes por primitiva; solo se rellena si `trackBounds` es true. */
  public readonly bounds: PrimitiveBounds[] | null;
  public primitiveCount = 0;

  private readonly buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private readonly stack: THREE.Matrix4[] = [new THREE.Matrix4()];
  private readonly baseGeometries = new Map<string, THREE.BufferGeometry>();

  private readonly scratchLocal = new THREE.Matrix4();
  private readonly scratchWorld = new THREE.Matrix4();
  private readonly scratchEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly scratchQuat = new THREE.Quaternion();
  private readonly scratchPos = new THREE.Vector3();
  private readonly scratchScale = new THREE.Vector3(1, 1, 1);

  constructor(trackBounds = false) {
    this.bounds = trackBounds ? [] : null;
  }

  // ---------------------------------------------------------------- transformaciones

  private top(): THREE.Matrix4 {
    return this.stack[this.stack.length - 1] as THREE.Matrix4;
  }

  /** Abre un sistema de coordenadas local (posición + rotaciones en radianes). */
  push(x: number, y: number, z: number, ry = 0, rx = 0, rz = 0): void {
    this.scratchEuler.set(rx, ry, rz, 'YXZ');
    this.scratchQuat.setFromEuler(this.scratchEuler);
    this.scratchPos.set(x, y, z);
    this.scratchScale.set(1, 1, 1);
    const local = new THREE.Matrix4().compose(this.scratchPos, this.scratchQuat, this.scratchScale);
    this.stack.push(this.top().clone().multiply(local));
  }

  pop(): void {
    if (this.stack.length <= 1) {
      throw new Error('StaticBatch.pop() sin push() previo.');
    }
    this.stack.pop();
  }

  /** Ejecuta `build` dentro de un sistema de coordenadas local. */
  group(x: number, y: number, z: number, ry: number, build: () => void, rx = 0, rz = 0): void {
    this.push(x, y, z, ry, rx, rz);
    build();
    this.pop();
  }

  /** Matriz mundial de un punto local (útil para objetos que no se fusionan). */
  worldMatrix(x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1): THREE.Matrix4 {
    this.scratchEuler.set(0, ry, 0, 'YXZ');
    this.scratchQuat.setFromEuler(this.scratchEuler);
    this.scratchPos.set(x, y, z);
    this.scratchScale.set(sx, sy, sz);
    const local = new THREE.Matrix4().compose(this.scratchPos, this.scratchQuat, this.scratchScale);
    return new THREE.Matrix4().multiplyMatrices(this.top(), local);
  }

  /** Coloca un objeto "suelto" (no fusionado) respetando la transformación actual. */
  placeObject(object: THREE.Object3D, x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1): void {
    const matrix = this.worldMatrix(x, y, z, ry, sx, sy, sz);
    matrix.decompose(object.position, object.quaternion, object.scale);
    object.updateMatrix();
    object.matrixAutoUpdate = false;
  }

  // ---------------------------------------------------------------- primitivas

  private base(key: string, create: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let geometry = this.baseGeometries.get(key);
    if (!geometry) {
      geometry = create();
      this.baseGeometries.set(key, geometry);
    }
    return geometry;
  }

  private add(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    rotation?: Rotation,
  ): void {
    this.scratchEuler.set(rotation?.rx ?? 0, rotation?.ry ?? 0, rotation?.rz ?? 0, 'YXZ');
    this.scratchQuat.setFromEuler(this.scratchEuler);
    this.scratchPos.set(x, y, z);
    this.scratchScale.set(sx, sy, sz);
    this.scratchLocal.compose(this.scratchPos, this.scratchQuat, this.scratchScale);
    this.scratchWorld.multiplyMatrices(this.top(), this.scratchLocal);

    const instance = geometry.clone();
    instance.applyMatrix4(this.scratchWorld);

    let list = this.buckets.get(material);
    if (!list) {
      list = [];
      this.buckets.set(material, list);
    }
    list.push(instance);
    this.primitiveCount += 1;

    if (this.bounds) {
      instance.computeBoundingBox();
      if (instance.boundingBox) {
        this.bounds.push({ label: this.label, box: instance.boundingBox.clone() });
      }
    }
  }

  /** Caja de tamaño (w, h, d) centrada en (x, y, z). */
  box(
    material: THREE.Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    rotation?: Rotation,
  ): void {
    this.add(this.base('box', () => new THREE.BoxGeometry(1, 1, 1)), material, w, h, d, x, y, z, rotation);
  }

  /**
   * Cilindro / cono truncado con el eje en Y, centrado en (x, y, z).
   * Para un eje en Z usar `{ rx: Math.PI / 2 }`; para un eje en X, `{ rz: Math.PI / 2 }`.
   */
  cyl(
    material: THREE.Material,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    x: number,
    y: number,
    z: number,
    rotation?: Rotation,
    segments = 14,
  ): void {
    const radius = Math.max(radiusTop, radiusBottom);
    if (radius <= 0) {
      return;
    }
    const top = radiusTop / radius;
    const bottom = radiusBottom / radius;
    const key = `cyl:${segments}:${top.toFixed(4)}:${bottom.toFixed(4)}`;
    const geometry = this.base(key, () => new THREE.CylinderGeometry(top, bottom, 1, segments, 1, false));
    this.add(geometry, material, radius, height, radius, x, y, z, rotation);
  }

  /** Elipsoide de semiejes (rx, ry, rz) centrado en (x, y, z). */
  sphere(
    material: THREE.Material,
    rx: number,
    ry: number,
    rz: number,
    x: number,
    y: number,
    z: number,
    rotation?: Rotation,
    widthSegments = 10,
    heightSegments = 8,
  ): void {
    const key = `sphere:${widthSegments}:${heightSegments}`;
    const geometry = this.base(key, () => new THREE.SphereGeometry(1, widthSegments, heightSegments));
    this.add(geometry, material, rx, ry, rz, x, y, z, rotation);
  }

  // ---------------------------------------------------------------- resultado

  /** Fusiona todo por material y devuelve el grupo listo para añadir a la escena. */
  build(name: string): THREE.Group {
    const group = new THREE.Group();
    group.name = name;

    for (const [material, geometries] of this.buckets) {
      const merged = mergeGeometries(geometries, false);
      geometries.forEach((geometry) => geometry.dispose());
      if (!merged) {
        continue;
      }
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = material.name || 'merged';
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
    }

    this.buckets.clear();
    this.baseGeometries.forEach((geometry) => geometry.dispose());
    this.baseGeometries.clear();
    return group;
  }
}

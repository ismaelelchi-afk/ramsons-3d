import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Tv55Mount = 'wall' | 'stand';

export interface Tv55Display {
  root: THREE.Group;
  dispose: () => void;
}

export interface Tv55ScreenMaterial {
  material: THREE.ShaderMaterial;
  setMix: (value: number) => void;
  dispose: () => void;
}

export interface Tv55Asset {
  readonly source: THREE.Group;
  readonly originalTexture: THREE.Texture;
  readonly ramsonsTexture: THREE.Texture;
  readonly screenCenterY: number;
  readonly wallMinZ: number;
  readonly standMinY: number;
  readonly totalHeight: number;
  retain: () => void;
  release: () => void;
  createVariant: (mount: Tv55Mount, screenMaterial: THREE.Material) => THREE.Group;
  createDisplay: (mount: Tv55Mount, screenMaterial: THREE.Material) => Tv55Display;
}

const SCREEN_WIDTH = 2048;
const SCREEN_HEIGHT = 1152;
const SCREEN_ANISOTROPY = 4;

let cachedAsset: Promise<Tv55Asset> | null = null;
let cachedAssetValue: Tv55Asset | null = null;

function vignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength = 0.55,
): void {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, w * 0.72);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function glassGlare(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  alpha = 0.1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.06)');
  gradient.addColorStop(0.32, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.68, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.85, 'rgba(255,255,255,0.05)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawRamsonsScreen(canvas: HTMLCanvasElement): void {
  const w = SCREEN_WIDTH;
  const h = SCREEN_HEIGHT;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el contexto de pantalla RAMSONS de 55".');

  const gradient = ctx.createRadialGradient(w / 2, h * 0.42, 80, w / 2, h * 0.5, w * 0.75);
  gradient.addColorStop(0, '#f20d06');
  gradient.addColorStop(0.45, '#e10600');
  gradient.addColorStop(0.8, '#b30500');
  gradient.addColorStop(1, '#7a0300');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let i = -h; i < w + h; i += 46) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }
  ctx.restore();

  vignette(ctx, w, h, 0.42);

  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 3;
  ctx.strokeRect(46, 46, w - 92, h - 92);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 300px Archivo, Arial, sans-serif';

  const word = 'RAMSONS';
  const tracking = 26;
  const widths = word.split('').map((char) => ctx.measureText(char).width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0)
    + tracking * (word.length - 1);
  let cursorX = w / 2 - totalWidth / 2;
  const centerY = h / 2 - 30;
  word.split('').forEach((char, index) => {
    ctx.fillText(char, cursorX + widths[index] / 2, centerY);
    cursorX += widths[index] + tracking;
  });
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(w / 2 - 220, h / 2 + 148, 440, 4);
  ctx.font = '600 52px Inter, Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText('QLED 55"  ·  4K ULTRA HD', w / 2, h / 2 + 228);

  ctx.font = '500 30px Inter, Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.textAlign = 'left';
  ctx.fillText('RAMSONS · TIENDA OFICIAL', 92, h - 92);
  ctx.textAlign = 'right';
  ctx.fillText('55 PULGADAS · 16:9', w - 92, h - 92);

  glassGlare(ctx, w, h, 0.1);
}

function createRamsonsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  drawRamsonsScreen(canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'tv55-screen-ramsons';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = SCREEN_ANISOTROPY;
  return texture;
}

function normalizeGeometry(root: THREE.Object3D): void {
  const replacements = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.geometry.index) return;
    const existing = replacements.get(object.geometry);
    if (existing) {
      object.geometry = existing;
      return;
    }

    const converted = object.geometry.toNonIndexed();
    if (!converted) throw new Error('No se pudo normalizar la geometría del GLB de 55".');
    replacements.set(object.geometry, converted);
    object.geometry = converted;
  });

  replacements.forEach((_, original) => original.dispose());
}

function findScreen(root: THREE.Object3D): THREE.Mesh {
  const screen = root.getObjectByName('TV_Screen');
  if (!(screen instanceof THREE.Mesh)) {
    throw new Error('El GLB de 55" no contiene la malla TV_Screen.');
  }
  return screen;
}

function findScreenTexture(screen: THREE.Mesh): THREE.Texture {
  const materials = Array.isArray(screen.material) ? screen.material : [screen.material];
  for (const material of materials) {
    if (!(material instanceof THREE.MeshStandardMaterial)) continue;
    const texture = material.map ?? material.emissiveMap;
    if (texture) return texture;
  }
  throw new Error('El GLB de 55" no contiene la textura original de TV_Screen.');
}

function disposeSource(source: THREE.Group, ramsons: THREE.Texture): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of objectMaterials) materials.add(material);
  });

  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) textures.add(value);
    }
  }

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
  ramsons.dispose();
  source.clear();
}

async function loadTv55AssetInternal(): Promise<Tv55Asset> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const url = new URL('../../assets/models/ramsons-tv-55.glb', import.meta.url).href;
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const source = gltf.scene;
  const sourceRoot = source.getObjectByName('TV_Root');

  if (!sourceRoot) {
    throw new Error('El GLB de 55" no contiene el nodo TV_Root.');
  }

  normalizeGeometry(sourceRoot);

  const sourceScreen = findScreen(sourceRoot);
  const originalTexture = findScreenTexture(sourceScreen);
  originalTexture.flipY = false;
  originalTexture.anisotropy = Math.max(originalTexture.anisotropy, SCREEN_ANISOTROPY);
  const ramsonsTexture = createRamsonsTexture();

  const standTemplate = sourceRoot.clone(true) as THREE.Group;
  const wallTemplate = sourceRoot.clone(true) as THREE.Group;
  for (const name of ['TV_Foot_L', 'TV_Foot_R']) {
    const foot = wallTemplate.getObjectByName(name);
    foot?.removeFromParent();
  }

  standTemplate.updateMatrixWorld(true);
  wallTemplate.updateMatrixWorld(true);

  const standScreen = findScreen(standTemplate);
  const screenWorld = standScreen.getWorldPosition(new THREE.Vector3());
  const screenCenterY = standTemplate.worldToLocal(screenWorld).y;

  const standBounds = new THREE.Box3().setFromObject(standTemplate);
  const wallBounds = new THREE.Box3().setFromObject(wallTemplate);
  const totalHeight = standBounds.getSize(new THREE.Vector3()).y;
  const standMinY = standBounds.min.y;
  const wallMinZ = wallBounds.min.z;

  let refCount = 0;
  let released = false;
  let asset!: Tv55Asset;

  const retain = (): void => {
    if (released) throw new Error('El recurso de TV de 55" ya fue liberado.');
    refCount += 1;
  };

  const release = (): void => {
    if (released || refCount === 0) return;
    refCount -= 1;
    if (refCount > 0) return;
    released = true;
    disposeSource(source, ramsonsTexture);
    if (cachedAssetValue === asset) {
      cachedAssetValue = null;
      cachedAsset = null;
    }
  };

  const createVariant = (
    mount: Tv55Mount,
    screenMaterial: THREE.Material,
  ): THREE.Group => {
    const variant = (mount === 'wall' ? wallTemplate : standTemplate).clone(true);
    variant.name = `TV_55_${mount.toUpperCase()}`;
    findScreen(variant).material = screenMaterial;
    variant.updateMatrixWorld(true);
    return variant;
  };

  const createDisplay = (
    mount: Tv55Mount,
    screenMaterial: THREE.Material,
  ): Tv55Display => {
    const variant = createVariant(mount, screenMaterial);
    const root = new THREE.Group();
    root.name = 'TV_55_DISPLAY';
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    let screenGeometry: THREE.BufferGeometry | null = null;

    variant.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const geometry = object.geometry.clone();
      geometry.applyMatrix4(object.matrixWorld);

      if (object.name === 'TV_Screen') {
        screenGeometry = geometry;
        return;
      }

      if (Array.isArray(object.material)) {
        geometry.dispose();
        return;
      }

      const list = buckets.get(object.material) ?? [];
      list.push(geometry);
      buckets.set(object.material, list);
    });

    for (const [material, geometries] of buckets) {
      const merged = mergeGeometries(geometries, false);
      if (merged) {
        geometries.forEach((geometry) => geometry.dispose());
        root.add(new THREE.Mesh(merged, material));
      } else {
        geometries.forEach((geometry) => root.add(new THREE.Mesh(geometry, material)));
      }
    }

    if (!screenGeometry) {
      throw new Error('No se pudo preparar la pantalla del modelo de 55".');
    }
    root.add(new THREE.Mesh(screenGeometry, screenMaterial));
    root.updateMatrixWorld(true);

    return {
      root,
      dispose: () => {
        root.traverse((object) => {
          if (object instanceof THREE.Mesh) object.geometry.dispose();
        });
        root.clear();
      },
    };
  };

  asset = {
    source,
    originalTexture,
    ramsonsTexture,
    screenCenterY,
    wallMinZ,
    standMinY,
    totalHeight,
    retain,
    release,
    createVariant,
    createDisplay,
  };

  return asset;
}

export function loadTv55Asset(): Promise<Tv55Asset> {
  if (cachedAsset) return cachedAsset;

  const promise = loadTv55AssetInternal();
  cachedAsset = promise;
  promise
    .then((asset) => {
      if (cachedAsset === promise) cachedAssetValue = asset;
    })
    .catch(() => {
      if (cachedAsset === promise) {
        cachedAsset = null;
        cachedAssetValue = null;
      }
    });
  return promise;
}

export function createTv55ScreenMaterial(asset: Tv55Asset): Tv55ScreenMaterial {
  const material = new THREE.ShaderMaterial({
    name: 'tv55-screen-mix',
    uniforms: {
      uOriginalMap: { value: asset.originalTexture },
      uRamsonsMap: { value: asset.ramsonsTexture },
      uMix: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uOriginalMap;
      uniform sampler2D uRamsonsMap;
      uniform float uMix;
      varying vec2 vUv;

      void main() {
        vec4 original = texture2D(uOriginalMap, vUv);
        vec4 ramsons = texture2D(uRamsonsMap, vUv);
        gl_FragColor = mix(original, ramsons, clamp(uMix, 0.0, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.toneMapped = true;

  return {
    material,
    setMix: (value) => {
      material.uniforms.uMix.value = THREE.MathUtils.clamp(value, 0, 1);
    },
    dispose: () => material.dispose(),
  };
}

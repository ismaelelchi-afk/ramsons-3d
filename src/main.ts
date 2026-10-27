import * as THREE from 'three';
import { Camera } from './core/camera';
import { Renderer } from './core/renderer';
import { createControls } from './core/controls';
import { getTvSpec } from './data/tvSpecs';
import { StoreScene } from './scene/store/storeScene';
import { applyStoreCamera, updateStoreFov } from './scene/store/storeCamera';
import { createTvCard } from './ui/tvCard';
import { loadTv55Asset, type Tv55Asset } from './ui/tv/tv55Assets';

const canvas = document.getElementById('scene') as HTMLCanvasElement;

const camera = new Camera();
const renderer = new Renderer(canvas);

void runStore();

async function runStore(): Promise<void> {
  let tv55Asset: Tv55Asset | null = null;
  try {
    tv55Asset = await loadTv55Asset();
  } catch (error) {
    console.warn('No se pudo cargar el modelo de TV de 55"; se usa el fallback:', error);
  }

  let store: StoreScene;
  try {
    store = new StoreScene({ tv55Asset });
  } catch (error) {
    console.error('No se pudo construir la tienda 3D:', error);
    showError('No se pudo construir la tienda 3D. Revisa la consola del navegador.');
    return;
  }

  applyStoreCamera(camera.camera);
  renderer.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function pickTvAt(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera.camera);
    const specId = store.pickTv(raycaster.ray);
    return specId ? getTvSpec(specId) ?? null : null;
  }

  const tvCard = createTvCard({ onSceneTap: pickTvAt });

  function onTap(clientX: number, clientY: number): void {
    const spec = pickTvAt(clientX, clientY);
    if (spec) tvCard.open(spec);
  }

  const controls = createControls(camera.camera, renderer.renderer, {
    isBlocked: () => tvCard.isOpen(),
    onTap,
  });

  let lastTime = performance.now();

  function animate(currentTime: number): void {
    requestAnimationFrame(animate);

    const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    controls.update(delta);
    store.animate(currentTime);

    renderer.renderer.render(store.scene, camera.camera);
  }

  function onResize(): void {
    camera.resize();
    updateStoreFov(camera.camera);
    renderer.resize();
  }

  window.addEventListener('resize', onResize);
  canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());
  canvas.addEventListener('webglcontextrestored', () => {
    renderer.renderer.render(store.scene, camera.camera);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      renderer.renderer.render(store.scene, camera.camera);
    }
  });

  animate(performance.now());
}

function showError(message: string): void {
  const box = document.createElement('div');
  box.className = 'scene-error';
  box.textContent = message;
  document.body.appendChild(box);
}
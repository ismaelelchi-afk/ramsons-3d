import { Camera } from './core/camera';
import { Renderer } from './core/renderer';
import { createControls } from './core/controls';
import { StoreScene } from './scene/store/storeScene';
import { applyStoreCamera, updateStoreFov } from './scene/store/storeCamera';

const canvas = document.getElementById('scene') as HTMLCanvasElement;

const camera = new Camera();
const renderer = new Renderer(canvas);

runStore();

function runStore(): void {
  let store: StoreScene;
  try {
    store = new StoreScene();
  } catch (error) {
    console.error('No se pudo construir la tienda 3D:', error);
    showError('No se pudo construir la tienda 3D. Revisa la consola del navegador.');
    return;
  }

  applyStoreCamera(camera.camera);
  renderer.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const controls = createControls(camera.camera, renderer.renderer);

  let lastTime = performance.now();

  function animate(currentTime: number): void {
    requestAnimationFrame(animate);

    const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    controls.update(delta);

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
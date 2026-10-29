import * as THREE from 'three';
import { Camera } from './core/camera';
import { Renderer } from './core/renderer';
import { createControls } from './core/controls';
import { getTvSpec } from './data/tvSpecs';
import {
  COMMERCIAL_VIEWS,
  CommercialCameraDirector,
  type CommercialViewId,
} from './scene/store/commercialCamera';
import { CommercialViewPreferences } from './scene/store/commercialViewPreferences';
import { StoreScene } from './scene/store/storeScene';
import { applyStoreCamera, updateStoreFov } from './scene/store/storeCamera';
import { createBrandTripleTap } from './ui/brandTripleTap';
import { createCommercialViewEditor } from './ui/commercialViewEditor';
import { createTvCard } from './ui/tvCard';
import { loadTv55Asset, type Tv55Asset } from './ui/tv/tv55Assets';

const canvas = document.getElementById('scene') as HTMLCanvasElement;

const camera = new Camera();
const renderer = new Renderer(canvas);

type CameraMode = 'commercial' | 'free' | 'returning';

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

  camera.camera.rotation.order = 'YXZ';
  applyStoreCamera(camera.camera);
  renderer.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const viewPreferences = new CommercialViewPreferences();
  const director = new CommercialCameraDirector(camera.camera);
  for (const view of COMMERCIAL_VIEWS) {
    const pose = viewPreferences.get(view.id);
    if (pose) director.setViewPose(view.id, pose);
  }
  director.applyViewImmediately(director.getActiveViewId());

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
  let mode: CameraMode = 'commercial';

  function onTap(clientX: number, clientY: number): void {
    const spec = pickTvAt(clientX, clientY);
    if (spec) tvCard.open(spec);
  }

  const controls = createControls(camera.camera, renderer.renderer, {
    isBlocked: () => tvCard.isOpen(),
    isCommercialLookBlocked: () => director.isTransitioning(),
    onTap,
  });
  controls.setEnabled(false);
  controls.setCommercialLookEnabled(true);

  const freeExit = document.getElementById('free-camera-exit') as HTMLButtonElement;
  const monogram = document.getElementById('brand-monogram');
  const commercialNav = document.getElementById('commercial-nav');
  const commercialButtons = new Map<CommercialViewId, HTMLButtonElement>();

  const viewEditor = createCommercialViewEditor({
    camera: camera.camera,
    isCustomized: (id) => viewPreferences.has(id),
    onSelectView: (id) => {
      director.setActiveView(id);
      updateActiveCommercialButton();
    },
    onSavePose: (id, pose) => {
      if (!viewPreferences.save(id, pose)) return false;
      director.setViewPose(id, pose);
      director.setActiveView(id);
      updateActiveCommercialButton();
      return true;
    },
    onRestorePose: (id) => {
      const original = COMMERCIAL_VIEWS.find((view) => view.id === id);
      if (!original) return { ok: false };
      if (viewPreferences.has(id) && !viewPreferences.remove(id)) {
        return { ok: false };
      }

      const pose = {
        position: original.position,
        target: original.target,
      };
      director.setViewPose(id, pose);
      director.setActiveView(id);
      updateActiveCommercialButton();
      return { ok: true, pose };
    },
    onCameraChanged: () => controls.syncFromCamera(),
  });

  let lastTime = performance.now();

  function syncCameraUi(): void {
    const free = mode === 'free';
    const commercial = mode === 'commercial';
    document.body.classList.toggle('free-camera-mode', free);
    freeExit.hidden = !free;
    if (commercialNav) {
      commercialNav.hidden = !commercial;
    }
    commercialButtons.forEach((button) => {
      button.disabled = !commercial;
    });
  }

  function updateActiveCommercialButton(): void {
    const activeId = director.getActiveViewId();
    commercialButtons.forEach((button, id) => {
      const active = id === activeId;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function selectCommercialView(id: CommercialViewId): void {
    if (mode !== 'commercial') return;

    controls.cancelCommercialLook();
    director.goTo(id);
    updateActiveCommercialButton();
  }

  function buildCommercialNav(): void {
    if (!commercialNav) return;

    for (const view of COMMERCIAL_VIEWS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'commercial-nav-button';
      button.textContent = view.label;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => selectCommercialView(view.id));
      commercialNav.append(button);
      commercialButtons.set(view.id, button);
    }

    updateActiveCommercialButton();
  }

  function canEnterFreeMode(): boolean {
    return (
      mode === 'commercial' &&
      !director.isTransitioning() &&
      !tvCard.isOpen() &&
      !document.hidden
    );
  }

  function enterFreeMode(): void {
    if (!canEnterFreeMode()) return;

    mode = 'free';
    controls.setCommercialLookEnabled(false);
    controls.setEnabled(true);

    const activeViewId = director.getActiveViewId();
    const activeView = director.getView(activeViewId);
    const targetDistance = activeView
      ? Math.hypot(
          activeView.target[0] - activeView.position[0],
          activeView.target[1] - activeView.position[1],
          activeView.target[2] - activeView.position[2],
        )
      : undefined;
    viewEditor.show(activeViewId, targetDistance);

    syncCameraUi();
    lastTime = performance.now();
  }

  function exitFreeMode(): void {
    if (mode !== 'free') return;

    mode = 'returning';
    viewEditor.hide();
    controls.setEnabled(false);
    syncCameraUi();
    director.returnToLastView();
    lastTime = performance.now();
  }

  freeExit.addEventListener('click', (event) => {
    event.preventDefault();
    exitFreeMode();
  });

  if (monogram) {
    createBrandTripleTap({
      target: monogram,
      canActivate: canEnterFreeMode,
      onActivate: enterFreeMode,
    });
  }

  buildCommercialNav();
  syncCameraUi();

  function animate(currentTime: number): void {
    requestAnimationFrame(animate);

    const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    if (mode === 'free') {
      controls.update(delta);
      viewEditor.update();
    } else {
      director.update(currentTime);
      if (mode === 'commercial' && !director.isTransitioning()) {
        controls.updateCommercialLook(delta);
      }
      if (mode === 'returning' && !director.isTransitioning()) {
        mode = 'commercial';
        controls.setCommercialLookEnabled(true);
        syncCameraUi();
      }
    }

    store.animate(currentTime);

    renderer.renderer.render(store.scene, camera.camera);
  }

  function onResize(): void {
    camera.resize();
    if (mode === 'free') {
      updateStoreFov(camera.camera);
    } else {
      director.refreshFov();
    }
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

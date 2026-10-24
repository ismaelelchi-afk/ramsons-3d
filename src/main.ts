import { Camera } from './core/camera';
import { Renderer } from './core/renderer';
import { TestScene } from './scene/testScene';

const canvas = document.getElementById('scene') as HTMLCanvasElement;

const camera = new Camera();
const renderer = new Renderer(canvas);
const testScene = new TestScene();

function animate() {
  requestAnimationFrame(animate);
  testScene.animate();
  renderer.renderer.render(testScene.scene, camera.camera);
}

function onResize() {
  camera.resize();
  renderer.resize();
}

window.addEventListener('resize', onResize);
animate();

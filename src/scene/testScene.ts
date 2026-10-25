import * as THREE from 'three';

export class TestScene {
  public readonly scene = new THREE.Scene();

  private readonly mesh: THREE.Mesh;
  private readonly rotationSpeed = 0.01;

  constructor() {
    this.scene.background = new THREE.Color(0x222222);

    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0xdd2638,
      roughness: 0.5,
      metalness: 0.1,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);

    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(5, 10, 7);
    this.scene.add(light);

    const ambient = new THREE.AmbientLight(0x404040, 2);
    this.scene.add(ambient);
  }

  animate(): void {
    this.mesh.rotation.x += this.rotationSpeed;
    this.mesh.rotation.y += this.rotationSpeed * 0.7;
  }
}
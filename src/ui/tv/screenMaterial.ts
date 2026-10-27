import * as THREE from 'three';
import type { TvScreenTextures } from './screenTextures';

export interface TvScreenMaterial {
  material: THREE.ShaderMaterial;
  setMix: (value: number) => void;
  dispose: () => void;
}

export function createTvScreenMaterial(screens: TvScreenTextures): TvScreenMaterial {
  const material = new THREE.ShaderMaterial({
    name: 'tv-screen-mix',
    uniforms: {
      uReferenceMap: { value: screens.reference },
      uRamsonsMap: { value: screens.ramsons },
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
      uniform sampler2D uReferenceMap;
      uniform sampler2D uRamsonsMap;
      uniform float uMix;
      varying vec2 vUv;

      void main() {
        vec4 reference = texture2D(uReferenceMap, vUv);
        vec4 ramsons = texture2D(uRamsonsMap, vUv);
        gl_FragColor = mix(reference, ramsons, clamp(uMix, 0.0, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.toneMapped = true;

  return {
    material,
    setMix: (value: number) => {
      material.uniforms.uMix.value = THREE.MathUtils.clamp(value, 0, 1);
    },
    dispose: () => material.dispose(),
  };
}

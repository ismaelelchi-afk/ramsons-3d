import * as THREE from 'three';
import { COLORS, STORE } from './constants';
import { createFloorTileTexture, createScreenTexture } from './textures';

/**
 * Biblioteca única de materiales compartidos. Los materiales se crean una sola
 * vez y se reutilizan en toda la escena (el batch estático fusiona por material).
 */
export function createMaterials() {
  const lambert = (color: number, name: string): THREE.MeshLambertMaterial => {
    const material = new THREE.MeshLambertMaterial({ color });
    material.name = name;
    return material;
  };
  /** Lambert con un pequeño aporte emisivo: levanta paredes y techo sin añadir luces. */
  const lambertLifted = (color: number, emissive: number, name: string): THREE.MeshLambertMaterial => {
    const material = new THREE.MeshLambertMaterial({ color, emissive });
    material.name = name;
    return material;
  };
  const standard = (color: number, name: string, roughness = 0.6, metalness = 0): THREE.MeshStandardMaterial => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    material.name = name;
    return material;
  };
  const basic = (color: number, name: string): THREE.MeshBasicMaterial => {
    const material = new THREE.MeshBasicMaterial({ color });
    material.name = name;
    return material;
  };
  const lambertOverlay = (color: number, name: string): THREE.MeshLambertMaterial => {
    const material = lambert(color, name);
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -2;
    return material;
  };

  const floorMap = createFloorTileTexture(
    (STORE.halfW * 2) / STORE.tileSize,
    (STORE.halfD * 2) / STORE.tileSize,
  );
  const floor = new THREE.MeshStandardMaterial({
    map: floorMap,
    roughness: 0.42,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 2,
  });
  floor.name = 'floor';

  const screenDemo = [
    createScreenTexture(['#0b3d91', '#1fa2ff', '#12d8fa']),
    createScreenTexture(['#5b0e91', '#d4145a', '#fbb034']),
    createScreenTexture(['#04373b', '#0fa958', '#d4f26b']),
    createScreenTexture(['#0f2027', '#2c5364', '#8ec5fc']),
  ].map((texture, index) => {
    const material = new THREE.MeshBasicMaterial({ map: texture });
    material.name = `screenDemo${index}`;
    return material;
  });

  const glass = new THREE.MeshStandardMaterial({
    color: 0xa8d4ea,
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  glass.name = 'glass';

  const jarGlass = new THREE.MeshStandardMaterial({
    color: 0xdbe9f2,
    roughness: 0.08,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  jarGlass.name = 'jarGlass';

  return {
    // --- Arquitectura ---
    floor,
    wall: lambertLifted(COLORS.white, 0x3c3c3c, 'wall'),
    wallShade: lambert(COLORS.offWhite, 'wallShade'),
    graphite: lambert(COLORS.graphite, 'graphite'),
    graphiteSoft: lambert(COLORS.graphiteSoft, 'graphiteSoft'),
    red: standard(COLORS.red, 'red', 0.5),
    redDeep: standard(COLORS.redDeep, 'redDeep', 0.5),
    redGlow: basic(COLORS.red, 'redGlow'),
    ceiling: lambertLifted(COLORS.ceiling, 0x5a5f65, 'ceiling'),
    lightPanel: basic(0xffffff, 'lightPanel'),
    rubber: lambert(0x1d1f23, 'rubber'),
    glass,
    floorCarpet: lambert(0x5d636b, 'floorCarpet'),
    floorCool: lambert(0xdbdfe4, 'floorCool'),
    floorWood: standard(0xbf9d78, 'floorWood', 0.5),
    whiteGloss: standard(0xf8f8f6, 'whiteGloss', 0.35),

    // --- Electrónica ---
    plastic: standard(0x15171a, 'plastic', 0.5),
    plasticSoft: standard(0x272a30, 'plasticSoft', 0.55),
    keyTop: standard(0x3b4048, 'keyTop', 0.6),
    screenOff: standard(0x07090c, 'screenOff', 0.08, 0.25),
    screenDemo,
    silver: standard(0xc4c8ce, 'silver', 0.35, 0.5),
    silverDark: standard(0x8c9199, 'silverDark', 0.4, 0.5),
    chrome: standard(0xe3e6e9, 'chrome', 0.2, 0.7),
    ledBlue: basic(0x56b6ff, 'ledBlue'),
    phoneBlack: standard(0x1a1c20, 'phoneBlack', 0.35, 0.3),
    phoneSilver: standard(0xcdd1d6, 'phoneSilver', 0.3, 0.5),
    phoneNavy: standard(0x1f3550, 'phoneNavy', 0.35, 0.3),

    // --- Electrodomésticos ---
    applianceWhite: standard(0xf6f6f4, 'applianceWhite', 0.35),
    applianceBlack: standard(0x1d1f23, 'applianceBlack', 0.4),
    inox: standard(0xb9bec4, 'inox', 0.4, 0.55),
    glassDark: standard(0x142230, 'glassDark', 0.1, 0.2),
    jarGlass,

    // --- Muebles y textiles ---
    woodLight: standard(0xcfa774, 'woodLight', 0.6),
    woodDark: standard(0x6e4a31, 'woodDark', 0.6),
    sofaGray: lambert(0x8d949d, 'sofaGray'),
    sofaBeige: lambert(0xd3c3a6, 'sofaBeige'),
    sofaGraphite: lambert(0x3d4148, 'sofaGraphite'),
    pillow: lambert(0xf2f0ea, 'pillow'),
    blanketGray: lambert(0x9aa2ac, 'blanketGray'),
    blanketBeige: lambert(0xe0d4bf, 'blanketBeige'),
    blanketCharcoal: lambert(0x4f545c, 'blanketCharcoal'),
    rugGray: lambertOverlay(0xc9ccd0, 'rugGray'),
    rugRed: lambertOverlay(0xc92b3a, 'rugRed'),
    mattressWhite: lambert(0xf4f2ec, 'mattressWhite'),
    mattressGray: lambert(0xd5d8dc, 'mattressGray'),
    mattressCream: lambert(0xeadfc8, 'mattressCream'),
    mattressBlue: lambert(0xb9c6d3, 'mattressBlue'),
    mattressBase: lambert(0x4a4e55, 'mattressBase'),

    // --- Cajas, decoración y rótulos ---
    cardboard: lambert(0xc8a878, 'cardboard'),
    boxWhite: lambert(0xf1f1ef, 'boxWhite'),
    boxGray: lambert(0xbfc3c8, 'boxGray'),
    boxGraphite: lambert(0x3a3e45, 'boxGraphite'),
    leaf: lambert(0x3d8a4e, 'leaf'),
    leafDark: lambert(0x2f6e3d, 'leafDark'),
    pot: standard(0xf2f2f0, 'pot', 0.5),
    soil: lambert(0x3b2a20, 'soil'),
    lampShade: basic(0xffe9b8, 'lampShade'),
    tagWhite: lambert(0xffffff, 'tagWhite'),
  };
}

export type Materials = ReturnType<typeof createMaterials>;

/** Libera materiales y texturas asociadas. */
export function disposeMaterials(materials: Materials): void {
  const seen = new Set<THREE.Material>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value instanceof THREE.Material && !seen.has(value)) {
      seen.add(value);
      const map = (value as THREE.MeshBasicMaterial).map;
      if (map) {
        map.dispose();
      }
      value.dispose();
    }
  };
  Object.values(materials).forEach(visit);
}

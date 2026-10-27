/**
 * Modelo procedural de un televisor realista de 32 pulgadas.
 * Basado en el modelo auditado de realistic-tv, sin exportación GLB.
 */
import * as THREE from 'three';

export type RealisticTvMount = 'stand' | 'wall';

export interface RealisticTvModelOptions {
  /** `stand` incluye las patas de sobremesa; `wall` deja solo el panel colgado. */
  mount?: RealisticTvMount;
}

export interface RealisticTvModel {
  root: THREE.Group;
  screenMesh: THREE.Mesh;
  dimensions: {
    width: number;
    height: number;
    depth: number;
    screenDiagonalInches: number;
    standClearance: number;
    totalHeight: number;
  };
  dispose: () => void;
}

/**
 * Creates procedural high-detail textures for realism
 */
function createPlasticNoiseTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Subtle stippling noise for injection-molded TV plastic
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    const val = Math.max(0, Math.min(255, 128 + noise));
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

function createRearVentTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1c1d20';
  ctx.fillRect(0, 0, 1024, 512);

  // Louver slats / vent slots
  ctx.fillStyle = '#0a0b0d';
  const startY = 80;
  const slatH = 6;
  const gapY = 12;
  const numRows = 16;
  const numCols = 4;
  const colW = 200;
  const gapX = 35;
  const startX = (1024 - (numCols * colW + (numCols - 1) * gapX)) / 2;

  for (let c = 0; c < numCols; c++) {
    const cx = startX + c * (colW + gapX);
    for (let r = 0; r < numRows; r++) {
      const cy = startY + r * (slatH + gapY);
      ctx.beginPath();
      ctx.roundRect(cx, cy, colW, slatH, 3);
      ctx.fill();
    }
  }

  // Embossed SAMSUNG logo on upper rear
  ctx.fillStyle = '#2a2b2f';
  ctx.font = '900 52px "Montserrat", sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '8px';
  ctx.fillText('SAMSUNG', 512, 420);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createProductLabelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Silver/gray label background
  ctx.fillStyle = '#d4d8de';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 244);

  // Black header badge
  ctx.fillStyle = '#111';
  ctx.fillRect(10, 10, 492, 40);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 20px "Segoe UI", sans-serif';
  ctx.fillText('SMART LED TV 32"  /  MODEL: T4300-32', 20, 36);

  // Spec lines
  ctx.fillStyle = '#111';
  ctx.font = '13px "Segoe UI", monospace';
  ctx.fillText('AC 100-240V ~ 50/60Hz  •  POWER: 60W', 20, 75);
  ctx.fillText('FCC ID: A3LSMART32T  •  CAN ICES-3(B)/NMB-3(B)', 20, 95);
  ctx.fillText('MANUFACTURED: FEB 2024  •  MADE IN VIETNAM', 20, 115);
  ctx.fillText('CAUTION: RISK OF ELECTRIC SHOCK - DO NOT OPEN', 20, 135);

  // Barcode
  const barX = 20;
  const barY = 150;
  const barH = 50;
  ctx.fillStyle = '#000';
  for (let x = 0; x < 280; x += 4) {
    const isBar = Math.random() > 0.35;
    if (isBar) {
      const bW = Math.random() > 0.6 ? 3 : 2;
      ctx.fillRect(barX + x, barY, bW, barH);
    }
  }
  ctx.font = '12px monospace';
  ctx.fillText('*S/N: 089A4ZKL320984X*', barX + 30, barY + 68);

  // CE & Recycle icons
  ctx.font = 'bold 32px serif';
  ctx.fillText('CE', 410, 185);
  ctx.font = '14px sans-serif';
  ctx.fillText('RoHS', 410, 215);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createPortBayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark recessed metal/plastic plate
  ctx.fillStyle = '#18191c';
  ctx.fillRect(0, 0, 256, 512);

  // Port drawings with white labeling
  const drawPort = (y: number, label: string, color: string, w = 110, h = 32) => {
    const x = (256 - w) / 2;
    // Port border
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3a3a42';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Inner connector pin cavity
    ctx.fillStyle = color;
    ctx.fillRect(x + 12, y + 8, w - 24, h - 16);

    // Label
    ctx.fillStyle = '#a0a5af';
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 128, y - 8);
  };

  // HDMI 1 (STB/DVI)
  drawPort(45, 'HDMI 1 (STB)', '#2b2b2b');

  // HDMI 2 (ARC)
  drawPort(115, 'HDMI 2 (eARC)', '#2b2b2b');

  // USB 2.0 (5V 0.5A)
  drawPort(185, 'USB (5V 0.5A)', '#0a438b', 90, 26);

  // Digital Audio (Optical)
  drawPort(255, 'DIGITAL AUDIO OUT', '#ff0033', 50, 40);

  // LAN RJ-45
  drawPort(335, 'ETHERNET (LAN)', '#1e1e1e', 80, 42);

  // Antenna 75Ω coaxial connector
  ctx.fillStyle = '#a0a5af';
  ctx.font = 'bold 15px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ANT / CABLE IN', 128, 415);
  // Circular connector
  ctx.beginPath();
  ctx.arc(128, 455, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#b0b5be';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(128, 455, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#18191c';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(128, 455, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#d4af37'; // gold pin
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Patas de sobremesa del televisor. No se construyen en la variante de pared.
 */
function createStandAssembly(
  standClearance: number,
  standMaterial: THREE.Material,
  rubberPadMaterial: THREE.Material,
): THREE.Group {
  // Dual angled legs mounted at x = -0.27m and x = +0.27m.
  // Each leg extends forward (~0.075m) and rearward (~0.055m).
  const standsGroup = new THREE.Group();
  standsGroup.name = 'tv_stand_assembly';

  const createStandLeg = (isRight: boolean): THREE.Group => {
    const legGroup = new THREE.Group();
    const sign = isRight ? 1 : -1;
    legGroup.name = isRight ? 'tv_stand_leg_right' : 'tv_stand_leg_left';

    const legX = sign * 0.275;
    legGroup.position.set(legX, 0, 0);
    legGroup.rotation.y = sign * -0.06;

    // 1. Vertical Mounting Stalk (attaching up into bottom bezel)
    const stalkH = standClearance + 0.006;
    const stalkGeo = new THREE.BoxGeometry(0.018, stalkH, 0.026);
    const stalkMesh = new THREE.Mesh(stalkGeo, standMaterial);
    stalkMesh.position.set(0, stalkH / 2, 0);
    stalkMesh.castShadow = true;
    legGroup.add(stalkMesh);

    // 2. Horizontal ground foot (boomerang / angled bar)
    const toeLength = 0.082;

    // Front arm (box extending forward with chamfer)
    const frontArmGeo = new THREE.BoxGeometry(0.018, 0.016, toeLength);
    const frontArm = new THREE.Mesh(frontArmGeo, standMaterial);
    frontArm.position.set(0, 0.008, toeLength / 2);
    frontArm.rotation.x = -0.04;
    frontArm.castShadow = true;
    legGroup.add(frontArm);

    // Front angled tip
    const frontTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.009, 0.018, 12),
      standMaterial
    );
    frontTip.rotation.z = Math.PI / 2;
    frontTip.position.set(0, 0.008, toeLength);
    legGroup.add(frontTip);

    // Rear heel extension
    const heelLength = 0.062;
    const rearArmGeo = new THREE.BoxGeometry(0.018, 0.016, heelLength);
    const rearArm = new THREE.Mesh(rearArmGeo, standMaterial);
    rearArm.position.set(0, 0.008, -heelLength / 2);
    rearArm.rotation.x = 0.04;
    rearArm.castShadow = true;
    legGroup.add(rearArm);

    // Rear rounded tip
    const rearTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.009, 0.018, 12),
      standMaterial
    );
    rearTip.rotation.z = Math.PI / 2;
    rearTip.position.set(0, 0.008, -heelLength);
    legGroup.add(rearTip);

    // Center transition knuckle joining stalk to foot
    const knuckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.024, 0.04),
      standMaterial
    );
    knuckle.position.set(0, 0.014, 0);
    knuckle.castShadow = true;
    legGroup.add(knuckle);

    // 3. Anti-slip Rubber Feet (2 pads per leg, sitting exactly at Y = 0.0008)
    const padFront = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.002, 0.024),
      rubberPadMaterial
    );
    padFront.position.set(0, 0.001, toeLength * 0.75);
    legGroup.add(padFront);

    const padRear = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.002, 0.024),
      rubberPadMaterial
    );
    padRear.position.set(0, 0.001, -heelLength * 0.75);
    legGroup.add(padRear);

    return legGroup;
  };

  standsGroup.add(createStandLeg(false));
  standsGroup.add(createStandLeg(true));
  return standsGroup;
}

/**
 * Construye el modelo con el material de pantalla indicado.
 */
export function createRealisticTvModel(
  screenMaterial: THREE.Material,
  options: RealisticTvModelOptions = {},
): RealisticTvModel {
  const root = new THREE.Group();
  root.name = 'TV_32_INCH_RAMSONS_SAMSUNG';
  const mount = options.mount ?? 'stand';
  const hasStand = mount === 'stand';

  // Real world dimensions (meters)
  // 32-inch 16:9 diagonal = 0.8128 m (32 * 0.0254)
  const screenWidth = 0.7084;
  const screenHeight = 0.3985;
  const bezelTop = 0.014;
  const bezelBottom = 0.018;
  const bezelSides = 0.013;

  const totalWidth = screenWidth + bezelSides * 2; // ~0.7344 m (73.4 cm)
  const totalBodyHeight = screenHeight + bezelTop + bezelBottom; // ~0.4305 m (43.0 cm)
  const standClearance = hasStand ? 0.038 : 0; // 3.8 cm elevation from table
  const totalHeightWithStand = totalBodyHeight + standClearance; // ~0.4685 m (46.8 cm)

  const bodyDepthTop = 0.022; // Upper thin frame depth
  const bodyDepthBump = 0.074; // Lower electronics bump depth

  // Center elevations
  const screenCenterY = standClearance + bezelBottom + screenHeight / 2;

  // Common PBR Materials
  const bumpNoise = createPlasticNoiseTexture();

  // Dark matte bezel plastic (matching photos)
  const bezelMaterial = new THREE.MeshStandardMaterial({
    color: 0x161719,
    roughness: 0.58,
    metalness: 0.12,
    bumpMap: bumpNoise,
    bumpScale: 0.0004,
  });

  // Rear housing materials
  const rearMaterial = new THREE.MeshStandardMaterial({
    color: 0x1d1e21,
    roughness: 0.75,
    metalness: 0.08,
    bumpMap: bumpNoise,
    bumpScale: 0.0006,
  });

  const ventTexture = createRearVentTexture();
  const rearVentMaterial = new THREE.MeshStandardMaterial({
    map: ventTexture,
    color: 0x222327,
    roughness: 0.82,
    metalness: 0.1,
  });

  const labelTexture = createProductLabelTexture();
  const labelMaterial = new THREE.MeshStandardMaterial({
    map: labelTexture,
    roughness: 0.45,
    metalness: 0.05,
  });

  const portPlateTexture = createPortBayTexture();
  const portBayMaterial = new THREE.MeshStandardMaterial({
    map: portPlateTexture,
    roughness: 0.6,
    metalness: 0.25,
  });

  // --- 1. TV SCREEN MESH ---
  // Plane with front normal, positioned at screen center with slight recess
  const screenGeo = new THREE.PlaneGeometry(screenWidth, screenHeight);
  const screenMesh = new THREE.Mesh(screenGeo, screenMaterial);
  screenMesh.name = 'tv_screen';
  // Screen is placed at Z = 0.007 (just inside the bezel frame border)
  screenMesh.position.set(0, screenCenterY, 0.0075);
  screenMesh.castShadow = false;
  screenMesh.receiveShadow = true;
  root.add(screenMesh);

  // Inner black border / mask behind screen
  const screenBacker = new THREE.Mesh(
    new THREE.PlaneGeometry(screenWidth + 0.004, screenHeight + 0.004),
    new THREE.MeshBasicMaterial({ color: 0x020202 })
  );
  screenBacker.position.set(0, screenCenterY, 0.0068);
  root.add(screenBacker);

  // --- 2. BEZEL FRAME ---
  // Outer frame composed of 4 chamfered bars for crisp quad topology
  const bezelGroup = new THREE.Group();
  bezelGroup.name = 'tv_bezel_frame';

  const frameDepth = 0.016;
  const frameZ = 0.002;

  // Top bar
  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(totalWidth, bezelTop, frameDepth),
    bezelMaterial
  );
  topBar.position.set(0, standClearance + totalBodyHeight - bezelTop / 2, frameZ);
  topBar.castShadow = true;
  bezelGroup.add(topBar);

  // Bottom bar
  const bottomBar = new THREE.Mesh(
    new THREE.BoxGeometry(totalWidth, bezelBottom, frameDepth),
    bezelMaterial
  );
  bottomBar.position.set(0, standClearance + bezelBottom / 2, frameZ);
  bottomBar.castShadow = true;
  bezelGroup.add(bottomBar);

  // Left bar
  const leftBar = new THREE.Mesh(
    new THREE.BoxGeometry(bezelSides, screenHeight, frameDepth),
    bezelMaterial
  );
  leftBar.position.set(-screenWidth / 2 - bezelSides / 2, screenCenterY, frameZ);
  leftBar.castShadow = true;
  bezelGroup.add(leftBar);

  // Right bar
  const rightBar = new THREE.Mesh(
    new THREE.BoxGeometry(bezelSides, screenHeight, frameDepth),
    bezelMaterial
  );
  rightBar.position.set(screenWidth / 2 + bezelSides / 2, screenCenterY, frameZ);
  rightBar.castShadow = true;
  bezelGroup.add(rightBar);

  // Bottom-Right Infrared Sensor / Power LED / Chin Tab (exact detail from photo)
  // In photo 1 & photo 2, notice on the bottom right edge (x ~ 0.20 to 0.22m)
  const chinGroup = new THREE.Group();
  chinGroup.name = 'tv_chin_sensor';
  const chinTab = new THREE.Mesh(
    new THREE.BoxGeometry(0.046, 0.009, 0.014),
    bezelMaterial
  );
  chinTab.position.set(0.205, standClearance - 0.0035, frameZ);
  chinGroup.add(chinTab);

  // Small acrylic IR window / LED
  const irWindow = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.004, 0.002),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.9,
    })
  );
  irWindow.position.set(0.205, standClearance - 0.0035, frameZ + 0.0075);
  chinGroup.add(irWindow);

  // Tiny subtle Samsung branding on chin tab
  bezelGroup.add(chinGroup);
  root.add(bezelGroup);

  // --- 3. REAR CABINET / HOUSING ---
  const cabinetGroup = new THREE.Group();
  cabinetGroup.name = 'tv_cabinet_back';

  // Upper slim cabinet section (top half of TV)
  const upperH = totalBodyHeight * 0.52;
  const upperGeo = new THREE.BoxGeometry(totalWidth - 0.006, upperH, bodyDepthTop);
  const upperMesh = new THREE.Mesh(upperGeo, rearVentMaterial);
  upperMesh.position.set(0, standClearance + totalBodyHeight - upperH / 2, -bodyDepthTop / 2 + 0.002);
  upperMesh.castShadow = true;
  cabinetGroup.add(upperMesh);

  // Lower electronics casing bump (bottom half, deeper)
  const lowerH = totalBodyHeight * 0.50;
  const lowerW = totalWidth - 0.024;
  const lowerGeo = new THREE.BoxGeometry(lowerW, lowerH, bodyDepthBump);
  const lowerMesh = new THREE.Mesh(lowerGeo, rearMaterial);
  lowerMesh.position.set(0, standClearance + lowerH / 2, -bodyDepthBump / 2 + 0.002);
  lowerMesh.castShadow = true;
  cabinetGroup.add(lowerMesh);

  // Transition chamfer wedge between upper thin and lower bump
  const wedgeGeo = new THREE.BoxGeometry(lowerW, 0.04, 0.05);
  wedgeGeo.rotateX(Math.PI / 4.5);
  const wedgeMesh = new THREE.Mesh(wedgeGeo, rearMaterial);
  wedgeMesh.position.set(0, standClearance + lowerH - 0.005, -bodyDepthTop - 0.015);
  cabinetGroup.add(wedgeMesh);

  // VESA 100x100mm Wall Mount Threaded Inserts (4 holes)
  const vesaSpacing = 0.100; // 100mm standard
  const vesaCenterY = standClearance + lowerH * 0.56;
  const vesaGroup = new THREE.Group();
  vesaGroup.name = 'tv_vesa_mounts';
  const vesaHoleGeo = new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 16);
  vesaHoleGeo.rotateX(Math.PI / 2);
  const vesaMat = new THREE.MeshStandardMaterial({ color: 0x44444a, metalness: 0.8, roughness: 0.3 });

  const offsets = [
    [-vesaSpacing / 2, -vesaSpacing / 2],
    [vesaSpacing / 2, -vesaSpacing / 2],
    [-vesaSpacing / 2, vesaSpacing / 2],
    [vesaSpacing / 2, vesaSpacing / 2],
  ];
  offsets.forEach(([ox, oy]) => {
    const hole = new THREE.Mesh(vesaHoleGeo, vesaMat);
    hole.position.set(ox, vesaCenterY + oy, -bodyDepthBump + 0.002);
    vesaGroup.add(hole);
  });
  cabinetGroup.add(vesaGroup);

  // Product Rating Sticker on rear (right-of-center)
  const labelGeo = new THREE.PlaneGeometry(0.12, 0.06);
  labelGeo.rotateY(Math.PI); // Facing rearward
  const labelMesh = new THREE.Mesh(labelGeo, labelMaterial);
  labelMesh.position.set(0.14, vesaCenterY - 0.01, -bodyDepthBump - 0.0005);
  cabinetGroup.add(labelMesh);

  // Recessed I/O Port Bay (left rear side)
  const portBayW = 0.065;
  const portBayH = 0.13;
  const portBayGeo = new THREE.PlaneGeometry(portBayW, portBayH);
  portBayGeo.rotateY(Math.PI);
  const portBayMesh = new THREE.Mesh(portBayGeo, portBayMaterial);
  portBayMesh.position.set(-0.24, vesaCenterY - 0.01, -bodyDepthBump - 0.0005);
  cabinetGroup.add(portBayMesh);

  // Recessed bezel around port bay
  const portRecessFrame = new THREE.Mesh(
    new THREE.BoxGeometry(portBayW + 0.008, portBayH + 0.008, 0.006),
    new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.8 })
  );
  portRecessFrame.position.set(-0.24, vesaCenterY - 0.01, -bodyDepthBump + 0.002);
  cabinetGroup.add(portRecessFrame);

  root.add(cabinetGroup);

  // --- 4. TV STAND FEET (SOPORTE) ---
  if (hasStand) {
    const standMaterial = new THREE.MeshStandardMaterial({
      color: 0x18191a,
      roughness: 0.72,
      metalness: 0.08,
    });
    const rubberPadMaterial = new THREE.MeshStandardMaterial({
      color: 0x09090a,
      roughness: 0.95,
      metalness: 0.0,
    });
    root.add(createStandAssembly(standClearance, standMaterial, rubberPadMaterial));
  }

  const dispose = () => {
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();

    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of childMaterials) {
        if (material !== screenMaterial) materials.add(material);
      }
    });

    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
      material.dispose();
    }
    for (const texture of textures) texture.dispose();
    root.clear();
  };

  return {
    root,
    screenMesh,
    dimensions: {
      width: totalWidth,
      height: totalBodyHeight,
      depth: bodyDepthBump,
      screenDiagonalInches: 32,
      standClearance,
      totalHeight: totalHeightWithStand,
    },
    dispose,
  };
}

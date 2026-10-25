import * as THREE from 'three';

/**
 * Texturas 100 % procedurales (canvas 2D, tamaños pequeños). No se descarga nada.
 */

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D no disponible en este navegador.');
  }
  return [canvas, ctx];
}

/** Baldosa comercial de 1 m (256×256 px) con junta fina y ligero degradado. */
export function createFloorTileTexture(tilesAcrossX: number, tilesAcrossZ: number): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = makeCanvas(size, size);

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#e1e3e6');
  gradient.addColorStop(1, '#d3d6da');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Bisel interior muy sutil.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  // Junta (grout) en el borde de la baldosa.
  ctx.strokeStyle = '#a9aeb5';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(tilesAcrossX, tilesAcrossZ);
  texture.anisotropy = 4;
  return texture;
}

/** Pantalla de demostración (fondo de pantalla degradado) 128×72. */
export function createScreenTexture(stops: readonly [string, string, string]): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 72);
  const gradient = ctx.createLinearGradient(0, 0, 128, 72);
  gradient.addColorStop(0, stops[0]);
  gradient.addColorStop(0.55, stops[1]);
  gradient.addColorStop(1, stops[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 72);

  // Formas suaves tipo "wallpaper".
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.arc(34, 56, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.arc(104, 14, 30, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface SignStyle {
  /** Fondo opaco. `null` = texto sobre fondo transparente. */
  background: string | null;
  foreground: string;
  /** Línea de acento (rojo) bajo el texto, opcional. */
  accent?: string;
  /** Marco interior, opcional. */
  border?: string;
}

/**
 * Textura de rótulo con texto ajustado al ancho disponible.
 * Usa solo fuentes del sistema (sin recursos remotos).
 */
export function createSignTexture(
  text: string,
  width: number,
  height: number,
  style: SignStyle,
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(width, height);

  if (style.background) {
    ctx.fillStyle = style.background;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  if (style.border) {
    ctx.strokeStyle = style.border;
    ctx.lineWidth = Math.max(3, height * 0.025);
    const inset = height * 0.09;
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  }

  const family = '"Arial Black", "Helvetica Neue", Arial, Helvetica, sans-serif';
  const maxTextWidth = width * 0.86;
  let fontSize = height * (style.accent ? 0.5 : 0.58);
  ctx.font = `900 ${fontSize}px ${family}`;
  const measured = ctx.measureText(text).width;
  if (measured > maxTextWidth) {
    fontSize *= maxTextWidth / measured;
    ctx.font = `900 ${fontSize}px ${family}`;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.foreground;
  const textY = style.accent ? height * 0.45 : height * 0.52;
  ctx.fillText(text, width / 2, textY);

  if (style.accent) {
    const barWidth = Math.min(maxTextWidth, ctx.measureText(text).width);
    ctx.fillStyle = style.accent;
    ctx.fillRect((width - barWidth) / 2, height * 0.78, barWidth, height * 0.07);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Texturas estáticas de las dos pantallas del televisor:
 * referencia y RAMSONS. No contienen lógica de transición ni de ciclo.
 */
import * as THREE from 'three';

const SCREEN_WIDTH = 2048;
const SCREEN_HEIGHT = 1152;
const TEXTURE_SCALE = 0.5;

export interface TvScreenTextures {
  reference: THREE.CanvasTexture;
  ramsons: THREE.CanvasTexture;
  dispose: () => void;
}

class StaticTvScreens {
  private readonly width = SCREEN_WIDTH;
  private readonly height = SCREEN_HEIGHT;

  private readonly refCanvas: HTMLCanvasElement;
  private readonly refCtx: CanvasRenderingContext2D;

  private readonly ramsonsCanvas: HTMLCanvasElement;
  private readonly ramsonsCtx: CanvasRenderingContext2D;

  constructor() {
    this.refCanvas = document.createElement('canvas');
    this.refCanvas.width = this.width * TEXTURE_SCALE;
    this.refCanvas.height = this.height * TEXTURE_SCALE;
    const refCtx = this.refCanvas.getContext('2d');
    if (!refCtx) throw new Error('Could not get reference screen context');
    refCtx.scale(TEXTURE_SCALE, TEXTURE_SCALE);
    this.refCtx = refCtx;

    this.ramsonsCanvas = document.createElement('canvas');
    this.ramsonsCanvas.width = this.width * TEXTURE_SCALE;
    this.ramsonsCanvas.height = this.height * TEXTURE_SCALE;
    const ramsonsCtx = this.ramsonsCanvas.getContext('2d');
    if (!ramsonsCtx) throw new Error('Could not get RAMSONS screen context');
    ramsonsCtx.scale(TEXTURE_SCALE, TEXTURE_SCALE);
    this.ramsonsCtx = ramsonsCtx;

    this.renderReferenceUI();
    this.renderRamsonsUI();
  }

  public createTextures(maxAnisotropy: number): TvScreenTextures {
    const configure = (canvas: HTMLCanvasElement, name: string): THREE.CanvasTexture => {
      const texture = new THREE.CanvasTexture(canvas);
      texture.name = name;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      return texture;
    };

    const reference = configure(this.refCanvas, 'tv-screen-reference');
    const ramsons = configure(this.ramsonsCanvas, 'tv-screen-ramsons');
    const refCanvas = this.refCanvas;
    const ramsonsCanvas = this.ramsonsCanvas;

    return {
      reference,
      ramsons,
      dispose: () => {
        reference.dispose();
        ramsons.dispose();
        refCanvas.width = 0;
        refCanvas.height = 0;
        ramsonsCanvas.width = 0;
        ramsonsCanvas.height = 0;
      },
    };
  }

  /**
   * Exact recreation of the reference photograph UI:
   * - Samsung logo top-left
   * - "Smart TV HD" top-right
   * - Navy/cyan abstract wallpaper
   * - 6 apps: Wi-Fi, Samsung TV Plus (+400 canais grátis), YouTube, Netflix, Prime Video, Globo Play
   */
  public renderReferenceUI(): void {
    const ctx = this.refCtx;
    const w = this.width;
    const h = this.height;

    // Background gradient: Deep navy to dark sapphire with glowing blue waves
    const bgGrad = ctx.createRadialGradient(w * 0.3, h * 0.4, 100, w * 0.5, h * 0.5, w * 0.8);
    bgGrad.addColorStop(0, '#0d2b5c');
    bgGrad.addColorStop(0.4, '#071836');
    bgGrad.addColorStop(0.85, '#020917');
    bgGrad.addColorStop(1, '#01050e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Dynamic wave curves matching the wallpaper in photo
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Wave 1: Cyan ribbon
    const grad1 = ctx.createLinearGradient(0, 0, w, h);
    grad1.addColorStop(0, 'rgba(0, 180, 255, 0.4)');
    grad1.addColorStop(0.5, 'rgba(0, 220, 255, 0.6)');
    grad1.addColorStop(1, 'rgba(0, 80, 220, 0.2)');
    ctx.fillStyle = grad1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.2);
    ctx.bezierCurveTo(w * 0.35, h * 0.65, w * 0.7, h * 0.1, w, h * 0.75);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Wave 2: Bright neon cyan streak
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(70, 225, 255, 0.75)';
    ctx.shadowColor = '#00e1ff';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.85);
    ctx.bezierCurveTo(w * 0.4, h * 0.3, w * 0.75, h * 0.7, w * 0.95, h * 0.35);
    ctx.stroke();

    // Wave 3: Secondary electric blue streak
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0, 140, 255, 0.6)';
    ctx.shadowColor = '#008cff';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.bezierCurveTo(w * 0.3, h * 0.15, w * 0.6, h * 0.9, w, h * 0.45);
    ctx.stroke();

    ctx.restore();

    // Subtle dark overlay to let tiles pop
    ctx.fillStyle = 'rgba(2, 8, 20, 0.3)';
    ctx.fillRect(0, 0, w, h);

    // Header: SAMSUNG (top-left) & Smart TV HD (top-right)
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 12;

    // SAMSUNG logo font
    ctx.font = '900 80px "Montserrat", "Arial Black", sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('SAMSUNG', w * 0.08, h * 0.15);

    // Smart TV HD text
    ctx.font = '700 74px "Montserrat", "Segoe UI", sans-serif';
    ctx.letterSpacing = '1px';
    const smartText = 'Smart TV HD';
    const smartWidth = ctx.measureText(smartText).width;
    ctx.fillText(smartText, w * 0.92 - smartWidth, h * 0.15);
    ctx.restore();

    // 6 App Tiles (2 rows x 3 columns)
    // Layout parameters
    const tileW = w * 0.25;
    const tileH = h * 0.32;
    const startX = w * 0.08;
    const startY = h * 0.25;
    const gapX = w * 0.045;
    const gapY = h * 0.06;
    const r = 24; // border radius

    // Helper to draw rounded rect
    const drawRoundedCard = (x: number, y: number, width: number, height: number, radius: number) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    // --- CARD 1 (Row 0, Col 0): Wi-Fi ---
    const c1X = startX;
    const c1Y = startY;
    ctx.save();
    drawRoundedCard(c1X, c1Y, tileW, tileH, r);
    ctx.fillStyle = '#102d59';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();

    // Wi-Fi Icon
    const wIconX = c1X + tileW * 0.5;
    const wIconY = c1Y + tileH * 0.42;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    // Arcs
    ctx.beginPath();
    ctx.arc(wIconX, wIconY, 65, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wIconX, wIconY, 40, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();
    // Center dot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(wIconX, wIconY - 2, 10, 0, Math.PI * 2);
    ctx.fill();

    // Wi-Fi Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 44px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Wi-Fi', wIconX, c1Y + tileH * 0.82);
    ctx.restore();

    // --- CARD 2 (Row 0, Col 1): Samsung TV Plus • Pluto TV (+400 canais grátis) ---
    const c2X = startX + tileW + gapX;
    const c2Y = startY;
    ctx.save();
    drawRoundedCard(c2X, c2Y, tileW, tileH, r);
    ctx.fillStyle = '#1b222c';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();

    const c2CenterX = c2X + tileW * 0.5;

    // TV Plus screen icon
    const iconRectW = 75;
    const iconRectH = 55;
    const iconRectX = c2CenterX - iconRectW * 0.5;
    const iconRectY = c2Y + tileH * 0.22;
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#ff7300';
    ctx.strokeRect(iconRectX - 6, iconRectY - 4, iconRectW, iconRectH);
    ctx.strokeStyle = '#00c3ff';
    ctx.strokeRect(iconRectX + 6, iconRectY + 4, iconRectW, iconRectH);

    // Text "Samsung TV Plus • Pluto TV"
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 24px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Samsung', c2CenterX, c2Y + tileH * 0.50);
    ctx.font = '500 20px "Segoe UI", sans-serif';
    ctx.fillStyle = '#d0d8e4';
    ctx.fillText('TV Plus • Pluto TV', c2CenterX, c2Y + tileH * 0.58);

    // Large highlight: "+400 canais grátis"
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 38px "Segoe UI", sans-serif';
    ctx.fillText('+400 canais grátis', c2CenterX, c2Y + tileH * 0.82);
    ctx.restore();

    // --- CARD 3 (Row 0, Col 2): YouTube ---
    const c3X = startX + (tileW + gapX) * 2;
    const c3Y = startY;
    ctx.save();
    drawRoundedCard(c3X, c3Y, tileW, tileH, r);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.stroke();

    // Red YouTube badge
    const ytBadgeW = 150;
    const ytBadgeH = 105;
    const ytBadgeX = c3X + (tileW - ytBadgeW) * 0.5;
    const ytBadgeY = c3Y + (tileH - ytBadgeH) * 0.5;
    ctx.fillStyle = '#FF0000';
    drawRoundedCard(ytBadgeX, ytBadgeY, ytBadgeW, ytBadgeH, 26);
    ctx.fill();

    // White Play triangle
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(ytBadgeX + ytBadgeW * 0.42, ytBadgeY + ytBadgeH * 0.32);
    ctx.lineTo(ytBadgeX + ytBadgeW * 0.68, ytBadgeY + ytBadgeH * 0.5);
    ctx.lineTo(ytBadgeX + ytBadgeW * 0.42, ytBadgeY + ytBadgeH * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- CARD 4 (Row 1, Col 0): Netflix ---
    const c4X = startX;
    const c4Y = startY + tileH + gapY;
    ctx.save();
    drawRoundedCard(c4X, c4Y, tileW, tileH, r);
    ctx.fillStyle = '#050505';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();

    // Netflix 'N'
    const nX = c4X + tileW * 0.5;
    const nY = c4Y + tileH * 0.5;
    ctx.fillStyle = '#E50914';
    ctx.font = '900 130px "Bebas Neue", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nX, nY);
    ctx.restore();

    // --- CARD 5 (Row 1, Col 1): Prime Video ---
    const c5X = startX + tileW + gapX;
    const c5Y = startY + tileH + gapY;
    ctx.save();
    drawRoundedCard(c5X, c5Y, tileW, tileH, r);
    ctx.fillStyle = '#0073e6';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();

    const pvX = c5X + tileW * 0.5;
    const pvY = c5Y + tileH * 0.42;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = '700 52px "Segoe UI", sans-serif';
    ctx.fillText('prime', pvX, pvY);
    ctx.font = '700 50px "Segoe UI", sans-serif';
    ctx.fillText('video', pvX, pvY + 54);

    // Prime smile arrow
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(pvX, pvY + 68, 48, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(pvX + 38, pvY + 104);
    ctx.lineTo(pvX + 50, pvY + 98);
    ctx.lineTo(pvX + 46, pvY + 112);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();

    // --- CARD 6 (Row 1, Col 2): Globo Play ---
    const c6X = startX + (tileW + gapX) * 2;
    const c6Y = startY + tileH + gapY;
    ctx.save();
    drawRoundedCard(c6X, c6Y, tileW, tileH, r);
    ctx.fillStyle = '#FF153C';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.stroke();

    const gpX = c6X + tileW * 0.5;
    const gpY = c6Y + tileH * 0.46;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = '800 62px "Segoe UI", sans-serif';
    ctx.fillText('globo', gpX, gpY);
    ctx.font = '800 60px "Segoe UI", sans-serif';
    ctx.fillText('play', gpX, gpY + 62);
    ctx.restore();
  }

  /**
   * RAMSONS Visual Identity Screen:
   * Bold RAMSONS Red, Black and White palette.
   * Clean, ultra-crisp, elegant, perfectly centered.
   */
  public renderRamsonsUI(): void {
    const ctx = this.ramsonsCtx;
    const w = this.width;
    const h = this.height;

    // Premium Red Background with deep subtle radial gradient and carbon edge
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 120, w * 0.5, h * 0.5, w * 0.75);
    bgGrad.addColorStop(0, '#e51025');
    bgGrad.addColorStop(0.55, '#c40d1e');
    bgGrad.addColorStop(0.85, '#990614');
    bgGrad.addColorStop(1, '#1a0003');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle carbon grid texture in background
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    // Geometric accent bars - Ramsons Identity (Red, Black, White)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, 14);
    ctx.fillRect(0, h - 14, w, 14);

    // Center RAMSONS Brand Card / Glow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 15;

    // Central clean typography
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 160px "Montserrat", "Arial Black", sans-serif';
    ctx.letterSpacing = '18px';
    ctx.fillText('RAMSONS', w * 0.5, h * 0.46);

    // Decorative clean dividing line
    const lineW = 380;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FFFFFF';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - lineW * 0.5, h * 0.57);
    ctx.lineTo(w * 0.5 + lineW * 0.5, h * 0.57);
    ctx.stroke();

    // Central small diamond in line
    ctx.fillStyle = '#0a0a0a';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const dX = w * 0.5;
    const dY = h * 0.57;
    ctx.moveTo(dX, dY - 8);
    ctx.lineTo(dX + 8, dY);
    ctx.lineTo(dX, dY + 8);
    ctx.lineTo(dX - 8, dY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtitle
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 38px "Montserrat", sans-serif';
    ctx.letterSpacing = '8px';
    ctx.shadowBlur = 8;
    ctx.fillText('SMART VISION  •  32" HD SERIES', w * 0.5, h * 0.66);

    // Bottom subtle tag
    ctx.font = '500 24px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.letterSpacing = '3px';
    ctx.fillText('INNOVATION & QUALITY', w * 0.5, h * 0.86);

    // Top subtle status bar
    ctx.font = '600 24px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'left';
    ctx.fillText('RAMSONS SMART HUB', w * 0.08, h * 0.12);
    ctx.textAlign = 'right';
    ctx.fillText('32" CLASS  •  HDMI / USB / WI-FI', w * 0.92, h * 0.12);

    ctx.restore();
  }

}

export function createTvScreenTextures(maxAnisotropy = 1): TvScreenTextures {
  return new StaticTvScreens().createTextures(Math.max(1, maxAnisotropy));
}

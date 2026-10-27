import type { TvSpec } from '../data/tvSpecs';
import { canUseTvPreview, TvPreview } from './tvPreview';

export interface TvCardOptions {
  /**
   * Se llama al tocar fuera del panel. Si devuelve una TV, la ficha se actualiza
   * sin cerrarse; si devuelve null, la ficha se cierra.
   */
  onSceneTap?: (clientX: number, clientY: number) => TvSpec | null;
}

export interface TvCard {
  open(spec: TvSpec): void;
  close(): void;
  isOpen(): boolean;
  dispose(): void;
}

const GHOST_CLICK_GUARD_MS = 500;
const TV_CATEGORY_URL = 'https://www.ramsons.com.br/eletronicos/televisores';
const RAMSONS_ORIGIN = /^https:\/\/(?:www\.)?ramsons\.com\.br\//i;
const CONNECTIVITY_FEATURE = /\b(wi-?fi|bluetooth|hdmi|usb|ethernet|airplay|chromecast|google cast)\b/i;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function isConfirmed(value: string | undefined): value is string {
  if (!value) return false;
  const normalized = value.trim();
  return normalized !== '' && normalized !== 'Por confirmar';
}

function sectionTitle(text: string): HTMLHeadingElement {
  const title = el('h3', 'tv-card-section-title');
  title.textContent = text;
  return title;
}

function resolveProductUrl(spec: TvSpec): string {
  return spec.productUrl && RAMSONS_ORIGIN.test(spec.productUrl)
    ? spec.productUrl
    : TV_CATEGORY_URL;
}

function getTvDisplayName(spec: TvSpec): string {
  const model = !spec.modelPending && isConfirmed(spec.model) ? spec.model : null;
  const parts: string[] = [spec.brand];

  if (model) parts.push(model);
  if (isConfirmed(spec.series)) {
    parts.push(spec.series);
  } else {
    if (isConfirmed(spec.resolution)) parts.push(spec.resolution);
    if (isConfirmed(spec.displayTechnology)) parts.push(spec.displayTechnology);
  }

  return parts.join(' ');
}

/**
 * Ficha de producto de un televisor. Se monta una sola vez y se rellena al abrir.
 * El backdrop cubre la escena y bloquea los controles mientras está visible.
 */
export function createTvCard(options: TvCardOptions = {}): TvCard {
  const backdrop = el('div', 'tv-card-backdrop');
  backdrop.hidden = true;

  const panel = el('div', 'tv-card');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'tv-card-title');

  const handle = el('div', 'tv-card-handle');
  handle.setAttribute('aria-hidden', 'true');

  const header = el('header', 'tv-card-header');
  const lockup = el('div', 'tv-card-lockup');
  const wordmark = el('div', 'tv-card-wordmark');
  const wordmarkName = el('span', 'tv-card-wordmark-name');
  wordmarkName.textContent = 'RAMSONS';
  const wordmarkTag = el('span', 'tv-card-wordmark-tag');
  wordmarkTag.textContent = '3D';
  wordmark.append(wordmarkName, wordmarkTag);
  const kicker = el('span', 'tv-card-kicker');
  kicker.textContent = 'Ficha de producto';
  lockup.append(wordmark, kicker);

  const closeButton = el('button', 'tv-card-close');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Cerrar ficha del televisor');
  closeButton.textContent = '×';

  header.append(lockup, closeButton);

  const content = el('div', 'tv-card-content');

  const preview = el('div', 'tv-card-preview');
  const previewCanvas = el('canvas', 'tv-card-preview-canvas');
  previewCanvas.setAttribute('aria-hidden', 'true');
  const previewBadge = el('span', 'tv-card-preview-badge');
  previewBadge.textContent = 'Vista 3D';
  const previewFallback = el('div', 'tv-card-preview-fallback');
  previewFallback.hidden = true;
  previewFallback.textContent = 'Vista 3D no disponible en este dispositivo.';
  preview.append(previewCanvas, previewBadge, previewFallback);

  const product = el('div', 'tv-card-product');
  const brand = el('p', 'tv-card-brand');
  const title = el('h2', 'tv-card-title');
  title.id = 'tv-card-title';
  const series = el('p', 'tv-card-series');
  product.append(brand, title, series);

  const screenSection = el('section', 'tv-card-section');
  const screenGrid = el('div', 'tv-card-specs');
  screenSection.append(sectionTitle('Pantalla'), screenGrid);

  const systemSection = el('section', 'tv-card-section');
  const systemList = el('ul', 'tv-card-chips');
  systemSection.append(sectionTitle('Sistema y funciones'), systemList);

  const connectivitySection = el('section', 'tv-card-section');
  const connectivityList = el('ul', 'tv-card-chips');
  connectivitySection.append(sectionTitle('Conectividad esencial'), connectivityList);

  content.append(preview, product, screenSection, systemSection, connectivitySection);

  const footer = el('footer', 'tv-card-footer');
  const cta = el('a', 'tv-card-cta');
  cta.target = '_blank';
  cta.rel = 'noopener noreferrer';
  const ctaLabel = el('span', 'tv-card-cta-label');
  ctaLabel.textContent = 'Consultar producto en RAMSONS';
  const ctaArrow = el('span', 'tv-card-cta-arrow');
  ctaArrow.setAttribute('aria-hidden', 'true');
  ctaArrow.textContent = '↗';
  cta.append(ctaLabel, ctaArrow);
  footer.append(cta);

  panel.append(handle, header, content, footer);
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);

  let open = false;
  let openedAt = -Infinity;
  let previewInstance: TvPreview | null = null;
  let previewUnavailable = false;

  function stopEvent(event: Event): void {
    event.stopPropagation();
  }

  /**
   * En Chrome/Android, el `click` sintético que sigue al `pointerup` puede caer
   * sobre el backdrop recién mostrado y cerrar la ficha en el acto. Ignoramos
   * esos eventos durante los primeros milisegundos de vida de la ficha.
   */
  function isOpeningGesture(): boolean {
    return performance.now() - openedAt < GHOST_CLICK_GUARD_MS;
  }

  function close(): void {
    if (!open) return;
    open = false;
    previewInstance?.setActive(false);
    backdrop.hidden = true;
    document.removeEventListener('keydown', onKeyDown);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  function ensurePreview(spec: TvSpec): void {
    if (previewInstance || previewUnavailable || !canUseTvPreview(previewCanvas)) return;

    try {
      previewInstance = new TvPreview(previewCanvas);
      previewInstance.setInches(spec.inches);
      previewInstance.setActive(open);
    } catch (error) {
      previewUnavailable = true;
      previewCanvas.hidden = true;
      previewFallback.hidden = false;
      preview.setAttribute('data-fallback', 'true');
      console.warn('No se pudo iniciar la vista 3D de la ficha:', error);
    }
  }

  function renderSpecItems(spec: TvSpec): void {
    const items: Array<{ label: string; value: string; hero?: boolean }> = [
      { label: 'Pulgadas', value: `${spec.inches}"`, hero: true },
    ];
    if (isConfirmed(spec.resolution)) items.push({ label: 'Resolución', value: spec.resolution });
    if (isConfirmed(spec.displayTechnology)) {
      items.push({ label: 'Tecnología', value: spec.displayTechnology });
    }

    screenGrid.replaceChildren();
    for (const item of items) {
      const card = el('div', 'tv-card-spec');
      const label = el('span', 'tv-card-spec-label');
      label.textContent = item.label;
      const value = el('strong', item.hero ? 'tv-card-spec-value tv-card-spec-value-hero' : 'tv-card-spec-value');
      value.textContent = item.value;
      card.append(label, value);
      screenGrid.appendChild(card);
    }
    screenSection.hidden = items.length === 0;
  }

  function renderChips(
    section: HTMLElement,
    list: HTMLUListElement,
    features: readonly string[],
    variant: string,
  ): void {
    list.replaceChildren();
    for (const feature of features) {
      const item = el('li', `tv-card-chip ${variant}`);
      item.textContent = feature;
      list.appendChild(item);
    }
    section.hidden = features.length === 0;
  }

  function renderContent(spec: TvSpec): void {
    const displayName = getTvDisplayName(spec);

    brand.textContent = spec.brand;
    title.textContent = displayName;
    series.textContent = '';
    series.hidden = true;

    renderSpecItems(spec);

    const systemFeatures: string[] = [];
    const connectivityFeatures: string[] = [];
    for (const feature of spec.features) {
      if (!feature.trim()) continue;
      if (CONNECTIVITY_FEATURE.test(feature)) {
        connectivityFeatures.push(feature);
      } else {
        systemFeatures.push(feature);
      }
    }
    renderChips(systemSection, systemList, systemFeatures, 'tv-card-chip-system');
    renderChips(connectivitySection, connectivityList, connectivityFeatures, 'tv-card-chip-connectivity');

    cta.href = resolveProductUrl(spec);
    cta.setAttribute('aria-label', `Consultar ${displayName} en RAMSONS`);

    ensurePreview(spec);
    previewInstance?.setInches(spec.inches);
    previewInstance?.setActive(open);
    content.scrollTop = 0;
  }

  function openCard(spec: TvSpec): void {
    const firstOpen = !open;

    if (firstOpen) {
      openedAt = performance.now();
      backdrop.hidden = false;
      open = true;
      document.addEventListener('keydown', onKeyDown);
    }

    renderContent(spec);

    if (firstOpen) {
      closeButton.focus({ preventScroll: true });
    }
  }

  closeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!isOpeningGesture()) close();
  });
  panel.addEventListener('pointerdown', stopEvent);
  panel.addEventListener('click', stopEvent);
  backdrop.addEventListener('pointerdown', (event) => {
    if (event.target !== backdrop || isOpeningGesture()) return;

    const spec = options.onSceneTap?.(event.clientX, event.clientY) ?? null;
    if (spec) {
      openCard(spec);
      return;
    }
    close();
  });

  return {
    open: openCard,
    close,
    isOpen: () => open,
    dispose(): void {
      document.removeEventListener('keydown', onKeyDown);
      previewInstance?.dispose();
      previewInstance = null;
      backdrop.remove();
    },
  };
}

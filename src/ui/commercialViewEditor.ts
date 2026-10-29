import * as THREE from 'three';
import {
  COMMERCIAL_VIEWS,
  type CommercialViewId,
  type CommercialViewPose,
} from '../scene/store/commercialCamera';

const DEFAULT_TARGET_DISTANCE = 10;
const MIN_TARGET_DISTANCE = 0.001;
const FIELD_PRECISION = 3;

type Axis = 'x' | 'y' | 'z';
type Triple = [number, number, number];

export interface RestoreCommercialViewResult {
  ok: boolean;
  pose?: CommercialViewPose;
}

export interface CommercialViewEditorOptions {
  camera: THREE.PerspectiveCamera;
  isCustomized: (id: CommercialViewId) => boolean;
  onSelectView: (id: CommercialViewId) => void;
  onSavePose: (id: CommercialViewId, pose: CommercialViewPose) => boolean;
  onRestorePose: (id: CommercialViewId) => RestoreCommercialViewResult;
  onCameraChanged: () => void;
}

export interface CommercialViewEditor {
  show(activeViewId: CommercialViewId, referenceTargetDistance?: number): void;
  hide(): void;
  update(): void;
  getSelectedViewId(): CommercialViewId;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function isKnownViewId(value: string): value is CommercialViewId {
  return COMMERCIAL_VIEWS.some((view) => view.id === value);
}

function parseNumericValue(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function formatNumericValue(value: number): string {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return normalized.toFixed(FIELD_PRECISION);
}

function createSvgIcon(paths: readonly string[]): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  for (const pathData of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.append(path);
  }

  return svg;
}

export function createCommercialViewEditor(
  options: CommercialViewEditorOptions,
): CommercialViewEditor {
  const { camera } = options;
  let selectedViewId: CommercialViewId = COMMERCIAL_VIEWS[0].id;
  let targetDistance = DEFAULT_TARGET_DISTANCE;
  let statusTimer: number | null = null;
  let minimized = true;

  const direction = new THREE.Vector3();
  const currentTarget = new THREE.Vector3();

  const panel = createElement('section', 'view-editor');
  panel.id = 'commercial-view-editor';
  panel.setAttribute('aria-label', 'Editor de vistas comerciais');
  panel.hidden = true;

  const heading = createElement('div', 'view-editor-heading');
  const headingCopy = createElement('div', 'view-editor-heading-copy');
  headingCopy.append(
    createElement('span', 'view-editor-title', 'Editor de vistas'),
    createElement('span', 'view-editor-hint', 'Ajuste a câmera comercial e salve cada zona.'),
  );
  const customBadge = createElement('span', 'view-editor-badge', 'Personalizada');
  customBadge.hidden = true;

  const minimizeButton = createElement('button', 'view-editor-minimize');
  minimizeButton.type = 'button';
  minimizeButton.setAttribute('aria-label', 'Minimizar editor');
  minimizeButton.setAttribute('title', 'Minimizar editor');
  minimizeButton.setAttribute('aria-controls', panel.id);
  minimizeButton.append(createSvgIcon(['M5 12h14']));

  const headingActions = createElement('div', 'view-editor-heading-actions');
  headingActions.append(customBadge, minimizeButton);
  heading.append(headingCopy, headingActions);

  const zoneLabel = createElement('label', 'view-editor-zone');
  zoneLabel.append(createElement('span', 'view-editor-field-label', 'Zona'));
  const viewSelect = createElement('select', 'view-editor-select');
  viewSelect.setAttribute('aria-label', 'Zona comercial em edição');
  for (const view of COMMERCIAL_VIEWS) {
    const option = createElement('option', undefined, view.label);
    option.value = view.id;
    viewSelect.append(option);
  }
  zoneLabel.append(viewSelect);

  function createNumberField(
    kind: 'position' | 'target',
    axis: Axis,
    label: string,
  ): HTMLInputElement {
    const field = createElement('label', 'view-editor-number');
    field.append(createElement('span', 'view-editor-axis', label));

    const input = createElement('input', 'view-editor-input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = formatNumericValue(0);
    input.dataset.kind = kind;
    input.dataset.axis = axis;
    input.setAttribute('aria-label', `${kind === 'position' ? 'Posição' : 'Alvo'} ${label.replace('Alvo ', '')}`);
    field.append(input);
    return input;
  }

  const positionInputs: Record<Axis, HTMLInputElement> = {
    x: createNumberField('position', 'x', 'X'),
    y: createNumberField('position', 'y', 'Y'),
    z: createNumberField('position', 'z', 'Z'),
  };
  const targetInputs: Record<Axis, HTMLInputElement> = {
    x: createNumberField('target', 'x', 'Alvo X'),
    y: createNumberField('target', 'y', 'Alvo Y'),
    z: createNumberField('target', 'z', 'Alvo Z'),
  };

  const positionGroup = createElement('fieldset', 'view-editor-group');
  positionGroup.append(createElement('legend', 'view-editor-legend', 'Posição da câmera'));
  const positionGrid = createElement('div', 'view-editor-grid');
  positionGrid.append(positionInputs.x.parentElement as HTMLLabelElement);
  positionGrid.append(positionInputs.y.parentElement as HTMLLabelElement);
  positionGrid.append(positionInputs.z.parentElement as HTMLLabelElement);
  positionGroup.append(positionGrid);

  const targetGroup = createElement('fieldset', 'view-editor-group');
  targetGroup.append(createElement('legend', 'view-editor-legend', 'Ponto de mira'));
  const targetGrid = createElement('div', 'view-editor-grid');
  targetGrid.append(targetInputs.x.parentElement as HTMLLabelElement);
  targetGrid.append(targetInputs.y.parentElement as HTMLLabelElement);
  targetGrid.append(targetInputs.z.parentElement as HTMLLabelElement);
  targetGroup.append(targetGrid);

  const actions = createElement('div', 'view-editor-actions');
  const saveButton = createElement('button', 'view-editor-button view-editor-save', 'Salvar posição');
  saveButton.type = 'button';
  const restoreButton = createElement(
    'button',
    'view-editor-button view-editor-restore',
    'Restaurar posição original',
  );
  restoreButton.type = 'button';
  actions.append(saveButton, restoreButton);

  const status = createElement('p', 'view-editor-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;

  const launcher = createElement('button', 'view-editor-launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Abrir editor');
  launcher.setAttribute('title', 'Abrir editor');
  launcher.setAttribute('aria-controls', panel.id);
  launcher.append(
    createSvgIcon([
      'M12 20h9',
      'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
    ]),
  );
  launcher.hidden = true;

  panel.append(heading, zoneLabel, positionGroup, targetGroup, actions, status);
  document.body.append(panel, launcher);

  const allInputs = [
    positionInputs.x,
    positionInputs.y,
    positionInputs.z,
    targetInputs.x,
    targetInputs.y,
    targetInputs.z,
  ];

  function updateCustomBadge(): void {
    customBadge.hidden = !options.isCustomized(selectedViewId);
  }

  function hideStatus(): void {
    if (statusTimer !== null) {
      window.clearTimeout(statusTimer);
      statusTimer = null;
    }
    status.hidden = true;
    status.classList.remove('is-error', 'is-success');
  }

  function showStatus(message: string, isError = false): void {
    if (statusTimer !== null) {
      window.clearTimeout(statusTimer);
    }
    status.textContent = message;
    status.classList.toggle('is-error', isError);
    status.classList.toggle('is-success', !isError);
    status.hidden = false;
    statusTimer = window.setTimeout(() => {
      status.hidden = true;
      statusTimer = null;
    }, 2400);
  }

  function syncVisibility(): void {
    panel.hidden = minimized;
    launcher.hidden = !minimized;
  }

  function minimizeEditor(): void {
    if (minimized) return;

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && panel.contains(activeElement)) {
      activeElement.blur();
    }

    minimized = true;
    hideStatus();
    syncVisibility();
    launcher.focus({ preventScroll: true });
  }

  function openEditor(): void {
    if (!minimized) return;

    minimized = false;
    renderFields(true);
    updateCustomBadge();
    hideStatus();
    syncVisibility();
    panel.scrollTop = 0;
    minimizeButton.focus({ preventScroll: true });
  }

  function setInputValue(input: HTMLInputElement, value: number, force: boolean): void {
    if (!force && document.activeElement === input) return;
    const nextValue = formatNumericValue(value);
    if (input.value !== nextValue) {
      input.value = nextValue;
    }
  }

  function readTriple(inputs: Record<Axis, HTMLInputElement>): Triple | null {
    const x = parseNumericValue(inputs.x.value);
    const y = parseNumericValue(inputs.y.value);
    const z = parseNumericValue(inputs.z.value);
    if (x === null || y === null || z === null) return null;
    return [x, y, z];
  }

  function computeTarget(distance: number, target: THREE.Vector3): THREE.Vector3 {
    direction.set(0, 0, -1).applyQuaternion(camera.quaternion);
    return target.copy(camera.position).addScaledVector(direction, distance);
  }

  function renderFields(force: boolean): void {
    computeTarget(targetDistance, currentTarget);
    setInputValue(positionInputs.x, camera.position.x, force);
    setInputValue(positionInputs.y, camera.position.y, force);
    setInputValue(positionInputs.z, camera.position.z, force);
    setInputValue(targetInputs.x, currentTarget.x, force);
    setInputValue(targetInputs.y, currentTarget.y, force);
    setInputValue(targetInputs.z, currentTarget.z, force);
  }

  function markInvalid(input: HTMLInputElement, invalid: boolean): void {
    if (invalid) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  }

  function applyField(input: HTMLInputElement): void {
    const isPosition = input.dataset.kind === 'position';
    const values = readTriple(isPosition ? positionInputs : targetInputs);
    if (!values) {
      markInvalid(input, true);
      return;
    }

    if (isPosition) {
      const nextPosition = new THREE.Vector3(...values);
      if (nextPosition.distanceToSquared(currentTarget) < MIN_TARGET_DISTANCE ** 2) {
        markInvalid(input, true);
        return;
      }
      const target = currentTarget.clone();
      camera.position.copy(nextPosition);
      camera.lookAt(target);
      targetDistance = nextPosition.distanceTo(target);
      currentTarget.copy(target);
    } else {
      const nextTarget = new THREE.Vector3(...values);
      if (camera.position.distanceToSquared(nextTarget) < MIN_TARGET_DISTANCE ** 2) {
        markInvalid(input, true);
        return;
      }
      camera.lookAt(nextTarget);
      currentTarget.copy(nextTarget);
      targetDistance = camera.position.distanceTo(nextTarget);
    }

    markInvalid(input, false);
    options.onCameraChanged();
    renderFields(false);
  }

  function capturePose(): CommercialViewPose | null {
    const target = computeTarget(targetDistance, new THREE.Vector3());
    if (camera.position.distanceToSquared(target) < MIN_TARGET_DISTANCE ** 2) {
      return null;
    }
    return {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [target.x, target.y, target.z],
    };
  }

  minimizeButton.addEventListener('click', (event) => {
    event.preventDefault();
    minimizeEditor();
  });

  launcher.addEventListener('click', (event) => {
    event.preventDefault();
    openEditor();
  });

  viewSelect.addEventListener('change', () => {
    const nextId = viewSelect.value;
    if (!isKnownViewId(nextId)) return;
    selectedViewId = nextId;
    options.onSelectView(nextId);
    updateCustomBadge();
    hideStatus();
  });

  for (const input of allInputs) {
    input.addEventListener('input', () => applyField(input));
    input.addEventListener('blur', () => {
      markInvalid(input, false);
      renderFields(true);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        input.blur();
      }
    });
  }

  saveButton.addEventListener('click', () => {
    const pose = capturePose();
    if (!pose) {
      showStatus('Posição inválida. Ajuste a câmera e o ponto de mira.', true);
      return;
    }

    if (options.onSavePose(selectedViewId, pose)) {
      showStatus('Posição salva.');
      updateCustomBadge();
      renderFields(true);
    } else {
      showStatus('Não foi possível salvar a posição.', true);
    }
  });

  restoreButton.addEventListener('click', () => {
    const view = COMMERCIAL_VIEWS.find((candidate) => candidate.id === selectedViewId);
    if (
      options.isCustomized(selectedViewId) &&
      !window.confirm(`Descartar a posição personalizada de "${view?.label ?? selectedViewId}"?`)
    ) {
      return;
    }

    const result = options.onRestorePose(selectedViewId);
    if (!result.ok || !result.pose) {
      showStatus('Não foi possível restaurar a posição.', true);
      return;
    }

    camera.position.set(...result.pose.position);
    camera.lookAt(new THREE.Vector3(...result.pose.target));
    targetDistance = camera.position.distanceTo(new THREE.Vector3(...result.pose.target));
    if (!Number.isFinite(targetDistance) || targetDistance < MIN_TARGET_DISTANCE) {
      targetDistance = DEFAULT_TARGET_DISTANCE;
    }
    options.onCameraChanged();
    renderFields(true);
    updateCustomBadge();
    showStatus('Posição original restaurada.');
  });

  return {
    show(activeViewId, referenceTargetDistance) {
      selectedViewId = activeViewId;
      viewSelect.value = activeViewId;
      targetDistance =
        referenceTargetDistance !== undefined &&
        Number.isFinite(referenceTargetDistance) &&
        referenceTargetDistance >= MIN_TARGET_DISTANCE
          ? referenceTargetDistance
          : DEFAULT_TARGET_DISTANCE;
      renderFields(true);
      updateCustomBadge();
      hideStatus();
      syncVisibility();
    },

    hide() {
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        (panel.contains(activeElement) || activeElement === launcher)
      ) {
        activeElement.blur();
      }
      hideStatus();
      panel.hidden = true;
      launcher.hidden = true;
    },

    update() {
      if (panel.hidden) return;
      renderFields(false);
    },

    getSelectedViewId() {
      return selectedViewId;
    },
  };
}

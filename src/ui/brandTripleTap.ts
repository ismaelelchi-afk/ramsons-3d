export interface BrandTripleTapOptions {
  target: HTMLElement;
  onActivate: () => void;
  canActivate?: () => boolean;
}

export interface BrandTripleTap {
  reset(): void;
  dispose(): void;
}

const TRIPLE_TAP_COUNT = 3;
const TRIPLE_TAP_WINDOW_MS = 800;
const TRIPLE_TAP_MAX_DISTANCE = 12;

function isPointOnTarget(target: HTMLElement, x: number, y: number): boolean {
  const rect = target.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function createBrandTripleTap(options: BrandTripleTapOptions): BrandTripleTap {
  const { target } = options;

  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let maxDistance = 0;
  let tapCount = 0;
  let sequenceStart = 0;
  let sequenceLast = 0;

  function reset(): void {
    const activePointer = pointerId;
    pointerId = null;
    startX = 0;
    startY = 0;
    startTime = 0;
    maxDistance = 0;
    tapCount = 0;
    sequenceStart = 0;
    sequenceLast = 0;

    if (activePointer !== null && target.hasPointerCapture(activePointer)) {
      target.releasePointerCapture(activePointer);
    }
  }

  function expire(now: number): void {
    if (
      tapCount > 0 &&
      (now - sequenceStart > TRIPLE_TAP_WINDOW_MS ||
        now - sequenceLast > TRIPLE_TAP_WINDOW_MS)
    ) {
      reset();
    }
  }

  function recordTap(startedAt: number): void {
    const now = performance.now();
    expire(now);

    if (tapCount === 0) {
      sequenceStart = startedAt;
    }
    sequenceLast = now;
    tapCount += 1;

    if (tapCount < TRIPLE_TAP_COUNT) {
      return;
    }

    const withinWindow = now - sequenceStart <= TRIPLE_TAP_WINDOW_MS;
    const allowed = options.canActivate?.() ?? true;
    reset();

    if (withinWindow && allowed) {
      options.onActivate();
    }
  }

  function startTap(event: PointerEvent): void {
    if (pointerId !== null) {
      reset();
      return;
    }
    if (!(options.canActivate?.() ?? true) || document.hidden) {
      reset();
      return;
    }
    if (!event.isPrimary || event.button !== 0) {
      reset();
      return;
    }

    const now = performance.now();
    expire(now);
    if (!isPointOnTarget(target, event.clientX, event.clientY)) {
      reset();
      return;
    }

    event.preventDefault();
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startTime = now;
    maxDistance = 0;
    target.setPointerCapture(event.pointerId);
  }

  function moveTap(event: PointerEvent): void {
    if (event.pointerId !== pointerId) {
      return;
    }

    const distance = Math.hypot(event.clientX - startX, event.clientY - startY);
    if (distance > TRIPLE_TAP_MAX_DISTANCE) {
      event.preventDefault();
      reset();
      return;
    }
    maxDistance = Math.max(maxDistance, distance);
  }

  function finishTap(event: PointerEvent): void {
    if (event.pointerId !== pointerId) {
      return;
    }

    const activePointer = pointerId;
    const startedAt = startTime;
    const endDistance = Math.hypot(event.clientX - startX, event.clientY - startY);
    const valid =
      maxDistance <= TRIPLE_TAP_MAX_DISTANCE &&
      endDistance <= TRIPLE_TAP_MAX_DISTANCE &&
      isPointOnTarget(target, event.clientX, event.clientY);

    pointerId = null;
    startTime = 0;
    if (target.hasPointerCapture(activePointer)) {
      target.releasePointerCapture(activePointer);
    }

    if (!valid) {
      reset();
      return;
    }

    event.preventDefault();
    recordTap(startedAt);
  }

  function cancelTap(event: PointerEvent): void {
    if (event.pointerId === pointerId) {
      reset();
    }
  }

  function resetOnOutsidePointer(event: PointerEvent): void {
    if (event.target instanceof Node && target.contains(event.target)) {
      return;
    }
    reset();
  }

  function resetWhenHidden(): void {
    if (document.hidden) {
      reset();
    }
  }

  target.addEventListener('pointerdown', startTap);
  target.addEventListener('pointermove', moveTap);
  target.addEventListener('pointerup', finishTap);
  target.addEventListener('pointercancel', cancelTap);
  target.addEventListener('lostpointercapture', cancelTap);
  document.addEventListener('pointerdown', resetOnOutsidePointer, true);
  document.addEventListener('visibilitychange', resetWhenHidden);
  window.addEventListener('blur', reset);

  return {
    reset,
    dispose(): void {
      reset();
      target.removeEventListener('pointerdown', startTap);
      target.removeEventListener('pointermove', moveTap);
      target.removeEventListener('pointerup', finishTap);
      target.removeEventListener('pointercancel', cancelTap);
      target.removeEventListener('lostpointercapture', cancelTap);
      document.removeEventListener('pointerdown', resetOnOutsidePointer, true);
      document.removeEventListener('visibilitychange', resetWhenHidden);
      window.removeEventListener('blur', reset);
    },
  };
}

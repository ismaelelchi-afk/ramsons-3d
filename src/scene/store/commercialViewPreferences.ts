import {
  COMMERCIAL_VIEWS,
  type CommercialViewId,
  type CommercialViewPose,
} from './commercialCamera';

const STORAGE_KEY = 'ramstore3d.commercial-view-poses.v1';
const MIN_TARGET_DISTANCE = 0.0001;

type StoredPoses = Partial<Record<CommercialViewId, CommercialViewPose>>;

function cloneTriple(value: readonly [number, number, number]): [number, number, number] {
  return [value[0], value[1], value[2]];
}

function isFiniteTriple(value: unknown): value is readonly [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))
  );
}

function parsePose(value: unknown): CommercialViewPose | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as { position?: unknown; target?: unknown };
  if (!isFiniteTriple(candidate.position) || !isFiniteTriple(candidate.target)) {
    return null;
  }

  const dx = candidate.target[0] - candidate.position[0];
  const dy = candidate.target[1] - candidate.position[1];
  const dz = candidate.target[2] - candidate.position[2];
  if (Math.hypot(dx, dy, dz) < MIN_TARGET_DISTANCE) {
    return null;
  }

  return {
    position: cloneTriple(candidate.position),
    target: cloneTriple(candidate.target),
  };
}

function readStoredPoses(): StoredPoses {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const poses: StoredPoses = {};
    for (const view of COMMERCIAL_VIEWS) {
      const pose = parsePose((parsed as Record<string, unknown>)[view.id]);
      if (pose) poses[view.id] = pose;
    }
    return poses;
  } catch {
    return {};
  }
}

function writeStoredPoses(poses: StoredPoses): boolean {
  try {
    if (Object.keys(poses).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(poses));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Personalizaciones locales de las siete vistas comerciales. Solo se guardan posición y
 * objetivo; etiquetas, FOV y duración permanecen en `COMMERCIAL_VIEWS`.
 */
export class CommercialViewPreferences {
  private poses: StoredPoses = readStoredPoses();

  get(id: CommercialViewId): CommercialViewPose | undefined {
    const pose = this.poses[id];
    if (!pose) return undefined;
    return {
      position: cloneTriple(pose.position),
      target: cloneTriple(pose.target),
    };
  }

  has(id: CommercialViewId): boolean {
    return this.poses[id] !== undefined;
  }

  save(id: CommercialViewId, pose: CommercialViewPose): boolean {
    const normalized = parsePose(pose);
    if (!normalized) return false;

    const next: StoredPoses = {
      ...this.poses,
      [id]: normalized,
    };
    if (!writeStoredPoses(next)) return false;

    this.poses = next;
    return true;
  }

  remove(id: CommercialViewId): boolean {
    if (!this.poses[id]) return true;

    const next: StoredPoses = { ...this.poses };
    delete next[id];
    if (!writeStoredPoses(next)) return false;

    this.poses = next;
    return true;
  }
}

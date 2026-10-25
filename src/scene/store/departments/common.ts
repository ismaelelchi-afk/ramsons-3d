import type { Material } from 'three';
import type { StoreContext } from '../context';

/** Parche de suelo de un departamento con un fino perfil rojo en el borde. */
export function zonePatch(
  { batch: b, mats: m }: StoreContext,
  material: Material,
  cx: number,
  cz: number,
  w: number,
  d: number,
): void {
  b.box(material, w, 0.014, d, cx, 0.007, cz);
  const edge = 0.07;
  b.box(m.red, w, 0.006, edge, cx, 0.017, cz - d / 2 + edge / 2);
  b.box(m.red, w, 0.006, edge, cx, 0.017, cz + d / 2 - edge / 2);
  b.box(m.red, edge, 0.006, d - edge * 2, cx - w / 2 + edge / 2, 0.017, cz);
  b.box(m.red, edge, 0.006, d - edge * 2, cx + w / 2 - edge / 2, 0.017, cz);
}

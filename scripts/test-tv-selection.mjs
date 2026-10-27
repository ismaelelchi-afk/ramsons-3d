import * as THREE from 'three';
import { StoreScene } from '../src/scene/store/storeScene';
import { updateStoreFov } from '../src/scene/store/storeCamera';
import { TV_SPECS } from '../src/data/tvSpecs';
import { tvSize } from '../src/scene/store/products/electronics';
import { createTvCard } from '../src/ui/tvCard';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ------------------------------------------------------------------ DOM mínimo

const gradient = { addColorStop() {} };
const context = new Proxy(
  {
    createLinearGradient: () => gradient,
    measureText: (text) => ({ width: text.length * 10 }),
  },
  {
    get(target, key) {
      if (key in target) return target[key];
      return () => {};
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  },
);

class FakeEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.target = init.target ?? null;
    this.key = init.key ?? '';
    this.defaultPrevented = false;
    this.propagationStopped = false;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopPropagation() {
    this.propagationStopped = true;
  }
}

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.className = '';
    this.id = '';
    this.textContent = '';
    this.hidden = false;
    this.type = '';
    this.style = {};
    this.children = [];
    this.parent = null;
    this.attrs = new Map();
    this.listeners = new Map();
  }
  setAttribute(name, value) {
    this.attrs.set(name, String(value));
    if (name === 'id') this.id = String(value);
  }
  append(...nodes) {
    for (const node of nodes) this.appendChild(node);
  }
  appendChild(node) {
    node.parent = this;
    this.children.push(node);
    return node;
  }
  replaceChildren(...nodes) {
    for (const child of this.children) child.parent = null;
    this.children = [];
    this.append(...nodes);
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  removeEventListener(type, listener) {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(type, list.filter((item) => item !== listener));
  }
  dispatchEvent(event) {
    if (!event.target) event.target = this;
    for (const listener of [...(this.listeners.get(event.type) ?? [])]) listener(event);
    return !event.defaultPrevented;
  }
  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }
  focus() {
    document.activeElement = this;
  }
  getContext() {
    return context;
  }
}

const body = new FakeElement('body');
const docListeners = new Map();
const fakeDocument = {
  body,
  activeElement: null,
  createElement: (tag) => new FakeElement(tag),
  addEventListener(type, listener) {
    if (!docListeners.has(type)) docListeners.set(type, []);
    docListeners.get(type).push(listener);
  },
  removeEventListener(type, listener) {
    docListeners.set(type, (docListeners.get(type) ?? []).filter((item) => item !== listener));
  },
};

globalThis.document = fakeDocument;

let fakeNow = 1000;
performance.now = () => fakeNow;

function findByClass(root, className) {
  if (root.className === className) return root;
  for (const child of root.children) {
    const found = findByClass(child, className);
    if (found) return found;
  }
  return null;
}

// ------------------------------------------------------- prueba de las 28 TVs

const store = new StoreScene();
const hits = store.products.tvHits;
const ids = hits.map((hit) => hit.specId);

assert(hits.length === 28, `Se esperaban 28 hit boxes y hay ${hits.length}`);
assert(new Set(ids).size === 28, 'Hay IDs de TV duplicados en los hit boxes');
assert(TV_SPECS.length === 28, `Se esperaban 28 fichas y hay ${TV_SPECS.length}`);

const specById = new Map(TV_SPECS.map((spec) => [spec.id, spec]));
for (const spec of TV_SPECS) {
  assert(ids.includes(spec.id), `La TV ${spec.id} no está registrada`);
}

for (let i = 0; i < hits.length; i += 1) {
  for (let j = i + 1; j < hits.length; j += 1) {
    assert(
      !hits[i].box.intersectsBox(hits[j].box),
      `Los hit boxes de ${hits[i].specId} y ${hits[j].specId} se solapan en 3D`,
    );
  }
}

const GROUP_X = -12.8;
const wallZ = -28 + 0.1025;
const islandZ = -28 + 5.0;
const pedestalZ = -28 + 9.2;
const expected = new Map();

function expect(id, localX, centerY, baseZ) {
  expected.set(id, { x: GROUP_X + localX, y: centerY, z: baseZ });
}

const wall = [
  ['tv-98-0', 0, 2.55],
  ['tv-75-0', -2.215, 2.55],
  ['tv-75-1', 2.215, 2.55],
  ['tv-65-0', -4.065, 2.55],
  ['tv-65-1', 4.065, 2.55],
  ['tv-55-0', -5.694, 2.55],
  ['tv-55-1', 5.694, 2.55],
];
for (const [id, x, y] of wall) expect(id, x, y, wallZ);

[-3.625, -2.175, -0.725, 0.725, 2.175, 3.625].forEach((x, index) => {
  expect(`tv-43-${index}`, x, 3.95, wallZ);
});
[-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6].forEach((x, index) => {
  expect(`tv-32-${index}`, x, 1.5, wallZ);
});

const island55 = tvSize(55).h;
[-3.8, -1.9, 0, 1.9, 3.8].forEach((x, index) => {
  expect(`tv-55-${index + 2}`, x, 0.45 + 0.06984 + island55 / 2, islandZ);
});

const pedestal50 = tvSize(50).h;
[-3.6, 0, 3.6].forEach((x, index) => {
  expect(`tv-50-${index}`, x, 0.8 + 0.09 + pedestal50 / 2, pedestalZ);
});

for (const hit of hits) {
  const spec = specById.get(hit.specId);
  const expectedPlacement = expected.get(hit.specId);
  assert(spec, `Falta la ficha de ${hit.specId}`);
  assert(expectedPlacement, `Falta la posición esperada de ${hit.specId}`);

  const size = tvSize(spec.inches);
  const actual = hit.box.getSize(new THREE.Vector3());
  const center = hit.box.getCenter(new THREE.Vector3());

  assert(Math.abs(actual.x - size.w) < 1e-6, `${hit.specId}: ancho de hit box incorrecto`);
  assert(Math.abs(actual.y - size.h) < 1e-6, `${hit.specId}: alto de hit box incorrecto`);
  assert(Math.abs(actual.z - 0.11) < 1e-6, `${hit.specId}: profundidad de hit box incorrecta`);
  assert(Math.abs(center.x - expectedPlacement.x) < 1e-6, `${hit.specId}: X incorrecta`);
  assert(Math.abs(center.y - expectedPlacement.y) < 1e-6, `${hit.specId}: Y incorrecta`);
  assert(Math.abs(hit.box.max.z - (expectedPlacement.z + 0.05)) < 1e-6, `${hit.specId}: Z/frontal incorrecto`);
}

const VIEW = { left: 0, top: 0, width: 390, height: 844 };
const camera = new THREE.PerspectiveCamera(70, VIEW.width / VIEW.height, 0.1, 200);
updateStoreFov(camera);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function pickAtClient(clientX, clientY) {
  pointer.x = ((clientX - VIEW.left) / VIEW.width) * 2 - 1;
  pointer.y = -((clientY - VIEW.top) / VIEW.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return store.pickTv(raycaster.ray);
}

// Cámara siempre por delante de la TV y antes de cualquier otra TV que pueda
// quedar en medio (la oclusión física real no se fuerza en esta prueba).
const poses = [];
for (const dz of [2.5, 3, 3.5]) {
  for (const dx of [-1.2, 0, 1.2]) {
    for (const dy of [-0.8, 0, 0.8]) poses.push({ dx, dy, dz });
  }
}

let checks = 0;
for (const hit of hits) {
  const box = hit.box;
  const center = box.getCenter(new THREE.Vector3());
  for (const pose of poses) {
    camera.position.set(center.x + pose.dx, center.y + pose.dy, box.max.z + pose.dz);
    camera.lookAt(center);
    camera.updateMatrixWorld(true);
    for (const fx of [0.2, 0.5, 0.8]) {
      for (const fy of [0.2, 0.5, 0.8]) {
        const sample = new THREE.Vector3(
          THREE.MathUtils.lerp(box.min.x, box.max.x, fx),
          THREE.MathUtils.lerp(box.min.y, box.max.y, fy),
          box.max.z - 1e-4,
        );
        const ndc = sample.clone().project(camera);
        if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) continue;
        const clientX = VIEW.left + ((ndc.x + 1) / 2) * VIEW.width;
        const clientY = VIEW.top + ((1 - ndc.y) / 2) * VIEW.height;
        const picked = pickAtClient(clientX, clientY);
        assert(
          picked === hit.specId,
          `${hit.specId}: el rayo frontal seleccionó ${picked ?? 'ninguna TV'} (pose ${JSON.stringify(pose)})`,
        );
        checks += 1;
      }
    }
  }
}

// ---------------------------------------- prueba del cierre fantasma en táctil

fakeNow = 5000;
let scenePick = null;
const card = createTvCard({ onSceneTap: () => scenePick });
const backdrop = findByClass(body, 'tv-card-backdrop');
const closeButton = findByClass(backdrop, 'tv-card-close');
const cardTitle = findByClass(backdrop, 'tv-card-title');
const cta = findByClass(backdrop, 'tv-card-cta');
assert(backdrop && closeButton && cardTitle && cta, 'No se pudo montar la ficha de TV');

card.open(TV_SPECS[0]);
assert(card.isOpen(), 'La ficha no se abrió');
assert(
  cta.href === 'https://www.ramsons.com.br/eletronicos/televisores',
  'La ficha no usa la categoría oficial de respaldo',
);

card.open(specById.get('tv-50-0'));
assert(
  cardTitle.textContent === 'TCL 50P7K QLED 4K',
  `Título incompleto o con datos no confirmados: ${cardTitle.textContent}`,
);
card.open(specById.get('tv-75-0'));
assert(
  cardTitle.textContent === 'TCL 75P7K QLED 4K Google TV',
  `Título comercial incorrecto: ${cardTitle.textContent}`,
);
card.open(specById.get('tv-75-1'));
assert(
  cardTitle.textContent === 'Samsung Vision AI Mini LED 4K',
  `Título pendiente incorrecto: ${cardTitle.textContent}`,
);

const productUrl = 'https://www.ramsons.com.br/produto/televisor-teste';
card.open({ ...TV_SPECS[0], productUrl });
assert(cta.href === productUrl, 'La ficha no usa la URL específica confirmada');
card.open({ ...TV_SPECS[0], productUrl: 'https://example.com/televisor' });
assert(
  cta.href === 'https://www.ramsons.com.br/eletronicos/televisores',
  'La ficha aceptó una URL que no es oficial de RAMSONS',
);

for (const spec of TV_SPECS) {
  card.open(spec);
  assert(cardTitle.textContent !== 'Por confirmar', `La ficha de ${spec.id} muestra un modelo sin confirmar`);
  assert(cardTitle.textContent.startsWith(`${spec.brand} `), `La ficha de ${spec.id} no incluye la marca`);
}
card.open(TV_SPECS[0]);

backdrop.dispatchEvent(new FakeEvent('click', { target: backdrop }));
assert(card.isOpen(), 'Un clic fantasma sobre el backdrop cerró la ficha');

fakeNow += 600;
scenePick = TV_SPECS[1];
backdrop.dispatchEvent(new FakeEvent('pointerdown', { target: backdrop }));
assert(card.isOpen(), 'Tocar otra TV cerró la ficha en lugar de actualizarla');
assert(cardTitle.textContent === 'TCL 75P7K QLED 4K Google TV', 'La ficha no se actualizó al tocar otra TV');

scenePick = null;
backdrop.dispatchEvent(new FakeEvent('pointerdown', { target: backdrop }));
assert(!card.isOpen(), 'Un toque deliberado fuera de la ficha no la cerró');

card.open(TV_SPECS[1]);
closeButton.dispatchEvent(new FakeEvent('click', { target: closeButton }));
assert(card.isOpen(), 'Un clic fantasma sobre la X cerró la ficha');
fakeNow += 600;
closeButton.dispatchEvent(new FakeEvent('click', { target: closeButton }));
assert(!card.isOpen(), 'La X no cerró la ficha');
card.dispose();
store.dispose();

console.log(
  `OK: 28 TVs registradas, 28 fichas, ${checks} selecciones correctas desde ${poses.length} poses por TV, sin solapes 3D, títulos comerciales, ficha actualizable sin cerrar, URLs oficiales y cierre fantasma bloqueado.`,
);

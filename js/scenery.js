import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';

// Track-side decoration: instanced props scattered outside the barriers.
// Each kind: geometry (base at y = 0), colour palette, size range (footprint radius), share of the count.
const cone = (r, h, seg = 8) => new THREE.ConeGeometry(r, h, seg).translate(0, h / 2, 0);
const ball = (r, y = r) => new THREE.IcosahedronGeometry(r, 1).translate(0, y, 0);
const rock = (r) => new THREE.DodecahedronGeometry(r, 0).translate(0, r * 0.6, 0);
const cactus = () => {
  const parts = [
    new THREE.CylinderGeometry(0.7, 0.8, 5, 8).translate(0, 2.5, 0),
    new THREE.CylinderGeometry(0.45, 0.45, 2.4, 6).rotateZ(Math.PI / 2).translate(-1.3, 2.6, 0),
    new THREE.CylinderGeometry(0.45, 0.45, 2, 6).translate(-2.2, 3.6, 0),
    new THREE.CylinderGeometry(0.45, 0.45, 2.4, 6).rotateZ(Math.PI / 2).translate(1.3, 3.2, 0),
    new THREE.CylinderGeometry(0.45, 0.45, 1.8, 6).translate(2.2, 4.1, 0),
  ];
  return mergeGeometries(parts);
};

function mergeGeometries(list) {
  const geos = list.map((g) => g.toNonIndexed());
  const total = geos.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o);
    nor.set(g.attributes.normal.array, o);
    o += g.attributes.position.array.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

const THEMES = {
  forest: [
    { geo: () => cone(1, 2.6), colors: [0x2e7d32, 0x388e3c, 0x1b5e20], size: [2.6, 4.6], share: 0.55 },
    { geo: () => ball(1, 1.2), colors: [0x43a047, 0x558b2f, 0x66bb6a], size: [2.2, 3.8], share: 0.3 },
    { geo: () => rock(1), colors: [0x90a4ae, 0x78909c], size: [1.2, 2.4], share: 0.15 },
  ],
  desert: [
    { geo: cactus, colors: [0x558b2f, 0x689f38], size: [1.2, 1.9], share: 0.3, lock: true },
    { geo: () => rock(1), colors: [0xa1887f, 0x8d6e63, 0xbcaaa4], size: [1.6, 4.5], share: 0.5 },
    { geo: () => ball(1, 0.6), colors: [0x9e9d24, 0xafb42b], size: [1, 2], share: 0.2 },
  ],
  snow: [
    { geo: () => cone(1, 3.4, 7), colors: [0x1b5e20, 0x2e5d3a, 0x33691e], size: [2.2, 4], share: 0.55 },
    { geo: () => rock(1), colors: [0xeceff1, 0xcfd8dc, 0xb0bec5], size: [1.6, 5], share: 0.35 },
    { geo: () => ball(1, 0.5), colors: [0xffffff, 0xe3f2fd], size: [1.5, 3], share: 0.1 },
  ],
  city: [
    { geo: () => new THREE.BoxGeometry(1.8, 1, 1.8).translate(0, 0.5, 0), colors: [0x546e7a, 0x607d8b, 0x78909c, 0x8d6e63, 0x455a64, 0xa1887f], size: [7, 13], share: 1, tall: [8, 36] },
  ],
};

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function buildScenery(data, theme, seed = 1) {
  const kinds = THEMES[theme];
  const group = new THREE.Group();
  if (!kinds) return group;
  const S = CONFIG.scenery;
  const P = data.points;
  const rand = rng(seed);
  const clear = data.wallDist + S.margin;

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of P) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  minX -= S.spread; maxX += S.spread; minZ -= S.spread; maxZ += S.spread;

  // Bucket centreline samples so each candidate checks only nearby ones
  const cell = 40;
  const grid = new Map();
  const key = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  for (const p of P) {
    const k = key(p.x, p.z);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(p);
  }
  const nearest = (x, z) => {
    let best = Infinity;
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (const p of grid.get(`${cx + i},${cz + j}`) ?? []) best = Math.min(best, Math.hypot(p.x - x, p.z - z));
      }
    }
    return best;
  };

  const placed = []; // [x, z, r] for spacing between props
  const picks = kinds.map(() => []);
  const target = Math.round(((maxX - minX) * (maxZ - minZ)) * S.density);
  for (let n = 0; n < target * 3 && placed.length < target; n++) {
    const x = minX + rand() * (maxX - minX);
    const z = minZ + rand() * (maxZ - minZ);
    let r = rand(), ki = 0;
    while (ki < kinds.length - 1 && r > kinds[ki].share) { r -= kinds[ki].share; ki++; }
    const k = kinds[ki];
    const size = k.size[0] + rand() * (k.size[1] - k.size[0]);
    const reach = k.tall ? size * 1.45 : size;
    if (nearest(x, z) < clear + reach) continue;
    if (placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + reach + 1)) continue;
    placed.push([x, z, reach]);
    picks[ki].push({ x, z, size, rot: rand() * Math.PI * 2, tint: rand(), h: k.tall ? k.tall[0] + rand() * (k.tall[1] - k.tall[0]) : 0 });
  }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  kinds.forEach((k, ki) => {
    const list = picks[ki];
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(k.geo(), new THREE.MeshLambertMaterial({ color: 0xffffff }), list.length);
    list.forEach((it, i) => {
      q.setFromAxisAngle(up, k.lock ? 0 : it.rot);
      pos.set(it.x, 0, it.z);
      if (k.tall) sc.set(it.size, it.h, it.size); else sc.setScalar(it.size);
      mesh.setMatrixAt(i, m.compose(pos, q, sc));
      mesh.setColorAt(i, col.setHex(k.colors[Math.floor(it.tint * k.colors.length)]));
    });
    group.add(mesh);
  });
  return group;
}

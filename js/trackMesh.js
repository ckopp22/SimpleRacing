import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';

// Builds a mesh from quads: each quad = 4 Vector3 [a,b,c,d] (+ optional color)
function quadsGeometry(quads, colors, uvs) {
  const pos = [];
  const col = [];
  const uv = [];
  const idx = [];
  quads.forEach((q, i) => {
    const base = i * 4;
    q.forEach((v) => pos.push(v.x, v.y, v.z));
    if (colors) {
      const c = new THREE.Color(colors[i]);
      for (let k = 0; k < 4; k++) col.push(c.r, c.g, c.b);
    }
    if (uvs) uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  if (uvs) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function offset(p, n, d, y) {
  return new THREE.Vector3(p.x + n.x * d, y, p.z + n.z * d);
}

function checkerTexture(cells) {
  const [cx, cy] = cells;
  const s = 32;
  const c = document.createElement('canvas');
  c.width = cx * s;
  c.height = cy * s;
  const g = c.getContext('2d');
  for (let y = 0; y < cy; y++) {
    for (let x = 0; x < cx; x++) {
      g.fillStyle = (x + y) % 2 ? '#111' : '#fff';
      g.fillRect(x * s, y * s, s, s);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  return t;
}

// Ground + asphalt ribbon + kerbs + start/finish strip. 4 draw calls.
export function buildTrackMesh(data, cfg = CONFIG.track, world = CONFIG.world) {
  const group = new THREE.Group();
  const { points, normals, count, width } = data;
  const half = width / 2;
  const at = (i) => i % count;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(world.groundSize, world.groundSize),
    new THREE.MeshLambertMaterial({ color: world.groundColor })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const road = [];
  const kerbs = [];
  const kerbCols = [];
  for (let i = 0; i < count; i++) {
    const j = at(i + 1);
    road.push([
      offset(points[i], normals[i], half, world.trackY),
      offset(points[i], normals[i], -half, world.trackY),
      offset(points[j], normals[j], -half, world.trackY),
      offset(points[j], normals[j], half, world.trackY),
    ]);
    const color = cfg.kerbColors[Math.floor(i / cfg.kerbRunSamples) % 2];
    for (const side of [1, -1]) {
      const inner = half * side;
      const outer = (half + cfg.kerbWidth) * side;
      kerbs.push([
        offset(points[i], normals[i], inner, world.kerbY),
        offset(points[i], normals[i], outer, world.kerbY),
        offset(points[j], normals[j], outer, world.kerbY),
        offset(points[j], normals[j], inner, world.kerbY),
      ]);
      kerbCols.push(color);
    }
  }
  group.add(new THREE.Mesh(
    quadsGeometry(road),
    new THREE.MeshLambertMaterial({ color: cfg.asphaltColor, side: THREE.DoubleSide })
  ));
  group.add(new THREE.Mesh(
    quadsGeometry(kerbs, kerbCols),
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
  ));

  // Start/finish strip centred on sample 0
  const p = points[0];
  const n = normals[0];
  const t = new THREE.Vector3(-n.z, 0, n.x); // forward
  const d = cfg.startDepth / 2;
  const a = offset(p, n, half, world.startY).addScaledVector(t, -d);
  const b = offset(p, n, -half, world.startY).addScaledVector(t, -d);
  const c = offset(p, n, -half, world.startY).addScaledVector(t, d);
  const e = offset(p, n, half, world.startY).addScaledVector(t, d);
  group.add(new THREE.Mesh(
    quadsGeometry([[a, b, c, e]], null, true),
    new THREE.MeshBasicMaterial({ map: checkerTexture(cfg.startCells), side: THREE.DoubleSide })
  ));

  return group;
}

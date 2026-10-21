import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';

// Track data: centreline samples, tangents, and on-track queries.
export function createTrackData(cfg = CONFIG.track) {
  const curve = new THREE.CatmullRomCurve3(
    cfg.points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'centripetal'
  );
  const pts = curve.getSpacedPoints(cfg.samples).slice(0, cfg.samples);
  const n = pts.length;
  const tangents = pts.map((p, i) => {
    const a = pts[(i + n - 1) % n];
    const b = pts[(i + 1) % n];
    return new THREE.Vector3().subVectors(b, a).setY(0).normalize();
  });
  // Left of travel direction (viewed from above) = (-tz... ) in XZ plane
  const normals = tangents.map((t) => new THREE.Vector3(t.z, 0, -t.x));
  return {
    curve, points: pts, tangents, normals, count: n, width: cfg.width,
    edge: cfg.width / 2 + cfg.kerbWidth, // kerbs still count as road
    wallDist: cfg.wallDist,
  };
}

const SEARCH = 25; // samples either side of the hint

// Closest point on the centreline to (x, z). Pass the previous index as hint
// for a local search; omit it for a full scan.
// Returns { index, dist, nx, nz (unit vector centreline -> car), side (+ = left) }
export function queryTrack(data, x, z, hint = -1) {
  const P = data.points;
  const n = data.count;
  const lo = hint < 0 ? 0 : hint - SEARCH;
  const hi = hint < 0 ? n - 1 : hint + SEARCH;
  let index = 0;
  let best = Infinity;
  for (let k = lo; k <= hi; k++) {
    const i = ((k % n) + n) % n;
    const dx = x - P[i].x;
    const dz = z - P[i].z;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) { best = d2; index = i; }
  }
  // Refine by projecting onto the two segments touching the nearest sample
  let cx = P[index].x;
  let cz = P[index].z;
  best = (x - cx) ** 2 + (z - cz) ** 2;
  for (const j of [(index + n - 1) % n, (index + 1) % n]) {
    const ax = P[index].x, az = P[index].z;
    const ex = P[j].x - ax, ez = P[j].z - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)));
    const px = ax + ex * t, pz = az + ez * t;
    const d2 = (x - px) ** 2 + (z - pz) ** 2;
    if (d2 < best) { best = d2; cx = px; cz = pz; }
  }
  const dist = Math.sqrt(best);
  const nx = dist > 1e-6 ? (x - cx) / dist : 0;
  const nz = dist > 1e-6 ? (z - cz) / dist : 0;
  const side = (x - cx) * data.normals[index].x + (z - cz) * data.normals[index].z;
  return { index, dist, nx, nz, side };
}

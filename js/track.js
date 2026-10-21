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
  return { curve, points: pts, tangents, normals, count: n, width: cfg.width };
}

import { CONFIG } from './config.js';

// Car-vs-car: each car is a few circles along its length. Per pair, resolve
// the deepest overlap only: push apart equally, swap some momentum, lose a bit of speed.
export function resolveCars(cars, cfg = CONFIG.collision) {
  const r2 = cfg.radius * 2;
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      const ax = a.x - b.x;
      const az = a.z - b.z;
      const reach = r2 + cfg.circles[cfg.circles.length - 1] * 2;
      if (ax * ax + az * az > reach * reach) continue; // far apart

      const afx = Math.sin(a.heading), afz = Math.cos(a.heading);
      const bfx = Math.sin(b.heading), bfz = Math.cos(b.heading);
      let depth = 0;
      let nx = 0;
      let nz = 0;
      for (const ca of cfg.circles) {
        for (const cb of cfg.circles) {
          const dx = a.x + afx * ca - (b.x + bfx * cb);
          const dz = a.z + afz * ca - (b.z + bfz * cb);
          const d = Math.hypot(dx, dz);
          if (d < r2 && r2 - d > depth) {
            depth = r2 - d;
            if (d > 1e-6) { nx = dx / d; nz = dz / d; } else { nx = afx; nz = afz; }
          }
        }
      }
      if (depth === 0) continue;

      // n points from b to a
      a.x += nx * depth / 2;
      a.z += nz * depth / 2;
      b.x -= nx * depth / 2;
      b.z -= nz * depth / 2;

      const vn = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz; // < 0 = closing
      if (vn < 0) {
        const j = -(1 + cfg.restitution) * vn / 2;
        a.vx += nx * j; a.vz += nz * j;
        b.vx -= nx * j; b.vz -= nz * j;
        const keep = 1 - cfg.speedLoss;
        a.vx *= keep; a.vz *= keep;
        b.vx *= keep; b.vz *= keep;
        a.speed = a.vx * afx + a.vz * afz;
        b.speed = b.vx * bfx + b.vz * bfz;
      }
    }
  }
}

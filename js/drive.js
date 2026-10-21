import { CONFIG } from './config.js';
import { stepCar, ROAD } from './car.js';
import { queryTrack } from './track.js';

// One physics step for any car: surface grip/speed, then barrier push-back.
export function driveCar(track, car, controls, dt, c = CONFIG.car) {
  const before = queryTrack(track, car.x, car.z, car.hint);
  stepCar(car, controls, dt, before.dist <= track.edge ? ROAD : c.grass);

  const q = queryTrack(track, car.x, car.z, before.index);
  car.hint = q.index;
  car.onTrack = q.dist <= track.edge;

  const limit = track.wallDist - c.radius;
  if (q.dist <= limit) return;
  car.x -= q.nx * (q.dist - limit);
  car.z -= q.nz * (q.dist - limit);
  const vn = car.vx * q.nx + car.vz * q.nz; // speed into the wall
  if (vn > 0) {
    car.vx -= q.nx * vn * CONFIG.track.wallKill;
    car.vz -= q.nz * vn * CONFIG.track.wallKill;
  }
  const scrape = Math.exp(-CONFIG.track.wallScrape * dt);
  car.vx *= scrape;
  car.vz *= scrape;
  car.speed = car.vx * Math.sin(car.heading) + car.vz * Math.cos(car.heading);
}

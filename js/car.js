import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function box(w, h, l, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, l),
    new THREE.MeshLambertMaterial({ color })
  );
  m.position.set(x, y, z);
  return m;
}

// Mesh faces +Z (heading 0). Low-poly: body, windshield, 4 wheels.
function buildMesh(color, c = CONFIG.car) {
  const g = new THREE.Group();
  const wheelR = 0.45;
  g.add(box(c.width, c.height * 0.6, c.length, color, 0, wheelR + 0.2, 0));
  g.add(box(c.width * 0.8, c.height * 0.5, c.length * 0.35, 0x263238, 0, wheelR + 0.65, -c.length * 0.05));
  const wheels = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const w = box(0.4, wheelR * 2, 0.9, 0x111111, sx * (c.width / 2 + 0.05), wheelR, sz * c.length * 0.3);
      g.add(w);
      if (sz > 0) wheels.push(w); // front wheels
    }
  }
  g.userData.frontWheels = wheels;
  return g;
}

export function createCar({ color, x = 0, z = 0, heading = 0 }) {
  const car = {
    x, z, heading,
    vx: 0, vz: 0, // world velocity
    speed: 0, // signed forward speed
    steer: 0, // smoothed steer input
    prev: { x, z, heading },
    mesh: buildMesh(color),
  };
  syncCar(car, 1);
  return car;
}

// One fixed physics step. controls = { throttle, brake, steer }
export function stepCar(car, controls, dt, c = CONFIG.car) {
  car.prev.x = car.x;
  car.prev.z = car.z;
  car.prev.heading = car.heading;

  // Steering: smooth the input, turn rate scales with speed
  car.steer += (controls.steer - car.steer) * Math.min(1, c.steerSmooth * dt);
  const speedFrac = clamp(Math.abs(car.speed) / c.turnSpeedRef, 0, 1);
  const topFrac = clamp(Math.abs(car.speed) / c.maxSpeed, 0, 1);
  const dir = car.speed >= 0 ? 1 : -1;
  car.heading -= car.steer * c.turnRate * speedFrac * (1 - c.highSpeedTurn * topFrac) * dir * dt;

  // Split velocity into forward/lateral in the new heading basis
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  const rx = -fz, rz = fx;
  let fs = car.vx * fx + car.vz * fz;
  let lat = car.vx * rx + car.vz * rz;

  // Throttle / brake / reverse
  if (controls.throttle > 0) fs += c.accel * controls.throttle * (1 - clamp(fs / c.maxSpeed, 0, 1)) * dt;
  if (controls.brake > 0) {
    if (fs > 0.5) fs = Math.max(0, fs - c.brake * controls.brake * dt);
    else fs = Math.max(-c.reverseMax, fs - c.reverseAccel * controls.brake * dt);
  }

  // Drag + coast-down friction (never flips the sign of fs)
  const sign = Math.sign(fs);
  let loss = Math.abs(fs) * c.drag * dt;
  if (controls.throttle === 0 && controls.brake === 0) loss += c.rolling * dt;
  fs = sign * Math.max(0, Math.abs(fs) - loss);

  // Grip: bleed off sideways velocity
  lat *= Math.exp(-c.grip * dt);

  car.vx = fx * fs + rx * lat;
  car.vz = fz * fs + rz * lat;
  car.speed = fs;
  car.x += car.vx * dt;
  car.z += car.vz * dt;
}

// Place the mesh, interpolating between the last two physics states
export function syncCar(car, alpha) {
  const p = car.prev;
  car.mesh.position.x = p.x + (car.x - p.x) * alpha;
  car.mesh.position.z = p.z + (car.z - p.z) * alpha;
  car.mesh.rotation.y = p.heading + (car.heading - p.heading) * alpha;
  const wheelAngle = -car.steer * 0.45;
  for (const w of car.mesh.userData.frontWheels) w.rotation.y = wheelAngle;
}

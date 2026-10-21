import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';

const E = CONFIG.effects;
const rand = (a, b) => a + Math.random() * (b - a);

function softDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

// Tyre marks (ring buffer of fading quads) and dust puffs (ring buffer of points).
// 2 draw calls total.
export function createEffects(scene) {
  // ---- skid marks
  const N = E.skidSegments;
  const skidPos = new Float32Array(N * 12);
  const skidCol = new Float32Array(N * 16);
  const idx = [];
  for (let i = 0; i < N; i++) idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  const skidGeo = new THREE.BufferGeometry();
  skidGeo.setAttribute('position', new THREE.BufferAttribute(skidPos, 3).setUsage(THREE.DynamicDrawUsage));
  skidGeo.setAttribute('color', new THREE.BufferAttribute(skidCol, 4).setUsage(THREE.DynamicDrawUsage));
  skidGeo.setIndex(idx);
  const skidMesh = new THREE.Mesh(skidGeo, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  skidMesh.frustumCulled = false;
  scene.add(skidMesh);
  const born = new Float32Array(N).fill(-1e9);
  const lastPt = new Map(); // wheel key -> {x, z}
  let head = 0;
  let time = 0;

  function addSkid(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const px = (-dz / len) * E.skidWidth / 2, pz = (dx / len) * E.skidWidth / 2;
    const o = head * 12;
    const pts = [x0 + px, z0 + pz, x0 - px, z0 - pz, x1 - px, z1 - pz, x1 + px, z1 + pz];
    for (let k = 0; k < 4; k++) {
      skidPos[o + k * 3] = pts[k * 2];
      skidPos[o + k * 3 + 1] = E.skidY;
      skidPos[o + k * 3 + 2] = pts[k * 2 + 1];
    }
    born[head] = time;
    head = (head + 1) % N;
  }

  // ---- dust
  const D = E.dustMax;
  const dustPos = new Float32Array(D * 3).fill(-1000);
  const dustCol = new Float32Array(D * 4);
  const dustVel = new Float32Array(D * 2);
  const dustAge = new Float32Array(D).fill(1e9);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3).setUsage(THREE.DynamicDrawUsage));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 4).setUsage(THREE.DynamicDrawUsage));
  const dustMat = new THREE.PointsMaterial({
    size: 20, sizeAttenuation: false, map: softDot(), vertexColors: true, transparent: true, depthWrite: false,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);
  let dustHead = 0;
  const dustAcc = new Map(); // car -> fractional spawn counter

  function spawnDust(x, z, vx, vz) {
    const i = dustHead;
    dustHead = (dustHead + 1) % D;
    dustPos[i * 3] = x;
    dustPos[i * 3 + 1] = E.dustY;
    dustPos[i * 3 + 2] = z;
    dustVel[i * 2] = vx * 0.2 + rand(-E.dustSpread, E.dustSpread);
    dustVel[i * 2 + 1] = vz * 0.2 + rand(-E.dustSpread, E.dustSpread);
    dustAge[i] = 0;
  }

  const L = CONFIG.car.length;
  const W = CONFIG.car.width;

  function update(dt, cars) {
    time += dt;
    cars.forEach((car, ci) => {
      const m = car.mesh;
      const fx = Math.sin(m.rotation.y), fz = Math.cos(m.rotation.y);
      const rx = -fz, rz = fx;
      const speed = Math.abs(car.speed);
      const marking = car.onTrack === true && speed > 6 &&
        (car.slip > E.skidSlip || (car.braking && car.speed > E.brakeSkidSpeed));
      for (const side of [-1, 1]) {
        const x = m.position.x - fx * L * 0.3 + rx * side * (W / 2);
        const z = m.position.z - fz * L * 0.3 + rz * side * (W / 2);
        const key = ci * 2 + (side > 0 ? 1 : 0);
        const prev = lastPt.get(key);
        if (!marking) {
          lastPt.delete(key);
        } else if (!prev) {
          lastPt.set(key, { x, z });
        } else {
          const d = Math.hypot(x - prev.x, z - prev.z);
          if (d > E.skidMaxJump) lastPt.set(key, { x, z });
          else if (d >= E.skidMinStep) {
            addSkid(prev.x, prev.z, x, z);
            lastPt.set(key, { x, z });
          }
        }
      }
      // dust while on grass
      if (car.onTrack === false && speed > 8) {
        const n = (dustAcc.get(car) || 0) + E.dustRate * Math.min(1, speed / 40) * dt;
        const whole = Math.floor(n);
        dustAcc.set(car, n - whole);
        for (let k = 0; k < whole; k++) {
          const side = Math.random() < 0.5 ? -1 : 1;
          spawnDust(m.position.x - fx * L * 0.3 + rx * side * (W / 2), m.position.z - fz * L * 0.3 + rz * side * (W / 2), car.vx, car.vz);
        }
      }
    });

    // fade marks
    for (let i = 0; i < N; i++) {
      const a = E.skidAlpha * Math.max(0, 1 - (time - born[i]) / E.skidLife);
      for (let k = 0; k < 4; k++) {
        const o = i * 16 + k * 4;
        skidCol[o] = skidCol[o + 1] = skidCol[o + 2] = 0.05;
        skidCol[o + 3] = a;
      }
    }
    skidGeo.attributes.position.needsUpdate = true;
    skidGeo.attributes.color.needsUpdate = true;

    // move and fade dust
    for (let i = 0; i < D; i++) {
      dustAge[i] += dt;
      const life = dustAge[i] / E.dustLife;
      if (life >= 1) {
        dustCol[i * 4 + 3] = 0;
        continue;
      }
      dustPos[i * 3] += dustVel[i * 2] * dt;
      dustPos[i * 3 + 2] += dustVel[i * 2 + 1] * dt;
      dustCol[i * 4] = 0.78;
      dustCol[i * 4 + 1] = 0.68;
      dustCol[i * 4 + 2] = 0.46;
      dustCol[i * 4 + 3] = (1 - life) * E.dustAlpha;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustGeo.attributes.color.needsUpdate = true;
  }

  return {
    update,
    // px per world unit, so dust puffs keep their world size on any screen
    setScale(pxPerUnit) {
      dustMat.size = E.dustSize * pxPerUnit;
    },
    clear() {
      born.fill(-1e9);
      dustAge.fill(1e9);
      dustCol.fill(0);
      skidCol.fill(0);
      lastPt.clear();
      dustAcc.clear();
      skidGeo.attributes.color.needsUpdate = true;
      dustGeo.attributes.color.needsUpdate = true;
    },
  };
}

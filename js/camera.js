import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';

// Top-down orthographic camera on +Y looking at -Y, north (-Z) is screen up.
export function createCamera() {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  cam.up.set(0, 0, -1);
  cam.position.set(0, CONFIG.camera.height, 0);
  cam.lookAt(0, 0, 0);
  return cam;
}

const touch = matchMedia('(pointer: coarse)');

// World units visible top to bottom
export const viewHeight = () => (touch.matches ? CONFIG.camera.viewHeightTouch : CONFIG.camera.viewHeight);

export function resizeCamera(cam, w, h) {
  const halfH = viewHeight() / 2;
  const halfW = halfH * (w / h);
  cam.left = -halfW;
  cam.right = halfW;
  cam.top = halfH;
  cam.bottom = -halfH;
  cam.updateProjectionMatrix();
}

// Camera position = smoothed base + decaying random shake
export function snapCamera(cam, x, z) {
  cam.userData.base = { x, z };
  cam.userData.shake = 0;
  cam.position.x = x;
  cam.position.z = z;
}

export function shakeCamera(cam, amount) {
  cam.userData.shake = Math.min(CONFIG.camera.shakeMax, Math.max(cam.userData.shake || 0, amount));
}

export function followCamera(cam, x, z, dt) {
  const u = cam.userData;
  u.base ??= { x: cam.position.x, z: cam.position.z };
  const k = 1 - Math.exp(-CONFIG.camera.follow * dt);
  u.base.x += (x - u.base.x) * k;
  u.base.z += (z - u.base.z) * k;
  u.shake = (u.shake || 0) * Math.exp(-CONFIG.camera.shakeDecay * dt);
  cam.position.x = u.base.x + (Math.random() * 2 - 1) * u.shake;
  cam.position.z = u.base.z + (Math.random() * 2 - 1) * u.shake;
}

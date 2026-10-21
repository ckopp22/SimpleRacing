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

export function resizeCamera(cam, w, h) {
  const halfH = CONFIG.camera.viewHeight / 2;
  const halfW = halfH * (w / h);
  cam.left = -halfW;
  cam.right = halfW;
  cam.top = halfH;
  cam.bottom = -halfH;
  cam.updateProjectionMatrix();
}

export function followCamera(cam, x, z, dt) {
  const k = 1 - Math.exp(-CONFIG.camera.follow * dt);
  cam.position.x += (x - cam.position.x) * k;
  cam.position.z += (z - cam.position.z) * k;
}

import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.render.maxPixelRatio));
renderer.setClearColor(CONFIG.render.clearColor);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(CONFIG.scaffold.cameraFov, 1, 0.1, 100);
camera.position.z = CONFIG.scaffold.cameraDistance;

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(3, 5, 4);
scene.add(sun);

const s = CONFIG.scaffold.cubeSize;
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(s, s, s),
  new THREE.MeshStandardMaterial({ color: CONFIG.scaffold.cubeColor })
);
scene.add(cube);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  cube.rotation.x += CONFIG.scaffold.cubeSpinSpeed * dt;
  cube.rotation.y += CONFIG.scaffold.cubeSpinSpeed * dt;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

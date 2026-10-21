import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { createTrackData } from './track.js';
import { buildTrackMesh } from './trackMesh.js';
import { createCamera, resizeCamera, followCamera } from './camera.js';
import { createInput } from './input.js';
import { createCar, stepCar, syncCar } from './car.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.render.maxPixelRatio));
renderer.setClearColor(CONFIG.render.clearColor);

const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, CONFIG.light.ambient));
const sun = new THREE.DirectionalLight(0xffffff, CONFIG.light.sun);
sun.position.set(...CONFIG.light.sunPos);
scene.add(sun);

const track = createTrackData();
scene.add(buildTrackMesh(track));
const camera = createCamera();
const input = createInput();

const start = track.points[0];
const fwd = track.tangents[0];
const player = createCar({
  color: CONFIG.player.color,
  x: start.x - fwd.x * CONFIG.player.startBack,
  z: start.z - fwd.z * CONFIG.player.startBack,
  heading: Math.atan2(fwd.x, fwd.z),
});
scene.add(player.mesh);
camera.position.x = player.x;
camera.position.z = player.z;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  resizeCamera(camera, w, h);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

const { step, maxFrame } = CONFIG.loop;
let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min((now - last) / 1000, maxFrame);
  last = now;
  acc += dt;
  while (acc >= step) {
    stepCar(player, input.update(), step);
    acc -= step;
  }
  const alpha = acc / step;
  syncCar(player, alpha);
  const look = CONFIG.camera.lookAhead;
  followCamera(camera, player.mesh.position.x + player.vx * look, player.mesh.position.z + player.vz * look, dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { createTrackData } from './track.js';
import { buildTrackMesh } from './trackMesh.js';
import { createCamera, resizeCamera, followCamera } from './camera.js';

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
camera.position.x = track.points[0].x;
camera.position.z = track.points[0].z;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  resizeCamera(camera, w, h);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

// M2 only: camera tours the centreline so the whole track can be inspected.
let last = performance.now();
let dist = 0;
const lengthPerSample = track.curve.getLength() / track.count;
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  dist += CONFIG.camera.demoSpeed * dt;
  const p = track.points[Math.floor(dist / lengthPerSample) % track.count];
  followCamera(camera, p.x, p.z, dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

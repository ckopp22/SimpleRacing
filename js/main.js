import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { createTrackData, queryTrack } from './track.js';
import { buildTrackMesh } from './trackMesh.js';
import { createCamera, resizeCamera, followCamera } from './camera.js';
import { createInput } from './input.js';
import { createCar, syncCar } from './car.js';
import { buildSpeedProfile, createAi, updateAi } from './ai.js';
import { driveCar } from './drive.js';
import { resolveCars } from './collision.js';
import { createRace } from './race.js';
import { createHud } from './ui.js';

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

const profile = buildSpeedProfile(track);

// Grid: slot 0/1 front row left/right, 2/3 second row
function gridSpot(slot) {
  const g = CONFIG.grid;
  const row = slot >> 1;
  const back = CONFIG.player.startBack + row * g.rowGap;
  const lat = (slot & 1 ? -1 : 1) * g.lateral; // normal points left
  const p = track.points[0], t = track.tangents[0], n = track.normals[0];
  return {
    x: p.x - t.x * back + n.x * lat,
    z: p.z - t.z * back + n.z * lat,
    heading: Math.atan2(t.x, t.z),
  };
}
function spawn(color, slot) {
  const car = createCar({ color, ...gridSpot(slot) });
  car.hint = queryTrack(track, car.x, car.z).index;
  scene.add(car.mesh);
  return car;
}

const player = spawn(CONFIG.player.color, CONFIG.grid.playerSlot);
const ais = CONFIG.ai.cars.map((params, i) =>
  createAi(track, spawn(params.color, CONFIG.ai.aiSlots[i]), params, profile));
const cars = [player, ...ais.map((a) => a.car)];
const race = createRace(track, cars);
const hud = createHud();
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
const cd = CONFIG.countdown;
let state = 'COUNTDOWN';
let stateTime = 0;
let last = performance.now();
let acc = 0;

function tick() {
  stateTime += step;
  if (state === 'COUNTDOWN') {
    if (stateTime >= cd.seconds) {
      state = 'RACING';
      stateTime = 0;
    }
    return;
  }
  const pe = race.entries[0];
  driveCar(track, player, input.update(), step);
  ais.forEach((ai, i) => {
    const gap = pe.progress - race.entries[i + 1].progress;
    const rubber = 1 + Math.max(-CONFIG.ai.rubberMax, Math.min(CONFIG.ai.rubberMax, gap * CONFIG.ai.rubberGain));
    driveCar(track, ai.car, updateAi(ai, step, cars, rubber), step);
  });
  resolveCars(cars);
  race.update(step);
}

function countdownText() {
  if (state === 'COUNTDOWN') return String(Math.ceil(cd.seconds - stateTime));
  return stateTime < cd.goShow ? 'GO!' : '';
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, maxFrame);
  last = now;
  acc += dt;
  while (acc >= step) {
    tick();
    acc -= step;
  }
  const alpha = acc / step;
  for (const c of cars) syncCar(c, alpha);
  const look = CONFIG.camera.lookAhead;
  followCamera(camera, player.mesh.position.x + player.vx * look, player.mesh.position.z + player.vz * look, dt);
  hud.setCountdown(countdownText());
  hud.update(race, race.entries[0]);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

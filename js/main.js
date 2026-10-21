import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { createTrackData } from './track.js';
import { buildTrackMesh } from './trackMesh.js';
import { createCamera, resizeCamera, followCamera } from './camera.js';
import { createInput } from './input.js';
import { syncCar } from './car.js';
import { createSession } from './session.js';
import { createHud } from './ui.js';
import { createMenus } from './menus.js';
import { loadSettings, saveSettings, loadBestLap, saveBestLap } from './storage.js';

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
const session = createSession(scene, track);
const settings = loadSettings();
let bestLap = loadBestLap();
let newRecord = false;

// States: MENU, COUNTDOWN, RACING, PAUSED, FINISHED
let state = 'MENU';
let resumeState = 'RACING';
let stateTime = 0;
const cd = CONFIG.countdown;

function snapCamera() {
  camera.position.x = session.player.x;
  camera.position.z = session.player.z;
}

function startRace() {
  session.reset(settings.difficulty);
  newRecord = false;
  snapCamera();
  state = 'COUNTDOWN';
  stateTime = 0;
  menus.hide();
}

function toMenu() {
  session.reset(settings.difficulty);
  snapCamera();
  state = 'MENU';
  menus.showTitle({ best: bestLap, ...settings });
}

function pause() {
  if (state !== 'COUNTDOWN' && state !== 'RACING') return;
  resumeState = state;
  state = 'PAUSED';
  menus.showPause();
}

function resume() {
  if (state !== 'PAUSED') return;
  state = resumeState;
  menus.hide();
}

function finishRace() {
  state = 'FINISHED';
  const { race } = session;
  menus.showResults({
    rows: race.order.map((e) => ({ name: e.car.name, color: e.car.color, time: e.finishTime, you: e.car === session.player })),
    bestLap,
    record: newRecord,
  });
}

const hud = createHud({ onPause: pause });
const menus = createMenus({
  onRace: startRace,
  onDifficulty: (d) => { settings.difficulty = d; saveSettings(settings); },
  onMute: () => { settings.muted = !settings.muted; saveSettings(settings); return settings.muted; },
  onResume: resume,
  onRestart: startRace,
  onQuit: toMenu,
  onAgain: startRace,
  onMenu: toMenu,
});

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Escape' || e.code === 'KeyP') (state === 'PAUSED' ? resume : pause)();
  else if (e.code === 'KeyR' && state !== 'MENU') startRace();
});
// Portrait on a touch device: the CSS rotate overlay shows, the game pauses
matchMedia('(pointer: coarse) and (orientation: portrait)').addEventListener('change', (e) => { if (e.matches) pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

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

function tick() {
  stateTime += step;
  if (state === 'COUNTDOWN') {
    if (stateTime >= cd.seconds) {
      state = 'RACING';
      stateTime = 0;
    }
    return;
  }
  session.tick(step, input.update());
  const best = session.race.entries[0].best;
  if (best !== null && (bestLap === null || best < bestLap)) {
    bestLap = best;
    newRecord = true;
    saveBestLap(bestLap);
  }
  if (session.isOver()) finishRace();
}

function countdownText() {
  if (state === 'COUNTDOWN') return String(Math.ceil(cd.seconds - stateTime));
  return state === 'RACING' && stateTime < cd.goShow ? 'GO!' : '';
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, maxFrame);
  last = now;
  if (state === 'COUNTDOWN' || state === 'RACING') {
    acc += dt;
    while (acc >= step) {
      tick();
      acc -= step;
    }
  }
  const alpha = acc / step;
  for (const c of session.cars) syncCar(c, alpha);
  const p = session.player;
  const look = CONFIG.camera.lookAhead;
  followCamera(camera, p.mesh.position.x + p.vx * look, p.mesh.position.z + p.vz * look, dt);
  hud.setVisible(state !== 'MENU');
  input.setTouchVisible(state === 'COUNTDOWN' || state === 'RACING');
  hud.setCountdown(countdownText());
  hud.update(session.race, session.race.entries[0], bestLap);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

toMenu();
requestAnimationFrame(frame);

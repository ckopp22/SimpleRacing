import * as THREE from '../lib/three.module.min.js';
import { CONFIG, TRACKS } from './config.js';
import { makeTrack, disposeTrack } from './tracks.js';
import { createCamera, resizeCamera, followCamera, snapCamera, shakeCamera, viewHeight } from './camera.js';
import { createInput } from './input.js';
import { syncCar } from './car.js';
import { createSession } from './session.js';
import { createHud } from './ui.js';
import { createMenus } from './menus.js';
import { createEffects } from './effects.js';
import { createAudio } from './audio.js';
import { createGhost } from './ghost.js';
import { createOnline } from './online.js';
import { loadSettings, saveSettings, loadBestLap, saveBestLap, hasWon, saveWin } from './storage.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.render.maxPixelRatio));
renderer.setClearColor(CONFIG.render.clearColor);

const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, CONFIG.light.ambient));
const sun = new THREE.DirectionalLight(0xffffff, CONFIG.light.sun);
sun.position.set(...CONFIG.light.sunPos);
scene.add(sun);

const settings = loadSettings();
let current = makeTrack(Math.max(0, TRACKS.findIndex((t) => t.id === settings.track)));
scene.add(current.mesh);
const camera = createCamera();
const input = createInput();
const soloSession = createSession(scene, current.data, CONFIG.cars.includes(settings.car) ? settings.car : CONFIG.cars[0]);
let session = soloSession; // swapped for the online race session while playing online
const effects = createEffects(scene);
const ghost = createGhost(scene);
const audio = createAudio(settings.muted);
let bestLap = loadBestLap(current.id);
let newRecord = false;

// States: MENU, COUNTDOWN, RACING, PAUSED, FINISHED
let state = 'MENU';
let resumeState = 'RACING';
let stateTime = 0;
const cd = CONFIG.countdown;

function resetView() {
  snapCamera(camera, session.player.x, session.player.z);
  effects.clear();
}

// Swap the circuit; returns the best lap stored for it
function selectTrack(index) {
  scene.remove(current.mesh);
  disposeTrack(current);
  current = makeTrack(index);
  scene.add(current.mesh);
  soloSession.setTrack(current.data);
  settings.track = current.id;
  saveSettings(settings);
  bestLap = loadBestLap(current.id);
  soloSession.reset(settings.difficulty);
  resetView();
  return bestLap;
}

function startRace() {
  soloSession.reset(settings.difficulty);
  ghost.reset(current.id, soloSession.player.spriteId);
  newRecord = false;
  resetView();
  state = 'COUNTDOWN';
  stateTime = 0;
  menus.hide();
}

function toMenu() {
  soloSession.reset(settings.difficulty);
  ghost.reset(current.id, soloSession.player.spriteId);
  resetView();
  state = 'MENU';
  menus.showTitle({ best: bestLap, ...settings, cars: CONFIG.cars, tracks: TRACKS.map((t) => t.name), trackIndex: TRACKS.findIndex((t) => t.id === current.id) });
}

function pause() {
  if (session.net) return online.escape();
  if (state !== 'COUNTDOWN' && state !== 'RACING') return;
  resumeState = state;
  state = 'PAUSED';
  menus.showPause();
}

function resume() {
  if (session.net) return online.escape();
  if (state !== 'PAUSED') return;
  state = resumeState;
  menus.hide();
}

function finishRace() {
  state = 'FINISHED';
  ghost.reset(current.id, session.player.spriteId);
  const { race } = session;
  const won = race.entries[0].finishTime !== null && race.rankOf(race.entries[0]) === 1;
  if (won) saveWin(current.id, settings.difficulty);
  menus.showResults({
    won,
    rows: race.order.map((e) => ({ name: e.car.name, color: e.car.color, time: e.finishTime, you: e.car === session.player })),
    bestLap,
    record: newRecord,
  });
}

const hud = createHud({ onPause: pause });
const menus = createMenus({
  onRace: startRace,
  onTrack: selectTrack,
  onOnline: () => { setSoloCarsVisible(false); online.open(); },
  hasWon: (trackIndex, diff) => hasWon(TRACKS[trackIndex].id, diff),
  onCar: (id) => { soloSession.setPlayerCar(id); settings.car = id; saveSettings(settings); },
  onDifficulty: (d) => { settings.difficulty = d; saveSettings(settings); },
  onGhost: () => {
    settings.ghost = !settings.ghost;
    saveSettings(settings);
    return settings.ghost;
  },
  onMute: () => {
    settings.muted = !settings.muted;
    saveSettings(settings);
    audio.setMuted(settings.muted);
    return settings.muted;
  },
  onResume: resume,
  onRestart: startRace,
  onQuit: toMenu,
  onAgain: startRace,
  onMenu: toMenu,
});

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Escape' || e.code === 'KeyP') (state === 'PAUSED' ? resume : pause)();
  else if (e.code === 'KeyR' && state !== 'MENU' && !session.net) startRace();
});
// Portrait on a touch device: the CSS rotate overlay shows, the game pauses
matchMedia('(pointer: coarse) and (orientation: portrait)').addEventListener('change', (e) => { if (e.matches && !session.net) pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !session.net) pause(); });

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  resizeCamera(camera, w, h);
  effects.setScale(h / viewHeight());
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
  if (session.net) return; // the online session handles laps and results itself
  ghost.update(session.race.entries[0]);
  const best = session.race.entries[0].best;
  if (best !== null && (bestLap === null || best < bestLap)) {
    bestLap = best;
    newRecord = true;
    saveBestLap(current.id, bestLap);
  }
  if (session.isOver()) finishRace();
}

function countdownText() {
  if (state === 'COUNTDOWN') return String(Math.ceil(cd.seconds - stateTime));
  return state === 'RACING' && stateTime < cd.goShow ? 'GO!' : '';
}

let lastCount = '';

// Camera shake and thump from this frame's strongest hit
function handleImpacts() {
  const E = CONFIG.effects;
  const p = session.player;
  let thump = 0;
  for (const c of session.cars) {
    if (c.impact > E.impactMin) {
      if (c === p) {
        shakeCamera(camera, c.impact * CONFIG.camera.shakePerImpact);
        thump = Math.max(thump, c.impact);
      } else {
        const d = Math.hypot(c.x - p.x, c.z - p.z);
        thump = Math.max(thump, c.impact * Math.max(0, 1 - d / E.impactAudioRange));
      }
    }
    c.impact = 0;
  }
  if (thump > 0) audio.thump(thump);
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
  const active = state === 'COUNTDOWN' || state === 'RACING';
  session.frame?.(alpha);
  if (state === 'RACING' && !session.net) ghost.show(session.race.entries[0], session.race.time, step, alpha, settings.ghost);
  if (active) effects.update(dt, session.cars);
  handleImpacts();
  audio.update({
    active: state === 'RACING' || state === 'FINISHED',
    speed: Math.min(1, Math.abs(p.speed) / CONFIG.car.maxSpeed),
    throttle: input.throttle,
    slip: p.slip,
    onTrack: p.onTrack !== false,
  });
  const look = CONFIG.camera.lookAhead;
  followCamera(camera, p.mesh.position.x + p.vx * look, p.mesh.position.z + p.vz * look, dt);
  hud.setVisible(state !== 'MENU' && state !== 'LOBBY');
  input.setTouchVisible(state === 'COUNTDOWN' || state === 'RACING');
  const count = countdownText();
  if (count !== lastCount) {
    if (count) audio.beep(count === 'GO!');
    lastCount = count;
  }
  hud.setCountdown(count);
  hud.update(session.race, session.race.entries[0], session.net ? session.race.entries[0].best : bestLap);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

const setSoloCarsVisible = (v) => soloSession.cars.forEach((c) => { c.mesh.visible = v; });

// Hooks the online module uses to drive the game loop
const game = {
  scene, menus, settings, solo: soloSession,
  getState: () => state,
  setState: (s) => { state = s; },
  // Show a circuit without touching the saved solo track
  loadTrack(index) {
    scene.remove(current.mesh);
    disposeTrack(current);
    current = makeTrack(index);
    scene.add(current.mesh);
    soloSession.setTrack(current.data);
    soloSession.reset(settings.difficulty);
    resetView();
    return current.data;
  },
  useSession(s) {
    if (s === session) return;
    if (session !== soloSession) session.dispose?.();
    session = s;
    setSoloCarsVisible(false);
    resetView();
  },
  begin() {
    resetView();
    state = 'COUNTDOWN';
    stateTime = 0;
    menus.hide();
  },
  // Back to the normal title screen
  exit() {
    session = soloSession;
    setSoloCarsVisible(true);
    selectTrack(Math.max(0, TRACKS.findIndex((t) => t.id === settings.track)));
    toMenu();
  },
};
const online = createOnline(game);

toMenu();
requestAnimationFrame(frame);

// Offline support. Skipped on localhost (cache-first would serve stale code
// while developing); add ?sw to the URL to test it there.
const dev = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw');
if ('serviceWorker' in navigator && !dev) navigator.serviceWorker.register('./service-worker.js');

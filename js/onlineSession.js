import * as THREE from '../lib/three.module.min.js';
import { CONFIG } from './config.js';
import { createCar, placeCar } from './car.js';
import { queryTrack } from './track.js';
import { driveCar } from './drive.js';
import { resolveCars } from './collision.js';
import { createRace } from './race.js';
import { slotSpot } from './session.js';

export const SLOT_COLORS = [0xe53935, 0x1e88e5, 0x43a047, 0xfdd835];
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const r2 = (v) => Math.round(v * 100) / 100;
const N = CONFIG.net;

// Name tag that floats above a car (a camera-facing sprite, kept north of the car on screen)
function makeLabel(name, color) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(0, 8, 256, 48);
  g.fillStyle = hex(color);
  g.fillRect(0, 8, 10, 48);
  g.fillStyle = '#fff';
  g.font = 'bold 30px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(name, 133, 33, 230);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
  spr.scale.set(11, 2.75, 1);
  spr.renderOrder = 10;
  return spr;
}

// One online race. Every player simulates their own car locally (no input lag) and sends
// its state ~30x/s; the host relays everyone's state. Remote cars are drawn slightly in the
// past and interpolated, so they move smoothly. players = [{ pid, name, car }] in grid order.
export function createOnlineSession(scene, track, { players, myPid, isHost, send, onEnd }) {
  const cars = [];
  const remotes = []; // race entries of the other players
  const bufs = new Map(); // pid -> recent samples
  const states = {}; // host: latest state per pid
  let player = null;

  players.forEach((p, slot) => {
    const car = createCar({ color: SLOT_COLORS[slot % 4], sprite: p.car });
    car.name = p.name;
    car.pid = p.pid;
    car.spriteId = p.car;
    placeCar(car, slotSpot(track, slot));
    car.hint = queryTrack(track, car.x, car.z).index;
    car.label = makeLabel(p.name, SLOT_COLORS[slot % 4]);
    scene.add(car.mesh, car.label);
    cars.push(car);
    if (p.pid === myPid) player = car;
    else {
      remotes.push({ car, pid: p.pid, started: true, laps: 0, progress: -1, finishTime: null, best: null });
      bufs.set(p.pid, []);
    }
  });

  const localRace = createRace(track, [player]);
  const pe = localRace.entries[0];
  const entries = [pe, ...remotes];
  const rank = (a, b) => {
    if (a.finishTime !== null || b.finishTime !== null) {
      if (a.finishTime === null) return 1;
      if (b.finishTime === null) return -1;
      return a.finishTime - b.finishTime;
    }
    return b.progress - a.progress;
  };
  const race = {
    get time() { return localRace.time; },
    totalLaps: localRace.totalLaps,
    entries,
    order: entries.slice(),
    rankOf: (e) => race.order.indexOf(e) + 1,
    currentLap: (e) => localRace.currentLap(e),
  };

  let tick = 0, seq = 0, graceAt = null, ended = false;

  const sample = (m) => ({ t: performance.now(), x: m.x, z: m.z, h: m.h, vx: m.vx, vz: m.vz, st: m.st, p: m.p, l: m.l, f: m.f, b: m.b });
  function push(pid, m) {
    const list = bufs.get(pid);
    if (!list) return;
    list.push(sample(m));
    if (list.length > 12) list.shift();
  }

  // Place a remote car where it was `interpDelay` ms ago (predict a little if packets run late)
  function drawRemote(e, now) {
    const car = e.car;
    const list = bufs.get(e.pid);
    car.prev.x = car.x; car.prev.z = car.z; car.prev.heading = car.heading;
    if (!list.length) return;
    const last = list[list.length - 1];
    e.progress = last.p; e.laps = last.l; e.finishTime = last.f; e.best = last.b;
    let a = list[0], b = a, k = 0;
    if (now >= last.t) {
      a = b = last;
      const dt = Math.min((now - last.t) / 1000, N.extrapolate);
      car.x = last.x + last.vx * dt;
      car.z = last.z + last.vz * dt;
      car.heading = last.h;
    } else {
      for (let i = list.length - 1; i > 0; i--) if (list[i - 1].t <= now) { a = list[i - 1]; b = list[i]; break; }
      k = b.t > a.t ? Math.min(1, Math.max(0, (now - a.t) / (b.t - a.t))) : 0;
      car.x = a.x + (b.x - a.x) * k;
      car.z = a.z + (b.z - a.z) * k;
      car.heading = a.h + wrapPi(b.h - a.h) * k;
    }
    car.vx = a.vx + (b.vx - a.vx) * k;
    car.vz = a.vz + (b.vz - a.vz) * k;
    car.steer = a.st + (b.st - a.st) * k;
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    car.speed = car.vx * fx + car.vz * fz;
    car.slip = Math.abs(-car.vx * fz + car.vz * fx);
    const q = queryTrack(track, car.x, car.z, car.hint);
    car.hint = q.index;
    car.onTrack = q.dist <= track.edge;
  }

  const stateMsg = () => ({
    t: 's', q: ++seq, x: r2(player.x), z: r2(player.z), h: +player.heading.toFixed(3),
    vx: r2(player.vx), vz: r2(player.vz), st: +player.steer.toFixed(2),
    p: +pe.progress.toFixed(3), l: pe.laps, f: pe.finishTime, b: pe.best,
  });

  function pump() {
    const mine = stateMsg();
    if (!isHost) return send(mine);
    states[myPid] = mine;
    send({ t: 'w', q: mine.q, p: Object.entries(states).map(([pid, m]) => [+pid, m.x, m.z, m.h, m.vx, m.vz, m.st, m.p, m.l, m.f, m.b]) });
  }

  function rows() {
    return race.order.map((e) => ({ pid: e.car.pid, name: e.car.name, car: e.car.spriteId, time: e.finishTime }));
  }

  // Host decides when the race is over: everyone done, or the grace period after the first finisher
  function checkEnd() {
    const done = entries.filter((e) => e.finishTime !== null).length;
    if (!done) return;
    if (graceAt === null) graceAt = localRace.time;
    if (done === entries.length || localRace.time - graceAt >= N.endGrace) {
      ended = true;
      const r = rows();
      send({ t: 'end', rows: r });
      onEnd(r);
    }
  }

  const s = {
    net: true,
    cars, player, race,
    setPlayerCar() {},
    setTrack() {},
    reset() {},
    isOver: () => false,
    tick(step, controls) {
      if (ended) return;
      tick++;
      driveCar(track, player, controls, step);
      const now = performance.now() - N.interpDelay;
      for (const e of remotes) drawRemote(e, now);
      // Bumps only move my own car: remote cars stay where their packets put them
      const held = remotes.map((e) => [e.car, e.car.x, e.car.z, e.car.vx, e.car.vz, e.car.speed]);
      resolveCars(cars);
      for (const [c, x, z, vx, vz, sp] of held) { c.x = x; c.z = z; c.vx = vx; c.vz = vz; c.speed = sp; }
      localRace.update(step);
      race.order.sort(rank);
      if (tick % N.sendEvery === 0) pump();
      if (isHost) checkEnd();
    },
    // Per rendered frame: keep name tags above their cars
    frame() {
      for (const c of cars) c.label.position.set(c.mesh.position.x, 3, c.mesh.position.z - 5.5);
    },
    onState(pid, m) { // host: a client's state packet
      states[pid] = m;
      push(pid, m);
    },
    onWorld(m) { // client: everyone's state, relayed by the host
      for (const [pid, x, z, h, vx, vz, st, p, l, f, b] of m.p) if (pid !== myPid) push(pid, { x, z, h, vx, vz, st, p, l, f, b });
    },
    removePlayer(pid) {
      const i = remotes.findIndex((e) => e.pid === pid);
      if (i < 0) return;
      const { car } = remotes[i];
      scene.remove(car.mesh, car.label);
      cars.splice(cars.indexOf(car), 1);
      remotes.splice(i, 1);
      entries.splice(entries.findIndex((e) => e.car === car), 1);
      race.order.splice(race.order.findIndex((e) => e.car === car), 1);
      bufs.delete(pid);
      delete states[pid];
    },
    dispose() {
      for (const c of cars) scene.remove(c.mesh, c.label);
    },
  };
  return s;
}

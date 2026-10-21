import { CONFIG } from './config.js';
import { createCar, setCarSprite } from './car.js';
import { loadGhost, saveGhost } from './storage.js';

const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Ghost of the best lap: records the player's laps and replays the saved one,
// restarting each time the player crosses the line.
export function createGhost(scene) {
  const G = CONFIG.ghost;
  const car = createCar({ color: 0xffffff });
  car.mesh.userData.opacity = G.opacity;
  car.mesh.visible = false;
  scene.add(car.mesh);

  let data = null; // { time, s: flat [x, z, heading, ...] sampled every G.every ticks }
  let trackId = null;
  let buf = [];
  let tickN = 0;
  let recStart = null;

  function reset(id, sprite) {
    trackId = id;
    data = loadGhost(id);
    buf = [];
    tickN = 0;
    recStart = null;
    car.mesh.visible = false;
    setCarSprite(car, sprite);
  }

  // Call after each physics tick with the player's race entry
  function update(entry) {
    const p = entry.car;
    if (recStart !== null && entry.lapStart !== recStart) {
      const t = entry.lapTimes[entry.lapTimes.length - 1];
      if (buf.length && (!data || t < data.time)) {
        data = { time: t, every: G.every, s: buf };
        saveGhost(trackId, data);
      }
      buf = [];
      tickN = 0;
    }
    if (!entry.started) return;
    recStart = entry.lapStart;
    if (tickN++ % G.every === 0 && entry.finishTime === null) {
      buf.push(+p.x.toFixed(2), +p.z.toFixed(2), +p.heading.toFixed(3));
    }
  }

  // Call every rendered frame: replay at the interpolated time between physics ticks
  function show(entry, raceTime, step, alpha, enabled = true) {
    const m = car.mesh;
    const every = data?.every ?? 2;
    const f = enabled && data && entry.started && entry.finishTime === null ? (raceTime - (1 - alpha) * step - entry.lapStart) / (step * every) : -1;
    const i = Math.floor(f);
    if (f < 0 || (i + 1) * 3 >= data.s.length) {
      m.visible = false;
      return;
    }
    const s = data.s, k = f - i, a = i * 3, b = a + 3;
    m.visible = true;
    m.position.x = s[a] + (s[b] - s[a]) * k;
    m.position.z = s[a + 1] + (s[b + 1] - s[a + 1]) * k;
    m.rotation.y = s[a + 2] + wrapPi(s[b + 2] - s[a + 2]) * k;
  }

  return { reset, update, show, setSprite: (id) => setCarSprite(car, id) };
}

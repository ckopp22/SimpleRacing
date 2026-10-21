import { CONFIG } from './config.js';
import { createCar, placeCar } from './car.js';
import { queryTrack } from './track.js';
import { driveCar } from './drive.js';
import { resolveCars } from './collision.js';
import { buildSpeedProfile, createAi, updateAi } from './ai.js';
import { createRace } from './race.js';

// One race: owns the cars, AI drivers and race state. reset() starts a fresh grid.
export function createSession(scene, track) {
  const profile = buildSpeedProfile(track);
  const player = createCar({ color: CONFIG.player.color });
  player.name = 'You';
  const aiCars = CONFIG.ai.cars.map((p) => {
    const car = createCar({ color: p.color });
    car.name = p.name;
    return car;
  });
  const cars = [player, ...aiCars];
  cars.forEach((c) => scene.add(c.mesh));

  // Slots 0/1 = front row left/right, 2/3 = second row
  function gridSpot(slot) {
    const g = CONFIG.grid;
    const back = CONFIG.player.startBack + (slot >> 1) * g.rowGap;
    const lat = (slot & 1 ? -1 : 1) * g.lateral; // normal points left
    const p = track.points[0], t = track.tangents[0], n = track.normals[0];
    return { x: p.x - t.x * back + n.x * lat, z: p.z - t.z * back + n.z * lat, heading: Math.atan2(t.x, t.z) };
  }

  const s = { cars, player, ais: [], race: null, diffMul: 1 };

  s.reset = (difficulty = 'normal') => {
    s.diffMul = CONFIG.difficulty[difficulty] ?? 1;
    placeCar(player, gridSpot(CONFIG.grid.playerSlot));
    s.ais = aiCars.map((car, i) => {
      placeCar(car, gridSpot(CONFIG.ai.aiSlots[i]));
      return createAi(track, car, CONFIG.ai.cars[i], profile);
    });
    for (const c of cars) c.hint = queryTrack(track, c.x, c.z).index;
    s.race = createRace(track, cars);
  };

  s.tick = (step, controls) => {
    const { race } = s;
    const pe = race.entries[0];
    driveCar(track, player, controls, step);
    s.ais.forEach((ai, i) => {
      const gap = pe.progress - race.entries[i + 1].progress;
      const r = Math.max(-CONFIG.ai.rubberMax, Math.min(CONFIG.ai.rubberMax, gap * CONFIG.ai.rubberGain));
      driveCar(track, ai.car, updateAi(ai, step, cars, (1 + r) * s.diffMul), step);
    });
    resolveCars(cars);
    race.update(step);
  };

  // Player finished and either everyone is done or the grace timer ran out
  s.isOver = () => {
    const { race } = s;
    const pf = race.entries[0].finishTime;
    return pf !== null && (race.time - pf >= CONFIG.race.graceTime || race.entries.every((e) => e.finishTime !== null));
  };

  s.reset();
  return s;
}

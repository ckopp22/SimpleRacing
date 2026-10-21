import { CONFIG } from './config.js';

// Lap, checkpoint and timing logic. Uses each car's nearest centreline index (car.hint).
export function createRace(track, cars, cfg = CONFIG.race) {
  const n = track.count;
  const gates = cfg.checkpoints.map((f) => Math.round(f * n) % n);
  const entries = cars.map((car) => ({
    car,
    started: false, // has crossed the line once (grid starts behind it)
    gate: 0, // next checkpoint to pass; gates.length = waiting for the line
    laps: 0, // completed laps
    lapStart: 0,
    lapTimes: [],
    best: null,
    finishTime: null,
    prev: null,
    progress: 0, // laps + fraction, for ranking
  }));
  const race = { time: 0, totalLaps: cfg.laps, entries, order: entries.slice() };

  // Finished cars first (by finish time), then by progress
  const rankSort = (a, b) => {
    if (a.finishTime !== null || b.finishTime !== null) {
      if (a.finishTime === null) return 1;
      if (b.finishTime === null) return -1;
      return a.finishTime - b.finishTime;
    }
    return b.progress - a.progress;
  };
  race.rankOf = (e) => race.order.indexOf(e) + 1;

  // Did the car move forward past `target` between index prev and idx?
  const crossed = (prev, idx, target) => {
    const d = ((idx - prev + n + n / 2) % n) - n / 2;
    const gd = (target - prev + n) % n;
    return d > 0 && gd > 0 && gd <= d;
  };

  race.currentLap = (e) => (e.started && e.finishTime === null ? race.time - e.lapStart : 0);

  race.update = (dt) => {
    race.time += dt;
    for (const e of entries) {
      const idx = e.car.hint;
      if (idx === undefined) continue;
      if (e.prev === null) e.prev = idx;
      if (e.finishTime === null) {
        if (!e.started) {
          if (crossed(e.prev, idx, 0)) {
            e.started = true;
            e.lapStart = race.time;
          }
        } else if (e.gate < gates.length) {
          if (crossed(e.prev, idx, gates[e.gate])) e.gate++;
        } else if (crossed(e.prev, idx, 0)) {
          const t = race.time - e.lapStart;
          e.lapTimes.push(t);
          if (e.best === null || t < e.best) e.best = t;
          e.laps++;
          e.gate = 0;
          e.lapStart = race.time;
          if (e.laps >= race.totalLaps) e.finishTime = race.time;
        }
      }
      e.progress = e.laps + (e.started ? 0 : -1) + idx / n;
      e.prev = idx;
    }
    race.order.sort(rankSort);
  };

  return race;
}

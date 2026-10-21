import { CONFIG } from './config.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Max safe speed per centreline sample: physical turn radius limit, then a
// backwards pass so braking starts early enough.
export function buildSpeedProfile(track, car = CONFIG.car, cfg = CONFIG.ai) {
  const n = track.count;
  const P = track.points;
  const ds = track.curve.getLength() / n;
  const omega = (v) => car.turnRate * Math.min(1, v / car.turnSpeedRef) * (1 - car.highSpeedTurn * (v / car.maxSpeed));
  const prof = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = P[(i + n - 1) % n], b = P[i], c = P[(i + 1) % n];
    const turn = Math.abs(wrapPi(Math.atan2(c.x - b.x, c.z - b.z) - Math.atan2(b.x - a.x, b.z - a.z)));
    const radius = (a.distanceTo(b) + b.distanceTo(c)) / 2 / Math.max(turn, 1e-4);
    let v = car.maxSpeed;
    while (v > cfg.minCornerSpeed && v / omega(v) > radius * cfg.cornerSafety) v -= 1;
    prof[i] = v;
  }
  for (let k = 2 * n; k >= 0; k--) {
    const i = k % n;
    const next = prof[(i + 1) % n];
    prof[i] = Math.min(prof[i], Math.sqrt(next * next + 2 * cfg.brakeDecel * ds));
  }
  return prof;
}

export function createAi(track, car, params, profile) {
  return {
    car, params, profile, track,
    controls: { throttle: 0, brake: 0, steer: 0 },
    t: Math.random() * 10,
    phase: Math.random() * 6.28,
    avoid: 0, // smoothed lateral nudge
    mistakeClock: 0, mistakeLeft: 0, mistakeBias: 0,
    slowFor: 0, reverseLeft: 0,
  };
}

// others = other cars to avoid, rubber = speed multiplier from race gap
export function updateAi(ai, dt, others, rubber = 1, cfg = CONFIG.ai) {
  const { car, params, track, profile, controls } = ai;
  const n = track.count;
  const P = track.points;
  const ds = track.curve.getLength() / n;
  const idx = car.hint ?? 0;
  const speed = Math.max(car.speed, 0);
  ai.t += dt;

  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);

  // Stuck recovery: back up and turn away
  ai.slowFor = speed < cfg.stuckSpeed ? ai.slowFor + dt : 0;
  if (ai.slowFor > cfg.stuckTime && ai.reverseLeft <= 0) {
    ai.reverseLeft = cfg.reverseTime;
    ai.slowFor = 0;
  }
  if (ai.reverseLeft > 0) {
    ai.reverseLeft -= dt;
    const side = track.points[idx];
    const toCx = side.x - car.x, toCz = side.z - car.z;
    const cross = fx * toCz - fz * toCx; // >0: centre is to the left
    controls.throttle = 0;
    controls.brake = 1;
    controls.steer = cross > 0 ? 1 : -1; // reverse steering is inverted
    return controls;
  }

  // Avoidance: nudge away from cars just ahead or alongside, and don't rear-end them
  let nudge = 0;
  let follow = Infinity;
  for (const o of others) {
    if (o === car) continue;
    const dx = o.x - car.x, dz = o.z - car.z;
    const ahead = dx * fx + dz * fz;
    const lat = dx * -fz + dz * fx; // + = other car on my right
    if (ahead > -cfg.avoidBehind && ahead < cfg.avoidDist && Math.abs(lat) < cfg.avoidWidth) {
      // Steer to the side with more room when it's dead ahead
      const side = Math.abs(lat) > 0.4 ? (lat > 0 ? 1 : -1) : (ai.avoid + params.offset > 0 ? -1 : 1);
      nudge = side * cfg.avoidOffset;
      if (ahead > 0 && ahead < cfg.followDist) {
        const tight = ahead < cfg.tightGap ? 0.9 * ahead / cfg.tightGap : 1;
        follow = Math.min(follow, Math.max(o.speed, 0) * cfg.followMul * tight);
      }
    }
  }
  ai.avoid += (nudge - ai.avoid) * Math.min(1, cfg.avoidSmooth * dt);

  // Look-ahead target on the (offset) racing line
  const la = clamp(Math.round((cfg.lookAhead + speed * cfg.lookAheadTime) / ds), 2, 40);
  const wobble = params.wobble * Math.sin(ai.t * 0.5 + ai.phase);
  const offset = clamp(params.offset + wobble + ai.avoid, -cfg.maxOffset, cfg.maxOffset);
  const ti = (idx + la) % n;
  const tx = P[ti].x + track.normals[ti].x * offset;
  const tz = P[ti].z + track.normals[ti].z * offset;

  // Occasional small mistakes
  ai.mistakeClock += dt;
  if (ai.mistakeClock >= cfg.mistakeEvery) {
    ai.mistakeClock = 0;
    if (Math.random() < params.mistake) {
      ai.mistakeLeft = cfg.mistakeTime;
      ai.mistakeBias = (Math.random() < 0.5 ? -1 : 1) * cfg.mistakeSteer;
    }
  }
  let bias = 0;
  if (ai.mistakeLeft > 0) {
    ai.mistakeLeft -= dt;
    bias = ai.mistakeBias;
  }

  const err = wrapPi(Math.atan2(tx - car.x, tz - car.z) - car.heading);
  controls.steer = clamp(-err * cfg.steerGain + bias, -1, 1);

  // Speed: slowest safe speed over the look-ahead window
  let safe = Infinity;
  for (let k = 0; k <= la; k++) safe = Math.min(safe, profile[(idx + k) % n]);
  const target = Math.min(safe * params.speedMul * rubber, follow);
  controls.throttle = speed < target ? 1 : 0;
  controls.brake = speed > target + 2 ? clamp((speed - target) / 8, 0, 1) : 0;
  return controls;
}

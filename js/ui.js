import { CONFIG } from './config.js';

export function formatTime(t) {
  if (t === null || t === undefined) return '--:--.-';
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
}

// In-race HUD: lap, position, speed, current/best lap, pause button, countdown, finish banner.
export function createHud({ onPause }) {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div class="hud-left"><div><span id="hud-lap"></span> <span id="hud-pos"></span></div><div id="hud-speed"></div></div>
    <div class="hud-right">
      <div><div>Time <span id="hud-time"></span></div><div>Best <span id="hud-best"></span></div></div>
      <button id="hud-pause" aria-label="Pause">II</button>
    </div>
    <div id="hud-banner"></div>
    <div id="hud-count"></div>`;
  document.body.appendChild(root);
  const $ = (id) => root.querySelector(id);
  const lap = $('#hud-lap'), pos = $('#hud-pos'), speed = $('#hud-speed');
  const time = $('#hud-time'), best = $('#hud-best');
  const banner = $('#hud-banner'), count = $('#hud-count');
  $('#hud-pause').addEventListener('click', onPause);

  return {
    setVisible(v) {
      root.style.display = v ? '' : 'none';
    },
    setCountdown(text) {
      count.textContent = text;
    },
    update(race, entry, bestLap) {
      const done = entry.finishTime !== null;
      pos.textContent = `P${race.rankOf(entry)}/${race.entries.length}`;
      lap.textContent = `Lap ${Math.min(entry.laps + 1, race.totalLaps)}/${race.totalLaps}`;
      speed.textContent = `${Math.round(Math.abs(entry.car.speed) * CONFIG.hud.speedScale)} km/h`;
      time.textContent = formatTime(done ? entry.finishTime : race.currentLap(entry));
      best.textContent = formatTime(bestLap);
      banner.textContent = done ? `FINISH ${formatTime(entry.finishTime)}` : '';
    },
  };
}

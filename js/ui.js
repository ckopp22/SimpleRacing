export function formatTime(t) {
  if (t === null || t === undefined) return '--:--.-';
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
}

// Minimal HUD (M5): lap counter, current/best lap, finish banner.
export function createHud() {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div class="hud-left"><span id="hud-lap"></span> <span id="hud-pos"></span></div>
    <div class="hud-right"><div>Time <span id="hud-time"></span></div><div>Best <span id="hud-best"></span></div></div>
    <div id="hud-banner"></div>
    <div id="hud-count"></div>`;
  document.body.appendChild(root);
  const $ = (id) => root.querySelector(id);
  const lap = $('#hud-lap'), time = $('#hud-time'), best = $('#hud-best'), banner = $('#hud-banner');
  const pos = $('#hud-pos'), count = $('#hud-count');

  return {
    setCountdown(text) {
      count.textContent = text;
    },
    update(race, entry) {
      const done = entry.finishTime !== null;
      pos.textContent = `P${race.rankOf(entry)}/${race.entries.length}`;
      lap.textContent = `Lap ${Math.min(entry.laps + 1, race.totalLaps)}/${race.totalLaps}`;
      time.textContent = formatTime(done ? entry.finishTime : race.currentLap(entry));
      best.textContent = formatTime(entry.best);
      banner.textContent = done ? `FINISH ${formatTime(entry.finishTime)}` : '';
    },
  };
}

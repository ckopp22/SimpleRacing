const KEY = 'topdownracer.v1';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private mode etc.): run without persistence
  }
}

export const loadSettings = () => ({ difficulty: 'normal', muted: false, track: 'classic', ...read().settings });
export const saveSettings = (settings) => write({ ...read(), settings });
// Best laps are kept per track id (the old single bestLap belonged to 'classic')
export const loadBestLap = (id) => read().bestLaps?.[id] ?? (id === 'classic' ? read().bestLap ?? null : null);
export const saveBestLap = (id, t) => {
  const data = read();
  write({ ...data, bestLaps: { ...data.bestLaps, [id]: t } });
};

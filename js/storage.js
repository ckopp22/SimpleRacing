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

export const loadSettings = () => ({ difficulty: 'normal', muted: false, ...read().settings });
export const saveSettings = (settings) => write({ ...read(), settings });
export const loadBestLap = () => read().bestLap ?? null;
export const saveBestLap = (t) => write({ ...read(), bestLap: t });

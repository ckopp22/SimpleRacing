import { formatTime } from './ui.js';

const DIFFS = ['easy', 'normal', 'hard'];
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
const ordinal = (n) => ['1st', '2nd', '3rd', '4th'][n - 1] ?? `${n}th`;

// Title, pause and results screens. Handlers: onRace, onDifficulty, onMute,
// onResume, onRestart, onQuit, onAgain, onMenu, onTrack(index) -> best lap there, onCar(id), onGhost() -> enabled.
export function createMenus(h) {
  const el = document.createElement('div');
  el.id = 'screen';
  el.hidden = true;
  document.body.appendChild(el);

  const btn = (id, label, cls = '') => `<button id="${id}" class="${cls}">${label}</button>`;
  const on = (id, fn) => el.querySelector(`#${id}`).addEventListener('click', fn);

  function showTitle({ best, difficulty, muted, tracks, trackIndex, cars, car, ghost }) {
    let ci = Math.max(0, cars.indexOf(car));
    el.innerHTML = `
      <h1>Simply Racing</h1>
      ${btn('m-mute', muted ? '&#128263;' : '&#128266;', 'corner')}
      <p class="sub" id="m-best">Best lap: ${formatTime(best)}</p>
      ${btn('m-race', 'Race', 'primary')}
      <div class="seg carpick">${btn('m-cprev', '&lsaquo;')}<img id="m-car" src="assets/cars/${cars[ci]}.png" alt="car">${btn('m-cnext', '&rsaquo;')}</div>
      <div class="seg trackpick">${btn('m-tprev', '&lsaquo;')}<span id="m-track">${tracks[trackIndex]}</span>${btn('m-tnext', '&rsaquo;')}</div>
      <div class="seg" data-g="diff">${DIFFS.map((d) => btn(`m-d-${d}`, d[0].toUpperCase() + d.slice(1), d === difficulty ? 'on' : '')).join('')}</div>
      ${btn('m-ghost', ghost ? 'Ghost Car: On' : 'Ghost Car: Off')}`;
    on('m-race', h.onRace);
    const cycle = (d) => {
      ci = (ci + d + cars.length) % cars.length;
      el.querySelector('#m-car').src = `assets/cars/${cars[ci]}.png`;
      h.onCar(cars[ci]);
    };
    on('m-cprev', () => cycle(-1));
    on('m-cnext', () => cycle(1));
    const pickTrack = (d) => {
      trackIndex = (trackIndex + d + tracks.length) % tracks.length;
      el.querySelector('#m-track').textContent = tracks[trackIndex];
      el.querySelector('#m-best').textContent = `Best lap: ${formatTime(h.onTrack(trackIndex))}`;
    };
    on('m-tprev', () => pickTrack(-1));
    on('m-tnext', () => pickTrack(1));
    DIFFS.forEach((d) => on(`m-d-${d}`, () => {
      el.querySelectorAll('[data-g=diff] button').forEach((b) => b.classList.toggle('on', b.id === `m-d-${d}`));
      h.onDifficulty(d);
    }));
    on('m-mute', () => {
      const m = h.onMute();
      el.querySelector('#m-mute').innerHTML = m ? '&#128263;' : '&#128266;';
    });
    on('m-ghost', () => {
      const g = h.onGhost();
      el.querySelector('#m-ghost').textContent = g ? 'Ghost Car: On' : 'Ghost Car: Off';
    });
    el.hidden = false;
  }

  function showPause() {
    el.innerHTML = `<h1>Paused</h1>${btn('m-resume', 'Resume', 'primary')}${btn('m-restart', 'Restart')}${btn('m-quit', 'Quit to menu')}`;
    on('m-resume', h.onResume);
    on('m-restart', h.onRestart);
    on('m-quit', h.onQuit);
    el.hidden = false;
  }

  // rows: [{ name, color, time (null = DNF), you }]
  function showResults({ rows, bestLap, record }) {
    el.innerHTML = `
      <h1>Results</h1>
      <ol class="results">${rows.map((r, i) => `
        <li class="${r.you ? 'you' : ''}"><span>${ordinal(i + 1)}</span><i style="background:${hex(r.color)}"></i><b>${r.name}</b><em>${r.time === null ? 'DNF' : formatTime(r.time)}</em></li>`).join('')}</ol>
      <p class="sub">Best lap: ${formatTime(bestLap)}${record ? ' &mdash; new record!' : ''}</p>
      ${btn('m-again', 'Race Again', 'primary')}${btn('m-menu', 'Menu')}`;
    on('m-again', h.onAgain);
    on('m-menu', h.onMenu);
    el.hidden = false;
  }

  return { showTitle, showPause, showResults, hide: () => { el.hidden = true; } };
}

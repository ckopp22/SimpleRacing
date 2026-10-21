import { formatTime } from './ui.js';

const DIFFS = ['easy', 'normal', 'hard'];
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
const ordinal = (n) => ['1st', '2nd', '3rd', '4th'][n - 1] ?? `${n}th`;

// Title, pause and results screens. Handlers: onRace, onDifficulty, onMute,
// onResume, onRestart, onQuit, onAgain, onMenu.
export function createMenus(h) {
  const el = document.createElement('div');
  el.id = 'screen';
  el.hidden = true;
  document.body.appendChild(el);

  const btn = (id, label, cls = '') => `<button id="${id}" class="${cls}">${label}</button>`;
  const on = (id, fn) => el.querySelector(`#${id}`).addEventListener('click', fn);
  const touch = matchMedia('(pointer: coarse)').matches;

  function showTitle({ best, difficulty, muted }) {
    el.innerHTML = `
      <h1>Top Down Racer</h1>
      <p class="sub">Best lap: ${formatTime(best)}</p>
      ${btn('m-race', 'Race', 'primary')}
      <div class="seg">${DIFFS.map((d) => btn(`m-d-${d}`, d[0].toUpperCase() + d.slice(1), d === difficulty ? 'on' : '')).join('')}</div>
      ${btn('m-mute', muted ? 'Sound: Off' : 'Sound: On')}
      <p class="hint">${touch ? 'Left: gas / brake &middot; Right: steer' : 'W A S D or arrows to drive &middot; Esc pause &middot; R restart'}</p>`;
    on('m-race', h.onRace);
    DIFFS.forEach((d) => on(`m-d-${d}`, () => {
      el.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.id === `m-d-${d}`));
      h.onDifficulty(d);
    }));
    on('m-mute', () => {
      const m = h.onMute();
      el.querySelector('#m-mute').textContent = m ? 'Sound: Off' : 'Sound: On';
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

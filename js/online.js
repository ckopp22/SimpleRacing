import { CONFIG, TRACKS } from './config.js';
import { openHost, joinRoom } from './net.js';
import { createOnlineSession, SLOT_COLORS } from './onlineSession.js';
import { saveSettings } from './storage.js';
import { formatTime } from './ui.js';

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const btn = (id, label, cls = '') => `<button id="${id}" class="${cls}">${label}</button>`;

// Online rooms: home (host / join), lobby, race, results. The game loop in main.js runs
// the race through the `game` hooks; this module owns the screens and the room protocol.
export function createOnline(game) {
  const { menus, settings } = game;
  let room = null;
  let screen = ''; // which screen is up: home, lobby, results, race

  const q = (id) => document.querySelector(`#screen #${id}`);
  const nameOf = () => {
    const v = (q('o-name')?.value ?? settings.name ?? '').trim().slice(0, 12);
    return v || 'Player';
  };

  // --- Messaging -----------------------------------------------------------
  const say = (msg) => {
    if (!room) return;
    if (room.role === 'host') room.net.broadcast({ ...msg, m: ++room.m });
    else room.net.send(msg);
  };

  function sendLobby() {
    say({ t: 'lobby', track: room.track, players: room.players });
  }

  // --- Screens --------------------------------------------------------------
  function showHome(msg = '') {
    screen = 'home';
    game.setState('LOBBY');
    menus.show(`
      ${btn('o-back', '&lsaquo;', 'corner')}
      <h1>Online</h1>
      <input id="o-name" maxlength="12" placeholder="Your name" value="${esc(settings.name ?? '')}" autocomplete="off">
      ${btn('o-host', 'Host Room', 'primary')}
      <div class="seg"><input id="o-code" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="Room code" autocomplete="off">${btn('o-join', 'Join')}</div>
      <p class="sub" id="o-msg">${esc(msg)}</p>`, (el) => {
      const code = el.querySelector('#o-code');
      const say2 = (t) => { el.querySelector('#o-msg').textContent = t; };
      code.addEventListener('input', () => { code.value = code.value.replace(/\D/g, '').slice(0, 4); });
      code.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.querySelector('#o-join').click(); });
      el.querySelector('#o-back').addEventListener('click', game.exit);
      el.querySelector('#o-host').addEventListener('click', () => host(say2));
      el.querySelector('#o-join').addEventListener('click', () => {
        if (code.value.length !== 4) return say2('Enter the 4-digit room code');
        join(code.value, say2);
      });
    });
  }

  function showLobby() {
    screen = 'lobby';
    game.setState('LOBBY');
    const isHost = room.role === 'host';
    const me = room.players.find((p) => p.pid === room.pid);
    const cars = CONFIG.cars;
    menus.show(`
      <h1>Room ${room.code}</h1>
      <p class="sub">${room.players.length}/${CONFIG.net.maxPlayers} players${isHost ? ' &middot; share the code' : ''}</p>
      <ol class="results">${room.players.map((p, i) => `
        <li class="${p.pid === room.pid ? 'you' : ''}"><i style="background:${hex(SLOT_COLORS[i % 4])}"></i><img src="assets/cars/${p.car}.png" alt=""><b>${esc(p.name)}${p.pid === 0 ? ' (Host)' : ''}</b></li>`).join('')}</ol>
      <div class="seg carpick">${btn('o-cprev', '&lsaquo;')}<img id="o-car" src="assets/cars/${me?.car ?? cars[0]}.png" alt="car">${btn('o-cnext', '&rsaquo;')}</div>
      ${isHost
        ? `<div class="seg trackpick">${btn('o-tprev', '&lsaquo;')}<span id="o-track">${TRACKS[room.track].name}</span>${btn('o-tnext', '&rsaquo;')}</div>${btn('o-start', 'Start Race', 'primary')}`
        : `<p class="sub">Track: ${TRACKS[room.track].name}</p><p class="hint">Waiting for the host to start&hellip;</p>`}
      ${btn('o-leave', 'Leave Room')}`, (el) => {
      const cycle = (d) => {
        const i = (cars.indexOf(me.car) + d + cars.length) % cars.length;
        me.car = cars[i];
        room.car = me.car;
        settings.car = me.car;
        saveSettings(settings);
        if (isHost) sendLobby(); else room.net.send({ t: 'prof', name: me.name, car: me.car });
        showLobby();
      };
      el.querySelector('#o-cprev').addEventListener('click', () => cycle(-1));
      el.querySelector('#o-cnext').addEventListener('click', () => cycle(1));
      el.querySelector('#o-leave').addEventListener('click', () => leave());
      if (!isHost) return;
      const pick = (d) => {
        room.track = (room.track + d + TRACKS.length) % TRACKS.length;
        game.loadTrack(room.track);
        sendLobby();
        showLobby();
      };
      el.querySelector('#o-tprev').addEventListener('click', () => pick(-1));
      el.querySelector('#o-tnext').addEventListener('click', () => pick(1));
      el.querySelector('#o-start').addEventListener('click', startRace);
    });
  }

  function showResults(rows) {
    screen = 'results';
    game.setState('FINISHED');
    const won = rows[0]?.pid === room.pid && rows[0].time !== null;
    const ord = (n) => ['1st', '2nd', '3rd', '4th'][n] ?? `${n + 1}th`;
    menus.show(`
      <h1>${won ? '&#127942; You Win!' : 'Results'}</h1>
      <ol class="results">${rows.map((r, i) => `
        <li class="${r.pid === room.pid ? 'you' : ''}"><span>${ord(i)}</span><img src="assets/cars/${r.car}.png" alt=""><b>${esc(r.name)}</b><em>${r.time === null ? 'DNF' : formatTime(r.time)}</em></li>`).join('')}</ol>
      ${btn('o-lobby', 'Back to Lobby', 'primary')}${btn('o-leave', 'Leave Room')}`, (el) => {
      el.querySelector('#o-lobby').addEventListener('click', backToLobby);
      el.querySelector('#o-leave').addEventListener('click', () => leave());
    });
  }

  // --- Room lifecycle -------------------------------------------------------
  async function host(status) {
    const name = nameOf();
    settings.name = name;
    saveSettings(settings);
    status('Creating room…');
    const r = { role: 'host', pid: 0, m: 0, lastM: 0, phase: 'lobby', players: [], track: Math.max(0, TRACKS.findIndex((t) => t.id === settings.track)), session: null, resume: 'RACING' };
    try {
      r.net = await openHost({ onData: (conn, msg) => onHostData(conn, msg), onClose: (conn) => dropPlayer(conn.pid) });
    } catch (e) {
      return status(e.message);
    }
    r.code = r.net.code;
    r.players.push({ pid: 0, name, car: settings.car });
    room = r;
    game.loadTrack(room.track);
    showLobby();
  }

  async function join(code, status) {
    const name = nameOf();
    settings.name = name;
    saveSettings(settings);
    status('Joining…');
    const r = { role: 'client', code, pid: null, m: 0, lastM: 0, phase: 'lobby', players: [], track: 0, session: null, resume: 'RACING' };
    try {
      r.net = await joinRoom(code, { onData: (msg) => onClientData(msg), onClose: () => { if (room === r) leave('The room was closed', true); } });
    } catch (e) {
      return status(e.message);
    }
    room = r;
    r.net.send({ t: 'join', name, car: settings.car });
    status('Waiting for the host…');
  }

  function leave(msg = '', closed = false) {
    const r = room;
    if (!r) return;
    room = null;
    r.session?.dispose();
    if (!closed) {
      try {
        if (r.role === 'host') r.net.broadcast({ t: 'closed', m: ++r.m });
        else r.net.send({ t: 'leave' });
      } catch { /* already gone */ }
    }
    setTimeout(() => r.net.close(), 300);
    game.useSession(game.solo);
    game.loadTrack(Math.max(0, TRACKS.findIndex((t) => t.id === settings.track)));
    showHome(msg);
  }

  function dropPlayer(pid) {
    if (!room || pid === undefined) return;
    const i = room.players.findIndex((p) => p.pid === pid);
    if (i < 0) return;
    room.players.splice(i, 1);
    room.session?.removePlayer(pid);
    sendLobby();
    if (screen === 'lobby') showLobby();
  }

  function startRace() {
    if (room?.role !== 'host' || room.phase !== 'lobby') return;
    room.phase = 'race';
    say({ t: 'start', track: room.track, players: room.players });
    beginRace(room.players, room.track);
  }

  function beginRace(players, trackIdx) {
    room.session?.dispose();
    room.phase = 'race';
    room.track = trackIdx;
    room.menuOpen = false;
    const data = game.loadTrack(trackIdx);
    room.session = createOnlineSession(game.scene, data, {
      players: players.map((p) => ({ ...p })),
      myPid: room.pid,
      isHost: room.role === 'host',
      send: say,
      onEnd: (rows) => { if (room) { room.phase = 'results'; showResults(rows); } },
    });
    screen = 'race';
    game.useSession(room.session);
    game.begin();
  }

  function backToLobby() {
    room.session?.dispose();
    room.session = null;
    game.useSession(game.solo);
    game.loadTrack(room.track);
    if (room.role === 'host') {
      room.phase = 'lobby';
      sendLobby();
    }
    showLobby();
  }

  // --- Incoming ---------------------------------------------------------------
  function onHostData(conn, msg) {
    if (!room) return;
    switch (msg.t) {
      case 'join': {
        if (room.phase !== 'lobby') return room.net.send(conn, { t: 'busy' });
        if (room.players.length >= CONFIG.net.maxPlayers) return room.net.send(conn, { t: 'full' });
        let pid = 1;
        while (room.players.some((p) => p.pid === pid)) pid++;
        conn.pid = pid;
        room.players.push({ pid, name: String(msg.name).slice(0, 12), car: CONFIG.cars.includes(msg.car) ? msg.car : CONFIG.cars[0] });
        room.net.send(conn, { t: 'welcome', pid });
        sendLobby();
        if (screen === 'lobby') showLobby();
        break;
      }
      case 'prof': {
        const p = room.players.find((x) => x.pid === conn.pid);
        if (p && CONFIG.cars.includes(msg.car)) {
          p.car = msg.car;
          sendLobby();
          if (screen === 'lobby') showLobby();
        }
        break;
      }
      case 's': room.session?.onState(conn.pid, msg); break;
      case 'leave': dropPlayer(conn.pid); break;
    }
  }

  function onClientData(msg) {
    if (!room) return;
    if (msg.t === 'w') return room.session?.onWorld(msg);
    if (msg.m !== undefined) {
      if (msg.m <= room.lastM) return; // stale (packets can arrive out of order)
      room.lastM = msg.m;
    }
    switch (msg.t) {
      case 'welcome':
        room.pid = msg.pid;
        if (screen === 'home' && room.players.length) showLobby();
        break;
      case 'busy': leave('That race has already started', true); break;
      case 'full': leave('That room is full', true); break;
      case 'lobby':
        room.players = msg.players;
        room.track = msg.track;
        if (room.shown !== msg.track && screen !== 'race' && screen !== 'results') {
          room.shown = msg.track;
          game.loadTrack(msg.track);
        }
        if (room.pid !== null && (screen === 'home' || screen === 'lobby')) showLobby();
        break;
      case 'start': beginRace(msg.players, msg.track); break;
      case 'end': if (screen === 'race') showResults(msg.rows); break;
      case 'pause': setPaused(msg.on); break;
      case 'closed': leave('The host closed the room', true); break;
    }
  }

  // --- Pause ------------------------------------------------------------------
  function setPaused(on) {
    const st = game.getState();
    if (on && (st === 'RACING' || st === 'COUNTDOWN')) {
      room.resume = st;
      game.setState('PAUSED');
      if (room.role === 'host') {
        menus.show(`<h1>Paused</h1>${btn('o-resume', 'Resume', 'primary')}${btn('o-leave', 'Exit Room')}`, (el) => {
          el.querySelector('#o-resume').addEventListener('click', escape);
          el.querySelector('#o-leave').addEventListener('click', () => leave());
        });
      } else {
        menus.show(`<h1>Host paused</h1>${btn('o-leave', 'Leave Room')}`, (el) => el.querySelector('#o-leave').addEventListener('click', () => leave()));
      }
    } else if (!on && st === 'PAUSED') {
      game.setState(room.resume);
      menus.hide();
    }
  }

  // Esc / pause button. Host: pauses everyone. Others: a small menu while the race keeps running.
  function escape() {
    if (!room) return;
    const st = game.getState();
    if (room.role === 'host') {
      if (st === 'RACING' || st === 'COUNTDOWN') { say({ t: 'pause', on: true }); setPaused(true); }
      else if (st === 'PAUSED') { say({ t: 'pause', on: false }); setPaused(false); }
    } else if (st !== 'PAUSED') {
      if (room.menuOpen) { room.menuOpen = false; menus.hide(); }
      else if (st === 'RACING' || st === 'COUNTDOWN') {
        room.menuOpen = true;
        menus.show(`<h1>Menu</h1>${btn('o-resume', 'Resume', 'primary')}${btn('o-leave', 'Leave Room')}`, (el) => {
          el.querySelector('#o-resume').addEventListener('click', escape);
          el.querySelector('#o-leave').addEventListener('click', () => leave());
        });
      }
    }
  }

  return { open: () => showHome(), escape };
}

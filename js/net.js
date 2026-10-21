// Peer-to-peer rooms over PeerJS (vendored in lib/, global `Peer`). The host registers
// the id "simplyracing-<code>"; friends connect to it. The public PeerJS broker only
// introduces peers, game data flows directly between browsers.
const PREFIX = 'simplyracing-';
const TIMEOUT = 10000;
const OPTS = { reliable: false, serialization: 'json' }; // unordered, so one late packet never stalls the rest

const rand4 = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0');
const open = (conn) => conn.open;

// Host: resolves { code, conns, send(pid, msg), broadcast(msg), close() }.
// handlers: onData(conn, msg), onClose(conn)
export function openHost(handlers) {
  return new Promise((resolve, reject) => {
    if (!window.Peer) return reject(new Error('Online play is unavailable'));
    let tries = 0;
    const attempt = () => {
      const code = rand4();
      const peer = new window.Peer(PREFIX + code);
      let opened = false;
      const timer = setTimeout(() => {
        if (opened) return;
        peer.destroy();
        reject(new Error('Could not reach the server'));
      }, TIMEOUT);
      peer.on('open', () => {
        opened = true;
        clearTimeout(timer);
        const conns = new Set();
        peer.on('connection', (conn) => {
          conns.add(conn);
          conn.on('data', (msg) => handlers.onData(conn, msg));
          conn.on('close', () => { conns.delete(conn); handlers.onClose(conn); });
          conn.on('error', () => {});
        });
        resolve({
          code,
          send: (conn, msg) => { if (open(conn)) conn.send(msg); },
          broadcast: (msg) => { for (const c of conns) if (c.pid !== undefined && open(c)) c.send(msg); },
          close: () => peer.destroy(),
        });
      });
      peer.on('error', (err) => {
        if (opened) return;
        clearTimeout(timer);
        peer.destroy();
        if (err.type === 'unavailable-id' && ++tries < 8) return attempt();
        reject(new Error('Could not reach the server'));
      });
    };
    attempt();
  });
}

// Client: resolves { send(msg), close() }. handlers: onData(msg), onClose()
export function joinRoom(code, handlers) {
  return new Promise((resolve, reject) => {
    if (!window.Peer) return reject(new Error('Online play is unavailable'));
    const peer = new window.Peer();
    let done = false;
    const fail = (msg) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      peer.destroy();
      reject(new Error(msg));
    };
    const timer = setTimeout(() => fail('Could not connect'), TIMEOUT);
    peer.on('error', (err) => {
      if (!done) fail(err.type === 'peer-unavailable' ? 'Room not found' : 'Could not connect');
    });
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + code, OPTS);
      conn.on('open', () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ send: (msg) => { if (open(conn)) conn.send(msg); }, close: () => peer.destroy() });
      });
      conn.on('data', (msg) => handlers.onData(msg));
      conn.on('close', () => handlers.onClose());
      conn.on('error', () => {});
    });
  });
}

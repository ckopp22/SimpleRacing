// On-screen controls: gas/brake stacked bottom-left, steer arrows bottom-right.
// Each finger is tracked by pointerId, so gas + steering work together and a
// finger can slide between buttons of the same pad.
const PADS = `
  <div class="pad pad-left"><div data-k="gas">&#9650;</div><div data-k="brake">&#9660;</div></div>
  <div class="pad pad-right"><div data-k="left">&#9664;</div><div data-k="right">&#9654;</div></div>`;

export function createTouchControls() {
  const root = document.createElement('div');
  root.id = 'touch';
  root.hidden = true;
  root.innerHTML = PADS;
  document.body.appendChild(root);

  const held = { gas: false, brake: false, left: false, right: false };
  const fingers = new Map(); // pointerId -> button element
  const buttons = [...root.querySelectorAll('[data-k]')];

  function refresh() {
    for (const k in held) held[k] = false;
    for (const b of fingers.values()) if (b) held[b.dataset.k] = true;
    for (const b of buttons) b.classList.toggle('pressed', held[b.dataset.k]);
  }

  const hit = (pad, x, y) =>
    [...pad.children].find((b) => {
      const r = b.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) ?? null;

  for (const pad of root.querySelectorAll('.pad')) {
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pad.setPointerCapture(e.pointerId);
      fingers.set(e.pointerId, hit(pad, e.clientX, e.clientY));
      refresh();
    });
    pad.addEventListener('pointermove', (e) => {
      if (!fingers.has(e.pointerId)) return;
      fingers.set(e.pointerId, hit(pad, e.clientX, e.clientY));
      refresh();
    });
    const release = (e) => {
      fingers.delete(e.pointerId);
      refresh();
    };
    pad.addEventListener('pointerup', release);
    pad.addEventListener('pointercancel', release);
    pad.addEventListener('lostpointercapture', release);
  }

  // No context menu, text selection or pinch-zoom from the control area
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  window.addEventListener('blur', () => { fingers.clear(); refresh(); });

  return {
    held,
    setVisible(v) {
      if (root.hidden === !v) return;
      root.hidden = !v;
      if (!v) { fingers.clear(); refresh(); }
    },
  };
}

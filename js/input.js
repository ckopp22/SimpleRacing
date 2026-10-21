// Unified controls: { throttle: 0..1, brake: 0..1, steer: -1 (left)..1 (right) }
const KEYS = {
  throttle: ['KeyW', 'ArrowUp'],
  brake: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};
const HANDLED = new Set(Object.values(KEYS).flat());

export function createInput() {
  const down = new Set();
  window.addEventListener('keydown', (e) => {
    if (HANDLED.has(e.code)) {
      down.add(e.code);
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => down.clear());

  const any = (codes) => codes.some((c) => down.has(c));
  const controls = { throttle: 0, brake: 0, steer: 0 };
  controls.update = () => {
    controls.throttle = any(KEYS.throttle) ? 1 : 0;
    controls.brake = any(KEYS.brake) ? 1 : 0;
    controls.steer = (any(KEYS.right) ? 1 : 0) - (any(KEYS.left) ? 1 : 0);
    return controls;
  };
  return controls;
}

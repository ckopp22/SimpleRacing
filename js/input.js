import { createTouchControls } from './touch.js';

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
    if (e.target.tagName === 'INPUT') return; // typing in a text field
    if (HANDLED.has(e.code)) {
      down.add(e.code);
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => down.clear());

  const touch = createTouchControls();
  const any = (codes) => codes.some((c) => down.has(c));
  const controls = { throttle: 0, brake: 0, steer: 0 };
  controls.update = () => {
    const h = touch.held;
    controls.throttle = any(KEYS.throttle) || h.gas ? 1 : 0;
    controls.brake = any(KEYS.brake) || h.brake ? 1 : 0;
    const steer = (any(KEYS.right) ? 1 : 0) - (any(KEYS.left) ? 1 : 0) + (h.right ? 1 : 0) - (h.left ? 1 : 0);
    controls.steer = Math.max(-1, Math.min(1, steer));
    return controls;
  };
  controls.setTouchVisible = touch.setVisible;
  return controls;
}

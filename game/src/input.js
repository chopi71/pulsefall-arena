// Keyboard and mouse input. Tracks held keys, one-frame "pressed" edges,
// and the mouse position in arena coordinates (the canvas is scaled to fit
// the window, so mouse pixels are mapped back into the 1280x800 arena).

import { ARENA } from './config.js';

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: ARENA.width / 2, y: ARENA.height / 2, down: false };

  function arenaPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * ARENA.width,
      y: ((clientY - rect.top) / rect.height) * ARENA.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    mouse.down = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const p = arenaPoint(event.clientX, event.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = arenaPoint(event.clientX, event.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    if (event.button === 0) pressed.add('MouseLeft');
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    keys,
    mouse,
    down(code) {
      return keys.has(code);
    },
    // True only on the frame the key/button went down.
    wasPressed(code) {
      return pressed.has(code);
    },
    // Movement vector from WASD or arrow keys, normalized.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    // Clear one-frame edges at the end of each update.
    endFrame() {
      pressed.clear();
    },
  };
}

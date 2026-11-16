// Keyboard and mouse, read once per frame. The game polls `axis()` for steering
// and consumes edge-triggered actions (dash, confirm, pause) so a held key does
// not fire twice.
export class Input {
  constructor() {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this.pressed = new Set();
  }

  attach(target) {
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.key.toLowerCase());
      this.keys.add(event.key.toLowerCase());
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
    target.addEventListener('pointermove', (event) => {
      const rect = target.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 1280;
      this.mouse.y = ((event.clientY - rect.top) / rect.height) * 800;
    });
    target.addEventListener('pointerdown', (event) => {
      const rect = target.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 1280;
      this.mouse.y = ((event.clientY - rect.top) / rect.height) * 800;
      this.mouse.down = true;
      this.mouse.clicked = true;
    });
    window.addEventListener('pointerup', () => {
      this.mouse.down = false;
    });
  }

  axis() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y };
  }

  dashQueued() {
    return this.pressed.has(' ') || this.pressed.has('shift') || this.mouse.clicked;
  }

  confirmQueued() {
    return this.pressed.has('enter') || this.mouse.clicked;
  }

  restartQueued() {
    return this.pressed.has('r') || this.pressed.has('enter') || this.mouse.clicked;
  }

  pauseQueued() {
    return this.pressed.has('p') || this.pressed.has('escape');
  }

  muteQueued() {
    return this.pressed.has('m');
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}

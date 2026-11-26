// Alpine Courier — keyboard and mouse input.
// One clear job: turn raw browser events into a small, stable control state
// the flight model reads every frame. Nothing here draws or flies.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pitch = 0; // -1..1, from ArrowUp/Down or W/S
    this.roll = 0; // -1..1, from ArrowLeft/Right or A/D
    this.throttleDelta = 0; // -1, 0 or 1 while Shift / Ctrl are held
    this.mouseX = 0; // -1..1 across the canvas, 0 = centre
    this.mouseY = 0;
    this.mouseActive = false;
    this.pressed = new Set(); // keys pressed since the last consume
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
      this.updateAxes();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
      this.updateAxes();
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.mouseY = ((e.clientY - r.top) / r.height) * 2 - 1;
      this.mouseActive = true;
    });
    canvas.addEventListener('mouseleave', () => {
      this.mouseActive = false;
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.updateAxes();
    });
  }

  updateAxes() {
    const k = this.keys;
    this.pitch = (k.has('arrowup') || k.has('w') ? -1 : 0) + (k.has('arrowdown') || k.has('s') ? 1 : 0);
    this.roll = (k.has('arrowleft') || k.has('a') ? -1 : 0) + (k.has('arrowright') || k.has('d') ? 1 : 0);
    this.throttleDelta = (k.has('shift') ? 1 : 0) + (k.has('control') ? -1 : 0);
  }

  // True once for the frame after the key went down, then cleared.
  wasPressed(key) {
    return this.pressed.has(key.toLowerCase());
  }

  endFrame() {
    this.pressed.clear();
  }

  get anyKey() {
    return this.pressed.size > 0;
  }
}

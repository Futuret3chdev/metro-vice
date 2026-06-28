export class InputManager {
  constructor() {
    this.keys = {};
    this.move = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    this.sprint = false;
    this.action = false;
    this._actionPulse = false;
    this._mouseDragging = false;
    this._mouseLook = { x: 0, y: 0 };
    this._canvas = null;

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'KeyF') this._actionPulse = true;
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    this._setupJoystick('joy-move', (x, y) => { this.move.x = x; this.move.y = y; });
    this._setupJoystick('joy-look', (x, y) => { this.look.x = x; this.look.y = y; });
  }

  bindLook(canvas) {
    if (!canvas || this._canvas) return;
    this._canvas = canvas;

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 2) this._mouseDragging = true;
    });

    window.addEventListener('mouseup', () => {
      this._mouseDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this._mouseDragging) return;
      this._mouseLook.x += e.movementX;
      this._mouseLook.y += e.movementY;
    });
  }

  _setupJoystick(id, cb) {
    const zone = document.getElementById(id);
    const knob = zone?.querySelector('.joy-knob');
    if (!zone || !knob) return;
    let touchId = null;
    let origin = { x: 0, y: 0 };

    const update = (cx, cy) => {
      const dx = cx - origin.x;
      const dy = cy - origin.y;
      const len = Math.hypot(dx, dy) || 1;
      const cap = 42;
      const c = Math.min(cap, len);
      knob.style.transform = `translate(${dx / len * c}px, ${dy / len * c}px)`;
      cb(dx / cap, dy / cap);
    };

    const reset = () => {
      touchId = null;
      knob.style.transform = '';
      cb(0, 0);
    };

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      touchId = t.identifier;
      origin = { x: t.clientX, y: t.clientY };
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== touchId) continue;
        e.preventDefault();
        update(t.clientX, t.clientY);
      }
    }, { passive: false });

    zone.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== touchId) continue;
        reset();
      }
    });
    zone.addEventListener('touchcancel', reset);
  }

  getMoveVector() {
    let x = this.move.x;
    let y = this.move.y;
    if (this.keys.KeyA || this.keys.ArrowLeft) x -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) x += 1;
    if (this.keys.KeyW || this.keys.ArrowUp) y -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  getLookDelta() {
    let x = this.look.x;
    let y = this.look.y;

    if (Math.abs(this._mouseLook.x) > 0.01 || Math.abs(this._mouseLook.y) > 0.01) {
      x += this._mouseLook.x * 0.004;
      y += this._mouseLook.y * 0.003;
      this._mouseLook.x = 0;
      this._mouseLook.y = 0;
    }

    if (this.keys.KeyQ) x -= 0.04;
    if (this.keys.KeyR && !this._actionPulse) x += 0.04;

    return { x, y };
  }

  isSprinting() {
    return this.sprint || this.keys.ShiftLeft || this.keys.ShiftRight;
  }

  consumeAction() {
    if (this._actionPulse) { this._actionPulse = false; return true; }
    if (this.action) { this.action = false; return true; }
    return false;
  }

  bindMobile(ui) {
    document.getElementById('mob-action')?.addEventListener('click', () => { this._actionPulse = true; });
    document.getElementById('mob-sprint')?.addEventListener('click', () => {
      this.sprint = !this.sprint;
      document.getElementById('mob-sprint')?.classList.toggle('active', this.sprint);
    });
    document.getElementById('mob-mission')?.addEventListener('click', () => ui?.onMissionPing?.());
    document.getElementById('mob-menu')?.addEventListener('click', () => ui?.onMenu?.());
  }
}
// Alpine Courier — the game itself: loop, states, scoring and missions.
// One clear job: own the state machine (title → flying → landed / crashed /
// complete), detect rings and landings, keep score and time, and hand one
// frame at a time to the renderer. Physics lives in physics.js, drawing in
// render.js, the world in world.js.
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { World } from './world.js';
import { Plane } from './physics.js';
import { Renderer } from './render.js';
import { applyShot } from './shots.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input(canvas);
    this.sound = new SoundBank();
    this.world = new World();
    this.plane = new Plane(this.world);
    this.renderer = new Renderer(canvas);
    this.state = 'title'; // title | flying | paused | landed | crashed | complete
    this.score = 0;
    this.elapsed = 0;
    this.message = '';
    this.messageUntil = 0;
    this.time = 0;
    this.shot = new URLSearchParams(window.location.search).get('shot');
    this.frozen = false; // screenshot states hold still; real play never sets this
    this.last = performance.now();
    this.bindButtons();
    applyShot(this, this.shot);
    requestAnimationFrame((t) => this.frame(t));
  }

  bindButtons() {
    this.canvas.addEventListener('click', () => {
      this.sound.ensure();
      if (this.state === 'title') this.startFlight();
      else if (this.state === 'landed' || this.state === 'crashed' || this.state === 'complete') {
        this.resetRun();
      }
    });
  }

  resetRun() {
    this.world.reset();
    this.plane.reset();
    this.score = 0;
    this.elapsed = 0;
    this.message = '';
    this.state = 'title';
  }

  startFlight() {
    this.state = 'flying';
    this.elapsed = 0;
    this.showMessage('FLY THROUGH THE RINGS — THEN LAND!', 4);
  }

  showMessage(text, seconds) {
    this.message = text;
    this.messageUntil = this.time + seconds;
  }

  get timeText() {
    const m = Math.floor(this.elapsed / 60);
    const s = Math.floor(this.elapsed % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.renderer.draw(
      { mode: this.state, score: this.score, timeText: this.timeText, message: this.time < this.messageUntil ? this.message : '' },
      this.plane,
      this.world,
      this.time,
    );
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  update(dt) {
    const input = this.input;
    if (input.wasPressed('m')) {
      const muted = this.sound.toggleMute();
      this.showMessage(muted ? 'SOUND OFF' : 'SOUND ON', 1.5);
    }
    if (this.state === 'title') {
      if (input.wasPressed('enter') || input.wasPressed(' ')) {
        this.sound.ensure();
        this.startFlight();
      }
      // Idle on the runway: the prop idles, the plane sits ready.
      this.plane.throttle = 0.12;
      return;
    }
    if (input.wasPressed('p')) {
      this.state = this.state === 'paused' ? 'flying' : 'paused';
      this.showMessage(this.state === 'paused' ? 'PAUSED — P TO RESUME' : '', 0.1);
      return;
    }
    if (this.state === 'paused') return;
    if (this.frozen) return; // a ?shot= state stays exactly as set, for screenshots
    if (this.state === 'landed' || this.state === 'crashed' || this.state === 'complete') {
      if (input.wasPressed('r') || input.wasPressed('enter')) this.resetRun();
      return;
    }
    // Flying.
    this.elapsed += dt;
    if (input.wasPressed('r')) {
      this.resetRun();
      return;
    }
    const event = this.plane.update(input, dt);
    this.sound.setEngine(this.plane.throttle, this.plane.speed / CONFIG.maxSpeed, this.plane.airborne);
    if (event === 'water') return this.crash('DITCHED IN THE WATER');
    if (event === 'ground') {
      this.sound.thud();
      if (this.plane.damage >= 100) return this.crash('CRASHED — AIRFRAME DESTROYED');
      this.showMessage('HARD LANDING! HULL DAMAGED', 2.5);
    }
    if (event === 'touchdown' && this.plane.speed < 4) {
      // Rolled to a stop on the ground.
      if (this.world.isOnRunway(this.plane.x, this.plane.z) && this.world.allRingsPassed()) {
        return this.land();
      }
      if (this.world.isOnRunway(this.plane.x, this.plane.z)) {
        this.showMessage('ON THE RUNWAY — FLY THE RINGS FIRST', 2.5);
      }
    }
    if (event === 'stall') this.showMessage('STALL! NOSE DOWN, THROTTLE UP', 2);
    if (this.plane.fuel <= 0 && this.plane.airborne) {
      this.showMessage('FUEL EMPTY — GLIDING', 2);
    }
    // Ring detection: crossing the ring's plane close to its centre.
    const next = this.world.nextRing();
    if (next && this.plane.airborne) {
      const dz = this.plane.z - next.z;
      const dx = this.plane.x - next.x;
      const dy = this.plane.y - next.y;
      const radial = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(dz) < 14 && radial < CONFIG.ringRadius) {
        next.passed = true;
        this.score += CONFIG.ringScore;
        this.sound.ringChime();
        this.showMessage(`RING ${next.index + 1} — ${next.name}! +${CONFIG.ringScore}`, 2.5);
        if (this.world.allRingsPassed()) {
          this.showMessage('ALL RINGS! NOW LAND ON THE RUNWAY', 4);
        }
      } else if (Math.abs(dz) < 14 && radial < CONFIG.ringRadius + 30) {
        this.showMessage('SO CLOSE — FLY THROUGH THE CENTRE', 1.5);
      }
    }
    // Out of fuel on the ground far from the runway: the run is over.
    if (this.plane.fuel <= 0 && this.plane.onGround && this.plane.speed < 2 && !this.world.isOnRunway(this.plane.x, this.plane.z)) {
      return this.crash('OUT OF FUEL — STRANDED IN THE VALLEY');
    }
  }

  land() {
    this.state = 'landed';
    const timeBonus = Math.max(0, Math.round((CONFIG.parTimeSeconds - this.elapsed) * CONFIG.timeBonusPerSecond));
    this.score += CONFIG.landingScore + timeBonus;
    this.sound.fanfare();
    this.showMessage(`LANDED! +${CONFIG.landingScore}  TIME BONUS +${timeBonus}`, 6);
    if (this.world.allRingsPassed()) this.state = 'complete';
  }

  crash(reason) {
    this.state = 'crashed';
    this.sound.thud();
    this.sound.setEngine(0, 0, false);
    this.showMessage(`${reason} — PRESS R TO FLY AGAIN`, 6);
  }
}

// Boot: the canvas fills the window; the game owns the rest.
const canvas = document.getElementById('game');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const game = new Game(canvas);
window.__alpineCourier = game; // for play-testing and screenshots

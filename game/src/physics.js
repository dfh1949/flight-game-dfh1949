// Alpine Courier — the flight model.
// One clear job: take the pilot's pitch/roll/throttle and the ground below,
// and move the plane. No drawing, no scoring, just the physics of a small
// prop courier: throttle makes speed, pitch trades speed for altitude, bank
// turns the heading, and a slow wing stalls.
import { CONFIG } from './config.js';

export class Plane {
  constructor(world) {
    this.world = world;
    this.reset();
  }

  reset() {
    this.x = CONFIG.startX;
    this.y = CONFIG.startY;
    this.z = CONFIG.startZ;
    this.heading = CONFIG.startHeading;
    this.speed = 0;
    this.throttle = 0.35;
    this.pitch = 0; // radians, positive = nose up
    this.bank = 0; // radians, positive = rolling right
    this.verticalSpeed = 0;
    this.airborne = false;
    this.fuel = CONFIG.fuelMax;
    this.damage = 0;
    this.onGround = true;
  }

  // dt in seconds. Returns an event string or null: 'liftoff', 'stall',
  // 'ground', 'water', 'ring' is handled by the game, not here.
  update(input, dt) {
    // Throttle: Shift raises it, Ctrl lowers it, mouse wheel is not used.
    this.throttle = Math.max(0, Math.min(1, this.throttle + input.throttleDelta * dt * 0.6));
    // Mouse steering blends with the keys: hold the mouse off-centre to bank.
    let rollInput = input.roll;
    let pitchInput = input.pitch;
    if (input.mouseActive) {
      rollInput = Math.max(-1, Math.min(1, rollInput + input.mouseX * 0.9));
      pitchInput = Math.max(-1, Math.min(1, pitchInput + input.mouseY * 0.7));
    }
    const targetBank = rollInput * CONFIG.maxBank;
    const targetPitch = -pitchInput * CONFIG.maxPitch;
    this.bank += (targetBank - this.bank) * Math.min(1, dt * 3.2);
    this.pitch += (targetPitch - this.pitch) * Math.min(1, dt * 2.6);

    // Speed follows throttle, with drag, and pitch trades speed for height.
    // The approach rate is a plain exponential (time constant ~2 s on the
    // ground, ~3 s in the air) so the plane actually gets off the runway.
    const targetSpeed = this.throttle * CONFIG.maxSpeed;
    const rate = this.onGround ? 0.9 : 0.55; // per second, exponential approach
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * rate);
    this.speed -= Math.sin(this.pitch) * 14 * dt;
    this.speed = Math.max(0, this.speed);

    // Turning: bank turns the heading, faster when the wing is loaded.
    const turn = -this.bank * CONFIG.turnRate * Math.min(1, this.speed / 40);
    this.heading += turn * dt;

    // Vertical speed: climb comes from pitch at speed, plus throttle.
    const flying = this.speed > CONFIG.minSpeed;
    if (flying) {
      const climb = Math.sin(this.pitch) * CONFIG.climbRate * (this.speed / CONFIG.cruiseSpeed);
      const lift = (this.throttle - 0.25) * 2.2;
      this.verticalSpeed += (climb + lift - this.verticalSpeed) * Math.min(1, dt * 1.8);
    } else {
      this.verticalSpeed += (-9.8 * 0.35 - this.verticalSpeed) * Math.min(1, dt * 1.5);
    }
    if (!this.airborne && this.speed > 26 && this.pitch > 0.02) {
      this.airborne = true;
      this.onGround = false;
      this.y = Math.max(this.y, this.world.groundHeight(this.x, this.z) + 2);
    }
    this.y += this.verticalSpeed * dt;

    // Move forward along the heading, and sideways a little with the bank.
    const forward = this.speed * dt;
    this.z += Math.cos(this.heading) * forward;
    this.x += Math.sin(this.heading) * forward;
    this.x += -Math.sin(this.bank) * this.speed * dt * 0.12;

    // Stay inside the valley; the mountains push back with a warning, not a wall.
    if (Math.abs(this.x) > CONFIG.valleyHalfWidth) {
      this.x = Math.sign(this.x) * CONFIG.valleyHalfWidth;
      this.heading *= 0.98;
    }
    if (this.z > CONFIG.runwayZ + 900) this.z = CONFIG.runwayZ + 900;
    if (this.z < -200) this.z = -200;

    // Fuel: full throttle drinks, idling sips; empty tanks mean a glide.
    const burn = CONFIG.fuelBurnIdle + this.throttle * (CONFIG.fuelBurn - CONFIG.fuelBurnIdle);
    this.fuel = Math.max(0, this.fuel - burn * dt);
    if (this.fuel <= 0) this.throttle = Math.max(0, this.throttle - dt * 0.4);

    // Ground contact.
    const ground = this.world.groundHeight(this.x, this.z);
    if (this.y <= ground + 1.2) {
      this.y = ground + 1.2;
      if (this.airborne) {
        const hard = this.verticalSpeed < -6 || Math.abs(this.bank) > 0.5;
        this.airborne = false;
        this.onGround = true;
        this.verticalSpeed = 0;
        if (this.world.isWater(this.x, this.z)) return 'water';
        if (hard) {
          this.damage += 34;
          return 'ground';
        }
        return 'touchdown';
      }
      this.verticalSpeed = 0;
      this.onGround = true;
      // Rolling on the ground bleeds speed unless the throttle is up.
      if (this.throttle < 0.4) this.speed = Math.max(0, this.speed - 12 * dt);
    } else if (this.y > ground + 3) {
      this.onGround = false;
    }
    if (!flying && this.airborne && this.y > ground + 3) return 'stall';
    return null;
  }

  get altitudeFt() {
    return Math.round((this.y - this.world.groundHeight(this.x, this.z)) * 3.281);
  }

  get speedKts() {
    return Math.round(this.speed * 1.944);
  }

  get headingDeg() {
    let deg = ((this.heading * 180) / Math.PI) % 360;
    if (deg < 0) deg += 360;
    return Math.round(deg);
  }
}

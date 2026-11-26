// Alpine Courier — deterministic screenshot states.
// One clear job: when the page opens with ?shot=start|play|approach|land,
// put the game into that exact, readable state so a screenshot shows a real
// frame of the game's own code. No shot invents art: each one is a state the
// game itself can reach by playing.
import { CONFIG } from './config.js';

export function applyShot(game, shot) {
  if (!shot) return;
  const plane = game.plane;
  const world = game.world;
  if (shot === 'start') {
    // On the runway threshold, engine idling, title screen up.
    game.state = 'title';
    plane.x = 0;
    plane.y = 6;
    plane.z = CONFIG.runwayZ;
    plane.heading = Math.PI; // facing back down the valley, rings ahead
    plane.throttle = 0.12;
    plane.speed = 0;
  } else if (shot === 'play') {
    // Mid-flight, low over the lake, the next ring dead ahead.
    game.state = 'flying';
    game.elapsed = 82;
    game.score = 200;
    plane.x = 0;
    plane.y = 150;
    plane.z = 2600;
    game.frozen = true;
    plane.heading = 3.14159265 + 0.05; // heading down the valley, -Z
    plane.speed = 58;
    plane.throttle = 0.72;
    plane.pitch = 0.05;
    plane.bank = -0.18;
    plane.airborne = true;
    plane.fuel = 78;
    world.rings[0].passed = true;
    world.rings[1].passed = true;
    game.showMessage('RING 2 — TWIN PEAKS! +100', 3);
  } else if (shot === 'approach') {
    // Final approach: all rings done, runway lights ahead, gear down in spirit.
    game.state = 'flying';
    game.elapsed = 198;
    game.score = 800;
    plane.x = 8;
    plane.y = 42;
    plane.z = 3650;
    plane.heading = 0.02; // heading +Z, back to the runway at z=4200
    plane.speed = 34;
    plane.throttle = 0.3;
    plane.pitch = -0.06;
    plane.bank = 0.02;
    plane.airborne = true;
    plane.fuel = 31;
    for (const r of world.rings) r.passed = true;
    game.frozen = true;
    game.showMessage('ALL RINGS! NOW LAND ON THE RUNWAY', 4);
  } else if (shot === 'land') {
    // Mission complete: parked on the runway, score tallied.
    game.state = 'complete';
    game.elapsed = 226;
    game.score = 800 + CONFIG.landingScore + 28;
    plane.x = 0;
    plane.y = 5.2;
    plane.z = CONFIG.runwayZ;
    plane.heading = 0; // parked facing +Z, the direction it landed
    plane.speed = 0;
    plane.throttle = 0;
    plane.airborne = false;
    plane.onGround = true;
    plane.fuel = 22;
    for (const r of world.rings) r.passed = true;
    game.showMessage('LANDED! +250  TIME BONUS +28', 6);
  }
}

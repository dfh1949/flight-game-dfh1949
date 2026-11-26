// Alpine Courier — the valley: ground height, the lake, the river, the town,
// the lighthouse hill and the peaks. One clear job: answer "how high is the
// ground here?" and "where are the mission objects?" for the flight model
// and the renderer, from one deterministic height function.
import { CONFIG, RINGS, LANDMARKS } from './config.js';

// Small deterministic hash-noise so the terrain is the same every run.
function hash2(x, z) {
  let h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function smoothNoise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) {
  return (
    smoothNoise(x * 0.012, z * 0.012) * 0.55 +
    smoothNoise(x * 0.03 + 7, z * 0.03 + 3) * 0.3 +
    smoothNoise(x * 0.07 + 13, z * 0.07 + 9) * 0.15
  );
}

export class World {
  constructor() {
    this.rings = RINGS.map((r, i) => ({ ...r, index: i, passed: false }));
    this.runway = {
      x: 0,
      z: CONFIG.runwayZ,
      length: CONFIG.runwayLength,
      width: CONFIG.runwayWidth,
    };
  }

  // Ground height in metres at (x, z). The valley floor is low and gentle,
  // the sides rise steeply into the peaks, and the lake basin is flat water.
  groundHeight(x, z) {
    const ax = Math.abs(x);
    const valley = Math.max(0, ax - 300) / 120;
    let h = fbm(x, z) * 26 + valley * valley * 90;
    for (const p of LANDMARKS.peaks) {
      const dx = (x - p.x) / p.w;
      const dz = (z - p.z) / (p.w * 0.9);
      const d2 = dx * dx + dz * dz;
      if (d2 < 1) h += p.h * (1 - d2) * (1 - d2);
    }
    // Lighthouse hill: a smooth bump the ring sits over.
    const ldx = (x - LANDMARKS.lighthouse.x) / 130;
    const ldz = (z - LANDMARKS.lighthouse.z) / 130;
    const ld2 = ldx * ldx + ldz * ldz;
    if (ld2 < 1) h += 55 * (1 - ld2);
    // The lake basin is flat at 2 m; the river bed is flat at 3 m.
    const lk = LANDMARKS.lake;
    const inLake = Math.abs(x - lk.x) / lk.rx < 1 && Math.abs(z - lk.z) / lk.rz < 1;
    if (inLake) {
      const ex = Math.abs(x - lk.x) / lk.rx;
      const ez = Math.abs(z - lk.z) / lk.rz;
      const edge = Math.max(ex, ez);
      h = edge > 0.7 ? h * ((edge - 0.7) / 0.3) + 2 * (1 - (edge - 0.7) / 0.3) : 2;
    }
    if (Math.abs(x - 40) < 10 && z > LANDMARKS.riverZ0 && z < LANDMARKS.riverZ1) h = Math.min(h, 3);
    // The runway is a flat strip.
    if (Math.abs(x) < CONFIG.runwayWidth / 2 + 8 && Math.abs(z - CONFIG.runwayZ) < CONFIG.runwayLength / 2 + 8) {
      h = Math.min(h, 4);
    }
    return h;
  }

  isWater(x, z) {
    const lk = LANDMARKS.lake;
    const ex = Math.abs(x - lk.x) / lk.rx;
    const ez = Math.abs(z - lk.z) / lk.rz;
    if (ex < 0.9 && ez < 0.9) return true;
    if (Math.abs(x - 40) < 9 && z > LANDMARKS.riverZ0 && z < LANDMARKS.riverZ1) return true;
    return false;
  }

  isOnRunway(x, z) {
    return Math.abs(x) < CONFIG.runwayWidth / 2 && Math.abs(z - CONFIG.runwayZ) < CONFIG.runwayLength / 2;
  }

  nextRing() {
    return this.rings.find((r) => !r.passed) || null;
  }

  ringsPassed() {
    return this.rings.filter((r) => r.passed).length;
  }

  allRingsPassed() {
    return this.rings.every((r) => r.passed);
  }

  reset() {
    for (const r of this.rings) r.passed = false;
  }
}

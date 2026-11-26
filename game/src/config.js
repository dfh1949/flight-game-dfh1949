// Alpine Courier — shared tuning constants and the mission definition.
// One clear job: every number the flight model, the world and the renderer
// agree on lives here, so a tweak in one place moves the whole game.
export const CONFIG = {
  // World: the valley runs along +Z, the runway sits at its far end.
  valleyHalfWidth: 420, // metres, x = -420..420 is flyable valley floor
  runwayZ: 4200, // centre of the runway, metres ahead of the start line
  runwayLength: 520,
  runwayWidth: 46,
  // The plane starts on the runway threshold, facing down the valley.
  startX: 0,
  startY: 6,
  startZ: 3960,
  startHeading: 3.14159265, // radians, PI = straight down -Z, down the valley toward the rings
  // Flight model.
  maxSpeed: 92, // m/s at full throttle, level flight
  minSpeed: 18, // below this the wing stops flying and the nose drops
  cruiseSpeed: 52,
  climbRate: 9.5, // m/s at full throttle and best climb pitch
  turnRate: 0.55, // rad/s at full bank
  maxBank: 0.9, // radians of roll
  maxPitch: 0.42,
  fuelMax: 100,
  fuelBurn: 0.55, // per second at full throttle
  fuelBurnIdle: 0.12,
  // Rings: the mission. Fly through them in order, then come back and land.
  ringRadius: 26,
  ringCount: 8,
  // Scoring.
  ringScore: 100,
  landingScore: 250,
  timeBonusPerSecond: 2, // under the par time
  parTimeSeconds: 240,
  // Rendering.
  viewDistance: 2600, // metres of terrain drawn ahead
  fogStart: 900,
  fogEnd: 2600,
};

// Ring course: a tour of the valley — low over the lake, between the twin
// peaks, around the lighthouse hill, and back up the valley to the runway.
// Each ring has a centre (x, altitude, z) and the game highlights the next.
export const RINGS = [
  { x: -40, y: 95, z: 3300, name: 'Lake Gate' },
  { x: -160, y: 150, z: 2650, name: 'Twin Peaks' },
  { x: 120, y: 120, z: 2050, name: 'Pine Bend' },
  { x: 190, y: 210, z: 1450, name: 'Eagle Crag' },
  { x: -120, y: 90, z: 900, name: 'River Mouth' },
  { x: 60, y: 170, z: 520, name: 'Lighthouse Hill' },
  { x: -190, y: 130, z: 1500, name: 'North Ridge' },
  { x: 0, y: 110, z: 3400, name: 'Home Gate' },
];

// Ground features the renderer draws and the world module measures.
export const LANDMARKS = {
  lake: { x: -140, z: 3050, rx: 260, rz: 320 }, // the big blue lake
  riverZ0: 700, // the river runs from the lake down the valley floor
  riverZ1: 3600,
  town: { x: 170, z: 1200, houses: 26 }, // red-roofed village by the river
  lighthouse: { x: 60, z: 520 }, // white tower on its hill
  peaks: [
    { x: -340, z: 2500, h: 420, w: 300 },
    { x: 350, z: 2100, h: 470, w: 320 },
    { x: -370, z: 1200, h: 380, w: 280 },
    { x: 340, z: 700, h: 440, w: 300 },
  ],
};

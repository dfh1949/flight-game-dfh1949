# flight-game-dfh1949

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/dfh1949/flight-game-dfh1949/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/dfh1949/flight-game-dfh1949/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**Alpine Courier — Ring Run.** A complete original flight game that runs in a desktop browser from static files, no network request. Fly the little red courier plane AC-7 through 8 glowing rings over an alpine valley — lake, river, red-roofed village, lighthouse hill, twin peaks — then bring her home and land on the runway before the fuel runs out. Keyboard and mouse, throttle and turn discipline matter: a slow wing stalls, a hard touchdown damages the hull, and a clean landing earns a time bonus.

## Run it

```sh
python3 -m http.server 8080 --directory game
# open http://localhost:8080 in desktop Chrome
```

Any static server pointed at `game/` works the same way.

## Controls

- **↑ / W** nose up, **↓ / S** nose down, **← → / A D** bank and turn
- **Shift** throttle up, **Ctrl** throttle down; moving the mouse steers too
- **P** pause, **R** restart, **M** mute

## How it is built

- `game/index.html` — the page, one canvas, no external files
- `game/src/config.js` — tuning constants and the 8-ring course
- `game/src/world.js` — valley heightfield, lake, river, town, peaks, rings
- `game/src/physics.js` — throttle / pitch / bank / stall / fuel flight model
- `game/src/render.js` — pseudo-3D chase view, cockpit, lit HUD instruments
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised engine, ring chime and fanfare (WebAudio, no files)
- `game/src/main.js` — game loop, states, scoring, ring and landing detection
- `game/src/shots.js` — deterministic `?shot=` states for screenshots
- `game/src/title.js` — title and end screens
- `main.ts` — the make.fun entry program (Node 22, stdlib only)

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>

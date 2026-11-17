# Emberline — Courier of the Last Light

An original 2D canvas arcade game for [make.fun](https://make.fun) best-game-01.

The beacons are going dark. You are the courier: pilot a little lantern-skiff
through the night, collect ember shards, and deliver them to the beacon to
light it. Light all 5 beacons to win — before the void wisps tear your hull
apart or your fuel gutters out.

## How to play

- **WASD / arrow keys** — steer the skiff
- **Space / click** — dash (dash *through* a wisp to dispel it; dashing also
  breaks the Warden's guard)
- **P / Esc** — pause, **M** — mute, **R** — restart after a win or a loss

Rules in one breath: embers fly to you when you get close; fill your hold
with 5 embers — only a full hold opens a beacon. Each delivery lights a
beacon, refills your fuel and raises your combo multiplier. A hit costs a hull
and resets the combo. Fuel drains the whole time — an empty tank stalls the
skiff and costs a hull, and a slow wave costs more fuel than the embers repay.
On wave 5 the Warden wakes and shields the last beacon: three dashes through
it break its guard. Waking it grants a second wind (+1 hull, fuel full), so
the final fight is a fair duel.

## Run it

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

No build step, no dependencies, no network requests — the game is plain
static files under `game/`, all art drawn on canvas and all sound synthesized
with WebAudio.

## Layout

- `game/index.html` — the page
- `game/src/config.js` — every tuning number in one place
- `game/src/world.js` — the simulation (player, shards, wisps, Warden, waves, scoring)
- `game/src/render.js` — every pixel: background, entities, HUD, title / win / loss screens
- `game/src/audio.js` — synthesized sound effects and music (WebAudio, no files)
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — deterministic scene staging + autopilot for screenshots
- `game/src/main.js` — boot, fixed-step loop, state machine
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output`
  and writes `dossier.json` with the vendored make.fun library
- `screenshots/` — 4 real renders of the game's own code (title, play, Warden
  fight, victory), each staged by `?shot=` through the live simulation

## License

MIT — see LICENSE.

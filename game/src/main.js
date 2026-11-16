// Emberline boot + frame loop. Live play runs a fixed-step simulation under
// requestAnimationFrame; `?shot=<name>` instead fast-forwards the same
// simulation once and renders a single deterministic frame for a screenshot.
import { STEP } from './config.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { createWorld, resetWorld, stepWorld, EVENT_DELIVER, EVENT_HIT, EVENT_OVER, EVENT_VICTORY } from './world.js';
import { drawWorld, SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 1);
const shotName = params.get('shot');
const world = createWorld(seed);
const input = new Input();
input.attach(canvas);
const sounds = new SoundBank();
let muted = false;
let best = 0;
try {
  best = Number(localStorage.getItem('emberline-best') || 0) || 0;
} catch {
  best = 0;
}
let screen = SCREEN_TITLE;
let statusTick = 0;
let wardenWas = false;
let dashWas = false;

function saveBest() {
  if (world.score > best) {
    best = world.score;
    try {
      localStorage.setItem('emberline-best', String(best));
    } catch {
      // Best score is nice-to-have; never break the game over storage.
    }
  }
}

function announce() {
  if (!statusEl) return;
  if (screen === SCREEN_TITLE) statusEl.textContent = 'Emberline title screen. Press Enter to sail.';
  else if (screen === SCREEN_PLAY) {
    statusEl.textContent = `Score ${world.score}, ${world.hearts} hulls, wave ${world.wave}, carrying ${world.carried} embers, fuel ${Math.round(world.fuel)}.`;
  } else if (screen === SCREEN_VICTORY) statusEl.textContent = `All beacons lit. Final score ${world.score}. Press R to sail again.`;
  else if (screen === SCREEN_OVER) statusEl.textContent = `Game over. Score ${world.score}. Press R to try again.`;
  else statusEl.textContent = 'Paused.';
}

function startRun() {
  resetWorld(world);
  screen = SCREEN_PLAY;
  world.banner = { text: 'LIGHT THE FIRST BEACON', sub: 'Collect embers, deliver them to the beacon', t: 2.4, max: 2.4 };
  wardenWas = false;
  announce();
}

function tick(dt) {
  if (input.keys.size > 0 || input.mouse.down) sounds.unlock();
  if (input.muteQueued()) {
    muted = !muted;
    sounds.setMuted(muted);
  }
  if (screen === SCREEN_TITLE) {
    world.time += dt;
    for (const s of world.shards) s.bob += dt * 2;
    if (world.shards.length < 5 && Math.random() < dt * 0.5) {
      world.shards.push({
        x: 120 + Math.random() * 1040,
        y: 120 + Math.random() * 560,
        vx: 0,
        vy: 0,
        bob: Math.random() * 6,
        bobSpeed: 2,
      });
    }
    if (input.confirmQueued()) startRun();
  } else if (screen === SCREEN_PLAY) {
    if (input.pauseQueued()) {
      screen = SCREEN_PAUSE;
      announce();
    } else {
      const axis = input.axis();
      const events = stepWorld(world, { x: axis.x, y: axis.y, dash: input.dashQueued() }, dt);
      const p = world.player;
      if (p.dashT > 0 && !dashWas) sounds.dash();
      dashWas = p.dashT > 0;
      if (world.warden && !wardenWas) sounds.wardenRoar();
      wardenWas = Boolean(world.warden);
      if (events & EVENT_DELIVER) sounds.deliver();
      if (events & EVENT_HIT) sounds.hit();
      if (events & EVENT_VICTORY) {
        sounds.victory();
        saveBest();
        screen = SCREEN_VICTORY;
        announce();
      } else if (events & EVENT_OVER) {
        sounds.gameOver();
        saveBest();
        screen = SCREEN_OVER;
        announce();
      }
      statusTick += 1;
      if (statusTick % 60 === 0) announce();
    }
  } else if (screen === SCREEN_PAUSE) {
    if (input.pauseQueued()) {
      screen = SCREEN_PLAY;
      announce();
    }
  } else if (screen === SCREEN_VICTORY || screen === SCREEN_OVER) {
    if (input.restartQueued()) startRun();
  }
  input.endFrame();
}

if (shotName) {
  screen = stageShot(shotName, world);
  world.shake = 0;
  drawWorld(ctx, world, screen, best);
  document.title = `Emberline — shot ${shotName}`;
  window.__shotReady = true;
} else {
  announce();
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      tick(STEP);
      acc -= STEP;
      steps += 1;
    }
    if (steps === 5) acc = 0;
    drawWorld(ctx, world, screen, best);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

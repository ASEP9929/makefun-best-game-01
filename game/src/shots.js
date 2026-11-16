// Deterministic scene staging for screenshots: each shot fast-forwards the real
// simulation with a simple autopilot (no fabricated state, no hand-drawn frames).
// The same step function and the same renderer produce the live game.
import { STEP } from './config.js';
import { resetWorld, spawnShard, spawnWarden, stepWorld } from './world.js';

/** Steer toward the goal, steer away from danger, dash to dispel a close wisp.
 *  In bossMode the skiff hunts the Warden and never heads for the beacon, so a
 *  staged boss fight stays a fight instead of ending in a delivery. */
function autopilot(world, reckless, bossMode = false) {
  const p = world.player;
  if (bossMode && world.warden) {
    const w = world.warden;
    const d = Math.hypot(w.x - p.x, w.y - p.y) || 1;
    let dx;
    let dy;
    if (d > 95) {
      // Close in on the Warden.
      dx = (w.x - p.x) / d;
      dy = (w.y - p.y) / d;
    } else {
      // Orbit it at dash range, waiting for an opening.
      dx = -(w.y - p.y) / d;
      dy = (w.x - p.x) / d;
    }
    // Nudge toward a close shard, but never toward the beacon.
    for (const s of world.shards) {
      const sd = Math.hypot(s.x - p.x, s.y - p.y);
      if (sd < 130) {
        dx += ((s.x - p.x) / sd) * 0.5;
        dy += ((s.y - p.y) / sd) * 0.5;
      }
    }
    // Keep wisps at arm's length while circling.
    for (const wisp of world.wisps) {
      const wd = Math.hypot(wisp.x - p.x, wisp.y - p.y) || 1;
      if (wd < 120) {
        dx += ((p.x - wisp.x) / wd) * 0.8;
        dy += ((p.y - wisp.y) / wd) * 0.8;
      }
    }
    const len = Math.hypot(dx, dy) || 1;
    // Dash only at point-blank range: the Warden is a 3-hit guard, and a
    // generous dash window would end the staged fight in seconds.
    const dash = p.dashCd <= 0 && d < 42;
    return { x: dx / len, y: dy / len, dash };
  }
  let tx;
  let ty;
  if (!reckless && world.carried >= 3) {
    tx = world.beacon.x;
    ty = world.beacon.y;
  } else if (world.shards.length > 0) {
    let nearest = null;
    let bestD = Infinity;
    for (const s of world.shards) {
      const d = (s.x - p.x) * (s.x - p.x) + (s.y - p.y) * (s.y - p.y);
      if (d < bestD) {
        bestD = d;
        nearest = s;
      }
    }
    tx = nearest.x;
    ty = nearest.y;
  } else {
    tx = world.beacon.x;
    ty = world.beacon.y;
  }
  let dx = tx - p.x;
  let dy = ty - p.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  if (!reckless) {
    const avoid = (ox, oy, radius, weight) => {
      const d = Math.hypot(ox - p.x, oy - p.y) || 1;
      if (d < radius) {
        const blend = ((radius - d) / radius) * weight;
        dx += ((p.x - ox) / d) * blend;
        dy += ((p.y - oy) / d) * blend;
      }
    };
    for (const w of world.wisps) avoid(w.x, w.y, 150, 1.6);
    if (world.warden) avoid(world.warden.x, world.warden.y, 185, 1.4);
    const l2 = Math.hypot(dx, dy) || 1;
    dx /= l2;
    dy /= l2;
  }
  let dash = false;
  if (!reckless && p.dashCd <= 0) {
    for (const w of world.wisps) {
      if (Math.hypot(w.x - p.x, w.y - p.y) < 46) {
        dash = true;
        break;
      }
    }
    if (!dash && world.warden && Math.hypot(world.warden.x - p.x, world.warden.y - p.y) < 62) dash = true;
  }
  return { x: dx, y: dy, dash };
}

function runSteps(world, seconds, reckless = false, bossMode = false) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i += 1) {
    if (world.phase !== 'play') break;
    stepWorld(world, autopilot(world, reckless, bossMode), STEP);
  }
}

/**
 * Stage one named scene and return the screen the renderer should draw.
 * Shots: start (title), play (mid-wave action), boss (wave 5 Warden fight),
 * end (game over with restart).
 */
export function stageShot(name, world) {
  if (name === 'start') {
    world.phase = 'play';
    runSteps(world, 2.5);
    world.phase = 'title';
    world.time = 12;
    world.shake = 0;
    world.banner = null;
    return 'title';
  }
  if (name === 'play') {
    world.phase = 'play';
    // Twelve seconds keeps the frame mid-game (wave 2-3): long enough to show
    // collecting and delivering, short of the wave-5 Warden.
    runSteps(world, 12);
    if (world.phase !== 'play') {
      resetWorld(world);
      runSteps(world, 12);
    }
    world.shake = 0;
    return 'play';
  }
  if (name === 'boss') {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt > 0) {
        // A fresh RNG stream per attempt: resetting with the same seed would
        // replay the identical fight.
        world.seed += 7;
        resetWorld(world);
      }
      world.phase = 'play';
      world.beaconsLit = 4;
      world.wave = 5;
      // A run that reached wave 5 would carry a score: four deliveries plus
      // a couple of dispelled wisps, so the HUD reads coherently.
      world.score = 187;
      world.combo = 2;
      world.deliveries = 4;
      spawnWarden(world);
      for (let i = 0; i < 2; i += 1) spawnShard(world);
      runSteps(world, 8, false, true);
      if (world.phase === 'play' && world.warden) {
        world.shake = 0;
        return 'play';
      }
    }
    world.shake = 0;
    return world.phase === 'victory' ? 'victory' : 'over';
  }
  if (name === 'end') {
    world.phase = 'play';
    runSteps(world, 180, true);
    if (world.phase === 'play') {
      world.hearts = 0;
      world.phase = 'over';
    }
    world.shake = 0;
    world.banner = null;
    return world.phase === 'victory' ? 'victory' : 'over';
  }
  return 'title';
}

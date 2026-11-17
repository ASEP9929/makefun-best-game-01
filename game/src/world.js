// Emberline's simulation: one pure-ish step function over a plain state object.
// The renderer only reads this state; the autopilot in shots.js only writes an
// input. Nothing here touches the DOM, audio or canvas, so a scene can be
// fast-forwarded deterministically for a screenshot.
//
// v2 rules (the loop, in one breath): fill your hold with 5 embers, then
// deliver them to the beacon. A beacon only opens for a full hold, so the
// 1-ember ferry that won v1 in ~13 seconds lights nothing. On wave 5 the
// Warden shields the last beacon: break its 3-hit guard first, or no
// delivery counts. Waking the Warden grants a second wind (+1 hull, full
// fuel), so the final fight is a fair duel instead of a punishment for
// engaging with it.
import { BEACON, COLORS, FIELD, FUEL, PLAYER, SCORE, SHARD, STEP, WARDEN, WISP } from './config.js';
import { angleTo, clamp, dist2, makeRng, range } from './random.js';

export const EVENT_OVER = 1;
export const EVENT_VICTORY = 2;
export const EVENT_DELIVER = 4;
export const EVENT_HIT = 8;
export const EVENT_WARDEN = 16;

export function createWorld(seed) {
  const rng = makeRng(seed);
  const world = {
    rng,
    seed,
    time: 0,
    phase: 'title',
    score: 0,
    combo: 0,
    bestCombo: 0,
    hearts: 3,
    fuel: FUEL.max,
    wave: 1,
    beaconsLit: 0,
    deliveries: 0,
    carried: 0,
    playTime: 0,
    spawnT: 2,
    shardT: 0.4,
    shake: 0,
    hitStop: 0,
    banner: null,
    beaconNagT: 0,
    warden: null,
    wardenSpawned: false,
    wardenT: 0,
    player: {
      x: FIELD.width / 2,
      y: FIELD.height / 2 + 120,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      invuln: 0,
      dashCd: 0,
      dashT: 0,
      dashX: 0,
      dashY: 0,
      trail: [],
    },
    beacon: { x: FIELD.width / 2, y: 170, pulse: 0 },
    shards: [],
    wisps: [],
    particles: [],
    floaters: [],
    stars: [],
    nebulae: [],
    motes: [],
  };
  for (let i = 0; i < 240; i += 1) {
    world.stars.push({
      x: rng() * FIELD.width,
      y: rng() * FIELD.height,
      r: 0.6 + rng() * 1.7,
      phase: rng() * Math.PI * 2,
      speed: 0.4 + rng() * 1.4,
      warm: rng() < 0.25,
    });
  }
  for (let i = 0; i < 7; i += 1) {
    world.nebulae.push({
      x: rng() * FIELD.width,
      y: rng() * FIELD.height,
      r: 180 + rng() * 260,
      hue: rng() < 0.5 ? '122, 80, 200' : '30, 90, 160',
      alpha: 0.10 + rng() * 0.08,
    });
  }
  // Slow ember dust: warm motes drifting through the dark so the field never
  // reads as empty black between the stars.
  for (let i = 0; i < 36; i += 1) {
    world.motes.push({
      x: rng() * FIELD.width,
      y: rng() * FIELD.height,
      r: 1 + rng() * 2.2,
      phase: rng() * Math.PI * 2,
      speed: 0.15 + rng() * 0.35,
      warm: rng() < 0.7,
    });
  }
  return world;
}

export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  for (const key of Object.keys(world)) delete world[key];
  Object.assign(world, fresh);
  world.phase = 'play';
}

function showBanner(world, text, sub, dur = 2.2) {
  world.banner = { text, sub: sub || '', t: dur, max: dur };
}

function burst(world, x, y, color, count, speed, life = 0.7) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng() * Math.PI * 2;
    const v = speed * (0.3 + world.rng() * 0.7);
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: life * (0.6 + world.rng() * 0.6),
      maxLife: life,
      size: 2 + world.rng() * 3.5,
      color,
    });
  }
}

function floater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color: color || COLORS.cream, t: 1.1, max: 1.1 });
}

function placeBeacon(world) {
  const p = world.player;
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 24; tries += 1) {
    x = range(world.rng, 130, FIELD.width - 130);
    y = range(world.rng, 110, FIELD.height - 110);
    if (dist2(x, y, p.x, p.y) > 320 * 320) break;
  }
  world.beacon.x = x;
  world.beacon.y = y;
  world.beacon.pulse = 0;
}

export function spawnShard(world) {
  const p = world.player;
  const b = world.beacon;
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 20; tries += 1) {
    x = range(world.rng, 60, FIELD.width - 60);
    y = range(world.rng, 60, FIELD.height - 60);
    if (dist2(x, y, p.x, p.y) > 150 * 150 && dist2(x, y, b.x, b.y) > 110 * 110) break;
  }
  world.shards.push({
    x,
    y,
    vx: range(world.rng, -14, 14),
    vy: range(world.rng, -10, 10),
    bob: world.rng() * Math.PI * 2,
    bobSpeed: 1.5 + world.rng() * 1.5,
  });
}

export function spawnWisp(world, edge) {
  const p = world.player;
  let x = 0;
  let y = 0;
  if (edge === 0) { x = -30; y = range(world.rng, 0, FIELD.height); }
  else if (edge === 1) { x = FIELD.width + 30; y = range(world.rng, 0, FIELD.height); }
  else if (edge === 2) { x = range(world.rng, 0, FIELD.width); y = -30; }
  else { x = range(world.rng, 0, FIELD.width); y = FIELD.height + 30; }
  const speed = Math.min(WISP.maxSpeed, WISP.baseSpeed + WISP.speedPerWave * (world.wave - 1));
  world.wisps.push({
    x,
    y,
    vx: 0,
    vy: 0,
    angle: angleTo(x, y, p.x, p.y),
    speed: speed * (0.85 + world.rng() * 0.3),
    radius: WISP.radius * (0.85 + world.rng() * 0.35),
    wobble: world.rng() * Math.PI * 2,
    wobbleSpeed: 2 + world.rng() * 2,
  });
}

export function spawnWarden(world) {
  world.warden = {
    x: FIELD.width / 2,
    y: -60,
    vx: 0,
    vy: 0,
    angle: Math.PI / 2,
    hp: WARDEN.hp,
    radius: WARDEN.radius,
    wobble: 0,
  };
  world.wardenSpawned = true;
  world.wardenT = 0;
  // Second wind: the final fight starts fair. A courier that limped to wave
  // 5 on one hull gets one back and a full tank, so the duel is winnable.
  world.hearts = Math.min(3, world.hearts + 1);
  world.fuel = FUEL.max;
  showBanner(world, 'THE WARDEN WAKES', 'Second wind: +1 hull, fuel full — break its guard to unshield the beacon', 2.6);
}

function damagePlayer(world, fromX, fromY) {
  const p = world.player;
  world.hearts -= 1;
  world.combo = 0;
  p.invuln = PLAYER.invulnTime;
  world.shake = 15;
  world.hitStop = 0.12;
  const a = angleTo(fromX, fromY, p.x, p.y);
  p.vx += Math.cos(a) * 420;
  p.vy += Math.sin(a) * 420;
  burst(world, p.x, p.y, COLORS.red, 26, 260);
  floater(world, p.x, p.y - 30, 'HULL HIT', COLORS.red);
  return EVENT_HIT;
}

function deliver(world) {
  const mult = Math.min(SCORE.comboCap, 1 + SCORE.comboStep * world.combo);
  const gained = Math.round(world.carried * SCORE.ember * mult);
  world.score += gained;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.deliveries += 1;
  world.beaconsLit += 1;
  world.fuel = FUEL.max;
  floater(world, world.beacon.x, world.beacon.y - 56, `+${gained}`, COLORS.ember);
  burst(world, world.beacon.x, world.beacon.y, COLORS.teal, 40, 320, 0.9);
  burst(world, world.beacon.x, world.beacon.y, COLORS.ember, 24, 220, 0.8);
  world.carried = 0;
  if (world.beaconsLit >= BEACON.total) {
    world.phase = 'victory';
    world.floaters.length = 0;
    return EVENT_VICTORY | EVENT_DELIVER;
  }
  world.wave = world.beaconsLit + 1;
  placeBeacon(world);
  showBanner(world, `BEACON LIT — ${world.beaconsLit} OF ${BEACON.total}`, `Wave ${world.wave}: the dark thickens`);
  if (world.wave === 5 && !world.wardenSpawned) spawnWarden(world);
  return EVENT_DELIVER;
}

// The player reached the beacon. A delivery only counts with a full hold,
// and never while the Warden shields the beacon. Partial holds and shields
// answer with one throttled floater instead of silence, so the rule reads
// in play instead of feeling like a bug.
function tryDeliver(world) {
  const p = world.player;
  if (world.carried <= 0) return 0;
  if (world.carried < BEACON.required) {
    if (world.beaconNagT <= 0) {
      floater(world, world.beacon.x, world.beacon.y - 56, `NEED ${BEACON.required - world.carried} MORE EMBER${BEACON.required - world.carried > 1 ? 'S' : ''}`, COLORS.dim);
      world.beaconNagT = 1.2;
    }
    return 0;
  }
  if (world.warden) {
    if (world.beaconNagT <= 0) {
      floater(world, world.beacon.x, world.beacon.y - 56, 'SHIELDED — BREAK THE WARDEN', COLORS.warden);
      world.beaconNagT = 1.2;
    }
    return 0;
  }
  return deliver(world);
}

function updatePlayer(world, input, dt) {
  const p = world.player;
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.vx = p.dashX * PLAYER.dashSpeed;
    p.vy = p.dashY * PLAYER.dashSpeed;
  } else {
    p.vx += input.x * PLAYER.accel * dt;
    p.vy += input.y * PLAYER.accel * dt;
    const damp = Math.exp(-PLAYER.drag * dt);
    p.vx *= damp;
    p.vy *= damp;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > PLAYER.maxSpeed) {
      p.vx = (p.vx / speed) * PLAYER.maxSpeed;
      p.vy = (p.vy / speed) * PLAYER.maxSpeed;
    }
    if (input.dash && p.dashCd <= 0) {
      let dx = input.x;
      let dy = input.y;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(p.angle);
        dy = Math.sin(p.angle);
      }
      const len = Math.hypot(dx, dy) || 1;
      p.dashX = dx / len;
      p.dashY = dy / len;
      p.dashT = PLAYER.dashTime;
      p.dashCd = PLAYER.dashCooldown;
      p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.06);
      burst(world, p.x, p.y, COLORS.teal, 10, 180, 0.4);
    }
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.x < PLAYER.radius) { p.x = PLAYER.radius; p.vx = Math.abs(p.vx) * 0.4; }
  if (p.x > FIELD.width - PLAYER.radius) { p.x = FIELD.width - PLAYER.radius; p.vx = -Math.abs(p.vx) * 0.4; }
  if (p.y < PLAYER.radius) { p.y = PLAYER.radius; p.vy = Math.abs(p.vy) * 0.4; }
  if (p.y > FIELD.height - PLAYER.radius) { p.y = FIELD.height - PLAYER.radius; p.vy = -Math.abs(p.vy) * 0.4; }
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > 40) p.angle = Math.atan2(p.vy, p.vx);
  p.trail.unshift({ x: p.x, y: p.y, t: 0.22 });
  if (p.trail.length > 14) p.trail.pop();
  for (const t of p.trail) t.t -= dt;
  p.trail = p.trail.filter((t) => t.t > 0);
}

function updateWisps(world, dt) {
  const p = world.player;
  for (const w of world.wisps) {
    const want = angleTo(w.x, w.y, p.x, p.y);
    let diff = want - w.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = clamp(diff, -WISP.turnRate * dt, WISP.turnRate * dt);
    w.angle += turn;
    w.wobble += w.wobbleSpeed * dt;
    const wob = Math.sin(w.wobble) * 0.45;
    const a = w.angle + wob;
    w.vx = Math.cos(a) * w.speed;
    w.vy = Math.sin(a) * w.speed;
    w.x += w.vx * dt;
    w.y += w.vy * dt;
  }
  world.wisps = world.wisps.filter((w) => w.x > -80 && w.x < FIELD.width + 80 && w.y > -80 && w.y < FIELD.height + 80);
}

function updateWarden(world, dt) {
  const w = world.warden;
  if (!w) return;
  const p = world.player;
  w.wobble += dt * 2;
  const want = angleTo(w.x, w.y, p.x, p.y);
  let diff = want - w.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  w.angle += clamp(diff, -1.8 * dt, 1.8 * dt);
  const wob = Math.sin(w.wobble) * 0.3;
  w.vx = Math.cos(w.angle + wob) * WARDEN.speed;
  w.vy = Math.sin(w.angle + wob) * WARDEN.speed;
  w.x += w.vx * dt;
  w.y += w.vy * dt;
  w.x = clamp(w.x, 60, FIELD.width - 60);
  w.y = clamp(w.y, 60, FIELD.height - 60);
  world.wardenT += dt;
  if (world.wardenT > WARDEN.wispEvery) {
    world.wardenT = 0;
    if (world.wisps.length < 3 + world.wave) {
      spawnWisp(world, Math.floor(world.rng() * 4));
    }
  }
}

function updateShards(world, dt) {
  const p = world.player;
  for (const s of world.shards) {
    s.bob += s.bobSpeed * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.x < 30 || s.x > FIELD.width - 30) s.vx *= -1;
    if (s.y < 30 || s.y > FIELD.height - 30) s.vy *= -1;
    const d2 = dist2(s.x, s.y, p.x, p.y);
    if (d2 < SHARD.magnet * SHARD.magnet) {
      const d = Math.sqrt(d2) || 1;
      const pull = 620 * (1 - d / SHARD.magnet);
      s.x += ((p.x - s.x) / d) * pull * dt;
      s.y += ((p.y - s.y) / d) * pull * dt;
    }
  }
}

function updateParticles(world, dt) {
  for (const pt of world.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= Math.exp(-2.2 * dt);
    pt.vy *= Math.exp(-2.2 * dt);
    pt.life -= dt;
  }
  world.particles = world.particles.filter((pt) => pt.life > 0);
  for (const f of world.floaters) {
    f.y -= 34 * dt;
    f.t -= dt;
  }
  world.floaters = world.floaters.filter((f) => f.t > 0);
}

/** One fixed step. `input` is {x, y, dash}. Returns an event bitmask. */
export function stepWorld(world, input, dt) {
  if (world.phase !== 'play') return 0;
  let events = 0;
  world.time += dt;
  world.playTime += dt;
  world.beacon.pulse += dt;
  world.beaconNagT = Math.max(0, world.beaconNagT - dt);
  if (world.banner) {
    world.banner.t -= dt;
    if (world.banner.t <= 0) world.banner = null;
  }
  world.shake = Math.max(0, world.shake - 40 * dt);
  if (world.hitStop > 0) {
    world.hitStop -= dt;
    updateParticles(world, dt);
    return 0;
  }

  // Fuel: the quiet clock. Empty it and the skiff stalls, costing a hull.
  world.fuel -= (FUEL.drain + FUEL.drainPerWave * (world.wave - 1)) * dt;
  if (world.fuel <= 0) {
    world.fuel = FUEL.stallRefill;
    showBanner(world, 'FUEL STALL', 'A hull plate buckles as the lamp gutters', 2);
    events |= damagePlayer(world, world.player.x, world.player.y - 100);
    if (world.hearts <= 0) {
      world.phase = 'over';
      world.floaters.length = 0;
      return events | EVENT_OVER;
    }
  }

  updatePlayer(world, input, dt);
  updateShards(world, dt);
  updateWisps(world, dt);
  updateWarden(world, dt);

  const p = world.player;
  // Shard pickup.
  for (let i = world.shards.length - 1; i >= 0; i -= 1) {
    const s = world.shards[i];
    if (dist2(s.x, s.y, p.x, p.y) < SHARD.collect * SHARD.collect) {
      world.shards.splice(i, 1);
      if (world.carried < SHARD.carryMax) {
        world.carried += 1;
        world.fuel = Math.min(FUEL.max, world.fuel + FUEL.emberBonus);
        burst(world, s.x, s.y, COLORS.ember, 10, 160, 0.5);
        floater(world, s.x, s.y - 18, 'EMBER', COLORS.ember);
      } else {
        world.score += 5;
        floater(world, s.x, s.y - 18, '+5', COLORS.ember);
      }
    }
  }
  // Beacon delivery: only a full hold counts, and never through the shield.
  if (world.carried > 0 && dist2(p.x, p.y, world.beacon.x, world.beacon.y) < BEACON.deliver * BEACON.deliver) {
    events |= tryDeliver(world);
    if (world.phase === 'victory') return events;
  }

  // Wisp collisions: a dash dispels, a touch hurts.
  const dashing = p.dashT > 0;
  for (let i = world.wisps.length - 1; i >= 0; i -= 1) {
    const w = world.wisps[i];
    const rr = w.radius + PLAYER.radius;
    if (dist2(w.x, w.y, p.x, p.y) < rr * rr) {
      if (dashing) {
        world.wisps.splice(i, 1);
        world.score += SCORE.wispDash;
        burst(world, w.x, w.y, COLORS.violet, 22, 260, 0.6);
        floater(world, w.x, w.y - 20, `+${SCORE.wispDash}`, COLORS.violet);
      } else if (p.invuln <= 0) {
        events |= damagePlayer(world, w.x, w.y);
        if (world.hearts <= 0) {
          world.phase = 'over';
          world.floaters.length = 0;
          return events | EVENT_OVER;
        }
      }
    }
  }
  // Warden collisions.
  const warden = world.warden;
  if (warden) {
    const rr = warden.radius + PLAYER.radius;
    if (dist2(warden.x, warden.y, p.x, p.y) < rr * rr) {
      if (dashing) {
        warden.hp -= 1;
        warden.x += Math.cos(p.angle) * 60;
        warden.y += Math.sin(p.angle) * 60;
        world.shake = 12;
        burst(world, warden.x, warden.y, COLORS.warden, 30, 300, 0.7);
        if (warden.hp <= 0) {
          world.warden = null;
          world.score += SCORE.warden;
          burst(world, warden.x, warden.y, COLORS.warden, 70, 420, 1.1);
          burst(world, warden.x, warden.y, COLORS.ember, 40, 300, 1);
          floater(world, warden.x, warden.y - 40, `+${SCORE.warden} WARDEN DOWN`, COLORS.warden);
          showBanner(world, 'GUARD BROKEN', 'The beacon stands open — deliver your embers');
        } else {
          floater(world, warden.x, warden.y - 52, `GUARD ${warden.hp}/3`, COLORS.warden);
        }
      } else if (p.invuln <= 0) {
        events |= damagePlayer(world, warden.x, warden.y);
        if (world.hearts <= 0) {
          world.phase = 'over';
          world.floaters.length = 0;
          return events | EVENT_OVER;
        }
      }
    }
  }

  // Spawning.
  world.shardT -= dt;
  if (world.shardT <= 0) {
    world.shardT = SHARD.spawnEvery;
    if (world.shards.length < SHARD.max) spawnShard(world);
  }
  world.spawnT -= dt;
  const maxWisps = WISP.maxAlive + WISP.perWave * (world.wave - 1);
  if (world.spawnT <= 0) {
    world.spawnT = Math.max(WISP.spawnMin, WISP.spawnEvery - 0.12 * (world.wave - 1));
    if (world.wisps.length < maxWisps) spawnWisp(world, Math.floor(world.rng() * 4));
  }

  updateParticles(world, dt);
  return events;
}

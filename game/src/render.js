// Every pixel Emberline draws. The renderer reads the world state and nothing
// else, so a staged world renders exactly the frame the game would show.
import { BEACON, COLORS, FIELD, FUEL, PLAYER, SHARD } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  g.addColorStop(0, COLORS.skyTop);
  g.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const n of world.nebulae) {
    const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    ng.addColorStop(0, `rgba(${n.hue}, ${n.alpha})`);
    ng.addColorStop(1, `rgba(${n.hue}, 0)`);
    ctx.fillStyle = ng;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  ctx.restore();
  for (const s of world.stars) {
    const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(world.time * s.speed + s.phase));
    ctx.fillStyle = s.warm ? `rgba(255, 210, 140, ${a})` : `rgba(200, 215, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBeacon(ctx, world) {
  const b = world.beacon;
  const pulse = 1 + 0.12 * Math.sin(b.pulse * 3);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, BEACON.radius * 3.2);
  glow.addColorStop(0, 'rgba(55, 224, 200, 0.35)');
  glow.addColorStop(1, 'rgba(55, 224, 200, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(b.x - 160, b.y - 160, 320, 320);
  ctx.restore();
  // Rotating light beams.
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.pulse * 0.7);
  ctx.fillStyle = 'rgba(55, 224, 200, 0.10)';
  for (let i = 0; i < 2; i += 1) {
    ctx.rotate(Math.PI);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(150, -16);
    ctx.lineTo(150, 16);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Tower.
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.fillStyle = '#123a3a';
  ctx.strokeStyle = COLORS.teal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-13, 22);
  ctx.lineTo(-9, -12);
  ctx.lineTo(9, -12);
  ctx.lineTo(13, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, -12);
  ctx.lineTo(0, -26);
  ctx.lineTo(12, -12);
  ctx.closePath();
  ctx.fillStyle = COLORS.teal;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -30, 7 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = '#dffff8';
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.lineDashOffset = -b.pulse * 24;
  ctx.strokeStyle = 'rgba(55, 224, 200, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(b.x, b.y, BEACON.radius * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = COLORS.teal;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('B E A C O N', b.x, b.y + BEACON.radius + 22);
}

function drawShard(ctx, s, time) {
  const bobY = Math.sin(s.bob) * 4;
  const x = s.x;
  const y = s.y + bobY;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 1.4 + s.bob) * 0.35);
  ctx.shadowColor = COLORS.ember;
  ctx.shadowBlur = 16;
  ctx.fillStyle = COLORS.ember;
  ctx.beginPath();
  ctx.moveTo(0, -SHARD.radius);
  ctx.lineTo(SHARD.radius * 0.72, 0);
  ctx.lineTo(0, SHARD.radius);
  ctx.lineTo(-SHARD.radius * 0.72, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffe9b8';
  ctx.beginPath();
  ctx.moveTo(0, -SHARD.radius * 0.45);
  ctx.lineTo(SHARD.radius * 0.32, 0);
  ctx.lineTo(0, SHARD.radius * 0.45);
  ctx.lineTo(-SHARD.radius * 0.32, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWisp(ctx, w, time) {
  ctx.save();
  ctx.translate(w.x, w.y);
  ctx.shadowColor = COLORS.violet;
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(122, 79, 208, 0.9)';
  ctx.beginPath();
  const points = 14;
  for (let i = 0; i <= points; i += 1) {
    const a = (i / points) * Math.PI * 2;
    const r = w.radius * (1 + 0.16 * Math.sin(a * 3 + time * 5 + w.wobble));
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // Eyes that track the player.
  const ex = Math.cos(w.angle) * 5;
  const ey = Math.sin(w.angle) * 5;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-5 + ex, -3 + ey, 3.4, 0, Math.PI * 2);
  ctx.arc(5 + ex, -3 + ey, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a1052';
  ctx.beginPath();
  ctx.arc(-5 + ex * 1.6, -3 + ey * 1.6, 1.7, 0, Math.PI * 2);
  ctx.arc(5 + ex * 1.6, -3 + ey * 1.6, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWarden(ctx, w, time) {
  ctx.save();
  ctx.translate(w.x, w.y);
  ctx.shadowColor = COLORS.warden;
  ctx.shadowBlur = 30;
  ctx.fillStyle = 'rgba(90, 40, 160, 0.95)';
  ctx.beginPath();
  const points = 18;
  for (let i = 0; i <= points; i += 1) {
    const a = (i / points) * Math.PI * 2;
    const r = w.radius * (1 + 0.12 * Math.sin(a * 4 + time * 4));
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // Crown spikes, seated on the orb, not floating above it.
  ctx.fillStyle = COLORS.warden;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 14 - 6, -w.radius + 12);
    ctx.lineTo(i * 14, -w.radius - 10 - Math.abs(i) * -4);
    ctx.lineTo(i * 14 + 6, -w.radius + 12);
    ctx.closePath();
    ctx.fill();
  }
  const ex = Math.cos(w.angle) * 7;
  const ey = Math.sin(w.angle) * 7;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-11 + ex, -6 + ey, 5, 0, Math.PI * 2);
  ctx.arc(11 + ex, -6 + ey, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff2e63';
  ctx.beginPath();
  ctx.arc(-11 + ex * 1.5, -6 + ey * 1.5, 2.4, 0, Math.PI * 2);
  ctx.arc(11 + ex * 1.5, -6 + ey * 1.5, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // Guard pips.
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < w.hp ? COLORS.warden : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(-16 + i * 16, -w.radius - 34);
    ctx.lineTo(-10 + i * 16, -w.radius - 26);
    ctx.lineTo(-16 + i * 16, -w.radius - 18);
    ctx.lineTo(-22 + i * 16, -w.radius - 26);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (p.invuln > 0 && Math.floor(world.time * 12) % 2 === 0 && world.phase === 'play') {
    // Blink while invulnerable: the player can see the grace period.
  } else {
    // Trail.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const t of p.trail) {
      ctx.fillStyle = `rgba(55, 224, 200, ${0.25 * (t.t / 0.22)})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    // Engine flame.
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 60) {
      const flick = 14 + Math.sin(world.time * 31) * 5 + speed * 0.03;
      ctx.fillStyle = 'rgba(255, 122, 24, 0.85)';
      ctx.beginPath();
      ctx.moveTo(-14, -6);
      ctx.lineTo(-14 - flick, 0);
      ctx.lineTo(-14, 6);
      ctx.closePath();
      ctx.fill();
    }
    // Hull: a little lantern-skiff.
    ctx.shadowColor = COLORS.teal;
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#0f3d3a';
    ctx.strokeStyle = COLORS.teal;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Lantern.
    ctx.fillStyle = COLORS.ember;
    ctx.beginPath();
    ctx.arc(2, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.arc(2, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Dash readiness ring.
    if (p.dashCd <= 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(55, 224, 200, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER.radius + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Carried embers orbit the skiff.
    for (let i = 0; i < world.carried; i += 1) {
      const a = world.time * 2.4 + (i / 5) * Math.PI * 2;
      const ex = p.x + Math.cos(a) * 26;
      const ey = p.y + Math.sin(a) * 26;
      ctx.save();
      ctx.shadowColor = COLORS.ember;
      ctx.shadowBlur = 8;
      ctx.fillStyle = COLORS.ember;
      ctx.beginPath();
      ctx.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawParticles(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const pt of world.particles) {
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '700 20px system-ui, sans-serif';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.t / f.max);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawHeart(ctx, x, y, filled, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-11, -4, -6, -12, 0, -6);
  ctx.bezierCurveTo(6, -12, 11, -4, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? COLORS.red : 'rgba(255,255,255,0.14)';
  ctx.fill();
  ctx.restore();
}

function drawHUD(ctx, world) {
  ctx.save();
  // Top strip.
  ctx.fillStyle = 'rgba(4, 7, 15, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, 64);
  ctx.fillStyle = COLORS.cream;
  ctx.textAlign = 'left';
  ctx.font = '800 26px system-ui, sans-serif';
  ctx.fillText(`SCORE ${world.score.toLocaleString('en-US')}`, 20, 30);
  // The multiplier the HUD shows is the one deliver() scores with: the first
  // delivery is x1.00, each consecutive delivery without a hit adds 0.25.
  const mult = world.combo >= 1 ? Math.min(3, 1 + 0.25 * (world.combo - 1)) : 1;
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.fillStyle = world.combo >= 2 ? COLORS.ember : COLORS.dim;
  ctx.fillText(world.combo >= 2 ? `COMBO x${mult.toFixed(2)}  (${world.combo} deliveries)` : 'COMBO — deliver to build it', 20, 52);
  // Beacons + wave, centred.
  ctx.textAlign = 'center';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`WAVE ${world.wave}`, FIELD.width / 2, 24);
  for (let i = 0; i < BEACON.total; i += 1) {
    const x = FIELD.width / 2 - 56 + i * 28;
    const y = 44;
    ctx.fillStyle = i < world.beaconsLit ? COLORS.teal : 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    if (i < world.beaconsLit) {
      ctx.fillStyle = '#062a26';
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Hearts + fuel, right. The FUEL label sits left of its bar, never on it.
  for (let i = 0; i < 3; i += 1) {
    drawHeart(ctx, FIELD.width - 30 - i * 30, 26, i < world.hearts, 26);
  }
  ctx.fillStyle = COLORS.dim;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('FUEL', FIELD.width - 178, 54);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(FIELD.width - 170, 44, 150, 10);
  const fuelW = 150 * Math.max(0, world.fuel / FUEL.max);
  ctx.fillStyle = world.fuel < 25 ? COLORS.red : COLORS.ember;
  ctx.fillRect(FIELD.width - 170, 44, fuelW, 10);
  // Bottom hint.
  ctx.textAlign = 'center';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 243, 214, 0.75)';
  let hint = 'Collect embers — fly through them';
  if (world.carried > 0 && world.warden) hint = `Deliver ${world.carried} ember${world.carried > 1 ? 's' : ''} — or dash through the Warden`;
  else if (world.carried > 0) hint = `Deliver ${world.carried} ember${world.carried > 1 ? 's' : ''} to the beacon  •  Space to dash`;
  else if (world.warden) hint = 'The Warden guards the last beacon — dash through it to break its guard';
  ctx.fillText(hint, FIELD.width / 2, FIELD.height - 16);
  ctx.restore();
}

function drawBanner(ctx, world) {
  if (!world.banner) return;
  const b = world.banner;
  const alpha = Math.min(1, b.t / 0.4, (b.max - b.t) / 0.25 + 0.6);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.textAlign = 'center';
  ctx.shadowColor = COLORS.ember;
  ctx.shadowBlur = 22;
  ctx.fillStyle = COLORS.cream;
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.fillText(b.text, FIELD.width / 2, 190);
  ctx.shadowBlur = 0;
  if (b.sub) {
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(b.sub, FIELD.width / 2, 222);
  }
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(4, 8, 18, 0.82)';
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.45)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();
}

function drawTitle(ctx, world, best) {
  ctx.fillStyle = 'rgba(3, 5, 12, 0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.save();
  ctx.textAlign = 'center';
  const grad = ctx.createLinearGradient(0, 150, 0, 260);
  grad.addColorStop(0, '#ffe9b8');
  grad.addColorStop(0.55, COLORS.ember);
  grad.addColorStop(1, COLORS.emberHot);
  ctx.fillStyle = grad;
  ctx.shadowColor = COLORS.emberHot;
  ctx.shadowBlur = 34;
  ctx.font = '900 96px system-ui, sans-serif';
  ctx.fillText('EMBERLINE', FIELD.width / 2, 240);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.teal;
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText('C O U R I E R   O F   T H E   L A S T   L I G H T', FIELD.width / 2, 282);
  panel(ctx, FIELD.width / 2 - 330, 330, 660, 218);
  ctx.fillStyle = COLORS.cream;
  ctx.font = '600 19px system-ui, sans-serif';
  ctx.fillText('The beacons are going dark. You are the courier.', FIELD.width / 2, 374);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '500 17px system-ui, sans-serif';
  ctx.fillText('WASD / arrows — steer      SPACE / click — dash', FIELD.width / 2, 408);
  ctx.fillText('Dash through a wisp to dispel it — deliveries refill fuel', FIELD.width / 2, 434);
  ctx.fillText('Collect ember shards, deliver them to the beacon, light all 5 to win.', FIELD.width / 2, 460);
  ctx.fillText('3 hulls. Beware the Warden on wave 5.', FIELD.width / 2, 486);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(best > 0 ? `BEST SCORE  ${best.toLocaleString('en-US')}` : 'No voyages yet — light the first beacon', FIELD.width / 2, 514);
  const blink = 0.85 + 0.15 * Math.sin(world.time * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = COLORS.ember;
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('PRESS ENTER OR CLICK TO SAIL', FIELD.width / 2, 606);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawEnd(ctx, world, best, victory) {
  ctx.fillStyle = victory ? 'rgba(20, 14, 2, 0.55)' : 'rgba(8, 2, 6, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.save();
  ctx.textAlign = 'center';
  panel(ctx, FIELD.width / 2 - 340, 190, 680, 360);
  if (victory) {
    ctx.fillStyle = COLORS.ember;
    ctx.shadowColor = COLORS.ember;
    ctx.shadowBlur = 26;
    ctx.font = '900 54px system-ui, sans-serif';
    ctx.fillText('ALL BEACONS LIT', FIELD.width / 2, 268);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.cream;
    ctx.font = '600 21px system-ui, sans-serif';
    ctx.fillText('The night has light again — the courier sails on.', FIELD.width / 2, 306);
  } else {
    ctx.fillStyle = COLORS.red;
    ctx.shadowColor = COLORS.red;
    ctx.shadowBlur = 26;
    ctx.font = '900 54px system-ui, sans-serif';
    ctx.fillText('THE LIGHT FADES', FIELD.width / 2, 268);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.cream;
    ctx.font = '600 21px system-ui, sans-serif';
    ctx.fillText('The skiff drifts dark. The beacons wait for another run.', FIELD.width / 2, 306);
  }
  const mins = Math.floor(world.playTime / 60);
  const secs = Math.floor(world.playTime % 60).toString().padStart(2, '0');
  ctx.fillStyle = COLORS.dim;
  ctx.font = '600 19px system-ui, sans-serif';
  const stats = [
    `SCORE  ${world.score.toLocaleString('en-US')}`,
    `TIME  ${mins}:${secs}`,
    `DELIVERIES  ${world.deliveries}`,
    `BEST COMBO  x${(1 + 0.25 * Math.max(0, world.bestCombo - 1)).toFixed(2)}`,
    `BEST SCORE  ${Math.max(best, world.score).toLocaleString('en-US')}`,
  ];
  stats.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 356 + i * 30));
  const blink = 0.85 + 0.15 * Math.sin(world.time * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = COLORS.ember;
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('PRESS R TO SAIL AGAIN', FIELD.width / 2, 522);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(3, 5, 12, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.cream;
  ctx.font = '900 56px system-ui, sans-serif';
  ctx.fillText('PAUSED', FIELD.width / 2, 380);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText('P or Esc to resume  •  M to mute', FIELD.width / 2, 424);
  ctx.restore();
}

export function drawWorld(ctx, world, screen, best) {
  ctx.save();
  if (world.shake > 0) {
    const s = world.shake;
    ctx.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
  }
  drawBackground(ctx, world);
  // The beacon stays out of the title frame: its tower would poke through the
  // title text. It is drawn on every play screen instead.
  if (screen !== SCREEN_TITLE) drawBeacon(ctx, world);
  for (const s of world.shards) drawShard(ctx, s, world.time);
  for (const w of world.wisps) drawWisp(ctx, w, world.time);
  if (world.warden) drawWarden(ctx, world.warden, world.time);
  // The title frame shows the field, not the skiff: the skiff and its pickup
  // floaters would sit under the subtitle. They appear on play screens.
  if (screen === SCREEN_PLAY || screen === SCREEN_PAUSE) drawPlayer(ctx, world);
  drawParticles(ctx, world);
  if (screen !== SCREEN_TITLE) drawFloaters(ctx, world);
  if (screen === SCREEN_PLAY || screen === SCREEN_PAUSE) drawHUD(ctx, world);
  drawBanner(ctx, world);
  ctx.restore();
  if (screen === SCREEN_TITLE) drawTitle(ctx, world, best);
  else if (screen === SCREEN_VICTORY) drawEnd(ctx, world, best, true);
  else if (screen === SCREEN_OVER) drawEnd(ctx, world, best, false);
  else if (screen === SCREEN_PAUSE) drawPause(ctx);
}

// Emberline tuning: every number the game balances on lives here, so a tuning
// pass touches one file and nothing else.
//
// v2 balance notes (measured with a headless autopilot bot over 30 seeds):
// - A beacon only opens for a FULL hold of 5 embers. In v1 any carried > 0
//   lit a beacon, so the whole game was winnable in ~13s by ferrying single
//   embers and the carry/combo/fuel systems were decoration.
// - The Warden shields the last beacon while it lives: the wave-5 boss is
//   the way to win now, not a trap to ignore. In v1 a bot that hunted the
//   Warden won 5/30 while a bot that ignored it won 30/30.
// - Fuel is a real clock now: drain 2.3/s means a slow wave costs fuel the
//   embers alone cannot repay, so dawdling between deliveries stalls the
//   skiff. In v1 fuel never dropped below ~80.
export const FIELD = { width: 1280, height: 800 };

export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  accel: 2400,
  maxSpeed: 335,
  drag: 2.6,
  dashSpeed: 940,
  dashTime: 0.18,
  dashCooldown: 1.25,
  invulnTime: 1.6,
};

export const FUEL = {
  max: 100,
  drain: 2.3,
  drainPerWave: 0.2,
  emberBonus: 4,
  stallRefill: 50,
};

export const SHARD = {
  max: 6,
  spawnEvery: 1.15,
  radius: 11,
  magnet: 120,
  collect: 30,
  carryMax: 5,
};

export const WISP = {
  baseSpeed: 72,
  speedPerWave: 13,
  maxSpeed: 228,
  radius: 17,
  spawnEvery: 2.3,
  spawnMin: 0.9,
  maxAlive: 3,
  perWave: 1,
  turnRate: 2.7,
};

export const BEACON = {
  radius: 46,
  deliver: 66,
  total: 5,
  // Embers a beacon needs before it opens. A partial hold does nothing:
  // the beacon shows how many more it wants.
  required: 5,
};

export const WARDEN = {
  radius: 48,
  hp: 3,
  speed: 88,
  wispEvery: 6,
};

export const SCORE = {
  ember: 10,
  wispDash: 25,
  warden: 250,
  comboStep: 0.25,
  comboCap: 3,
};

export const COLORS = {
  skyTop: '#0b1026',
  skyBottom: '#05070f',
  ember: '#ffb347',
  emberHot: '#ff7a18',
  teal: '#37e0c8',
  violet: '#b388ff',
  violetDeep: '#7a4fd0',
  warden: '#c98bff',
  cream: '#fff3d6',
  dim: '#8b93b8',
  red: '#ff5d73',
};

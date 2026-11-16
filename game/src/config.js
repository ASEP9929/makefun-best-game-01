// Emberline tuning: every number the game balances on lives here, so a tuning
// pass touches one file and nothing else.
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
  drain: 1.55,
  drainPerWave: 0.15,
  emberBonus: 6,
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
};

export const WARDEN = {
  radius: 48,
  hp: 3,
  speed: 96,
  wispEvery: 4,
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

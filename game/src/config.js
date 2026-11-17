// PULSEFALL configuration: arena size, palette, tuning and wave tables.
// One place for every number the rest of the game reads, so balancing is
// a config edit instead of a hunt through the simulation.

export const ARENA = { width: 1280, height: 800 };

// Palette: deep-space navy, neon cyan/magenta/lime accents, warm amber.
export const COLORS = {
  bg0: '#070a18',
  bg1: '#0d1230',
  grid: '#1b2450',
  gridBright: '#26327a',
  player: '#37e6ff',
  playerGlow: '#9df3ff',
  bullet: '#ffe45e',
  enemyBullet: '#ff5e7a',
  chaser: '#ff5e7a',
  dasher: '#ff9f2e',
  splitter: '#b06bff',
  mini: '#d9a7ff',
  weaver: '#4dff88',
  boss: '#ff2e63',
  pickupHealth: '#4dff88',
  pickupRapid: '#ffe45e',
  text: '#eef2ff',
  dim: '#8b96c9',
  danger: '#ff4d6d',
  cardBg: '#141a3d',
  cardEdge: '#3b4a9e',
};

export const PLAYER = {
  radius: 16,
  speed: 300,
  maxHp: 100,
  fireInterval: 0.16, // seconds between shots
  bulletSpeed: 640,
  bulletDamage: 12,
  bulletRadius: 5,
  dashSpeed: 900,
  dashTime: 0.16,
  dashCooldown: 1.6,
  pickupRadius: 90,
};

// Enemy definitions keyed by type. hp and speed scale with the wave.
export const ENEMIES = {
  chaser: { radius: 18, hp: 22, speed: 105, score: 100, color: COLORS.chaser, shape: 'diamond' },
  dasher: { radius: 16, hp: 18, speed: 70, score: 150, color: COLORS.dasher, shape: 'triangle' },
  splitter: { radius: 26, hp: 40, speed: 60, score: 200, color: COLORS.splitter, shape: 'hexagon' },
  mini: { radius: 10, hp: 8, speed: 165, score: 50, color: COLORS.mini, shape: 'diamond' },
  weaver: { radius: 17, hp: 26, speed: 85, score: 180, color: COLORS.weaver, shape: 'square' },
  boss: { radius: 52, hp: 900, speed: 55, score: 5000, color: COLORS.boss, shape: 'boss' },
};

// How many of each enemy a wave fields. Boss waves (every 5th) add a boss
// on top of a lighter escort. Counts grow, then flatten so late waves stay fair.
export function waveComposition(wave) {
  const n = (base, per) => Math.min(2 + base + Math.floor(wave * per), 26);
  const comp = {
    chaser: n(3, 0.9),
    dasher: wave >= 2 ? n(1, 0.55) : 0,
    splitter: wave >= 3 ? n(0, 0.5) : 0,
    weaver: wave >= 4 ? n(0, 0.45) : 0,
  };
  if (wave % 5 === 0) {
    comp.boss = 1;
    comp.chaser = Math.max(2, Math.floor(comp.chaser / 2));
    comp.dasher = Math.max(1, Math.floor(comp.dasher / 2));
  }
  return comp;
}

// Enemy hp multiplier by wave: +12% per wave, compounding gently.
export function waveHpScale(wave) {
  return 1 + (wave - 1) * 0.12;
}

export const COMBO = {
  window: 2.5, // seconds before the combo timer runs out
  step: 0.1, // multiplier gained per kill, capped below
  cap: 5,
};

export const PICKUPS = {
  healthChance: 0.1, // chance an enemy drops a health orb
  rapidChance: 0.07, // chance an enemy drops a rapid-fire orb
  healthHeal: 25,
  rapidDuration: 8, // seconds of halved fire interval
  magnetBase: 90,
};

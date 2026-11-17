// Enemies: five behaviours plus a boss. Each enemy is a plain object with
// a type, position, velocity, hp and a small state machine (telegraph timers
// for the Dasher's lunge, strafe phase for the Weaver, radial bursts for
// the Boss). Spawning picks an edge away from the player.

import { ARENA, ENEMIES, waveHpScale } from './config.js';

let nextId = 1;

export function spawnEnemy(type, rng, wave, player) {
  const def = ENEMIES[type];
  // Spawn on a random arena edge, at least 260px from the player.
  let x = 0;
  let y = 0;
  for (let tries = 0; tries < 12; tries += 1) {
    const edge = rng.int(0, 3);
    if (edge === 0) { x = rng.range(40, ARENA.width - 40); y = 40; }
    if (edge === 1) { x = rng.range(40, ARENA.width - 40); y = ARENA.height - 40; }
    if (edge === 2) { x = 40; y = rng.range(40, ARENA.height - 40); }
    if (edge === 3) { x = ARENA.width - 40; y = rng.range(40, ARENA.height - 40); }
    if (Math.hypot(x - player.x, y - player.y) > 260) break;
  }
  const hpScale = waveHpScale(wave);
  return {
    id: nextId += 1,
    type,
    x, y,
    vx: 0, vy: 0,
    radius: def.radius,
    hp: def.hp * hpScale,
    maxHp: def.hp * hpScale,
    speed: def.speed * (1 + Math.min(0.4, (wave - 1) * 0.02)),
    score: def.score,
    color: def.color,
    shape: def.shape,
    angle: 0,
    flash: 0, // hit-flash timer
    // Behaviour state.
    state: 'chase',
    stateTimer: rng.range(0.5, 1.5),
    lungeX: 0,
    lungeY: 0,
    strafePhase: rng.range(0, Math.PI * 2),
    shootTimer: rng.range(1, 2),
    burstTimer: 2.5,
    spin: 0,
  };
}

export function updateEnemy(e, dt, player, rng, fireEnemy) {
  e.flash = Math.max(0, e.flash - dt);
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  if (e.type === 'chaser' || e.type === 'mini') {
    // Steady pursuit, straight at the player.
    e.vx = nx * e.speed;
    e.vy = ny * e.speed;
    e.angle = Math.atan2(dy, dx);
  } else if (e.type === 'dasher') {
    // Telegraph (wind up, flash, pause), then a fast lunge.
    e.stateTimer -= dt;
    if (e.state === 'chase') {
      e.vx = nx * e.speed;
      e.vy = ny * e.speed;
      e.angle = Math.atan2(dy, dx);
      if (e.stateTimer <= 0 && dist < 420) {
        e.state = 'telegraph';
        e.stateTimer = 0.55;
        e.lungeX = nx;
        e.lungeY = ny;
      }
    } else if (e.state === 'telegraph') {
      e.vx = 0;
      e.vy = 0;
      e.flash = 0.1;
      if (e.stateTimer <= 0) {
        e.state = 'lunge';
        e.stateTimer = 0.32;
      }
    } else if (e.state === 'lunge') {
      e.vx = e.lungeX * e.speed * 5.2;
      e.vy = e.lungeY * e.speed * 5.2;
      if (e.stateTimer <= 0) {
        e.state = 'recover';
        e.stateTimer = 0.9;
      }
    } else {
      e.vx = 0;
      e.vy = 0;
      if (e.stateTimer <= 0) {
        e.state = 'chase';
        e.stateTimer = rng.range(0.8, 1.6);
      }
    }
  } else if (e.type === 'splitter') {
    // Slow, heavy pursuit; splits into minis on death (handled by world).
    e.vx = nx * e.speed;
    e.vy = ny * e.speed;
    e.spin += dt * 1.2;
    e.angle = e.spin;
  } else if (e.type === 'weaver') {
    // Sine strafe while closing in, and fires aimed shots.
    e.strafePhase += dt * 3.2;
    const strafe = Math.sin(e.strafePhase) * 0.9;
    const px = -ny * strafe;
    const py = nx * strafe;
    e.vx = (nx * 0.55 + px) * e.speed;
    e.vy = (ny * 0.55 + py) * e.speed;
    e.angle = Math.atan2(dy, dx);
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && dist < 560) {
      e.shootTimer = rng.range(1.6, 2.4);
      fireEnemy(e.x, e.y, Math.atan2(dy, dx), 260, 10, 6);
    }
  } else if (e.type === 'boss') {
    // Big, slow, relentless: drifts toward the player and fires radial rings.
    e.vx = nx * e.speed;
    e.vy = ny * e.speed;
    e.angle += dt * 0.8;
    e.burstTimer -= dt;
    if (e.burstTimer <= 0) {
      e.burstTimer = 2.6;
      const count = 14;
      for (let i = 0; i < count; i += 1) {
        const a = (i / count) * Math.PI * 2 + e.angle * 0.4;
        fireEnemy(e.x, e.y, a, 190, 12, 7);
      }
      // Plus one aimed burst straight at the player.
      for (let k = -1; k <= 1; k += 1) {
        fireEnemy(e.x, e.y, Math.atan2(dy, dx) + k * 0.18, 300, 12, 7);
      }
    }
  }

  e.x += e.vx * dt;
  e.y += e.vy * dt;
  // Enemies stay inside the arena.
  e.x = Math.max(e.radius, Math.min(ARENA.width - e.radius, e.x));
  e.y = Math.max(e.radius, Math.min(ARENA.height - e.radius, e.y));
}

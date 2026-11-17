// The player ship: movement, aim, shooting, dash with i-frames, and the
// upgradeable stats that make builds diverge (damage, fire rate, split
// shot, magnet, shield, max HP, move speed, dash recharge).

import { PLAYER, PICKUPS } from './config.js';

export function createPlayer() {
  const p = {
    x: 640,
    y: 400,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    speed: PLAYER.speed,
    damage: PLAYER.bulletDamage,
    fireInterval: PLAYER.fireInterval,
    bulletSpeed: PLAYER.bulletSpeed,
    split: 1, // bullets per shot
    magnet: PICKUPS.magnetBase,
    shield: 0, // absorbs this many hits before HP is touched
    dashCooldownMax: PLAYER.dashCooldown,
    dashCooldown: 0,
    dashTime: 0,
    dashDirX: 0,
    dashDirY: -1,
    invuln: 0, // i-frame timer
    fireTimer: 0,
    rapidTimer: 0, // rapid-fire pickup time left
    alive: true,
  };
  return p;
}

export function resetPlayer(p) {
  const fresh = createPlayer();
  Object.assign(p, fresh);
}

export function updatePlayer(p, input, dt, fire) {
  if (!p.alive) return;

  p.fireTimer -= dt;
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.rapidTimer = Math.max(0, p.rapidTimer - dt);

  // Aim at the mouse, always.
  p.angle = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);

  const move = input.moveVector();

  // Dash: Shift or Space, with a cooldown and brief invulnerability.
  const dashKey = input.wasPressed('ShiftLeft') || input.wasPressed('ShiftRight') || input.wasPressed('Space');
  if (dashKey && p.dashCooldown <= 0 && p.dashTime <= 0) {
    const dx = move.x !== 0 || move.y !== 0 ? move.x : Math.cos(p.angle);
    const dy = move.x !== 0 || move.y !== 0 ? move.y : Math.sin(p.angle);
    p.dashDirX = dx;
    p.dashDirY = dy;
    p.dashTime = PLAYER.dashTime;
    p.dashCooldown = p.dashCooldownMax;
    p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.08);
  }

  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.x += p.dashDirX * PLAYER.dashSpeed * dt;
    p.y += p.dashDirY * PLAYER.dashSpeed * dt;
  } else {
    p.x += move.x * p.speed * dt;
    p.y += move.y * p.speed * dt;
  }

  // Keep the ship inside the arena.
  p.x = Math.max(p.radius, Math.min(1280 - p.radius, p.x));
  p.y = Math.max(p.radius, Math.min(800 - p.radius, p.y));

  // Hold mouse to fire; split shot fans extra bullets around the aim.
  if (input.mouse.down && p.fireTimer <= 0) {
    const interval = p.rapidTimer > 0 ? p.fireInterval * 0.5 : p.fireInterval;
    p.fireTimer = interval;
    const spread = 0.14;
    const count = p.split;
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * spread;
      fire(p.x + Math.cos(p.angle) * (p.radius + 6), p.y + Math.sin(p.angle) * (p.radius + 6),
        p.angle + offset, p.bulletSpeed, p.damage);
    }
  }
}

// Apply damage to the player: shield absorbs whole hits first, then the
// i-frame window blocks everything. Returns true if the player died.
export function damagePlayer(p, amount) {
  if (!p.alive || p.invuln > 0) return false;
  if (p.shield > 0) {
    p.shield -= 1;
    p.invuln = 0.6;
    return false;
  }
  p.hp -= amount;
  p.invuln = 0.7;
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    return true;
  }
  return false;
}

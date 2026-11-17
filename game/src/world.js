// The world: the single place the game state lives. Waves, spawning,
// collisions, pickups, score and combo, and the transitions between the
// title, play, upgrade-choice and game-over screens.

import { ARENA, COMBO, PICKUPS, waveComposition } from './config.js';
import { createPlayer, resetPlayer, updatePlayer, damagePlayer } from './player.js';
import { spawnEnemy, updateEnemy } from './enemies.js';
import { createShots } from './shots.js';
import { createParticles } from './particles.js';
import { rollUpgrades } from './upgrades.js';
import { makeRng } from './random.js';

export function createWorld(seed = 1337) {
  const rng = makeRng(seed);
  const world = {
    rng,
    state: 'title', // title | play | upgrade | over | paused
    prevState: 'play',
    time: 0,
    wave: 0,
    score: 0,
    best: 0,
    combo: 1,
    comboTimer: 0,
    kills: 0,
    enemies: [],
    pickups: [],
    spawnQueue: [],
    spawnTimer: 0,
    betweenTimer: 0,
    upgradeChoices: [],
    boss: null,
    shake: 0,
    milestone: 0, // wave-10 banner timer
    milestoneText: '',
    player: createPlayer(),
    shots: createShots(),
    particles: createParticles(),
    stats: { shotsFired: 0, hits: 0 },
    muted: false,
  };
  try {
    world.best = Number(window.localStorage.getItem('pulsefall-best') || 0) || 0;
  } catch {
    world.best = 0;
  }
  return world;
}

export function startRun(world) {
  resetPlayer(world.player);
  world.enemies.length = 0;
  world.pickups.length = 0;
  world.spawnQueue.length = 0;
  world.shots.clear();
  world.particles.clear();
  world.score = 0;
  world.combo = 1;
  world.comboTimer = 0;
  world.kills = 0;
  world.wave = 0;
  world.boss = null;
  world.milestone = 0;
  world.time = 0;
  world.stats = { shotsFired: 0, hits: 0 };
  world.state = 'play';
  startWave(world);
}

function startWave(world) {
  world.wave += 1;
  const comp = waveComposition(world.wave);
  world.spawnQueue = [];
  for (const [type, count] of Object.entries(comp)) {
    for (let i = 0; i < count; i += 1) world.spawnQueue.push(type);
  }
  // Shuffle the queue so the wave arrives mixed, not in type order.
  for (let i = world.spawnQueue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(world.rng.next() * (i + 1));
    [world.spawnQueue[i], world.spawnQueue[j]] = [world.spawnQueue[j], world.spawnQueue[i]];
  }
  world.spawnTimer = 0.4;
  world.betweenTimer = 0;
  if (world.wave % 5 === 0) {
    world.milestoneText = `WAVE ${world.wave} — PULSE WARDEN INBOUND`;
    world.milestone = 2.6;
  } else if (world.wave === 10) {
    world.milestoneText = 'WAVE 10 — MILESTONE REACHED';
    world.milestone = 2.6;
  } else if (world.wave > 10 && world.wave % 5 === 1) {
    world.milestoneText = `WAVE ${world.wave} — KEEP FALLING`;
    world.milestone = 2.2;
  }
}

function addScore(world, base) {
  world.score += Math.round(base * world.combo);
  world.combo = Math.min(COMBO.cap, world.combo + COMBO.step);
  world.comboTimer = COMBO.window;
}

function dropPickup(world, x, y) {
  const roll = world.rng.next();
  if (roll < PICKUPS.healthChance) {
    world.pickups.push({ x, y, kind: 'health', radius: 12, life: 12 });
  } else if (roll < PICKUPS.healthChance + PICKUPS.rapidChance) {
    world.pickups.push({ x, y, kind: 'rapid', radius: 12, life: 12 });
  }
}

function killEnemy(world, enemy, audio) {
  world.kills += 1;
  addScore(world, enemy.score);
  world.particles.burst(enemy.x, enemy.y, enemy.color, 16, 300);
  world.particles.shards(enemy.x, enemy.y, enemy.color, 6);
  world.particles.ring(enemy.x, enemy.y, enemy.color, enemy.radius * 2.4);
  world.particles.floatText(enemy.x, enemy.y - enemy.radius, `+${Math.round(enemy.score * world.combo)}`, '#ffe45e', 16);
  world.shake = Math.max(world.shake, enemy.type === 'boss' ? 14 : 5);
  if (audio) audio.explode();
  dropPickup(world, enemy.x, enemy.y);
  if (enemy.type === 'splitter') {
    // A Splitter breaks into three minis on death.
    for (let i = 0; i < 3; i += 1) {
      const mini = spawnEnemy('mini', world.rng, world.wave, world.player);
      mini.x = enemy.x + (world.rng.next() - 0.5) * 50;
      mini.y = enemy.y + (world.rng.next() - 0.5) * 50;
      world.enemies.push(mini);
    }
  }
  if (enemy.type === 'boss') {
    world.boss = null;
    world.particles.burst(enemy.x, enemy.y, '#ffffff', 60, 520);
    world.shake = 18;
  }
}

export function updateWorld(world, input, dt, audio) {
  world.time += dt;
  world.shake = Math.max(0, world.shake - dt * 30);
  world.milestone = Math.max(0, world.milestone - dt);

  if (world.state !== 'play') {
    world.particles.update(dt);
    return;
  }

  // Combo decays once its timer runs out.
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 1;
  }

  const player = world.player;
  updatePlayer(player, input, dt, (x, y, angle, speed, damage) => {
    world.shots.firePlayer(x, y, angle, speed, damage);
    world.stats.shotsFired += 1;
    if (audio) audio.shoot();
  });

  // Spawn the wave's queue a few at a time.
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      world.spawnTimer = 0.35;
      const batch = Math.min(3, world.spawnQueue.length);
      for (let i = 0; i < batch; i += 1) {
        const type = world.spawnQueue.shift();
        const e = spawnEnemy(type, world.rng, world.wave, player);
        world.enemies.push(e);
        if (type === 'boss') {
          world.boss = e;
          if (audio) audio.bossWarn();
        }
      }
    }
  }

  const fireEnemy = (x, y, angle, speed, damage, radius) => {
    world.shots.fireEnemy(x, y, angle, speed, damage, radius);
  };
  for (const e of world.enemies) updateEnemy(e, dt, player, world.rng, fireEnemy);
  world.shots.update(dt, ARENA);

  // Player bullets vs enemies.
  for (let bi = world.shots.playerBullets.length - 1; bi >= 0; bi -= 1) {
    const b = world.shots.playerBullets[bi];
    let consumed = false;
    for (let ei = world.enemies.length - 1; ei >= 0; ei -= 1) {
      const e = world.enemies[ei];
      const d = Math.hypot(b.x - e.x, b.y - e.y);
      if (d < b.radius + e.radius) {
        e.hp -= b.damage;
        e.flash = 0.12;
        world.stats.hits += 1;
        world.particles.burst(b.x, b.y, e.color, 4, 160);
        world.particles.floatText(b.x, b.y - 10, `${Math.round(b.damage)}`, '#ffffff', 13);
        if (audio) audio.hit();
        world.shots.playerBullets.splice(bi, 1);
        consumed = true;
        if (e.hp <= 0) {
          world.enemies.splice(ei, 1);
          killEnemy(world, e, audio);
        }
        break;
      }
    }
    if (consumed) continue;
  }

  // Enemies touching the player.
  for (const e of world.enemies) {
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < e.radius + player.radius - 2) {
      const died = damagePlayer(player, e.type === 'boss' ? 25 : 12);
      world.shake = Math.max(world.shake, 9);
      if (audio) audio.hurt();
      // Knock the enemy back a little so contact is not a sticky drain.
      const push = 26;
      const a = Math.atan2(e.y - player.y, e.x - player.x);
      e.x += Math.cos(a) * push;
      e.y += Math.sin(a) * push;
      if (died) return endRun(world, audio);
    }
  }

  // Enemy bullets vs the player.
  for (let i = world.shots.enemyBullets.length - 1; i >= 0; i -= 1) {
    const b = world.shots.enemyBullets[i];
    const d = Math.hypot(b.x - player.x, b.y - player.y);
    if (d < b.radius + player.radius - 2) {
      world.shots.enemyBullets.splice(i, 1);
      const died = damagePlayer(player, b.damage);
      world.shake = Math.max(world.shake, 8);
      if (audio) audio.hurt();
      if (died) return endRun(world, audio);
    }
  }

  // Pickups: drift toward the player inside the magnet radius.
  for (let i = world.pickups.length - 1; i >= 0; i -= 1) {
    const pk = world.pickups[i];
    pk.life -= dt;
    if (pk.life <= 0) {
      world.pickups.splice(i, 1);
      continue;
    }
    const d = Math.hypot(player.x - pk.x, player.y - pk.y);
    if (d < player.magnet) {
      const a = Math.atan2(player.y - pk.y, player.x - pk.x);
      const pull = 420 * (1 - d / (player.magnet + 1));
      pk.x += Math.cos(a) * pull * dt;
      pk.y += Math.sin(a) * pull * dt;
    }
    if (d < player.radius + pk.radius) {
      world.pickups.splice(i, 1);
      if (pk.kind === 'health') {
        player.hp = Math.min(player.maxHp, player.hp + PICKUPS.healthHeal);
        world.particles.floatText(player.x, player.y - 24, `+${PICKUPS.healthHeal} HP`, '#4dff88', 16);
      } else {
        player.rapidTimer = PICKUPS.rapidDuration;
        world.particles.floatText(player.x, player.y - 24, 'RAPID FIRE!', '#ffe45e', 16);
      }
      if (audio) audio.pickup();
    }
  }

  world.particles.update(dt);

  // Wave cleared: all spawned and all dead (minis from Splitters included).
  if (world.spawnQueue.length === 0 && world.enemies.length === 0) {
    world.betweenTimer += dt;
    if (world.betweenTimer > 0.6) {
      world.upgradeChoices = rollUpgrades(world.rng);
      world.state = 'upgrade';
      if (audio) audio.waveClear();
    }
  }
}

export function chooseUpgrade(world, index, audio) {
  const card = world.upgradeChoices[index];
  if (!card) return;
  card.apply(world.player);
  world.particles.floatText(world.player.x, world.player.y - 30, card.name, '#9df3ff', 18);
  if (audio) audio.upgrade();
  world.upgradeChoices = [];
  world.state = 'play';
  startWave(world);
}

function endRun(world, audio) {
  world.state = 'over';
  world.particles.burst(world.player.x, world.player.y, '#37e6ff', 50, 460);
  world.particles.ring(world.player.x, world.player.y, '#37e6ff', 140);
  if (world.score > world.best) {
    world.best = world.score;
    try {
      window.localStorage.setItem('pulsefall-best', String(world.best));
    } catch {
      // Best score is a nicety; storage failure must not break the game.
    }
  }
  if (audio) audio.gameOver();
}

export function pauseGame(world) {
  if (world.state === 'play') {
    world.prevState = 'play';
    world.state = 'paused';
  } else if (world.state === 'paused') {
    world.state = world.prevState;
  }
}

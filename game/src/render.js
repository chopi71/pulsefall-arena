// Rendering: everything drawn on the canvas — the neon arena background,
// the player ship, enemies, bullets, pickups, particles, the HUD, and the
// title / upgrade / game-over / paused screens. Pure drawing, no simulation.

import { ARENA, COLORS } from './config.js';

function drawShape(ctx, shape, x, y, radius, angle, color, flash) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = flash > 0 ? '#ffffff' : color;
  ctx.strokeStyle = flash > 0 ? '#ffffff' : color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (shape === 'diamond') {
    ctx.moveTo(radius, 0);
    ctx.lineTo(0, radius * 0.7);
    ctx.lineTo(-radius, 0);
    ctx.lineTo(0, -radius * 0.7);
  } else if (shape === 'triangle') {
    ctx.moveTo(radius, 0);
    ctx.lineTo(-radius * 0.8, radius * 0.8);
    ctx.lineTo(-radius * 0.8, -radius * 0.8);
  } else if (shape === 'hexagon') {
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * radius;
      const py = Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  } else if (shape === 'square') {
    ctx.rect(-radius * 0.8, -radius * 0.8, radius * 1.6, radius * 1.6);
  } else if (shape === 'boss') {
    // An eight-pointed star: a big, unmistakable threat.
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 === 0 ? radius : radius * 0.55;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  } else {
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
  }
  ctx.closePath();
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
  ctx.restore();
}

function drawBackground(ctx, time) {
  const grad = ctx.createRadialGradient(640, 380, 80, 640, 400, 900);
  grad.addColorStop(0, COLORS.bg1);
  grad.addColorStop(1, COLORS.bg0);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  // A slow-pulsing grid, brighter near the centre.
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.55 + Math.sin(time * 0.8) * 0.1;
  for (let x = 0; x <= ARENA.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ARENA.height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Arena edge: a glowing frame so the playfield reads at a glance.
  ctx.strokeStyle = COLORS.gridBright;
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, ARENA.width - 12, ARENA.height - 12);
}

function drawPlayer(ctx, player, time) {
  if (!player.alive) return;
  const blink = player.invuln > 0 && Math.floor(time * 18) % 2 === 0;
  ctx.save();
  // A soft glow under the ship so it reads at a glance in a busy arena.
  const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 44);
  glow.addColorStop(0, 'rgba(55,230,255,0.28)');
  glow.addColorStop(1, 'rgba(55,230,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  if (player.dashTime > 0) {
    // Dash trail: a stretched afterimage.
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(-player.radius * 2.4, 0);
    ctx.lineTo(-player.radius * 0.6, player.radius * 0.6);
    ctx.lineTo(-player.radius * 0.6, -player.radius * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = blink ? 0.35 : 1;
  // A sleek arrow-ship with a glowing core.
  ctx.fillStyle = COLORS.player;
  ctx.strokeStyle = COLORS.playerGlow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.radius + 6, 0);
  ctx.lineTo(-player.radius * 0.8, player.radius * 0.75);
  ctx.lineTo(-player.radius * 0.4, 0);
  ctx.lineTo(-player.radius * 0.8, -player.radius * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(2, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
  // Shield ring.
  if (player.shield > 0) {
    ctx.strokeStyle = '#9df3ff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7 + Math.sin(time * 4) * 0.2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawEnemy(ctx, e) {
  drawShape(ctx, e.shape, e.x, e.y, e.radius, e.angle, e.color, e.flash);
  // A dark core so each shape reads as a solid body.
  ctx.fillStyle = 'rgba(7,10,24,0.55)';
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.radius * 0.38, 0, Math.PI * 2);
  ctx.fill();
  // HP bar over damaged enemies and the boss.
  if (e.hp < e.maxHp) {
    const w = e.radius * 2;
    const frac = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * frac, 5);
  }
  // Dasher telegraph: a flashing warning ring while it winds up.
  if (e.type === 'dasher' && e.state === 'telegraph') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5 + Math.sin(e.stateTimer * 40) * 0.4;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // HP bar, top left.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(20, 18, 220, 26);
  const hpFrac = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = hpFrac > 0.5 ? '#4dff88' : hpFrac > 0.25 ? '#ffe45e' : '#ff4d6d';
  ctx.fillRect(24, 22, 212 * hpFrac, 18);
  ctx.strokeStyle = '#3b4a9e';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 18, 220, 26);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.hp)} / ${p.maxHp}`, 250, 37);
  if (p.shield > 0) ctx.fillText(`SHIELD x${p.shield}`, 250, 58);

  // Score and combo, top centre.
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(String(world.score).padStart(6, '0'), ARENA.width / 2, 44);
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = world.combo > 1 ? '#ffe45e' : COLORS.dim;
  ctx.fillText(world.combo > 1 ? `COMBO x${world.combo.toFixed(1)}` : 'COMBO x1.0', ARENA.width / 2, 66);

  // Wave, top right.
  ctx.textAlign = 'right';
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`WAVE ${world.wave}`, ARENA.width - 20, 40);
  const left = world.enemies.length + world.spawnQueue.length;
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(left > 0 ? `${left} hostiles left` : 'wave clear!', ARENA.width - 20, 62);

  // Dash cooldown, bottom left.
  const dashFrac = 1 - p.dashCooldown / p.dashCooldownMax;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(20, ARENA.height - 44, 180, 22);
  ctx.fillStyle = dashFrac >= 1 ? COLORS.player : '#3b4a9e';
  ctx.fillRect(22, ARENA.height - 42, 176 * dashFrac, 18);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(dashFrac >= 1 ? 'DASH READY  [Shift / Space]' : 'DASH RECHARGING…', 206, ARENA.height - 27);
  if (p.rapidTimer > 0) {
    ctx.fillStyle = '#ffe45e';
    ctx.fillText(`RAPID FIRE ${p.rapidTimer.toFixed(0)}s`, 20, ARENA.height - 56);
  }

  // Boss HP bar, bottom centre.
  if (world.boss) {
    const b = world.boss;
    const w = 480;
    const x = (ARENA.width - w) / 2;
    const y = ARENA.height - 36;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 4, y - 4, w + 8, 24);
    ctx.fillStyle = COLORS.boss;
    ctx.fillRect(x, y, w * Math.max(0, b.hp / b.maxHp), 16);
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PULSE WARDEN', ARENA.width / 2, y - 10);
  }

  // Milestone banner.
  if (world.milestone > 0) {
    ctx.globalAlpha = Math.min(1, world.milestone);
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#ffe45e';
    ctx.fillText(world.milestoneText, ARENA.width / 2, 130);
    ctx.globalAlpha = 1;
  }
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(7,10,24,0.72)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.player;
  ctx.font = 'bold 96px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PULSEFALL', ARENA.width / 2, 240);
  ctx.fillStyle = '#ffe45e';
  ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('SURVIVE THE FALLING PULSE', ARENA.width / 2, 284);

  ctx.fillStyle = COLORS.text;
  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  const lines = [
    'WASD / Arrows — move      Mouse — aim      Click / hold — shoot',
    'SHIFT or SPACE — dash (brief invulnerability)',
    'Blast every wave, then pick 1 of 3 upgrades. A boss falls every 5 waves.',
    'Chain kills to raise your combo multiplier. Grab green orbs to heal.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, ARENA.width / 2, 360 + i * 34));

  ctx.fillStyle = Math.floor(world.time * 2) % 2 === 0 ? '#ffffff' : '#8b96c9';
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO START', ARENA.width / 2, 560);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('P — pause      M — mute      Best score: ' + world.best, ARENA.width / 2, 610);
}

function drawUpgrade(ctx, world) {
  ctx.fillStyle = 'rgba(7,10,24,0.78)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe45e';
  ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave} CLEARED`, ARENA.width / 2, 150);
  ctx.fillStyle = COLORS.text;
  ctx.font = '22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Choose one upgrade — press 1, 2 or 3, or click a card', ARENA.width / 2, 192);

  const cardW = 300;
  const cardH = 300;
  const gap = 40;
  const total = cardW * 3 + gap * 2;
  const startX = (ARENA.width - total) / 2;
  const y = 250;
  world.upgradeChoices.forEach((card, i) => {
    const x = startX + i * (cardW + gap);
    const rare = card.rarity === 'rare';
    ctx.fillStyle = COLORS.cardBg;
    ctx.strokeStyle = rare ? '#ffe45e' : COLORS.cardEdge;
    ctx.lineWidth = rare ? 4 : 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = rare ? '#ffe45e' : COLORS.player;
    ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(rare ? '★ RARE ★' : 'COMMON', x + cardW / 2, y + 40);
    ctx.fillStyle = COLORS.text;
    ctx.font = '64px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(card.icon, x + cardW / 2, y + 130);
    ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(card.name, x + cardW / 2, y + 185);
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(card.desc, x + cardW / 2, y + 222);
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`[${i + 1}]`, x + cardW / 2, y + 268);
  });
}

function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(7,10,24,0.8)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.danger;
  ctx.font = 'bold 72px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('SIGNAL LOST', ARENA.width / 2, 250);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 34px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`SCORE  ${world.score}`, ARENA.width / 2, 330);
  ctx.font = '22px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = world.score >= world.best && world.score > 0 ? '#ffe45e' : COLORS.dim;
  ctx.fillText(`BEST  ${world.best}${world.score >= world.best && world.score > 0 ? '  — NEW BEST!' : ''}`, ARENA.width / 2, 378);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`WAVES SURVIVED  ${world.wave}      KILLS  ${world.kills}`, ARENA.width / 2, 420);
  ctx.fillStyle = Math.floor(world.time * 2) % 2 === 0 ? '#ffffff' : '#8b96c9';
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PRESS R TO PLAY AGAIN', ARENA.width / 2, 500);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(7,10,24,0.6)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PAUSED', ARENA.width / 2, 380);
  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Press P or Esc to resume', ARENA.width / 2, 430);
}

export function render(ctx, world) {
  ctx.save();
  if (world.shake > 0.5) {
    const s = world.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, world.time);

  // Pickups.
  for (const pk of world.pickups) {
    const pulse = 1 + Math.sin(world.time * 6 + pk.x) * 0.15;
    ctx.save();
    ctx.translate(pk.x, pk.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = pk.kind === 'health' ? COLORS.pickupHealth : COLORS.pickupRapid;
    ctx.beginPath();
    ctx.arc(0, 0, pk.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#070a18';
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pk.kind === 'health' ? '+' : '»', 0, 1);
    ctx.restore();
  }

  // Enemy bullets: hot pink orbs with a bright core.
  for (const b of world.shots.enemyBullets) {
    ctx.fillStyle = COLORS.enemyBullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of world.enemies) drawEnemy(ctx, e);
  drawPlayer(ctx, world.player, world.time);

  // Player bullets: bright streaks along their travel direction.
  for (const b of world.shots.playerBullets) {
    const len = 16;
    const inv = 1 / Math.hypot(b.vx, b.vy);
    ctx.strokeStyle = COLORS.bullet;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * inv * len, b.y - b.vy * inv * len);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  world.particles.draw(ctx);
  ctx.restore();

  if (world.state === 'play' || world.state === 'paused') drawHud(ctx, world);
  if (world.state === 'title') drawTitle(ctx, world);
  if (world.state === 'upgrade') drawUpgrade(ctx, world);
  if (world.state === 'over') drawGameOver(ctx, world);
  if (world.state === 'paused') drawPaused(ctx);
}

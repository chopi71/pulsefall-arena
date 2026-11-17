// Bullets: the player's shots and the enemies' shots. Two flat arrays with
// a swap-remove update, so thousands of bullets cost almost nothing.

export function createShots() {
  const playerBullets = [];
  const enemyBullets = [];

  return {
    playerBullets,
    enemyBullets,

    firePlayer(x, y, angle, speed, damage, radius = 5) {
      playerBullets.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage,
        radius,
        life: 1.4,
      });
    },

    fireEnemy(x, y, angle, speed, damage = 10, radius = 6) {
      enemyBullets.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage,
        radius,
        life: 6,
      });
    },

    update(dt, arena) {
      for (let i = playerBullets.length - 1; i >= 0; i -= 1) {
        const b = playerBullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -20 || b.x > arena.width + 20 || b.y < -20 || b.y > arena.height + 20) {
          playerBullets[i] = playerBullets[playerBullets.length - 1];
          playerBullets.pop();
        }
      }
      for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
        const b = enemyBullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -20 || b.x > arena.width + 20 || b.y < -20 || b.y > arena.height + 20) {
          enemyBullets[i] = enemyBullets[enemyBullets.length - 1];
          enemyBullets.pop();
        }
      }
    },

    clear() {
      playerBullets.length = 0;
      enemyBullets.length = 0;
    },
  };
}

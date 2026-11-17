// Particles and floating combat text: sparks, shards, shockwave rings and
// damage numbers that give every hit visible feedback. Pure presentation —
// nothing here touches the simulation except through spawn calls.

export function createParticles() {
  const parts = [];
  const texts = [];

  return {
    // A burst of sparks flying out from (x, y).
    burst(x, y, color, count, speed = 260) {
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.7);
        parts.push({
          x, y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: 0.35 + Math.random() * 0.35,
          maxLife: 0.7,
          size: 2 + Math.random() * 3,
          color,
          drag: 0.9,
        });
      }
    },
    // An expanding ring (shockwave) on death or dash.
    ring(x, y, color, maxR = 70) {
      parts.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, size: maxR, color, ring: true, drag: 1 });
    },
    // Shards: chunky triangles that spin away from a destroyed enemy.
    shards(x, y, color, count = 6) {
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const v = 120 + Math.random() * 180;
        parts.push({
          x, y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: 0.5 + Math.random() * 0.3,
          maxLife: 0.8,
          size: 4 + Math.random() * 5,
          color,
          spin: (Math.random() - 0.5) * 12,
          angle: Math.random() * Math.PI * 2,
          drag: 0.92,
        });
      }
    },
    // A damage number or label that floats up and fades.
    floatText(x, y, text, color = '#ffffff', size = 16) {
      texts.push({ x, y, text, color, size, life: 0.9, maxLife: 0.9 });
    },
    update(dt) {
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
        if (p.spin !== undefined) p.angle += p.spin * dt;
      }
      for (let i = texts.length - 1; i >= 0; i -= 1) {
        const t = texts[i];
        t.life -= dt;
        t.y -= 42 * dt;
        if (t.life <= 0) texts.splice(i, 1);
      }
    },
    draw(ctx) {
      for (const p of parts) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        if (p.ring) {
          const progress = 1 - p.life / p.maxLife;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3 * (1 - progress) + 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * progress, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.spin !== undefined) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      for (const t of texts) {
        const alpha = Math.max(0, t.life / t.maxLife);
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${t.size}px "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      parts.length = 0;
      texts.length = 0;
    },
  };
}

// Upgrade cards: the choice offered between waves. Three distinct cards
// are rolled each wave-clear; each one permanently changes a player stat,
// so two runs build differently. Rarity weights make the strongest cards
// (split shot, shield) show up less often.

export const UPGRADES = [
  {
    id: 'damage', name: 'OVERCHARGE', icon: '▲', rarity: 'common',
    desc: '+25% bullet damage',
    apply(p) { p.damage *= 1.25; },
  },
  {
    id: 'firerate', name: 'RAPID TRIGGER', icon: '»', rarity: 'common',
    desc: '+20% fire rate',
    apply(p) { p.fireInterval *= 0.83; },
  },
  {
    id: 'speed', name: 'ION THRUSTERS', icon: '≡', rarity: 'common',
    desc: '+12% move speed',
    apply(p) { p.speed *= 1.12; },
  },
  {
    id: 'maxhp', name: 'REINFORCED HULL', icon: '♥', rarity: 'common',
    desc: '+25 max HP and heal 25',
    apply(p) { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: 'dash', name: 'PHASE DASH', icon: '↯', rarity: 'common',
    desc: '-25% dash cooldown',
    apply(p) { p.dashCooldownMax *= 0.75; },
  },
  {
    id: 'magnet', name: 'TRACTOR FIELD', icon: '◎', rarity: 'common',
    desc: '+60% pickup magnet radius',
    apply(p) { p.magnet *= 1.6; },
  },
  {
    id: 'split', name: 'SPLIT SHOT', icon: '✦', rarity: 'rare',
    desc: '+1 bullet per shot',
    apply(p) { p.split += 1; },
  },
  {
    id: 'shield', name: 'AEGIS SHIELD', icon: '⬢', rarity: 'rare',
    desc: 'Gain a shield that blocks 1 hit',
    apply(p) { p.shield += 1; },
  },
  {
    id: 'velocity', name: 'RAILGUN ROUNDS', icon: '➤', rarity: 'rare',
    desc: '+25% bullet speed, +10% damage',
    apply(p) { p.bulletSpeed *= 1.25; p.damage *= 1.1; },
  },
];

const RARITY_WEIGHT = { common: 3, rare: 1 };

// Roll three distinct upgrade cards, weighted by rarity.
export function rollUpgrades(rng) {
  const pool = [...UPGRADES];
  const picks = [];
  while (picks.length < 3 && pool.length > 0) {
    let total = 0;
    for (const u of pool) total += RARITY_WEIGHT[u.rarity];
    let roll = rng.next() * total;
    let chosen = 0;
    for (let i = 0; i < pool.length; i += 1) {
      roll -= RARITY_WEIGHT[pool[i].rarity];
      if (roll <= 0) {
        chosen = i;
        break;
      }
    }
    picks.push(pool[chosen]);
    pool.splice(chosen, 1);
  }
  return picks;
}

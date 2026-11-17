// PULSEFALL bootstrap: canvas setup, the fixed-timestep loop, the screen
// state machine, and the deterministic ?shot= staging modes used for the
// entry's screenshots (title / play / upgrade / over, seeded by ?seed=N).

import { ARENA } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld, startRun, updateWorld, chooseUpgrade, pauseGame } from './world.js';
import { render } from './render.js';
import { spawnEnemy } from './enemies.js';
import { makeRng } from './random.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / ARENA.width, window.innerHeight / ARENA.height);
  canvas.width = ARENA.width;
  canvas.height = ARENA.height;
  canvas.style.width = `${Math.floor(ARENA.width * scale)}px`;
  canvas.style.height = `${Math.floor(ARENA.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const params = new URLSearchParams(window.location.search);
const shotMode = params.get('shot'); // title | play | upgrade | over
const seed = Number(params.get('seed') || 1337) || 1337;

const input = createInput(canvas);
const audio = createAudio();
const world = createWorld(seed);

// ---- Screenshot staging: deterministic scenes, frozen after staging ----
function stageShot(mode) {
  const rng = makeRng(seed + 7);
  if (mode === 'title') {
    world.state = 'title';
    // A few drifting enemies behind the title panel for depth.
    for (let i = 0; i < 6; i += 1) {
      const e = spawnEnemy(['chaser', 'dasher', 'splitter', 'weaver'][i % 4], rng, 2, world.player);
      e.x = rng.range(120, ARENA.width - 120);
      e.y = rng.range(120, ARENA.height - 120);
      world.enemies.push(e);
    }
    world.particles.burst(640, 420, '#37e6ff', 24, 200);
    world.frozen = true;
    return;
  }
  if (mode === 'play') {
    startRun(world);
    world.wave = 3;
    // Stage a busy mid-action frame: a dense cluster of enemies right in
    // the firing line, so shots land, kills happen and the combo lights up.
    world.player.x = 400;
    world.player.y = 450;
    input.mouse.x = 950;
    input.mouse.y = 280;
    input.mouse.down = true;
    const line = [
      ['chaser', 640, 376], ['chaser', 700, 357], ['dasher', 760, 339],
      ['splitter', 830, 317], ['weaver', 900, 296], ['chaser', 980, 271],
      ['mini', 670, 420], ['mini', 720, 400],
    ];
    line.forEach(([type, x, y]) => {
      const e = spawnEnemy(type, rng, 3, world.player);
      e.x = x;
      e.y = y;
      world.enemies.push(e);
    });
    // Stragglers off the line for depth, plus enemy fire and a pickup.
    for (let i = 0; i < 4; i += 1) {
      const e = spawnEnemy(['chaser', 'dasher', 'weaver'][i % 3], rng, 3, world.player);
      e.x = rng.range(150, 1150);
      e.y = rng.range(120, 700);
      world.enemies.push(e);
    }
    world.shots.fireEnemy(900, 296, Math.atan2(450 - 296, 400 - 900), 260, 10, 6);
    world.shots.fireEnemy(830, 317, Math.atan2(450 - 317, 400 - 830), 260, 10, 6);
    world.pickups.push({ x: 480, y: 560, kind: 'health', radius: 12, life: 12 });
    world.player.invuln = 5; // staging only: the hero cannot die mid-shot
    // Let the simulation run 150 fixed steps so bullets, flashes, kills and
    // particles are all live, then freeze the frame.
    for (let i = 0; i < 150; i += 1) {
      updateWorld(world, input, 1 / 60, null);
      input.endFrame();
      if (world.state !== 'play') break;
    }
    input.mouse.down = false;
    world.player.invuln = 0;
    world.frozen = true;
    return;
  }
  if (mode === 'upgrade') {
    startRun(world);
    world.wave = 2;
    world.score = 1840;
    world.kills = 23;
    world.player.hp = 64;
    world.upgradeChoices = [
      { id: 'split', name: 'SPLIT SHOT', icon: '✦', rarity: 'rare', desc: '+1 bullet per shot', apply(p) { p.split += 1; } },
      { id: 'damage', name: 'OVERCHARGE', icon: '▲', rarity: 'common', desc: '+25% bullet damage', apply(p) { p.damage *= 1.25; } },
      { id: 'dash', name: 'PHASE DASH', icon: '↯', rarity: 'common', desc: '-25% dash cooldown', apply(p) { p.dashCooldownMax *= 0.75; } },
    ];
    world.state = 'upgrade';
    world.particles.burst(640, 400, '#ffe45e', 20, 180);
    world.frozen = true;
    return;
  }
  if (mode === 'over') {
    startRun(world);
    world.wave = 7;
    world.score = 12480;
    world.kills = 141;
    world.best = 12480;
    world.player.hp = 0;
    world.player.alive = false;
    world.player.x = 640;
    world.player.y = 400;
    world.particles.burst(640, 400, '#37e6ff', 50, 420);
    world.particles.ring(640, 400, '#37e6ff', 130);
    world.state = 'over';
    world.frozen = true;
  }
}

if (shotMode) stageShot(shotMode);

// ---- Input-driven state transitions (live play only) ----
function handleStateInput() {
  if (shotMode) return; // staged scenes ignore input
  if (input.wasPressed('KeyM')) {
    world.muted = audio.toggleMute();
  }
  if (world.state === 'title') {
    if (input.wasPressed('Enter') || input.wasPressed('NumpadEnter') || input.wasPressed('MouseLeft')) {
      audio.unlock();
      startRun(world);
    }
    return;
  }
  if (world.state === 'over') {
    if (input.wasPressed('KeyR') || input.wasPressed('Enter') || input.wasPressed('MouseLeft')) {
      audio.unlock();
      startRun(world);
    }
    return;
  }
  if (world.state === 'upgrade') {
    if (input.wasPressed('Digit1')) chooseUpgrade(world, 0, audio);
    else if (input.wasPressed('Digit2')) chooseUpgrade(world, 1, audio);
    else if (input.wasPressed('Digit3')) chooseUpgrade(world, 2, audio);
    else if (input.wasPressed('MouseLeft')) {
      // Click a card: cards are laid out in render.js — same geometry here.
      const cardW = 300;
      const cardH = 300;
      const gap = 40;
      const total = cardW * 3 + gap * 2;
      const startX = (ARENA.width - total) / 2;
      const y = 250;
      const mx = input.mouse.x;
      const my = input.mouse.y;
      if (my >= y && my <= y + cardH) {
        for (let i = 0; i < 3; i += 1) {
          const x = startX + i * (cardW + gap);
          if (mx >= x && mx <= x + cardW) {
            chooseUpgrade(world, i, audio);
            break;
          }
        }
      }
    }
    return;
  }
  if (world.state === 'play' || world.state === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) pauseGame(world);
  }
}

function announce() {
  const lines = {
    title: 'PULSEFALL title screen. Press Enter to start.',
    play: `Wave ${world.wave}, score ${world.score}, HP ${Math.ceil(world.player.hp)}.`,
    upgrade: `Wave ${world.wave} cleared. Choose an upgrade: 1, 2 or 3.`,
    over: `Game over. Score ${world.score}, best ${world.best}. Press R to play again.`,
    paused: 'Paused. Press P to resume.',
  };
  const text = lines[world.state] || '';
  if (status && status.textContent !== text) status.textContent = text;
}

// ---- Fixed-timestep loop: simulation at 60 Hz, rendering decoupled ----
const STEP = 1 / 60;
let last = performance.now();
let accumulator = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25; // tab-switch guard: never simulate a huge jump
  accumulator += dt;
  let steps = 0;
  while (accumulator >= STEP && steps < 5) {
    if (!world.frozen) {
      handleStateInput();
      if (world.state === 'play') updateWorld(world, input, STEP, audio);
      else if (world.state === 'title' || world.state === 'upgrade' || world.state === 'over') {
        world.time += STEP;
        world.particles.update(STEP);
        handleStateInput();
      } else if (world.state === 'paused') {
        handleStateInput();
      }
      input.endFrame();
    } else {
      world.time += STEP;
      world.particles.update(STEP);
    }
    accumulator -= STEP;
    steps += 1;
  }
  if (steps === 5) accumulator = 0; // drop backlog rather than spiral
  render(ctx, world);
  announce();
}

requestAnimationFrame(frame);

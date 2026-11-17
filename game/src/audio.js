// Synthesized sound effects with the Web Audio API. No audio files: every
// sound is an oscillator or filtered noise burst built at runtime. The
// context is created lazily on the first user gesture, and every call is
// guarded so a headless or muted browser never throws.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const ac = ensure();
    if (!ac || muted) return;
    try {
      if (ac.state === 'suspended') void ac.resume();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), ac.currentTime + dur);
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ac.currentTime + dur + 0.02);
    } catch {
      // Sound is garnish; a failure must never break the game.
    }
  }

  function noise(dur, vol, filterFreq) {
    const ac = ensure();
    if (!ac || muted) return;
    try {
      if (ac.state === 'suspended') void ac.resume();
      const len = Math.max(1, Math.floor(ac.sampleRate * dur));
      const buffer = ac.createBuffer(1, len, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ac.createBufferSource();
      src.buffer = buffer;
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
    } catch {
      // Sound is garnish; a failure must never break the game.
    }
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone(720, 0.07, 'square', 0.12, 240);
    },
    hit() {
      noise(0.06, 0.2, 2400);
    },
    explode() {
      noise(0.28, 0.4, 900);
      tone(140, 0.25, 'sawtooth', 0.18, 40);
    },
    hurt() {
      tone(180, 0.22, 'sawtooth', 0.25, 60);
    },
    dash() {
      noise(0.14, 0.22, 3200);
    },
    pickup() {
      tone(660, 0.09, 'sine', 0.2);
      setTimeout(() => tone(990, 0.12, 'sine', 0.2), 70);
    },
    upgrade() {
      [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.22), i * 80));
    },
    waveClear() {
      [392, 523, 659].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.2), i * 90));
    },
    bossWarn() {
      tone(98, 0.5, 'sawtooth', 0.3, 65);
      setTimeout(() => tone(98, 0.5, 'sawtooth', 0.3, 65), 520);
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.22), i * 180));
    },
  };
}

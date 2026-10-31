// Sound design: every sound is synthesized live with WebAudio (no files needed).

let ctx = null, master, sfxBus, musicBus, comp, noiseBuf;
const settings = { sound: true, music: false };

export function audioSettings(s) {
  Object.assign(settings, s);
  if (!ctx) return;
  sfxBus.gain.value = settings.sound ? 0.9 : 0;
  musicBus.gain.setTargetAtTime(settings.music ? 0.22 : 0, ctx.currentTime, 0.3);
  if (settings.music) music.start(); else music.stop();
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
    master = ctx.createGain(); master.gain.value = 0.8;
    sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sound ? 0.9 : 0;
    musicBus = ctx.createGain(); musicBus.gain.value = 0;
    sfxBus.connect(comp); musicBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    audioSettings(settings);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

const now = () => ctx.currentTime;
const ok = () => ctx && settings.sound && ctx.state === 'running';

function tone({ type = 'sine', f = 440, f2 = null, t = 0.12, a = 0.004, v = 0.25, when = 0, dest = sfxBus, curve = 'exp', detune = 0 }) {
  const t0 = now() + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); o.detune.value = detune;
  if (f2) {
    if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t0 + t);
    else o.frequency.linearRampToValueAtTime(f2, t0 + t);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  o.connect(g); g.connect(dest);
  o.start(t0); o.stop(t0 + t + 0.05);
  return o;
}

function noise({ t = 0.2, v = 0.3, type = 'bandpass', f = 1200, f2 = null, q = 1, when = 0, a = 0.003, dest = sfxBus }) {
  const t0 = now() + when;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  s.playbackRate.value = 1;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + t);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  s.connect(fl); fl.connect(g); g.connect(dest);
  s.start(t0, Math.random() * 1.5); s.stop(t0 + t + 0.05);
}

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
let lastTick = 0;

export const sfx = {
  click() { if (!ok()) return; tone({ type: 'triangle', f: 900, f2: 600, t: 0.05, v: 0.12 }); },
  tab() { if (!ok()) return; tone({ type: 'sine', f: 520, f2: 780, t: 0.07, v: 0.1 }); },
  bet() {
    if (!ok()) return;
    tone({ type: 'triangle', f: 340, f2: 520, t: 0.08, v: 0.18 });
    noise({ t: 0.05, v: 0.08, f: 5000, q: 2 });
  },
  chip() {
    if (!ok()) return;
    tone({ type: 'sine', f: 2400, t: 0.04, v: 0.12 });
    tone({ type: 'sine', f: 3200, t: 0.06, v: 0.08, when: 0.012 });
    noise({ t: 0.04, v: 0.1, f: 6000, q: 3 });
  },
  tick(p = 1, v = 0.12) {
    if (!ok()) return;
    const t = now();
    if (t - lastTick < 0.018) return;
    lastTick = t;
    tone({ type: 'square', f: 1800 * p, t: 0.025, v: v * 0.5 });
    noise({ t: 0.02, v: v * 0.6, f: 3500 * p, q: 6 });
  },
  peg(i = 0) {
    if (!ok()) return;
    const t = now();
    if (t - lastTick < 0.012) return;
    lastTick = t;
    const scale = [72, 74, 76, 79, 81, 84, 86, 88];
    tone({ type: 'sine', f: NOTE(scale[i % scale.length] + 12), t: 0.08, v: 0.06 });
    tone({ type: 'triangle', f: NOTE(scale[i % scale.length]), t: 0.05, v: 0.05 });
  },
  gem(i = 0) {
    if (!ok()) return;
    const base = 76 + Math.min(i, 14);
    tone({ type: 'sine', f: NOTE(base), t: 0.35, v: 0.22 });
    tone({ type: 'sine', f: NOTE(base + 7), t: 0.3, v: 0.1, when: 0.04 });
    tone({ type: 'sine', f: NOTE(base + 19), t: 0.25, v: 0.06, when: 0.06 });
  },
  bomb() {
    if (!ok()) return;
    noise({ t: 0.9, v: 0.7, type: 'lowpass', f: 1600, f2: 80, q: 0.7 });
    tone({ type: 'sine', f: 140, f2: 30, t: 0.7, v: 0.6 });
    tone({ type: 'sawtooth', f: 90, f2: 40, t: 0.3, v: 0.15 });
  },
  win(mult = 2) {
    if (!ok()) return;
    const seq = mult >= 10 ? [72, 76, 79, 84, 88] : mult >= 3 ? [72, 76, 79, 84] : [76, 79, 84];
    seq.forEach((n, i) => {
      tone({ type: 'triangle', f: NOTE(n), t: 0.22, v: 0.16, when: i * 0.06 });
      tone({ type: 'sine', f: NOTE(n + 12), t: 0.18, v: 0.06, when: i * 0.06 });
    });
    sfx.coins(Math.min(6, 2 + Math.floor(Math.log2(mult))), 0.12);
  },
  smallWin() {
    if (!ok()) return;
    tone({ type: 'triangle', f: NOTE(79), t: 0.12, v: 0.14 });
    tone({ type: 'triangle', f: NOTE(84), t: 0.2, v: 0.14, when: 0.06 });
  },
  lose() {
    if (!ok()) return;
    tone({ type: 'sawtooth', f: 220, f2: 110, t: 0.3, v: 0.06 });
    tone({ type: 'sine', f: 160, f2: 70, t: 0.35, v: 0.2 });
  },
  coins(n = 4, delay = 0) {
    if (!ok()) return;
    for (let i = 0; i < n; i++) {
      const w = delay + i * (0.05 + Math.random() * 0.04);
      const f = 2000 + Math.random() * 1400;
      tone({ type: 'sine', f, t: 0.12, v: 0.08, when: w });
      tone({ type: 'sine', f: f * 1.5, t: 0.09, v: 0.05, when: w + 0.01 });
    }
  },
  cashout() {
    if (!ok()) return;
    tone({ type: 'sine', f: NOTE(88), t: 0.4, v: 0.18 });
    tone({ type: 'sine', f: NOTE(93), t: 0.5, v: 0.14, when: 0.07 });
    noise({ t: 0.15, v: 0.08, f: 8000, q: 1 });
    sfx.coins(5, 0.08);
  },
  bigWin() {
    if (!ok()) return;
    const mel = [72, 76, 79, 84, 79, 84, 88, 91];
    mel.forEach((n, i) => {
      tone({ type: 'square', f: NOTE(n), t: 0.16, v: 0.07, when: i * 0.09 });
      tone({ type: 'triangle', f: NOTE(n - 12), t: 0.2, v: 0.12, when: i * 0.09 });
    });
    [60, 64, 67, 72].forEach((n) => tone({ type: 'sawtooth', f: NOTE(n), t: 1.6, a: 0.05, v: 0.05, when: 0.72 }));
    noise({ t: 1.2, v: 0.12, type: 'highpass', f: 6000, when: 0.72, a: 0.02 });
    sfx.coins(14, 0.7);
  },
  flip() {
    if (!ok()) return;
    noise({ t: 0.09, v: 0.25, f: 2600, f2: 900, q: 1.5 });
    tone({ type: 'triangle', f: 500, f2: 900, t: 0.06, v: 0.05 });
  },
  deal() {
    if (!ok()) return;
    noise({ t: 0.14, v: 0.22, type: 'bandpass', f: 4000, f2: 1500, q: 0.8 });
  },
  whoosh(len = 0.4) {
    if (!ok()) return;
    noise({ t: len, v: 0.2, f: 400, f2: 3000, q: 1.2, a: len * 0.5 });
  },
  spinTick() {
    if (!ok()) return;
    const t = now();
    if (t - lastTick < 0.025) return;
    lastTick = t;
    tone({ type: 'square', f: 2600, t: 0.012, v: 0.05 });
    noise({ t: 0.03, v: 0.18, f: 2200, q: 4 });
  },
  rarity(level = 0) {
    if (!ok()) return;
    const sets = [[67, 71], [69, 72, 76], [72, 76, 79, 83], [72, 76, 79, 84, 88], [72, 76, 79, 84, 88, 91, 96]];
    const seq = sets[Math.max(0, Math.min(level, 4))];
    seq.forEach((n, i) => {
      tone({ type: 'triangle', f: NOTE(n), t: 0.5, v: 0.14, when: i * 0.07 });
      tone({ type: 'sine', f: NOTE(n + 12), t: 0.4, v: 0.06, when: i * 0.07 });
    });
    if (level >= 3) {
      noise({ t: 1.4, v: 0.1, type: 'highpass', f: 7000, a: 0.3 });
      tone({ type: 'sawtooth', f: NOTE(48), t: 1.2, a: 0.05, v: 0.08 });
    }
    if (level >= 4) sfx.coins(10, 0.3);
  },
  rip() {
    if (!ok()) return;
    for (let i = 0; i < 6; i++) noise({ t: 0.06, v: 0.25, f: 1500 + Math.random() * 3000, q: 2, when: i * 0.035 });
    noise({ t: 0.35, v: 0.2, f: 3000, f2: 800, q: 0.7 });
  },
  shine() {
    if (!ok()) return;
    [88, 91, 95, 100].forEach((n, i) => tone({ type: 'sine', f: NOTE(n), t: 0.25, v: 0.06, when: i * 0.05 }));
  },
  levelUp() {
    if (!ok()) return;
    [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone({ type: 'triangle', f: NOTE(n), t: 0.3, v: 0.12, when: i * 0.06 }));
    noise({ t: 0.8, v: 0.08, type: 'highpass', f: 7000, when: 0.3 });
  },
  error() {
    if (!ok()) return;
    tone({ type: 'square', f: 180, t: 0.08, v: 0.08 });
    tone({ type: 'square', f: 140, t: 0.12, v: 0.08, when: 0.09 });
  },
  explode() {
    if (!ok()) return;
    noise({ t: 1.4, v: 0.8, type: 'lowpass', f: 2400, f2: 60, q: 0.5 });
    tone({ type: 'sine', f: 120, f2: 25, t: 1.0, v: 0.6 });
    noise({ t: 0.4, v: 0.3, type: 'highpass', f: 3000, q: 0.5 });
  },
  cluck() {
    if (!ok()) return;
    tone({ type: 'square', f: 700, f2: 1100, t: 0.07, v: 0.06 });
    tone({ type: 'square', f: 1000, f2: 600, t: 0.09, v: 0.06, when: 0.07 });
  },
  horn() {
    if (!ok()) return;
    tone({ type: 'sawtooth', f: 415, t: 0.35, v: 0.07 });
    tone({ type: 'sawtooth', f: 523, t: 0.35, v: 0.06 });
  },
  splat() {
    if (!ok()) return;
    noise({ t: 0.25, v: 0.5, type: 'lowpass', f: 900, f2: 200 });
    tone({ type: 'sine', f: 200, f2: 60, t: 0.3, v: 0.4 });
  },
  ball() {
    if (!ok()) return;
    const t = now();
    if (t - lastTick < 0.04) return;
    lastTick = t;
    tone({ type: 'sine', f: 3000 + Math.random() * 800, t: 0.03, v: 0.05 });
    noise({ t: 0.03, v: 0.12, f: 5000, q: 5 });
  },
};

// Continuous engine hum for the Jet (crash) game. Returns controller.
export function engine() {
  if (!ok()) return { set() {}, stop() {} };
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  const ns = ctx.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
  const ng = ctx.createGain(); ng.gain.value = 0.05;
  o.type = 'sawtooth'; o2.type = 'square';
  o.frequency.value = 60; o2.frequency.value = 61.5;
  f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 2;
  g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.06, now() + 0.4);
  o.connect(f); o2.connect(f); ns.connect(ng); ng.connect(f); f.connect(g); g.connect(sfxBus);
  o.start(); o2.start(); ns.start();
  return {
    set(m) {
      const p = Math.min(1, Math.log(m) / Math.log(50));
      o.frequency.setTargetAtTime(60 + p * 160, now(), 0.1);
      o2.frequency.setTargetAtTime(61.5 + p * 165, now(), 0.1);
      f.frequency.setTargetAtTime(500 + p * 2500, now(), 0.1);
    },
    stop() {
      g.gain.setTargetAtTime(0.0001, now(), 0.08);
      setTimeout(() => { try { o.stop(); o2.stop(); ns.stop(); } catch (e) {} }, 400);
    },
  };
}

// Generative lounge music: soft Rhodes-like chords, bass and brushed hats.
const music = (() => {
  let timer = null, step = 0, nextT = 0;
  const bpm = 92, spb = 60 / bpm / 2; // eighth notes
  const prog = [
    [57, 60, 64, 67], // Am7
    [53, 57, 60, 64], // Fmaj7
    [48, 52, 55, 59], // Cmaj7
    [55, 59, 62, 64], // G6
  ];
  function keys(n, t, len, v) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o2.type = 'triangle';
    o.frequency.value = NOTE(n); o2.frequency.value = NOTE(n) * 2.001;
    const g2 = ctx.createGain(); g2.gain.value = 0.15;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(musicBus);
    o.start(t); o2.start(t); o.stop(t + len + 0.1); o2.stop(t + len + 0.1);
  }
  function hat(t, v) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(musicBus); s.start(t, Math.random()); s.stop(t + 0.08);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.3);
  }
  function schedule() {
    while (nextT < ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % prog.length, s = step % 8;
      const ch = prog[bar];
      if (s === 0) ch.forEach((n) => keys(n, nextT, spb * 7, 0.05));
      if (s === 5) ch.slice(1).forEach((n) => keys(n + 12, nextT, spb * 2, 0.025));
      if (s === 0 || s === 3) keys(ch[0] - 12, nextT, spb * 2.5, 0.12);
      if (s === 6) keys(ch[0] - 5, nextT, spb * 1.5, 0.08);
      if (s === 0 || s === 4) kick(nextT);
      hat(nextT, s % 2 ? 0.03 : 0.015);
      if (Math.random() < 0.18) keys(ch[Math.floor(Math.random() * 4)] + 24, nextT, spb * 1.5, 0.018);
      nextT += spb; step++;
    }
  }
  return {
    start() { if (timer || !ctx) return; nextT = ctx.currentTime + 0.1; timer = setInterval(schedule, 80); },
    stop() { clearInterval(timer); timer = null; },
  };
})();

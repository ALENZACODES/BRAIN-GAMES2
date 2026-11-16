// Sound and music.
// - Game moments (tap, correct, wrong, level up, streak, big win, star…) play CC0 samples from assets/sfx/<style>/ (uisfx, CC0).
// - Musical notes inside games (melodies, pads) use a small synth with a reverb send, so they sit in the same space.
// - Background music: CC0 loops from assets/music/, quiet, with its own on/off switch.
// Nothing here touches the DOM or Web Audio until the first call, so the module can be imported in Node tests.

const CUE_FILES = { tap: 'press', select: 'select', undo: 'undo', ok: 'success', bad: 'error', level: 'level-up', streak: 'streak', big: 'complete', star: 'reward', badge: 'achievement', start: 'start', bonus: 'bonus', warn: 'warning' };
export const SOUND_STYLES = [
  { id: 'glass', name: 'Glass', desc: 'bright, crystalline' }, { id: 'arcade', name: 'Arcade', desc: 'chunky and cheerful' },
  { id: 'cinematic', name: 'Cinematic', desc: 'deep and polished' }, { id: 'scifi', name: 'Sci-fi', desc: 'clean holographic pings' }, { id: 'dreamy', name: 'Dreamy', desc: 'airy and soft' },
];

let C = null, master, sfxBus, synthBus, verb, musicEl = null, musicNode = null, musicGain;
const buffers = new Map();
function impulse(c, secs = 2.4, decay = 3.2) {
  const len = Math.floor(c.sampleRate * secs), b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
function ctx() {
  if (!C) {
    try { C = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    const comp = C.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = C.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(C.destination);
    sfxBus = C.createGain(); sfxBus.connect(master);
    synthBus = C.createGain(); synthBus.gain.value = 0.8; synthBus.connect(master);
    verb = C.createConvolver(); verb.buffer = impulse(C); const vg = C.createGain(); vg.gain.value = 0.28; synthBus.connect(verb); verb.connect(vg); vg.connect(master);
    musicGain = C.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
  }
  if (C.state === 'suspended') C.resume();
  return C;
}
function load(style, cue) {
  const key = style + ':' + cue; if (buffers.has(key)) return;
  buffers.set(key, null);
  fetch(`assets/sfx/${style}/${CUE_FILES[cue]}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((a) => C.decodeAudioData(a)).then((b) => buffers.set(key, b)).catch(() => {});
}

export const audio = {
  on: true, haptics: true, style: 'glass', sfxVol: 0.85,
  setStyle(s) { this.style = SOUND_STYLES.some((x) => x.id === s) ? s : 'glass'; if (C) Object.keys(CUE_FILES).forEach((c) => load(this.style, c)); },
  unlock() { if (!ctx()) return; Object.keys(CUE_FILES).forEach((c) => load(this.style, c)); },
  sample(cue, vol = 1, rate = 1, delay = 0) {
    if (!this.on) return true; const c = ctx(); if (!c) return true;
    const b = buffers.get(this.style + ':' + cue); if (!b) { load(this.style, cue); return false; }
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol * this.sfxVol; s.connect(g); g.connect(sfxBus); s.start(c.currentTime + delay); return true;
  },
  /** Musical synth voice: two detuned oscillators through a low-pass, with a soft envelope and reverb. */
  tone(f, d = 0.18, type = 'triangle', vol = 0.14, delay = 0) {
    if (!this.on) return; const c = ctx(); if (!c) return;
    const t = c.currentTime + delay, g = c.createGain(), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(9000, f * 6); lp.Q.value = 0.4;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(vol * 0.4, t + d * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25);
    for (const [det, ty, lv] of [[0, type === 'square' || type === 'sawtooth' ? 'triangle' : type, 1], [7, 'sine', 0.55], [1200, 'sine', 0.12]]) {
      const o = c.createOscillator(), og = c.createGain(); o.type = ty; o.frequency.setValueAtTime(f, t); o.detune.value = det; og.gain.value = lv; o.connect(og); og.connect(lp); o.start(t); o.stop(t + d + 0.35);
    }
    lp.connect(g); g.connect(synthBus);
  },
  tap() { if (!this.sample('tap', 0.55)) this.tone(660, 0.05, 'triangle', 0.06); },
  select() { if (!this.sample('select', 0.6)) this.tone(720, 0.06, 'triangle', 0.07); },
  undo() { if (!this.sample('undo', 0.6)) this.tone(420, 0.08, 'triangle', 0.07); },
  ok(streak = 0) { if (!this.sample('ok', 0.8, 1 + Math.min(streak, 12) * 0.025)) { const b = 523 * Math.pow(2, Math.min(streak, 12) / 12); this.tone(b, 0.12, 'sine', 0.12); this.tone(b * 1.5, 0.18, 'sine', 0.1, 0.07); } },
  bad() { if (!this.sample('bad', 0.75)) { this.tone(196, 0.25, 'triangle', 0.1); this.tone(147, 0.3, 'triangle', 0.08, 0.08); } },
  level() { if (!this.sample('level', 0.85)) [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.11, i * 0.07)); },
  streak() { if (!this.sample('streak', 0.85)) [784, 988, 1175].forEach((f, i) => this.tone(f, 0.14, 'sine', 0.1, i * 0.06)); },
  big() { if (!this.sample('big', 0.95)) this.win(); },
  star() { if (!this.sample('star', 0.95)) [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.1, i * 0.08)); },
  badge() { if (!this.sample('badge', 0.95)) this.win(); },
  start() { this.sample('start', 0.6); },
  win() { if (!this.sample('bonus', 0.95)) [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.24, 'triangle', 0.12, i * 0.09)); },
  /** Pentatonic bell notes for in-game melodies (Echo Grid pads, Pattern Extension symbols…). */
  note(i) { const pent = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0]; this.tone(pent[i % pent.length], 0.32, 'sine', 0.15); },
  buzz(ms = 18) { if (this.haptics && typeof navigator !== 'undefined' && navigator.vibrate) { try { navigator.vibrate(ms); } catch {} } },
};

export const music = {
  on: true, tracks: [], i: 0, playing: false,
  setTracks(list) { this.tracks = list; this.i = Math.floor(Math.random() * Math.max(1, list.length)); },
  start() {
    if (!this.on || !this.tracks.length || this.playing) return; const c = ctx(); if (!c) return;
    if (!musicEl) {
      musicEl = new Audio(); musicEl.preload = 'auto'; musicEl.crossOrigin = 'anonymous';
      musicEl.addEventListener('ended', () => { this.i = (this.i + 1) % this.tracks.length; musicEl.src = `assets/music/${this.tracks[this.i]}.mp3`; musicEl.play().catch(() => {}); });
      try { musicNode = c.createMediaElementSource(musicEl); musicNode.connect(musicGain); } catch { musicEl.volume = 0.32; }
    }
    if (!musicEl.src) musicEl.src = `assets/music/${this.tracks[this.i]}.mp3`;
    musicGain.gain.cancelScheduledValues(c.currentTime); musicGain.gain.setValueAtTime(0.0001, c.currentTime); musicGain.gain.exponentialRampToValueAtTime(0.32, c.currentTime + 2.5);
    musicEl.play().then(() => (this.playing = true)).catch(() => {});
  },
  stop() { if (!musicEl || !this.playing) return; const c = ctx(); musicGain.gain.setTargetAtTime(0.0001, c.currentTime, 0.4); setTimeout(() => { if (!this.on) { musicEl.pause(); this.playing = false; } }, 1500); },
  setOn(b) { this.on = b; if (b) this.start(); else this.stop(); },
  /** Briefly lower the music so a big moment cuts through. */
  duck(ms = 1400) { if (!this.playing || !C) return; const t = C.currentTime; musicGain.gain.setTargetAtTime(0.1, t, 0.05); musicGain.gain.setTargetAtTime(0.32, t + ms / 1000, 0.4); },
};
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!musicEl) return; if (document.hidden) musicEl.pause(); else if (music.on && music.playing) musicEl.play().catch(() => {}); });

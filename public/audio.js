// Töne und Musik, direkt im Browser erzeugt (Web Audio) – es sind keine Audiodateien nötig.
// Die Musik ist ein einfacher Platzhalter-Loop und lässt sich später durch eine Datei ersetzen.

const KEY = "wohni-audio";
const DEFAULTS = { volume: 0.7, sfx: true, music: false };

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; }
}

let settings = { ...DEFAULTS, ...load() };
let ctx = null;
let master, sfxBus, musicBus;
let musicTimer = null;
let nextNote = 0;
let step = 0;

const CHORDS = [
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
  [261.63, 329.63, 392.0], // C
  [196.0, 246.94, 293.66], // G
];
const PATTERN = [0, 1, 2, 1, 0, 1, 2, 1];
const NOTE_LEN = 0.5;

/** Erzeugt den AudioContext erst bei Bedarf; Browser erlauben Ton nur nach einer Berührung. */
function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    master.gain.value = settings.volume;
    musicBus.gain.value = settings.music ? 1 : 0;
    sfxBus.connect(master);
    musicBus.connect(master);
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, at, dur, { type = "sine", gain = 0.25, bus = sfxBus, slideTo } = {}) {
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function click(at, gain, freq) {
  const t = ctx.currentTime + at;
  const len = Math.floor(ctx.sampleRate * 0.03);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(sfxBus);
  src.start(t);
}

const EFFECTS = {
  /** Würfel klappern im Becher. */
  rattle(ms = 800) {
    const n = Math.round(ms / 45);
    for (let i = 0; i < n; i++) click((i * ms) / n / 1000 + Math.random() * 0.02, 0.5 + Math.random() * 0.5, 1800 + Math.random() * 2200);
  },
  /** Würfel landen auf dem Tisch. */
  land() {
    click(0, 1, 900);
    tone(160, 0, 0.12, { gain: 0.35, slideTo: 90 });
  },
  lifeLost() {
    tone(330, 0, 0.22, { type: "triangle", gain: 0.3 });
    tone(220, 0.2, 0.4, { type: "triangle", gain: 0.3, slideTo: 150 });
  },
  lifeGained() {
    [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.09, 0.3, { type: "triangle", gain: 0.25 }));
  },
  fanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.14, 0.5, { type: "triangle", gain: 0.3 }));
  },
};

function scheduleMusic() {
  while (nextNote < ctx.currentTime + 1.2) {
    const chord = CHORDS[Math.floor(step / PATTERN.length) % CHORDS.length];
    const freq = chord[PATTERN[step % PATTERN.length]];
    tone(freq, Math.max(0, nextNote - ctx.currentTime), 1.1, { type: "triangle", gain: 0.12, bus: musicBus });
    nextNote += NOTE_LEN;
    step++;
  }
}

function applyMusic() {
  if (!ctx) return;
  musicBus.gain.setTargetAtTime(settings.music ? 1 : 0, ctx.currentTime, 0.1);
  if (settings.music && !musicTimer) {
    nextNote = ctx.currentTime + 0.05;
    scheduleMusic();
    musicTimer = setInterval(scheduleMusic, 400);
  } else if (!settings.music && musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

export const audio = {
  get: () => ({ ...settings }),

  set(patch) {
    settings = { ...settings, ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
    if (ctx) master.gain.setTargetAtTime(settings.volume, ctx.currentTime, 0.02);
    ensure();
    applyMusic();
  },

  /** Spielt einen Effekt, sofern Töne an sind und der Browser Ton erlaubt. */
  play(name, ...args) {
    if (!settings.sfx || !ensure() || ctx.state !== "running") return;
    EFFECTS[name]?.(...args);
  },

  /** Nach der ersten Berührung Ton freischalten und ggf. die Musik starten. */
  unlock() {
    if (!ensure()) return;
    applyMusic();
  },
};

addEventListener("pointerdown", () => audio.unlock());

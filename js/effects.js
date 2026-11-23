// Visual + audio candy: village scene, interactive snow, shooting stars, clickable lights,
// confetti, fireworks, cursor sparkles, sleigh, music box, easter eggs, tilt.
import { sleighSVG } from "./scene.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
// lighter effects on phones / low-power devices to save battery
const lite = innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4 || navigator.connection?.saveData === true;
const fine = matchMedia("(pointer: fine)").matches;
// Phones and tablets: no fireworks, confetti or sound, and a lighter background
export const mobile = !fine || innerWidth < 700;
if (mobile) document.documentElement.classList.add("mobile");
const DPR = mobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
const rand = (a, b) => a + Math.random() * (b - a);
const root = document.documentElement;

// =====================================================================
// SOUND: bells, pops and a music-box carol (all synthesized, off by default)
// =====================================================================
const saved = (() => { try { return localStorage.getItem("ss-sfx"); } catch { return null; } })();
export const sound = { on: !mobile && saved !== "off", music: false, ctx: null, bus: null };
export function setSfx(on) { sound.on = on && !mobile; try { localStorage.setItem("ss-sfx", on ? "on" : "off"); } catch {} if (!on) stopMusic(); }
function ac() {
  if (mobile) return null;
  if (!sound.ctx) {
    const c = (sound.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
    const master = c.createGain();
    master.gain.value = 0.95;
    comp.connect(master).connect(c.destination);
    // dry bus
    sound.bus = c.createGain();
    sound.bus.gain.value = 0.9;
    sound.bus.connect(comp);
    // lush "snowy hall" reverb: generated stereo impulse response
    const len = Math.floor(c.sampleRate * 3.2);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < 900 ? i / 900 : 1);
      }
    }
    const conv = c.createConvolver();
    conv.buffer = ir;
    const pre = c.createDelay(0.1); pre.delayTime.value = 0.025;
    const damp = c.createBiquadFilter(); damp.type = "lowpass"; damp.frequency.value = 6500;
    sound.rev = c.createGain();
    sound.rev.gain.value = 0.55;
    sound.rev.connect(pre).connect(conv).connect(damp).connect(comp);
    // gentle stereo shimmer delay for bells
    const dl = c.createDelay(1), fb = c.createGain(), dlOut = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
    dl.delayTime.value = 0.23; fb.gain.value = 0.28; dlOut.gain.value = 0.22;
    if (pan.pan) pan.pan.value = 0.4;
    sound.echo = c.createGain();
    sound.echo.connect(dl); dl.connect(fb).connect(dl); dl.connect(dlOut).connect(pan).connect(comp);
  }
  if (sound.ctx.state === "suspended") sound.ctx.resume();
  return sound.ctx;
}
const out = () => (ac(), sound.bus);
const wet = () => (ac(), sound.rev);
const echo = () => (ac(), sound.echo);
// connect a node to dry + reverb (+ optional echo)
function send(node, revAmt = 0.35, echoAmt = 0) {
  node.connect(out());
  if (revAmt) { const g = sound.ctx.createGain(); g.gain.value = revAmt; node.connect(g).connect(wet()); }
  if (echoAmt) { const g = sound.ctx.createGain(); g.gain.value = echoAmt; node.connect(g).connect(echo()); }
}
const ready = () => sound.on && sound.ctx && sound.ctx.state === "running";
// Browsers only allow audio after a tap or key press: unlock on the first one.
["pointerdown", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, () => ac(), { once: true, capture: true }));
export function chime(freq = 1318.5, when = 0, vol = 0.12) {
  if (!sound.on) return;
  if (!sound.ctx) return;
  fmBell(freq, when, vol);
}
// FM synthesis bell (glassy, shimmering), sent through reverb + echo
export function fmBell(freq, when = 0, vol = 0.1, { dur = 1.8, ratio = 3.5, index = 2.2, rev = 0.45, echoAmt = 0.25, pan = 0 } = {}) {
  if (!sound.on || !sound.ctx) return;
  const c = sound.ctx, t = c.currentTime + when;
  const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
  car.frequency.value = freq;
  mod.frequency.value = freq * ratio;
  mg.gain.setValueAtTime(freq * index, t);
  mg.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur * 0.6);
  mod.connect(mg).connect(car.frequency);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  // sparkle partial
  const sp = c.createOscillator(), sg = c.createGain();
  sp.frequency.value = freq * 4.07;
  sg.gain.setValueAtTime(vol * 0.18, t);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.35);
  let node = g;
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  car.connect(g); sp.connect(sg).connect(g);
  send(node, rev, echoAmt);
  [car, mod, sp].forEach((o) => { o.start(t); o.stop(t + dur + 0.1); });
}
// Opening of "Jingle Bells" (1857, public domain)
export function jingle() {
  const E = 659.25, G = 783.99, C = 523.25, D = 587.33;
  [[E, 0], [E, 0.18], [E, 0.36], [E, 0.72], [E, 0.9], [E, 1.08], [E, 1.44], [G, 1.62], [C, 1.8], [D, 1.98], [E, 2.2]]
    .forEach(([f, t]) => chime(f * 2, t, 0.09));
}
let noiseBuf = null;
function pop(vol = 0.25) {
  if (!sound.on) return;
  const c = ac();
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuf;
  f.type = "lowpass";
  f.frequency.value = rand(600, 1400);
  g.gain.value = vol;
  s.connect(f).connect(g).connect(out());
  s.start();
}

// ---------- Christmas sound kit ----------
let bellNoise = null;
function noise(c) {
  if (!bellNoise) {
    bellNoise = c.createBuffer(1, c.sampleRate * 0.25, c.sampleRate);
    const d = bellNoise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return bellNoise;
}
// One sleigh bell "ching": bright filtered noise + a few inharmonic metal partials
export function sleighBell(when = 0, vol = 0.12, bright = 1) {
  if (!ready()) return;
  const c = sound.ctx, t = c.currentTime + when;
  const n = c.createBufferSource(), hp = c.createBiquadFilter(), bp = c.createBiquadFilter(), g = c.createGain();
  n.buffer = noise(c);
  hp.type = "highpass"; hp.frequency.value = 5000;
  bp.type = "bandpass"; bp.frequency.value = 7500 * bright; bp.Q.value = 1.2;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  n.connect(hp).connect(bp).connect(g); send(g, 0.3);
  n.start(t); n.stop(t + 0.2);
  const base = rand(2400, 3200) * bright;
  [1, 1.47, 2.09, 2.56].forEach((m, i) => {
    const o = c.createOscillator(), og = c.createGain();
    o.type = "sine"; o.frequency.value = base * m;
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime((vol * 0.35) / (i + 1), t + 0.002);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.22 - i * 0.03);
    o.connect(og); send(og, 0.25);
    o.start(t); o.stop(t + 0.25);
  });
}
// A shake of sleigh bells
export function sleighShake(count = 4, vol = 0.1, gap = 0.055) {
  for (let i = 0; i < count; i++) sleighBell(i * gap + rand(0, 0.015), vol * rand(0.7, 1), rand(0.9, 1.15));
}
const PENT = [1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];
let lastHover = 0;
export function hoverSound() {
  const now = performance.now();
  if (now - lastHover < 70 || !ready()) return;
  lastHover = now;
  sleighBell(0, 0.035, rand(1, 1.25));
}
export function clickSound() {
  if (!ready()) return;
  chime(PENT[Math.floor(Math.random() * PENT.length)], 0, 0.06);
  sleighBell(0.01, 0.06);
}
// Slot machine tick: bell + glockenspiel note that climbs as the reel slows
export function reelTick(i, total) {
  if (!ready()) return;
  const k = i / total;
  sleighBell(0, 0.05 + k * 0.05, 1 + k * 0.3);
  chime(1046.5 * Math.pow(2, Math.floor(k * 12) / 12), 0, 0.035 + k * 0.03);
}
// Big reveal: rising bell arpeggio + chord + sleigh bells
export function tada() {
  if (!ready()) return;
  [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98].forEach((f, i) => chime(f * 2, i * 0.07, 0.08));
  [1046.5, 1318.51, 1567.98, 2093].forEach((f) => chime(f, 0.5, 0.06));
  sleighShake(10, 0.09, 0.06);
}
// Whoosh for opening the present
export function whoosh() {
  if (!ready()) return;
  const c = sound.ctx, t = c.currentTime;
  const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  n.buffer = noise(c); n.loop = true;
  f.type = "bandpass"; f.Q.value = 0.8;
  f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(6000, t + 0.5);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  n.connect(f).connect(g).connect(out());
  n.start(t); n.stop(t + 0.65);
}
// Soft "ding" for pop-up messages
export function toastSound(bad) {
  if (!ready()) return;
  if (bad) { chime(587.33, 0, 0.05); chime(554.37, 0.12, 0.05); }
  else { chime(1567.98, 0, 0.05); chime(2093, 0.09, 0.05); }
}
// ---------- SLOT MACHINE SOUND KIT ----------
function noiseBurst(t, dur, { type = "highpass", freq = 2000, q = 0.7, vol = 0.2, rev = 0.1 } = {}) {
  const c = sound.ctx, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  n.buffer = noise(c); n.loop = true;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f).connect(g); send(g, rev);
  n.start(t); n.stop(t + dur + 0.02);
}
function tone(t, f0, f1, dur, { type = "sine", vol = 0.2, rev = 0.15 } = {}) {
  const c = sound.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); send(g, rev); o.start(t); o.stop(t + dur + 0.05);
}
export const slotSfx = {
  // lever pulled down: ratchet clicks, then a springy clunk
  lever() {
    if (!ready()) return;
    const t = sound.ctx.currentTime;
    for (let i = 0; i < 9; i++) noiseBurst(t + i * 0.035, 0.025, { freq: 3200 - i * 140, vol: 0.18 });
    tone(t + 0.34, 180, 60, 0.25, { type: "triangle", vol: 0.35 });
    noiseBurst(t + 0.34, 0.12, { type: "lowpass", freq: 900, vol: 0.4 });
    tone(t + 0.45, 300, 900, 0.35, { type: "sine", vol: 0.06, rev: 0.4 });
    sleighShake(6, 0.08);
  },
  // spinning reels: a whir that you can speed-control; returns a handle
  whir() {
    if (!ready()) return { set() {}, stop() {} };
    const c = sound.ctx, t = c.currentTime;
    const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = noise(c); n.loop = true;
    f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 2.5;
    const hum = c.createOscillator(), hg = c.createGain();
    hum.type = "sawtooth"; hum.frequency.value = 55;
    const hlp = c.createBiquadFilter(); hlp.type = "lowpass"; hlp.frequency.value = 300;
    hg.gain.value = 0.04;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.2);
    n.connect(f).connect(g); hum.connect(hlp).connect(hg).connect(g);
    send(g, 0.1);
    n.start(t); hum.start(t);
    return {
      set(speed) { const now = c.currentTime; f.frequency.setTargetAtTime(300 + speed * 1600, now, 0.05); hum.frequency.setTargetAtTime(30 + speed * 60, now, 0.05); g.gain.setTargetAtTime(0.02 + speed * 0.08, now, 0.05); },
      stop() { const now = c.currentTime; g.gain.setTargetAtTime(0.0001, now, 0.08); n.stop(now + 0.5); hum.stop(now + 0.5); },
    };
  },
  // a symbol clicks past the payline
  tick(speed = 1, pitch = 1) {
    if (!ready()) return;
    const t = sound.ctx.currentTime;
    noiseBurst(t, 0.018, { freq: 4000, vol: 0.12 + (1 - speed) * 0.1, rev: 0.05 });
    if (speed < 0.6) fmBell(1567.98 * pitch, 0, 0.03 + (1 - speed) * 0.04, { dur: 0.5, rev: 0.3, echoAmt: 0 });
  },
  // a reel locks into place
  stop(final = false) {
    if (!ready()) return;
    const t = sound.ctx.currentTime;
    tone(t, 150, 48, 0.22, { type: "sine", vol: 0.5 });
    noiseBurst(t, 0.08, { type: "lowpass", freq: 1400, vol: 0.35 });
    fmBell(final ? 1046.5 : 1318.51, 0.02, 0.09, { dur: 1.4 });
  },
  // suspense drum roll that speeds up
  drumroll(dur = 1.6) {
    if (!ready()) return;
    const c = sound.ctx, t0 = c.currentTime;
    let t = 0, gap = 0.09;
    while (t < dur) { noiseBurst(t0 + t, 0.06, { type: "bandpass", freq: 1800, q: 0.8, vol: 0.05 + (t / dur) * 0.12, rev: 0.25 }); t += gap; gap = Math.max(0.028, gap * 0.94); }
    tone(t0, 70, 90, dur, { type: "sine", vol: 0.12, rev: 0.2 });
  },
  // the big win: brass fanfare + choir + bell cascade + coins
  jackpot() {
    if (!ready()) return;
    const c = sound.ctx, t0 = c.currentTime;
    const brass = (f, t, d, v = 0.06) => {
      const lp = c.createBiquadFilter(), g = c.createGain();
      lp.type = "lowpass"; lp.Q.value = 1.5;
      lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(3200, t + 0.08); lp.frequency.exponentialRampToValueAtTime(1200, t + d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.04); g.gain.setValueAtTime(v * 0.8, t + d - 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25);
      lp.connect(g); send(g, 0.45);
      [-8, 0, 8].forEach((det) => { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + d + 0.3); });
    };
    // "ta-ta-ta-TAAA"
    [[523.25, 0, 0.13], [523.25, 0.15, 0.13], [523.25, 0.3, 0.13], [659.25, 0.45, 0.9]].forEach(([f, dt, d]) => { brass(f, t0 + dt, d); brass(f * 1.5, t0 + dt, d, 0.035); });
    [[392, 1.35, 0.25], [523.25, 1.6, 1.6]].forEach(([f, dt, d]) => { brass(f, t0 + dt, d, 0.055); brass(f * 1.25, t0 + dt, d, 0.04); brass(f * 1.5, t0 + dt, d, 0.035); brass(f / 2, t0 + dt, d, 0.05); });
    // choir "aah"
    [261.63, 329.63, 392, 523.25].forEach((f) => {
      const g = c.createGain(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter();
      f1.type = "bandpass"; f1.frequency.value = 750; f1.Q.value = 4;
      f2.type = "bandpass"; f2.frequency.value = 1150; f2.Q.value = 5;
      g.gain.setValueAtTime(0, t0 + 0.45); g.gain.linearRampToValueAtTime(0.05, t0 + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.6);
      f1.connect(g); f2.connect(g); send(g, 0.8);
      [-10, 10].forEach((det) => { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det;
        const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.2; lg.gain.value = 6; lfo.connect(lg).connect(o.detune); lfo.start(t0); lfo.stop(t0 + 3.8);
        o.connect(f1); o.connect(f2); o.start(t0 + 0.45); o.stop(t0 + 3.8); });
    });
    // bell cascade + coin shower
    [2093, 1975.53, 1760, 1567.98, 1318.51, 1174.66, 1046.5, 1318.51, 1567.98, 2093, 2637.02].forEach((f, i) => fmBell(f, 0.5 + i * 0.07, 0.06, { pan: (i % 2 ? 0.5 : -0.5), dur: 1.6 }));
    for (let i = 0; i < 26; i++) fmBell(rand(2600, 4200), 1.2 + i * rand(0.04, 0.09), 0.025, { ratio: 2.01, index: 3, dur: 0.5, rev: 0.25, pan: rand(-0.8, 0.8) });
    sleighShake(16, 0.1, 0.05);
    tone(t0, 80, 40, 0.5, { vol: 0.4 });
  },
};

// Hover + click sounds on everything interactive
function uiSounds() {
  const SEL = "button, a, .chip, .orn, .bulb, .tab, .giftbox, input[type=submit], select";
  let lastEl = null;
  if (fine) {
    document.addEventListener("pointerover", (e) => {
      const el = e.target.closest(SEL);
      if (el === lastEl) return;
      lastEl = el;
      if (el && !el.disabled) hoverSound();
    });
  }
  document.addEventListener("click", (e) => {
    const el = e.target.closest(SEL);
    if (el && !el.disabled && !el.classList.contains("bulb") && !el.classList.contains("giftbox")) clickSound();
  });
  document.addEventListener("focusin", (e) => { if (e.target.matches("input, textarea")) sleighBell(0, 0.025, 1.3); });
}

// Music box: "Jingle Bells" chorus loop
const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, C3: 130.81, D3: 146.83, F3: 174.61, G2: 98, G3: 196 };
const A = (n, b = 1) => [N[n], b];
const MEL = [
  A("E4"), A("E4"), A("E4", 2), A("E4"), A("E4"), A("E4", 2), A("E4"), A("G4"), A("C4"), A("D4"), A("E4", 4),
  A("F4"), A("F4"), A("F4"), A("F4"), A("F4"), A("E4"), A("E4"), A("E4", 0.5), A("E4", 0.5), A("E4"), A("D4"), A("D4"), A("E4"), A("D4", 2), A("G4", 2),
  A("E4"), A("E4"), A("E4", 2), A("E4"), A("E4"), A("E4", 2), A("E4"), A("G4"), A("C4"), A("D4"), A("E4", 4),
  A("F4"), A("F4"), A("F4"), A("F4"), A("F4"), A("E4"), A("E4"), A("E4", 0.5), A("E4", 0.5), A("G4"), A("G4"), A("F4"), A("D4"), A("C4", 4),
  [0, 4],
];
const BARS = ["C3", "C3", "C3", "C3", "F3", "C3", "G2", "G2", "C3", "C3", "C3", "C3", "F3", "C3", "G2", "C3"];
const FIFTH = { C3: "G2", F3: "C3", G2: "D3" };
const BASS = [...BARS.flatMap((r) => [A(r, 2), A(FIFTH[r], 2)]), [0, 4]];
const BEAT = 60 / 152;
const music = { timer: null, voices: [] };
const CHORD = { C3: [261.63, 329.63, 392], F3: [349.23, 440, 523.25], G2: [392, 493.88, 587.33, 349.23] };
function musicNote(f, t, bass) {
  const c = ac();
  if (bass) {
    const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = "triangle"; o.frequency.value = f;
    lp.type = "lowpass"; lp.frequency.value = 600;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(lp).connect(g); send(g, 0.15);
    o.start(t); o.stop(t + 1);
    return;
  }
  // celesta-ish melody: FM bell an octave up + soft sine body
  fmBell(f * 2, t - c.currentTime, 0.055, { dur: 1.3, ratio: 4, index: 1.4, rev: 0.5, echoAmt: 0.12 });
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine"; o.frequency.value = f * 2;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  o.connect(g); send(g, 0.4); o.start(t); o.stop(t + 0.9);
}
function padChord(root, t, dur) {
  const c = ac(), notes = CHORD[root];
  if (!notes) return;
  const lp = c.createBiquadFilter(), g = c.createGain();
  lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = 0.4;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.028, t + 0.35);
  g.gain.setValueAtTime(0.028, t + dur - 0.3);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.4);
  lp.connect(g); send(g, 0.7);
  notes.forEach((f) => [-6, 6].forEach((det) => {
    const o = c.createOscillator();
    o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det;
    o.connect(lp); o.start(t); o.stop(t + dur + 0.5);
  }));
}
export function startMusic() {
  if (mobile) return;
  sound.music = true;
  if (music.timer || reduce) return;
  const c = ac();
  const t0 = c.currentTime + 0.1;
  music.voices = [{ seq: MEL, i: 0, t: t0 }, { seq: BASS, i: 0, t: t0, bass: true }];
  music.bar = { i: 0, t: t0 };
  music.shake = { i: 0, t: t0 };
  const PAD = [...BARS, null];
  const tick = () => {
    for (const v of music.voices) {
      while (v.t < c.currentTime + 0.5) {
        const [f, b] = v.seq[v.i];
        if (f) musicNote(f, v.t, v.bass);
        v.t += b * BEAT;
        v.i = (v.i + 1) % v.seq.length;
      }
    }
    while (music.bar.t < c.currentTime + 0.5) {
      const r = PAD[music.bar.i];
      if (r) padChord(r, music.bar.t, BEAT * 4);
      music.bar.t += BEAT * 4;
      music.bar.i = (music.bar.i + 1) % PAD.length;
    }
    // sleigh bells on the off-beats, accent on 2 and 4
    while (music.shake.t < c.currentTime + 0.5) {
      const k = music.shake.i % 8;
      if (music.shake.i < 128) sleighBell(music.shake.t - c.currentTime, k % 4 === 2 ? 0.05 : 0.022, 1.05);
      music.shake.t += BEAT / 2;
      music.shake.i = (music.shake.i + 1) % (68 * 2);
    }
    music.timer = setTimeout(tick, 120);
  };
  tick();
}
export function stopMusic() { sound.music = false; clearTimeout(music.timer); music.timer = null; }

// =====================================================================
// SKY: stars, shooting stars, parallax
// =====================================================================
function stars() {
  const layer = document.querySelector(".stars");
  if (!layer) return;
  for (const cls of ["s1", "s2"]) {
    const d = document.createElement("div");
    d.className = "starlayer " + cls;
    const pts = [];
    for (let i = 0; i < 110; i++) pts.push(`${(Math.random() * 100).toFixed(2)}vw ${(Math.random() * 70).toFixed(2)}vh #fff`);
    d.style.boxShadow = pts.join(",");
    layer.appendChild(d);
  }
}
function shootingStars() {
  if (reduce || mobile) return;
  const go = () => {
    const s = document.createElement("div");
    s.className = "shoot";
    s.style.top = `${rand(2, 35)}vh`;
    s.style.left = `${rand(10, 90)}vw`;
    s.addEventListener("animationend", () => s.remove());
    document.querySelector(".sky").appendChild(s);
    setTimeout(go, rand(4000, 11000));
  };
  setTimeout(go, 2500);
}
function parallax() {
  if (reduce || !fine) return;
  addEventListener("pointermove", (e) => {
    root.style.setProperty("--px", ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
    root.style.setProperty("--py", ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
  }, { passive: true });
}

// =====================================================================
// VILLAGE: hills, pines, glowing houses with chimney smoke, a snowman
// =====================================================================
const HILLS = {
  far: "M0 150 C200 90 380 170 620 120 C860 70 1080 150 1440 100",
  mid: "M0 205 C260 160 520 225 760 188 C1000 150 1220 215 1440 178",
  front: "M0 258 C300 225 560 280 860 250 C1120 225 1280 268 1440 245",
};
function yAtFactory(d) {
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", d);
  const len = p.getTotalLength(), pts = [];
  for (let i = 0; i <= 400; i++) pts.push(p.getPointAtLength((i / 400) * len));
  return (x) => pts.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a)).y;
}
function pine(x, y, h, fill, snow = true) {
  const w = h * 0.62;
  const pts = [[0, -h], [0.3, -0.58], [0.16, -0.58], [0.4, -0.25], [0.24, -0.25], [0.5, 0], [-0.5, 0], [-0.24, -0.25], [-0.4, -0.25], [-0.16, -0.58], [-0.3, -0.58]]
    .map(([a, b], i) => (i === 0 ? `${x},${y - h}` : `${x + a * w},${y + b * h}`)).join(" ");
  const cap = snow ? `<polygon points="${x},${y - h} ${x + w * 0.14},${y - h * 0.8} ${x + w * 0.05},${y - h * 0.83} ${x - w * 0.06},${y - h * 0.78} ${x - w * 0.14},${y - h * 0.8}" fill="#eaf1ff" opacity=".9"/>
    <path d="M${x + w * 0.16} ${y - h * 0.58} L${x + w * 0.3} ${y - h * 0.58} M${x - w * 0.16} ${y - h * 0.58} L${x - w * 0.3} ${y - h * 0.58} M${x + w * 0.24} ${y - h * 0.25} L${x + w * 0.4} ${y - h * 0.25} M${x - w * 0.24} ${y - h * 0.25} L${x - w * 0.4} ${y - h * 0.25}" stroke="#eaf1ff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>` : "";
  return `<polygon points="${pts}" fill="${fill}"/>${cap}`;
}
function house(x, y, s = 1, i = 0) {
  const d = (n) => (n * s).toFixed(1);
  return `<g transform="translate(${x - 35 * s} ${y - 40 * s})">
    <rect x="0" y="${d(14)}" width="${d(70)}" height="${d(40)}" fill="#141f4a"/>
    <rect x="${d(50)}" y="${d(-6)}" width="${d(9)}" height="${d(18)}" fill="#0d1636"/>
    <rect x="${d(48)}" y="${d(-9)}" width="${d(13)}" height="${d(4)}" rx="2" fill="#eaf1ff"/>
    <polygon points="${d(-7)},${d(17)} ${d(35)},${d(-12)} ${d(77)},${d(17)}" fill="#0d1636"/>
    <path d="M${d(-7)} ${d(17)} L${d(35)} ${d(-12)} L${d(77)} ${d(17)} L${d(71)} ${d(17)} L${d(35)} ${d(-5)} L${d(-1)} ${d(17)}Z" fill="#eaf1ff"/>
    <rect class="win" style="--d:${i * 0.7}s" x="${d(10)}" y="${d(24)}" width="${d(13)}" height="${d(12)}" rx="1.5" fill="#ffd166"/>
    <rect class="win" style="--d:${i * 0.7 + 1.3}s" x="${d(47)}" y="${d(24)}" width="${d(13)}" height="${d(12)}" rx="1.5" fill="#ffc46b"/>
    <rect x="${d(28)}" y="${d(32)}" width="${d(13)}" height="${d(22)}" rx="${d(6)}" fill="#ff9f43" opacity=".85"/>
    <circle class="smoke" style="--d:0s" cx="${d(54)}" cy="${d(-12)}" r="${d(5)}"/>
    <circle class="smoke" style="--d:1.2s" cx="${d(54)}" cy="${d(-12)}" r="${d(5)}"/>
    <circle class="smoke" style="--d:2.4s" cx="${d(54)}" cy="${d(-12)}" r="${d(5)}"/>
  </g>`;
}
function snowman(x, y) {
  return `<g class="snowman" transform="translate(${x} ${y})">
    <ellipse cx="0" cy="-4" rx="30" ry="6" fill="#0b1430" opacity=".25"/>
    <circle cx="0" cy="-22" r="22" fill="#f4f8ff"/><circle cx="0" cy="-58" r="16" fill="#f4f8ff"/><circle cx="0" cy="-84" r="12" fill="#f4f8ff"/>
    <rect x="-11" y="-101" width="22" height="4" fill="#111" /><rect x="-7" y="-114" width="14" height="14" fill="#111"/>
    <rect x="-7" y="-104" width="14" height="3" fill="#ff3b5c"/>
    <circle cx="-4" cy="-87" r="1.8" fill="#111"/><circle cx="4" cy="-87" r="1.8" fill="#111"/>
    <path d="M0 -83 l13 3 -13 2z" fill="#ff8c1a"/>
    <path d="M-12 -71 q12 6 24 0 l2 5 q-14 6 -28 0z" fill="#ff3b5c"/><path d="M6 -68 l4 14 -6 1 -3 -13z" fill="#e02447"/>
    <circle cx="0" cy="-62" r="1.8" fill="#111"/><circle cx="0" cy="-54" r="1.8" fill="#111"/>
    <path d="M-15 -60 L-38 -76 M-30 -71 l-4 -8 M15 -60 L37 -72 M30 -68 l5 -7" stroke="#5b3418" stroke-width="2.5" stroke-linecap="round"/>
  </g>`;
}
function village() {
  const host = document.getElementById("village");
  if (!host) return;
  const far = yAtFactory(HILLS.far), mid = yAtFactory(HILLS.mid), front = yAtFactory(HILLS.front);
  let farTrees = "", midStuff = "", frontStuff = "";
  for (let x = 10; x < 1440; x += rand(26, 48)) farTrees += pine(x, far(x) + 4, rand(26, 46), "#16234f", false);
  for (let x = 20; x < 1440; x += rand(60, 110)) {
    if ([150, 330, 560, 1040, 1250].some((h) => Math.abs(h - x) < 60)) continue;
    midStuff += pine(x, mid(x) + 6, rand(48, 78), "#0f1a3e");
  }
  [150, 330, 560, 1040, 1250].forEach((x, i) => (midStuff += house(x, mid(x) + 10, i % 2 ? 0.85 : 1, i)));
  frontStuff += pine(40, front(40) + 10, 150, "#0a1330") + pine(120, front(120) + 10, 95, "#0a1330");
  frontStuff += pine(1395, front(1395) + 10, 165, "#0a1330") + pine(1310, front(1310) + 10, 100, "#0a1330");
  frontStuff += snowman(300, front(300) + 6);
  const close = " L1440 300 L0 300Z";
  const peaks = [[0, 150], [90, 70], [170, 120], [260, 30], [360, 110], [450, 60], [560, 125], [680, 20], [800, 115], [900, 55], [1010, 120], [1120, 35], [1240, 110], [1340, 60], [1440, 120]];
  const mtn = "M" + peaks.map(([x, y]) => `${x} ${y}`).join(" L") + " L1440 300 L0 300Z";
  const caps = peaks.slice(1, -1).filter((p, i) => p[1] < 80).map(([x, y]) => {
    const h = 34;
    return `<path d="M${x} ${y} L${x + h * 0.9} ${y + h} L${x + h * 0.55} ${y + h * 0.8} L${x + h * 0.25} ${y + h * 1.05} L${x} ${y + h * 0.75} L${x - h * 0.3} ${y + h * 1.05} L${x - h * 0.6} ${y + h * 0.78} L${x - h * 0.9} ${y + h}Z" fill="#dfe9ff" opacity=".75"/>`;
  }).join("");
  host.innerHTML = `<svg viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="gMtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3d7c"/><stop offset="1" stop-color="#16224d"/></linearGradient></defs>
    <g class="layer l-mtn" opacity=".85"><path d="${mtn}" fill="url(#gMtn)"/>${caps}</g>
    <g class="layer l-far"><path d="${HILLS.far}${close}" fill="#1a285a"/>${farTrees}</g>
    <g class="layer l-mid"><path d="${HILLS.mid}${close}" fill="#24356f"/>${midStuff}</g>
    <g class="layer l-front"><path d="${HILLS.front}${close}" fill="#32468a"/><path d="${HILLS.front}" fill="none" stroke="#a9bdf0" stroke-width="3" opacity=".55"/>${frontStuff}</g>
  </svg>`;
}

// =====================================================================
// SNOW: drifts with the mouse, flakes dodge your cursor, click to blow a gust
// =====================================================================
const snowState = { blizzard: 0, gust: null, px: -999, py: -999 };
export function blizzard(ms = 9000) { snowState.blizzard = performance.now() + ms; }
function snow(canvas) {
  const ctx = canvas.getContext("2d");
  let W, H, flakes = [], wind = 0, targetWind = 0, t = 0, base = 0;
  const mk = (anyY) => {
    const z = Math.random();
    return { x: Math.random() * W, y: anyY ? Math.random() * H : -10, r: 0.8 + z * 3, z, s: 0.3 + z * 1.1, vx: 0, vy: 0,
      ph: Math.random() * 6.28, star: z > 0.82 && Math.random() < 0.55, rot: Math.random() * 6.28 };
  };
  function resize() {
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    base = Math.round(Math.min(reduce ? 60 : mobile ? 45 : lite ? 90 : 220, (W * H) / (lite ? 9000 : 7000)));
  }
  addEventListener("pointermove", (e) => {
    targetWind = (e.clientX / W - 0.5) * 2.4;
    snowState.px = e.clientX; snowState.py = e.clientY;
  }, { passive: true });
  document.addEventListener("pointerleave", () => (snowState.px = -999));
  addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, a, input, select, textarea, label, .dialog, .card, .orn")) return;
    snowState.gust = { x: e.clientX, y: e.clientY };
    chime(rand(1500, 2200), 0, 0.03);
  });
  function drawFlake(f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + f.z * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.moveTo(0, 0); ctx.lineTo(0, f.r * 2.2);
      ctx.moveTo(0, f.r * 1.2); ctx.lineTo(f.r * 0.6, f.r * 1.7);
      ctx.moveTo(0, f.r * 1.2); ctx.lineTo(-f.r * 0.6, f.r * 1.7);
    }
    ctx.stroke();
    ctx.restore();
  }
  function frame() {
    if (document.hidden) { requestAnimationFrame(frame); return; }
    t += 0.01;
    const storm = performance.now() < snowState.blizzard;
    const want = storm ? base * 3 : base;
    while (flakes.length < want) flakes.push(mk(flakes.length < base));
    if (flakes.length > want) flakes.length = Math.max(want, flakes.length - 4);
    const tw = storm ? 7 * Math.sin(t * 1.3) + 3 : targetWind;
    wind += (tw - wind) * 0.02;
    const g = snowState.gust;
    snowState.gust = null;
    ctx.clearRect(0, 0, W, H);
    for (const f of flakes) {
      if (g) {
        const dx = f.x - g.x, dy = f.y - g.y, d = Math.hypot(dx, dy);
        if (d < 280 && d > 1) { const k = ((280 - d) / 280) * 9; f.vx += (dx / d) * k; f.vy += (dy / d) * k; }
      }
      const dx = f.x - snowState.px, dy = f.y - snowState.py, d = Math.hypot(dx, dy);
      if (d < 80 && d > 1) { f.vx += (dx / d) * 0.35 * f.z; f.vy += (dy / d) * 0.35 * f.z; }
      f.vx *= 0.94; f.vy *= 0.94;
      f.y += f.s * (reduce ? 0.4 : storm ? 2.2 : 1) + f.vy;
      f.x += Math.sin(t * 2 + f.ph) * 0.4 * f.z + wind * f.z + f.vx;
      f.rot += 0.01;
      if (f.y > H + 10) Object.assign(f, mk(false));
      if (f.y < -40) f.y = H;
      if (f.x < -20) f.x = W + 10;
      if (f.x > W + 20) f.x = -10;
      if (f.star) drawFlake(f);
      else {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${0.3 + f.z * 0.6})`;
        ctx.arc(f.x, f.y, f.r, 0, 6.283);
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }
  resize();
  addEventListener("resize", resize);
  frame();
}

// =====================================================================
// LIGHTS: click to ring notes
// =====================================================================
function lights() {
  const ul = document.getElementById("lights");
  if (!ul) return;
  const colors = ["r", "g", "y", "b", "p"];
  const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
  const build = () => {
    const n = Math.max(10, Math.min(36, Math.floor(innerWidth / 46)));
    ul.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const li = document.createElement("li");
      const seg = (i % 6) / 5;
      li.className = "bulb " + colors[i % colors.length];
      li.style.setProperty("--sag", `${Math.sin(seg * Math.PI) * 14}px`);
      li.style.setProperty("--d", `${(Math.random() * 2).toFixed(2)}s`);
      li.style.setProperty("--dur", `${(1.2 + Math.random() * 1.6).toFixed(2)}s`);
      li.addEventListener("click", () => {
        li.classList.remove("pop"); void li.offsetWidth; li.classList.add("pop");
        chime(notes[i % notes.length] * 2, 0, 0.1);
        const r = li.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height, 14, "spark");
      });
      ul.appendChild(li);
    }
  };
  build();
  let tm;
  addEventListener("resize", () => { clearTimeout(tm); tm = setTimeout(build, 200); });
}

// =====================================================================
// PARTICLES: confetti, sparkles, fireworks (one overlay canvas)
// =====================================================================
let fx, fctx, parts = [], running = false;
function fxInit() {
  fx = document.getElementById("fx");
  fctx = fx.getContext("2d");
  const resize = () => {
    fx.width = innerWidth * DPR; fx.height = innerHeight * DPR;
    fx.style.width = innerWidth + "px"; fx.style.height = innerHeight + "px";
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  resize();
  addEventListener("resize", resize);
  if (!reduce && fine) {
    let last = 0;
    addEventListener("pointermove", (e) => {
      const now = performance.now();
      if (now - last < 40) return;
      last = now;
      burst(e.clientX, e.clientY, 1, "spark");
    }, { passive: true });
  }
}
const CONF = ["#ff3b5c", "#22c55e", "#ffd166", "#ffffff", "#4cc9f0", "#c77dff"];
const FW = [["#ff3b5c", "#ff8fab"], ["#ffd166", "#fff3c4"], ["#22c55e", "#b7f7cf"], ["#4cc9f0", "#d4f3ff"], ["#c77dff", "#f0d9ff"], ["#ffffff", "#ffd166"]];
function burst(x, y, n, kind, opts = {}) {
  if (mobile) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    if (kind === "spark") {
      const v = Math.random() * 1.6;
      parts.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + 0.4, g: 0.02, s: 1 + Math.random() * 2.5,
        c: Math.random() < 0.5 ? "#ffd166" : "#ffffff", life: 1, decay: 0.025 });
    } else if (kind === "ember") {
      const ring = opts.ring;
      const v = ring ? 6.5 + Math.random() * 0.6 : Math.pow(Math.random(), 0.6) * 8 + 0.6;
      const ang = ring ? (i / n) * Math.PI * 2 : a;
      parts.push({ kind, x, y, px: x, py: y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, g: 0.05, drag: 0.968,
        c: Math.random() < 0.7 ? opts.c[0] : opts.c[1], s: rand(2, 3.6), life: 1, decay: rand(0.008, 0.013), glitter: Math.random() < 0.35 });
    } else if (kind === "gift") {
      parts.push({ kind: "gift", x: x + (Math.random() - 0.5) * (opts.spreadX || 0), y: y - Math.random() * 200, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, g: 0.12,
        s: 14 + Math.random() * 14, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.15, c: CONF[i % 5], rib: i % 2 ? "#ffd166" : "#ffffff", life: 1, decay: 0.0025 });
    } else {
      const dirA = opts.dir != null ? opts.dir + (Math.random() - 0.5) * (opts.spread ?? 0.7) : a;
      const v = opts.dir != null ? 10 + Math.random() * 14 : 4 + Math.random() * 9;
      parts.push({ kind: Math.random() < 0.15 ? "star" : "rect", x, y, vx: Math.cos(dirA) * v, vy: Math.sin(dirA) * v - (opts.dir != null ? 0 : 6), g: 0.22,
        w: 6 + Math.random() * 6, h: 4 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        c: CONF[i % CONF.length], life: 1, decay: 0.006 + Math.random() * 0.004 });
    }
  }
  if (!running) { running = true; requestAnimationFrame(loop); }
}
function launch(x, ty) {
  if (mobile) return;
  const H = innerHeight;
  const vy = -Math.sqrt(2 * 0.24 * (H - ty));
  parts.push({ kind: "rocket", x, y: H + 10, vx: rand(-0.8, 0.8), vy, g: 0.24, life: 1, decay: 0, c: FW[Math.floor(Math.random() * FW.length)] });
  if (!running) { running = true; requestAnimationFrame(loop); }
}
function loop() {
  fctx.clearRect(0, 0, innerWidth, innerHeight);
  const born = [];
  parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 60);
  for (const p of parts) {
    if (p.kind === "rocket") {
      p.x += p.vx; p.y += p.vy; p.vy += p.g;
      born.push({ kind: "spark", x: p.x, y: p.y, vx: rand(-0.3, 0.3), vy: rand(0.5, 1.5), g: 0.02, s: 2.2, c: "#ffe7a3", life: 0.9, decay: 0.045 });
      if (p.vy >= -0.6) {
        p.life = 0;
        const ring = Math.random() < 0.3;
        born.push(["ember", p.x, p.y, ring ? 70 : 140, { c: p.c, ring }]);
        born.push({ kind: "bloom", x: p.x, y: p.y, c: p.c[0], life: 1, decay: 0.06, g: 0, vx: 0, vy: 0 });
        pop(0.22);
      }
      continue;
    }
    p.life -= p.decay;
    if (p.kind === "bloom") {
      const r = 140 * (1.2 - p.life);
      const gr = fctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(0.25, p.c); gr.addColorStop(1, "rgba(0,0,0,0)");
      fctx.globalCompositeOperation = "lighter";
      fctx.globalAlpha = Math.max(0, p.life) * 0.55;
      fctx.fillStyle = gr; fctx.beginPath(); fctx.arc(p.x, p.y, r, 0, 6.283); fctx.fill();
      fctx.globalCompositeOperation = "source-over";
      continue;
    }
    if (p.kind === "ember") {
      p.px = p.x; p.py = p.y;
      p.vx *= p.drag; p.vy *= p.drag; p.vy += p.g; p.x += p.vx; p.y += p.vy;
      const a = Math.max(0, p.life) * (p.glitter && Math.random() < 0.5 ? 0.25 : 1);
      fctx.globalCompositeOperation = "lighter";
      fctx.globalAlpha = a;
      fctx.strokeStyle = p.c;
      fctx.lineWidth = p.s;
      fctx.beginPath(); fctx.moveTo(p.px - (p.x - p.px) * 2, p.py - (p.y - p.py) * 2); fctx.lineTo(p.x, p.y); fctx.stroke();
      fctx.fillStyle = "#fff"; fctx.globalAlpha = a * 0.8;
      fctx.beginPath(); fctx.arc(p.x, p.y, p.s * 0.55, 0, 6.283); fctx.fill();
      fctx.globalCompositeOperation = "source-over";
      continue;
    }
    p.vx *= 0.99; p.vy += p.g; p.x += p.vx; p.y += p.vy;
    fctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
    fctx.fillStyle = p.c;
    if (p.kind === "spark") {
      fctx.beginPath(); fctx.arc(p.x, p.y, Math.max(0.01, p.s * p.life), 0, 6.283); fctx.fill();
      continue;
    }
    p.rot += p.vr;
    fctx.save();
    fctx.translate(p.x, p.y);
    fctx.rotate(p.rot);
    if (p.kind === "gift") {
      const z = p.s;
      fctx.fillStyle = p.c; fctx.fillRect(-z / 2, -z / 2, z, z);
      fctx.fillStyle = "rgba(0,0,0,.18)"; fctx.fillRect(z * 0.2, -z / 2, z * 0.3, z);
      fctx.fillStyle = p.rib; fctx.fillRect(-z * 0.09, -z / 2, z * 0.18, z); fctx.fillRect(-z / 2, -z * 0.09, z, z * 0.18);
      fctx.beginPath(); fctx.ellipse(-z * 0.18, -z * 0.62, z * 0.18, z * 0.11, -0.5, 0, 6.283); fctx.ellipse(z * 0.18, -z * 0.62, z * 0.18, z * 0.11, 0.5, 0, 6.283); fctx.fill();
      fctx.restore();
      continue;
    }
    if (p.kind === "star") { fctx.font = "16px serif"; fctx.fillText("✦", -6, 6); }
    else fctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 1);
    fctx.restore();
  }
  for (const b of born) Array.isArray(b) ? burst(b[1], b[2], b[3], b[0], b[4]) : parts.push(b);
  fctx.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(loop);
  else { running = false; fctx.clearRect(0, 0, innerWidth, innerHeight); }
}
export function confetti(x = innerWidth / 2, y = innerHeight / 2.5, n = 140) {
  burst(x, y, reduce ? 30 : n, "confetti");
}
// Shatter-into-glitter burst (used when you claim your ornament)
export function glitter(x, y, colors = ["#ffd166", "#ffffff"], n = 220) {
  for (let k = 0; k < colors.length; k++) burst(x, y, Math.round(n / colors.length), "ember", { c: [colors[k], "#ffffff"] });
  burst(x, y, 40, "spark");
  pop(0.3);
}
export function giftRain(n = 40) { for (let i = 0; i < n; i++) setTimeout(() => burst(Math.random() * innerWidth, -30, 1, "gift"), i * 45); }
export function cannons() {
  burst(0, innerHeight, 120, "confetti", { dir: -Math.PI / 3.2, spread: 0.6 });
  burst(innerWidth, innerHeight, 120, "confetti", { dir: -Math.PI + Math.PI / 3.2, spread: 0.6 });
}
export function sparkleAt(el) {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, 24, "spark");
}
export function fireworks(n = 4) {
  if (reduce) return confetti(innerWidth / 2, innerHeight / 3, 60);
  for (let i = 0; i < n; i++) setTimeout(() => launch(rand(0.15, 0.85) * innerWidth, rand(0.12, 0.42) * innerHeight), i * rand(220, 420));
}
export function flash() {
  if (mobile) return;
  const f = document.createElement("div");
  f.className = "flash";
  f.addEventListener("animationend", () => f.remove());
  document.body.appendChild(f);
}

// =====================================================================
// SLEIGH + EASTER EGGS
// =====================================================================
let onSleighCb = null;
export function flySleigh(fast = false) {
  if (reduce) return;
  const s = document.createElement("button");
  s.className = "sleigh" + (fast ? " zoom" : "");
  s.setAttribute("aria-label", "Santa's sleigh");
  s.innerHTML = sleighSVG();
  s.style.top = `${70 + Math.random() * 120}px`;
  s.addEventListener("click", (e) => {
    s.classList.add("zoom");
    confetti(e.clientX, e.clientY, 90);
    fireworks(3);
    jingle();
    onSleighCb?.();
  });
  // glittering trail from the back of the sleigh
  const trail = setInterval(() => {
    if (!s.isConnected) return clearInterval(trail);
    const r = s.getBoundingClientRect();
    if (r.right < -20 || r.left > innerWidth + 20) return;
    burst(r.right - r.width * 0.06, r.top + r.height * 0.78, 2, "spark");
    if (Math.random() < 0.5) burst(r.left + r.width * 0.02, r.top + r.height * 0.3, 1, "spark");
  }, 35);
  s.addEventListener("animationend", (e) => { if (e.animationName === "fly") { clearInterval(trail); s.remove(); } });
  document.body.appendChild(s);
  if (ready()) { const n = fast ? 16 : 30, dur = fast ? 2.2 : 6; for (let i = 0; i < n; i++) sleighBell(i * (dur / n) + rand(0, 0.05), 0.012 + 0.04 * Math.sin((i / n) * Math.PI)); }
}
function sleighLoop() {
  const go = () => { flySleigh(); setTimeout(go, rand(28000, 48000)); };
  setTimeout(go, 5000);
}
function easterEggs(onEgg) {
  let buf = "";
  addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select")) return;
    if (e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).replace(/[^a-z]/g, "").slice(-12);
    if (buf.endsWith("letitsnow")) { buf = ""; blizzard(); onEgg?.("snow"); }
    if (buf.endsWith("hohoho")) { buf = ""; fireworks(6); jingle(); onEgg?.("santa"); }
  });
}

// =====================================================================
// 3D tilt on cards
// =====================================================================
export function tilt(el) {
  if (reduce || !fine) return;
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-2px)`;
    el.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--my", `${(y + 0.5) * 100}%`);
  });
  el.addEventListener("pointerleave", () => (el.style.transform = ""));
}

// =====================================================================
// AURORA: slow, shimmering northern-light curtains
// =====================================================================
function aurora() {
  const cv = document.getElementById("aurora");
  if (!cv || mobile) return;
  const ctx = cv.getContext("2d");
  const S = 0.5;
  let W, H, t = 0;
  const size = () => { W = innerWidth; H = innerHeight * 0.6; cv.width = W * S; cv.height = H * S; ctx.setTransform(S, 0, 0, S, 0, 0); };
  size(); addEventListener("resize", size);
  const bands = [
    { y: 0.32, amp: 46, len: 0.0028, sp: 0.35, c: [80, 255, 170], a: 0.075, h: 170 },
    { y: 0.22, amp: 34, len: 0.0042, sp: -0.25, c: [90, 210, 255], a: 0.06, h: 130 },
    { y: 0.42, amp: 28, len: 0.0035, sp: 0.2, c: [200, 120, 255], a: 0.04, h: 110 },
  ];
  let skip = 0;
  const frame = () => {
    if (document.hidden || (lite && skip++ % 2)) { requestAnimationFrame(frame); return; }
    t += reduce ? 0 : lite ? 0.016 : 0.008;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (const b of bands) {
      for (let x = 0; x < W; x += lite ? 9 : 5) {
        const y = b.y * H + Math.sin(x * b.len + t * b.sp * 3) * b.amp + Math.sin(x * b.len * 2.3 - t) * b.amp * 0.35;
        const flick = 0.55 + 0.45 * Math.sin(x * 0.02 + t * 4 + b.y * 10);
        const h = b.h * (0.6 + 0.4 * Math.sin(x * 0.006 + t * 1.5));
        const g = ctx.createLinearGradient(0, y - h, 0, y + 10);
        g.addColorStop(0, `rgba(${b.c},0)`);
        g.addColorStop(0.75, `rgba(${b.c},${b.a * flick})`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x, y - h, 6, h + 10);
      }
    }
    requestAnimationFrame(frame);
  };
  frame();
}

// =====================================================================
// GINGERBREAD MAN: runs along the hills now and then; click him
// =====================================================================
const GINGER = `<svg viewBox="0 0 60 72" aria-hidden="true">
  <g class="gb-body">
    <g class="gb-legL"><path d="M22 46 L16 66" stroke="#b5651d" stroke-width="11" stroke-linecap="round"/><path d="M14 62 l6 2" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>
    <g class="gb-legR"><path d="M38 46 L44 66" stroke="#b5651d" stroke-width="11" stroke-linecap="round"/><path d="M40 64 l6 -2" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>
    <path d="M16 30 Q10 34 4 26" stroke="#b5651d" stroke-width="10" stroke-linecap="round" fill="none"/>
    <g class="gb-wave"><path d="M44 30 Q50 26 56 16" stroke="#b5651d" stroke-width="10" stroke-linecap="round" fill="none"/></g>
    <rect x="16" y="24" width="28" height="28" rx="12" fill="#c8742a"/>
    <circle cx="30" cy="15" r="13" fill="#c8742a"/>
    <path d="M5 23 q2 3 4 0 M51 18 q3 1 3 -3" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle cx="25" cy="13" r="2" fill="#2a1608"/><circle cx="35" cy="13" r="2" fill="#2a1608"/>
    <path d="M24 19 Q30 24 36 19" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="21" cy="18" r="2.4" fill="#ff8fa3" opacity=".7"/><circle cx="39" cy="18" r="2.4" fill="#ff8fa3" opacity=".7"/>
    <circle cx="30" cy="31" r="2.6" fill="#ff3b5c"/><circle cx="30" cy="39" r="2.6" fill="#22c55e"/><circle cx="30" cy="47" r="2.6" fill="#ffd166"/>
    <path d="M19 28 q11 4 22 0" stroke="#fff" stroke-width="1.8" fill="none" stroke-dasharray="3 3"/>
  </g>
</svg>`;
function gingerbread(onClick) {
  if (reduce) return;
  const run = () => {
    const g = document.createElement("button");
    const ltr = Math.random() < 0.5;
    g.className = "ginger" + (ltr ? "" : " rtl");
    g.setAttribute("aria-label", "Gingerbread man");
    g.innerHTML = GINGER;
    g.addEventListener("click", () => {
      g.classList.remove("hop"); void g.offsetWidth; g.classList.add("hop");
      sleighShake(4, 0.08); chime(1567.98, 0, 0.06); chime(2093, 0.12, 0.06);
      const r = g.getBoundingClientRect(); burst(r.left + r.width / 2, r.top, 18, "spark");
      onClick?.();
    });
    g.addEventListener("animationend", (e) => { if (e.animationName === "gbRun" || e.animationName === "gbRunR") g.remove(); });
    document.body.appendChild(g);
    setTimeout(run, rand(35000, 60000));
  };
  setTimeout(run, rand(9000, 14000));
}

// =====================================================================
// BUTTONS: magnetic pull + click ripple
// =====================================================================
function buttonFx() {
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".btn, .tab, .chip");
    if (!b) return;
    const r = b.getBoundingClientRect();
    const s = document.createElement("span");
    s.className = "ripple";
    const d = Math.max(r.width, r.height) * 2;
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(s);
    s.addEventListener("animationend", () => s.remove());
  });
  if (!fine || reduce) return;
  document.addEventListener("pointermove", (e) => {
    const b = e.target.closest(".btn");
    document.querySelectorAll(".btn.mag").forEach((x) => { if (x !== b) { x.classList.remove("mag"); x.style.translate = ""; } });
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect();
    b.classList.add("mag");
    b.style.translate = `${((e.clientX - r.left) / r.width - 0.5) * 10}px ${((e.clientY - r.top) / r.height - 0.5) * 8}px`;
  }, { passive: true });
}

// =====================================================================
// SNOW CAPS on cards
// =====================================================================
export function snowcap() {
  // chunky snow band (viewBox is close to real card proportions so bumps stay round)
  let d = "M0 14 Q0 6 8 6";
  let x = 8;
  while (x < 392) {
    const w = rand(16, 30), crest = rand(0.5, 4);
    const nx = Math.min(392, x + w);
    d += ` Q${((x + nx) / 2).toFixed(1)} ${crest.toFixed(1)} ${nx.toFixed(1)} ${rand(5, 7).toFixed(1)}`;
    x = nx;
  }
  d += " Q400 6 400 14 L400 15";
  let drips = "";
  for (let i = 0; i < 5; i++) {
    const dx = rand(20, 380), h = rand(6, 15), w = rand(3, 5.5);
    drips += `<path d="M${dx - w} 13 Q${dx - w * 0.7} ${13 + h} ${dx} ${14 + h} Q${dx + w * 0.7} ${13 + h} ${dx + w} 13Z" fill="#eef4ff"/>`;
  }
  let lx = 0;
  d += " L0 15Z";
  return `<svg class="snowcap" viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d}" fill="#f4f8ff"/>${drips}
    <path d="${d}" fill="none" stroke="#ffffff" stroke-width="1.2" opacity=".9"/>
    <path d="M6 13 H394" stroke="#c9d9f5" stroke-width="1.5" opacity=".6"/></svg>`;
}

// =====================================================================
// INTRO: a giant wrapped present you tear open
// =====================================================================
// The 3D planet is the sign-in screen.
let planet = null;
const introEl = () => document.getElementById("intro");
export const isPlanetUp = () => !!introEl() && !introEl().hidden;
function hidePlanet() {
  const el = introEl();
  planet?.dispose(); planet = null;
  if (el) { el.hidden = true; el.classList.remove("out", "opening", "ready"); }
  document.body.classList.remove("intro-on");
}
export async function showPlanet({ onSignIn } = {}) {
  const el = introEl();
  if (!el) return false;
  el.hidden = false;
  el.classList.remove("out", "opening");
  document.body.classList.add("intro-on");
  document.getElementById("intro-open").onclick = () => { ac(); onSignIn?.(); };
  if (!planet) {
    try {
      const m = await import("./intro3d.js");
      // Render the planet at a lower resolution on phones so it stays smooth
      const realDpr = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
      let swapped = false;
      if (mobile) try { Object.defineProperty(window, "devicePixelRatio", { value: 1.25, configurable: true }); swapped = true; } catch {}
      try { planet = m.startIntro3D(el, { sounds: { grab: () => sleighShake(2, 0.05) } }); }
      finally { if (swapped) try { delete window.devicePixelRatio; if (realDpr) Object.defineProperty(window, "devicePixelRatio", realDpr); } catch {} }
    } catch (err) {
      console.warn("3D planet unavailable:", err);
      hidePlanet();
      return false;
    }
  }
  el.classList.add("ready");
  return true;
}
// After sign-in: fly down into the tree, then reveal the site underneath
export function flyIntoPlanet() {
  return new Promise((resolve) => {
    const el = introEl();
    if (!planet || !el || el.classList.contains("opening")) { if (!planet) hidePlanet(); resolve(); return; }
    el.classList.add("opening");
    whoosh(); sleighShake(10, 0.1);
    planet.enter(() => {
      el.classList.add("out");
      flash(); jingle(); fireworks(3);
      confetti(innerWidth / 2, innerHeight / 2.2, 160);
      setTimeout(() => { hidePlanet(); resolve(); }, 800);
    });
  });
}

export function initEffects({ onSleigh, onEgg, onGinger } = {}) {
  onSleighCb = onSleigh;
  stars();
  village();
  shootingStars();
  parallax();
  snow(document.getElementById("snow"));
  lights();
  fxInit();
  easterEggs(onEgg);
  uiSounds();
  aurora();
  gingerbread(onGinger);
  buttonFx();
}

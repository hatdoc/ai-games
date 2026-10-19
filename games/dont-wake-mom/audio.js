// Procedural sound for every action: footsteps by surface, hinges, drawers, packaging, boiling water, microwave, keyboard, dog, car...
// The house is silent otherwise. Loudness follows the dB of the event (what the player hears of their own noise).
const Snd = (() => {
  let ac, out, muted = false, tvG;
  const init = () => {
    if (ac) return ac;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = .9; out.connect(ac.destination); } catch {}
    return ac;
  };
  const vol = (db) => Math.min(.85, .05 + (Math.max(db, 12) - 12) / 70 * (Math.max(db, 12) - 12) / 70 * .9 + (Math.max(db, 12) - 12) / 600);
  const rn = (a, b) => a + Math.random() * (b - a);
  const later = (ms, f) => setTimeout(() => { if (!muted) f(); }, ms);
  // shaped noise burst: type = filter type, f = center/cutoff, g = gain, curve shapes the decay
  const burst = (dur, f, q, g, type = 'bandpass', f2 = 0) => {
    if (!init() || muted) return; const n = Math.max(64, ac.sampleRate * dur | 0), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 1.5;
    const s = ac.createBufferSource(); s.buffer = b; const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, ac.currentTime); if (f2) fl.frequency.linearRampToValueAtTime(f2, ac.currentTime + dur);
    const gn = ac.createGain(); gn.gain.value = g; s.connect(fl).connect(gn).connect(out); s.start();
  };
  const tone = (f0, f1, dur, type, g, vib = 0) => {
    if (!init() || muted) return; const o = ac.createOscillator(), gn = ac.createGain(), t = ac.currentTime;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vib; lg.gain.value = f0 * .06; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur); }
    gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(.0005, t + dur); o.connect(gn).connect(out); o.start(t); o.stop(t + dur);
  };
  const S = {
    init,
    toggle() { muted = !muted; if (tvG) tvG.gain.value = 0; return muted; },
    // soft TV murmur, only where a TV is on
    tv(on, v = .03) {
      if (!on && !tvG) return; // never build (or start) the TV unless a scene turns it on
      if (!init() || muted) return;
      if (!tvG) {
        const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const s = ac.createBufferSource(); s.buffer = b; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = .5;
        const mod = ac.createGain(); mod.gain.value = .6; const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 3.1; lg.gain.value = .4; lfo.connect(lg).connect(mod.gain);
        tvG = ac.createGain(); tvG.gain.value = 0; s.connect(f).connect(mod).connect(tvG).connect(out); s.start(); lfo.start();
      }
      tvG.gain.value = on ? v : 0;
    },
    step(db, surf) {
      const v = vol(db), p = rn(.85, 1.2);
      if (surf === 'carpet') burst(.12, 380 * p, .7, v * .7, 'lowpass');
      else if (surf === 'tile') { burst(.04, 2600 * p, 3, v * .9); tone(150 * p, 90, .07, 'sine', v * .35); }
      else if (surf === 'conc') { burst(.07, 1200 * p, 1, v * .7); tone(130 * p, 80, .06, 'sine', v * .3); }
      else { tone(125 * p, 62, .09, 'sine', v * .55); burst(.08, 700 * p, 1.2, v * .55); }
    },
    creak(db) { const v = vol(db), f = rn(80, 130); tone(f, f * .6, .45, 'sawtooth', v * .16, 9); burst(.35, 650, 5, v * .22); },
    hinge(db) { const v = vol(db), f = rn(330, 520); tone(f, f * 1.7, .3, 'sawtooth', v * .09, 11); tone(f * 2, f * 3, .25, 'triangle', v * .05); },
    click(db) { const v = vol(db); burst(.04, 2400, 2.5, v * .8); tone(900, 500, .03, 'square', v * .05); },
    handle(db) { const v = vol(db); burst(.05, 1600, 3, v * .7); later(70, () => tone(700, 400, .04, 'square', v * .05)); },
    slide(db) { const v = vol(db); burst(.5, 350, .8, v * .6, 'lowpass', 180); },
    clang(db) { const v = vol(db); tone(520, 380, .35, 'triangle', v * .18); tone(1040, 760, .25, 'sine', v * .08); burst(.08, 2000, 3, v * .6); },
    cab(db) { const v = vol(db); tone(180, 90, .09, 'sine', v * .5); burst(.06, 900, 1.5, v * .6); },
    bolt(db) { const v = vol(db); tone(1700, 1100, .06, 'square', v * .08); burst(.05, 3000, 4, v * .7); later(110, () => { burst(.06, 2200, 4, v); tone(900, 600, .05, 'square', v * .08); }); },
    thump(db) { tone(90, 50, .12, 'sine', vol(db) * .6); },
    bump(db) { const v = vol(db); burst(.2, 300, .8, v * .8); tone(120, 60, .15, 'sine', v * .5); },
    rustle(db) { burst(.3, 3000, .6, vol(db) * .55, 'highpass'); },
    crinkle(db) { const v = vol(db); for (let i = 0; i < 9; i++) later(i * rn(25, 55), () => burst(.03, rn(3500, 7000), 1.5, v * rn(.3, .8), 'highpass')); },
    crunch(db) { const v = vol(db); for (let i = 0; i < 4; i++) later(i * 90, () => burst(.07, rn(1200, 2400), 1.2, v * .8)); },
    slurp(db) { const v = vol(db); burst(.55, 500, 4, v * .8, 'bandpass', 1900); later(480, () => burst(.2, 700, 3, v * .4, 'bandpass', 300)); },
    chew(db) { const v = vol(db); for (let i = 0; i < 3; i++) later(i * 160, () => burst(.09, 500, 1, v * .5, 'lowpass')); },
    pour(db) { const v = vol(db); burst(.9, 2200, .7, v * .45, 'highpass'); burst(.9, 500, 1, v * .3, 'lowpass'); },
    boil(db) { const v = vol(db); burst(1, 260, .7, v * .45, 'lowpass'); for (let i = 0; i < 14; i++) later(i * rn(40, 75), () => tone(rn(300, 800), rn(500, 1100), .05, 'sine', v * .12)); },
    hiss(db) { burst(1, 5000, .5, vol(db) * .35, 'highpass'); },
    hum(db) { const v = vol(db); tone(100, 98, 1.4, 'sawtooth', v * .07); tone(50, 50, 1.4, 'sine', v * .1); burst(1.4, 300, .6, v * .15, 'lowpass'); },
    ding() { tone(1760, 1760, .7, 'sine', .14); tone(2640, 2640, .5, 'sine', .05); },
    beep() { tone(1000, 1000, .35, 'sine', .25); later(450, () => tone(1000, 1000, .35, 'sine', .25)); },
    keys(db) { const v = vol(db); for (let i = 0; i < 6; i++) later(i * rn(55, 95), () => { burst(.03, rn(1800, 3200), 3, v * .7); tone(rn(400, 700), 250, .03, 'square', v * .04); }); },
    whisper(db) { burst(.5, 3200, 1.2, vol(db) * .6, 'bandpass', 2400); },
    coins(db) { const v = vol(db); for (let i = 0; i < 5; i++) later(i * rn(50, 90), () => tone(rn(2600, 4200), rn(2400, 3800), .12, 'sine', v * .1)); },
    fan(db) { burst(1.2, 700, .5, vol(db) * .3, 'lowpass', 150); },
    bark(db) { const v = vol(db); burst(.12, 700, 2, v * .8); tone(420, 230, .14, 'sawtooth', v * .12); later(230, () => { burst(.12, 700, 2, v * .8); tone(400, 220, .14, 'sawtooth', v * .12); }); },
    whine(db) { tone(700, 1000, .5, 'sine', vol(db) * .12, 7); },
    car() { tone(70, 50, 1.8, 'sawtooth', .09); burst(1.8, 150, .6, .2, 'lowpass'); later(1900, () => { tone(150, 70, .1, 'sine', .4); burst(.08, 800, 2, .4); }); },
    sigh() { burst(1, 500, .6, .08, 'lowpass', 220); later(500, () => burst(.35, 3500, .5, .035, 'highpass')); },
    gasp() { burst(.3, 1400, 1.5, .35); tone(520, 980, .18, 'triangle', .18); later(130, () => { tone(300, 180, .35, 'square', .1); burst(.2, 700, 2, .25); }); },
    ping() { tone(880, 1320, .25, 'sine', .2); },
    chime() { tone(1320, 1320, .4, 'sine', .15); later(160, () => tone(1760, 1760, .5, 'sine', .12)); },
    bell() { tone(660, 660, .6, 'sine', .3); later(500, () => tone(520, 520, .8, 'sine', .3)); },
    buzz(db) { const v = vol(db); for (let i = 0; i < 3; i++) later(i * 190, () => tone(170, 160, .13, 'square', v * .07)); },
  };
  return S;
})();

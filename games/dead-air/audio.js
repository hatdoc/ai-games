// Dead Air audio: everything is synthesized (no files). Call A.init() from a user gesture.
const A = (() => {
  let ctx, out, verb, rv, vBus, vAn, vBuf, nb, muted = false, N = {}, beatAt = 0, ringT = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const VOW = [[730, 1090], [270, 2290], [300, 870], [530, 1840], [570, 840], [660, 1700]];

  const noise = () => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.start(0, rnd(0, 3)); return s; };
  const filt = (type, f, q = 1) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const gain = (v = 0, to = null) => { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
  const now = () => ctx.currentTime + 0.01;
  const impulse = (sec, decay) => {
    const n = ctx.sampleRate * sec | 0, b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  };
  // tone with an attack/decay envelope, optional glide to f2
  const tn = (f, t, a, d, v, type = 'sine', to = out, f2) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g); g.connect(to); o.start(t); o.stop(t + a + d + 0.05);
  };
  // filtered noise burst, optional filter sweep to f2
  const nz = (t, d, v, type, f, q = 1, to = out, f2) => {
    const s = noise(), b = filt(type, f, q), g = ctx.createGain();
    b.frequency.setValueAtTime(f, t); if (f2) b.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.02, d / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(b); b.connect(g); g.connect(to); s.stop(t + d + 0.05);
  };

  function init() {
    if (ctx) { ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 20; comp.ratio.value = 8;
    out = gain(muted ? 0 : 0.85, comp); comp.connect(ctx.destination);
    nb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    verb = ctx.createConvolver(); verb.buffer = impulse(2.8, 2.6); verb.connect(gain(0.5, out));
    rv = gain(0.6, verb); // reverb send
    vBus = gain(1, out); vAn = ctx.createAnalyser(); vAn.fftSize = 256; vBuf = new Uint8Array(vAn.fftSize); vBus.connect(vAn); vBus.connect(gain(0.25, rv));
    beds();
  }

  function beds() {
    // low drone: detuned saws through a slowly wobbling lowpass
    N.drone = gain(0, out);
    for (const [f, type, det] of [[55, 'sawtooth', -6], [55.3, 'sawtooth', 8], [82.5, 'triangle', 0], [27.5, 'sine', 0]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
      const lp = filt('lowpass', 170, 0.7); o.connect(lp); lp.connect(N.drone); o.start();
      if (f === 55 && det < 0) { const l = ctx.createOscillator(); l.frequency.value = 0.07; const lg = gain(70, lp.frequency); l.connect(lg); l.start(); }
    }
    // mains hum + fluorescent buzz
    N.hum = gain(0, out);
    for (const [f, v] of [[60, .5], [120, .35], [180, .12], [240, .08]]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(gain(v, N.hum)); o.start(); }
    const bz = noise(); bz.connect(filt('bandpass', 2400, 9)).connect(gain(0.05, N.hum));
    // wind and rain outside
    N.wind = gain(0, out); const w = noise(); w.connect(filt('bandpass', 320, 0.8)).connect(N.wind);
    const wl = ctx.createOscillator(); wl.frequency.value = 0.11; wl.connect(gain(0.015, N.wind.gain)); wl.start();
    N.rain = gain(0, out); const r = noise(); r.connect(filt('highpass', 1500)).connect(filt('lowpass', 6500)).connect(N.rain);
    // whispers (fear): two formant-ish bands, amplitude-wobbled
    N.whisper = gain(0, out); const ws = noise(); ws.connect(filt('bandpass', 1700, 5)).connect(N.whisper); ws.connect(filt('bandpass', 2900, 6)).connect(N.whisper);
    const wm = ctx.createOscillator(); wm.frequency.value = 3.7; wm.connect(gain(0.05, N.whisper.gain)); wm.start();
    N.tone = gain(0, out); const to = ctx.createOscillator(); to.frequency.value = 3150; to.connect(N.tone); to.start();
    N.sub = gain(0, out); const sb = ctx.createOscillator(); sb.frequency.value = 40; sb.connect(N.sub); sb.start();
  }

  // m: view 0 desk..1 window, fear 0..1, quiet 0..1 (1 = near silence, only the heartbeat)
  function mix({ view = 0, fear = 0, quiet = 0 }) {
    if (!ctx) return; const t = ctx.currentTime, q = 1 - quiet, set = (g, v) => g.gain.setTargetAtTime(v, t, 0.3);
    set(N.drone, (.09 + .12 * fear) * q); set(N.hum, .05 * (1 - .55 * view) * q);
    set(N.wind, (.02 + .05 * view) * q); set(N.rain, (.012 + .05 * view) * q);
    set(N.whisper, .11 * fear * fear * q); set(N.tone, .014 * fear ** 3); set(N.sub, .3 * fear * q);
    if (fear > .15 && t >= beatAt) { // lub-dub
      const v = .12 + .5 * fear; tn(64, t, .005, .14, v, 'sine', out, 40); tn(58, t + .18, .005, .12, v * .7, 'sine', out, 38);
      beatAt = t + 60 / (52 + 80 * fear);
    }
  }

  // ---- one-shots ----
  const ring = (thing) => { // phone ring pattern; Line 2 is slightly wrong
    stopRing(); const f = thing ? [277, 294] : [440, 480];
    const p = () => { const t = now(); for (const k of [0, .55]) for (const ff of f) tn(ff, t + k, .02, .4, .07, thing ? 'triangle' : 'sine', out); };
    p(); ringT = setInterval(p, thing ? 3600 : 3000);
  };
  const stopRing = () => { clearInterval(ringT); ringT = 0; };
  const click = () => { if (!ctx) return; nz(now(), .05, .5, 'highpass', 2500); tn(150, now(), .001, .06, .2); };
  const pick = () => { if (!ctx) return; nz(now(), .09, .4, 'bandpass', 900, 1); tn(220, now(), .002, .08, .15); };
  const step = (D) => { if (!ctx) return; const v = .03 + (6 - D) * .03, t = now(); nz(t, .09, v, 'bandpass', 900, 1.2); nz(t + .24, .09, v * .9, 'bandpass', 800, 1.2); tn(70, t, .005, .12, v * 1.5); };
  const tap = (n = 3) => { if (!ctx) return; for (let i = 0; i < n; i++) { const t = now() + i * .4; nz(t, .05, .3, 'bandpass', 1800, 3); tn(520, t, .002, .09, .16); } };
  const knock = (n = 3, loud = 1, to) => { if (!ctx) return; to = to || rv; for (let i = 0; i < n; i++) { const t = now() + i * .5; tn(95, t, .002, .16, .8 * loud, 'sine', out, 45); nz(t, .1, .5 * loud, 'lowpass', 400, .7, out); nz(t, .1, .3 * loud, 'lowpass', 400, .7, to); } };
  const flood = () => { if (!ctx) return; const t = now(); nz(t, .03, .9, 'highpass', 3000); tn(110, t + .05, .01, .15, .4, 'square'); tn(90, t + .1, .3, .9, .12, 'sawtooth', out, 380); nz(t + .1, 1.2, .05, 'bandpass', 2000, 4); };
  const flicker = () => { if (!ctx) return; const t = now(); for (let i = 0; i < 5; i++) { nz(t + i * .07, .04, .3, 'bandpass', 2000, 2); tn(120, t + i * .07, .002, .04, .15, 'square'); } };
  const sting = () => { // jump scare: noise swell + dissonant cluster + sub drop
    if (!ctx) return; const t = now(); nz(t, .6, .9, 'bandpass', 800, .8, out, 3600); nz(t, .6, .5, 'bandpass', 800, .8, rv, 3600);
    for (const f of [466, 493, 740, 987]) { tn(f, t, .005, .9, .16, 'sawtooth', out, f * .5); tn(f, t, .005, .9, .1, 'sawtooth', rv, f * .5); }
    tn(60, t, .01, 1.2, .8, 'sine', out, 28);
  };
  const death = () => { // rising scream, then a hard cut to silence and an ear ring
    if (!ctx) return; const t = now();
    for (let i = 0; i < 8; i++) tn(200 + i * 37, t, .01, .55, .2, 'sawtooth', out, 2400 + i * 180);
    nz(t, .7, .9, 'bandpass', 2000, .6, out, 6000); tn(70, t, .01, .6, .9, 'sine', out, 25);
    out.gain.setValueAtTime(muted ? 0 : .85, t + .55); out.gain.setValueAtTime(0, t + .6); out.gain.linearRampToValueAtTime(muted ? 0 : .85, t + 3.4);
    tn(4200, t + .7, .05, 2.4, .03);
  };
  const dawn = () => {
    if (!ctx) return; const t = now();
    for (const f of [261.6, 392, 523.3, 659.3]) tn(f, t, 3, 11, .05, 'sine', out);
    for (let i = 0; i < 16; i++) setTimeout(() => { const t2 = now(); tn(rnd(3000, 4200), t2, .01, .09, .05, 'sine', out, rnd(4500, 5600)); if (Math.random() < .5) tn(rnd(3000, 4200), t2 + .13, .01, .08, .04, 'sine', out, rnd(4300, 5200)); }, 600 + i * rnd(450, 900));
  };
  const say = (text, pitch = 0.1, rate = 0.7) => { // low whispered text via the system voice, if there is one
    try { if (muted || !window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.pitch = pitch; u.rate = rate; speechSynthesis.speak(u); } catch {}
  };

  // ---- voices: babble through a phone filter; the length matches the plan so typed text can sync ----
  function plan(text) {
    const sy = []; let t = 0;
    for (const w of text.split(/\s+/)) {
      const n = Math.max(1, Math.round(w.replace(/[^a-z']/gi, '').length / 3));
      for (let i = 0; i < n; i++) { sy.push({ t, d: .11 }); t += .1; }
      t += /[.?!]$/.test(w) ? .34 : /,$/.test(w) ? .18 : .05;
    }
    return { sy, dur: Math.max(1.3, t + .15) };
  }
  function voice(f0, text, thing) {
    const p = plan(text); if (!ctx) return p;
    const t0 = now() + .03, o = ctx.createOscillator(), g = gain(0);
    o.type = 'sawtooth'; const f1 = filt('bandpass', 700, 7), f2 = filt('bandpass', 1200, 9), ns = noise(), nf = filt('bandpass', 3000, 2), ng = gain(.25, g);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); ns.connect(nf); nf.connect(ng);
    const ph = filt('highpass', 320), pl = filt('lowpass', 3300), sh = ctx.createWaveShaper(), cv = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(x * 2.2); } sh.curve = cv;
    const pre = gain(thing ? 1.6 : 2.2); g.connect(pre); pre.connect(ph); ph.connect(pl); pl.connect(sh); sh.connect(vBus);
    if (thing) { // a second, lower, delayed voice and a pitch wobble: it is almost right
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.detune.value = 37; const dl = ctx.createDelay(.5); dl.delayTime.value = .11;
      o2.connect(f1); o2.connect(f2); pl.connect(dl); dl.connect(gain(.5, vBus)); o2.start(t0); o2.stop(t0 + p.dur + .3);
      p.o2 = o2;
    }
    for (const s of p.sy) {
      const v = VOW[Math.random() * VOW.length | 0], t = t0 + s.t, fr = f0 * (1 + .1 * Math.sin(s.t * 2.3) + rnd(-.04, .04)) * (thing ? 1 - .03 * Math.sin(s.t * 9) : 1);
      o.frequency.setTargetAtTime(fr, t, .02); if (p.o2) p.o2.frequency.setTargetAtTime(fr * .5, t, .02);
      f1.frequency.setTargetAtTime(v[0], t, .015); f2.frequency.setTargetAtTime(v[1], t, .015);
      g.gain.setTargetAtTime(.55, t, .012); g.gain.setTargetAtTime(0, t + s.d * .8, .02);
    }
    o.start(t0); o.stop(t0 + p.dur + .3); ns.stop(t0 + p.dur + .3);
    return p;
  }
  const level = () => { if (!vAn) return 0; vAn.getByteTimeDomainData(vBuf); let s = 0; for (const b of vBuf) { const x = (b - 128) / 128; s += x * x; } return Math.sqrt(s / vBuf.length); };
  const mute = (m) => { muted = m; if (out) out.gain.setTargetAtTime(m ? 0 : .85, ctx.currentTime, .05); if (m) try { speechSynthesis.cancel(); } catch {} };
  const suspend = (s) => { if (ctx) s ? ctx.suspend() : ctx.resume(); };
  return { init, mix, ring, stopRing, click, pick, step, tap, knock, flood, flicker, sting, death, dawn, say, plan, voice, level, mute, suspend, get muted() { return muted; } };
})();

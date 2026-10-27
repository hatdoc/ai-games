// Procedural audio for Toys After Dark: layered music states, directional footsteps, SFX, ambience.
// Music, SFX and ambience each have their own volume. Everything is synthesised, no sample files.
(() => {
  let ctx, master, busM, busS, busA, pan, state = 'safe', step = 0, nextT = 0, started = false, ambNode;
  const vol = { master: 1, music: 0.6, sfx: 0.8, amb: 0.5 };
  const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // each music state: bpm, bass pattern (midi, 0 = rest), melody pattern, wave, gain, perc flags
  const MUSIC = {
    safe:      { bpm: 104, bass: [48, 0, 55, 0, 52, 0, 55, 0], mel: [72, 0, 76, 0, 79, 76, 0, 74], wave: 'triangle', g: 0.5, kick: 0, tick: 0 },
    suspicion: { bpm: 118, bass: [43, 0, 0, 43, 0, 0, 44, 0], mel: [0, 0, 0, 0, 0, 0, 0, 0], wave: 'sine', g: 0.4, kick: 0, tick: 1 },
    approach:  { bpm: 132, bass: [38, 38, 0, 38, 38, 0, 39, 0], mel: [62, 0, 0, 0, 63, 0, 0, 0], wave: 'sawtooth', g: 0.38, kick: 1, tick: 1 },
    entry:     { bpm: 60, bass: [0, 0, 0, 0, 0, 0, 0, 0], mel: [0, 0, 0, 0, 0, 0, 0, 0], wave: 'sine', g: 0.1, kick: 0, tick: 0 },
    inspect:   { bpm: 76, bass: [36, 0, 0, 0, 0, 0, 37, 0], mel: [0, 0, 0, 60, 0, 0, 0, 0], wave: 'sine', g: 0.34, kick: 0, tick: 1 },
    critical:  { bpm: 156, bass: [36, 36, 36, 36, 37, 37, 36, 36], mel: [60, 0, 61, 0, 60, 0, 63, 0], wave: 'sawtooth', g: 0.5, kick: 2, tick: 1 },
    escape:    { bpm: 112, bass: [48, 0, 52, 0, 55, 0, 60, 0], mel: [76, 79, 83, 0, 79, 83, 88, 0], wave: 'triangle', g: 0.5, kick: 0, tick: 0 },
    victory:   { bpm: 128, bass: [48, 48, 55, 55, 53, 53, 55, 55], mel: [72, 76, 79, 84, 83, 79, 76, 79], wave: 'square', g: 0.3, kick: 1, tick: 0 },
  };
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.connect(ctx.destination);
    busM = ctx.createGain(); busS = ctx.createGain(); busA = ctx.createGain();
    busM.connect(master); busS.connect(master); busA.connect(master);
    setVol();
    // ambience: soft filtered noise "room tone" + occasional clock tick via sched()
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    ambNode = ctx.createBufferSource(); ambNode.buffer = buf; ambNode.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    const g = ctx.createGain(); g.gain.value = 0.18; ambNode.connect(f); f.connect(g); g.connect(busA); ambNode.start();
    nextT = ctx.currentTime + 0.1; started = true;
    setInterval(sched, 60);
  }
  function setVol() {
    if (!ctx) return;
    master.gain.value = vol.master; busM.gain.value = vol.music * 0.5; busS.gain.value = vol.sfx; busA.gain.value = vol.amb;
  }
  function tone(f, t, dur, type, g, bus, slide) {
    const o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.01); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(a); a.connect(bus || busS); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, g, freq, bus, pn) {
    const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const a = ctx.createGain(); a.gain.value = g; s.connect(f); f.connect(a);
    let out = a;
    if (pn !== undefined && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pn)); a.connect(p); out = p; }
    out.connect(bus || busS); s.start(t);
  }
  function sched() {
    if (!ctx || ctx.state !== 'running') return;
    const m = MUSIC[state] || MUSIC.safe, sp = 60 / m.bpm / 2;
    while (nextT < ctx.currentTime + 0.25) {
      const i = step % 8, b = m.bass[i], me = m.mel[i];
      if (b) tone(N(b), nextT, sp * 1.6, m.wave === 'square' ? 'triangle' : 'sine', m.g * 0.9, busM);
      if (me) tone(N(me), nextT, sp * 1.2, m.wave, m.g * 0.45, busM);
      if (m.kick && i % (m.kick === 2 ? 1 : 2) === 0) tone(110, nextT, 0.12, 'sine', 0.55, busM, 40); // heartbeat-ish thump
      if (m.tick && i % 2 === 1) noise(nextT, 0.03, 0.12, 6000, busM);
      nextT += sp; step++;
    }
  }
  const A = {
    vol, init, setVol,
    music(s) { if (MUSIC[s]) state = s; },
    get state() { return state; },
    resume() { init(); if (ctx.state === 'suspended') ctx.resume(); },
    // directional footsteps: pan -1..1, loudness 0..1 (louder as the human gets closer)
    step(p, l, heavy) { if (!started) return; const t = ctx.currentTime; noise(t, 0.12, 0.25 * l + 0.03, heavy ? 260 : 700, busS, p); tone(heavy ? 70 : 140, t, 0.1, 'sine', 0.25 * l, busS, 40); },
    creak(p) { if (!started) return; const t = ctx.currentTime; tone(180, t, 0.5, 'sawtooth', 0.05, busS, 260 + Math.random() * 80); },
    handle() { if (!started) return; const t = ctx.currentTime; for (let i = 0; i < 3; i++) tone(900 + i * 80, t + i * 0.09, 0.05, 'square', 0.07, busS); },
    doorOpen() { if (!started) return; const t = ctx.currentTime; tone(110, t, 0.8, 'sawtooth', 0.09, busS, 190); noise(t, 0.6, 0.1, 500, busS); },
    pickup() { if (!started) return; const t = ctx.currentTime; tone(660, t, 0.1, 'triangle', 0.2); tone(990, t + 0.07, 0.12, 'triangle', 0.2); },
    drop() { if (!started) return; tone(300, ctx.currentTime, 0.12, 'triangle', 0.2, busS, 180); },
    freeze() { if (!started) return; tone(520, ctx.currentTime, 0.07, 'square', 0.1, busS, 260); },
    alert() { if (!started) return; const t = ctx.currentTime; tone(880, t, 0.14, 'square', 0.12); tone(660, t + 0.16, 0.2, 'square', 0.12); },
    thud(g) { if (!started) return; const t = ctx.currentTime; tone(90, t, 0.25, 'sine', 0.5 * (g || 1), busS, 35); noise(t, 0.2, 0.3 * (g || 1), 900, busS); },
    honk() { if (!started) return; const t = ctx.currentTime; tone(330, t, 0.25, 'sawtooth', 0.2, busS, 300); tone(250, t + 0.05, 0.25, 'sawtooth', 0.2, busS, 230); },
    beep() { if (!started) return; tone(1400, ctx.currentTime, 0.06, 'square', 0.08, busS); },
    meow() { if (!started) return; const t = ctx.currentTime; tone(600, t, 0.45, 'sawtooth', 0.07, busS, 900); },
    vacuum() { if (!started) return; noise(ctx.currentTime, 0.5, 0.08, 800, busS); },
    sting() { if (!started) return; const t = ctx.currentTime; [392, 370, 349, 262].forEach((f, i) => tone(f, t + i * 0.13, 0.22, 'sawtooth', 0.16)); tone(110, t + 0.55, 0.5, 'square', 0.2, busS, 80); },
    complete() { if (!started) return; const t = ctx.currentTime; [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.09, 0.3, 'triangle', 0.2)); },
    click() { if (!started) return; tone(500, ctx.currentTime, 0.05, 'triangle', 0.15); },
    tick() { if (!started) return; noise(ctx.currentTime, 0.02, 0.15, 5000, busS); },
  };
  window.TADAudio = A;
})();

// Procedural sound: room tone, footsteps, creaks, hinges, beeps. Loudness follows the dB of the event.
const Snd = (() => {
  let ac, out, muted = false;
  const init = () => {
    if (ac) return ac;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = .9; out.connect(ac.destination);
      const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); let l = 0;
      for (let i = 0; i < d.length; i++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; }
      const s = ac.createBufferSource(); s.buffer = b; s.loop = true; const g = ac.createGain(); g.gain.value = .12; s.connect(g).connect(out); s.start();
    } catch {}
    return ac;
  };
  const vol = (db) => Math.min(.9, Math.max(.004, ((db - 16) / 70) ** 2));
  const burst = (dur, f, q, g, type = 'bandpass') => {
    if (!init() || muted) return; const n = ac.sampleRate * dur, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const s = ac.createBufferSource(); s.buffer = b; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const gn = ac.createGain(); gn.gain.value = g; s.connect(fl).connect(gn).connect(out); s.start();
  };
  const tone = (f0, f1, dur, type, g) => {
    if (!init() || muted) return; const o = ac.createOscillator(), gn = ac.createGain(), t = ac.currentTime;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(.0005, t + dur); o.connect(gn).connect(out); o.start(); o.stop(t + dur);
  };
  return {
    init, toggle() { muted = !muted; return muted; },
    step(db, surf) { burst(.09 + vol(db) * .1, surf === 'tile' ? 1800 : surf === 'carpet' ? 260 : 520, 1.1, vol(db) * .7); },
    creak(db) { tone(110, 70, .35, 'sawtooth', vol(db) * .16); burst(.25, 700, 4, vol(db) * .2); },
    hinge(db) { tone(700, 1100, .22, 'triangle', vol(db) * .14); },
    click(db) { burst(.05, 2500, 2, vol(db) * .5); },
    thump(db) { tone(90, 50, .12, 'sine', vol(db) * .5); },
    beep() { tone(1000, 1000, .35, 'sine', .25); setTimeout(() => tone(1000, 1000, .35, 'sine', .25), 450); },
    chime() { tone(1320, 1320, .4, 'sine', .15); },
    ping() { tone(880, 1320, .25, 'sine', .2); },
    bell() { tone(660, 660, .6, 'sine', .3); setTimeout(() => tone(520, 520, .8, 'sine', .3), 500); },
    bump(db) { burst(.2, 300, .8, vol(db) * .8); tone(120, 60, .15, 'sine', vol(db) * .4); },
    rustle(db) { burst(.3, 3000, .6, vol(db) * .5, 'highpass'); },
    buzz(db) { tone(160, 150, .5, 'square', vol(db) * .08); },
  };
})();

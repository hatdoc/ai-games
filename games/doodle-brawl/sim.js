// Doodle Brawl: the fight. 60 steps a second; the host runs it online, everyone draws the result.
// Weapons swing with real momentum: the drawing's ink is its mass, so a heavy head swings slowly but hits hard.
(() => {
  const W = 1200, WALL = 40, R = 28, GRAV = 0.8, ROUND = 45 * 60, WINS = 2;
  const REST = 0.5, UP = 1.95, DOWN = -1.25, BLOCK = 1.45; // weapon angles (radians, 0 = forward, + = up)

  // ---------- fighters ----------
  function fighter(w, x, face, opt = {}) {
    const k = opt.wscale || 1;
    const pts = [];
    for (const st of w.segs) for (let i = 0; i < st.length; i += 2) pts.push([st[i][0] * k, st[i][1] * k]);
    const body = opt.body || 1;
    return {
      w, pts, x, y: 0, vx: 0, vy: 0, face, hp: opt.hp || 100, max: opt.hp || 100, phi: REST, om: 0, phase: 'idle', pt: 0, swings: 0, dir: -1, queued: false,
      block: false, blockT: 0, dodge: 0, dodgeCd: 0, stun: 0, tumble: 0, spin: 0, meter: opt.meter || 0, hit: false, wins: 0, sp: null, gone: false,
      mass: w.mass * k, inertia: w.inertia * k * k * k * (w.type === 'curved' ? 0.7 : 1) /* curved blades are well balanced */, reach: w.reach * k, r: R * body, boss: opt.boss || null, prev: {}, air: false, lastHitBy: 0, stats: w.stats,
    };
  }
  // world position of a weapon point (local x along the blade, y across)
  function wpos(f, [lx, ly], phi = f.phi) {
    const c = Math.cos(phi), s = Math.sin(phi);
    return [f.x + f.face * (f.r * 0.7) + f.face * (lx * c - ly * s), f.y + f.r + 4 + lx * s + ly * c];
  }

  function create(o) {
    const s = {
      W, round: 1, phase: 'intro', pt: 0, timer: ROUND, frame: 0, freeze: 0, slow: 0, slowAcc: 0, events: [], shots: [], waves: [], winner: null, rnd: 12345,
      chaos: o.chaos || [], survival: !!o.survival, bossId: o.boss || null,
      grav: GRAV * ((o.chaos || []).includes('lowgrav') ? 0.42 : 1), rounds: o.rounds ?? WINS,
    };
    s.mk = (i) => {
      const w = i ? o.w2 : o.w1, ch = s.chaos, base = { wscale: ch.includes('giant') ? 1.7 : 1, body: ch.includes('tiny') ? 0.65 : 1, hp: ch.includes('onehit') ? 35 : 100, meter: ch.includes('infinite') ? 100 : 0 };
      const b = i && o.boss ? BOSSES[o.boss] : null;
      return fighter(w, i ? 840 : 360, i ? -1 : 1, b ? { ...base, hp: b.hp, body: b.body, wscale: b.wscale, boss: o.boss } : i && o.hp2 ? { ...base, hp: o.hp2 } : i === 0 && o.hp1 ? { ...base, hp: o.hp1 } : base);
    };
    s.p = [s.mk(0), s.mk(1)];
    resetProps(s);
    s.events.push({ e: 'round', n: 1 });
    return s;
  }
  function resetProps(s) {
    s.crates = [360, 840].map((x) => ({ x, y: 330, vy: 0, hang: true, broken: false, w: 60 }));
    s.barrel = { x: 600, y: 0, fuse: -1, gone: false };
    s.shots = []; s.waves = [];
  }
  const rnd = (s) => ((s.rnd = (s.rnd * 1664525 + 1013904223) >>> 0) / 4294967296);
  const presses = (f, inp) => { const o = {}; for (const k of ['a', 'u', 'd', 's']) o[k] = inp[k] && !f.prev[k]; f.prev = { ...inp }; return o; };
  const free = (f) => !f.stun && !f.tumble && !f.dodge && !f.sp && !f.gone;

  // ---------- bosses: each one needs a different kind of weapon ----------
  const BOSSES = {
    golem: { name: 'Shield Golem', hp: 220, body: 1.7, wscale: 1.2, weapon: 'hammer', hint: 'Its shield stops hits from the front. Use a SHARP point, jump on it, or get behind it.', speed: 0.55 },
    ninja: { name: 'Ninja Fox', hp: 130, body: 0.9, wscale: 1, weapon: 'dagger', hint: 'It dodges slow swings. Draw something LIGHT and fast.', speed: 1.5 },
    giant: { name: 'Iron Giant', hp: 200, body: 2, wscale: 1.5, weapon: 'club', hint: 'Its armour shrugs off weak hits. Draw something HEAVY.', speed: 0.5 },
  };

  // ---------- one step ----------
  function step(s, in1, in2) {
    s.events.length = 0;
    const ins = [in1 || {}, in2 || {}];
    if (s.freeze > 0) { s.freeze--; for (let i = 0; i < 2; i++) { const f = s.p[i], pr = presses(f, ins[i]); if (pr.a && f.phase !== 'idle') f.queued = true; } return; }
    if (s.slow > 0) { s.slow--; if (++s.slowAcc % 3) return; } // slow motion after huge hits
    s.frame++; s.pt++;
    if (s.phase === 'intro' && s.pt > 90) { s.phase = 'fight'; s.pt = 0; s.events.push({ e: 'fight' }); }
    if (s.phase === 'fight' && --s.timer <= 0) endRound(s, s.p[0].hp / s.p[0].max === s.p[1].hp / s.p[1].max ? -1 : s.p[0].hp / s.p[0].max > s.p[1].hp / s.p[1].max ? 0 : 1, 'time');
    for (let i = 0; i < 2; i++) control(s, s.p[i], s.p[1 - i], ins[i], i);
    for (let i = 0; i < 2; i++) body(s, s.p[i], s.p[1 - i], i);
    for (let i = 0; i < 2; i++) weapon(s, s.p[i]);
    for (let i = 0; i < 2; i++) strikes(s, s.p[i], s.p[1 - i], i, ins[1 - i]);
    props(s);
    if (s.phase === 'ko' && s.pt > 160) nextRound(s);
  }

  function control(s, f, o, inp, me) {
    const pr = presses(f, inp);
    if (pr.a && f.phase !== 'idle') f.queued = true;
    if (s.phase !== 'fight' || f.gone) { f.block = false; if (f.y === 0 && !f.tumble) f.vx *= 0.7; return; }
    if (f.dodgeCd > 0) f.dodgeCd--;
    if (f.stun > 0) { f.stun--; f.block = false; return; }
    if (f.tumble || (f.sp && f.sp.k !== 'boomer')) return;
    const unarmed = f.sp && f.sp.k === 'boomer'; // weapon is out flying: you can move and dodge, not swing or block
    const boss = f.boss ? BOSSES[f.boss] : null;
    const spd = (4.4 / (1 + f.mass * 0.07)) * (boss ? boss.speed : 1) * (s.chaos.includes('speed') ? 1.5 : 1);
    if (f.dodge > 0) return;
    // face the opponent unless mid-swing
    if (f.phase === 'idle' && !f.block) f.face = o.x >= f.x ? 1 : -1;
    // block (hold) — slower walking, weapon raised in front
    const wasBlock = f.block;
    f.block = !!inp.b && f.phase === 'idle' && !f.air && !unarmed;
    f.blockT = f.block ? (wasBlock ? f.blockT + 1 : 0) : 99;
    const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (f.y === 0) f.vx = dir * spd * (f.block ? 0.4 : f.phase === 'idle' ? 1 : 0.55);
    else f.vx += dir * 0.25;
    if (pr.u && f.y === 0 && !f.block) { f.vy = 13.5 * (s.chaos.includes('lowgrav') ? 0.75 : 1); s.events.push({ e: 'jump', who: me }); }
    if (pr.d && f.dodgeCd <= 0) { f.dodge = 14; f.dodgeCd = 48; f.dodgeDir = dir || -f.face; f.phase = 'idle'; f.block = false; s.events.push({ e: 'dodge', who: me }); return; }
    if (unarmed) return;
    if (pr.s && f.meter >= 100) { f.meter = s.chaos.includes('infinite') ? 100 : 0; startSpecial(s, f, o, me); return; }
    if ((pr.a || f.queued) && !f.block && (f.phase === 'idle' || (f.phase === 'recover' && f.pt > 3))) startSwing(s, f, me);
  }
  function startSwing(s, f, me) {
    f.queued = false; f.hit = false; f.pt = 0;
    const combo = f.phase === 'recover';
    f.swings = combo ? f.swings + 1 : 0;
    if (!combo) { f.phase = 'windup'; f.dir = -1; }
    else { f.phase = 'strike'; f.dir = -f.dir; } // combo: swing back the other way
    s.events.push({ e: 'swing', who: me, mass: f.mass });
  }
  function startSpecial(s, f, o, me) {
    let type = f.w.type;
    if (type === 'experimental') type = ['sword', 'spear', 'hammer', 'dagger', 'shield', 'curved', 'star', 'spiral'][Math.floor(rnd(s) * 8)];
    const name = { sword: 'Spin Slash', spear: 'Lunge', hammer: 'Ground Slam', club: 'Ground Slam', dagger: 'Flurry', shield: 'Shield Bash', curved: 'Boomerang', star: 'Star Throw', spiral: 'Hypnotize', pebble: 'Pebble Toss' }[type];
    s.events.push({ e: 'special', who: me, name });
    f.phase = 'idle'; f.block = false; f.hit = false;
    if (type === 'sword') f.sp = { k: 'spin', t: 44 };
    else if (type === 'spear') f.sp = { k: 'lunge', t: 20 };
    else if (type === 'hammer' || type === 'club') { f.sp = { k: 'slam', t: 999 }; f.vy = 15; f.vx = f.face * 3; }
    else if (type === 'dagger') { f.sp = { k: 'flurry', t: 50 }; }
    else if (type === 'shield') f.sp = { k: 'bash', t: 18 };
    else if (type === 'curved') { f.sp = { k: 'boomer', t: 70 }; s.shots.push({ k: 'boomer', owner: me, x: f.x, y: f.y + 50, t: 0, hits: 0, last: -99, sx: f.x, face: f.face }); }
    else if (type === 'star') s.shots.push({ k: 'star', owner: me, x: f.x + f.face * 40, y: f.y + 50, vx: f.face * 14, vy: 0, life: 90 });
    else if (type === 'spiral') { if (Math.abs(o.x - f.x) < 330 && !o.dodge) { o.stun = 80; o.dizzy = 80; s.events.push({ e: 'hypno', who: 1 - me, x: o.x, y: o.y + o.r * 2 }); } }
    else if (type === 'pebble') for (let i = 0; i < 3; i++) s.shots.push({ k: 'pebble', owner: me, x: f.x, y: f.y + 50, vx: f.face * (8 + i * 2), vy: 7 + i, life: 120 });
  }

  function body(s, f, o, me) {
    if (f.gone) return;
    const sp = f.sp;
    if (sp) {
      sp.t--;
      if (sp.k === 'lunge') { f.vx = f.face * 13; f.phi = 0; f.om = 0; f.hit = sp.t % 7 ? f.hit : false; }
      if (sp.k === 'bash') { f.vx = f.face * 12; f.phi = 1.2; f.om = 0; }
      if (sp.k === 'spin') { f.om = 0.5 * f.face * -1; f.vx = f.face * 2; if (sp.t % 12 === 0) f.hit = false; }
      if (sp.k === 'flurry') { if (sp.t % 10 === 0) { f.phase = 'strike'; f.dir = -f.dir || -1; f.hit = false; f.pt = 0; } }
      if (sp.k === 'boomer') { f.phase = 'idle'; }
      if (sp.t <= 0 && sp.k !== 'slam') { f.sp = null; if (sp.k === 'spin') f.phi = REST; }
    }
    if (f.dodge > 0) { f.dodge--; f.vx = f.dodgeDir * 10; }
    // gravity / ground
    if (f.y > 0 || f.vy > 0) {
      f.y += f.vy; f.vy -= s.grav; f.air = true;
      const top = standOn(s, f);
      if (f.y <= top && f.vy <= 0) {
        f.y = top; f.vy = 0; f.air = false;
        if (f.tumble) { f.tumble = 0; f.stun = Math.max(f.stun, 18); s.events.push({ e: 'land', x: f.x, heavy: true }); }
        if (sp && sp.k === 'slam') { f.sp = null; s.waves.push({ owner: me, x: f.x, dir: 1, life: 40, power: 10 + f.mass * 4 }, { owner: me, x: f.x, dir: -1, life: 40, power: 10 + f.mass * 4 }); s.events.push({ e: 'slam', x: f.x, power: f.mass }); }
      }
    } else { const top = standOn(s, f); if (top < f.y) { f.vy = -0.1; f.y -= 0.01; } else f.air = false; }
    if (f.tumble) f.spin += f.tumble;
    if (f.stun && f.y === 0 && !f.tumble) f.vx *= 0.8;
    f.x += f.vx;
    // walls (and wall splats)
    for (const [edge, side] of [[WALL + f.r, -1], [W - WALL - f.r, 1]]) {
      if ((side < 0 && f.x < edge) || (side > 0 && f.x > edge)) {
        f.x = edge;
        if (Math.abs(f.vx) > 8 && (f.tumble || f.stun)) { const d = Math.round(5 + Math.abs(f.vx) * 0.55); damage(s, f, d, f.lastHitBy, 'splat'); s.events.push({ e: 'splat', who: me, x: f.x, y: f.y + f.r, dmg: d }); f.vx = -f.vx * (s.chaos.includes('bouncy') ? 1.1 : 0.35); }
        else f.vx = 0;
      }
    }
    // crates on the floor are solid
    for (const c of s.crates) if (!c.hang && !c.broken && c.y < 1 && f.y < c.w - 4 && Math.abs(f.x - c.x) < c.w / 2 + f.r) f.x = c.x + Math.sign(f.x - c.x || 1) * (c.w / 2 + f.r);
    // fighters don't overlap
    if (!o.gone && Math.abs(o.x - f.x) < f.r + o.r - 8 && Math.abs(o.y - f.y) < 60 && !f.dodge && !o.dodge) { const push = ((f.r + o.r - 8) - Math.abs(o.x - f.x)) / 2 * Math.sign(f.x - o.x || (me ? 1 : -1)); f.x += push; }
  }
  const standOn = (s, f) => { let top = 0; for (const c of s.crates) if (!c.hang && !c.broken && c.y < 1 && Math.abs(f.x - c.x) < c.w / 2 + 6 && f.y >= c.w - 10) top = Math.max(top, c.w); return top; };

  // weapon angle: torque-limited servo, so the weapon's inertia sets how fast it swings
  function weapon(s, f) {
    if (f.gone) return;
    f.pt++;
    let target = REST, gain = 1;
    if (f.sp && f.sp.k === 'spin') { f.phi += f.om; return; }
    if (f.sp && (f.sp.k === 'lunge' || f.sp.k === 'bash')) return;
    if (f.sp && f.sp.k === 'boomer') { f.phi = REST; f.om = 0; return; }
    if (f.block) target = BLOCK;
    else if (f.phase === 'windup') { target = UP; gain = 0.7; if (f.phi > UP - 0.25 || f.pt > 26) { f.phase = 'strike'; f.pt = 0; f.hit = false; } }
    else if (f.phase === 'strike') { target = f.dir < 0 ? DOWN : UP + 0.3; gain = 1.6; if ((f.dir < 0 ? f.phi < DOWN + 0.3 : f.phi > UP) || f.pt > 42) { f.phase = 'recover'; f.pt = 0; } }
    else if (f.phase === 'recover') { gain = 1.1; if (f.pt > 5 + f.inertia * 5 && Math.abs(f.phi - REST) < 0.3) { f.phase = 'idle'; f.swings = 0; } } // light weapons recover faster
    if (f.stun || f.tumble) { target = f.phi - 0.4; gain = 0.2; }
    const arm = 0.05 * (0.55 + f.mass * 0.3); // you swing a heavier thing harder (but it still accelerates slower)
    const torque = Math.max(-arm, Math.min(arm, (target - f.phi) * 0.03 * gain * (0.55 + f.mass * 0.3))) * gain;
    const damp = f.phase === 'strike' || f.phase === 'windup' ? 0.04 : 0.2; // free swing while striking, settle quickly after
    f.om += torque / f.inertia - f.om * damp;
    if (f.w.unstable) f.om += (rnd(s) - 0.5) * 0.05; // experimental weapons wobble
    f.om = Math.max(-0.75, Math.min(0.75, f.om)) * 0.97;
    f.phi += f.om;
  }

  // does f's weapon hit o?
  function strikes(s, f, o, me, oin) {
    if (f.gone || o.gone || s.phase !== 'fight' || f.hit) return;
    const swinging = f.phase === 'strike' || (f.sp && ['spin', 'lunge', 'bash'].includes(f.sp.k));
    if (!swinging) return;
    // also knock down hanging crates / light the barrel
    for (let i = 0; i < f.pts.length; i += 3) {
      const [px, py] = wpos(f, f.pts[i]);
      for (const c of s.crates) if (c.hang && Math.abs(px - c.x) < c.w / 2 && py > c.y && py < c.y + c.w) { c.hang = false; s.events.push({ e: 'crate', x: c.x, y: c.y }); }
      if (!s.barrel.gone && s.barrel.fuse < 0 && Math.abs(px - s.barrel.x) < 26 && py < 64) { s.barrel.fuse = 45; s.events.push({ e: 'fuse', x: s.barrel.x }); }
    }
    const cx = o.x, cy = o.y + o.r;
    let best = null;
    // check the angles swept since last frame too, so a fast swing can't pass straight through a body
    const subs = Math.min(8, Math.ceil(Math.abs(f.om) * f.reach / 18) + 1);
    for (let k = 1; k <= subs && !best; k++) {
      const phi = f.phi - f.om * (1 - k / subs);
      for (const p of f.pts) {
        const [px, py] = wpos(f, p, phi);
        if ((px - cx) ** 2 + (py - cy) ** 2 < (o.r + 3) ** 2) {
          const rr = Math.hypot(p[0], p[1]), v = Math.abs(f.om) * rr + (f.sp && f.sp.k !== 'spin' ? 10 : 0);
          if (!best || v > best.v) best = { v, px, py, tip: p[0] > f.reach * 0.85 };
        }
      }
    }
    if (!best || best.v < 4) return;
    f.hit = true;
    if (o.dodge > 1 && o.dodge < 12) { s.events.push({ e: 'miss', who: 1 - me, x: o.x, y: o.y + o.r * 2 }); return; } // dodged through it
    const boss = o.boss;
    // impact: mass at speed (the head-heavy, fast-moving point hits hardest), sharp tips pierce
    const sp = Math.max(0.45, Math.min(1.35, best.v / 35));
    let dmg = 4 + 4.6 * Math.pow(f.mass, 1.15) * (0.5 + f.w.comRatio * 0.75) * Math.pow(sp, 0.4);
    if (best.tip && f.w.sharp > 0.5) dmg += 3 * f.w.sharp; // sharp points bite
    if (f.swings >= 2) dmg *= 1.25; // third swing in a combo
    if (f.w.type === 'curved') dmg *= 1.25; // curved blades slash
    if (f.sp) dmg *= f.sp.k === 'lunge' ? 1.5 : f.sp.k === 'flurry' ? 1.2 : f.sp.k === 'bash' ? 0.8 : 1;
    if (s.chaos.includes('onehit')) dmg *= 2.5;
    dmg = Math.round(dmg);
    const impact = f.mass * Math.max(12, best.v);
    // boss rules
    if (boss === 'ninja' && !o.stun && !o.tumble && o.dodgeCd <= 0 && f.stats.speed < 7 && !f.sp) { o.dodge = 14; o.dodgeCd = 50; o.dodgeDir = Math.sign(o.x - f.x) || 1; s.events.push({ e: 'miss', who: 1 - me, x: o.x, y: o.y + o.r * 2, text: 'TOO SLOW!' }); return; }
    if (boss === 'giant' && dmg < 14 && !f.sp) { s.events.push({ e: 'clank', who: 1 - me, x: best.px, y: best.py }); bounce(f); s.freeze = 4; return; }
    if (boss === 'golem') {
      const front = Math.sign(f.x - o.x) === o.face, above = f.y > o.r * 1.2;
      if (front && !above && !(best.tip && f.stats.pierce >= 6) && !(f.sp && f.sp.k === 'lunge')) { s.events.push({ e: 'clank', who: 1 - me, x: best.px, y: best.py, text: 'BLOCKED!' }); bounce(f); f.vx = -f.face * 6; s.freeze = 5; return; }
    }
    // blocking: only from the front; wide weapons block more, big hits break guard; a just-in-time block parries
    const fromFront = Math.sign(f.x - o.x) === o.face;
    if (o.block && fromFront) {
      if (o.blockT <= 7) { // parry!
        f.stun = 50; bounce(f); o.meter = Math.min(100, o.meter + 25); s.freeze = 10; s.slow = 24;
        s.events.push({ e: 'parry', who: 1 - me, x: best.px, y: best.py }); return;
      }
      const guard = 18 + o.stats.guard * 9 + o.mass * 4;
      const power = Math.pow(f.mass, 1.3) * Math.sqrt(sp), hold = 0.8 + o.stats.guard * 0.22 + o.mass * 0.3; // heavy beats light guards, a shield holds
      if (power > hold) { o.block = false; o.stun = 40; dmg = Math.round(dmg * 0.5); s.events.push({ e: 'guardbreak', who: 1 - me, x: best.px, y: best.py }); }
      else {
        const chip = Math.max(0, Math.round(dmg * (0.3 - o.stats.guard * 0.03)));
        if (chip) damage(s, o, chip, me);
        o.vx = f.face * Math.min(14, impact / guard * 4); bounce(f); s.freeze = 5;
        o.meter = Math.min(100, o.meter + 4);
        s.events.push({ e: 'block', who: 1 - me, x: best.px, y: best.py, heavy: impact > guard * 1.5 });
        return;
      }
    }
    // hit!
    if (f.w.type === 'star' && !f.sp && !f.starTwice) { f.starTwice = true; f.hit = false; } else f.starTwice = false; // spikes can catch twice per swing
    if (boss === 'giant') dmg = Math.round(dmg * 0.9);
    damage(s, o, dmg, me);
    f.meter = Math.min(100, f.meter + dmg * 1.6 * ({ curved: 2.2, star: 1.6, spiral: 1.5, pebble: 2 }[f.w.type] || 1));
    // super armour: a heavy weapon mid-swing shrugs off small pokes
    if (o.mass >= 2 && dmg < 10 && (o.phase === 'windup' || o.phase === 'strike') && !f.sp && o.hp > 0) { s.freeze = 3; s.events.push({ e: 'hit', who: 1 - me, by: me, x: best.px, y: best.py, dmg, heavy: false, mass: f.mass, kb: 0, combo: f.swings, armor: true }); return; }
    const kb = Math.min(26, 2 + Math.pow(f.mass, 1.35) * Math.pow(sp, 0.7) * 3.4 * (0.55 + f.w.comRatio)) * (boss ? 0.4 : 1); // heavy heads send people flying
    o.vx = f.face * kb; o.vy = Math.min(14, kb * 0.55 + 2); o.y = Math.max(o.y, 0.1);
    o.phase = 'idle'; o.block = false; o.sp = null;
    if (kb > 9 && !boss) { o.tumble = 0.25 * f.face; o.stun = 10; } else o.stun = Math.round(8 + dmg * 0.6);
    if (f.sp && f.sp.k === 'bash') o.stun = 55;
    o.lastHitBy = me;
    const heavy = dmg >= 16;
    s.freeze = Math.min(14, 3 + Math.round(dmg * 0.3));
    if (dmg >= 26 || o.hp <= 0) s.slow = 36;
    if (s.chaos.includes('explode')) boom(s, best.px, best.py, 120, 9, me);
    s.events.push({ e: 'hit', who: 1 - me, by: me, x: best.px, y: best.py, dmg, heavy, mass: f.mass, kb, combo: f.swings, v: best.v });
  }
  const bounce = (f) => { f.om = -f.om * 0.4; f.phase = 'recover'; f.pt = 0; };
  function damage(s, o, d, by) {
    if (s.phase !== 'fight') return;
    o.hp = Math.max(0, o.hp - d); o.meter = Math.min(100, o.meter + d);
    if (o.hp <= 0) { const w = by >= 0 ? by : 1 - s.p.indexOf(o); o.tumble = o.tumble || 0.3 * (o.x > s.p[w].x ? 1 : -1); o.vy = Math.max(o.vy, 9); endRound(s, w, 'ko'); }
  }
  function boom(s, x, y, rad, power, by) {
    s.events.push({ e: 'boom', x, y, rad });
    s.freeze = Math.max(s.freeze, 6);
    s.p.forEach((f, i) => {
      if (f.gone) return;
      const dx = f.x - x, dy = f.y + f.r - y, d = Math.hypot(dx, dy);
      if (d < rad) { const k = 1 - d / rad; f.vx = Math.sign(dx || 1) * power * (0.6 + k); f.vy = power * (0.5 + k) * 0.8; f.y = Math.max(f.y, 0.1); f.tumble = 0.2 * Math.sign(dx || 1); f.stun = 12; f.lastHitBy = by; damage(s, f, Math.round(power * k * 1.6), by); }
    });
  }

  function props(s) {
    // crates: fall, squash whoever is under them, then sit on the floor
    for (const c of s.crates) {
      if (c.hang || c.broken || c.y <= 0) continue;
      c.vy -= s.grav; c.y = Math.max(0, c.y + c.vy);
      s.p.forEach((f, i) => { if (!f.gone && c.vy < -3 && Math.abs(f.x - c.x) < c.w / 2 + f.r * 0.7 && c.y < f.y + f.r * 2 && c.y > f.y) { damage(s, f, 15, 1 - i); f.stun = 45; f.vy = 0; c.vy = 4; s.freeze = 8; s.events.push({ e: 'squash', who: i, x: f.x, y: f.y + f.r * 2 }); } });
      if (c.y === 0) { c.vy = 0; s.events.push({ e: 'thud', x: c.x }); }
    }
    // barrel fuse
    const b = s.barrel;
    if (!b.gone && b.fuse > 0 && --b.fuse === 0) { b.gone = true; boom(s, b.x, 30, 190, 15, -1); }
    // projectiles
    for (const p of s.shots) {
      const owner = s.p[p.owner], o = s.p[1 - p.owner];
      if (p.k === 'boomer') { // out and back along an arc
        p.t++; const k = p.t / 70, out = Math.sin(k * Math.PI);
        p.x = p.sx + p.face * out * 430; p.y = owner.y + 50 + Math.sin(k * Math.PI * 2) * 60;
        if (p.t >= 70) { p.done = true; owner.sp = null; }
      } else { p.x += p.vx; p.y += p.vy; if (p.k === 'pebble') p.vy -= 0.5; if (--p.life <= 0 || p.y < 0) p.done = true; }
      if (o.gone || s.phase !== 'fight') continue;
      if (Math.hypot(o.x - p.x, o.y + o.r - p.y) < o.r + (p.k === 'pebble' ? 6 : 30) && s.frame - (p.last ?? -99) > 25) {
        p.last = s.frame;
        if (o.dodge > 1) continue;
        const dmg = p.k === 'pebble' ? 6 : p.k === 'star' ? 13 : Math.round(8 + owner.mass * 3);
        if (o.block && Math.sign(p.x - o.x) === o.face) { s.events.push({ e: 'block', who: 1 - p.owner, x: p.x, y: p.y }); if (p.k !== 'boomer') p.done = true; continue; }
        if (o.boss === 'giant' && dmg < 14) { s.events.push({ e: 'clank', who: 1 - p.owner, x: p.x, y: p.y }); p.done = p.k !== 'boomer'; continue; }
        damage(s, o, dmg, p.owner); o.stun = 16; o.vx = Math.sign(o.x - p.x || 1) * 6; o.vy = 4; o.y = Math.max(o.y, 0.1); o.lastHitBy = p.owner;
        owner.meter = Math.min(100, owner.meter + dmg);
        s.freeze = 4; s.events.push({ e: 'hit', who: 1 - p.owner, by: p.owner, x: p.x, y: p.y, dmg, heavy: false, mass: 1, kb: 6, combo: 0 });
        if (p.k !== 'boomer') p.done = true;
      }
    }
    s.shots = s.shots.filter((p) => !p.done);
    // ground-slam shockwaves
    for (const w of s.waves) {
      w.x += w.dir * 11; w.life--;
      const o = s.p[1 - w.owner];
      if (!w.hit && !o.gone && o.y < 20 && Math.abs(o.x - w.x) < 30 && s.phase === 'fight') {
        w.hit = true; if (o.dodge > 1) continue;
        const d = Math.round(w.power);
        if (o.boss === 'giant' && d < 14) continue;
        damage(s, o, d, w.owner); o.vy = 11; o.y = 0.1; o.vx = w.dir * 5; o.tumble = 0.2 * w.dir; o.stun = 10; o.lastHitBy = w.owner;
        s.events.push({ e: 'hit', who: 1 - w.owner, by: w.owner, x: o.x, y: 20, dmg: d, heavy: true, mass: 3, kb: 11, combo: 0 });
      }
    }
    s.waves = s.waves.filter((w) => w.life > 0 && w.x > WALL && w.x < W - WALL);
  }

  function endRound(s, w, why) {
    if (s.phase !== 'fight') return;
    s.phase = 'ko'; s.pt = 0; s.lastWin = w;
    if (w >= 0) s.p[w].wins++;
    s.events.push({ e: 'ko', winner: w, why, perfect: w >= 0 && s.p[w].hp === s.p[w].max });
  }
  function nextRound(s) {
    if (s.p.some((f) => f.wins >= s.rounds)) { s.phase = 'over'; s.winner = s.p[0].wins >= s.rounds ? 0 : 1; s.events.push({ e: 'match', winner: s.winner }); return; }
    s.round++;
    s.p = s.p.map((f, i) => { const n = s.mk(i); n.wins = f.wins; n.meter = s.chaos.includes('infinite') ? 100 : Math.min(60, f.meter); return n; });
    resetProps(s);
    s.phase = 'intro'; s.pt = 0; s.timer = ROUND;
    s.events.push({ e: 'round', n: s.round });
  }

  // ---------- CPU ----------
  const AIL = [
    { react: 26, block: 0.12, parry: 0, aggro: 0.25, dodge: 0.03, think: 22 },
    { react: 16, block: 0.4, parry: 0.05, aggro: 0.5, dodge: 0.08, think: 13 },
    { react: 10, block: 0.65, parry: 0.2, aggro: 0.7, dodge: 0.14, think: 8 },
    { react: 6, block: 0.8, parry: 0.4, aggro: 0.85, dodge: 0.2, think: 5 },
  ];
  function cpu(s, me, mem, level) {
    const L = AIL[Math.max(0, Math.min(3, level))], f = s.p[me], o = s.p[1 - me];
    const inp = { l: false, r: false, u: false, a: false, b: false, d: false, s: false };
    mem.seed ??= 777 + me * 31 + level;
    const r = () => (mem.seed = (mem.seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    if (s.phase !== 'fight' || f.gone) return inp;
    const dist = Math.abs(o.x - f.x), toward = o.x > f.x ? 'r' : 'l', away = toward === 'r' ? 'l' : 'r';
    const myRange = f.reach * 0.85 + o.r, theirRange = o.reach * 0.9 + f.r + 20;
    // danger: their swing coming, a lit barrel, a shockwave
    const swingComing = (o.phase === 'windup' || o.phase === 'strike' || (o.sp && o.sp.k !== 'boomer')) && dist < theirRange;
    if (swingComing && mem.seen !== o.pt + o.phase) { mem.seen = o.pt + o.phase; mem.react = s.frame + L.react; mem.choice = r(); }
    if (swingComing && s.frame >= (mem.react || 0)) {
      if (mem.choice < L.block) { inp.b = true; return inp; }
      if (mem.choice < L.block + L.dodge) { inp.d = true; inp[away] = true; return inp; }
    }
    if (!s.barrel.gone && s.barrel.fuse > 0 && Math.abs(f.x - s.barrel.x) < 220) { inp[f.x < s.barrel.x ? 'l' : 'r'] = true; if (s.barrel.fuse < 15) inp.u = true; return inp; }
    if (s.waves.some((w) => w.owner !== me && Math.abs(w.x - f.x) < 140)) { inp.u = true; return inp; }
    const set = (keys, n) => { mem.keys = keys; mem.hold = n; return Object.assign(inp, keys); };
    // special when it'll land
    if (f.meter >= 100) {
      const ranged = ['curved', 'star', 'spiral', 'pebble'].includes(f.w.type);
      if ((ranged && dist < 420) || dist < myRange + 40) { inp.s = true; return inp; }
    }
    // attack when in range (checked before any held movement)
    if (f.phase === 'idle' && dist < myRange && r() < L.aggro * 0.35) { inp.a = true; return inp; }
    if ((f.phase === 'strike' || f.phase === 'recover') && dist < myRange && r() < L.aggro * 0.5) { inp.a = true; return inp; }
    // shorter weapon: dash in past their reach
    if (myRange + 30 < theirRange && dist > myRange && dist < theirRange + 60 && f.dodgeCd <= 0 && r() < 0.12 * L.aggro) { inp.d = true; inp[toward] = true; return inp; }
    // longer weapon: don't let them inside
    if (myRange > theirRange + 30 && dist < theirRange + 15 && level >= 1 && r() < 0.6) return set({ [away]: true }, 6);
    if (mem.hold > 0) { mem.hold--; Object.assign(inp, mem.keys); return inp; }
    if (mem.think-- > 0) return Object.assign(inp, mem.keys || {});
    mem.think = L.think + Math.floor(r() * L.think);
    const k = r();
    if (dist > myRange) { if (k < 0.08) return set({ [toward]: true, u: true }, 6); return set({ [toward]: true }, 8); }
    if (theirRange > myRange && dist < theirRange && k < 0.3) return set({ [toward]: true }, 6); // get inside a long weapon
    if (k < 0.2) return set({ [away]: true }, 8);
    if (k < 0.3 && level >= 2) return set({ b: true }, 10);
    return set({}, 5);
  }

  globalThis.DB = { create, step, cpu, wpos, BOSSES, W, ROUND, R };
})();

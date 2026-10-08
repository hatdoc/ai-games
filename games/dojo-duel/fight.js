// Dojo Duel: the fight engine (60 steps a second) and the CPU opponent.
// Runs on the host only online (or locally); also loads in Node for balance tests.
(() => {
  const W = 1400, WALL = 60, FLOOR = 0, GRAV = 0.95, ROUND_FRAMES = 60 * 60, WINS = 2;
  const STAND = [-28, 0, 56, 176], CROUCH = [-32, 0, 64, 104], AIR = [-26, 20, 52, 150];

  // ---------- moves (frames at 60 fps) ----------
  // hit: [x, y, w, h] in front of the fighter (x grows forward). level: high (whiffs on crouchers), mid, low, over (jump-in), throw
  const M = {
    // strings: a move's cancel says which button continues it (only when the previous hit landed or was blocked)
    jab: { start: 5, act: 3, rec: 9, dmg: 5, hit: [18, 118, 74, 24], level: 'high', hs: 15, bs: 9, push: 4, cancel: { p: 'jab2', k: 'jabkick' }, pose: 'jab' },
    jab2: { start: 6, act: 3, rec: 12, dmg: 6, hit: [18, 116, 78, 26], level: 'high', hs: 17, bs: 10, push: 5, cancel: { k: 'roundhouse', p: 'hook' }, pose: 'cross' },
    roundhouse: { start: 10, act: 4, rec: 20, dmg: 12, hit: [18, 92, 96, 44], level: 'mid', kd: true, bs: 14, push: 10, pose: 'roundhouse', combo: 'Whirlwind' },
    hook: { start: 7, act: 3, rec: 14, dmg: 7, hit: [16, 104, 74, 34], level: 'mid', hs: 19, bs: 11, push: 5, cancel: { k: 'finisher' }, pose: 'hook', combo: 'Triple Punch' },
    jabkick: { start: 8, act: 4, rec: 16, dmg: 9, hit: [22, 70, 96, 34], level: 'mid', hs: 18, bs: 12, push: 8, pose: 'kick', combo: 'One-Two Kick' },
    kick: { start: 9, act: 4, rec: 15, dmg: 9, hit: [22, 68, 98, 32], level: 'mid', hs: 18, bs: 12, push: 7, cancel: { k: 'kick2', p: 'kickpunch' }, pose: 'kick' },
    kick2: { start: 9, act: 4, rec: 18, dmg: 10, hit: [22, 112, 98, 32], level: 'high', hs: 18, bs: 12, push: 9, cancel: { k: 'axe' }, pose: 'highkick', combo: 'Double Kick' },
    axe: { start: 12, act: 4, rec: 22, dmg: 12, hit: [18, 30, 92, 140], level: 'mid', kd: true, bs: 14, push: 8, pose: 'axe', combo: 'Triple Kick' },
    kickpunch: { start: 7, act: 3, rec: 15, dmg: 8, hit: [18, 110, 80, 30], level: 'high', hs: 19, bs: 11, push: 9, pose: 'cross', combo: 'Kick Punch' },
    lowpunch: { start: 5, act: 3, rec: 10, dmg: 4, hit: [16, 38, 74, 24], level: 'low', hs: 13, bs: 8, push: 4, crouch: true, cancel: { p: 'lowpunch2', k: 'sweep' }, pose: 'lowpunch' },
    lowpunch2: { start: 6, act: 3, rec: 11, dmg: 4, hit: [16, 38, 74, 24], level: 'low', hs: 13, bs: 8, push: 4, crouch: true, cancel: { k: 'sweep' }, pose: 'lowpunch', combo: 'Low Jabs' },
    sweep: { start: 10, act: 4, rec: 22, dmg: 8, hit: [16, 2, 112, 26], level: 'low', kd: true, bs: 12, push: 6, crouch: true, pose: 'sweep', combo: 'Low Rush' },
    power: { start: 12, act: 4, rec: 20, dmg: 13, hit: [22, 100, 84, 38], level: 'mid', hs: 22, bs: 14, push: 16, lunge: 4, cancel: { k: 'powerkick' }, pose: 'power' },
    powerkick: { start: 9, act: 4, rec: 20, dmg: 11, hit: [20, 80, 96, 44], level: 'mid', kd: true, bs: 14, push: 10, pose: 'roundhouse', combo: 'Power Combo' },
    launcher: { start: 14, act: 4, rec: 16, dmg: 10, hit: [16, 60, 74, 115], level: 'mid', launch: 15, bs: 16, push: 2, pose: 'uppercut' },
    jumpP: { start: 5, act: 7, rec: 6, dmg: 7, hit: [8, 70, 72, 34], level: 'over', hs: 16, bs: 10, push: 4, air: true, pose: 'airpunch' },
    jumpK: { start: 7, act: 9, rec: 6, dmg: 9, hit: [12, 22, 84, 44], level: 'over', hs: 18, bs: 12, push: 5, air: true, pose: 'airkick' },
    throw: { start: 6, act: 2, rec: 30, dmg: 20, hit: [8, 50, 66, 100], level: 'throw', kd: true, push: 0, pose: 'throw' },
  };
  // each fighter's own 4-hit ending: punch, punch, punch, KICK
  const FINISHERS = {
    dragonrush: { combo: 'Dragon Rush', start: 9, act: 5, rec: 22, dmg: 14, hit: [10, 70, 80, 120], level: 'mid', launch: 16, bs: 16, push: 4, pose: 'uppercut' },
    phantom: { combo: 'Phantom Flurry', start: 6, act: 15, rec: 16, dmg: 4, hit: [16, 60, 96, 70], level: 'mid', hs: 14, bs: 8, push: 2, multi: 5, kdLast: true, lunge: 4, pose: 'kick' },
    wrecking: { combo: 'Wrecking Ball', start: 12, act: 5, rec: 24, dmg: 18, hit: [16, 40, 90, 120], level: 'mid', kd: true, bs: 16, push: 14, lunge: 7, pose: 'power' },
    crane: { combo: 'Crane Kick', start: 8, act: 7, rec: 20, dmg: 14, hit: [10, 80, 104, 70], level: 'mid', kd: true, bs: 14, push: 9, rise: 9, pose: 'flykick' },
    storm: { combo: 'Capoeira Storm', start: 7, act: 18, rec: 18, dmg: 5, hit: [-24, 60, 132, 70], level: 'mid', hs: 14, bs: 8, push: 3, multi: 6, kdLast: true, spin: true, pose: 'cyclone' },
    suplex: { combo: 'Suplex', start: 10, act: 4, rec: 26, dmg: 17, hit: [6, 50, 80, 110], level: 'mid', launch: 13, bs: 16, push: 2, pose: 'throw' },
    shadowstrike: { combo: 'Shadow Strike', start: 10, act: 4, rec: 18, dmg: 13, hit: [10, 60, 74, 90], level: 'mid', kd: true, bs: 14, push: 8, teleport: true, pose: 'flykick' },
    cometup: { combo: 'Comet Uppercut', start: 6, act: 10, rec: 20, dmg: 7, hit: [12, 70, 78, 110], level: 'mid', hs: 16, bs: 10, push: 2, multi: 5, launchLast: 15, lunge: 3, pose: 'uppercut' },
  };
  const SPECIALS = {
    dragon: { name: 'Rising Dragon', start: 4, act: 12, rec: 26, dmg: 16, hit: [4, 60, 72, 150], level: 'mid', launch: 18, bs: 18, push: 3, meter: 50, inv: 9, rise: 13, pose: 'dragon' },
    shadow: { name: 'Shadow Dash', start: 8, act: 14, rec: 18, dmg: 15, hit: [8, 50, 74, 90], level: 'mid', kd: true, bs: 12, push: 8, meter: 50, lunge: 17, pose: 'flykick' },
    quake: { name: 'Earthquake', start: 18, act: 2, rec: 24, dmg: 0, level: 'mid', meter: 50, wave: { speed: 9, life: 60, dmg: 11 }, pose: 'stomp' },
    cyclone: { name: 'Cyclone Kick', start: 7, act: 18, rec: 18, dmg: 6, hit: [-20, 72, 124, 70], level: 'mid', hs: 14, bs: 8, push: 3, meter: 50, multi: 6, lunge: 4, kdLast: true, spin: true, pose: 'cyclone' },
    ginga: { name: 'Ginga Sweep', start: 8, act: 18, rec: 18, dmg: 6, hit: [-30, 0, 144, 40], level: 'low', hs: 14, bs: 8, push: 3, meter: 50, multi: 6, lunge: 3, kdLast: true, crouch: true, spin: true, pose: 'sweep' },
    bearhug: { name: 'Bear Hug', start: 12, act: 4, rec: 34, dmg: 22, hit: [6, 40, 90, 110], level: 'throw', range: 108, kd: true, push: 0, meter: 50, pose: 'throw' },
    smoke: { name: 'Smoke Step', start: 14, act: 4, rec: 18, dmg: 15, hit: [10, 60, 74, 90], level: 'mid', kd: true, bs: 14, push: 8, meter: 50, inv: 14, teleport: true, pose: 'flykick' },
    comet: { name: 'Comet Punch', start: 6, act: 15, rec: 20, dmg: 5, hit: [16, 90, 82, 50], level: 'mid', hs: 16, bs: 8, push: 2, meter: 50, multi: 5, lunge: 9, launchLast: 15, pose: 'power' },
  };
  const CHARS = {
    kenji: { name: 'Kenji', style: 'Balanced', speed: 1, jump: 1, hp: 140, dmg: 1, reach: 1, special: 'dragon', finisher: 'dragonrush', color: '#e03131', trim: '#fff', skin: '#f1c27d', hair: '#222' },
    vex: { name: 'Vex', style: 'Fast', speed: 1.25, jump: 1.08, hp: 140, dmg: 1.04, reach: 0.95, special: 'shadow', finisher: 'phantom', color: '#7048e8', trim: '#e5dbff', skin: '#c68642', hair: '#f8f9fa' },
    tank: { name: 'Tank', style: 'Heavy', speed: 0.82, jump: 0.9, hp: 146, dmg: 1.02, reach: 1.05, special: 'quake', finisher: 'wrecking', color: '#2f9e44', trim: '#ffd43b', skin: '#8d5524', hair: '#111', big: true },
    lin: { name: 'Lin', style: 'Long legs', speed: 1.05, jump: 1.02, hp: 138, dmg: 1, reach: 1.15, special: 'cyclone', finisher: 'crane', color: '#1c7ed6', trim: '#ffe066', skin: '#ffe0bd', hair: '#5c2b0c' },
    rosa: { name: 'Rosa', style: 'Capoeira', speed: 1.12, jump: 1.1, hp: 134, dmg: 0.98, reach: 1.08, special: 'ginga', finisher: 'storm', color: '#f76707', trim: '#fff3bf', skin: '#a0522d', hair: '#3b1f0e' },
    bruno: { name: 'Bruno', style: 'Wrestler', speed: 0.84, jump: 0.88, hp: 144, dmg: 1, reach: 0.95, special: 'bearhug', finisher: 'suplex', color: '#c2255c', trim: '#ffd43b', skin: '#d9a066', hair: '#111', big: true },
    mei: { name: 'Mei', style: 'Ninja', speed: 1.2, jump: 1.15, hp: 134, dmg: 0.98, reach: 1, special: 'smoke', finisher: 'shadowstrike', color: '#343a40', trim: '#e03131', skin: '#ffe0bd', hair: '#111' },
    ace: { name: 'Ace', style: 'Boxer', speed: 1.08, jump: 0.95, hp: 142, dmg: 1.02, reach: 0.92, special: 'comet', finisher: 'cometup', color: '#1971c2', trim: '#f8f9fa', skin: '#6b3e26', hair: '#111', gloves: '#e03131' },
  };

  function fighter(id, x, face) {
    const c = CHARS[id];
    return { id, x, y: 0, vx: 0, vy: 0, face, hp: c.hp, max: c.hp, meter: 0, state: 'idle', t: 0, move: null, mt: 0, hits: 0, hitAt: -99,
      combo: 0, juggle: 0, prev: {}, q: [], inv: 0, wins: 0 };
  }
  function create(opt) {
    const s = { p: [fighter(opt.p1, 520, 1), fighter(opt.p2, 880, -1)], round: 1, phase: 'intro', pt: 0, timer: ROUND_FRAMES, events: [], waves: [], freeze: 0, frame: 0, winner: null };
    s.events.push({ e: 'round', n: 1 });
    return s;
  }
  const char = (f) => CHARS[f.id];
  const moveOf = (f, name) => (name === 'special' ? SPECIALS[char(f).special] : name === 'finisher' ? FINISHERS[char(f).finisher] : M[name]);
  const airborne = (f) => f.y > 0 || f.state === 'jump' || f.state === 'launched';
  function hurtbox(f) {
    if (f.state === 'down' || f.state === 'ko') return null;
    const b = airborne(f) ? AIR : f.state === 'crouch' || f.state === 'cblock' || (f.move && f.move.crouch) ? CROUCH : STAND;
    const scale = char(f).big ? 1.08 : 1;
    return [f.x + b[0] * scale, f.y + b[1], b[2] * scale, b[3] * scale];
  }
  function hitbox(f) {
    const m = f.move, r = char(f).reach, h = m.hit; if (!h) return null;
    const w = h[2] * (m === M.kick || m === M.kick2 || m === M.sweep || m === M.roundhouse ? r : 1);
    const x0 = f.face > 0 ? f.x + h[0] : f.x - h[0] - w;
    return [x0, f.y + h[1], w, h[3]];
  }
  const overlap = (a, b) => a && b && a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

  function startMove(s, f, name) {
    const m = moveOf(f, name);
    if (m.meter) { if (f.meter < m.meter) return false; f.meter -= m.meter; s.events.push({ e: 'special', who: s.p.indexOf(f), name: m.name }); }
    f.move = m; f.mname = name; f.mt = 0; f.hits = 0; f.state = 'attack'; f.chained = false;
    if (!m.air) f.vx = 0;
    if (m.inv) f.inv = m.inv;
    return true;
  }
  // edge-triggered presses from held buttons
  function presses(f, inp) { const o = {}; for (const k of ['p', 'k', 's', 'u']) o[k] = inp[k] && !f.prev[k]; f.prev = { ...inp }; return o; }

  function control(s, f, o, inp) {
    const fwd = f.face > 0 ? inp.r : inp.l, back = f.face > 0 ? inp.l : inp.r, c = char(f);
    const pr = presses(f, inp);
    if (s.phase !== 'fight') { if (['idle', 'walk', 'crouch', 'block', 'cblock'].includes(f.state)) { f.state = 'idle'; f.vx = 0; } return; }
    // buffered string input (P,P,K …) while an attack is running
    if (f.state === 'attack') {
      for (const b of ['p', 'k']) if (pr[b] && f.q.length < 3) f.q.push(b); // presses queue up in order (fast P,P,P,K still works)
      const m = f.move, end = m.start + m.act + m.rec;
      while (f.q.length && !m.cancel?.[f.q[0]]) f.q.shift(); // a button this move can't continue with is dropped
      if (f.q.length && f.hitAt === f.mt0 && f.mt > m.start && f.mt < end - 2) { startMove(s, f, m.cancel[f.q.shift()]); f.chained = true; }
      return;
    }
    if (!['idle', 'walk', 'crouch', 'block', 'cblock', 'jump'].includes(f.state)) return;
    if (f.state === 'jump') { // air attacks
      if (pr.p || pr.k) { const m = pr.k ? 'jumpK' : 'jumpP'; f.move = M[m]; f.mname = m; f.mt = 0; f.hits = 0; f.state = 'attack'; }
      return;
    }
    // attacks
    if (pr.s && f.meter >= SPECIALS[c.special].meter) { startMove(s, f, 'special'); return; }
    if (pr.p && pr.k || (pr.p && inp.k) || (pr.k && inp.p)) { startMove(s, f, 'throw'); return; }
    if (pr.p) { startMove(s, f, inp.d ? 'lowpunch' : fwd ? 'power' : 'jab'); return; }
    if (pr.k) { startMove(s, f, inp.d ? 'sweep' : fwd ? 'launcher' : 'kick'); return; }
    // movement
    if (pr.u || (inp.u && f.state !== 'jump' && f.y === 0)) { f.state = 'jump'; f.vy = 17 * c.jump; f.vx = (fwd ? 5 : back ? -5 : 0) * f.face * c.speed; s.events.push({ e: 'jump', who: s.p.indexOf(f) }); return; }
    if (inp.d) { f.state = back ? 'cblock' : 'crouch'; f.vx = 0; return; }
    if (back && o.state === 'attack') { f.state = 'block'; f.vx = 0; return; } // hold back to block
    if (fwd) { f.state = 'walk'; f.vx = 4.2 * c.speed * f.face; return; }
    if (back) { f.state = 'walk'; f.vx = -3.3 * c.speed * f.face; return; }
    f.state = 'idle'; f.vx = 0;
  }

  function guards(f, inp, level) { // is f blocking this attack?
    if (!['idle', 'walk', 'block', 'cblock', 'crouch'].includes(f.state) && !(f.state === 'bstun')) return false;
    const back = f.face > 0 ? inp.l : inp.r;
    if (!back && f.state !== 'bstun') return false;
    const low = inp.d;
    if (level === 'low') return low;
    if (level === 'over') return !low;
    if (level === 'mid') return !low;
    return true; // high
  }
  function applyHit(s, a, d, dinp, m, multiLast) {
    const ai = s.p.indexOf(a), di = s.p.indexOf(d);
    if (d.inv > 0 || d.state === 'down' || d.state === 'getup' || d.state === 'ko') return false;
    if (m.level === 'throw') {
      if (airborne(d) || d.state === 'hstun' || d.state === 'attack' && d.move?.inv) return false;
    } else if (m.level === 'high' && (d.state === 'crouch' || d.state === 'cblock' || d.move?.crouch)) return false; // ducks under highs
    const blocked = m.level !== 'throw' && !airborne(d) && guards(d, dinp, m.level);
    a.hitAt = a.mt0;
    if (blocked) {
      d.state = 'bstun'; d.t = m.bs || 10; d.vx = -(m.push || 4) * 0.8 * d.face; d.move = null;
      a.meter = Math.min(100, a.meter + 2); d.meter = Math.min(100, d.meter + 3);
      s.freeze = 4; s.events.push({ e: 'block', who: di, x: (a.x + d.x) / 2, y: 110 });
      return true;
    }
    const scale = Math.max(0.35, 1 - d.combo * 0.12);
    const dmg = Math.max(1, Math.round(m.dmg * char(a).dmg * scale));
    d.hp = Math.max(0, d.hp - dmg); d.combo++;
    a.meter = Math.min(100, a.meter + dmg); d.meter = Math.min(100, d.meter + dmg * 0.7);
    d.move = null; d.q = [];
    const heavy = dmg >= 12 || m.launch || m.kd;
    s.freeze = heavy ? 8 : 5;
    s.events.push({ e: m.level === 'throw' ? 'throw' : 'hit', who: di, dmg, heavy, combo: d.combo, x: d.x - d.face * 10, y: m.hit ? a.y + m.hit[1] + m.hit[3] / 2 : 110 });
    if (a.chained && m.combo && !(m.multi && a.hits)) s.events.push({ e: 'string', who: ai, name: m.combo });
    if (m.level === 'throw') { d.state = 'launched'; d.vy = m.range ? 15 : 11; d.vx = 6 * a.face; d.x = a.x + 40 * a.face; d.juggle = 9; return true; }
    if (airborne(d)) { // juggle
      d.juggle++;
      d.state = 'launched'; d.vy = d.juggle > 4 ? -2 : Math.max(d.vy, m.launch ? 13 : 8); d.vx = 2.5 * a.face;
    } else if (m.launch) { d.state = 'launched'; d.vy = m.launch; d.vx = 1.5 * a.face; d.juggle = 0; }
    else if (multiLast && m.launchLast) { d.state = 'launched'; d.vy = m.launchLast; d.vx = 1.5 * a.face; d.juggle = 0; }
    else if (m.kd || multiLast) { d.state = 'launched'; d.vy = 7; d.vx = 7 * a.face; d.juggle = 9; }
    else { d.state = 'hstun'; d.t = m.hs || 14; d.vx = (m.push || 4) * a.face; }
    if (d.hp <= 0) { d.state = 'launched'; d.vy = 12; d.vx = 8 * a.face; d.juggle = 9; }
    return true;
  }

  function physics(s, f, o) {
    const c = char(f);
    if (f.inv > 0) f.inv--;
    switch (f.state) {
      case 'attack': {
        const m = f.move; f.mt++;
        if (f.mt === 1) f.mt0 = s.frame; // identifies this swing for string cancels
        if (m.lunge && f.mt > m.start * 0.5 && f.mt <= m.start + m.act) f.vx = m.lunge * f.face * (m === SPECIALS.shadow ? 1 : c.speed);
        else if (!m.air) f.vx *= 0.7;
        if (m.rise && f.mt === m.start) { f.vy = m.rise; f.vx = 3 * f.face; }
        if (m.teleport && f.mt === m.start - 3) { // vanish and reappear behind them
          s.events.push({ e: 'smoke', x: f.x, y: 90 });
          const side = o.x >= f.x ? 1 : -1; f.x = Math.max(WALL, Math.min(W - WALL, o.x + side * 72)); f.face = -side;
          s.events.push({ e: 'smoke', x: f.x, y: 90 });
        }
        if (m.wave && f.mt === m.start + 1) { s.waves.push({ x: f.x + 50 * f.face, dir: f.face, life: m.wave.life, owner: s.p.indexOf(f), dmg: m.wave.dmg, hit: false }); s.events.push({ e: 'quake', x: f.x }); }
        if (f.mt > m.start + m.act + m.rec && (!m.air || f.y === 0)) { f.state = f.y > 0 ? 'jump' : 'idle'; f.move = null; f.q = []; }
        break;
      }
      case 'hstun': case 'bstun': if (--f.t <= 0) f.state = 'idle'; f.vx *= 0.85; break;
      case 'down': f.vx *= 0.8; if (--f.t <= 0) { if (f.hp <= 0) f.state = 'ko'; else { f.state = 'getup'; f.t = 22; f.inv = 24; } } break;
      case 'getup': if (--f.t <= 0) f.state = 'idle'; break;
    }
    // gravity
    if (f.y > 0 || f.vy > 0) {
      f.y += f.vy; f.vy -= GRAV * (f.state === 'launched' ? 0.85 : 1);
      if (f.y <= 0) {
        f.y = 0; f.vy = 0;
        if (f.state === 'launched') { f.state = 'down'; f.t = f.hp <= 0 ? 999 : 40; f.vx *= 0.4; s.events.push({ e: 'land', x: f.x, heavy: true }); }
        else if (f.state === 'jump') { f.state = 'idle'; f.vx = 0; s.events.push({ e: 'land', x: f.x }); }
        else if (f.state === 'attack' && f.move.air) { f.state = 'idle'; f.move = null; f.vx = 0; }
      }
    }
    f.x += f.vx;
    if (f.y === 0 && !['attack', 'launched'].includes(f.state)) f.vx *= f.state === 'walk' ? 1 : 0.6;
    f.x = Math.max(WALL, Math.min(W - WALL, f.x));
  }

  function step(s, in1, in2) {
    s.events.length = 0;
    const ins = [in1 || {}, in2 || {}], [a, b] = s.p;
    if (s.freeze > 0) { // hit-stop: freeze, but remember buttons pressed meanwhile so strings still come out
      s.freeze--;
      for (let i = 0; i < 2; i++) { const f = s.p[i], pr = presses(f, ins[i]); if (f.state === 'attack') for (const b of ['p', 'k']) if (pr[b] && f.q.length < 3) f.q.push(b); }
      return;
    }
    s.frame++; s.pt++;
    if (s.phase === 'intro' && s.pt > 100) { s.phase = 'fight'; s.pt = 0; s.events.push({ e: 'fight' }); }
    if (s.phase === 'fight' && --s.timer <= 0) endRound(s, a.hp / a.max === b.hp / b.max ? -1 : a.hp / a.max > b.hp / b.max ? 0 : 1, 'time');
    // face each other when free to turn
    for (const [f, o] of [[a, b], [b, a]]) if (['idle', 'walk', 'crouch', 'block', 'cblock'].includes(f.state) && f.y === 0) f.face = o.x >= f.x ? 1 : -1;
    control(s, a, b, ins[0]); control(s, b, a, ins[1]);
    physics(s, a, b); physics(s, b, a);
    // push boxes: fighters on the ground can't overlap
    const gap = 62, dx = b.x - a.x;
    if (Math.abs(dx) < gap && Math.abs(a.y - b.y) < 120 && a.state !== 'down' && b.state !== 'down') {
      const push = (gap - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);
      a.x -= push; b.x += push;
      for (const f of [a, b]) f.x = Math.max(WALL, Math.min(W - WALL, f.x));
      if (Math.abs(b.x - a.x) < gap - 1) { if (a.x <= WALL + 1) b.x = a.x + gap; else if (b.x <= WALL + 1) a.x = b.x + gap; else if (a.x >= W - WALL - 1) b.x = a.x - gap; else if (b.x >= W - WALL - 1) a.x = b.x - gap; }
    }
    // attacks connect: find both fighters' hits first, then apply them, so same-frame hits trade (no player-1 advantage)
    const landed = [];
    for (const [f, o, oi] of [[a, b, 1], [b, a, 0]]) {
      if (f.state !== 'attack' || !f.move.hit) continue;
      const m = f.move, active = f.mt > m.start && f.mt <= m.start + m.act;
      if (!active) continue;
      const maxHits = m.multi ? Math.ceil(m.act / m.multi) : 1;
      if (f.hits >= maxHits || (m.multi && f.hits && (f.mt - m.start - 1) % m.multi)) continue;
      if (m.level === 'throw' ? Math.abs(o.x - f.x) < (m.range || 96) && overlap(hitbox(f), hurtbox(o)) : overlap(hitbox(f), hurtbox(o))) landed.push([f, o, oi, m, maxHits]);
    }
    if (landed.length === 2 && landed.some(([, , , m]) => m.level === 'throw')) landed.splice(landed.findIndex(([, , , m]) => m.level === 'throw'), 1); // strikes beat throws
    for (const [f, o, oi, m, maxHits] of landed) {
      if (applyHit(s, f, o, ins[oi], m, (m.kdLast || m.launchLast) && f.hits === maxHits - 1)) { f.hits++; if (m.lunge) f.vx = 0; if (o.hp <= 0) endRound(s, s.p.indexOf(f), 'ko'); }
      else if (m.level === 'throw') f.hits = maxHits;
    }
    // Earthquake shockwaves travel along the floor
    for (const w of s.waves) {
      w.x += 9 * w.dir; w.life--;
      const o = s.p[1 - w.owner];
      if (!w.hit && Math.abs(o.x - w.x) < 40) {
        w.hit = true;
        if (applyHit(s, s.p[w.owner], o, ins[1 - w.owner], { dmg: w.dmg, level: 'low', kd: true, bs: 14, push: 6 }) && o.hp <= 0) endRound(s, w.owner, 'ko');
        w.life = 0;
      }
    }
    s.waves = s.waves.filter((w) => w.life > 0 && w.x > 0 && w.x < W);
    // combos reset once you're back on your feet
    for (const f of [a, b]) if (['idle', 'walk', 'crouch', 'block', 'cblock'].includes(f.state)) { f.combo = 0; f.juggle = 0; }
    if (s.phase === 'ko' && s.pt > 150) nextRound(s);
  }
  function endRound(s, w, why) {
    if (s.phase !== 'fight') return;
    s.phase = 'ko'; s.pt = 0;
    if (w >= 0) s.p[w].wins++;
    s.lastWin = w;
    s.events.push({ e: 'ko', winner: w, why, perfect: w >= 0 && s.p[w].hp === s.p[w].max });
  }
  function nextRound(s) {
    if (s.p.some((f) => f.wins >= WINS)) { s.phase = 'over'; s.winner = s.p[0].wins >= WINS ? 0 : 1; s.events.push({ e: 'match', winner: s.winner }); return; }
    s.round++;
    s.p = s.p.map((f, i) => { const n = fighter(f.id, i ? 880 : 520, i ? -1 : 1); n.wins = f.wins; n.meter = f.meter; return n; });
    s.phase = 'intro'; s.pt = 0; s.timer = ROUND_FRAMES; s.waves = [];
    s.events.push({ e: 'round', n: s.round });
  }

  // ---------- CPU ----------
  // level 0 easy, 1 normal, 2 hard. Reacts after a delay; blocks, punishes, pokes, juggles after launchers.
  const AI = [
    { react: 24, block: 0.15, lowRead: 0.1, aggro: 0.35, punish: 0.2, combo: 0.1, think: 20 },
    { react: 15, block: 0.45, lowRead: 0.45, aggro: 0.55, punish: 0.5, combo: 0.45, think: 12 },
    { react: 9, block: 0.75, lowRead: 0.8, aggro: 0.7, punish: 0.85, combo: 0.85, think: 7 },
  ];
  function cpu(s, me, mem, level) {
    const L = AI[level], f = s.p[me], o = s.p[1 - me], fwdKey = f.face > 0 ? 'r' : 'l', backKey = f.face > 0 ? 'l' : 'r';
    const inp = { l: false, r: false, u: false, d: false, p: false, k: false, s: false }, dist = Math.abs(o.x - f.x);
    const rnd = () => (mem.seed = (mem.seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    mem.seed ??= (me + 1) * 7919 + level;
    if (s.phase !== 'fight') return inp;
    const set = (keys, frames, tap) => { mem.keys = keys; mem.hold = frames; mem.tap = tap; Object.assign(inp, keys); if (tap) inp[tap] = true; return inp; };
    // see an attack coming: block it (low ones crouching). Checked every frame, even mid-decision.
    const threat = (o.state === 'attack' && o.move.hit && o.mt >= Math.min(o.move.start, L.react * 0.5)) || s.waves.some((w) => w.owner !== me && Math.abs(w.x - f.x) < 260);
    if (threat && dist < 260 && mem.blockRoll !== (o.mt0 ?? -1) + (s.waves.length ? 0.5 : 0)) { mem.blockRoll = (o.mt0 ?? -1) + (s.waves.length ? 0.5 : 0); mem.willBlock = rnd() < L.block; }
    if (threat && mem.willBlock && f.state !== 'attack') {
      const low = (o.move?.level === 'low') || s.waves.some((w) => w.owner !== me);
      if (low && level === 2 && s.waves.length && rnd() < 0.5) return set({ u: true }, 4);
      return set({ [backKey]: true, d: low && rnd() < L.lowRead + 0.2 }, 6);
    }
    // keep holding a decision for a few frames
    if (mem.hold > 0) { mem.hold--; Object.assign(inp, mem.keys); if (mem.tap) { inp[mem.tap] = true; mem.tap = null; } return inp; }
    // continue a string or juggle
    if (f.state === 'attack') {
      if (f.hitAt === f.mt0 && f.move.cancel && rnd() < L.combo) { mem.br ??= rnd() < 0.5 ? 0 : 1; const ks = Object.keys(f.move.cancel), b = ks[Math.min(mem.br, ks.length - 1)]; inp[b] = !f.prev[b]; }
      else mem.br = null;
      return inp;
    }
    if (o.state === 'launched' && o.juggle < 3 && dist < 150 && f.state !== 'jump' && rnd() < L.combo) return set({}, 2, o.y > 60 ? 'p' : 'k');
    if (mem.think > 0) { mem.think--; Object.assign(inp, mem.keys || {}); return inp; }
    mem.think = L.think + Math.floor(rnd() * L.think);
    // punish a whiffed / blocked heavy move
    if (o.state === 'attack' && o.mt > o.move.start + o.move.act && dist < 150 && rnd() < L.punish) return set({}, 2, rnd() < 0.5 ? 'p' : 'k');
    const SR = { tank: 600, vex: 330, mei: 520, ace: 270, rosa: 170, bruno: 115 };
    if (f.meter >= 50 && dist < (SR[f.id] || 160) && rnd() < 0.3 * L.aggro + 0.1) return set({}, 2, 's');
    if (dist > 240) {
      const r = rnd();
      if (r < 0.06 * L.aggro) return set({ [fwdKey]: true, u: true }, 3);
      return set({ [fwdKey]: true }, 10);
    }
    if (dist > 130) {
      const r = rnd();
      if (r < 0.25 * L.aggro) return set({}, 2, 'k');
      if (r < 0.4 * L.aggro) return set({ d: true }, 4, 'k');
      if (r < 0.7) return set({ [fwdKey]: true }, 8);
      return set({ [backKey]: true }, 8);
    }
    const r = rnd();
    if (r < 0.2 * L.aggro + 0.1) return set({}, 2, 'p');
    if (r < 0.35 * L.aggro + 0.15) return set({ [fwdKey]: true }, 2, 'k');
    if (r < 0.45 * L.aggro + 0.2) return set({ d: true }, 3, rnd() < 0.5 ? 'p' : 'k');
    if (r < 0.5 * L.aggro + 0.25) { inp.p = inp.k = true; mem.keys = {}; mem.hold = 1; return inp; }
    if (r < 0.62 * L.aggro + 0.3) return set({ [fwdKey]: true }, 2, 'p');
    if (r < 0.8) return set({ [backKey]: true }, 10);
    return set({ [backKey]: true, d: true }, 8);
  }

  globalThis.FD = { create, step, cpu, CHARS, SPECIALS, FINISHERS, M, W, ROUND_FRAMES, hurtbox, hitbox, moveOf };
})();

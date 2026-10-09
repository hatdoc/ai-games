// Sentai Strike: game rules (no drawing). Runs in the browser and in Node for tests.
// World: x 0..W, y up from the ground. 60 steps a second.
(() => {
  const W = 1400, VIEW = 960, GRAV = 0.8, COST = 20;

  // ---------- heroes ----------
  // chain: one entry per hit of the Z combo. d damage, r reach, s startup, a active, c recovery (frames)
  const HEROES = {
    red: { name: 'Red Striker', color: '#e03131', hp: 220, speed: 4.4, jump: 15, proj: 'wave', robo: 'saber',
      chain: [{ d: 9, r: 62, s: 5, a: 4, c: 9, pose: 'jab' }, { d: 10, r: 66, s: 5, a: 4, c: 10, pose: 'cross' }, { d: 18, r: 84, s: 8, a: 5, c: 16, pose: 'slash', kb: 9, launch: 6 }] },
    blue: { name: 'Blue Gale', color: '#1c7ed6', hp: 190, speed: 5.4, jump: 16, proj: 'shuriken', robo: 'blaster',
      chain: [{ d: 6, r: 56, s: 3, a: 3, c: 7, pose: 'jab' }, { d: 6, r: 56, s: 3, a: 3, c: 7, pose: 'cross' }, { d: 8, r: 70, s: 4, a: 4, c: 8, pose: 'kick' }, { d: 13, r: 78, s: 6, a: 5, c: 15, pose: 'highkick', kb: 9, launch: 7 }] },
    yellow: { name: 'Yellow Titan', color: '#f59f00', hp: 270, speed: 3.7, jump: 13, proj: 'quake', robo: 'drill',
      chain: [{ d: 13, r: 66, s: 7, a: 5, c: 12, pose: 'jab' }, { d: 14, r: 66, s: 7, a: 5, c: 12, pose: 'cross' }, { d: 28, r: 88, s: 12, a: 6, c: 20, pose: 'power', kb: 12, launch: 5, heavy: true }] },
    silver: { name: 'Silver Phantom', color: '#adb5bd', hp: 230, speed: 4.9, jump: 16, proj: 'laser', robo: 'saber', secret: true,
      chain: [{ d: 8, r: 64, s: 4, a: 4, c: 8, pose: 'jab' }, { d: 9, r: 64, s: 4, a: 4, c: 8, pose: 'slash' }, { d: 10, r: 72, s: 5, a: 4, c: 9, pose: 'kick' }, { d: 17, r: 86, s: 7, a: 5, c: 15, pose: 'slash', kb: 10, launch: 7 }] },
  };

  // ---------- enemies ----------
  const MOBS = {
    grunt: { hp: 40, w: 40, h: 92, speed: 1.7, dmg: 8, wind: 24, reach: 64 },
    archer: { hp: 32, w: 40, h: 92, speed: 1.8, dmg: 9, wind: 30, ranged: true },
    brute: { hp: 120, w: 60, h: 112, speed: 1.1, dmg: 18, wind: 36, reach: 86, armor: true },
    spiderling: { hp: 24, w: 46, h: 40, speed: 3.1, dmg: 6, wind: 16, reach: 52 },
    bee: { hp: 22, w: 40, h: 40, speed: 2.6, dmg: 7, wind: 20, reach: 56, fly: true },
  };
  // boss kits: moves picked in turn; vol = what its volley throws
  const BOSSES = {
    turtle: { name: 'Shellshock Turtle', color: '#2f9e44', w: 110, h: 130, hp: 520, kit: ['swipe', 'charge', 'stomp', 'shell'], vol: 'rock', part: 'Turtle' },
    eagle: { name: 'Gale Eagle', color: '#a0522d', w: 100, h: 140, hp: 580, kit: ['dive', 'volley', 'charge', 'swipe'], vol: 'feather', part: 'Eagle' },
    puffer: { name: 'Spiny Puffer', color: '#fab005', w: 120, h: 120, hp: 640, kit: ['shell', 'volley', 'stomp', 'swipe'], vol: 'spine', spiky: true, part: 'Puffer' },
    mole: { name: 'Drill Mole', color: '#7c5c46', w: 100, h: 120, hp: 700, kit: ['burrow', 'volley', 'swipe', 'charge'], vol: 'rock', part: 'Mole' },
    spider: { name: 'Widow Spider', color: '#5f3dc4', w: 130, h: 110, hp: 760, kit: ['web', 'summon', 'dive', 'swipe'], vol: 'web', minion: 'spiderling', part: 'Spider' },
    dark: { name: 'Dark Striker', color: '#343a40', w: 54, h: 110, hp: 820, kit: ['dash', 'shoot', 'counter', 'swipe'], vol: 'darkwave', part: 'Dark' },
    queen: { name: 'Queen Hornet', color: '#f08c00', w: 110, h: 150, hp: 900, kit: ['summon', 'dive', 'honey', 'volley'], vol: 'stinger', minion: 'bee', enrage: true, part: 'Hornet' },
  };
  const STAGES = [
    { boss: 'turtle', place: 'Downtown', mobs: ['grunt'], every: 100, max: 4 },
    { boss: 'eagle', place: 'Harbor', mobs: ['grunt', 'grunt', 'archer'], every: 95, max: 5 },
    { boss: 'puffer', place: 'Beach', mobs: ['grunt', 'archer'], every: 90, max: 5 },
    { boss: 'mole', place: 'Building Site', mobs: ['grunt', 'archer', 'grunt'], every: 85, max: 6 },
    { boss: 'spider', place: 'Night Market', mobs: ['grunt', 'archer', 'brute'], every: 82, max: 6 },
    { boss: 'dark', place: 'Rooftops', mobs: ['grunt', 'archer', 'brute', 'grunt'], every: 78, max: 7 },
    { boss: 'queen', place: 'The Hive', mobs: ['grunt', 'archer', 'brute', 'bee'], every: 74, max: 7 },
  ];
  // what each boss move becomes when the monster grows giant
  const GIANT = { swipe: 'swipe', charge: 'charge', stomp: 'stomp', shell: 'guard', dive: 'stomp', volley: 'volley', burrow: 'charge', web: 'volley', summon: 'beam', dash: 'charge', shoot: 'beam', counter: 'guard', honey: 'volley' };

  const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // a daily "monster of the day": two bosses glued together
  function mixBoss(seed) {
    const r = mulberry(seed), ids = Object.keys(BOSSES), a = ids[Math.floor(r() * ids.length)];
    let b = ids[Math.floor(r() * ids.length)]; if (b === a) b = ids[(ids.indexOf(a) + 1) % ids.length];
    const A = BOSSES[a], B = BOSSES[b], kit = [...new Set([A.kit[0], A.kit[1], B.kit[0], B.kit[1]])];
    while (kit.length < 4) kit.push(['swipe', 'stomp', 'volley', 'charge'].find((k) => !kit.includes(k)));
    return { name: `${A.part}-${B.part} Mutant`, color: A.color, color2: B.color, w: Math.max(A.w, B.w), h: Math.max(A.h, B.h), hp: 760, kit, vol: r() < 0.5 ? A.vol : B.vol,
      minion: A.minion || B.minion || 'grunt', spiky: A.spiky || B.spiky, enrage: true, parts: [a, b] };
  }

  // ---------- create ----------
  function create(o = {}) {
    const stage = clamp(o.stage || 1, 1, 7), st = STAGES[stage - 1], boss = o.boss || { ...BOSSES[st.boss], parts: [st.boss] };
    const team = (o.team || ['red', 'blue', 'yellow']).map((id) => ({ id, ...hero0(id), x: 300, }));
    const s = {
      stage, st: o.daily ? { ...st, mobs: ['grunt', 'archer', 'brute', 'grunt'], every: 82, max: 6 } : st, bossDef: boss, rng: mulberry(o.seed || (Math.random() * 1e9) | 0),
      phase: o.skipIntro ? 'defend' : 'intro', t: 0, frame: 0, freeze: 0, slow: 0,
      team, cur: 0, tagCd: 0, enemies: [], civs: [], shots: [], pools: [], events: [],
      city: 0, gauge: 30, combo: 0, comboT: 0, maxCombo: 0, lastHitT: -99, score: 0, saved: 0, lost: 0, kills: 0, kos: 0,
      spawnT: 60, civT: 30, camX: 0, prev: {}, tapL: -99, tapR: -99, bossT: 0, finT: 0, robo: null, giant: null, buildings: [], daily: !!o.daily,
    };
    s.team.forEach((h, i) => { h.out = i !== 0; });
    return s;
  }
  function hero0(id) {
    const H = HEROES[id];
    return { hp: H.hp, max: H.hp, y: 0, vx: 0, vy: 0, face: 1, state: 'idle', t: 0, ci: 0, buf: false, hitSet: null, inv: 0, ko: false, dash: 0, dashDir: 0, stuck: 0, cd: 0 };
  }
  const hero = (s) => s.team[s.cur];
  const ev = (s, e) => s.events.push(e);
  const alive = (s) => s.team.filter((h) => !h.ko);

  // ---------- main step ----------
  function step(s, inp = {}) {
    s.events.length = 0;
    const pr = {}; for (const k of 'lrudzxc') pr[k] = !!inp[k] && !s.prev[k]; s.prev = { ...inp };
    if (s.freeze > 0) { s.freeze--; return; }
    if (s.slow > 0) { s.slow--; if (s.slow % 2) return; }
    s.frame++; s.t++;
    const P = s.phase;
    if (P === 'intro') { if (s.t > 200 || (s.t > 20 && (pr.z || pr.x))) to(s, 'defend'); return; }
    if (P === 'robot' || P === 'final' || P === 'finalAnim' || P === 'grow') return roboStep(s, inp, pr);
    if (P === 'clear' || P === 'over') return;
    if (P === 'finishAnim') { if (s.t === 70) ev(s, { e: 'boom', x: boss(s).x, y: 60, big: true }); if (s.t > 150) { to(s, 'grow'); } return; }
    if (P === 'finisher') {
      s.finT--;
      if (pr.x || pr.z) { to(s, 'finishAnim'); s.score += 2000; ev(s, { e: 'finisher' }); return; }
      if (s.finT <= 0) { const b = boss(s); b.hp = Math.round(b.max * 0.15); b.dizzy = 0; to(s, 'boss'); ev(s, { e: 'recover' }); }
      return;
    }
    heroStep(s, hero(s), inp, pr);
    for (const h of s.team) if (h.out && !h.ko) h.hp = Math.min(h.max, h.hp + 0.06); // benched heroes catch their breath
    if (s.tagCd > 0) s.tagCd--;
    if (s.comboT > 0 && --s.comboT === 0) s.combo = 0;
    if (P === 'defend') defendStep(s);
    if (P === 'bossIntro' && s.t > 100) to(s, 'boss');
    for (const e of s.enemies) enemyStep(s, e);
    s.enemies = s.enemies.filter((e) => !e.gone);
    civStep(s); shotStep(s);
    s.pools = s.pools.filter((p) => --p.life > 0);
    s.camX = clamp(hero(s).x - VIEW / 2, 0, W - VIEW);
  }
  function to(s, phase) { s.phase = phase; s.t = 0; ev(s, { e: 'phase', phase }); }
  const boss = (s) => s.enemies.find((e) => e.k === 'boss');

  // ---------- heroes ----------
  function heroStep(s, h, inp, pr) {
    const H = HEROES[h.id];
    if (h.inv > 0) h.inv--;
    if (h.cd > 0) h.cd--;
    // swap heroes
    if (pr.c && s.tagCd <= 0 && !['hurt', 'down', 'ko'].includes(h.state)) {
      const others = s.team.filter((o) => o !== h && !o.ko);
      if (others.length) { const i = s.team.indexOf(h); return tag(s, h, [...s.team.slice(i + 1), ...s.team.slice(0, i)].find((o) => !o.ko)); }
    }
    const ground = h.y <= 0, slowed = ground && s.pools.some((p) => Math.abs(h.x - p.x) < p.w / 2) ? 0.45 : 1;
    // double tap = dash
    if (pr.l) { if (s.frame - s.tapL < 14 && ground) { h.dash = 12; h.dashDir = -1; s.dblT = s.frame; ev(s, { e: 'dash' }); } s.tapL = s.frame; }
    if (pr.r) { if (s.frame - s.tapR < 14 && ground) { h.dash = 12; h.dashDir = 1; s.dblT = s.frame; ev(s, { e: 'dash' }); } s.tapR = s.frame; }
    // a special can cancel a combo once the hit has come out
    if (h.state === 'atk' && pr.x && s.gauge >= COST && h.t >= H.chain[h.ci].s) h.state = 'idle';
    const free = ['idle', 'walk', 'jump', 'guard'].includes(h.state);
    if (h.stuck > 0) { h.stuck -= 1 + (pr.z || pr.x || pr.l || pr.r ? 8 : 0); h.vx = 0; physics(h); return; }
    switch (h.state) {
      case 'hurt': if (--h.t <= 0) h.state = 'idle'; h.vx *= 0.85; break;
      case 'down': if (--h.t <= 0) { h.state = 'idle'; h.inv = 40; } h.vx *= 0.9; break;
      case 'ko': h.vx *= 0.9; break;
      case 'atk': atkStep(s, h, H, pr); break;
      case 'air': // dive kick
        h.t++; if (h.y > 0) hitbox(s, h, 70, 12, { kb: 5, launch: 3, below: true });
        if (h.y <= 0) { h.state = 'idle'; h.vx = 0; }
        break;
      case 'sp': spStep(s, h, H); break;
      case 'stance': // counter stance: get hit and you strike back
        if (++h.t > 34) h.state = 'idle'; h.vx *= 0.8; break;
      case 'tagin': if (++h.t > 26) h.state = 'idle'; break;
    }
    if (free) {
      const rcd = s.frame - (s.dblT ?? -99) < 22; // X right after a double tap = dash special
      if (pr.x && s.gauge >= COST) {
        let k = 'proj';
        if (h.dash > 0 || rcd) k = (h.dash ? h.dashDir : (s.tapR > s.tapL ? 1 : -1)) === h.face ? 'rush' : 'counter';
        else if (inp.u) k = 'rise'; else if (inp.d) k = 'slam';
        if (k !== 'counter' || ground) { special(s, h, H, k); physics(h); return; }
      }
      if (pr.z) {
        if (!ground) { h.state = 'air'; h.t = 0; h.vx = h.face * 6; h.vy = -8; h.hitSet = new Set(); ev(s, { e: 'swing', who: h.id }); }
        else { startAtk(s, h, 0); }
      } else if (inp.d && ground) { h.state = 'guard'; h.vx *= 0.5; }
      else {
        let dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
        if (h.dash > 0) { h.dash--; dir = h.dashDir; h.vx = dir * 10; h.face = dir; }
        else { h.vx = dir * H.speed * slowed; if (dir) h.face = dir; }
        h.state = !ground ? 'jump' : dir ? 'walk' : 'idle';
        if (pr.u && ground) { h.vy = H.jump * (slowed < 1 ? 0.7 : 1); h.state = 'jump'; ev(s, { e: 'jump' }); }
      }
    }
    physics(h);
  }
  function physics(f) {
    f.x = clamp(f.x + f.vx, 20, W - 20);
    if (f.y > 0 || f.vy > 0) { f.vy -= GRAV; f.y += f.vy; if (f.y <= 0) { f.y = 0; f.vy = 0; } }
  }
  function startAtk(s, h, i) { h.state = 'atk'; h.ci = i; h.t = 0; h.buf = false; h.hitSet = new Set(); h.vx = 0; ev(s, { e: 'swing', who: h.id, i }); }
  function atkStep(s, h, H, pr) {
    const m = H.chain[h.ci]; h.t++;
    if (h.t === m.s) h.vx = h.face * 2.2; else h.vx *= 0.7;
    if (h.t > m.s && h.t <= m.s + m.a) hitbox(s, h, m.r, m.d, { kb: m.kb || 2.5, launch: m.launch, heavy: m.heavy, last: h.ci === H.chain.length - 1 });
    if (pr.z && h.t > 2) h.buf = true;
    if (h.buf && h.t >= m.s + m.a && h.ci < H.chain.length - 1) return startAtk(s, h, h.ci + 1);
    if (h.t >= m.s + m.a + m.c) h.state = 'idle';
  }
  // hit every enemy in front of the hero (once per move)
  function hitbox(s, h, reach, dmg, o) {
    const x0 = h.face > 0 ? h.x : h.x - reach, x1 = h.face > 0 ? h.x + reach : h.x;
    for (const e of s.enemies) {
      if (e.dead || h.hitSet?.has(e)) continue;
      const ey = e.y, top = e.y + e.h;
      const yLo = o.below ? h.y - 40 : h.y, yHi = h.y + (o.tall || 100);
      if (e.x + e.w / 2 < x0 || e.x - e.w / 2 > x1 || top < yLo || ey > yHi) continue;
      h.hitSet?.add(e); hitEnemy(s, e, dmg, { ...o, face: h.face, from: h });
    }
  }
  function special(s, h, H, k) {
    s.gauge -= COST; h.state = 'sp'; h.sp = k; h.t = 0; h.hitSet = new Set(); h.dash = 0;
    ev(s, { e: 'special', k, who: h.id });
    if (k === 'rise') { h.vy = 14; h.inv = 12; }
    if (k === 'slam' && h.y <= 0) h.vy = 9;
    if (k === 'counter') { h.state = 'stance'; h.t = 0; h.vx = -h.face * 6; }
    if (k === 'proj') shoot(s, h, H.proj);
  }
  function spStep(s, h) {
    h.t++;
    if (h.sp === 'proj') { h.vx = 0; if (h.t > 18) h.state = 'idle'; return; }
    if (h.sp === 'rise') { hitbox(s, h, 74, 20, { kb: 2, launch: 14, breaker: true, tall: 140 }); if (h.t > 8 && h.y <= 0) h.state = 'idle'; return; }
    if (h.sp === 'slam') { // come down hard: shockwave on landing
      if (h.t > 8 && h.vy > -20) h.vy = Math.min(h.vy, -18);
      if (h.t > 8 && h.y <= 0) {
        for (const e of s.enemies) if (!e.dead && Math.abs(e.x - h.x) < 150 && e.y < 40) hitEnemy(s, e, 24, { kb: 6 * Math.sign(e.x - h.x || 1), launch: 9, face: Math.sign(e.x - h.x) || 1, breaker: true, heavy: true, from: h });
        ev(s, { e: 'quake', x: h.x }); s.freeze = 4; h.state = 'idle';
      }
      return;
    }
    if (h.sp === 'rush') { // dash through everything in the way
      h.vx = h.face * (h.t < 16 ? 14 : 2); h.inv = 4;
      hitbox(s, h, 50, 18, { kb: 7, launch: 5, heavy: true });
      if (h.t > 22) h.state = 'idle';
    }
  }
  function shoot(s, h, k) {
    const y = h.y + 56;
    if (k === 'wave') s.shots.push({ k, own: 'h', x: h.x + h.face * 30, y, vx: h.face * 11, vy: 0, life: 60, dmg: 22, w: 30, h: 80, pierce: true, hit: new Set(), kb: 6 });
    if (k === 'shuriken') for (const vy of [0, 1.2, -1.2]) s.shots.push({ k, own: 'h', x: h.x + h.face * 30, y: y + vy * 6, vx: h.face * 12, vy, life: 50, dmg: 10, w: 20, h: 20, hit: new Set(), kb: 3 });
    if (k === 'quake') s.shots.push({ k, own: 'h', x: h.x + h.face * 30, y: 0, vx: h.face * 9, vy: 0, life: 50, dmg: 18, w: 40, h: 50, pierce: true, hit: new Set(), launch: 9, ground: true, breaker: true });
    if (k === 'laser') { // instant beam
      for (const e of s.enemies) if (!e.dead && (e.x - h.x) * h.face > 0 && Math.abs(e.x - h.x) < 760 && e.y < y && e.y + e.h > y - 30) hitEnemy(s, e, 24, { kb: 4 * h.face, face: h.face, from: h });
      s.shots.push({ k, own: 'fx', x: h.x + h.face * 30, y, vx: 0, vy: 0, life: 12, face: h.face, dmg: 0, w: 0, h: 0 });
    }
    ev(s, { e: 'shoot', k });
  }
  function tag(s, h, next) {
    const comboTag = s.frame - s.lastHitT < 45;
    h.out = true; next.out = false; s.cur = s.team.indexOf(next); s.tagCd = 45;
    Object.assign(next, { x: h.x, y: h.y, vx: 0, vy: Math.max(0, h.vy), face: h.face, state: 'idle', dash: 0, stuck: 0, inv: 20 });
    h.state = 'idle'; h.stuck = 0;
    ev(s, { e: 'tag', who: next.id, combo: comboTag });
    if (comboTag) { // tag combo: the new hero flies in with a dropkick on the nearest enemy
      const tgt = s.enemies.filter((e) => !e.dead && !e.under).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
      if (tgt && Math.abs(tgt.x - h.x) < 320) {
        next.face = Math.sign(tgt.x - h.x) || 1; next.x = clamp(tgt.x - next.face * (tgt.w / 2 + 34), 20, W - 20);
        next.state = 'tagin'; next.t = 0; s.gauge = Math.min(100, s.gauge + 10); s.score += 300;
        hitEnemy(s, tgt, 24, { kb: 8 * next.face, launch: 8, face: next.face, breaker: true, heavy: true, from: next });
      }
    }
  }

  // ---------- damage ----------
  function hitEnemy(s, e, dmg, o) {
    if (e.dead || e.under || (e.inv > 0 && !o.force)) return;
    const front = Math.sign((o.from?.x ?? e.x - o.face) - e.x) === e.face;
    if (e.k === 'boss') {
      if (e.move === 'shell' && e.mt > 10 && front && !o.breaker) { // shell up: only launchers, slams and tag kicks get through
        ev(s, { e: 'clang', x: e.x - e.face * -e.w / 2, y: e.y + e.h / 2 });
        if (e.def.spiky && o.from && Math.abs(o.from.x - e.x) < e.w) heroHurt(s, o.from, 8, { kb: 6, face: -o.face });
        return;
      }
      if (e.move === 'shell' && o.breaker) { e.move = null; e.dizzy = 80; ev(s, { e: 'break', x: e.x, y: e.y + e.h / 2 }); }
      if (e.move === 'counter' && e.mt > 6 && o.from?.id) { // melee only: specials from range get through // the dark one reads your attack
        const h = o.from; e.x = clamp(h.x - h.face * 60, 30, W - 30); e.face = h.face; e.move = null; e.cd = 30;
        ev(s, { e: 'counter', x: h.x, y: h.y + 60, by: 'boss' }); heroHurt(s, h, 22, { kb: 9, launch: 6, face: e.face }); return;
      }
    }
    e.hp -= dmg; s.score += dmg; s.gauge = Math.min(100, s.gauge + dmg * 0.7);
    s.combo++; s.comboT = 100; s.maxCombo = Math.max(s.maxCombo, s.combo); s.lastHitT = s.frame;
    const big = dmg >= 18;
    s.freeze = big ? 6 : 3;
    ev(s, { e: 'hit', x: e.x, y: e.y + e.h * 0.6, dmg, big, combo: s.combo });
    if (e.k === 'boss') {
      e.stag += dmg;
      if (e.stag > 110 && !e.dizzy) { e.dizzy = 90; e.move = null; e.stag = 0; ev(s, { e: 'stagger', x: e.x, y: e.y + e.h }); }
      if (e.hp <= 0) { e.hp = 0; e.dizzy = 0; e.move = null; s.enemies.forEach((m) => { if (m.k !== 'boss') m.dead = m.gone = true; }); s.finT = 300; to(s, 'finisher'); s.score += 3000; ev(s, { e: 'bossdown' }); }
      return;
    }
    if (e.carry) { const c = e.carry; c.state = 'run'; c.dir = c.x < W / 2 ? 1 : -1; c.panic = 60; e.carry = null; ev(s, { e: 'free', x: c.x }); }
    const M = MOBS[e.k];
    if (!M.armor || o.heavy || o.launch >= 8) {
      e.vx = (o.kb || 2.5) * o.face;
      if (o.launch || e.y > 0) { e.vy = Math.max(e.vy, o.launch || 4); e.state = 'air'; } else { e.state = 'hurt'; e.t = 16; }
    }
    if (e.hp <= 0) { e.dead = true; e.state = e.y > 0 ? 'air' : 'down'; e.t = 40; s.kills++; s.score += 100 + Math.min(500, s.combo * 10); if (s.phase === 'defend') s.city = Math.min(100, s.city + 1.6); ev(s, { e: 'ko', x: e.x }); }
  }
  function heroHurt(s, h, dmg, o = {}) {
    dmg = Math.round(dmg * (1.25 + 0.1 * (s.stage - 1))); // later stages hit harder
    if (!h || h.ko || h.out || h.inv > 0 || s.phase !== 'defend' && s.phase !== 'boss' && s.phase !== 'bossIntro') return false;
    if (h.state === 'stance') { // counter!
      const tgt = o.src || s.enemies.filter((e) => !e.dead).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
      if (tgt) { h.x = clamp(tgt.x - (o.face || 1) * (tgt.w / 2 + 30), 20, W - 20); h.face = Math.sign(tgt.x - h.x) || 1; hitEnemy(s, tgt, 40, { kb: 8 * h.face, launch: 8, face: h.face, breaker: true, heavy: true, force: true, from: h }); }
      h.state = 'idle'; h.inv = 30; s.slow = 30; ev(s, { e: 'counter', x: h.x, y: h.y + 60, by: 'hero' }); return false;
    }
    const front = o.face ? -o.face === h.face : true;
    if (h.state === 'guard' && front && !o.unblockable) { dmg = Math.ceil(dmg * 0.2); h.vx = (o.face || -h.face) * 4; ev(s, { e: 'guard', x: h.x, y: h.y + 60 }); h.hp -= dmg; s.gauge = Math.min(100, s.gauge + 3); return true; }
    h.hp -= dmg; s.gauge = Math.min(100, s.gauge + 5); s.combo = 0; s.comboT = 0;
    h.dash = 0; h.hitSet = null;
    ev(s, { e: 'ouch', x: h.x, y: h.y + 70, dmg });
    if (h.hp <= 0) {
      h.hp = 0; h.ko = true; h.state = 'ko'; h.vy = 8; h.vx = (o.face || -h.face) * 4; s.kos++; ev(s, { e: 'heroKO', who: h.id });
      const next = s.team.find((x) => !x.ko);
      if (!next) { to(s, 'over'); s.result = 'lose'; ev(s, { e: 'over' }); }
      else { h.out = true; next.out = false; s.cur = s.team.indexOf(next); Object.assign(next, { x: h.x, y: 0, vx: 0, vy: 0, state: 'idle', inv: 90 }); ev(s, { e: 'tag', who: next.id }); }
      return true;
    }
    if (o.launch) { h.state = 'down'; h.t = 50; h.vy = o.launch; h.vx = (o.face || -h.face) * (o.kb || 5); h.inv = 0; }
    else { h.state = 'hurt'; h.t = 18; h.vx = (o.face || -h.face) * (o.kb || 3); }
    h.inv = Math.max(h.inv, 12);
    return true;
  }

  // ---------- defend phase: civilians flee, grunts chase them ----------
  function defendStep(s) {
    const st = s.st, live = s.enemies.filter((e) => !e.dead).length;
    s.city = Math.min(100, s.city + 0.035);
    if (--s.spawnT <= 0 && live < st.max) {
      s.spawnT = st.every + Math.floor(s.rng() * 40);
      const k = st.mobs[Math.floor(s.rng() * st.mobs.length)], side = s.rng() < 0.5 ? -1 : 1;
      const x = side < 0 ? Math.max(-30, s.camX - 40) : Math.min(W + 30, s.camX + VIEW + 40);
      spawn(s, k, x, s.rng() < 0.5);
    }
    if (--s.civT <= 0) {
      s.civT = 150 + Math.floor(s.rng() * 120);
      const dir = s.rng() < 0.5 ? 1 : -1, kind = ['suit', 'kid', 'granny', 'suit', 'dog', 'student'][Math.floor(s.rng() * 6)];
      s.civs.push({ x: dir > 0 ? -20 : W + 20, dir, kind, speed: { granny: 1.0, kid: 2.2, dog: 2.6 }[kind] || 1.6, state: 'run', panic: 0 });
    }
    if (s.city >= 100) { // the city held: here comes the boss
      to(s, 'bossIntro');
      for (const e of s.enemies) if (!e.dead) { e.state = 'flee'; if (e.carry) { e.carry.state = 'run'; e.carry = null; } }
      const B = s.bossDef, hx = hero(s).x, x = hx < W / 2 ? Math.min(W - 80, hx + 520) : Math.max(80, hx - 520);
      s.enemies.push({ k: 'boss', def: B, x, y: 0, vx: 0, vy: 0, face: -1, hp: B.hp, max: B.hp, w: B.w, h: B.h, move: null, mt: 0, cd: 120, stag: 0, dizzy: 0, inv: 0, ki: 0, state: 'idle' });
      ev(s, { e: 'bossIn', name: B.name });
    }
  }
  function spawn(s, k, x, chaser) {
    const M = MOBS[k], hpk = 1 + (s.stage - 1) * 0.12;
    s.enemies.push({ k, x, y: M.fly ? 90 : 0, vx: 0, vy: 0, face: x < W / 2 ? 1 : -1, hp: Math.round(M.hp * hpk), max: Math.round(M.hp * hpk), w: M.w, h: M.h, state: 'walk', t: 0, cd: 40 + Math.floor(s.rng() * 60), chaser, carry: null, inv: 0, sp: M.speed * (0.85 + s.rng() * 0.3) });
  }
  function civStep(s) {
    for (const c of s.civs) {
      if (c.state === 'run') {
        c.x += c.dir * c.speed * (c.panic > 0 ? 1.8 : 1); if (c.panic > 0) c.panic--;
        if (c.x < -30 || c.x > W + 30) { c.state = 'safe'; s.saved++; s.score += 200; if (s.phase === 'defend') s.city = Math.min(100, s.city + 5); ev(s, { e: 'saved' }); }
      }
    }
    s.civs = s.civs.filter((c) => c.state !== 'safe' && c.state !== 'lost');
  }

  // ---------- enemies ----------
  function enemyStep(s, e) {
    if (e.inv > 0) e.inv--;
    if (e.k === 'boss') return bossStep(s, e);
    const M = MOBS[e.k], h = hero(s);
    if (e.dead) { // fall, lie there, vanish
      if (e.state === 'air') { e.vy -= GRAV; e.y += e.vy; e.x += e.vx; if (e.y <= 0) { e.y = 0; e.state = 'down'; e.t = 40; } }
      else if (--e.t <= 0) e.gone = true;
      return;
    }
    switch (e.state) {
      case 'hurt': e.x += e.vx; e.vx *= 0.85; if (--e.t <= 0) e.state = 'walk'; return;
      case 'air': e.x = clamp(e.x + e.vx, -40, W + 40); e.vy -= GRAV; e.y += e.vy; if (e.y <= (M.fly ? 60 : 0) && e.vy < 0) { e.y = M.fly ? 60 : 0; e.state = M.fly ? 'walk' : 'down'; e.t = 34; e.vx = 0; } return;
      case 'down': if (--e.t <= 0) e.state = 'walk'; return;
      case 'flee': e.x += (e.x < W / 2 ? -1 : 1) * 3; if (e.x < -60 || e.x > W + 60) e.gone = true; return;
      case 'wind': if (--e.t <= 0) { e.state = 'strike'; e.t = 8; if (M.ranged) { s.shots.push({ k: 'arrow', own: 'e', x: e.x + e.face * 20, y: 60, vx: e.face * 8, vy: 0, life: 120, dmg: M.dmg, w: 26, h: 8, hit: new Set() }); ev(s, { e: 'shoot', k: 'arrow' }); } } return;
      case 'strike':
        if (!M.ranged && Math.abs(h.x - (e.x + e.face * M.reach / 2)) < M.reach / 2 + 18 && h.y < e.y + e.h * 0.9 && !h.out) heroHurt(s, h, M.dmg, { face: e.face, kb: e.k === 'brute' ? 8 : 3, launch: e.k === 'brute' ? 7 : 0, src: e });
        if (--e.t <= 0) { e.state = 'rec'; e.t = 24; e.cd = 30 + Math.floor(s.rng() * 40); }
        return;
      case 'rec': if (--e.t <= 0) e.state = 'walk'; return;
    }
    // walk: carry a civilian away, chase one, or go for the hero
    if (e.cd > 0) e.cd--;
    if (e.carry) {
      const dir = e.x < W / 2 ? -1 : 1; e.face = dir; e.x += dir * 2.1; e.carry.x = e.x; e.carry.y = e.y + e.h + 4;
      if (e.x < -40 || e.x > W + 40) { e.carry.state = 'lost'; e.carry = null; e.gone = true; s.lost++; s.score -= 100; s.city = Math.max(0, s.city - 8); ev(s, { e: 'lost' }); }
      return;
    }
    const runners = s.civs.filter((c) => c.state === 'run' && Math.abs(c.x - e.x) < 500);
    let tx, civ = null;
    if (e.chaser && runners.length && s.phase === 'defend' && !M.fly) { civ = runners.sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0]; tx = civ.x; }
    else tx = h.x;
    const dx = tx - e.x; e.face = Math.sign(dx) || e.face;
    if (civ) {
      if (Math.abs(dx) < 18) { civ.state = 'carried'; e.carry = civ; ev(s, { e: 'grab', x: e.x }); return; }
      e.x += Math.sign(dx) * e.sp * 1.1;
      return;
    }
    if (M.ranged) { // keep a distance and shoot
      const d = Math.abs(dx);
      if (d < 260) e.x -= Math.sign(dx) * e.sp; else if (d > 380) e.x += Math.sign(dx) * e.sp;
      if (e.cd <= 0 && d < 520) { e.state = 'wind'; e.t = M.wind; }
      return;
    }
    if (M.fly) { e.y = 60 + Math.sin((s.frame + e.x) / 20) * 20; }
    const range = M.reach * 0.8;
    if (Math.abs(dx) > range) e.x += Math.sign(dx) * e.sp;
    else if (e.cd <= 0 && !h.out) { e.state = 'wind'; e.t = M.wind; }
  }

  // ---------- bosses ----------
  function bossStep(s, b) {
    const h = hero(s), D = b.def, fast = D.enrage && b.hp < b.max / 2 ? 0.7 : 1;
    if (s.phase === 'bossIntro') { if (Math.abs(b.x - h.x) > 300) b.x += Math.sign(h.x - b.x) * 2; b.face = Math.sign(h.x - b.x) || -1; return; }
    if ((b.y > 0 || b.vy > 0) && !b.fly) { b.vy -= GRAV; b.y += b.vy; if (b.y <= 0) { b.y = 0; b.vy = 0; } }
    if (b.dizzy > 0) { b.dizzy--; b.tele = false; return; }
    if (b.stag > 0) b.stag = Math.max(0, b.stag - 0.25);
    if (!b.move) {
      b.tele = false;
      const want = ['volley', 'shoot', 'web', 'summon', 'honey'].includes(D.kit[b.ki % D.kit.length]) ? 320 : 120, dx = h.x - b.x, d = Math.abs(dx);
      b.face = Math.sign(dx) || b.face;
      if (d > want + 40) b.x += Math.sign(dx) * 2.2; else if (d < want - 60) b.x -= Math.sign(dx) * 1.6;
      b.x = clamp(b.x, b.w / 2, W - b.w / 2);
      if (--b.cd <= 0) { b.move = D.kit[b.ki++ % D.kit.length]; if (s.rng() < 0.3) b.ki++; b.mt = 0; ev(s, { e: 'bossMove', k: b.move }); }
      return;
    }
    b.mt++;
    const T = (n) => Math.round(n * fast), done = () => { b.move = null; b.tele = false; b.cd = T(28 + s.rng() * 26); b.fly = false; b.under = false; b.vx = 0; };
    const touch = (r, dmg, o) => { if (Math.abs(h.x - b.x) < r + 20 && h.y < b.y + b.h) heroHurt(s, h, dmg, { face: Math.sign(h.x - b.x) || 1, ...o }); };
    switch (b.move) {
      case 'swipe': // claws in front
        b.tele = b.mt < T(24);
        if (b.mt < T(24) && Math.abs(h.x - b.x) > b.w / 2 + 70) b.x += Math.sign(h.x - b.x) * 3;
        if (b.mt === T(24)) { ev(s, { e: 'whoosh', x: b.x }); if ((h.x - b.x) * b.face > 0 && Math.abs(h.x - b.x) < b.w / 2 + 110 && h.y < b.h) heroHurt(s, h, 18, { face: b.face, kb: 8, src: b }); }
        if (b.mt > T(50)) done(); break;
      case 'charge': // rolls across the screen: jump over it
        b.tele = b.mt < T(40);
        if (b.mt < T(40)) b.face = Math.sign(h.x - b.x) || b.face;
        else { b.x += b.face * 11; if (!b.hitDone && Math.abs(h.x - b.x) < b.w / 2 + 16 && h.y < b.h * 0.7) { b.hitDone = heroHurt(s, h, 22, { face: b.face, kb: 9, launch: 8 }); }
          if (b.x < b.w / 2 || b.x > W - b.w / 2 || b.mt > T(40) + 110) { b.x = clamp(b.x, b.w / 2, W - b.w / 2); b.hitDone = false; done(); ev(s, { e: 'thud', x: b.x }); } }
        break;
      case 'stomp': // leap and shake the ground: be in the air when it lands
        b.tele = b.mt < T(30);
        if (b.mt === T(30)) { b.vy = 15; b.vx = clamp((h.x - b.x) / 38, -7, 7); }
        if (b.mt > T(30)) { b.x = clamp(b.x + b.vx, b.w / 2, W - b.w / 2); if (b.y === 0 && b.mt > T(32)) {
          ev(s, { e: 'quake', x: b.x, boss: true }); s.freeze = 5;
          if (Math.abs(h.x - b.x) < 320 && h.y < 8) heroHurt(s, h, 18, { face: Math.sign(h.x - b.x) || 1, kb: 6, launch: 6, unblockable: true });
          done(); } }
        break;
      case 'volley': {
        b.tele = b.mt < T(30);
        if (b.mt === T(30)) {
          const k = D.vol, y0 = b.y + b.h * 0.6;
          if (k === 'spine') for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; s.shots.push({ k, own: 'e', x: b.x, y: y0, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, life: 90, dmg: 10, w: 16, h: 16, hit: new Set(), nograv: true }); }
          else if (k === 'rock') for (const v of [5, 7.5, 10]) s.shots.push({ k, own: 'e', x: b.x, y: y0, vx: b.face * v, vy: 9, life: 140, dmg: 12, w: 26, h: 26, hit: new Set(), grav: true });
          else if (k === 'web') s.shots.push({ k, own: 'e', x: b.x, y: 60, vx: b.face * 6, vy: 0, life: 150, dmg: 5, w: 40, h: 40, hit: new Set(), web: true });
          else for (const vy of [-1.8, 0, 1.8]) s.shots.push({ k, own: 'e', x: b.x, y: y0 - 20, vx: b.face * 8, vy: vy + (40 - y0) / 80, life: 120, dmg: 11, w: 24, h: 10, hit: new Set(), nograv: true });
          ev(s, { e: 'shoot', k });
        }
        if (b.mt > T(60)) done(); break;
      }
      case 'dive': // flies off screen, a shadow marks the spot, then crashes down
        if (b.mt < 30) { b.fly = true; b.y += 20; }
        else if (b.mt < T(30) + 50) { b.y = 700; b.mark = h.x; b.tele = true; }
        else { b.x = b.mark; b.tele = false; b.y -= 26; if (b.y <= 0) { b.y = 0; ev(s, { e: 'quake', x: b.x, boss: true }); s.freeze = 5; if (Math.abs(h.x - b.x) < b.w / 2 + 50) heroHurt(s, h, 26, { face: Math.sign(h.x - b.x) || 1, kb: 7, launch: 8, unblockable: true }); done(); } }
        break;
      case 'burrow': // hides underground, a dust trail follows you, then it bursts up
        if (b.mt === 20) { b.under = true; ev(s, { e: 'dig', x: b.x }); }
        if (b.mt > 20 && b.mt < T(90)) b.x += clamp(h.x - b.x, -4, 4);
        b.tele = b.mt > T(90);
        if (b.mt === T(115)) { b.under = false; ev(s, { e: 'erupt', x: b.x }); if (Math.abs(h.x - b.x) < 80 && h.y < 60) heroHurt(s, h, 24, { face: Math.sign(h.x - b.x) || 1, kb: 4, launch: 12, unblockable: true }); }
        if (b.mt > T(140)) done(); break;
      case 'shell': // turtle shell / puffer inflate: hit it from behind, or launch it
        b.tele = false;
        if (b.mt > T(130)) done(); break;
      case 'web':
        b.tele = b.mt < T(25);
        if (b.mt === T(25)) { s.shots.push({ k: 'web', own: 'e', x: b.x, y: 60, vx: b.face * 6, vy: 0, life: 150, dmg: 5, w: 40, h: 40, hit: new Set(), web: true }); ev(s, { e: 'shoot', k: 'web' }); }
        if (b.mt > T(50)) done(); break;
      case 'summon':
        b.tele = b.mt < T(30);
        if (b.mt === T(30) && s.enemies.filter((e) => e.k !== 'boss' && !e.dead).length < 4) { for (let i = 0; i < 2; i++) spawn(s, D.minion || 'grunt', clamp(b.x + (i ? 80 : -80), 30, W - 30), false); ev(s, { e: 'summon', x: b.x }); }
        if (b.mt > T(55)) done(); break;
      case 'honey': // sticky pools that slow you down
        b.tele = b.mt < T(25);
        if (b.mt === T(25)) { for (const v of [4, 7]) s.shots.push({ k: 'honey', own: 'e', x: b.x, y: b.h * 0.6, vx: Math.sign(h.x - b.x) * v, vy: 8, life: 140, dmg: 6, w: 24, h: 24, hit: new Set(), grav: true, pool: true }); ev(s, { e: 'shoot', k: 'honey' }); }
        if (b.mt > T(50)) done(); break;
      case 'dash': // the dark one rushes through you
        b.tele = b.mt < T(20);
        if (b.mt >= T(20) && b.mt < T(20) + 18) { b.x = clamp(b.x + b.face * 15, b.w / 2, W - b.w / 2); if (!b.hitDone && Math.abs(h.x - b.x) < 50 && h.y < b.h) b.hitDone = heroHurt(s, h, 20, { face: b.face, kb: 7, launch: 5 }); }
        if (b.mt > T(20) + 34) { b.hitDone = false; done(); } break;
      case 'shoot':
        b.tele = b.mt < T(22);
        if (b.mt === T(22)) { s.shots.push({ k: 'darkwave', own: 'e', x: b.x + b.face * 30, y: 56, vx: b.face * 10, vy: 0, life: 90, dmg: 15, w: 30, h: 80, hit: new Set() }); ev(s, { e: 'shoot', k: 'darkwave' }); }
        if (b.mt > T(45)) done(); break;
      case 'counter': // a stance: hit it and it hits back (use specials from range)
        if (b.mt > T(60)) done(); break;
      default: done();
    }
  }

  // ---------- projectiles ----------
  function shotStep(s) {
    const h = hero(s);
    for (const p of s.shots) {
      p.life--; p.x += p.vx;
      if (p.grav) { p.vy -= 0.5; } p.y += p.vy;
      if (p.grav && p.y <= 0) { p.y = 0; p.life = 0; if (p.pool) s.pools.push({ x: p.x, w: 120, life: 420 }); if (p.k === 'rock') ev(s, { e: 'thud', x: p.x }); }
      if (p.own === 'h') {
        for (const e of s.enemies) {
          if (e.dead || p.hit.has(e) || e.under) continue;
          if (Math.abs(e.x - p.x) < e.w / 2 + p.w / 2 && p.y + p.h / 2 > e.y && p.y - p.h / 2 < e.y + e.h) {
            p.hit.add(e); hitEnemy(s, e, p.dmg, { kb: p.kb || 3, launch: p.launch, face: Math.sign(p.vx) || 1, breaker: p.breaker, heavy: p.breaker, from: { x: p.x - p.vx * 20, face: Math.sign(p.vx) } });
            if (!p.pierce) { p.life = 0; break; }
          }
        }
      } else if (p.own === 'e' && !h.out && !p.hit.has(h)) {
        if (Math.abs(h.x - p.x) < 20 + p.w / 2 && p.y > h.y && p.y < h.y + 100) {
          p.hit.add(h);
          const hit = heroHurt(s, h, p.dmg, { face: Math.sign(p.vx) || 1, kb: 3 });
          if (hit && p.web && h.state !== 'guard') { h.stuck = 90; ev(s, { e: 'stuck' }); }
          p.life = 0;
        }
      }
      if (p.x < -60 || p.x > W + 60) p.life = 0;
    }
    s.shots = s.shots.filter((p) => p.life > 0);
  }

  // ======================================================================
  // GIANT ROBOT BATTLE
  // ======================================================================
  const ROBO = {
    saber: { z: { dmg: [32, 44], reach: 250, s: 12, a: 6, c: 18 }, x: 'slash' },
    blaster: { z: { shot: 18, cd: 14 }, x: 'beam' },
    drill: { z: { dmg: [58], reach: 230, s: 20, a: 7, c: 26, breaker: true }, x: 'fist' },
  };
  function startRobot(s) {
    const pilot = s.team.find((h) => !h.ko) || s.team[0], kit = [...new Set(s.bossDef.kit.map((k) => GIANT[k]))];
    while (kit.length < 3) kit.push(['swipe', 'stomp', 'beam'].find((k) => !kit.includes(k)));
    s.robo = { x: 380, y: 0, vy: 0, face: 1, hp: 600, max: 600, state: 'idle', t: 0, ci: 0, buf: false, charge: 0, pilot: pilot.id, cd: 0, inv: 0, swCd: 0, hitDone: false };
    s.giant = { x: 1050, y: 0, vy: 0, face: -1, hp: 700 + s.stage * 80, max: 700 + s.stage * 80, w: 220, h: 330, move: null, mt: 0, cd: 120, ki: 0, kit, tele: false, stag: 0, dizzy: 0 };
    s.buildings = [100, 280, 470, 660, 850, 1040, 1230].map((x, i) => ({ x, w: 120 + (i % 3) * 20, h: 180 + ((i * 53) % 120), hp: 3 }));
    s.shots = []; s.pools = [];
  }
  function roboStep(s, inp, pr) {
    if (s.phase === 'grow') { if (s.t === 1) startRobot(s); if (s.t > 170 || (s.t > 40 && (pr.z || pr.x))) to(s, 'robot'); return; }
    const r = s.robo, g = s.giant;
    if (s.phase === 'final') { if (pr.x || pr.z) { to(s, 'finalAnim'); ev(s, { e: 'finalStrike' }); s.score += 2000; } else if (s.t > 360) { g.hp = Math.round(g.max * 0.12); to(s, 'robot'); } return; }
    if (s.phase === 'finalAnim') { if (s.t === 60) ev(s, { e: 'boom', x: g.x, y: 160, big: true }); if (s.t > 140) clear(s); return; }
    const K = ROBO[HEROES[r.pilot].robo];
    if (r.inv > 0) r.inv--; if (r.cd > 0) r.cd--; if (r.swCd > 0) r.swCd--;
    // switch pilot: the robot's arms change
    if (pr.c && r.swCd <= 0 && r.state !== 'hurt') {
      const pilots = s.team.filter((h) => !h.ko).map((h) => h.id), i = pilots.indexOf(r.pilot);
      if (pilots.length > 1) { r.pilot = pilots[(i + 1) % pilots.length]; r.swCd = 60; ev(s, { e: 'pilot', who: r.pilot }); }
    }
    const ground = r.y <= 0;
    if (r.state === 'hurt') { if (--r.t <= 0) r.state = 'idle'; r.x += r.vx; r.vx *= 0.9; }
    else if (r.state === 'atk') {
      const m = K.z; r.t++;
      if (r.t > m.s && r.t <= m.s + m.a && !r.hitDone && (g.x - r.x) * r.face > 0 && Math.abs(g.x - r.x) < m.reach + g.w / 2 - 40) { r.hitDone = true; giantHurt(s, m.dmg[r.ci], { breaker: m.breaker }); }
      if (pr.z && r.t > 4) r.buf = true;
      if (r.buf && r.t >= m.s + m.a && r.ci < m.dmg.length - 1) { r.ci++; r.t = 0; r.buf = false; r.hitDone = false; ev(s, { e: 'roboSwing' }); }
      else if (r.t >= m.s + m.a + m.c) r.state = 'idle';
    } else if (r.state === 'charge') {
      r.charge = Math.min(90, r.charge + 1);
      if (!inp.x) { // release
        const c = r.charge; r.state = 'big'; r.t = 0; ev(s, { e: 'roboSpecial', k: K.x, c });
        if (K.x === 'slash') { if ((g.x - r.x) * r.face > 0 && Math.abs(g.x - r.x) < 300 + g.w / 2) giantHurt(s, 40 + c * 0.9, { breaker: c > 60 }); }
        else s.shots.push({ k: K.x === 'beam' ? 'robobeam' : 'rocketfist', own: 'r', x: r.x + r.face * 120, y: 180, vx: r.face * (K.x === 'beam' ? 20 : 13), vy: 0, life: 80, dmg: (K.x === 'beam' ? 34 : 46) + c * 0.8, w: 60, h: 60, breaker: c > 60 || K.x === 'fist' });
        r.charge = 0;
      }
    } else if (r.state === 'big') { if (++r.t > 24) r.state = 'idle'; }
    else { // idle / walk / guard
      r.state = 'idle';
      if (inp.d && ground) { r.state = 'guard'; }
      else {
        const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0); r.x = clamp(r.x + dir * 3.2, 90, W - 90); if (dir) { r.face = dir; r.state = 'walk'; }
        if (pr.u && ground) { r.vy = 13; ev(s, { e: 'thrust' }); }
        if (pr.z) {
          if (K.z.shot) { if (r.cd <= 0) { s.shots.push({ k: 'roboshot', own: 'r', x: r.x + r.face * 110, y: 200, vx: r.face * 16, vy: 0, life: 70, dmg: K.z.shot, w: 30, h: 20 }); r.cd = K.z.cd; ev(s, { e: 'shoot', k: 'roboshot' }); } }
          else { r.state = 'atk'; r.t = 0; r.ci = 0; r.buf = false; r.hitDone = false; ev(s, { e: 'roboSwing' }); }
        } else if (pr.x) { r.state = 'charge'; r.charge = 0; }
      }
    }
    if (r.y > 0 || r.vy > 0) { r.vy -= 0.55; r.y += r.vy; if (r.y <= 0) { r.y = 0; r.vy = 0; ev(s, { e: 'thud', x: r.x }); } }
    if (Math.abs(g.x - r.x) < 190) r.x = clamp(g.x - Math.sign(g.x - r.x || 1) * 190, 90, W - 90); // can't walk through it
    giantStep(s, r, g);
    for (const p of s.shots) {
      p.life--; p.x += p.vx;
      if (p.own === 'r' && Math.abs(p.x - g.x) < g.w / 2) { p.life = 0; giantHurt(s, p.dmg, { breaker: p.breaker }); }
      if (p.own === 'g' && !p.done && Math.abs(p.x - r.x) < 90 && r.y < 160) { p.done = true; p.life = 0; roboHurt(s, p.dmg, Math.sign(p.vx), p.x); }
      if (p.own === 'g' && p.life <= 0 && !p.done) cityHit(s, p.x, 130); // missed you, hit the city
    }
    s.shots = s.shots.filter((p) => p.life > 0);
    s.camX = clamp((r.x + g.x) / 2 - VIEW / 2, 0, W - VIEW);
  }
  function giantHurt(s, dmg, o = {}) {
    const g = s.giant; dmg = Math.round(dmg);
    if (g.move === 'guard' && g.mt > 10 && !o.breaker) { ev(s, { e: 'clang', x: g.x - g.face * -90, y: 200, robo: true }); return; }
    if (g.move === 'guard' && o.breaker) { g.move = null; g.dizzy = 80; ev(s, { e: 'break', x: g.x, y: 200 }); }
    g.hp -= dmg; s.score += dmg; g.stag += dmg; s.freeze = dmg > 40 ? 7 : 4;
    ev(s, { e: 'hit', x: g.x - g.face * -40, y: 180 + Math.random() * 100, dmg, big: dmg > 40, robo: true });
    if (g.stag > 160 && !g.dizzy) { g.dizzy = 90; g.move = null; g.stag = 0; ev(s, { e: 'stagger', x: g.x, y: g.h }); }
    if (g.hp <= 0) { g.hp = 0; g.move = null; to(s, 'final'); ev(s, { e: 'giantdown' }); }
  }
  function roboHurt(s, dmg, face, at) {
    const r = s.robo; if (r.inv > 0 || s.phase !== 'robot') return;
    dmg = Math.round(dmg * (1 + 0.06 * (s.stage - 1)));
    if (r.state === 'guard' && Math.sign(at - r.x) === r.face) { r.hp -= Math.ceil(dmg * 0.25); r.x -= r.face * 18; ev(s, { e: 'guard', x: r.x + r.face * 80, y: 180, robo: true, saved: true }); }
    else { r.hp -= dmg; r.state = 'hurt'; r.t = 24; r.vx = face * 5; r.inv = 20; ev(s, { e: 'ouch', x: r.x, y: 220, dmg, robo: true }); }
    if (r.hp <= 0) { r.hp = 0; to(s, 'over'); s.result = 'lose'; ev(s, { e: 'over' }); }
  }
  // a giant attack that misses the robot lands on the buildings behind
  function cityHit(s, x, rad) {
    for (const b of s.buildings) if (b.hp > 0 && Math.abs(b.x - x) < rad + b.w / 2) { b.hp--; ev(s, { e: 'building', x: b.x, down: b.hp <= 0 }); }
  }
  function giantStep(s, r, g) {
    if (g.dizzy > 0) { g.dizzy--; g.tele = false; return; }
    if (g.stag > 0) g.stag = Math.max(0, g.stag - 0.4);
    const dx = r.x - g.x, d = Math.abs(dx), fast = g.hp < g.max / 2 ? 0.8 : 1, T = (n) => Math.round(n * fast);
    if (!g.move) {
      g.tele = false; g.face = Math.sign(dx) || g.face;
      if (d > 290) g.x += Math.sign(dx) * 1.6; else if (d < 210) g.x -= Math.sign(dx) * 1.2;
      g.x = clamp(g.x, 140, W - 140);
      if (--g.cd <= 0) { g.move = g.kit[g.ki++ % g.kit.length]; g.mt = 0; ev(s, { e: 'bossMove', k: g.move, giant: true }); }
      return;
    }
    g.mt++;
    const done = () => { g.move = null; g.tele = false; g.cd = T(50 + Math.random() * 40); g.vx = 0; };
    const inFront = (reach) => (r.x - g.x) * g.face > 0 && Math.abs(r.x - g.x) < reach;
    switch (g.move) {
      case 'swipe':
        g.tele = g.mt < T(48);
        if (g.mt === T(48)) { ev(s, { e: 'whoosh', x: g.x, robo: true }); if (inFront(380) && r.y < 120) roboHurt(s, 42, g.face, g.x); else cityHit(s, g.x + g.face * 260, 90); }
        if (g.mt > T(80)) done(); break;
      case 'charge':
        g.tele = g.mt < T(55);
        if (g.mt >= T(55)) { g.x += g.face * 9; if (!g.hitDone && Math.abs(r.x - g.x) < 200 && r.y < 150) { g.hitDone = true; roboHurt(s, 50, g.face, g.x); }
          if (g.x < 140 || g.x > W - 140 || g.mt > T(55) + 120) { if (!g.hitDone) cityHit(s, clamp(g.x, 140, W - 140), 100); g.x = clamp(g.x, 140, W - 140); g.hitDone = false; done(); ev(s, { e: 'thud', x: g.x }); } }
        else g.face = Math.sign(dx) || g.face;
        break;
      case 'stomp': // shockwave along the ground: thrust up (↑) to dodge it, but the city shakes
        g.tele = g.mt < T(50);
        if (g.mt === T(50)) { ev(s, { e: 'quake', x: g.x, giant: true }); s.freeze = 6; if (r.y < 20 && d < 650) roboHurt(s, 38, Math.sign(dx) || 1, g.x); else cityHit(s, g.x, 220); }
        if (g.mt > T(80)) done(); break;
      case 'volley':
        g.tele = g.mt < T(45);
        if (g.mt === T(45) || g.mt === T(60) || g.mt === T(75)) { s.shots.push({ k: 'giantshot', own: 'g', x: g.x + g.face * 120, y: 190, vx: g.face * 9, vy: 0, life: 150, dmg: 22 }); ev(s, { e: 'shoot', k: 'giantshot' }); }
        if (g.mt > T(95)) done(); break;
      case 'beam': // long telegraphed beam: guard it (saves the city) or jump it (the city takes it)
        g.tele = g.mt < T(70);
        if (g.mt === T(70)) { ev(s, { e: 'beam', x: g.x, face: g.face });
          if ((r.x - g.x) * g.face > 0 && r.y < 110) roboHurt(s, 60, g.face, g.x); else cityHit(s, g.x + g.face * 500, 300); }
        if (g.mt > T(100)) done(); break;
      case 'guard':
        if (g.mt > T(110)) done(); break;
      default: done();
    }
  }
  function clear(s) {
    const standing = s.buildings.filter((b) => b.hp > 0).length, noKO = !s.kos;
    s.bonus = { buildings: standing * 500, noKO: noKO ? 2000 : 0, combo: s.maxCombo * 20 };
    s.score = Math.max(0, s.score + s.bonus.buildings + s.bonus.noKO + s.bonus.combo);
    s.stars = 1 + (noKO ? 1 : 0) + (standing >= 5 && s.lost <= 1 ? 1 : 0);
    s.result = 'win'; to(s, 'clear'); ev(s, { e: 'clear' });
  }
  // continue into the boss part after the boss "grows"
  function startGrow(s) { to(s, 'grow'); }

  // ======================================================================
  // CPU player (demo, tests): hits things, jumps attacks it sees coming, swaps when hurt
  // ======================================================================
  function bot(s, mem = {}) {
    const inp = {}, P = s.phase;
    mem.f = (mem.f || 0) + 1;
    if (P === 'intro' || P === 'grow') { if (mem.f % 30 === 0) inp.z = true; return inp; }
    if (P === 'finisher' || P === 'final') { if (mem.f % 20 === 0) inp.x = true; return inp; }
    if (P === 'robot') {
      const r = s.robo, g = s.giant, dx = g.x - r.x, d = Math.abs(dx);
      if (g.move === 'stomp' && g.tele && g.mt > 18) { if (mem.f % 2) inp.u = true; return inp; }
      if ((g.tele && ['swipe', 'beam', 'charge', 'volley'].includes(g.move) && g.mt > 20) || s.shots.some((p) => p.own === 'g' && Math.abs(p.x - r.x) < 420)) { inp.d = true; return inp; }
      if (r.state === 'charge') { if (r.charge < 50) inp.x = true; return inp; }
      inp[dx > 0 ? 'r' : 'l'] = d > 270;
      if (d < 320 && mem.f % 5 === 0 && !(g.move === 'stomp')) { if (g.move === 'guard' && !g.dizzy) inp.x = true; else inp.z = true; }
      if (r.hp < r.max * 0.4 && mem.f % 400 === 0) inp.c = true;
      return inp;
    }
    const h = s.team[s.cur];
    if (h.stuck > 0) { inp[mem.f % 2 ? 'z' : 'x'] = true; return inp; }
    if (h.hp < h.max * 0.3 && s.team.some((o) => o !== h && !o.ko && o.hp > o.max * 0.5) && mem.f % 10 === 0) { inp.c = true; return inp; }
    const b = s.enemies.find((e) => e.k === 'boss');
    const targets = s.enemies.filter((e) => !e.dead && !e.under && e.state !== 'flee');
    // dodge boss attacks
    if (b && b.tele) {
      if (['charge', 'stomp', 'dive', 'burrow'].includes(b.move) && (b.move !== 'dive' || Math.abs(b.mark - h.x) < 120)) {
        if (b.move === 'dive' || b.move === 'burrow') { inp[h.x < W / 2 ? 'r' : 'l'] = true; return inp; }
        if ((b.move === 'charge' && b.mt > 30) || (b.move === 'stomp' && b.mt > 22)) { inp.u = true; inp[b.x < h.x ? 'r' : 'l'] = true; return inp; }
      }
      if (['swipe', 'shoot', 'volley', 'web'].includes(b.move) && Math.abs(b.x - h.x) < 420) { inp.d = true; inp[b.x < h.x ? 'l' : 'r'] = false; return inp; }
    }
    if (b && b.move === 'stomp' && b.y > 0 && Math.abs(b.x - h.x) < 340 && h.y === 0) { inp.u = true; return inp; }
    if (b && b.move === 'dash' && b.mt > 10) { inp.u = true; return inp; }
    if (b && b.move === 'counter') { if (s.gauge >= COST && mem.f % 7 === 0 && h.state === 'idle') inp.x = true; inp[h.x < b.x ? 'l' : 'r'] = Math.abs(b.x - h.x) < 200; return inp; }
    // a civilian being carried away: go get that grunt first
    const carrier = targets.find((e) => e.carry);
    const t = carrier || targets.sort((a, c) => Math.abs(a.x - h.x) - Math.abs(c.x - h.x))[0];
    if (!t) { inp[h.x < W / 2 ? 'r' : 'l'] = mem.f % 60 < 20; return inp; }
    const dx = t.x - h.x, d = Math.abs(dx) - t.w / 2;
    if (b && t === b && b.move === 'shell' && Math.sign(h.x - b.x) === b.face) { if (s.gauge >= COST && h.y === 0 && mem.f % 6 === 0) { inp.u = true; inp.x = true; return inp; } }
    if (d > 60) { inp[dx > 0 ? 'r' : 'l'] = true; if (d > 260 && s.gauge >= 60 && mem.f % 9 === 0 && Math.sign(dx) === h.face) inp.x = true; return inp; }
    if (Math.sign(dx) !== h.face && h.state === 'idle') { inp[dx > 0 ? 'r' : 'l'] = true; return inp; }
    if (s.gauge >= 70 && mem.f % 11 === 0) { if (t.y > 30) inp.u = true; inp.x = true; return inp; }
    if (mem.f % 3 === 0) inp.z = true;
    return inp;
  }

  globalThis.SS = { W, VIEW, COST, HEROES, MOBS, BOSSES, STAGES, GIANT, ROBO, create, step, bot, mixBoss, hero, boss, mulberry, startGrow };
})();

// Life on Earth engine: seeded RNG, birth-probability model, life loop, mortality helpers, auto mode, what-if.
// Pure logic (no DOM). The simulation decides what happens; narrative text never changes probabilities.
// A life is plain JSON (including the RNG state), so saving and restoring is JSON.stringify/parse.
(function (g) {
  const LE = (g.LE = g.LE || {});
  LE.VERSION = 1;
  LE.modules = LE.modules || {};

  // ---------- seeded randomness ----------
  LE.hash = (str) => { // xmur3-style string -> uint32
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  };
  const step32 = (st) => { // mulberry32 over an object holding .rs
    st.rs = (st.rs + 0x6D2B79F5) | 0;
    let t = Math.imul(st.rs ^ (st.rs >>> 15), 1 | st.rs);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  LE.R = (st) => {
    const r = () => step32(st);
    const o = {
      r, chance: (p) => r() < p, int: (a, b) => a + Math.floor(r() * (b - a + 1)), range: (a, b) => a + r() * (b - a),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      norm: () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
      poisson: (l) => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; },
      wpick: (arr, w) => { let tot = 0; const ws = arr.map((x) => (tot += Math.max(0, w(x)), Math.max(0, w(x)))); let x = r() * tot; for (let i = 0; i < arr.length; i++) { x -= ws[i]; if (x < 0) return arr[i]; } return arr[arr.length - 1]; },
    };
    return o;
  };
  const SEEDCH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  LE.newSeed = () => { let s = ''; for (let i = 0; i < 8; i++) s += SEEDCH[Math.floor(Math.random() * SEEDCH.length)]; return s.slice(0, 4) + '-' + s.slice(4); };
  const normSeed = (s) => String(s).trim().toUpperCase();

  // ---------- data ----------
  LE.setCountries = (json) => { LE.countriesMeta = json; LE.countries = json.countries; LE.humanBirths = json.totalBirths; };
  LE.byId = (id) => LE.SPECIES.find((x) => x.id === id);
  LE.point = (sp) => (sp.births.fromData ? LE.humanBirths : Math.sqrt(sp.births.low * sp.births.high));
  LE.range = (sp) => (sp.births.fromData ? [LE.humanBirths * 0.98, LE.humanBirths * 1.02] : [sp.births.low, sp.births.high]);

  // P(species) = births(species) / sum of births over the roster in scope
  LE.table = (scope = 'core', mode = 'earth') => {
    const list = LE.SPECIES.filter((s) => scope === 'all' || s.scope === 'core');
    const tot = list.reduce((a, s) => a + LE.point(s), 0);
    return list.map((sp) => ({ sp, births: LE.point(sp), p: mode === 'discovery' ? 1 / list.length : LE.point(sp) / tot })).sort((a, b) => b.p - a.p);
  };
  LE.draw = (seed, { scope = 'core', mode = 'earth' } = {}) => {
    const st = { rs: LE.hash(normSeed(seed) + '/lottery') };
    const t = LE.table(scope, mode); let x = step32(st);
    for (const row of t) { x -= row.p; if (x < 0) return row; }
    return t[t.length - 1];
  };

  // ---------- life log, flags (butterfly effect), decisions ----------
  LE.LABELS = { health: 'Health', joy: 'Wellbeing', money: 'Money', friends: 'Friends', skills: 'Skills', food: 'Food', calm: 'Calm', trust: 'Trust', bond: 'Bond', skill: 'Skill', safety: 'Safety', warmth: 'Warmth', energy: 'Energy', status: 'Standing', voice: 'Voice', fat: 'Fat reserves', growth: 'Growth', homing: 'Homing', family: 'Family', stress: 'Stress' };
  LE.say = (s, text, o = {}) => {
    const d = {}; for (const [k, v] of Object.entries(s._d || {})) if (Math.abs(v) >= 1) d[k] = Math.round(v); s._d = {};
    s.log.push({ i: s.log.length, age: s.age, stage: s.stage, text, tone: o.tone || 'calm', turn: !!o.turn, because: o.because || null, key: o.key || null, d: Object.keys(d).length ? d : null });
  };
  // A flag is a small cause remembered for later. `why` is how the end-of-life story names it.
  LE.flag = (s, key, why) => { if (!s.flags[key]) { s.flags[key] = { age: s.age, why }; LE.say(s, why, { tone: 'turn', turn: true, key }); } };
  LE.hasFlag = (s, k) => !!s.flags[k];
  LE.mod = (s, k, d, lo = 0, hi = 100) => { const was = s.n[k] == null ? 50 : s.n[k]; s.n[k] = Math.max(lo, Math.min(hi, was + d)); (s._d = s._d || {})[k] = ((s._d || {})[k] || 0) + (s.n[k] - was); };

  const mod = (s) => LE.modules[s.module];
  const decDef = (s) => s.pending && mod(s).decisions.find((d) => d.id === s.pending.id);
  LE.pendingView = (s) => {
    const d = decDef(s); if (!d) return null;
    return { id: d.id, title: typeof d.title === 'function' ? d.title(s) : d.title, text: typeof d.text === 'function' ? d.text(s) : d.text,
      options: d.options.filter((o) => !o.when || o.when(s)).map((o) => ({ k: o.k, label: typeof o.label === 'function' ? o.label(s) : o.label, hint: typeof o.hint === 'function' ? o.hint(s) : o.hint, irrev: !!o.irrev })) };
  };
  LE.choose = (s, k) => {
    const d = decDef(s); const o = d && d.options.find((x) => x.k === k); if (!o) return false;
    const R = LE.R(s);
    s.choices.push({ id: d.id, k, label: typeof o.label === 'function' ? o.label(s) : o.label, title: typeof d.title === 'function' ? d.title(s) : d.title, age: s.age });
    s.pending = null; s._d = {};
    LE.say(s, `You chose: ${s.choices[s.choices.length - 1].label}`, { tone: 'choice' });
    o.fx(s, R);
    return true;
  };
  // Auto mode: pick by personality. Irreversible options are never auto-picked unless the player allows it.
  LE.autoPick = (s, allowIrrev) => {
    const v = LE.pendingView(s); if (!v) return null;
    const d = decDef(s); const R = LE.R(s);
    let best = null, bs = -1e9;
    for (const o of v.options) {
      if (o.irrev && !allowIrrev) continue;
      const def = d.options.find((x) => x.k === o.k); let sc = R.range(-0.15, 0.15);
      for (const [t, w] of Object.entries(def.bias || {})) sc += w * ((s.traits[t] == null ? 0.5 : s.traits[t]) - 0.5);
      if (sc > bs) { bs = sc; best = o.k; }
    }
    return best;
  };

  // ---------- mortality helpers ----------
  // hazard (per year) -> death probability over dt years
  LE.pDeath = (h, dt) => 1 - Math.exp(-h * dt);
  // survival probability over a stage of `years` converted to a constant hazard
  LE.hz = (surv, years) => -Math.log(surv) / years;
  LE.sumH = (h) => Object.values(h).reduce((a, b) => a + b, 0);

  // ---------- the life loop ----------
  LE.birth = (seedIn, o = {}) => {
    const seed = normSeed(seedIn || LE.newSeed());
    const row = o.speciesId ? { sp: LE.byId(o.speciesId), p: null } : LE.draw(seed, o);
    const sp = row.sp;
    const s = { v: LE.VERSION, seed, sp: sp.id, module: sp.module, rs: LE.hash(seed + '/life/' + sp.id + (o.alt ? '/alt' + o.alt : '')),
      age: 0, steps: 0, alive: true, stage: '', log: [], flags: {}, done: {}, choices: [], n: {}, mods: { h: 1 }, traits: {}, born: {}, family: [], stats: {},
      pending: null, end: null, gentle: o.gentle !== false, mode: o.mode || 'earth', scope: o.scope || 'core', alt: o.alt || null,
      lottery: { p: row.p, mode: o.mode || 'earth', scope: o.scope || 'core' } };
    const R = LE.R(s);
    mod(s).birth(s, R, o.avoid || null);
    s.stage = mod(s).stage(s);
    LE.say(s, s.born.story, { tone: 'joy', turn: false });
    return s;
  };

  function stepLife(s) {
    const M = mod(s), R = LE.R(s);
    const dt = M.dt(s);
    s.age += dt; s.steps++;
    const st = M.stage(s);
    if (st !== s.stage) { s.stage = st; const t = M.stageText && M.stageText(s, st); LE.say(s, t || `You are now ${/^[aeiou]/i.test(st) ? 'an' : 'a'} ${st.toLowerCase()}.`, { tone: 'calm', key: 'stage:' + st }); }
    M.tick(s, dt, R); s._d = {};
    const a1 = s.age; s.age = a1 - dt; const h = M.hazard(s); s.age = a1; // risk over a step is set by the age at its start
    const tot = LE.sumH(h);
    if (R.chance(LE.pDeath(tot, dt))) {
      let x = R.r() * tot, cause = Object.keys(h)[0];
      for (const [c, v] of Object.entries(h)) { x -= v; if (x < 0) { cause = c; break; } }
      s.alive = false; s.end = { cause, age: s.age, ...M.death(s, cause) };
      LE.say(s, s.end.text, { tone: 'end', turn: true });
      return;
    }
    // a plain account of this stretch of life, so quiet time still tells you what happened
    if (M.diary && s.steps % (M.diaryEvery || 1) === 0) { const line = M.diary(s, R); if (line) LE.say(s, line, { tone: 'diary' }); }
    // decisions at meaningful moments, never more than one pending
    for (const d of M.decisions) {
      if (s.done[d.id] || !d.when(s)) continue;
      s.done[d.id] = 1; s.pending = { id: d.id }; return;
    }
    // a scripted milestone beats a random event
    for (const e of M.milestones || []) {
      if (s.done[e.id] || !e.when(s)) continue;
      s.done[e.id] = 1; e.fx(s, R); return;
    }
    const rate = M.eventRate(s) * dt;
    if (R.chance(Math.min(0.95, rate))) {
      const pool = M.events.filter((e) => e.when(s));
      if (pool.length) {
        const e = R.wpick(pool, (x) => x.w * (s.gentle && x.tone === 'hard' ? 0.35 : 1) * (x.wf ? x.wf(s) : 1));
        e.fx(s, R);
      }
    }
  }
  // Run until something worth showing happens (an entry, a decision, or death).
  LE.advance = (s, maxSteps = 800) => {
    const start = s.log.length; let n = 0;
    while (s.alive && !s.pending && n++ < maxSteps) { stepLife(s); if (s.log.length > start) break; }
    return s.log.slice(start);
  };
  LE.autoRun = (s, allowIrrev = true) => {
    let guard = 0;
    while (s.alive && guard++ < 20000) {
      if (s.pending) { const k = LE.autoPick(s, allowIrrev); LE.choose(s, k || LE.pendingView(s).options[0].k); }
      else LE.advance(s);
    }
    return s;
  };

  // ---------- end-of-life story, what-if ----------
  LE.summary = (s) => {
    const M = mod(s), turning = s.log.filter((e) => e.turn && e.tone !== 'end');
    const becauses = s.log.filter((e) => e.because && s.flags[e.because]).map((e) => ({ effect: e.text, cause: s.flags[e.because].why, causeAge: s.flags[e.because].age, effectAge: e.age }));
    return { lifespan: M.fmtAge(s.age), stats: M.stats(s), decisions: s.choices, turning, chains: becauses, end: s.end };
  };
  // A hypothetical life: same seed and species, different circumstances. A simulation, not a prediction.
  LE.whatIf = (s) => {
    const alt = LE.birth(s.seed, { speciesId: s.sp, alt: (s.alt ? s.alt + 1 : 1), avoid: s.born.key, gentle: s.gentle });
    LE.autoRun(alt, false);
    return alt;
  };
  // Species-aware comparison: never compares different species' achievements as one measure.
  LE.compare = (a, b) => {
    const sa = LE.byId(a.sp), sb = LE.byId(b.sp);
    if (a.sp !== b.sp) return { same: false, note: `${sa.name} and ${sb.name} live on different scales, so only each life's own story is shown.` };
    return { same: true, rows: [['Lifespan', mod(a).fmtAge(a.age), mod(b).fmtAge(b.age)], ...mod(a).stats(a).map((r, i) => [r[0], r[1], mod(b).stats(b)[i][1]])] };
  };
})(typeof window !== 'undefined' ? window : globalThis);

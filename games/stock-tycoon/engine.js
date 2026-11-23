// Stock Tycoon market engine. The whole market is a pure function of time: Market.build(day) replays every day from
// GENESIS and returns the same prices on every device, so nothing about the market is ever saved, every player sees the
// same market at the same moment, and charts are the real simulated history.
// The market runs on one clock for everyone. A market day is a UTC day, prices move all day long, and every piece of
// news lands at a real moment: a scandal at 03:12 UTC moves the price at 03:12 for everyone, wherever they are.
// Each day's closing price is fixed by the daily simulation; during the day the price travels from yesterday's close to
// today's along a random path, jumping at the moment each piece of news comes out.
// ponytail: replaying from GENESIS costs about 100 companies x days-since-2021 steps per load (about 0.1 s).
// IMPORTANT once the game is live: changing any number or formula here rewrites history for everyone.
const Market = (() => {
  const { SECTORS, COMPANIES } = typeof module !== 'undefined' ? require('./companies.js') : Companies;
  const { LANDS, FIRST, LAST, SOURCES, CO, GLOBAL, REGIME_NEWS, coTitle, level, spc } = typeof module !== 'undefined' ? require('./events.js') : Events;
  const SEED = 505, GENESIS = 18932; // 1 Nov 2021: five years of history before launch
  const DIV_LAG = 14, KAPPA = 0.005; // how fast mood swings fade back to fundamentals
  // Bigger moves, it's a game: from 24 Nov 2026 (UTC day 20781) every source of movement is 1.5 times larger: daily
  // noise, moves during the day, news jumps, earnings surprises, rumours and world events. Days before that are exactly
  // as they were, so no player's history changes. To retune again later, add a new dated step here; never change a past one.
  const MOVES = (d) => (d >= 20781 ? 1.5 : 1);
  // the economy moves through four phases; each has its own market drift and nervousness
  const REGIMES = ['Expansion', 'Slowdown', 'Recession', 'Recovery'];
  const MU = [0.00028, -0.00005, -0.0011, 0.0007], SIG = [0.007, 0.009, 0.016, 0.011], EXIT = [1 / 500, 1 / 150, 1 / 120, 1 / 150];
  const TILT = [0.0001, -0.0001, -0.0006, 0.0005]; // extra daily push on cyclical sectors, by phase
  const SECKEYS = Object.keys(SECTORS);
  const RISK = ['Very low', 'Low', 'Medium', 'High', 'Very high'];
  const FRAMES = { D: 1, W: 7, M: 30, '6M': 182, Y: 365, '5Y': 1825, MAX: Infinity };
  // time: milliseconds since 1970, UTC. Midnight UTC closes the market day before it.
  const DAY = 864e5, STEP = 300000; // a market day, and the 5-minute grid charts and orders are sampled on
  const dayOf = (t) => Math.ceil(t / DAY) - 1;
  const DIV_AT = STEP, CPI_AT = 13.5 * 3600000, RATE_AT = 18 * 3600000, MOVE_AT = DAY - 60000; // fixed times of day, ms after midnight UTC

  // random numbers addressed by (day, who, which): the same question always gets the same answer, and adding a new
  // "which" later does not disturb the old ones
  const u = (a, b, c) => {
    let h = SEED ^ Math.imul(a, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) ^ Math.imul(b + 1000, 0xc2b2ae35);
    h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f) ^ Math.imul(c + 1, 0x165667b1);
    h ^= h >>> 16; h = Math.imul(h, 0x9e3779b1); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  };
  const g = (a, b, c) => Math.sqrt(-2 * Math.log(1 - u(a, b, c))) * Math.cos(2 * Math.PI * u(a, b, c + 1)); // normal(0,1)
  const moment = (r) => 60000 + Math.floor(r * (DAY - 120000)); // a random time of day, between 00:01 and 23:59 UTC
  // The wandering part of a day's price path: zero at both ends, built by repeated halving, so the value at any moment
  // costs 11 random numbers and needs nothing stored. Finer than 42 seconds it is a straight line.
  function bridge(c, d, f) {
    let lo = 0, hi = 1, vlo = 0, vhi = 0, node = 1;
    for (let k = 0; k < 11; k++) {
      const mid = (lo + hi) / 2, v = (vlo + vhi) / 2 + c.vol * MOVES(d) * Math.sqrt(hi - lo) / 2 * g(d, c.id, 1000 + 2 * node);
      if (f < mid) { hi = mid; vhi = v; node *= 2; } else { lo = mid; vlo = v; node = node * 2 + 1; }
    }
    return vlo + (vhi - vlo) * (f - lo) / (hi - lo);
  }

  // ---- when company events happen. These are pure functions of (company, day), which is what lets a rumour today
  // know about an event next week without anything being stored.
  const SI = Object.fromEntries(SECKEYS.map((k, i) => [k, i])), SRC_W = [0.6, 0.8, 1];
  const kindsFor = (sec, rumourOnly) => Object.keys(CO).filter((k) => (!CO[k].secs || CO[k].secs.includes(sec)) && (!rumourOnly || CO[k].rumour));
  const pick = (keys, r) => { let w = r * keys.reduce((a, k) => a + CO[k].w, 0); for (const k of keys) if ((w -= CO[k].w) < 0) return k; return keys[keys.length - 1]; };
  const KINDS = Object.fromEntries(SECKEYS.map((s) => [s, [kindsFor(s), kindsFor(s, true)]]));
  function coEvent(c, d) { // riskier companies make news more often: about one event every 3 to 5 months
    if (u(d, c.id, 100) >= RATE(c)) return null;
    const key = pick(KINDS[c.sec][0], u(d, c.id, 101)), k = CO[key], full = (k.lo + (k.hi - k.lo) * u(d, c.id, 102)) / 100;
    const rumoured = !!k.rumour && u(d, c.id, 104) < 0.55, partial = rumoured && u(d, c.id, 105) < 0.25, r = u(d, c.id, 106); // a quarter of leaks exaggerate
    return { key, k, full, mag: partial ? full * 0.3 : full, lead: 2 + Math.floor(u(d, c.id, 103) * 6), rumoured, partial, src: r < 0.15 ? 0 : r < 0.55 ? 1 : 2, ms: moment(u(d, c.id, 107)) };
  }
  function fakeRumour(c, d) { // false rumours mostly come from the least reliable sources
    if (u(d, c.id, 110) >= 1 / 400) return null;
    const key = pick(KINDS[c.sec][1], u(d, c.id, 111)), k = CO[key], r = u(d, c.id, 113);
    return { key, k, full: (k.lo + (k.hi - k.lo) * u(d, c.id, 112)) / 100, src: r < 0.55 ? 0 : r < 0.88 ? 1 : 2, deny: 3 + Math.floor(u(d, c.id, 114) * 6), ms: moment(u(d, c.id, 117)) };
  }
  const RATE = (c) => (0.7 + 0.15 * c.risk) / 110;
  // Events are bad news more often than good. Investors expect that, so the average hit is already in the price:
  // each industry gets back, a little every day, exactly what its events cost on average (same for financial health).
  const EXPECT = Object.fromEntries(SECKEYS.map((s) => { const ks = KINDS[s][0], w = ks.reduce((a, k) => a + CO[k].w, 0);
    return [s, { mag: ks.reduce((a, k) => a + CO[k].w * (CO[k].lo + CO[k].hi) / 200 * (CO[k].rumour ? 0.904 : 1), 0) / w, health: ks.reduce((a, k) => a + CO[k].w * (CO[k].fx.health || 0), 0) / w }]; }));
  // The same for world events: their average pull on the market and on each industry is already in prices, so wars and
  // crashes are shocks around a fair trend rather than a slow leak. Events that last undo part of their hit when they end.
  const WORLD = { m: 0, sec: SECKEYS.map(() => 0) };
  for (const k of GLOBAL) { const net = k.p * (k.dur ? 0.75 : 1) / 100; WORLD.m += k.m * net; for (const s in k.sec) WORLD.sec[SI[s]] += k.sec[s] * net; }
  const rumourBody = (c, f) => `${SOURCES[f.src][0]} ${f.src ? 'say' : 'claims'} ${c.name} ${f.k.rumour}. The company has not commented. Source reliability: ${SOURCES[f.src][1]}.`;

  function build(day) {
    day = Math.max(day, GENESIS + 1);
    const n = day - GENESIS + 1, index = new Float64Array(n), regime = new Uint8Array(n), rates = new Float32Array(n).fill(3);
    const cos = COMPANIES.map((def) => {
      const [sector, beta, vol, growth, ps, margin, debt, cyc] = SECTORS[def.sec], r = def.risk;
      return { ...def, sector, si: SECKEYS.indexOf(def.sec), ps, margin, cyc, hue: (def.id * 47) % 360, shares: def.sharesM * 1e6, riskLabel: RISK[r - 1],
        beta: beta * (0.85 + 0.05 * r), vol: vol * (0.55 + 0.15 * r), growth: growth * (0.6 + 0.13 * r), debt: debt * (0.4 + 0.2 * r),
        health: 100 - 14 * r + (u(0, def.id, 7) - 0.5) * 16, rep: Math.round(40 + 55 * u(0, def.id, 8)), off: 1 + Math.floor(u(0, def.id, 9) * 90),
        repAt: moment(u(0, def.id, 10)), // each company reports its earnings at the same time of day
        close: new Float64Array(n), jumps: new Map(), listDay: null, deadDay: null, F: 0, S: 0, ceoN: 0, divs: [] };
    });
    // what the last earnings report showed: these are the numbers on the company page until the next report
    const report = (c, d) => {
      const fair = Math.exp(c.F);
      c.revenue = fair * c.shares / c.ps; c.profit = c.revenue * (c.margin + (c.health - 60) * 0.001); c.debtAbs = c.debt * c.revenue * 0.5;
      c.dps = c.health < 25 ? 0 : c.yld / 100 * fair; c.lastReport = d; // a company in trouble cuts its dividend
      // each report declares the quarter's dividend, paid two weeks later to whoever holds the shares at 00:05 UTC that day
      if (c.dps > 0) c.divs.push({ decl: d, pay: d + DIV_LAG, cents: Math.max(1, Math.round(c.dps * 25)) });
    };
    const list = (c, d) => { c.listDay = d; c.F = Math.log(c.price); c.close[d - GENESIS] = c.price; report(c, d); };
    const reserve = cos.filter((c) => c.reserve).map((c) => c.id); // companies still waiting to list, in order
    let reg = 0;
    const ipos = []; // { day, id } listings waiting to happen
    for (const c of cos) if (!c.reserve) list(c, GENESIS);
    index[0] = 1000;

    // ---- events, news and rumours (tables and wording in events.js)
    const news = [], add = (o) => { o.id = news.length; news.push(o); return o; };
    const say = (c, d, o) => add({ d, sym: c.sym, ...o });
    const ceo = (c, k = 0) => `${FIRST[Math.floor(u(c.ceoN + k, c.id, 60) * FIRST.length)]} ${LAST[Math.floor(u(c.ceoN + k, c.id, 61) * LAST.length)]}`;
    const active = []; // world events still running
    let infl = 2.5, rate = 3, inflPush = 0;

    for (let d = GENESIS + 1; d <= day; d++) {
      const t = d - GENESIS, was = reg;
      if (u(d, -1, 0) < EXIT[reg]) reg = reg === 0 ? 1 : reg === 1 ? (u(d, -1, 5) < 0.6 ? 2 : 0) : reg === 2 ? 3 : 0;
      regime[t] = reg;
      const X = MOVES(d); // multiplying by 1 changes nothing, so days before the switch are bit-for-bit the same
      let m = MU[reg] + SIG[reg] * X * g(d, -1, 1);
      m -= WORLD.m * X;
      const sec = SECKEYS.map((k, si) => 0.005 * X * g(d, -10 - si, 0) - WORLD.sec[si] * X);
      const world = [], shocks = []; // today's world news, finished once its effect on the Composite is known
      // a shock hits the market at one moment; each company's share of it is a jump in its price at that moment
      const shock = (ms, dm, dsec) => { dm *= X; for (const s in dsec) dsec[s] *= X; m += dm; for (const s in dsec) sec[SI[s]] += dsec[s]; shocks.push({ ms, m: dm, sec: dsec, sum: 0, n: 0 }); return shocks.length - 1; };
      const scaled = (k, x) => Object.fromEntries(Object.keys(k.sec).map((s) => [s, k.sec[s] * x / 100]));
      const hit = (k, x) => { m += k.m * x / 100 * X; for (const s in k.sec) sec[SI[s]] += k.sec[s] * x / 100 * X; }; // gradual pressure, spread over the day
      const effects = (k) => { const up = [], dn = []; for (const s in k.sec) (k.sec[s] > 0 ? up : dn).push(SECTORS[s][0]); return (up.length ? `Helped: ${up.join(', ')}. ` : '') + (dn.length ? `Hurt: ${dn.join(', ')}.` : ''); };
      if (reg !== was) { const r = REGIME_NEWS[reg], ms = moment(u(d, -1, 8)); world.push({ ms, sh: shock(ms, r.m, {}), cat: 'Economy', level: reg === 2 ? 'Severe' : 'Major', kind: 'regime', title: r.title, body: r.body }); }
      GLOBAL.forEach((k, i) => {
        if (u(d, -100 - i, 0) >= k.p) return;
        const x = 0.6 + 0.8 * u(d, -100 - i, 1), dur = k.dur ? k.dur[0] + Math.floor(u(d, -100 - i, 2) * (k.dur[1] - k.dur[0])) : 0;
        const l0 = Math.floor(u(d, -100 - i, 3) * LANDS.length), lands = [LANDS[l0], LANDS[(l0 + 1 + Math.floor(u(d, -100 - i, 4) * (LANDS.length - 1))) % LANDS.length]];
        const ms = moment(u(d, -100 - i, 5)), sh = shock(ms, k.m * x / 100, scaled(k, x)); inflPush += k.infl * x;
        if (dur) active.push({ k, x, lands, end: d + dur, dur });
        world.push({ ms, sh, cat: k.cat, level: k.level, kind: k.key, secs: Object.keys(k.sec), title: k.title(lands), body: k.body, impact: effects(k) });
      });
      for (let i = active.length - 1; i >= 0; i--) {
        const a = active[i];
        if (a.end > d) { hit(a.k, a.x * 0.15 / a.dur); continue; } // while it lasts, the pressure keeps building a little
        active.splice(i, 1); // when it ends, part of the damage is undone
        const ms = moment(u(d, -100 - GLOBAL.indexOf(a.k), 6)), sh = shock(ms, a.k.m * (a.x * -0.4) / 100, scaled(a.k, a.x * -0.4));
        world.push({ ms, sh, cat: a.k.cat, level: 'Moderate', kind: a.k.key, secs: Object.keys(a.k.sec), title: a.k.end(a.lands), body: 'Markets are unwinding part of the earlier move.', impact: 'Unwinds part of the earlier move. Earlier: ' + effects(a.k) });
      }
      if (d % 30 === 15) { // monthly inflation report
        const old = infl; infl = Math.max(-1, Math.min(15, infl + 0.3 * (2.5 - infl) + [0.05, -0.05, -0.25, 0.1][reg] + inflPush + 0.25 * g(d, -2, 0))); inflPush = 0;
        const dl = infl - old;
        world.push({ ms: CPI_AT, sh: shock(CPI_AT, -(dl * 0.006), {}), cat: 'Economy', level: Math.abs(dl) > 0.6 ? 'Moderate' : 'Minor', kind: 'inflation', title: `Inflation ${dl > 0.05 ? 'rises to' : dl < -0.05 ? 'falls to' : 'steady at'} ${infl.toFixed(1)}%`,
          body: `Prices are ${infl.toFixed(1)}% higher than a year ago, from ${old.toFixed(1)}% last month. Rising inflation makes an interest rate rise more likely.` });
      }
      if (d % 30 === 0) { // monthly interest rate decision: the central bank chases inflation and eases in a recession
        const gap = Math.max(0.25, Math.min(12, 2.5 + 1.3 * (infl - 2.5) - (reg === 2 ? 1.5 : 0))) - rate, step = Math.abs(gap) < 0.2 ? 0 : Math.sign(gap) * (Math.abs(gap) > 1 ? 0.5 : 0.25), q = step / 0.25;
        rate += step;
        const dsec = Object.fromEntries([['bank', 0.008], ['ins', 0.004], ['re', -0.012], ['build', -0.01], ['ai', -0.007], ['tech', -0.007], ['soft', -0.007], ['ev', -0.007]].map(([s, x]) => [s, x * q]));
        world.push({ ms: RATE_AT, sh: shock(RATE_AT, -(0.004 * q), dsec), cat: 'Economy', level: step ? (Math.abs(q) > 1 ? 'Major' : 'Moderate') : 'Minor', kind: 'rates', secs: step ? ['bank', 're', 'build'] : [], title: `Central bank ${step > 0 ? 'raises interest rates to' : step < 0 ? 'cuts interest rates to' : 'holds interest rates at'} ${rate.toFixed(2)}%`,
          body: step > 0 ? 'Borrowing gets more expensive. Banks earn more on loans; property, builders and fast-growing technology companies are worth less.'
            : step < 0 ? 'Borrowing gets cheaper. Property, builders and fast-growing technology companies benefit; banks earn less on loans.' : 'No change this month.',
          impact: step ? `${step > 0 ? 'Helped' : 'Hurt'}: Banking, Insurance. ${step > 0 ? 'Hurt' : 'Helped'}: Real Estate, Construction, Technology.` : '' });
      }
      rates[t] = rate;
      while (ipos.length && ipos[0].day <= d) { const c = cos[ipos.shift().id]; list(c, d);
        say(c, d, { at: d * DAY + 60000, cat: 'Markets', level: 'Moderate', kind: 'ipo', title: `${c.name} begins trading on the Meridian Exchange`, body: `${c.name} (${c.sym}) listed today at $${c.price.toFixed(2)} a share. ${c.about.replace('Newly listed. ', '')}`, ch: 0, impact: `${c.sym} starts trading` }); }
      let sum = 0, cnt = 0;
      for (const c of cos) {
        if (c.listDay === null || c.listDay === d || c.deadDay !== null) continue;
        // todo: this company's stories today. J: the moments today's news moved its price, as [ms, jump, ms, jump, ...] in log terms.
        const prev = c.close[t - 1], todo = [], J = [];
        // fundamentals: growth above the average, the market, the sector
        c.F += (c.growth - 0.04) * 0.25 / 365 + c.beta * m + (c.cyc - 1) * TILT[reg] + sec[c.si] - RATE(c) * EXPECT[c.sec].mag * X;
        for (const sh of shocks) { const j = c.beta * sh.m + (sh.sec[c.sec] || 0); if (j) J.push(sh.ms, j); }
        // mood: daily noise that fades back toward fundamentals
        c.S = c.S * (1 - KAPPA) + c.vol * X * g(d, c.id, 0);
        const dv = c.divs[c.divs.length - 1]; // payment day: the cash leaves the company, so the share is worth that much less
        if (dv && dv.pay === d) { const j = Math.log(Math.max(0.5, 1 - dv.cents / 100 / prev)); c.F += j; J.push(DIV_AT, j); }
        if ((d - c.listDay) % 91 === c.off) { // quarterly earnings: a surprise moves value, health and growth
          const e = g(d, c.id, 2), j = e * c.vol * 2.2 * X;
          c.F += j; J.push(c.repAt, j);
          c.health = Math.min(100, c.health + 5 * e + 0.8 - 0.8 * c.debt - 91 * RATE(c) * EXPECT[c.sec].health);
          c.growth = 0.04 + 0.92 * (c.growth - 0.04) + 0.01 * e;
          report(c, d);
          if (Math.abs(e) > 0.9) todo.push({ ms: c.repAt, j, cat: 'Results', level: level(j), kind: 'results', after: e > 0 ? 'on unexpectedly strong results' : 'as revenue falls short',
            body: e > 0 ? `${c.name} reported quarterly revenue and profit well ahead of what analysts expected.` : `${c.name} reported quarterly revenue well below what analysts expected.` });
        }
        const ev = coEvent(c, d);
        if (ev) { // something happens to this company today
          const k = ev.k, x = { n: c.name, ceo: ceo(c), next: ceo(c, 1) };
          const mag = ev.mag * X;
          c.F += mag; J.push(ev.ms, mag);
          if (k.fx.health) c.health = Math.min(100, c.health + k.fx.health);
          if (k.fx.rep) c.rep = Math.max(5, Math.min(99, c.rep + k.fx.rep));
          if (k.fx.growth) c.growth += k.fx.growth;
          if (k.fx.ceo) { c.ceoN++; c.rep = Math.round(40 + 55 * u(c.ceoN, c.id, 62)); }
          const leaked = ev.rumoured && d - ev.lead > c.listDay;
          todo.push({ ms: ev.ms, j: mag, cat: k.cat, level: level(mag), kind: ev.key, after: k.after, body: k.what(x) + (leaked ? (ev.partial ? ' The news turned out smaller than the rumours suggested.' : ' The announcement confirms rumours from earlier this week.') : '') });
        }
        for (let L = 2; L <= 7; L++) { // a real event a few days away leaks: a true rumour
          const f = coEvent(c, d + L);
          if (!f || !f.rumoured || f.lead !== L) continue;
          const ms = moment(u(d, c.id, 130 + L)), j = 0.3 * f.full * SRC_W[f.src] * X;
          c.S += j; J.push(ms, j);
          todo.push({ ms, j, cat: 'Rumour', level: 'Minor', kind: f.key, rumour: f.src, real: true, title: `Rumour: ${c.name} ${f.k.rumour}`, body: rumourBody(c, f) });
        }
        const fk = fakeRumour(c, d); // a rumour with nothing behind it
        if (fk) { const j = 0.3 * fk.full * SRC_W[fk.src] * X; c.S += j; J.push(fk.ms, j); todo.push({ ms: fk.ms, j, cat: 'Rumour', level: 'Minor', kind: fk.key, rumour: fk.src, real: false, title: `Rumour: ${c.name} ${fk.k.rumour}`, body: rumourBody(c, fk) }); }
        for (let L = 3; L <= 8; L++) { // ...which the company denies a few days later
          const o = d - L > c.listDay && fakeRumour(c, d - L);
          if (!o || o.deny !== L) continue;
          const ms = moment(u(d, c.id, 140 + L)), j = -(0.24 * o.full * SRC_W[o.src] * X);
          c.S += j; J.push(ms, j);
          todo.push({ ms, j, cat: 'Company', level: 'Minor', kind: o.key, denial: true, title: `${c.name} ${o.k.deny}`, body: `${c.name} issued a statement denying the recent rumour. Shares gave back most of the move it caused.` });
        }
        let px = Math.exp(c.F + c.S);
        if (c.health <= 0) { // bankrupt: shares crash at one moment today and are worth nothing from tomorrow
          px = prev * (0.02 + 0.06 * u(d, c.id, 4)); c.deadDay = d;
          const ms = moment(u(d, c.id, 116)), j = Math.log(px / prev);
          J.length = 0; J.push(ms, j);
          todo.length = 0; todo.push({ ms, j, cat: 'Company', level: 'Severe', kind: 'bankrupt', after: 'as it files for bankruptcy', body: `${c.name} has run out of money and filed for bankruptcy. Its shares stop trading at the end of the day and shareholders are not expected to recover anything.` });
          // ponytail: new listings come from a fixed list; when it runs out (many years) the exchange just shrinks. Append a new list in companies.js.
          if (reserve.length) ipos.push({ day: d + 30 + Math.floor(u(d, c.id, 6) * 60), id: reserve.shift() });
        }
        c.close[t] = px; if (J.length) c.jumps.set(t, J);
        if (c.deadDay === null) { sum += Math.log(px / prev); cnt++; for (const sh of shocks) { sh.sum += c.beta * sh.m + (sh.sec[c.sec] || 0); sh.n++; } }
        const ch = px / prev - 1;
        if (!todo.length && Math.abs(ch) > Math.max(0.1, 3.2 * c.vol * X)) todo.push({ ms: MOVE_AT, whole: true, cat: 'Markets', level: 'Moderate', kind: 'move', after: 'on heavy trading', body: `${c.name} was one of the most traded shares on the exchange today, with no announcement from the company.` });
        for (const { ms, j, whole, ...o } of todo) { const x = whole ? ch : Math.exp(j) - 1; say(c, d, { ...o, at: d * DAY + ms, ch: x, title: o.title || coTitle(c.name, x, o.after), impact: `${c.sym} ${spc(x)} ${whole ? 'on the day' : 'on the news'}` }); }
      }
      index[t] = index[t - 1] * Math.exp(cnt ? sum / cnt : 0); // the Composite: the typical move of surviving companies
      for (const { ms, sh, ...o } of world) { const x = shocks[sh].n ? Math.exp(shocks[sh].sum / shocks[sh].n) - 1 : 0; add({ d, at: d * DAY + ms, ...o, ch: x, impact: `MRX Composite ${spc(x)} on the news. ${o.impact || ''}`.trim() }); }
    }
    news.sort((a, b) => a.at - b.at || a.id - b.id).forEach((x, i) => { x.id = i; }); // in the order it happened

    const bySym = new Map(cos.map((c) => [c.sym, c]));
    const listed = (c, d) => c.listDay !== null && c.listDay <= d;
    const trading = (c, d = dayOf(mkt.t)) => listed(c, d) && (c.deadDay === null || d <= c.deadDay); // the crash day still trades
    // the price of a company at any moment of a built day, in dollars (0 if it is not trading then)
    function priceAt(c, t) {
      const d = dayOf(t);
      if (d > day || !trading(c, d)) return 0;
      const i = d - GENESIS, ms = t - d * DAY;
      if (ms === DAY) return c.close[i]; // the close, exactly
      const b = Math.log(c.close[i]), a = d > c.listDay ? Math.log(c.close[i - 1]) : b, J = c.jumps.get(i) || [];
      let all = 0, now = 0;
      for (let k = 0; k < J.length; k += 2) { all += J[k + 1]; if (J[k] <= ms) now += J[k + 1]; }
      return Math.exp(a + (b - a - all) * ms / DAY + bridge(c, d, ms / DAY) + now);
    }
    const centsAt = (c, t) => { const p = priceAt(c, t); return p ? Math.max(1, Math.round(p * 100)) : 0; };
    // px and cents: with a day, that day's close; without, the price at the market's current moment (mkt.t)
    const px = (c, d) => (d === undefined ? priceAt(c, mkt.t) : trading(c, d) ? c.close[d - GENESIS] : 0);
    const cents = (c, d) => (d === undefined ? centsAt(c, mkt.t) : trading(c, d) ? Math.max(1, Math.round(c.close[d - GENESIS] * 100)) : 0);
    // the Composite at a moment: yesterday's close moved by the typical move of each company since then
    function indexNow(t) {
      const d = dayOf(t);
      if (d > day) return index[n - 1];
      if (d <= GENESIS || t - d * DAY === DAY) return index[Math.max(0, d - GENESIS)];
      let s = 0, k = 0;
      for (const c of cos) { if (c.listDay === null || c.listDay >= d || (c.deadDay !== null && c.deadDay <= d)) continue; s += Math.log(priceAt(c, t) / c.close[d - GENESIS - 1]); k++; }
      return index[d - GENESIS - 1] * Math.exp(k ? s / k : 0);
    }
    const mkt = {
      day, t: (day + 1) * DAY, news, rate, infl, ceo, regime: REGIMES[regime[n - 1]], companies: cos.filter((c) => listed(c, day)), index, trading, px, cents, priceAt, centsAt,
      // the moment the screens show; defaults to the close of the built day
      setNow(t) { mkt.t = t; return mkt; },
      covers: (t) => dayOf(t) <= day, // can this market price the moment t?
      feed: (t = mkt.t) => news.filter((x) => x.at <= t), // the news that is out by moment t
      get: (sym) => { const c = bySym.get(sym); return c && listed(c, day) ? c : null; },
      quote(sym) { const c = mkt.get(sym); return c ? { cents: cents(c), tradable: trading(c) } : null; },
      // the only price trades ever use: the price at the account's own moment
      quoteAt(sym, t) { const c = mkt.get(sym); return c ? { cents: centsAt(c, t), tradable: trading(c, dayOf(t)) } : null; },
      // with a day: that day's close against the close before. Without: the last 24 hours.
      change(c, d) {
        if (d !== undefined) return trading(c, d) && d > c.listDay ? px(c, d) / px(c, d - 1) - 1 : 0;
        const now = priceAt(c, mkt.t), then = priceAt(c, mkt.t - DAY);
        return now && then ? now / then - 1 : 0;
      },
      indexAt: (d) => (d === undefined ? indexNow(mkt.t) : index[Math.max(0, Math.min(day, d) - GENESIS)]),
      indexNow,
      cap: (c) => px(c) * c.shares,
      vol: (c) => c.vol * MOVES(dayOf(mkt.t)), // a company's typical daily move right now
      // what an analyst thinks a share is worth. Analysts see the fundamentals imperfectly: each quarterly report gives them a fresh, persistent error.
      fair: (c) => Math.exp(c.F + 22 * c.vol * g(c.lastReport, c.id, 200)),
      yield: (c) => (px(c) ? c.dps / px(c) : 0),
      // shares traded on a day: busier on big moves
      volume(c, d = dayOf(mkt.t)) { return trading(c, d) ? Math.round(c.shares * 0.004 * (1 + 25 * Math.abs(mkt.change(c, d))) * (0.7 + 0.6 * u(d, c.id, 3))) : 0; },
      // cents per share paid on day d, at 00:05 UTC (0 if none). A company that has gone bankrupt by then pays nothing.
      dividendOn(c, d) { if (!(d <= day) || (c.deadDay !== null && d >= c.deadDay)) return 0; const v = c.divs.find((x) => x.pay === d); return v ? v.cents : 0; },
      dividendAt: (v) => v.pay * DAY + DIV_AT,
      nextDividend: (c) => (c.deadDay === null && c.divs.find((x) => x.pay * DAY + DIV_AT > mkt.t)) || null, // declared but not yet paid
      // the moment of the next earnings report, and of the next interest rate decision
      nextReport(c) { for (let d = dayOf(mkt.t); ; d++) if ((d - c.listDay) % 91 === c.off && d * DAY + c.repAt > mkt.t) return d * DAY + c.repAt; },
      nextRates() { for (let d = dayOf(mkt.t); ; d++) if (d % 30 === 0 && d * DAY + RATE_AT > mkt.t) return d * DAY + RATE_AT; },
      healthLabel: (c) => (c.deadDay !== null ? 'Bankrupt' : c.health >= 70 ? 'Strong' : c.health >= 45 ? 'Stable' : c.health >= 25 ? 'Weak' : 'Distressed'),
      rateAt: (d = day) => rates[Math.max(0, Math.min(day, d) - GENESIS)], // the central bank rate on day d, in percent
      // day d's trading range in cents: open (the previous close), high, low, close, sampled every 5 minutes. Today's is so far.
      range(c, d = dayOf(mkt.t)) {
        const o = d > c.listDay ? cents(c, d - 1) : cents(c, d), end = Math.min(d * DAY + DAY, mkt.t), cl = end === d * DAY + DAY ? cents(c, d) : centsAt(c, end);
        let h = Math.max(o, cl), l = Math.min(o, cl);
        for (let tt = d * DAY + STEP; tt < end; tt += STEP) { const v = centsAt(c, tt); if (v > h) h = v; if (v < l) l = v; }
        return { d, o, h, l, c: cl };
      },
      // candlestick bars for a timeframe: at most about 60 bars, each covering one or more whole days (D: the last 24 hours in half hours)
      candles(c, frame) {
        const now = mkt.t, today = dayOf(now), last = c.deadDay === null ? today : Math.min(today, c.deadDay);
        if (frame === 'D') {
          const out = [];
          for (let k = 0; k < 48; k++) {
            const v = []; for (let j = 0; j <= 6; j++) { const p = priceAt(c, now - DAY + k * 1800000 + j * STEP); if (p) v.push(p); }
            if (v.length) out.push({ d: dayOf(now - DAY + (k + 1) * 1800000), at: now - DAY + (k + 1) * 1800000, o: v[0], c: v[v.length - 1], h: Math.max(...v), l: Math.min(...v) });
          }
          return out;
        }
        const bar = (xs, d) => ({ d, o: xs[0].o, c: xs[xs.length - 1].c, h: Math.max(...xs.map((x) => x.h)), l: Math.min(...xs.map((x) => x.l)) });
        const first = Math.max(c.listDay, last - FRAMES[frame]), per = Math.ceil((last - first + 1) / 60), out = [];
        for (let d = first; d <= last; d += per) { const xs = []; for (let e = d; e < d + per && e <= last; e++) { const r = mkt.range(c, e); xs.push({ o: r.o / 100, h: r.h / 100, l: r.l / 100, c: r.c / 100 }); } out.push(bar(xs, Math.min(last, d + per - 1))); }
        return out;
      },
      // chart points, oldest first: past days' closes, then the price right now (D: every 5 minutes over the last 24 hours)
      series(c, frame) {
        const now = mkt.t, today = dayOf(now), out = [];
        if (c === 'index') { for (let d = Math.max(GENESIS, today - FRAMES[frame]); d <= Math.min(today, day); d++) out.push({ d, v: index[d - GENESIS] }); return out; }
        if (frame === 'D') { for (let k = 0; k <= 288; k++) { const tt = now - DAY + k * STEP, v = priceAt(c, tt); if (v) out.push({ d: dayOf(tt), at: tt, v }); } return out; }
        const alive = trading(c, today), last = alive ? today - 1 : Math.min(today, c.deadDay);
        for (let d = Math.max(c.listDay, today - FRAMES[frame]); d <= last; d++) out.push({ d, at: d * DAY + DAY, v: c.close[d - GENESIS] });
        if (alive) out.push({ d: today, at: now, v: priceAt(c, now) });
        return out;
      },
    };
    return mkt;
  }
  return { GENESIS, FRAMES, REGIMES, DAY, STEP, dayOf, build };
})();
if (typeof module !== 'undefined') module.exports = Market;

// Stock Tycoon market engine. The whole market is a pure function of the day number: Market.build(day) replays every
// day from GENESIS and returns the same prices on every device, so nothing about the market is ever saved, every
// player sees the same market on the same date, and charts are the real simulated history.
// A game day is a real calendar day; every day trades.
// ponytail: replaying from GENESIS costs about 75 companies x days-since-2021 steps per load (milliseconds for decades).
// IMPORTANT once the game is live: changing any number or formula here rewrites history for everyone.
const Market = (() => {
  const { SECTORS, COMPANIES } = typeof module !== 'undefined' ? require('./companies.js') : Companies;
  const { LANDS, FIRST, LAST, SOURCES, CO, GLOBAL, REGIME_NEWS, coTitle, level, spc } = typeof module !== 'undefined' ? require('./events.js') : Events;
  const SEED = 505, GENESIS = 18932; // 1 Nov 2021: five years of history before launch
  const DIV_LAG = 14, KAPPA = 0.005; // how fast mood swings fade back to fundamentals
  // the economy moves through four phases; each has its own market drift and nervousness
  const REGIMES = ['Expansion', 'Slowdown', 'Recession', 'Recovery'];
  const MU = [0.00028, -0.00005, -0.0011, 0.0007], SIG = [0.007, 0.009, 0.016, 0.011], EXIT = [1 / 500, 1 / 150, 1 / 120, 1 / 150];
  const TILT = [0.0001, -0.0001, -0.0006, 0.0005]; // extra daily push on cyclical sectors, by phase
  const SECKEYS = Object.keys(SECTORS);
  const RISK = ['Very low', 'Low', 'Medium', 'High', 'Very high'];
  const FRAMES = { D: 1, W: 7, M: 30, '6M': 182, Y: 365, '5Y': 1825, MAX: Infinity };

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
    return { key, k, full, mag: partial ? full * 0.3 : full, lead: 2 + Math.floor(u(d, c.id, 103) * 6), rumoured, partial, src: r < 0.15 ? 0 : r < 0.55 ? 1 : 2 };
  }
  function fakeRumour(c, d) { // false rumours mostly come from the least reliable sources
    if (u(d, c.id, 110) >= 1 / 400) return null;
    const key = pick(KINDS[c.sec][1], u(d, c.id, 111)), k = CO[key], r = u(d, c.id, 113);
    return { key, k, full: (k.lo + (k.hi - k.lo) * u(d, c.id, 112)) / 100, src: r < 0.55 ? 0 : r < 0.88 ? 1 : 2, deny: 3 + Math.floor(u(d, c.id, 114) * 6) };
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
        close: new Float64Array(n), listDay: null, deadDay: null, F: 0, S: 0, ceoN: 0, divs: [] };
    });
    // what the last earnings report showed: these are the numbers on the company page until the next report
    const report = (c, d) => {
      const fair = Math.exp(c.F);
      c.revenue = fair * c.shares / c.ps; c.profit = c.revenue * (c.margin + (c.health - 60) * 0.001); c.debtAbs = c.debt * c.revenue * 0.5;
      c.dps = c.health < 25 ? 0 : c.yld / 100 * fair; c.lastReport = d; // a company in trouble cuts its dividend
      // each report declares the quarter's dividend, paid two weeks later to whoever held the shares the day before
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
      let m = MU[reg] + SIG[reg] * g(d, -1, 1);
      m -= WORLD.m;
      const sec = SECKEYS.map((k, si) => 0.005 * g(d, -10 - si, 0) - WORLD.sec[si]);
      const world = []; // today's world news, finished once the Composite's move is known
      const hit = (k, x) => { m += k.m * x / 100; for (const s in k.sec) sec[SI[s]] += k.sec[s] * x / 100; };
      const effects = (k) => { const up = [], dn = []; for (const s in k.sec) (k.sec[s] > 0 ? up : dn).push(SECTORS[s][0]); return (up.length ? `Helped: ${up.join(', ')}. ` : '') + (dn.length ? `Hurt: ${dn.join(', ')}.` : ''); };
      if (reg !== was) { const r = REGIME_NEWS[reg]; m += r.m; world.push({ cat: 'Economy', level: reg === 2 ? 'Severe' : 'Major', kind: 'regime', title: r.title, body: r.body }); }
      GLOBAL.forEach((k, i) => {
        if (u(d, -100 - i, 0) >= k.p) return;
        const x = 0.6 + 0.8 * u(d, -100 - i, 1), dur = k.dur ? k.dur[0] + Math.floor(u(d, -100 - i, 2) * (k.dur[1] - k.dur[0])) : 0;
        const l0 = Math.floor(u(d, -100 - i, 3) * LANDS.length), lands = [LANDS[l0], LANDS[(l0 + 1 + Math.floor(u(d, -100 - i, 4) * (LANDS.length - 1))) % LANDS.length]];
        hit(k, x); inflPush += k.infl * x;
        if (dur) active.push({ k, x, lands, end: d + dur, dur });
        world.push({ cat: k.cat, level: k.level, kind: k.key, secs: Object.keys(k.sec), title: k.title(lands), body: k.body, impact: effects(k) });
      });
      for (let i = active.length - 1; i >= 0; i--) {
        const a = active[i];
        if (a.end > d) { hit(a.k, a.x * 0.15 / a.dur); continue; } // while it lasts, the pressure keeps building a little
        hit(a.k, a.x * -0.4); active.splice(i, 1); // when it ends, part of the damage is undone
        world.push({ cat: a.k.cat, level: 'Moderate', kind: a.k.key, secs: Object.keys(a.k.sec), title: a.k.end(a.lands), body: 'Markets are unwinding part of the earlier move.', impact: 'Unwinds part of the earlier move. Earlier: ' + effects(a.k) });
      }
      if (d % 30 === 15) { // monthly inflation report
        const old = infl; infl = Math.max(-1, Math.min(15, infl + 0.3 * (2.5 - infl) + [0.05, -0.05, -0.25, 0.1][reg] + inflPush + 0.25 * g(d, -2, 0))); inflPush = 0;
        const dl = infl - old; m -= dl * 0.006;
        world.push({ cat: 'Economy', level: Math.abs(dl) > 0.6 ? 'Moderate' : 'Minor', kind: 'inflation', title: `Inflation ${dl > 0.05 ? 'rises to' : dl < -0.05 ? 'falls to' : 'steady at'} ${infl.toFixed(1)}%`,
          body: `Prices are ${infl.toFixed(1)}% higher than a year ago, from ${old.toFixed(1)}% last month. Rising inflation makes an interest rate rise more likely.` });
      }
      if (d % 30 === 0) { // monthly interest rate decision: the central bank chases inflation and eases in a recession
        const gap = Math.max(0.25, Math.min(12, 2.5 + 1.3 * (infl - 2.5) - (reg === 2 ? 1.5 : 0))) - rate, step = Math.abs(gap) < 0.2 ? 0 : Math.sign(gap) * (Math.abs(gap) > 1 ? 0.5 : 0.25), q = step / 0.25;
        rate += step; m -= 0.004 * q;
        for (const [s, x] of [['bank', 0.008], ['ins', 0.004], ['re', -0.012], ['build', -0.01], ['ai', -0.007], ['tech', -0.007], ['soft', -0.007], ['ev', -0.007]]) sec[SI[s]] += x * q;
        world.push({ cat: 'Economy', level: step ? (Math.abs(q) > 1 ? 'Major' : 'Moderate') : 'Minor', kind: 'rates', secs: step ? ['bank', 're', 'build'] : [], title: `Central bank ${step > 0 ? 'raises interest rates to' : step < 0 ? 'cuts interest rates to' : 'holds interest rates at'} ${rate.toFixed(2)}%`,
          body: step > 0 ? 'Borrowing gets more expensive. Banks earn more on loans; property, builders and fast-growing technology companies are worth less.'
            : step < 0 ? 'Borrowing gets cheaper. Property, builders and fast-growing technology companies benefit; banks earn less on loans.' : 'No change this month.',
          impact: step ? `${step > 0 ? 'Helped' : 'Hurt'}: Banking, Insurance. ${step > 0 ? 'Hurt' : 'Helped'}: Real Estate, Construction, Technology.` : '' });
      }
      rates[t] = rate;
      while (ipos.length && ipos[0].day <= d) { const c = cos[ipos.shift().id]; list(c, d);
        say(c, d, { cat: 'Markets', level: 'Moderate', kind: 'ipo', title: `${c.name} begins trading on the Meridian Exchange`, body: `${c.name} (${c.sym}) listed today at $${c.price.toFixed(2)} a share. ${c.about.replace('Newly listed. ', '')}`, ch: 0, impact: `${c.sym} starts trading` }); }
      let sum = 0, cnt = 0;
      for (const c of cos) {
        if (c.listDay === null || c.listDay === d || c.deadDay !== null) continue;
        const prev = c.close[t - 1], todo = []; // todo: this company's stories today, finished once its price move is known
        // fundamentals: growth above the average, the market, the sector
        c.F += (c.growth - 0.04) * 0.25 / 365 + c.beta * m + (c.cyc - 1) * TILT[reg] + sec[c.si] - RATE(c) * EXPECT[c.sec].mag;
        // mood: daily noise that fades back toward fundamentals
        c.S = c.S * (1 - KAPPA) + c.vol * g(d, c.id, 0);
        const dv = c.divs[c.divs.length - 1]; // payment day: the cash leaves the company, so the share is worth that much less
        if (dv && dv.pay === d) c.F += Math.log(Math.max(0.5, 1 - dv.cents / 100 / prev));
        if ((d - c.listDay) % 91 === c.off) { // quarterly earnings: a surprise moves value, health and growth
          const e = g(d, c.id, 2);
          c.F += e * c.vol * 2.2;
          c.health = Math.min(100, c.health + 5 * e + 0.8 - 0.8 * c.debt - 91 * RATE(c) * EXPECT[c.sec].health);
          c.growth = 0.04 + 0.92 * (c.growth - 0.04) + 0.01 * e;
          report(c, d);
          if (Math.abs(e) > 0.9) todo.push({ cat: 'Results', level: level(e * c.vol * 2.2), kind: 'results', after: e > 0 ? 'on unexpectedly strong results' : 'as revenue falls short',
            body: e > 0 ? `${c.name} reported quarterly revenue and profit well ahead of what analysts expected.` : `${c.name} reported quarterly revenue well below what analysts expected.` });
        }
        const ev = coEvent(c, d);
        if (ev) { // something happens to this company today
          const k = ev.k, x = { n: c.name, ceo: ceo(c), next: ceo(c, 1) };
          c.F += ev.mag;
          if (k.fx.health) c.health = Math.min(100, c.health + k.fx.health);
          if (k.fx.rep) c.rep = Math.max(5, Math.min(99, c.rep + k.fx.rep));
          if (k.fx.growth) c.growth += k.fx.growth;
          if (k.fx.ceo) { c.ceoN++; c.rep = Math.round(40 + 55 * u(c.ceoN, c.id, 62)); }
          const leaked = ev.rumoured && d - ev.lead > c.listDay;
          todo.push({ cat: k.cat, level: level(ev.mag), kind: ev.key, after: k.after, body: k.what(x) + (leaked ? (ev.partial ? ' The news turned out smaller than the rumours suggested.' : ' The announcement confirms rumours from earlier this week.') : '') });
        }
        for (let L = 2; L <= 7; L++) { // a real event a few days away leaks: a true rumour
          const f = coEvent(c, d + L);
          if (!f || !f.rumoured || f.lead !== L) continue;
          c.S += 0.3 * f.full * SRC_W[f.src];
          todo.push({ cat: 'Rumour', level: 'Minor', kind: f.key, rumour: f.src, real: true, title: `Rumour: ${c.name} ${f.k.rumour}`, body: rumourBody(c, f) });
        }
        const fk = fakeRumour(c, d); // a rumour with nothing behind it
        if (fk) { c.S += 0.3 * fk.full * SRC_W[fk.src]; todo.push({ cat: 'Rumour', level: 'Minor', kind: fk.key, rumour: fk.src, real: false, title: `Rumour: ${c.name} ${fk.k.rumour}`, body: rumourBody(c, fk) }); }
        for (let L = 3; L <= 8; L++) { // ...which the company denies a few days later
          const o = d - L > c.listDay && fakeRumour(c, d - L);
          if (!o || o.deny !== L) continue;
          c.S -= 0.24 * o.full * SRC_W[o.src];
          todo.push({ cat: 'Company', level: 'Minor', kind: o.key, denial: true, title: `${c.name} ${o.k.deny}`, body: `${c.name} issued a statement denying the recent rumour. Shares gave back most of the move it caused.` });
        }
        let px = Math.exp(c.F + c.S);
        if (c.health <= 0) { // bankrupt: shares crash today and are worth nothing from tomorrow
          px = prev * (0.02 + 0.06 * u(d, c.id, 4)); c.deadDay = d;
          todo.length = 0; todo.push({ cat: 'Company', level: 'Severe', kind: 'bankrupt', after: 'as it files for bankruptcy', body: `${c.name} has run out of money and filed for bankruptcy. Its shares stop trading after today and shareholders are not expected to recover anything.` });
          // ponytail: new listings come from a fixed list; when it runs out (many years) the exchange just shrinks. Append a new list in companies.js.
          if (reserve.length) ipos.push({ day: d + 30 + Math.floor(u(d, c.id, 6) * 60), id: reserve.shift() });
        }
        c.close[t] = px; if (c.deadDay === null) { sum += Math.log(px / prev); cnt++; }
        const ch = px / prev - 1;
        if (!todo.length && Math.abs(ch) > Math.max(0.1, 3.2 * c.vol)) todo.push({ cat: 'Markets', level: 'Moderate', kind: 'move', after: 'on heavy trading', body: `${c.name} was one of the most traded shares on the exchange today, with no announcement from the company.` });
        for (const o of todo) say(c, d, { ...o, ch, title: o.title || coTitle(c.name, ch, o.after), impact: `${c.sym} ${spc(ch)} on the day` });
      }
      index[t] = index[t - 1] * Math.exp(cnt ? sum / cnt : 0); // the Composite: the typical move of surviving companies
      const ich = index[t] / index[t - 1] - 1;
      for (const o of world) add({ d, ...o, ch: ich, impact: `MRX Composite ${spc(ich)} on the day. ${o.impact || ''}`.trim() });
    }

    const bySym = new Map(cos.map((c) => [c.sym, c]));
    const listed = (c, d) => c.listDay !== null && c.listDay <= d;
    const trading = (c, d = day) => listed(c, d) && (c.deadDay === null || d <= c.deadDay); // the crash day still trades
    const px = (c, d = day) => (trading(c, d) ? c.close[d - GENESIS] : 0);
    const cents = (c, d = day) => (trading(c, d) ? Math.max(1, Math.round(c.close[d - GENESIS] * 100)) : 0);
    const mkt = {
      day, news, rate, infl, ceo, regime: REGIMES[regime[n - 1]], companies: cos.filter((c) => listed(c, day)), index, trading, px, cents,
      get: (sym) => { const c = bySym.get(sym); return c && listed(c, day) ? c : null; },
      // the only price trades ever use
      quote(sym) { const c = mkt.get(sym); return c ? { cents: cents(c), tradable: trading(c) } : null; },
      change(c, d = day) { return trading(c, d) && d > c.listDay ? px(c, d) / px(c, d - 1) - 1 : 0; },
      indexAt: (d = day) => index[Math.max(0, Math.min(day, d) - GENESIS)],
      cap: (c) => px(c) * c.shares,
      // what an analyst thinks a share is worth. Analysts see the fundamentals imperfectly: each quarterly report gives them a fresh, persistent error.
      // what an analyst thinks a share is worth. Analysts see the fundamentals imperfectly: each quarterly report gives them a fresh, persistent error.
      // what an analyst thinks a share is worth. Analysts see the fundamentals imperfectly: each quarterly report gives them a fresh, persistent error.
      // what an analyst thinks a share is worth. Analysts see the fundamentals imperfectly: each quarterly report gives them a fresh, persistent error.
      fair: (c) => Math.exp(c.F + 22 * c.vol * g(c.lastReport, c.id, 200)),
      yield: (c) => (px(c) ? c.dps / px(c) : 0),
      // shares traded: busier on big moves
      volume(c, d = day) { return trading(c, d) ? Math.round(c.shares * 0.004 * (1 + 25 * Math.abs(mkt.change(c, d))) * (0.7 + 0.6 * u(d, c.id, 3))) : 0; },
      // cents per share paid on day d (0 if none). A company that has gone bankrupt by then pays nothing.
      dividendOn(c, d) { if (!(d <= day) || (c.deadDay !== null && d >= c.deadDay)) return 0; const v = c.divs.find((x) => x.pay === d); return v ? v.cents : 0; },
      nextDividend: (c) => (c.deadDay === null && c.divs.find((x) => x.pay > day)) || null, // declared but not yet paid
      nextReport: (c) => day + ((c.off - (day - c.listDay)) % 91 + 91 - 1) % 91 + 1, // day of the next earnings report
      nextRates: () => day + (30 - day % 30), // day of the next interest rate decision
      healthLabel: (c) => (c.deadDay !== null ? 'Bankrupt' : c.health >= 70 ? 'Strong' : c.health >= 45 ? 'Stable' : c.health >= 25 ? 'Weak' : 'Distressed'),
      // the path the price took during day d, from the previous close to that day's close
      intraday(c, d = day, steps = 26) {
        const b = Math.log(px(c, d)), a = d > c.listDay ? Math.log(px(c, d - 1)) : b, w = [0];
        for (let k = 1; k <= steps; k++) w.push(w[k - 1] + c.vol / Math.sqrt(steps) * g(d, c.id, 20 + 2 * k));
        return w.map((x, k) => ({ d, f: k / steps, v: Math.exp(a + (b - a) * k / steps + x - w[steps] * k / steps) }));
      },
      rateAt: (d = day) => rates[Math.max(0, Math.min(day, d) - GENESIS)], // the central bank rate on day d, in percent
      // day d's trading range in cents: open (the previous close), high, low, close. Limit orders fill against this.
      range(c, d = day) {
        const path = mkt.intraday(c, d).map((q) => Math.max(1, Math.round(q.v * 100))), o = d > c.listDay ? cents(c, d - 1) : cents(c, d), cl = cents(c, d);
        return { d, o, h: Math.max(o, cl, ...path), l: Math.min(o, cl, ...path), c: cl };
      },
      // candlestick bars for a timeframe: at most about 60 bars, each covering one or more whole days (D: slices of the day)
      candles(c, frame) {
        const last = c.deadDay === null ? day : Math.min(day, c.deadDay), bar = (xs, d) => ({ d, o: xs[0].o, c: xs[xs.length - 1].c, h: Math.max(...xs.map((x) => x.h)), l: Math.min(...xs.map((x) => x.l)) });
        if (frame === 'D') { const q = mkt.intraday(c, last).map((x) => x.v), out = []; for (let i = 0; i + 2 < q.length; i += 2) out.push({ d: last, o: q[i], c: q[i + 2], h: Math.max(q[i], q[i + 1], q[i + 2]), l: Math.min(q[i], q[i + 1], q[i + 2]) }); return out; }
        const first = Math.max(c.listDay, last - FRAMES[frame]), per = Math.ceil((last - first + 1) / 60), out = [];
        for (let d = first; d <= last; d += per) { const xs = []; for (let e = d; e < d + per && e <= last; e++) { const r = mkt.range(c, e); xs.push({ o: r.o / 100, h: r.h / 100, l: r.l / 100, c: r.c / 100 }); } out.push(bar(xs, Math.min(last, d + per - 1))); }
        return out;
      },
      // chart points for a company (or 'index') over a timeframe: real closes, oldest first
      series(c, frame) {
        const isIdx = c === 'index', first = isIdx ? GENESIS : c.listDay, last = isIdx || c.deadDay === null ? day : Math.min(day, c.deadDay);
        if (frame === 'D' && !isIdx) return mkt.intraday(c, last);
        const out = [];
        for (let d = Math.max(first, last - FRAMES[frame]); d <= last; d++) out.push({ d, v: isIdx ? index[d - GENESIS] : c.close[d - GENESIS] });
        return out;
      },
    };
    return mkt;
  }
  return { GENESIS, FRAMES, REGIMES, build };
})();
if (typeof module !== 'undefined') module.exports = Market;

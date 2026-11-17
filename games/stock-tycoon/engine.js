// Stock Tycoon market engine. The whole market is a pure function of the day number: Market.build(day) replays every
// day from GENESIS and returns the same prices on every device, so nothing about the market is ever saved, every
// player sees the same market on the same date, and charts are the real simulated history.
// A game day is a real calendar day; every day trades.
// ponytail: replaying from GENESIS costs about 75 companies x days-since-2021 steps per load (milliseconds for decades).
// IMPORTANT once the game is live: changing any number or formula here rewrites history for everyone.
const Market = (() => {
  const { SECTORS, COMPANIES } = typeof module !== 'undefined' ? require('./companies.js') : Companies;
  const SEED = 505, GENESIS = 18932; // 1 Nov 2021: five years of history before launch
  const KAPPA = 0.012; // how fast mood swings fade back to fundamentals (half-life about 2 months)
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

  function build(day) {
    day = Math.max(day, GENESIS + 1);
    const n = day - GENESIS + 1, index = new Float64Array(n), regime = new Uint8Array(n);
    const cos = COMPANIES.map((def) => {
      const [sector, beta, vol, growth, ps, margin, debt, cyc] = SECTORS[def.sec], r = def.risk;
      return { ...def, sector, si: SECKEYS.indexOf(def.sec), ps, margin, cyc, hue: (def.id * 47) % 360, shares: def.sharesM * 1e6, riskLabel: RISK[r - 1],
        beta: beta * (0.85 + 0.05 * r), vol: vol * (0.55 + 0.15 * r), growth: growth * (0.6 + 0.13 * r), debt: debt * (0.4 + 0.2 * r),
        health: 100 - 14 * r + (u(0, def.id, 7) - 0.5) * 16, rep: Math.round(40 + 55 * u(0, def.id, 8)), off: 1 + Math.floor(u(0, def.id, 9) * 90),
        close: new Float64Array(n), listDay: null, deadDay: null, F: 0, S: 0 };
    });
    // what the last earnings report showed: these are the numbers on the company page until the next report
    const report = (c, d) => {
      const fair = Math.exp(c.F);
      c.revenue = fair * c.shares / c.ps; c.profit = c.revenue * (c.margin + (c.health - 60) * 0.001); c.debtAbs = c.debt * c.revenue * 0.5;
      c.dps = c.health < 25 ? 0 : c.yld / 100 * fair; c.lastReport = d; // a company in trouble cuts its dividend
    };
    const list = (c, d) => { c.listDay = d; c.F = Math.log(c.price); c.close[d - GENESIS] = c.price; report(c, d); };
    let nextReserve = cos.findIndex((c) => c.reserve), reg = 0;
    const ipos = []; // { day, id } listings waiting to happen
    for (const c of cos) if (!c.reserve) list(c, GENESIS);
    index[0] = 1000;

    for (let d = GENESIS + 1; d <= day; d++) {
      const t = d - GENESIS;
      if (u(d, -1, 0) < EXIT[reg]) reg = reg === 0 ? 1 : reg === 1 ? (u(d, -1, 5) < 0.6 ? 2 : 0) : reg === 2 ? 3 : 0;
      regime[t] = reg;
      const m = MU[reg] + SIG[reg] * g(d, -1, 1);
      const sec = SECKEYS.map((k, si) => 0.005 * g(d, -10 - si, 0));
      while (ipos.length && ipos[0].day <= d) list(cos[ipos.shift().id], d);
      let sum = 0, cnt = 0;
      for (const c of cos) {
        if (c.listDay === null || c.listDay === d || c.deadDay !== null) continue;
        const prev = c.close[t - 1];
        // fundamentals: growth above the average, the market, the sector
        c.F += (c.growth - 0.04) * 0.25 / 365 + c.beta * m + (c.cyc - 1) * TILT[reg] + sec[c.si];
        // mood: daily noise that fades back toward fundamentals
        c.S = c.S * (1 - KAPPA) + c.vol * g(d, c.id, 0);
        if ((d - c.listDay) % 91 === c.off) { // quarterly earnings: a surprise moves value, health and growth
          const e = g(d, c.id, 2);
          c.F += e * c.vol * 2.2;
          c.health = Math.min(100, c.health + 5 * e + 0.8 - 0.8 * c.debt);
          c.growth = 0.04 + 0.92 * (c.growth - 0.04) + 0.01 * e;
          report(c, d);
        }
        let px = Math.exp(c.F + c.S);
        if (c.health <= 0) { // bankrupt: shares crash today and are worth nothing from tomorrow
          px = prev * (0.02 + 0.06 * u(d, c.id, 4)); c.deadDay = d;
          // ponytail: new listings come from a fixed list of 16; when it runs out (many years) the exchange just shrinks. Append more to RESERVE.
          if (nextReserve >= 0 && nextReserve < cos.length) ipos.push({ day: d + 30 + Math.floor(u(d, c.id, 6) * 60), id: nextReserve++ });
        }
        c.close[t] = px; if (c.deadDay === null) { sum += Math.log(px / prev); cnt++; }
      }
      index[t] = index[t - 1] * Math.exp(cnt ? sum / cnt : 0); // the Composite: the typical move of surviving companies
    }

    const bySym = new Map(cos.map((c) => [c.sym, c]));
    const listed = (c, d) => c.listDay !== null && c.listDay <= d;
    const trading = (c, d = day) => listed(c, d) && (c.deadDay === null || d <= c.deadDay); // the crash day still trades
    const px = (c, d = day) => (trading(c, d) ? c.close[d - GENESIS] : 0);
    const cents = (c, d = day) => (trading(c, d) ? Math.max(1, Math.round(c.close[d - GENESIS] * 100)) : 0);
    const mkt = {
      day, regime: REGIMES[regime[n - 1]], companies: cos.filter((c) => listed(c, day)), index, trading, px, cents,
      get: (sym) => { const c = bySym.get(sym); return c && listed(c, day) ? c : null; },
      // the only price trades ever use
      quote(sym) { const c = mkt.get(sym); return c ? { cents: cents(c), tradable: trading(c) } : null; },
      change(c, d = day) { return trading(c, d) && d > c.listDay ? px(c, d) / px(c, d - 1) - 1 : 0; },
      indexAt: (d = day) => index[Math.max(0, Math.min(day, d) - GENESIS)],
      cap: (c) => px(c) * c.shares,
      yield: (c) => (px(c) ? c.dps / px(c) : 0),
      // shares traded: busier on big moves
      volume(c, d = day) { return trading(c, d) ? Math.round(c.shares * 0.004 * (1 + 25 * Math.abs(mkt.change(c, d))) * (0.7 + 0.6 * u(d, c.id, 3))) : 0; },
      healthLabel: (c) => (c.deadDay !== null ? 'Bankrupt' : c.health >= 70 ? 'Strong' : c.health >= 45 ? 'Stable' : c.health >= 25 ? 'Weak' : 'Distressed'),
      // the path the price took during day d, from the previous close to that day's close
      intraday(c, d = day, steps = 26) {
        const b = Math.log(px(c, d)), a = d > c.listDay ? Math.log(px(c, d - 1)) : b, w = [0];
        for (let k = 1; k <= steps; k++) w.push(w[k - 1] + c.vol / Math.sqrt(steps) * g(d, c.id, 20 + 2 * k));
        return w.map((x, k) => ({ d, f: k / steps, v: Math.exp(a + (b - a) * k / steps + x - w[steps] * k / steps) }));
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

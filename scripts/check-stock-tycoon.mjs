// Check for Stock Tycoon's account, market and trading logic: `node scripts/check-stock-tycoon.mjs`. Exits non-zero on failure.
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url), A = req('../games/stock-tycoon/account.js'), M = req('../games/stock-tycoon/engine.js'), C = req('../games/stock-tycoon/companies.js');
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const D0 = 22000;

// calendar follows the player's timezone
const t = Date.UTC(2026, 10, 17, 23, 30); // 23:30 UTC
ok(A.dayNumber(t, -600) === A.dayNumber(t, 0) + 1 && A.dayNumber(t, 300) === A.dayNumber(t, 0), 'at 23:30 UTC it is already tomorrow in UTC+10, still today in UTC-5');
ok(A.dayNumber(t + 30 * 60000, 0) === A.dayNumber(t, 0) + 1, 'the day changes at local midnight');
ok(A.date(A.dayNumber(t, 0)).toISOString().startsWith('2026-11-17'), 'a day number maps back to its calendar date');

// new player
let s = A.fresh(D0);
ok(s.cash === A.START_CASH && A.START_CASH >= 1000000 && A.dayCount(s) === 1 && A.nextPayIn(s) === 14, 'new player starts with savings, on day 1, 14 days from payday');

// salary
ok(A.tick(s, D0).pay === 0 && s.cash === A.START_CASH, 'nothing happens on the same day');
let r = A.tick(s, D0 + 13);
ok(r.days === 13 && r.pay === 0 && A.nextPayIn(s) === 1, '13 days in: no pay yet, payday tomorrow');
r = A.tick(s, D0 + 14);
ok(r.pay === A.SALARY && s.cash === A.START_CASH + A.SALARY && A.nextPayIn(s) === 14, 'day 14: one salary, next payday 14 days out');
ok(A.tick(s, D0 + 14).pay === 0 && A.tick(s, D0 + 14).pay === 0 && s.cash === A.START_CASH + A.SALARY, 'checking again (reload, reconnect) never pays twice');
r = A.tick(s, D0 + 3);
ok(r.days === 0 && r.pay === 0 && s.day === D0 + 14, 'a clock set backwards changes nothing');
r = A.tick(s, D0 + 100);
ok(r.paydays === 6 && s.paid === 7 && s.cash === A.START_CASH + 7 * A.SALARY && s.payTotal === 7 * A.SALARY, 'away 86 days: the 6 missed paydays arrive at once, 7 in total');
{ // broke player: waiting is the way back
  const b = A.fresh(D0); b.cash = 0;
  A.tick(b, D0 + 13); const before = b.cash; A.tick(b, D0 + 14);
  ok(before === 0 && b.cash === A.SALARY, 'a player at zero has money again after the fortnight, not before');
}
{ // paying day by day equals paying in one jump
  const a = A.fresh(D0), b = A.fresh(D0);
  for (let d = 1; d <= 365; d++) A.tick(a, D0 + d);
  A.tick(b, D0 + 365);
  ok(a.cash === b.cash && a.paid === 26, 'a year day by day pays the same as a year in one jump (26 paydays)');
}

// save and rejoin
const st = mem();
ok(A.save(st, s), 'save succeeds');
ok(JSON.stringify(A.load(st)) === JSON.stringify(s), 'rejoining restores the exact account');
const again = A.load(st);
ok(A.tick(again, D0 + 100).pay === 0, 'rejoining the same day pays nothing');
A.tick(s, D0 + 101); A.save(st, s);
st.setItem(A.KEY, st.getItem(A.KEY).replace(/\d/, 'x'));
ok(A.load(st)?.rev === s.rev - 1, 'a corrupted save falls back to the previous good one');
const forged = JSON.parse(A.encode(s)); forged.body = forged.body.replace(`"cash":${s.cash}`, '"cash":99999999');
ok(A.decode(JSON.stringify(forged)) === null, 'a save edited without its checksum is rejected');
ok(A.decode(A.encode({ ...s, cash: -5 })) === null && A.decode(A.encode({ ...s, paid: 0, day: s.start - 1 })) === null && A.decode(A.encode({ ...s, paid: 99 })) === null,
  'negative cash, a day before the start, or more paydays than days allow is rejected');
ok(A.load(mem()) === null && A.load({ getItem() { throw new Error('blocked'); } }) === null, 'no save, or blocked storage, means a new game instead of a crash');
ok(A.save({ getItem: () => null, setItem() { throw new Error('full'); } }, A.fresh(D0)) === false, 'a failed save is reported, not thrown');


// ---- companies
const syms = C.COMPANIES.map((c) => c.sym), names = C.COMPANIES.map((c) => c.name);
ok(new Set(syms).size === syms.length && new Set(names).size === names.length && syms.every((k) => /^[A-Z]{4}$/.test(k)), 'every company has a unique name and 4-letter ticker');
ok(C.COMPANIES.filter((c) => !c.reserve).length >= 50 && new Set(C.COMPANIES.map((c) => c.sec)).size === 24 && C.COMPANIES.every((c) => C.SECTORS[c.sec]), 'at least 50 companies listed from the start, across 24 industries');

// ---- market
const T = Math.floor(Date.now() / 864e5), G = M.GENESIS, m = M.build(T), later = M.build(T + 40);
const liveAt = (k) => k.companies.filter((c) => k.trading(c));
ok(liveAt(m).length >= 50, `${liveAt(m).length} companies are trading today`);
ok([1, 2, 3].every((y) => liveAt(M.build(T + 365 * y)).length >= 50), 'at least 50 companies still trade one, two and three years from now');
{ // two players (two builds) see the same market, and tomorrow never rewrites yesterday
  const again = M.build(T); let same = true, stable = true;
  for (const c of m.companies) for (let d = c.listDay; d <= T; d++) { if (again.px(again.get(c.sym), d) !== m.px(c, d)) same = false; if (later.px(later.get(c.sym), d) !== m.px(c, d)) stable = false; }
  ok(same, 'two players get exactly the same prices for every company on every day');
  ok(stable, 'history is fixed: prices up to today are identical when rebuilt 40 days later');
}
{ // sane prices
  let bad = 0, mixed = 0, daysN = 0, big = 0, steps = 0;
  for (let d = G + 1; d <= T; d++) {
    let up = 0, dn = 0;
    for (const c of m.companies) { if (!m.trading(c, d) || d <= c.listDay) continue; const p = m.px(c, d), ch = m.change(c, d);
      if (!(p > 0) || !Number.isFinite(p)) bad++; if (ch > 0) up++; else if (ch < 0) dn++; if (d !== c.deadDay) { steps++; if (Math.abs(ch) > 0.25) big++; } }
    daysN++; if (up && dn) mixed++;
  }
  ok(bad === 0, 'no price is ever zero, negative or not a number while a company trades');
  ok(mixed / daysN > 0.99, `stocks do not all move together (mixed up and down on ${(mixed / daysN * 100).toFixed(1)}% of days)`);
  ok(big / steps < 0.001, `single-day moves over 25% are rare (${big} in ${steps})`);
  const ratios = liveAt(m).filter((c) => c.listDay === G).map((c) => m.px(c) / c.price), yr = Math.pow(m.indexAt() / 1000, 365 / (T - G)) - 1;
  ok(Math.max(...ratios) < 30 && ratios.some((r) => r < 1) && ratios.some((r) => r > 1.5), `five years in: some winners, some losers, best is ${Math.max(...ratios).toFixed(1)}x`);
  ok(yr > -0.1 && yr < 0.2, `the Composite has averaged ${(yr * 100).toFixed(1)}% a year, not a runaway`);
}
{ // companies behave differently
  const sd = (k) => { const c = m.get(k); let q = 0, n = 0; for (let d = c.listDay + 1; d <= T && m.trading(c, d); d++) { q += Math.log(m.px(c, d) / m.px(c, d - 1)) ** 2; n++; } return Math.sqrt(q / n); };
  ok(sd('HBSB') < sd('QLLN') && sd('QLLN') < sd('NVCR') && sd('BFRY') * 2.5 < sd('MDLM'), `a bank (${(sd('HBSB') * 100).toFixed(1)}% a day) is calmer than big tech, which is calmer than an AI company (${(sd('NVCR') * 100).toFixed(1)}%)`);
}
{ // bankruptcy and new listings
  const far = M.build(T + 3650), dead = far.companies.filter((c) => c.deadDay !== null), d0 = dead[0];
  ok(dead.length >= 3 && dead.length <= 16, `${dead.length} companies go bankrupt over the next ten years`);
  ok(far.px(d0, d0.deadDay) < far.px(d0, d0.deadDay - 1) * 0.1 && far.px(d0, d0.deadDay + 1) === 0 && far.cents(d0) === 0 && !far.quote(d0.sym).tradable, 'a bankrupt stock crashes, then is worth nothing and cannot be traded');
  const ipo = far.companies.filter((c) => c.reserve);
  ok(ipo.length > 0 && ipo.every((c) => c.listDay > G) && M.build(ipo[0].listDay - 1).get(ipo[0].sym) === null, 'new companies list after a bankruptcy and do not exist before their listing day');
}
{ // charts are the real history
  const c = m.get('QLLN'), mo = m.series(c, 'M'), day = m.series(c, 'D'), max = m.series(c, 'MAX');
  ok(mo.length === 31 && mo.every((p) => p.v === m.px(c, p.d)) && mo.at(-1).d === T, 'the month chart is the last 31 real closing prices');
  ok(max.length === T - G + 1 && m.series(c, '5Y').length === 1826 && m.series(c, 'W').length === 8, 'week, 5 year and max charts cover the right days');
  ok(Math.abs(day[0].v - m.px(c, T - 1)) < 1e-9 && Math.abs(day.at(-1).v - m.px(c)) < 1e-9 && day.length === 27, 'the day chart runs from yesterday\'s close to today\'s price');
}

// ---- trading
{
  const p = A.fresh(T), px = m.quote('QLLN').cents;
  ok(!A.buy(p, m, 'QLLN', 0).ok && !A.buy(p, m, 'QLLN', -5).ok && !A.buy(p, m, 'QLLN', 1.5).ok && !A.buy(p, m, 'QLLN', NaN).ok && !A.buy(p, m, 'NOPE', 1).ok && !A.buy(p, m, '__proto__', 1).ok, 'zero, negative, fractional or nonsense orders are refused');
  ok(!A.buy(p, m, 'QLLN', Math.floor(p.cash / px) + 1).ok && p.cash === A.START_CASH, 'cannot buy more than the cash allows');
  ok(!A.sell(p, m, 'QLLN', 1).ok, 'cannot sell a stock that is not owned');
  const r1 = A.buy(p, m, 'QLLN', 10);
  ok(r1.ok && p.cash === A.START_CASH - 10 * px && p.holdings.QLLN.sh === 10 && p.holdings.QLLN.cost === 10 * px && A.netWorth(p, m) === A.START_CASH, 'buying 10 shares costs exactly 10 x price and net worth is unchanged');
  ok(!A.sell(p, m, 'QLLN', 11).ok, 'cannot sell more shares than owned');
  const r2 = A.sell(p, m, 'QLLN', 10);
  ok(r2.ok && r2.pl === 0 && p.cash === A.START_CASH && !p.holdings.QLLN && p.trades.length === 2, 'buying and selling the same day makes and loses nothing, and both trades are recorded');
  // price moves, then sell part: average cost and realised profit
  A.buy(p, m, 'QLLN', 10); A.tick(p, T + 40);
  ok(!A.sell(p, m, 'QLLN', 1).ok && !A.buy(p, m, 'QLLN', 1).ok, 'a trade against an out-of-date market is refused');
  const px2 = later.quote('QLLN').cents; A.buy(p, later, 'QLLN', 10);
  ok(p.holdings.QLLN.cost === 10 * px + 10 * px2, 'average cost blends both purchases');
  const cashB = p.cash, r3 = A.sell(p, later, 'QLLN', 5), expect = 5 * px2 - Math.round((10 * px + 10 * px2) * 5 / 20);
  ok(r3.pl === expect && p.realised === expect && p.cash === cashB + 5 * px2 && p.holdings.QLLN.sh === 15, 'selling part books the right profit or loss against average cost');
  ok(A.netWorth(p, later) === p.cash + 15 * px2, 'net worth is cash plus shares at today\'s price');
  const st2 = mem(); A.toggleWatch(p, 'NVCR'); A.save(st2, p);
  ok(JSON.stringify(A.load(st2)) === JSON.stringify(p), 'holdings, trades and watchlist survive leaving and rejoining');
  const v1 = JSON.stringify({ v: 1, rev: 3, start: T, day: T, cash: 5, paid: 0, payTotal: 0 }), enc = JSON.parse(A.encode({})); enc.body = v1;
  ok(A.decode(A.encode(JSON.parse(v1)))?.v === 2, 'a save from before trading existed still loads');
  ok(A.decode(A.encode({ ...p, holdings: { QLLN: { sh: -3, cost: 0 } } })) === null, 'a save with negative shares is rejected');
}
{ // holding a company through bankruptcy
  const far = M.build(T + 3650), c = far.companies.find((x) => x.deadDay !== null && x.deadDay > T + 5), pre = M.build(c.deadDay - 1), post = M.build(c.deadDay + 1);
  const p = A.fresh(c.deadDay - 1); A.buy(p, pre, c.sym, 3); const paid = p.holdings[c.sym].cost;
  ok(!A.writeOff(p, pre, c.sym).ok, 'a healthy holding cannot be written off');
  A.tick(p, c.deadDay + 1);
  ok(A.holdingsValue(p, post) === 0 && !A.sell(p, post, c.sym, 3).ok && !A.buy(p, post, c.sym, 1).ok, `${c.name} goes bankrupt: the shares are worth nothing and cannot be sold or bought`);
  const w = A.writeOff(p, post, c.sym);
  ok(w.ok && w.pl === -paid && p.realised === -paid && !p.holdings[c.sym], 'writing them off books the whole loss');
}
{ // a reckless random trader over two years: money is never created or lost outside price moves and salary
  const p = A.fresh(T); let k = 7, okAll = true; const rnd = () => (k = (k * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let d = T; d < T + 730; d += 5) {
    const mk = M.build(d); A.tick(p, d);
    for (let i = 0; i < 6; i++) {
      const c = mk.companies[Math.floor(rnd() * mk.companies.length)], before = A.netWorth(p, mk), held = Object.keys(p.holdings);
      rnd() < 0.5 ? A.buy(p, mk, c.sym, Math.ceil(rnd() * 30)) : A.sell(p, mk, held[Math.floor(rnd() * held.length)] || c.sym, Math.ceil(rnd() * 30));
      if (p.cash < 0 || A.netWorth(p, mk) !== before || Object.values(p.holdings).some((h) => h.sh <= 0 || h.cost < 0)) okAll = false;
    }
    if (A.decode(A.encode(p)) === null) okAll = false;
  }
  ok(okAll && p.trades.length > 100, `a random trader over two years (${p.trades.length} trades) never goes below zero cash, and no trade changes net worth`);
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok'); process.exit(fails.length ? 1 : 0);

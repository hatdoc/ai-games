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
  ok(dead.length >= 3 && dead.length <= 24, `${dead.length} companies go bankrupt over the next ten years`);
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
  ok(A.decode(A.encode(JSON.parse(v1)))?.v === A.VERSION, 'a save from before trading existed still loads');
  const { divTotal, divBy, divs, worth, ...v2 } = { ...p, v: 2 };
  ok(A.decode(A.encode(v2))?.holdings.QLLN.sh === 15, 'a save from before dividends existed still loads with its holdings');
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


// ---- events, news and rumours
{
  const far = M.build(T + 3650), E = req('../games/stock-tycoon/events.js'), N = far.news, span = T + 3650 - G;
  ok(N.length / span > 0.7 && N.length / span < 3 && N.every((x, i) => x.id === i && x.d > G && x.d <= far.day && x.title && x.body && x.cat && x.level && x.impact), `about ${(N.length / span).toFixed(1)} news stories a day, each with headline, story, date, category, importance and market impact`);
  ok(JSON.stringify(m.news) === JSON.stringify(later.news.filter((x) => x.d <= T)), 'news is fixed history too: today\'s feed is identical when rebuilt 40 days later, with nothing from the future in it');
  const cats = new Set(N.map((x) => x.cat));
  ok(['Global', 'Economy', 'Politics', 'Company', 'Industry', 'Results', 'Markets', 'Deals', 'Rumour'].every((k) => cats.has(k)), 'world, economy, politics, company, industry, results, market, deal and rumour stories all occur');
  // company news matches the stock's move
  const big = N.filter((x) => x.sym && E.CO[x.kind] && x.cat !== 'Rumour' && !x.denial && Math.abs((E.CO[x.kind].lo + E.CO[x.kind].hi) / 2) >= 10 && x.level !== 'Minor' && x.level !== 'Moderate');
  const agree = big.filter((x) => Math.sign(x.ch) === Math.sign(E.CO[x.kind].lo + E.CO[x.kind].hi)).length;
  ok(big.length > 50 && agree / big.length > 0.97, `major company news moves the stock the right way (${agree} of ${big.length})`);
  const avg = (kind) => { const xs = N.filter((x) => x.kind === kind && x.sym && x.cat !== 'Rumour' && !x.denial); return xs.reduce((a, x) => a + x.ch, 0) / xs.length; };
  ok(avg('fraud') < -0.15 && avg('trialwin') > 0.15 && avg('resign') < -0.02 && avg('contract') > 0.03 && avg('bankrupt') < -0.9
    && avg('affair') < -0.03 && avg('guidedown') < -0.05 && avg('guideup') > 0.04 && avg('viral') > 0.05 && avg('breach') < -0.04 && avg('strikeoil') > 0.08, `average move: fraud ${(avg('fraud') * 100).toFixed(0)}%, trial success +${(avg('trialwin') * 100).toFixed(0)}%, CEO resigns ${(avg('resign') * 100).toFixed(0)}%, contract +${(avg('contract') * 100).toFixed(0)}%, bankruptcy ${(avg('bankrupt') * 100).toFixed(0)}%`);
  ok(N.filter((x) => x.sym).every((x) => { const c = far.get(x.sym); return x.kind === 'ipo' || Math.abs(far.change(c, x.d) - x.ch) < 1e-9; }), 'the move quoted in every company story is the stock\'s real move that day');
  // world events hit the right industries
  const secMove = (key, d) => { const cs = far.companies.filter((c) => c.sec === key && far.trading(c, d) && d > c.listDay && c.deadDay !== d); return cs.length ? cs.reduce((a, c) => a + far.change(c, d), 0) / cs.length : null; }; // null: nobody in that industry is trading that day
  const mean = (kind, key) => { const xs = N.filter((x) => x.kind === kind && !x.sym && !x.body.startsWith('Markets are unwinding') && secMove(key, x.d) !== null) /* the start of an event, not its end */; return xs.reduce((a, x) => a + secMove(key, x.d) - x.ch, 0) / xs.length; };
  ok(mean('oil', 'oil') > 0.04 && mean('oil', 'trans') < -0.02 && mean('disaster', 'ins') < -0.03 && mean('green', 'renew') > 0.03 && mean('drugprice', 'pharma') < -0.03
    && mean('standoff', 'aero') > 0.015 && mean('electbad', 'bank') < -0.015 && mean('airules', 'ai') < -0.04 && mean('defence', 'aero') > 0.04 && mean('metals', 'mine') > 0.04,
    `against the market: oil shortage moves oil ${(mean('oil', 'oil') * 100).toFixed(0)}% and transport ${(mean('oil', 'trans') * 100).toFixed(0)}%; an earthquake moves insurers ${(mean('disaster', 'ins') * 100).toFixed(0)}%`);
  const hikes = N.filter((x) => x.kind === 'rates' && x.title.includes('raises')), cuts = N.filter((x) => x.kind === 'rates' && x.title.includes('cuts'));
  const rel = (all, key) => { const xs = all.filter((x) => secMove(key, x.d) !== null); return xs.reduce((a, x) => a + secMove(key, x.d) - x.ch, 0) / xs.length; };
  ok(hikes.length > 3 && cuts.length > 3 && rel(hikes, 're') < 0 && rel(cuts, 're') > 0 && far.rate >= 0.25 && far.rate <= 12 && far.infl > -1 && far.infl < 15, `${hikes.length} rate rises and ${cuts.length} cuts in 15 years: property falls on rises and gains on cuts`);
  // rumours: some true, some false, better sources more often right
  const tr = [0, 1, 2].map((s) => { const xs = N.filter((x) => x.cat === 'Rumour' && x.rumour === s); return xs.filter((x) => x.real).length / xs.length; });
  ok(tr[0] > 0.1 && tr[0] < tr[1] && tr[1] < tr[2] && tr[2] < 0.95, `rumours come true ${tr.map((x) => (x * 100).toFixed(0) + '%').join(' / ')} of the time for low / medium / high reliability sources`);
  const rum = N.filter((x) => x.cat === 'Rumour'), truth = rum.filter((x) => x.real), followed = truth.filter((x) => N.some((y) => y.sym === x.sym && y.kind === x.kind && y.cat !== 'Rumour' && y.d > x.d && y.d <= x.d + 7 && /rumours/.test(y.body)));
  const denied = rum.filter((x) => !x.real && N.some((y) => y.sym === x.sym && y.kind === x.kind && y.d > x.d && y.d <= x.d + 8 && /denying/.test(y.body)));
  const dying = (x) => { const c = far.get(x.sym); return c.deadDay !== null && c.deadDay <= x.d + 8; };
  ok(truth.filter((x) => !dying(x) && x.d + 7 <= far.day).every((x) => followed.includes(x)) && rum.filter((x) => !x.real && !dying(x) && x.d + 8 <= far.day).every((x) => denied.includes(x)),
    `every true rumour (${truth.length}) is followed by the real announcement within a week, every false one (${rum.length - truth.length}) by a denial`);
  ok(far.companies.filter((c) => c.deadDay !== null).every((c) => N.some((x) => x.sym === c.sym && x.kind === 'bankrupt' && x.d === c.deadDay)) && far.companies.filter((c) => c.reserve).every((c) => N.some((x) => x.sym === c.sym && x.kind === 'ipo' && x.d === c.listDay)), 'every bankruptcy and every new listing has its news story on the day');
  ok(far.nextReport(far.get('QLLN')) > far.day && far.nextReport(far.get('QLLN')) <= far.day + 91 && far.nextRates() > far.day && far.nextRates() <= far.day + 30, 'the next earnings report and rate decision dates are in the future');
}


// ---- dividends
{
  const end = T + 400, mk = M.build(end), bank = mk.get('HBSB'), ai = mk.get('MDLM');
  const pays = bank.divs.filter((v) => v.pay > T && v.pay <= end);
  ok(pays.length >= 4 && pays.every((v) => v.pay === v.decl + 14 && v.cents > 0) && ai.divs.length === 0, `a bank declares a dividend every quarter (${pays.length} in 400 days), paid two weeks later; a company with no dividend policy never pays`);
  const p = A.fresh(T); A.buy(p, m, 'HBSB', 50); const cash0 = p.cash;
  const r = A.tick(p, end, mk), expect = pays.reduce((a, v) => a + 50 * v.cents, 0);
  ok(r.div === expect && p.divTotal === expect && p.divBy.HBSB === expect && p.divs.length === pays.length && p.cash === cash0 + expect + r.pay, `50 shares held for 400 days receive exactly 50 x each payment (${(expect / 100).toFixed(2)} dollars), on top of salary`);
  ok(A.tick(p, end, mk).div === 0 && p.divTotal === expect, 'checking again never pays a dividend twice');
  const q = A.fresh(T); A.buy(q, m, 'HBSB', 50); for (let d = T + 1; d <= end; d++) A.tick(q, d, M.build(d));
  ok(q.cash === p.cash && q.divTotal === p.divTotal, 'logging in every day pays the same as coming back after 400 days');
  ok(p.worth.length === 400 && p.worth[0][0] === T && p.worth.at(-1)[0] === end - 1 && p.worth[0][1] === A.START_CASH && p.worth.every((w) => Number.isSafeInteger(w[1])), 'net worth is recorded once for every day that passed');
  // who gets it: shares held overnight into the payment day
  const pay = pays[0].pay, before = M.build(pay - 1), onDay = M.build(pay);
  const early = A.fresh(pay - 1); A.buy(early, before, 'HBSB', 10); const e = A.tick(early, pay, onDay);
  const late = A.fresh(pay); A.buy(late, onDay, 'HBSB', 10); const l = A.tick(late, pay + 1, M.build(pay + 1));
  ok(e.div === 10 * pays[0].cents && l.div === 0, 'shares bought the day before a payment get it; shares bought on the payment day do not');
  // no free money: the share price drops by the dividend on payment day
  let edge = 0, n = 0;
  for (const c of mk.companies) for (const v of c.divs) { if (v.pay > mk.day || !mk.trading(c, v.pay) || v.pay === c.deadDay) continue; edge += (mk.cents(c, v.pay) + mk.dividendOn(c, v.pay)) / mk.cents(c, v.pay - 1) - 1; n++; }
  ok(n > 300 && Math.abs(edge / n) < 0.003, `buying the day before every dividend and selling on the day earns ${(edge / n * 100).toFixed(2)}% on average over ${n} payments: no free money`);
  // a bankrupt company pays nothing
  const far = M.build(T + 3650), dead = far.companies.filter((c) => c.deadDay !== null);
  ok(dead.every((c) => { for (let d = c.deadDay; d <= c.deadDay + 20; d++) if (far.dividendOn(c, d)) return false; return far.nextDividend(c) === null; }), 'a bankrupt company never pays a dividend');
  ok(far.dividendOn(bank, far.day + 5) === 0, 'a dividend is never paid for a day that has not happened yet');
}


// ---- candlesticks and daily ranges
{
  const c = m.get('QLLN'), mo = m.candles(c, 'M'), five = m.candles(c, '5Y'), day = m.candles(c, 'D');
  const sane = (b) => b.l <= Math.min(b.o, b.c) + 1e-9 && b.h >= Math.max(b.o, b.c) - 1e-9 && b.l > 0;
  ok(mo.length === 31 && mo.every(sane) && mo.every((b) => Math.abs(b.c - m.cents(c, b.d) / 100) < 1e-9 && Math.abs(b.o - m.cents(c, b.d - 1) / 100) < 1e-9), 'month candles: one per day, each opening at the previous close and closing at that day\'s real price');
  ok(five.length <= 62 && five.every(sane) && five.at(-1).c === mo.at(-1).c && day.length === 13 && day.every(sane), `long timeframes group days into at most about 60 candles (${five.length} for 5 years); the day view has 13`);
  const r = m.range(c);
  ok(r.o === m.cents(c, T - 1) && r.c === m.cents(c) && r.l <= r.o && r.l <= r.c && r.h >= r.o && r.h >= r.c, 'a day\'s range runs from the previous close to the close and contains both');
}

// ---- limit orders
{
  const mk = M.build(T + 45), at = (d) => (d === T ? m : M.build(d));
  let fills = 0, wrong = 0, expired = 0;
  for (const c of m.companies.filter((x) => mk.trading(x, T + 45)).slice(0, 24)) {
    for (const side of ['B', 'S']) {
      const p = A.fresh(T), px0 = m.cents(c); if (side === 'S') A.buy(p, m, c.sym, 5);
      const lim = Math.round(px0 * (side === 'B' ? 0.97 : 1.03)), cash0 = p.cash, o = A.placeOrder(p, m, c.sym, side, 5, lim);
      if (!o.ok) { wrong++; continue; }
      let want = null; // work out independently where it should fill
      for (let d = T + 1; d <= T + 30 && !want; d++) { const r = mk.range(mk.get(c.sym), d); if (side === 'B' ? r.l <= lim : r.h >= lim) want = { d, px: side === 'B' ? Math.min(lim, r.o) : Math.max(lim, r.o) }; }
      const res = A.tick(p, T + 45, mk);
      if (want) { fills++; const f = res.fills[0]; if (!f || f.on !== want.d || f.px !== want.px || p.cash - res.pay - res.div !== cash0 + (side === 'B' ? -5 : 5) * want.px || p.orders.length) wrong++; }
      else { expired++; if (res.fills.length || res.dropped[0]?.why !== 'it expired' || p.orders.length) wrong++; }
    }
  }
  ok(fills > 10 && expired > 3 && wrong === 0, `48 limit orders at 3% from the price: ${fills} filled on the first day the price reached them, at the limit or better; ${expired} expired after 30 days`);
  const p = A.fresh(T);
  ok(!A.placeOrder(p, m, 'QLLN', 'S', 1, 100).ok && !A.placeOrder(p, m, 'QLLN', 'B', 1, 0).ok && !A.placeOrder(p, m, 'QLLN', 'B', 1.5, 100).ok && !A.placeOrder(p, m, 'NOPE', 'B', 1, 100).ok && !A.placeOrder(p, m, 'QLLN', 'Z', 1, 100).ok, 'cannot place a sell order for shares not owned, or an order with a bad price, size or side');
  A.buy(p, m, 'QLLN', 10);
  ok(A.placeOrder(p, m, 'QLLN', 'S', 6, 99999).ok && !A.placeOrder(p, m, 'QLLN', 'S', 5, 99999).ok && A.placeOrder(p, m, 'QLLN', 'S', 4, 99999).ok, 'sell orders can never add up to more shares than are held');
  ok(A.cancelOrder(p, p.orders[0].id).ok && p.orders.length === 1 && !A.cancelOrder(p, 999).ok, 'an order can be cancelled');
  for (let i = 0; i < 30; i++) A.placeOrder(p, m, 'HBSB', 'B', 1, 100);
  ok(p.orders.length === A.MAX_ORDERS, `open orders are capped at ${A.MAX_ORDERS}`);
  // a buy order that the cash can no longer cover is dropped, never filled into debt
  const q = A.fresh(T), cq = m.get('QLLN'); A.placeOrder(q, m, 'QLLN', 'B', 40, m.cents(cq) * 2); A.buy(q, m, 'HBSB', Math.floor(q.cash / m.cents(m.get('HBSB'))));
  const rq = A.tick(q, T + 1, M.build(T + 1));
  ok(rq.dropped[0]?.why === 'there was not enough cash' && q.cash >= 0 && !q.holdings.QLLN, 'a limit buy the player can no longer afford is dropped instead of putting them into debt');
  // no free money from dip-buying: buy every 2% dip with a limit, value it at that day's close
  let edge = 0, n = 0;
  for (const c of m.companies) for (let d = Math.max(c.listDay + 1, T - 900); d <= T && m.trading(c, d) && d !== c.deadDay; d++) { const r = m.range(c, d), lim = Math.round(r.o * 0.98); if (r.l <= lim) { edge += r.c / Math.min(lim, r.o) - 1; n++; } }
  ok(n > 2000 && edge / n < 0.002, `a limit order 2% below the price, filled ${n} times, is worth ${(edge / n * 100).toFixed(2)}% at that day's close on average: no free money`);
}

// ---- advanced trading: borrowing, short selling, margin calls
{
  const rich = () => { const p = A.fresh(T); p.cash = 3000000; return p; };
  const poor = A.fresh(T);
  ok(!A.short(poor, m, 'QLLN', 1).ok && !A.setAdvanced(poor, m, true).ok && !A.buy(poor, m, 'QLLN', Math.floor(poor.cash / m.cents(m.get('QLLN'))) + 1).ok, 'without advanced trading there is no shorting and no borrowing, and it cannot be turned on below $20,000');
  const p = rich(), px = m.cents(m.get('QLLN'));
  ok(A.setAdvanced(p, m, true).ok && A.buyingPower(p, m) === 6000000, 'with advanced trading on, $30,000 can open $60,000 of positions');
  const n2 = Math.floor(6000000 / px);
  ok(!A.buy(p, m, 'QLLN', n2 + 1).ok && A.buy(p, m, 'QLLN', n2).ok && p.cash < 0 && A.netWorth(p, m) === 3000000 && A.marginLevel(p, m) >= 0.5 && !A.buy(p, m, 'HBSB', 5).ok, 'borrowing stops at twice your own money');
  ok(!A.setAdvanced(p, m, false).ok, 'advanced trading cannot be turned off while money is borrowed');
  const loan = -p.cash, m1 = M.build(T + 1), r1 = A.tick(p, T + 1, m1), want = Math.ceil(loan * (m1.rateAt(T + 1) + A.LOAN_SPREAD) / 36500);
  ok(r1.costs === want && p.costs === want && want > 0, `a day's interest on a ${(loan / 100).toFixed(0)} dollar loan at ${(m1.rateAt(T + 1) + A.LOAN_SPREAD).toFixed(2)}% a year is ${(want / 100).toFixed(2)} dollars`);
  // short selling
  const s2 = rich(); A.setAdvanced(s2, m, true);
  ok(!A.cover(s2, m, 'QLLN', 1).ok, 'cannot cover a short that does not exist');
  const sh = A.short(s2, m, 'QLLN', 50);
  ok(sh.ok && s2.cash === 3000000 + 50 * px && A.netWorth(s2, m) === 3000000 && s2.shorts.QLLN.sh === 50 && !A.buy(s2, m, 'QLLN', 1).ok && !A.short(s2, m, 'QLLN', 100000).ok, 'shorting 50 shares adds the proceeds to cash, leaves net worth unchanged, and is limited by buying power');
  const d2 = T + 20, m2 = M.build(d2), t2 = A.tick(s2, d2, m2), px2 = m2.cents(m2.get('QLLN')), cashB = s2.cash, cv = A.cover(s2, m2, 'QLLN', 50);
  ok(cv.ok && cv.pl === 50 * (px - px2) && s2.cash === cashB - 50 * px2 && !s2.shorts.QLLN && t2.costs > 0, `covering 20 days later books 50 x the price change (${(cv.pl / 100).toFixed(2)} dollars), after ${(t2.costs / 100).toFixed(2)} dollars in borrow fees`);
  // a short pays the dividend
  const bank = M.build(T + 120).get('HBSB'), pay = bank.divs.find((v) => v.pay > T + 1), s3 = rich(); s3.start = s3.day = pay.pay - 1;
  const mb = M.build(pay.pay - 1); A.setAdvanced(s3, mb, true); A.short(s3, mb, 'HBSB', 100); const t3 = A.tick(s3, pay.pay, M.build(pay.pay));
  ok(t3.div === -100 * pay.cents && s3.divTotal === -100 * pay.cents, 'a short seller pays the dividend instead of receiving it');
  // shorting a company that then goes bankrupt
  const far = M.build(T + 3650), dead = far.companies.find((c) => c.deadDay !== null && c.deadDay > T + 5), pre = M.build(dead.deadDay - 2);
  const s4 = rich(); s4.start = s4.day = dead.deadDay - 2; A.setAdvanced(s4, pre, true); A.short(s4, pre, dead.sym, 20); const got = s4.shorts[dead.sym].got;
  const t4 = A.tick(s4, dead.deadDay + 1, M.build(dead.deadDay + 1));
  ok(t4.squeezed[0]?.pl === got && !s4.shorts[dead.sym] && s4.realised === got, `short ${dead.name} into its bankruptcy: the short closes itself and keeps everything it sold the shares for`);
  // margin call: borrowed to the limit in a company that then collapses
  const s5 = rich(); s5.start = s5.day = dead.deadDay - 2; A.setAdvanced(s5, pre, true);
  A.buy(s5, pre, dead.sym, Math.floor(3000000 / pre.cents(pre.get(dead.sym)))); A.buy(s5, pre, 'HBSB', Math.floor(A.buyingPower(s5, pre) / pre.cents(pre.get('HBSB'))));
  A.placeOrder(s5, pre, 'HBSB', 'S', 1, 99999);
  const post = M.build(dead.deadDay + 1), t5 = A.tick(s5, dead.deadDay + 1, post);
  ok(t5.liquidated.length > 0 && s5.orders.length === 0 && (A.exposure(s5, post) === 0 || A.marginLevel(s5, post) >= A.INIT) && s5.trades.some((x) => x.liq), `margin call: ${dead.name} collapses, positions are closed automatically and open orders cancelled, leaving ${(A.netWorth(s5, post) / 100).toFixed(0)} dollars of 30,000`);
  // a reckless leveraged trader: longs, shorts and limit orders for two years
  const z = rich(); A.setAdvanced(z, m, true); let k = 11, good = true, calls = 0; const rnd = () => (k = (k * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let d = T; d < T + 730; d += 3) {
    const mk = M.build(d), t = A.tick(z, d, mk); calls += t.liquidated.length;
    for (let i = 0; i < 5; i++) {
      const c = mk.companies[Math.floor(rnd() * mk.companies.length)], before = A.netWorth(z, mk), a = rnd(), n = Math.ceil(rnd() * 60), own = Object.keys(z.holdings), sht = Object.keys(z.shorts);
      const r = a < 0.3 ? A.buy(z, mk, c.sym, n) : a < 0.5 ? A.short(z, mk, c.sym, n) : a < 0.7 ? A.sell(z, mk, own[Math.floor(rnd() * own.length)] || c.sym, n) : a < 0.85 ? A.cover(z, mk, sht[Math.floor(rnd() * sht.length)] || c.sym, n)
        : A.placeOrder(z, mk, c.sym, 'B', n, Math.round(mk.cents(c) * (0.9 + rnd() * 0.15)));
      if (A.netWorth(z, mk) !== before || (r.ok && a < 0.5 && A.marginLevel(z, mk) < A.INIT) || (z.holdings[c.sym] && z.shorts[c.sym])) good = false;
    }
    if (A.decode(A.encode(z)) === null) good = false;
  }
  ok(good && z.trades.length > 300, `a reckless borrower and short seller over two years (${z.trades.length} trades, ${calls} forced sales): no trade ever changes net worth or opens past the limit, and the save stays valid`);
  const { shorts, orders, oid, adv, costs, ...v3 } = { ...A.fresh(T), v: 3 };
  ok(A.decode(A.encode(v3))?.adv === false && A.decode(A.encode({ ...A.fresh(T), cash: -5 })) === null, 'a save from before advanced trading still loads; a debt without advanced trading is rejected');
}


// ---- wealth levels, lifestyle, reinvesting, research
{
  const p = A.fresh(T);
  ok(A.level(p) === 0 && A.LEVELS.length === 7 && A.LEVELS.every((l, i) => !i || l[0] > A.LEVELS[i - 1][0]), 'a new player is a Beginner investor, with seven levels up to Billionaire');
  p.cash = 6000000; ok(A.touchPeak(p, m) && A.level(p) === 2 && !A.touchPeak(p, m), 'reaching $60,000 makes an Experienced investor, announced once');
  p.cash = 100; A.touchPeak(p, m); ok(A.level(p) === 2 && p.peak === 6000000, 'a level is never lost when net worth falls');
  const q = A.fresh(T); q.cash = 5000000; const nw = A.netWorth(q, m);
  ok(!A.buyItem(q, 'home2').ok && !A.buyItem(q, 'nope').ok && A.buyItem(q, 'office1').ok && !A.buyItem(q, 'office1').ok && q.cash === 2000000 && A.netWorth(q, m) === nw - 3000000, 'lifestyle is paid in full from cash, once each, and is not part of net worth');
  ok(A.has(q, 'analyst') && !A.has(q, 'desk') && !A.has(A.fresh(T), 'analyst') && A.lifestyleValue(q) === 1800000, 'a private office unlocks the analyst view; it would sell for 60%');
  const sold = A.sellItem(q, 'office1');
  ok(sold.ok && sold.got === 1800000 && q.cash === 3800000 && !A.has(q, 'analyst') && !A.sellItem(q, 'office1').ok, 'selling it back returns 60% and removes the perk: buying and selling can never make money');
  const b = A.fresh(T); b.cash = 3000000; A.setAdvanced(b, m, true); A.buy(b, m, 'QLLN', Math.floor(5500000 / m.cents(m.get('QLLN'))));
  ok(b.cash < 0 && !A.buyItem(b, 'car1').ok, 'lifestyle cannot be bought with borrowed money');
  ok(A.decode(A.encode({ ...A.fresh(T), items: ['office1', 'office1'] })) === null && A.decode(A.encode({ ...A.fresh(T), items: ['gold'] })) === null, 'a save with duplicate or made-up items is rejected');
  const { peak, items, drip, ...v4 } = { ...A.fresh(T), v: 4, worth: [[T - 1, 2345600]] };
  ok(A.decode(A.encode(v4))?.peak === 2345600, 'a save from before levels existed loads, with its level worked out from its history');
  // reinvesting dividends
  const end = T + 400, mk = M.build(end), plain = A.fresh(T), re = A.fresh(T); re.drip = true;
  A.buy(plain, m, 'HBSB', 200); A.buy(re, m, 'HBSB', 200);
  const rp = A.tick(plain, end, mk), rr = A.tick(re, end, mk), extra = re.holdings.HBSB.sh - 200;
  ok(extra > 0 && rr.reinvested > 0 && re.trades.filter((t) => t.drip).length >= 4 && re.cash === plain.cash + (rr.div - rp.div) - rr.reinvested && re.cash >= 0, `with reinvesting on, 400 days of dividends bought ${extra} more shares, and every cent is accounted for`);
  // research is worth something: stocks the analyst calls cheap do better than the ones called expensive
  let cheap = 0, nc = 0, dear = 0, nd = 0;
  for (let d = T - 1500; d <= T - 90; d += 30) { const then = M.build(d); for (const c of then.companies) { if (!then.trading(c) || c.deadDay !== null) continue; const now = m.get(c.sym), gap = then.px(c) / then.fair(c) - 1;
    if (!m.trading(now, d + 90)) continue; const fwd = m.px(now, d + 90) / m.px(now, d) - 1; if (gap < -0.1) { cheap += fwd; nc++; } else if (gap > 0.1) { dear += fwd; nd++; } } }
  ok(nc > 100 && nd > 100 && cheap / nc > dear / nd + 0.01 && cheap / nc < dear / nd + 0.08, `over the next 90 days, stocks priced 10% under the analyst's estimate returned ${(cheap / nc * 100).toFixed(1)}% on average, those 10% over it ${(dear / nd * 100).toFixed(1)}%`);
}


// ---- weekly challenge
{
  const mon = A.weekStart(A.weekOf(T) + 1), sun = mon + 6, w = A.weekOf(mon); // next week, Monday to Sunday
  ok(new Date(mon * 864e5).getUTCDay() === 1 && new Date(sun * 864e5).getUTCDay() === 0 && A.weekOf(sun) === w && A.weekOf(sun + 1) === w + 1 && A.weekEnd(w) === sun, 'a challenge week runs Monday to Sunday');
  const mk0 = M.build(mon), rich = A.fresh(mon), poor = A.fresh(mon); rich.cash = 900000000; poor.cash = 5000;
  ok(A.joinChallenge(rich).ok && A.joinChallenge(poor).ok && !A.joinChallenge(rich).ok, 'a player joins once per week');
  ok(rich.chal.a.cash === A.CH_START && poor.chal.a.cash === A.CH_START && rich.cash === 900000000 && poor.cash === 5000, 'a millionaire and a beginner both start the challenge with exactly $10,000, and joining costs nothing');
  const a = rich.chal.a, b = poor.chal.a;
  ok(!A.setAdvanced(a, mk0, true).ok && !A.buyItem(a, 'car1').ok && !A.joinChallenge(a).ok && !A.has(a, 'analyst'), 'the challenge account has no borrowing, no shorting, no lifestyle and no office research');
  for (const x of [a, b]) { A.buy(x, mk0, 'QLLN', 20); A.buy(x, mk0, 'HBSB', 50); }
  A.placeOrder(a, mk0, 'NVCR', 'B', 1, 1);
  const mid = M.build(mon + 3), r1 = A.tick(rich, mon + 3, mid); A.tick(poor, mon + 3, mid);
  ok(rich.chal && a.day === mon + 3 && a.paid === 0 && r1.chal.pay === 0 && rich.paid === 0 && A.chalReturn(a, mid) === A.chalReturn(b, mid), 'same trades give the same return whatever the players\' wealth, and the challenge account gets no salary');
  const want = Math.round((A.netWorth(a, M.build(sun), sun) / A.CH_START - 1) * 10000);
  const after = M.build(sun + 9), r2 = A.tick(rich, sun + 9, after);
  ok(rich.chal === null && r2.chalDone.w === w && r2.chalDone.ret === want && rich.chalHist.at(-1).ret === want && a.day === sun, `the result is fixed at Sunday's close (${(want / 100).toFixed(2)}%), however late the player comes back`);
  ok(!A.joinChallenge(Object.assign(rich, { day: sun })).ok, 'a finished week cannot be replayed');
  rich.day = sun + 9; ok(A.joinChallenge(rich).ok && rich.chal.w === A.weekOf(sun + 9), 'the next week can be joined');
  const st = mem(); A.save(st, rich);
  ok(JSON.stringify(A.load(st)) === JSON.stringify(rich), 'the challenge account and past results survive leaving and rejoining');
  const forged = JSON.parse(JSON.stringify(rich)); forged.chal.a.cash = -5;
  const noFlag = JSON.parse(JSON.stringify(rich)); delete noFlag.chal.a.noPay;
  ok(A.decode(A.encode(forged)) === null && A.decode(A.encode(noFlag)) === null, 'a save whose challenge account is invalid is rejected');
  const { chal, chalHist, ...v5 } = { ...A.fresh(T), v: 5 };
  ok(A.decode(A.encode(v5))?.chal === null, 'a save from before the challenge existed still loads');
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok'); process.exit(fails.length ? 1 : 0);

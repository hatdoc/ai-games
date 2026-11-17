// Stock Tycoon account: the player's money, calendar, salary, trading and save. Pure logic, no DOM and no clock of
// its own: the caller passes in today's day number and the market. Runs in the browser and in Node (scripts/check-stock-tycoon.mjs).
// Money is whole cents everywhere. A game day is a real calendar day in the player's own timezone.
const Account = (() => {
  const VERSION = 4, KEY = 'stock-tycoon-save', BAK = KEY + '-bak';
  const START_CASH = 1000000; // savings the player arrives with
  const SALARY = 150000, PAY_EVERY = 14; // the job pays by itself every fortnight: the way back after losing everything
  // advanced trading (borrowing and short selling), off until the player turns it on
  const ADV_MIN = 2000000; // net worth needed to turn it on
  const INIT = 0.5; // to open a position, your own money must be at least half of everything you have at stake
  const MAINT = 0.3; // margin call: below this share, positions are closed for you until you are back at INIT
  const LOAN_SPREAD = 3, SHORT_FEE = 4; // yearly %: loans cost the central bank rate + 3, borrowed shares cost 4
  const ORDER_DAYS = 30, MAX_ORDERS = 20;

  // calendar day number in the player's timezone; tzOffsetMin is Date#getTimezoneOffset() (minutes behind UTC)
  const dayNumber = (ms, tzOffsetMin) => Math.floor((ms - tzOffsetMin * 60000) / 864e5);
  const date = (day) => new Date(day * 864e5); // format with timeZone: 'UTC'

  // holdings: { TICKER: { sh: shares, cost: total cents paid for them } }
  // shorts:   { TICKER: { sh: shares owed, got: total cents received for selling them } }
  // orders:   [{ id, k: ticker, side: 'B' | 'S', sh, lim: cents, d: day placed, exp: last day it can fill }]
  // trades:   [{ d, t: 'B' buy | 'S' sell | 'H' short | 'C' cover | 'X' written off, k, sh, px: cents each, pl: realised cents, lim?: limit order, liq?: margin call }]
  // divs:     [{ d, k, sh, c: cents per share }] (sh negative = paid by a short). worth: [[day, net worth at close]]
  const fresh = (today) => ({ v: VERSION, rev: 0, start: today, day: today, cash: START_CASH, paid: 0, payTotal: 0, holdings: {}, trades: [], realised: 0, watch: [],
    divTotal: 0, divBy: {}, divs: [], worth: [], shorts: {}, orders: [], oid: 0, adv: false, costs: 0 }); // costs: interest and borrow fees paid
  const value = (book, mkt, d) => Object.keys(book).reduce((v, k) => { const c = mkt.get(k); return v + (c ? book[k].sh * mkt.cents(c, d) : 0); }, 0);
  const holdingsValue = (s, mkt, d) => value(s.holdings, mkt, d);
  const shortValue = (s, mkt, d) => value(s.shorts, mkt, d); // what it would cost to buy back every shorted share
  const netWorth = (s, mkt, d) => s.cash + holdingsValue(s, mkt, d) - shortValue(s, mkt, d);
  const exposure = (s, mkt, d) => holdingsValue(s, mkt, d) + shortValue(s, mkt, d); // everything at stake, long and short
  const marginLevel = (s, mkt, d) => { const g = exposure(s, mkt, d); return g ? netWorth(s, mkt, d) / g : Infinity; }; // 1 = no borrowing at all
  // how many cents of new positions can be opened right now
  const buyingPower = (s, mkt, d) => (s.adv ? Math.max(0, Math.floor(netWorth(s, mkt, d) / INIT) - exposure(s, mkt, d)) : Math.max(0, s.cash));
  const dayCount = (s) => s.day - s.start + 1;
  const nextPayIn = (s) => PAY_EVERY - ((s.day - s.start) % PAY_EVERY); // days until the next payday, 1..14

  // ---- the four moves. Every trade, by hand or automatic, goes through these with a price taken from the market.
  const no = (error) => ({ ok: false, error });
  const log = (s, e) => { s.trades.push(e); if (s.trades.length > 5000) s.trades.shift(); }; // ponytail: keeps the latest 5000 trades
  function doBuy(s, k, sh, px, tag) {
    const h = s.holdings[k] || (s.holdings[k] = { sh: 0, cost: 0 });
    h.sh += sh; h.cost += sh * px; s.cash -= sh * px;
    log(s, { d: s.day, t: 'B', k, sh, px, pl: 0, ...tag });
  }
  function doSell(s, k, sh, px, tag) {
    const h = s.holdings[k], cost = sh === h.sh ? h.cost : Math.round(h.cost * sh / h.sh), pl = sh * px - cost; // average cost
    h.sh -= sh; h.cost -= cost; if (!h.sh) delete s.holdings[k];
    s.cash += sh * px; s.realised += pl;
    log(s, { d: s.day, t: 'S', k, sh, px, pl, ...tag });
    return pl;
  }
  function doShort(s, k, sh, px) {
    const h = s.shorts[k] || (s.shorts[k] = { sh: 0, got: 0 });
    h.sh += sh; h.got += sh * px; s.cash += sh * px;
    log(s, { d: s.day, t: 'H', k, sh, px, pl: 0 });
  }
  function doCover(s, k, sh, px, tag) {
    const h = s.shorts[k], got = sh === h.sh ? h.got : Math.round(h.got * sh / h.sh), pl = got - sh * px;
    h.sh -= sh; h.got -= got; if (!h.sh) delete s.shorts[k];
    s.cash -= sh * px; s.realised += pl;
    log(s, { d: s.day, t: 'C', k, sh, px, pl, ...tag });
    return pl;
  }

  // ---- orders placed by the player. Prices never come from the caller: they are looked up in the market for the account's own day.
  function quoteFor(s, mkt, sym, sh) {
    if (!Number.isSafeInteger(sh) || sh <= 0) return no('Enter a whole number of shares');
    if (mkt.day !== s.day) return no('The market is updating. Try again.');
    const q = mkt.quote(sym);
    if (!q) return no('No such company');
    if (!q.tradable) return no('This company has been delisted');
    if (!Number.isSafeInteger(sh * q.cents)) return no('That is too many shares');
    return { ok: true, cents: q.cents, total: sh * q.cents };
  }
  function buy(s, mkt, sym, sh) {
    const q = quoteFor(s, mkt, sym, sh);
    if (!q.ok) return q;
    if (s.shorts[sym]) return no('You are short this stock. Cover the short first.');
    if (q.total > buyingPower(s, mkt)) return no(s.adv ? 'Not enough buying power' : 'Not enough cash');
    doBuy(s, sym, sh, q.cents);
    return q;
  }
  function sell(s, mkt, sym, sh) {
    const q = quoteFor(s, mkt, sym, sh), h = s.holdings[sym];
    if (!q.ok) return q;
    if (!h || sh > h.sh) return no(h ? `You only own ${h.sh}` : 'You do not own this stock');
    return { ...q, pl: doSell(s, sym, sh, q.cents) };
  }
  // sell borrowed shares now, hoping to buy them back cheaper later
  function short(s, mkt, sym, sh) {
    const q = quoteFor(s, mkt, sym, sh);
    if (!q.ok) return q;
    if (!s.adv) return no('Turn on advanced trading to sell short');
    if (s.holdings[sym]) return no('You own this stock. Sell it first.');
    if (q.total > buyingPower(s, mkt)) return no('Not enough buying power');
    doShort(s, sym, sh, q.cents);
    return q;
  }
  function cover(s, mkt, sym, sh) {
    const q = quoteFor(s, mkt, sym, sh), h = s.shorts[sym];
    if (!q.ok) return q;
    if (!h || sh > h.sh) return no(h ? `You are only short ${h.sh}` : 'You are not short this stock');
    return { ...q, pl: doCover(s, sym, sh, q.cents) };
  }
  // shares of a bankrupt, delisted company: remove them and book the loss
  function writeOff(s, mkt, sym) {
    const q = mkt.quote(sym), h = s.holdings[sym];
    if (!h || !q || q.tradable || mkt.day !== s.day) return no('Nothing to write off');
    delete s.holdings[sym]; s.realised -= h.cost;
    log(s, { d: s.day, t: 'X', k: sym, sh: h.sh, px: 0, pl: -h.cost });
    return { ok: true, pl: -h.cost };
  }
  function toggleWatch(s, sym) { const i = s.watch.indexOf(sym); if (i < 0) s.watch.push(sym); else s.watch.splice(i, 1); return i < 0; }
  function setAdvanced(s, mkt, on) {
    if (mkt.day !== s.day) return no('The market is updating. Try again.');
    if (on && netWorth(s, mkt) < ADV_MIN) return no('Advanced trading needs a net worth of $20,000');
    if (!on && (s.cash < 0 || Object.keys(s.shorts).length)) return no('Repay your loan and cover your shorts first');
    s.adv = !!on;
    return { ok: true };
  }
  // A limit order waits for its price: buy when the stock trades at or below the limit, sell at or above. It can fill from
  // tomorrow on, for 30 days. Cash and shares are checked again when it fills.
  function placeOrder(s, mkt, sym, side, sh, lim) {
    const q = quoteFor(s, mkt, sym, sh);
    if (!q.ok) return q;
    if (side !== 'B' && side !== 'S') return no('Choose buy or sell');
    if (!Number.isSafeInteger(lim) || lim <= 0 || !Number.isSafeInteger(sh * lim)) return no('Enter a limit price');
    if (s.orders.length >= MAX_ORDERS) return no(`You can have ${MAX_ORDERS} open orders at most`);
    if (side === 'B' && s.shorts[sym]) return no('You are short this stock. Cover the short first.');
    const queued = s.orders.filter((o) => o.k === sym && o.side === 'S').reduce((a, o) => a + o.sh, 0), own = s.holdings[sym] ? s.holdings[sym].sh : 0;
    if (side === 'S' && queued + sh > own) return no(own ? `You only own ${own}${queued ? `, and ${queued} are already in sell orders` : ''}` : 'You do not own this stock');
    const o = { id: ++s.oid, k: sym, side, sh, lim, d: s.day, exp: s.day + ORDER_DAYS };
    s.orders.push(o);
    return { ok: true, order: o };
  }
  function cancelOrder(s, id) { const i = s.orders.findIndex((o) => o.id === id); if (i < 0) return no('No such order'); s.orders.splice(i, 1); return { ok: true }; }

  // ---- the daily tick. Catch the account up to today, one day at a time: record each day's closing net worth, then on
  // the new day: salary, dividends, loan interest and borrow fees, limit orders, and the margin check.
  // Safe to call any number of times. A clock that went backwards changes nothing (the account never moves back in time).
  // mkt must be the market built for `today` (it can be left out only when the account has no positions or orders).
  function tick(s, today, mkt) {
    const out = { days: Math.max(0, today - s.day), paydays: 0, pay: 0, div: 0, costs: 0, fills: [], dropped: [], liquidated: [], squeezed: [] };
    for (let d = s.day; d < today; d++) {
      if (mkt) { s.worth.push([d, netWorth(s, mkt, d)]); if (s.worth.length > 2000) s.worth.shift(); } // ponytail: keeps the latest 2000 days
      const D = s.day = d + 1;
      const due = Math.floor((D - s.start) / PAY_EVERY) - s.paid, pay = due * SALARY;
      s.paid += due; s.cash += pay; s.payTotal += pay; out.paydays += due; out.pay += pay;
      if (!mkt) continue;
      const charge = (cents) => { s.cash -= cents; s.costs += cents; out.costs += cents; };
      const dividend = (k, sh, cents) => { // sh negative: a short owes the dividend to whoever lent the shares
        s.cash += sh * cents; s.divTotal += sh * cents; s.divBy[k] = (s.divBy[k] || 0) + sh * cents; out.div += sh * cents;
        s.divs.push({ d: D, k, sh, c: cents }); if (s.divs.length > 2000) s.divs.shift();
      };
      if (s.cash < 0) charge(Math.ceil(-s.cash * (mkt.rateAt(D) + LOAN_SPREAD) / 36500)); // a day's interest on the loan
      for (const k in s.holdings) { const c = mkt.get(k), cents = c ? mkt.dividendOn(c, D) : 0; if (cents) dividend(k, s.holdings[k].sh, cents); }
      for (const k of Object.keys(s.shorts)) {
        const c = mkt.get(k), h = s.shorts[k];
        if (!c || !mkt.trading(c, D)) { out.squeezed.push({ k, pl: doCover(s, k, h.sh, 0, { auto: 1 }) }); continue; } // bankrupt: nothing left to buy back
        const cents = mkt.dividendOn(c, D); if (cents) dividend(k, -h.sh, cents);
        charge(Math.ceil(h.sh * mkt.cents(c, D) * SHORT_FEE / 36500)); // a day's fee for borrowing the shares
      }
      for (const o of s.orders.slice()) {
        const c = mkt.get(o.k), drop = (why) => { s.orders.splice(s.orders.indexOf(o), 1); out.dropped.push({ ...o, why }); };
        if (!c || !mkt.trading(c, D)) { drop('the company was delisted'); continue; }
        const r = mkt.range(c, D), hit = o.side === 'B' ? r.l <= o.lim : r.h >= o.lim, px = o.side === 'B' ? Math.min(o.lim, r.o) : Math.max(o.lim, r.o); // a gap past the limit fills at the open
        if (!hit) { if (D >= o.exp) drop('it expired'); continue; }
        if (o.side === 'B') {
          if (s.shorts[o.k] || o.sh * px > buyingPower(s, mkt, D)) { drop(s.adv ? 'there was not enough buying power' : 'there was not enough cash'); continue; }
          doBuy(s, o.k, o.sh, px, { lim: 1 });
        } else {
          if (!s.holdings[o.k] || s.holdings[o.k].sh < o.sh) { drop('you no longer held the shares'); continue; }
          doSell(s, o.k, o.sh, px, { lim: 1 });
        }
        s.orders.splice(s.orders.indexOf(o), 1); out.fills.push({ ...o, px, on: D });
      }
      // margin call: your own money has fallen below 30% of what you have at stake. Close the biggest positions until it is back to 50%.
      if (exposure(s, mkt, D) > 0 && netWorth(s, mkt, D) < MAINT * exposure(s, mkt, D)) {
        while (exposure(s, mkt, D) > 0 && netWorth(s, mkt, D) < INIT * exposure(s, mkt, D)) {
          const x = [...Object.keys(s.holdings).map((k) => [k, s.holdings, 0]), ...Object.keys(s.shorts).map((k) => [k, s.shorts, 1])]
            .map(([k, book, isShort]) => ({ k, isShort, n: book[k].sh, px: mkt.get(k) ? mkt.cents(mkt.get(k), D) : 0 })).filter((x) => x.px > 0).sort((a, b) => b.n * b.px - a.n * a.px)[0];
          if (!x) break;
          out.liquidated.push({ k: x.k, sh: x.n, short: !!x.isShort, pl: x.isShort ? doCover(s, x.k, x.n, x.px, { liq: 1 }) : doSell(s, x.k, x.n, x.px, { liq: 1 }) });
        }
        s.orders.length = 0; // and every open order is cancelled
      }
    }
    return out;
  }

  // ---- save: versioned, checksummed (catches corruption, not cheating), with the previous good save kept as a backup
  const fnv = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
  const encode = (s) => { const body = JSON.stringify(s); return JSON.stringify({ sum: fnv(body), body }); };
  const int = (n, min) => Number.isSafeInteger(n) && n >= min;
  const obj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
  function decode(str) {
    try {
      const { sum, body } = JSON.parse(str);
      if (typeof body !== 'string' || fnv(body) !== sum) return null;
      const s = JSON.parse(body);
      if (s.v === 1) Object.assign(s, { v: 2, holdings: {}, trades: [], realised: 0, watch: [] }); // before trading existed
      if (s.v === 2) Object.assign(s, { v: 3, divTotal: 0, divBy: {}, divs: [], worth: [] }); // before dividends existed
      if (s.v === 3) Object.assign(s, { v: 4, shorts: {}, orders: [], oid: 0, adv: false, costs: 0 }); // before advanced trading existed
      if (s.v !== VERSION) return null;
      const ok = int(s.rev, 0) && int(s.start, 0) && int(s.day, s.start) && Number.isSafeInteger(s.cash) && (s.cash >= 0 || s.adv === true) && int(s.payTotal, 0)
        && int(s.paid, 0) && s.paid <= Math.floor((s.day - s.start) / PAY_EVERY) && Number.isSafeInteger(s.realised)
        && Number.isSafeInteger(s.divTotal) && Array.isArray(s.divs) && Array.isArray(s.worth) && obj(s.divBy)
        && Array.isArray(s.trades) && Array.isArray(s.watch) && s.watch.every((k) => typeof k === 'string')
        && obj(s.holdings) && Object.values(s.holdings).every((h) => h && int(h.sh, 1) && int(h.cost, 0))
        && obj(s.shorts) && Object.values(s.shorts).every((h) => h && int(h.sh, 1) && int(h.got, 0)) && (s.adv === true || !Object.keys(s.shorts).length)
        && typeof s.adv === 'boolean' && int(s.oid, 0) && int(s.costs, 0) && Array.isArray(s.orders) && s.orders.length <= MAX_ORDERS
        && s.orders.every((o) => o && int(o.id, 1) && typeof o.k === 'string' && (o.side === 'B' || o.side === 'S') && int(o.sh, 1) && int(o.lim, 1) && int(o.exp, 0));
      return ok ? s : null;
    } catch { return null; }
  }
  function load(storage) {
    try { for (const k of [KEY, BAK]) { const s = decode(storage.getItem(k)); if (s) return s; } } catch {}
    return null;
  }
  // false = not saved (storage full or blocked); the next change saves again
  function save(storage, s) {
    try {
      const old = storage.getItem(KEY);
      if (decode(old)) storage.setItem(BAK, old);
      s.rev++;
      storage.setItem(KEY, encode(s));
      return true;
    } catch { return false; }
  }

  return { VERSION, KEY, BAK, START_CASH, SALARY, PAY_EVERY, ADV_MIN, INIT, MAINT, LOAN_SPREAD, SHORT_FEE, ORDER_DAYS, MAX_ORDERS, dayNumber, date, fresh,
    holdingsValue, shortValue, netWorth, exposure, marginLevel, buyingPower, dayCount, nextPayIn, tick,
    buy, sell, short, cover, writeOff, toggleWatch, setAdvanced, placeOrder, cancelOrder, encode, decode, load, save };
})();
if (typeof module !== 'undefined') module.exports = Account;

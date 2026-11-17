// Stock Tycoon account: the player's money, calendar, salary, trading and save. Pure logic, no DOM and no clock of
// its own: the caller passes in the current time, the player's timezone and the market. Runs in the browser and in
// Node (scripts/check-stock-tycoon.mjs). Money is whole cents everywhere.
// Time: the market runs on one clock for everyone (see engine.js). The player's own timezone only decides their
// calendar (the Day count) and when their payday arrives: every 14 days at their local midnight.
const Account = (() => {
  const VERSION = 7, KEY = 'stock-tycoon-save', BAK = KEY + '-bak';
  const START_CASH = 1000000; // savings the player arrives with
  const SALARY = 150000, PAY_EVERY = 14; // the job pays by itself every fortnight: the way back after losing everything
  // advanced trading (borrowing and short selling), off until the player turns it on
  const ADV_MIN = 2000000; // net worth needed to turn it on
  const INIT = 0.5; // to open a position, your own money must be at least half of everything you have at stake
  const MAINT = 0.3; // margin call: below this share, positions are closed for you until you are back at INIT
  const LOAN_SPREAD = 3, SHORT_FEE = 4; // yearly %: loans cost the central bank rate + 3, borrowed shares cost 4
  const ORDER_DAYS = 30, MAX_ORDERS = 20;
  const DAY = 864e5, STEP = 300000, HOUR = 3600000; // limit orders are checked every 5 minutes, margin every hour
  // Weekly challenge: everyone who joins gets a separate account with the same starting money, on the same market,
  // Monday 00:00 to Sunday 24:00 UTC (the same moment for everyone). Ranked by percentage return. Nothing can move
  // between it and the main account.
  const CH_START = 1000000;
  const weekOf = (day) => Math.floor((day + 3) / 7), weekStart = (w) => w * 7 - 3, weekEnd = (w) => w * 7 + 3; // Monday .. Sunday, as UTC days
  // wealth levels, by the highest net worth ever reached (cents)
  const LEVELS = [[0, 'Beginner investor', '🌱'], [1500000, 'Retail investor', '📈'], [5000000, 'Experienced investor', '🎯'], [25000000, 'Wealthy investor', '💼'],
    [100000000, 'Millionaire', '💎'], [1000000000, 'Multi-millionaire', '🏆'], [100000000000, 'Billionaire', '👑']];
  // lifestyle: things to spend wealth on. Bought with cash (never borrowed), sold back for 60%. They are not part of net worth.
  // Offices come with research: 'analyst' shows whether a stock looks cheap or expensive, 'desk' shows the estimate itself.
  const RESALE = 0.6;
  const ITEMS = [
    { id: 'home1', cat: 'Home', emoji: '🏠', name: 'Better apartment', price: 4000000 },
    { id: 'home2', cat: 'Home', emoji: '🏙️', name: 'Luxury apartment', price: 25000000 },
    { id: 'home3', cat: 'Home', emoji: '🌆', name: 'Penthouse', price: 200000000 },
    { id: 'office1', cat: 'Office', emoji: '🗄️', name: 'Private office', price: 3000000, perk: 'analyst', about: 'Analyst view on every stock: cheap, fair or expensive' },
    { id: 'office2', cat: 'Office', emoji: '🏢', name: 'Executive office', price: 50000000, perk: 'desk', about: 'Research desk: the estimated fair price and exact financial health of every stock' },
    { id: 'car1', cat: 'Vehicle', emoji: '🚗', name: 'Reliable hatchback', price: 800000 },
    { id: 'car2', cat: 'Vehicle', emoji: '🏎️', name: 'Sports car', price: 12000000 },
    { id: 'car3', cat: 'Vehicle', emoji: '🚁', name: 'Helicopter', price: 300000000 },
    { id: 'lux1', cat: 'Luxury', emoji: '⌚', name: 'Fine watch', price: 1500000 },
    { id: 'lux2', cat: 'Luxury', emoji: '🛥️', name: 'Yacht', price: 500000000 },
    { id: 'lux3', cat: 'Luxury', emoji: '🛩️', name: 'Private jet', price: 4000000000 },
    { id: 'lux4', cat: 'Luxury', emoji: '🏝️', name: 'Private island', price: 30000000000 },
  ];

  // calendar day number in the player's timezone; tzOffsetMin is Date#getTimezoneOffset() (minutes behind UTC).
  // Midnight itself still belongs to the day it ends, the same rule the market uses for UTC days.
  const dayNumber = (ms, tzOffsetMin = 0) => Math.ceil((ms - tzOffsetMin * 60000) / DAY) - 1;
  const utcDay = (ms) => dayNumber(ms, 0);
  const date = (day) => new Date(day * DAY); // format with timeZone: 'UTC'

  // t: the moment the account has been brought up to (ms). tz: the player's timezone at that moment. day/start: local days.
  // holdings: { TICKER: { sh: shares, cost: total cents paid for them } }
  // shorts:   { TICKER: { sh: shares owed, got: total cents received for selling them } }
  // orders:   [{ id, k: ticker, side: 'B' | 'S', sh, lim: cents, d: local day placed, at: moment placed, exp: last moment it can fill }]
  // trades:   [{ d: local day, at, t: 'B' buy | 'S' sell | 'H' short | 'C' cover | 'X' written off, k, sh, px: cents each, pl: realised cents, lim?, liq?, drip? }]
  // divs:     [{ d: UTC day, at, k, sh, c: cents per share }] (sh negative = paid by a short). worth: [[UTC day, net worth at its close]]
  const fresh = (now, tz = 0) => ({ v: VERSION, rev: 0, start: dayNumber(now, tz), day: dayNumber(now, tz), t: now, tz, cash: START_CASH, paid: 0, payTotal: 0,
    holdings: {}, trades: [], realised: 0, watch: [], divTotal: 0, divBy: {}, divs: [], worth: [], shorts: {}, orders: [], oid: 0, adv: false,
    costs: 0, // interest and borrow fees paid
    peak: START_CASH, items: [], drip: false, spent: 0, // highest net worth reached; lifestyle ids owned; reinvest dividends; cash put into lifestyle, net of sales
    chal: null, chalHist: [] }); // chal: { w: week, a: the challenge account }. chalHist: [{ w, ret: final return in hundredths of a percent }]
  // values in cents: with a day, at that day's close; without, at the account's own moment
  const value = (book, mkt, d, t) => Object.keys(book).reduce((v, k) => { const c = mkt.get(k); return v + (c ? book[k].sh * (d === undefined ? mkt.centsAt(c, t) : mkt.cents(c, d)) : 0); }, 0);
  const holdingsValue = (s, mkt, d) => value(s.holdings, mkt, d, s.t);
  const shortValue = (s, mkt, d) => value(s.shorts, mkt, d, s.t); // what it would cost to buy back every shorted share
  const netWorth = (s, mkt, d) => s.cash + holdingsValue(s, mkt, d) - shortValue(s, mkt, d);
  const exposure = (s, mkt, d) => holdingsValue(s, mkt, d) + shortValue(s, mkt, d); // everything at stake, long and short
  const marginLevel = (s, mkt, d) => { const g = exposure(s, mkt, d); return g ? netWorth(s, mkt, d) / g : Infinity; }; // 1 = no borrowing at all
  // how many cents of new positions can be opened right now
  const buyingPower = (s, mkt, d) => (s.adv ? Math.max(0, Math.floor(netWorth(s, mkt, d) / INIT) - exposure(s, mkt, d)) : Math.max(0, s.cash));
  const level = (s) => { let i = 0; while (i + 1 < LEVELS.length && s.peak >= LEVELS[i + 1][0]) i++; return i; };
  const has = (s, perk) => ITEMS.some((x) => x.perk === perk && s.items.includes(x.id)) || (perk === 'analyst' && has(s, 'desk'));
  const lifestyleValue = (s) => ITEMS.reduce((a, x) => a + (s.items.includes(x.id) ? Math.floor(x.price * RESALE) : 0), 0); // what it would all sell for
  const dayCount = (s) => s.day - s.start + 1;
  const nextPayIn = (s) => PAY_EVERY - ((s.day - s.start) % PAY_EVERY); // days until the next payday, 1..14

  // ---- the four moves. Every trade, by hand or automatic, goes through these with a price taken from the market.
  const no = (error) => ({ ok: false, error });
  const log = (s, e) => { s.trades.push({ d: s.day, at: s.t, ...e }); if (s.trades.length > 5000) s.trades.shift(); }; // ponytail: keeps the latest 5000 trades
  function doBuy(s, k, sh, px, tag) {
    const h = s.holdings[k] || (s.holdings[k] = { sh: 0, cost: 0 });
    h.sh += sh; h.cost += sh * px; s.cash -= sh * px;
    log(s, { t: 'B', k, sh, px, pl: 0, ...tag });
  }
  function doSell(s, k, sh, px, tag) {
    const h = s.holdings[k], cost = sh === h.sh ? h.cost : Math.round(h.cost * sh / h.sh), pl = sh * px - cost; // average cost
    h.sh -= sh; h.cost -= cost; if (!h.sh) delete s.holdings[k];
    s.cash += sh * px; s.realised += pl;
    log(s, { t: 'S', k, sh, px, pl, ...tag });
    return pl;
  }
  function doShort(s, k, sh, px) {
    const h = s.shorts[k] || (s.shorts[k] = { sh: 0, got: 0 });
    h.sh += sh; h.got += sh * px; s.cash += sh * px;
    log(s, { t: 'H', k, sh, px, pl: 0 });
  }
  function doCover(s, k, sh, px, tag) {
    const h = s.shorts[k], got = sh === h.sh ? h.got : Math.round(h.got * sh / h.sh), pl = got - sh * px;
    h.sh -= sh; h.got -= got; if (!h.sh) delete s.shorts[k];
    s.cash -= sh * px; s.realised += pl;
    log(s, { t: 'C', k, sh, px, pl, ...tag });
    return pl;
  }

  // ---- orders placed by the player. Prices never come from the caller: they are the market's price at the account's
  // own moment, so bring the account up to now (tick) before trading.
  function quoteFor(s, mkt, sym, sh) {
    if (!Number.isSafeInteger(sh) || sh <= 0) return no('Enter a whole number of shares');
    if (!mkt.covers(s.t)) return no('The market is updating. Try again.');
    const q = mkt.quoteAt(sym, s.t);
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
    const q = mkt.covers(s.t) && mkt.quoteAt(sym, s.t), h = s.holdings[sym];
    if (!h || !q || q.tradable) return no('Nothing to write off');
    delete s.holdings[sym]; s.realised -= h.cost;
    log(s, { t: 'X', k: sym, sh: h.sh, px: 0, pl: -h.cost });
    return { ok: true, pl: -h.cost };
  }
  function toggleWatch(s, sym) { const i = s.watch.indexOf(sym); if (i < 0) s.watch.push(sym); else s.watch.splice(i, 1); return i < 0; }
  function setAdvanced(s, mkt, on) {
    if (!mkt.covers(s.t)) return no('The market is updating. Try again.');
    if (s.noPay) return no('Not available in the challenge account');
    if (on && netWorth(s, mkt) < ADV_MIN) return no('Advanced trading needs a net worth of $20,000');
    if (!on && (s.cash < 0 || Object.keys(s.shorts).length)) return no('Repay your loan and cover your shorts first');
    s.adv = !!on;
    return { ok: true };
  }
  // A limit order waits for its price: buy when the stock trades at or below the limit, sell at or above. It is checked
  // every 5 minutes for 30 days, whether or not the player is online, and fills at the price at that check (the limit or
  // better). Cash and shares are checked again when it fills.
  function placeOrder(s, mkt, sym, side, sh, lim) {
    const q = quoteFor(s, mkt, sym, sh);
    if (!q.ok) return q;
    if (side !== 'B' && side !== 'S') return no('Choose buy or sell');
    if (!Number.isSafeInteger(lim) || lim <= 0 || !Number.isSafeInteger(sh * lim)) return no('Enter a limit price');
    if (s.orders.length >= MAX_ORDERS) return no(`You can have ${MAX_ORDERS} open orders at most`);
    if (side === 'B' && s.shorts[sym]) return no('You are short this stock. Cover the short first.');
    const queued = s.orders.filter((o) => o.k === sym && o.side === 'S').reduce((a, o) => a + o.sh, 0), own = s.holdings[sym] ? s.holdings[sym].sh : 0;
    if (side === 'S' && queued + sh > own) return no(own ? `You only own ${own}${queued ? `, and ${queued} are already in sell orders` : ''}` : 'You do not own this stock');
    const o = { id: ++s.oid, k: sym, side, sh, lim, d: s.day, at: s.t, exp: s.t + ORDER_DAYS * DAY };
    s.orders.push(o);
    return { ok: true, order: o };
  }
  function buyItem(s, id) {
    const x = ITEMS.find((i) => i.id === id);
    if (s.noPay) return no('Not available in the challenge account');
    if (!x) return no('No such item');
    if (s.items.includes(id)) return no('You already own this');
    if (x.price > s.cash) return no('Not enough cash. Lifestyle cannot be bought with borrowed money.');
    s.cash -= x.price; s.spent += x.price; s.items.push(id);
    return { ok: true, item: x };
  }
  function sellItem(s, id) {
    const x = ITEMS.find((i) => i.id === id), i = s.items.indexOf(id);
    if (!x || i < 0) return no('You do not own this');
    s.items.splice(i, 1); s.cash += Math.floor(x.price * RESALE); s.spent -= Math.floor(x.price * RESALE);
    return { ok: true, item: x, got: Math.floor(x.price * RESALE) };
  }
  function setDrip(s, on) { s.drip = !!on; return { ok: true }; }
  // a new high in net worth can raise the level; call after anything that can change net worth
  function touchPeak(s, mkt, d) { const before = level(s); s.peak = Math.max(s.peak, netWorth(s, mkt, d)); return level(s) > before; }
  const chalReturn = (a, mkt, d) => netWorth(a, mkt, d) / CH_START - 1;
  const chalEnd = (w) => (weekEnd(w) + 1) * DAY; // Sunday's close, UTC
  function joinChallenge(s) {
    const w = weekOf(utcDay(s.t));
    if (s.noPay) return no('This is the challenge account');
    if (s.chal) return no('You are already in this week\'s challenge');
    if (s.chalHist.some((x) => x.w === w)) return no('You have already played this week');
    s.chal = { w, a: { ...fresh(s.t, s.tz), cash: CH_START, peak: CH_START, noPay: true } }; // noPay: no salary, lifestyle or borrowing in there
    return { ok: true };
  }
  function cancelOrder(s, id) { const i = s.orders.findIndex((o) => o.id === id); if (i < 0) return no('No such order'); s.orders.splice(i, 1); return { ok: true }; }

  // ---- catching up. Bring the account from its last moment up to `now`, in order: salary at each local midnight, each
  // UTC day's close (net worth history), each day's dividends, interest and borrow fees (00:05 UTC), limit orders (every
  // 5 minutes) and the margin check (every hour). Safe to call any number of times; a clock that went backwards changes
  // nothing. mkt must cover `now` (it can be left out only when the account has no positions or orders).
  function tick(s, now, mkt, tz = s.tz) {
    const out = { days: 0, paydays: 0, pay: 0, div: 0, costs: 0, fills: [], dropped: [], liquidated: [], squeezed: [], reinvested: 0, levelUp: false };
    if (mkt && !mkt.covers(now)) throw new Error('The market does not reach this moment yet');
    if (now > s.t) {
      const day0 = s.day;
      s.tz = tz;
      const salary = (t) => { // payday: every 14 days at the player's own midnight
        s.day = Math.max(s.day, dayNumber(t, tz));
        const due = s.noPay ? 0 : Math.floor((s.day - s.start) / PAY_EVERY) - s.paid;
        if (due > 0) { s.paid += due; s.cash += due * SALARY; s.payTotal += due * SALARY; out.paydays += due; out.pay += due * SALARY; }
      };
      if (mkt) {
        const charge = (cents) => { s.cash -= cents; s.costs += cents; out.costs += cents; };
        const dividend = (k, sh, cents) => { // sh negative: a short owes the dividend to whoever lent the shares
          s.cash += sh * cents; s.divTotal += sh * cents; s.divBy[k] = (s.divBy[k] || 0) + sh * cents; out.div += sh * cents;
          s.divs.push({ d: utcDay(s.t), at: s.t, k, sh, c: cents }); if (s.divs.length > 2000) s.divs.shift();
        };
        const risky = () => s.cash < 0 || Object.keys(s.shorts).length > 0;
        // when nothing needs watching, skip straight to the next moment something happens
        const next = (g) => {
          if (s.orders.length) return g + STEP;
          const base = g - (g % DAY), ld = dayNumber(g, tz), payAt = (ld + 1) * DAY + tz * 60000;
          let n = Math.min(base + DAY, g % DAY < STEP ? base + STEP : base + DAY + STEP, payAt - (payAt % STEP) + STEP);
          if (risky()) n = Math.min(n, g - (g % HOUR) + HOUR);
          return n;
        };
        for (let g = s.t - (s.t % STEP) + STEP; g <= now; g = next(g)) {
          s.t = g;
          const D = utcDay(g), ms = g - D * DAY;
          salary(g);
          if (ms === DAY) { // a market day has closed
            s.worth.push([D, netWorth(s, mkt, D)]); if (s.worth.length > 2000) s.worth.shift(); // ponytail: keeps the latest 2000 days
            if (touchPeak(s, mkt, D)) out.levelUp = true;
          }
          if (ms === STEP) { // a market day begins: interest, dividends, borrow fees
            if (s.cash < 0) charge(Math.ceil(-s.cash * (mkt.rateAt(D) + LOAN_SPREAD) / 36500)); // a day's interest on the loan
            for (const k of Object.keys(s.holdings)) {
              const c = mkt.get(k), cents = c ? mkt.dividendOn(c, D) : 0; if (!cents) continue;
              const got = s.holdings[k].sh * cents, px = mkt.centsAt(c, g), n = s.drip && px ? Math.floor(Math.min(got, Math.max(0, s.cash + got)) / px) : 0;
              dividend(k, s.holdings[k].sh, cents);
              if (n > 0) { doBuy(s, k, n, px, { drip: 1 }); out.reinvested += n * px; } // reinvest: whole shares of the same stock, the rest stays as cash
            }
            for (const k of Object.keys(s.shorts)) {
              const c = mkt.get(k), h = s.shorts[k];
              if (!c || !mkt.trading(c, D)) { out.squeezed.push({ k, pl: doCover(s, k, h.sh, 0, { auto: 1 }) }); continue; } // bankrupt: nothing left to buy back
              const cents = mkt.dividendOn(c, D); if (cents) dividend(k, -h.sh, cents);
              charge(Math.ceil(h.sh * mkt.centsAt(c, g) * SHORT_FEE / 36500)); // a day's fee for borrowing the shares
            }
          }
          for (const o of s.orders.slice()) {
            const c = mkt.get(o.k), drop = (why) => { s.orders.splice(s.orders.indexOf(o), 1); out.dropped.push({ ...o, why }); };
            if (!c || !mkt.trading(c, D)) { drop('the company was delisted'); continue; }
            const px = mkt.centsAt(c, g);
            if (!(o.side === 'B' ? px <= o.lim : px >= o.lim)) { if (g >= o.exp) drop('it expired'); continue; }
            if (o.side === 'B') {
              if (s.shorts[o.k] || o.sh * px > buyingPower(s, mkt)) { drop(s.adv ? 'there was not enough buying power' : 'there was not enough cash'); continue; }
              doBuy(s, o.k, o.sh, px, { lim: 1 });
            } else {
              if (!s.holdings[o.k] || s.holdings[o.k].sh < o.sh) { drop('you no longer held the shares'); continue; }
              doSell(s, o.k, o.sh, px, { lim: 1 });
            }
            s.orders.splice(s.orders.indexOf(o), 1); out.fills.push({ ...o, px, on: D, at: g });
          }
          // margin call: your own money has fallen below 30% of what you have at stake. Close the biggest positions until it is back to 50%.
          if (g % HOUR === 0 && risky() && netWorth(s, mkt) < MAINT * exposure(s, mkt)) {
            while (exposure(s, mkt) > 0 && netWorth(s, mkt) < INIT * exposure(s, mkt)) {
              const x = [...Object.keys(s.holdings).map((k) => [k, s.holdings, 0]), ...Object.keys(s.shorts).map((k) => [k, s.shorts, 1])]
                .map(([k, book, isShort]) => ({ k, isShort, n: book[k].sh, px: mkt.get(k) ? mkt.centsAt(mkt.get(k), g) : 0 })).filter((x) => x.px > 0).sort((a, b) => b.n * b.px - a.n * a.px)[0];
              if (!x) break;
              out.liquidated.push({ k: x.k, sh: x.n, short: !!x.isShort, pl: x.isShort ? doCover(s, x.k, x.n, x.px, { liq: 1 }) : doSell(s, x.k, x.n, x.px, { liq: 1 }) });
            }
            s.orders.length = 0; // and every open order is cancelled
          }
        }
      }
      s.t = now; salary(now);
      out.days = s.day - day0;
    }
    if (s.chal && mkt) { // the challenge account runs to Sunday's close and no further; after that the result is final
      const { w, a } = s.chal, end = chalEnd(w);
      out.chal = tick(a, Math.min(now, end), mkt, tz);
      if (now >= end) { const ret = Math.round(chalReturn(a, mkt, weekEnd(w)) * 10000); s.chalHist.push({ w, ret }); if (s.chalHist.length > 200) s.chalHist.shift(); s.chal = null; out.chalDone = { w, ret }; }
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
      if (s.v === 4) Object.assign(s, { v: 5, peak: Math.max(START_CASH, ...s.worth.map((w) => w[1])), items: [], drip: false, spent: 0 }); // before levels and lifestyle existed
      if (s.v === 5) Object.assign(s, { v: 6, chal: null, chalHist: [] }); // before the weekly challenge existed
      if (s.v === 6) { // before the market ran on real time: days become moments
        const up = (x) => { Object.assign(x, { v: 7, t: (x.day + 1) * DAY, tz: 0 }); for (const o of x.orders) Object.assign(o, { at: o.d * DAY, exp: (o.exp + 1) * DAY }); };
        up(s); if (s.chal) up(s.chal.a);
      }
      return valid(s) ? s : null;
    } catch { return null; }
  }
  function valid(s) {
    if (s.v !== VERSION) return false;
    const ok = int(s.rev, 0) && int(s.start, 0) && int(s.day, s.start) && int(s.t, 0) && Number.isInteger(s.tz) && Math.abs(s.tz) <= 900
      && Number.isSafeInteger(s.cash) && (s.cash >= 0 || s.adv === true) && int(s.payTotal, 0)
      && int(s.paid, 0) && s.paid <= Math.floor((s.day - s.start) / PAY_EVERY) && Number.isSafeInteger(s.realised)
      && Number.isSafeInteger(s.divTotal) && Array.isArray(s.divs) && Array.isArray(s.worth) && obj(s.divBy)
      && Array.isArray(s.trades) && Array.isArray(s.watch) && s.watch.every((k) => typeof k === 'string')
      && obj(s.holdings) && Object.values(s.holdings).every((h) => h && int(h.sh, 1) && int(h.cost, 0))
      && obj(s.shorts) && Object.values(s.shorts).every((h) => h && int(h.sh, 1) && int(h.got, 0)) && (s.adv === true || !Object.keys(s.shorts).length)
      && int(s.peak, 0) && int(s.spent, 0) && typeof s.drip === 'boolean' && Array.isArray(s.items) && new Set(s.items).size === s.items.length && s.items.every((id) => ITEMS.some((x) => x.id === id))
      && typeof s.adv === 'boolean' && int(s.oid, 0) && int(s.costs, 0) && Array.isArray(s.orders) && s.orders.length <= MAX_ORDERS
      && s.orders.every((o) => o && int(o.id, 1) && typeof o.k === 'string' && (o.side === 'B' || o.side === 'S') && int(o.sh, 1) && int(o.lim, 1) && int(o.exp, 0))
      && Array.isArray(s.chalHist) && s.chalHist.every((x) => x && int(x.w, 0) && Number.isSafeInteger(x.ret));
    // the challenge account is a full account of its own, checked the same way; it can never hold a challenge itself
    return ok && (s.chal === null || (obj(s.chal) && int(s.chal.w, 0) && obj(s.chal.a) && s.chal.a.noPay === true && s.chal.a.chal === null && !s.noPay && valid(s.chal.a)));
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

  return { VERSION, KEY, BAK, START_CASH, SALARY, PAY_EVERY, ADV_MIN, INIT, MAINT, LOAN_SPREAD, SHORT_FEE, ORDER_DAYS, MAX_ORDERS, CH_START, weekOf, weekStart, weekEnd, chalEnd,
    chalReturn, joinChallenge, LEVELS, ITEMS, RESALE, level, has, lifestyleValue, buyItem, sellItem, setDrip, touchPeak, dayNumber, utcDay, date, fresh,
    holdingsValue, shortValue, netWorth, exposure, marginLevel, buyingPower, dayCount, nextPayIn, tick,
    buy, sell, short, cover, writeOff, toggleWatch, setAdvanced, placeOrder, cancelOrder, encode, decode, load, save };
})();
if (typeof module !== 'undefined') module.exports = Account;

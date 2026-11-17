// Stock Tycoon account: the player's money, calendar, salary and save. Pure logic, no DOM and no clock of its own:
// the caller passes in today's day number. Runs in the browser and in Node (scripts/check-stock-tycoon.mjs).
// Money is whole cents everywhere. A game day is a real calendar day in the player's own timezone.
const Account = (() => {
  const VERSION = 2, KEY = 'stock-tycoon-save', BAK = KEY + '-bak';
  const START_CASH = 1000000; // savings the player arrives with
  const SALARY = 150000, PAY_EVERY = 14; // the job pays by itself every fortnight: the way back after losing everything

  // calendar day number in the player's timezone; tzOffsetMin is Date#getTimezoneOffset() (minutes behind UTC)
  const dayNumber = (ms, tzOffsetMin) => Math.floor((ms - tzOffsetMin * 60000) / 864e5);
  const date = (day) => new Date(day * 864e5); // format with timeZone: 'UTC'

  // holdings: { TICKER: { sh: shares, cost: total cents paid for them } }
  // trades: [{ d: day, t: 'B' buy | 'S' sell | 'X' written off, k: ticker, sh, px: cents per share, pl: realised cents }]
  const fresh = (today) => ({ v: VERSION, rev: 0, start: today, day: today, cash: START_CASH, paid: 0, payTotal: 0, holdings: {}, trades: [], realised: 0, watch: [] });
  const holdingsValue = (s, mkt, d) => Object.keys(s.holdings).reduce((v, k) => { const c = mkt.get(k); return v + (c ? s.holdings[k].sh * mkt.cents(c, d) : 0); }, 0);
  const netWorth = (s, mkt, d) => s.cash + holdingsValue(s, mkt, d);
  const dayCount = (s) => s.day - s.start + 1;
  const nextPayIn = (s) => PAY_EVERY - ((s.day - s.start) % PAY_EVERY); // days until the next payday, 1..14

  // Catch the account up to today: pay every payday that has passed, once. Safe to call any number of times.
  // A clock that went backwards changes nothing (the account never moves back in time).
  function tick(s, today) {
    const days = Math.max(0, today - s.day);
    s.day += days;
    const due = Math.floor((s.day - s.start) / PAY_EVERY) - s.paid, pay = due * SALARY;
    s.paid += due; s.cash += pay; s.payTotal += pay;
    return { days, paydays: due, pay };
  }

  // ---- trading. Prices never come from the caller: they are looked up in the market for the account's own day.
  const no = (error) => ({ ok: false, error });
  const log = (s, e) => { s.trades.push(e); if (s.trades.length > 5000) s.trades.shift(); }; // ponytail: keeps the latest 5000 trades
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
    if (q.total > s.cash) return no('Not enough cash');
    const h = s.holdings[sym] || (s.holdings[sym] = { sh: 0, cost: 0 });
    h.sh += sh; h.cost += q.total; s.cash -= q.total;
    log(s, { d: s.day, t: 'B', k: sym, sh, px: q.cents, pl: 0 });
    return q;
  }
  function sell(s, mkt, sym, sh) {
    const q = quoteFor(s, mkt, sym, sh), h = s.holdings[sym];
    if (!q.ok) return q;
    if (!h || sh > h.sh) return no(h ? `You only own ${h.sh}` : 'You do not own this stock');
    const cost = sh === h.sh ? h.cost : Math.round(h.cost * sh / h.sh), pl = q.total - cost; // average cost
    h.sh -= sh; h.cost -= cost; if (!h.sh) delete s.holdings[sym];
    s.cash += q.total; s.realised += pl;
    log(s, { d: s.day, t: 'S', k: sym, sh, px: q.cents, pl });
    return { ...q, pl };
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

  // ---- save: versioned, checksummed (catches corruption, not cheating), with the previous good save kept as a backup
  const fnv = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
  const encode = (s) => { const body = JSON.stringify(s); return JSON.stringify({ sum: fnv(body), body }); };
  const int = (n, min) => Number.isSafeInteger(n) && n >= min;
  function decode(str) {
    try {
      const { sum, body } = JSON.parse(str);
      if (typeof body !== 'string' || fnv(body) !== sum) return null;
      const s = JSON.parse(body);
      if (s.v === 1) Object.assign(s, { v: 2, holdings: {}, trades: [], realised: 0, watch: [] }); // before trading existed
      if (s.v !== VERSION) return null;
      const ok = int(s.rev, 0) && int(s.start, 0) && int(s.day, s.start) && int(s.cash, 0) && int(s.payTotal, 0)
        && int(s.paid, 0) && s.paid <= Math.floor((s.day - s.start) / PAY_EVERY) && Number.isSafeInteger(s.realised)
        && Array.isArray(s.trades) && Array.isArray(s.watch) && s.watch.every((k) => typeof k === 'string')
        && s.holdings && typeof s.holdings === 'object' && Object.values(s.holdings).every((h) => h && int(h.sh, 1) && int(h.cost, 0));
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

  return { VERSION, KEY, BAK, START_CASH, SALARY, PAY_EVERY, dayNumber, date, fresh, holdingsValue, netWorth, dayCount, nextPayIn, tick, buy, sell, writeOff, toggleWatch, encode, decode, load, save };
})();
if (typeof module !== 'undefined') module.exports = Account;

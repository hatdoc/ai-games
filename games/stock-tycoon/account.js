// Stock Tycoon account: the player's money, calendar, salary and save. Pure logic, no DOM and no clock of its own:
// the caller passes in today's day number. Runs in the browser and in Node (scripts/check-stock-tycoon.mjs).
// Money is whole cents everywhere. A game day is a real calendar day in the player's own timezone.
const Account = (() => {
  const VERSION = 1, KEY = 'stock-tycoon-save', BAK = KEY + '-bak';
  const START_CASH = 1000000; // savings the player arrives with
  const SALARY = 150000, PAY_EVERY = 14; // the job pays by itself every fortnight: the way back after losing everything

  // calendar day number in the player's timezone; tzOffsetMin is Date#getTimezoneOffset() (minutes behind UTC)
  const dayNumber = (ms, tzOffsetMin) => Math.floor((ms - tzOffsetMin * 60000) / 864e5);
  const date = (day) => new Date(day * 864e5); // format with timeZone: 'UTC'

  const fresh = (today) => ({ v: VERSION, rev: 0, start: today, day: today, cash: START_CASH, paid: 0, payTotal: 0 });
  const netWorth = (s) => s.cash; // Stage 2 adds holdings
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

  // ---- save: versioned, checksummed (catches corruption, not cheating), with the previous good save kept as a backup
  const fnv = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
  const encode = (s) => { const body = JSON.stringify(s); return JSON.stringify({ sum: fnv(body), body }); };
  const int = (n, min) => Number.isSafeInteger(n) && n >= min;
  function decode(str) {
    try {
      const { sum, body } = JSON.parse(str);
      if (typeof body !== 'string' || fnv(body) !== sum) return null;
      const s = JSON.parse(body);
      if (s.v !== VERSION) return null; // older versions get migrated here when VERSION goes up
      const ok = int(s.rev, 0) && int(s.start, 0) && int(s.day, s.start) && int(s.cash, 0) && int(s.payTotal, 0)
        && int(s.paid, 0) && s.paid <= Math.floor((s.day - s.start) / PAY_EVERY);
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

  return { VERSION, KEY, BAK, START_CASH, SALARY, PAY_EVERY, dayNumber, date, fresh, netWorth, dayCount, nextPayIn, tick, encode, decode, load, save };
})();
if (typeof module !== 'undefined') module.exports = Account;

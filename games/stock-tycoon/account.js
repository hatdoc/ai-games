// Stock Tycoon account: the player's money, calendar, work and save. Pure logic, no DOM, no real-world clock
// (so changing the device clock does nothing). Runs in the browser and in Node (scripts/check-stock-tycoon.mjs).
// Money is whole cents everywhere.
const Account = (() => {
  const VERSION = 1, KEY = 'stock-tycoon-save', BAK = KEY + '-bak';
  const START_CASH = 200000, ENERGY = 4, EPOCH = Date.UTC(2031, 0, 6); // day 1 is a Monday
  // xp = shifts worked so far. Energy is the daily earning limit: the best possible day is 4 energy of the best jobs.
  const JOBS = [
    { id: 'food', name: 'Food delivery', emoji: '🛵', pay: 3500, energy: 1, xp: 0 },
    { id: 'retail', name: 'Retail assistant', emoji: '🛍️', pay: 4000, energy: 1, xp: 0 },
    { id: 'driver', name: 'Delivery driver', emoji: '🚚', pay: 8500, energy: 2, xp: 0 },
    { id: 'build', name: 'Construction shift', emoji: '🏗️', pay: 9000, energy: 2, xp: 3 },
    { id: 'office', name: 'Office temp', emoji: '🗂️', pay: 6000, energy: 1, xp: 8 },
    { id: 'freelance', name: 'Freelance project', emoji: '💻', pay: 20000, energy: 3, xp: 15 },
    { id: 'analyst', name: 'Business analyst', emoji: '📊', pay: 8500, energy: 1, xp: 30 },
    { id: 'dev', name: 'Programmer', emoji: '⌨️', pay: 10500, energy: 1, xp: 50 },
    { id: 'venture', name: 'Side business', emoji: '🚀', pay: 33000, energy: 3, xp: 80 },
  ];

  // deterministic 0..1 from two integers: which jobs are hiring on a given day is the same on every device
  const hash = (a, b) => {
    let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
    return (h >>> 0) / 2 ** 32;
  };
  const hiring = (day, i) => i < 2 || hash(day, i) < 0.7; // the two starter jobs always hire

  const fresh = () => ({ v: VERSION, rev: 0, day: 1, cash: START_CASH, energy: ENERGY, shifts: 0, earnedToday: 0, workTotal: 0, history: [] });
  const date = (day) => new Date(EPOCH + (day - 1) * 864e5);
  const netWorth = (s) => s.cash; // Stage 2 adds holdings

  const jobs = (s) => JOBS.map((j, i) => {
    const why = s.shifts < j.xp ? `Needs ${j.xp} shifts of experience (you have ${s.shifts})`
      : !hiring(s.day, i) ? 'Not hiring today' : s.energy < j.energy ? 'Not enough energy left today' : '';
    return { ...j, why };
  });

  function work(s, id) {
    const j = jobs(s).find((x) => x.id === id);
    if (!j) return { ok: false, error: 'No such job' };
    if (j.why) return { ok: false, error: j.why };
    s.energy -= j.energy; s.cash += j.pay; s.earnedToday += j.pay; s.workTotal += j.pay; s.shifts++;
    return { ok: true, pay: j.pay };
  }

  // Close today and open tomorrow. Returns the day's summary (Stage 2 adds the market lines).
  function endDay(s) {
    const sum = { day: s.day, work: s.earnedToday, cash: s.cash, worth: netWorth(s) };
    s.history.push(sum); if (s.history.length > 60) s.history.shift();
    s.day++; s.energy = ENERGY; s.earnedToday = 0;
    return sum;
  }

  // ---- save: versioned, checksummed (catches corruption, not cheating), with the previous good save kept as a backup
  const fnv = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
  const encode = (s) => { const body = JSON.stringify(s); return JSON.stringify({ sum: fnv(body), body }); };
  const int = (n, min, max = Number.MAX_SAFE_INTEGER) => Number.isInteger(n) && n >= min && n <= max;
  function decode(str) {
    try {
      const { sum, body } = JSON.parse(str);
      if (typeof body !== 'string' || fnv(body) !== sum) return null;
      const s = JSON.parse(body);
      if (s.v !== VERSION) return null; // older versions get migrated here when VERSION goes up
      const ok = int(s.rev, 0) && int(s.day, 1) && int(s.cash, 0) && int(s.energy, 0, ENERGY) && int(s.shifts, 0)
        && int(s.earnedToday, 0) && int(s.workTotal, 0) && Array.isArray(s.history);
      return ok ? s : null;
    } catch { return null; }
  }
  function load(storage) {
    try { for (const k of [KEY, BAK]) { const s = decode(storage.getItem(k)); if (s) return s; } } catch {}
    return null;
  }
  // false = not saved (storage full or blocked); the next action saves again
  function save(storage, s) {
    try {
      const old = storage.getItem(KEY);
      if (decode(old)) storage.setItem(BAK, old);
      s.rev++;
      storage.setItem(KEY, encode(s));
      return true;
    } catch { return false; }
  }

  return { VERSION, KEY, BAK, START_CASH, ENERGY, JOBS, fresh, date, netWorth, jobs, work, endDay, encode, decode, load, save };
})();
if (typeof module !== 'undefined') module.exports = Account;

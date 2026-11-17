// Check for Stock Tycoon's account logic: `node scripts/check-stock-tycoon.mjs`. Exits non-zero on failure.
import { createRequire } from 'node:module';
const A = createRequire(import.meta.url)('../games/stock-tycoon/account.js');
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

// new player
let s = A.fresh();
ok(s.cash === A.START_CASH && s.day === 1 && s.energy === A.ENERGY, 'new player starts on day 1 with starting cash and full energy');
ok(A.date(1).getUTCDay() === 1 && A.date(2) - A.date(1) === 864e5, 'calendar: day 1 is a Monday, each day is one day later');

// work
let r = A.work(s, 'food');
ok(r.ok && s.cash === A.START_CASH + 3500 && s.energy === A.ENERGY - 1 && s.earnedToday === 3500 && s.shifts === 1, 'a shift pays once and costs energy');
ok(!A.work(s, 'venture').ok && !A.work(s, 'nope').ok && s.cash === A.START_CASH + 3500, 'locked and unknown jobs pay nothing');
while (A.work(s, 'food').ok);
ok(s.energy === 0 && s.earnedToday === 3500 * A.ENERGY && !A.work(s, 'retail').ok, 'no more work once energy is spent');

// daily earning limit: the best possible day, with every job unlocked and hiring
const best = (e) => Math.max(0, ...A.JOBS.filter((j) => j.energy <= e).map((j) => j.pay + best(e - j.energy)));
ok(best(A.ENERGY) <= 44000, `daily work limit is ${best(A.ENERGY) / 100} dollars at most`);
{ // a veteran grinding every day never beats that limit, and some jobs are closed some days
  const v = A.fresh(); v.shifts = 999; let max = 0, closed = 0;
  for (let d = 0; d < 300; d++) {
    closed += A.jobs(v).filter((j) => j.why === 'Not hiring today').length;
    const open = () => A.jobs(v).filter((j) => !j.why).sort((a, b) => b.pay / b.energy - a.pay / a.energy)[0];
    for (let j; (j = open());) A.work(v, j.id);
    max = Math.max(max, A.endDay(v).work);
  }
  ok(max <= best(A.ENERGY) && closed > 0 && v.day === 301, 'over 300 days no day beats the limit, and availability varies');
}

// end day
const before = s.cash, sum = A.endDay(s);
ok(sum.day === 1 && sum.work === 3500 * A.ENERGY && sum.worth === before && s.day === 2 && s.energy === A.ENERGY && s.earnedToday === 0 && s.cash === before,
  'End Day reports the day, moves the calendar one day, refills energy, leaves cash alone');
const idle = A.fresh(); A.endDay(idle);
ok(idle.day === 2 && idle.cash === A.START_CASH, 'a day can be ended without doing anything');

// save and rejoin
const st = mem();
A.work(s, 'food'); ok(A.save(st, s), 'save succeeds');
const back = A.load(st);
ok(JSON.stringify(back) === JSON.stringify(s), 'rejoining restores the exact account');
ok(back.energy === A.ENERGY - 1, 'reloading mid-day does not refill energy');
A.work(s, 'food'); A.save(st, s); // main = 2 shifts today, backup = 1 shift today
st.setItem(A.KEY, st.getItem(A.KEY).replace(/\d/, 'x'));
ok(A.load(st)?.rev === s.rev - 1, 'a corrupted save falls back to the previous good one');
const forged = JSON.parse(A.encode(s)); forged.body = forged.body.replace(`"cash":${s.cash}`, '"cash":99999999');
ok(A.decode(JSON.stringify(forged)) === null, 'a save edited without its checksum is rejected');
ok(A.decode(A.encode({ ...s, cash: -5 })) === null && A.decode(A.encode({ ...s, energy: 99 })) === null, 'negative cash or impossible energy is rejected');
ok(A.load(mem()) === null && A.load({ getItem() { throw new Error('blocked'); } }) === null, 'no save, or blocked storage, means a new game instead of a crash');
ok(A.save({ getItem: () => null, setItem() { throw new Error('full'); } }, A.fresh()) === false, 'a failed save is reported, not thrown');

console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok'); process.exit(fails.length ? 1 : 0);

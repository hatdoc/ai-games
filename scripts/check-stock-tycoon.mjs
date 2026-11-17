// Check for Stock Tycoon's account logic: `node scripts/check-stock-tycoon.mjs`. Exits non-zero on failure.
import { createRequire } from 'node:module';
const A = createRequire(import.meta.url)('../games/stock-tycoon/account.js');
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

console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok'); process.exit(fails.length ? 1 : 0);

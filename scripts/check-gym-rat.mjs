// Headless check for Gym Rat Raising: `node scripts/check-gym-rat.mjs` (needs playwright). Exits non-zero on failure.
// Plays whole 90-day runs with bots: a smart bot must beat a lazy bot, every event must resolve, and the UI must render.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, 'games', decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const browser = await chromium.launch(), page = await browser.newPage(), errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.route('**/*firestore.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[{}]' }));
await page.goto(`http://localhost:${server.address().port}/gym-rat/`);
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };

const r = await page.evaluate(() => {
  const g = gr, out = {};
  const play = (policy, seed) => {
    g.newGame(); const S = g.S;
    for (let guard = 0; guard < 5000 && !S.over; guard++) {
      if (S.ev) { g.resolveEvent(0); continue; }
      const k = `${S.day}.${S.slot}.${S.cash}.${S.energy}.${S.fuel}`;
      policy(S);
      if (k === `${S.day}.${S.slot}.${S.cash}.${S.energy}.${S.fuel}`) g.sleep(); // bot got stuck: end the day
    }
    return { total: g.total(), muscle: S.muscle, fat: S.fat, cash: S.cash, day: S.day };
  };
  // smart: eat well, work only when needed, train 2x/day, rest when sore
  const smart = (S) => {
    const need = S.day % 7 >= 4 && S.cash < 45;
    if (S.fuel < 70 && S.cash >= 4) { g.eat(1); if (S.fuel < 70 && S.cash >= 3) g.eat(2); }
    if (!S.items.member && S.cash >= 65) { g.buy('member'); return; }
    if (S.items.member && S.cash >= 60) for (const id of ['creatine', 'belt', 'straps', 'wraps', 'roller', 'app']) if (!S.items[id] && S.cash >= 60) { g.buy(id); break; }
    if (S.cash < 12 || need) { g.work(0); return; }
    if (S.sore > 55 || S.injured) { g.rest('nap'); return; }
    const lifts = ['bench', 'squat', 'dead']; const l = lifts.sort((a, b) => S.lift[a] / ({ bench: 200, squat: 280, dead: 330 })[a] - S.lift[b] / ({ bench: 200, squat: 280, dead: 330 })[b])[0];
    g.train(l);
  };
  const lazy = (S) => { if (S.fuel < 40 && S.cash >= 1) g.eat(0); if (S.cash < 10) g.work(0); else if (S.slot === 0) g.train('bench'); else g.sleep(); };
  const gym = (S) => { while (S.fuel < 70 && S.cash >= 4 && S.fuel < 130) g.eat(1); if (S.cash < 15) { g.work(0); return; } if (S.sore > 60 || S.injured) { g.rest('nap'); return; } g.train(['bench', 'squat', 'dead'][S.day % 3]); };
  out.smart = [...Array(5)].map(() => play(smart)); out.lazy = [...Array(5)].map(() => play(lazy)); out.avg = [...Array(5)].map(() => play(gym));
  // every event resolves for every option without NaN
  out.events = [];
  for (const e of g.EVENTS) for (let i = 0; i < e[3].length; i++) {
    g.newGame(); const S = g.S; S.muscle = 10; S.lift = { bench: 100, squat: 120, dead: 150 }; S.ev = e[0]; const m = g.resolveEvent(i);
    out.events.push(typeof m === 'string' && m.length > 0 && [S.mood, S.energy, S.fuel, S.cash, S.sore].every((v) => Number.isFinite(v)) && S.mood >= 0 && S.mood <= 100);
  }
  g.newGame(); g.render(); out.html = document.querySelector('#hero').src.length;
  return out;
});
const avg = (a, k) => Math.round(a.reduce((s, x) => s + x[k], 0) / a.length);
console.log('smart', r.smart.map((x) => x.total), 'avg', r.avg.map((x) => x.total), 'lazy', r.lazy.map((x) => x.total));
console.log('smart muscle/fat', avg(r.smart, 'muscle'), avg(r.smart, 'fat'));
ok(r.smart.every((x) => x.day > 90), 'smart runs reach day 90');
ok(avg(r.smart, 'total') > avg(r.lazy, 'total') + 100, 'smart play beats lazy play by 100+ kg');
ok(avg(r.smart, 'total') >= 300 && avg(r.smart, 'total') <= 700, `smart total in a sane range (${avg(r.smart, 'total')})`);
ok(avg(r.lazy, 'total') < 260, `lazy total stays low (${avg(r.lazy, 'total')})`);
ok(r.events.every(Boolean), `all ${r.events.length} event options resolve cleanly`);
ok(r.html > 10, 'hero image set');
ok(errors.length === 0, 'no page errors ' + errors.join('|'));
await browser.close(); server.close();
process.exit(fails.length ? 1 : 0);

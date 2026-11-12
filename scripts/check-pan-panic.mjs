// Headless check for Pan Panic: `node scripts/check-pan-panic.mjs` (needs `npm i` for playwright). Exits non-zero on failure.
// Steps the sim by hand: raw taps and burns cost a life, late taps don't, fever heals, rats steal without a strike, a perfect bot never dies.
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
await page.goto(`http://localhost:${server.address().port}/pan-panic/`);
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };

const r = await page.evaluate(() => {
  const out = {}, dt = 1 / 60, step = (secs) => { for (let i = 0; i < secs * 60; i++) pp.update(dt); };
  const until = (fn, max = 20) => { for (let i = 0; i < max * 60 && !fn(); i++) pp.update(dt); return fn(); };
  const cooking = () => pp.S.pans.find((p) => p.food && p.food.drop <= 0 && p.food.flip <= 0);

  pp.start(); until(cooking); pp.tapPan(cooking());
  out.raw = { lives: pp.S.lives, hist: pp.S.hist.join('') };

  pp.start(); step(40);
  out.idle = { over: pp.S.over, lives: pp.S.lives, hist: pp.S.hist.join(''), card: !document.getElementById('over').hidden, score: document.getElementById('oScore').textContent };

  const late = () => pp.S.pans.find((p) => p.food && p.food.s > p.food.T + p.food.G + pp.LATE / 2);
  pp.start(); until(late);
  { const p = late(), f = p.food; pp.tapPan(p); out.late = { lives: pp.S.lives, perfect: f.perfect, streak: pp.S.streak }; }

  pp.start(); pp.S.lives = 2; pp.S.meter = pp.FEVER_AT - 1;
  const green = () => pp.S.pans.find((p) => p.food && p.food.s > p.food.T + 0.05); until(green); pp.tapPan(green());
  out.fever = { lives: pp.S.lives, fever: pp.S.fever, streak: pp.S.streak };

  pp.start(); until(cooking); pp.spawnRat(); until(() => pp.S.hist.includes('S'), 3);
  out.rat = { hist: pp.S.hist.join(''), lives: pp.S.lives };

  pp.start(); pp.S.bot = true; step(180);
  out.bot = { over: pp.S.over, lives: pp.S.lives, score: pp.S.score, served: pp.S.served, pans: pp.S.pans.length, fevers: pp.S.fevers, bad: pp.S.hist.filter((h) => h !== 'P').length };
  return out;
});
ok(r.raw.lives === 2 && r.raw.hist === 'R', `tapping raw food costs a life (${JSON.stringify(r.raw)})`);
ok(r.idle.over && r.idle.lives === 0 && r.idle.hist === 'BBB' && r.idle.card && r.idle.score === '$0', `never tapping burns three dishes and shows the game over card (${JSON.stringify(r.idle)})`);
ok(r.late.lives === 3 && r.late.perfect === false && r.late.streak === 0, `a late tap keeps the life but breaks the streak (${JSON.stringify(r.late)})`);
ok(r.fever.lives === 3 && r.fever.fever > 0, `filling the meter starts fever and heals a life (${JSON.stringify(r.fever)})`);
ok(r.rat.hist === 'S' && r.rat.lives === 3, `an unbonked rat steals the dish without a strike (${JSON.stringify(r.rat)})`);
ok(!r.bot.over && r.bot.lives === 3 && r.bot.bad === 0 && r.bot.pans === 6 && r.bot.fevers > 0 && r.bot.served > 60, `a perfect bot survives 3 minutes (${JSON.stringify(r.bot)})`);
ok(!errors.length, `no page errors ${errors.join(' | ')}`);

await browser.close(); server.close();
process.exit(fails.length ? 1 : 0);

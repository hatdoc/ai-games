// Headless check for Crater Clash: `node scripts/check-crater-clash.mjs` (needs `npm i` for playwright). Exits non-zero on failure.
// Steps the game loop by hand: bot-vs-bot matches must finish, a Rampage kill must start wave 2, the same seed must give the same map.
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
await page.route('**/api/time', (r) => r.fulfill({ status: 404, body: '' }));
await page.goto(`http://localhost:${server.address().port}/crater-clash/`);
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };

const res = await page.evaluate(() => {
  closeSheet();
  const out = {};
  const fingerprint = (seed) => { startMatch({ mode: 'duel', seed, diff: 'normal' }); return G.tanks.map((t) => `${t.x | 0},${t.y | 0}`).join('|') + ':' + G.wind; };
  out.sameSeed = fingerprint('abc') === fingerprint('abc'); out.diffSeed = fingerprint('abc') !== fingerprint('xyz');
  let finished = 0;
  for (let m = 0; m < 4; m++) { // hard bot vs hard bot until somebody wins (or 10 minutes of game time)
    startMatch({ mode: 'duel', demo: true, diff: 'hard' }); const g = G; g.demo = false;
    for (let i = 0; i < 60 * 600 && !g.over; i++) update(1 / 60, 1 / 60);
    if (g.over) finished++;
  }
  out.finished = finished;
  startMatch({ mode: 'rampage' }); const e = G.tanks[1]; G.state = 'fly'; G.tanks[0].ai = false; e.hp = 1; boom(e.x, e.y - 8, WEAPONS[1], G.tanks[0]);
  for (let i = 0; i < 600; i++) update(1 / 60, 1 / 60);
  out.wave = G.wave; out.score = G.score; out.kills = G.kills;
  return out;
});
ok(res.sameSeed, 'same seed gives the same map, tanks and wind');
ok(res.diffSeed, 'different seeds give different maps');
ok(res.finished === 4, `bot matches always finish (${res.finished}/4)`);
ok(res.wave === 2 && res.score > 0 && res.kills === 1, `rampage kill scores and starts wave 2 (wave ${res.wave}, score ${res.score})`);
ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
await browser.close(); server.close(); process.exit(fails.length ? 1 : 0);

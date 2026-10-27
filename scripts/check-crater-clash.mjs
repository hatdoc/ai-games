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
const MAP_IDS_OK = (m) => Object.keys(m).length === 5 && Object.values(m).every(Boolean);
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
  out.maps = {}; // every map must place both tanks on dry ground and let two hard bots finish a match
  for (const id of MAP_IDS) {
    startMatch({ mode: 'duel', map: id, seed: 'm' + id, diff: 'hard', demo: true }); const g2 = G; g2.demo = false;
    const placed = g2.tanks.every((t) => t.y < Math.min(WATER, H) - 14 && solid(t.x, t.y + 1));
    for (let i = 0; i < 60 * 900 && !g2.over; i++) update(1 / 60, 1 / 60);
    out.maps[id] = placed && g2.over;
  }
  startMatch({ mode: 'duel', map: 'abyss', seed: 'v' }); const me = G.tanks[0]; G.turn = me; for (let k = 0; k < 4; k++) carve(me.x, me.y + 30 + k * 50, 90);
  for (let i = 0; i < 400; i++) update(1 / 60, 1 / 60); out.void = me.dead; // dug all the way through: falls out of the map
  startMatch({ mode: 'duel', map: 'hills', seed: 'g' }); const e = G.tanks[1]; G.state = 'fly'; boom(e.x, e.y - 8, WEAPONS.find((w) => w.id === 'gas'), G.tanks[0]);
  out.gasPoison = e.poison; const hp0 = e.hp; G.state = 'aim'; G.turn = e; e.ai = false; endTurn(); out.gasDmg = hp0 - e.hp; // poison bites at the end of your own turn
  for (let r = 0; r < 4; r++) { G.gas.forEach((z) => z.rounds--); G.gas = G.gas.filter((z) => z.rounds > 0); } out.gasGone = G.gas.length === 0;
  startMatch({ mode: 'duel', map: 'hills', seed: 'n' }); const e2 = G.tanks[1]; G.state = 'fly'; boom(e2.x, e2.y - 8, WEAPONS.find((w) => w.id === 'nuke'), G.tanks[0]); out.nuke = e2.dead;
  out.oneEach = G.tanks[0].ammo[6] === 1 && G.tanks[0].ammo[7] === 1;
  startMatch({ mode: 'rampage' }); const e3 = G.tanks[1]; G.state = 'fly'; G.tanks[0].ai = false; e3.hp = 1; boom(e3.x, e3.y - 8, WEAPONS[1], G.tanks[0]);
  for (let i = 0; i < 600; i++) update(1 / 60, 1 / 60);
  out.wave = G.wave; out.score = G.score; out.kills = G.kills;
  return out;
});
ok(res.sameSeed, 'same seed gives the same map, tanks and wind');
ok(res.diffSeed, 'different seeds give different maps');
ok(res.finished === 4, `bot matches always finish (${res.finished}/4)`);
ok(res.wave === 2 && res.score > 0 && res.kills === 1, `rampage kill scores and starts wave 2 (wave ${res.wave}, score ${res.score})`);
ok(MAP_IDS_OK(res.maps), `every map works: ${JSON.stringify(res.maps)}`);
ok(res.void, 'digging all the way through drops a tank out of the map');
ok(res.gasPoison === 3 && res.gasDmg === 8 && res.gasGone, 'gas poisons for 3 turns, 8 damage each, and the cloud fades');
ok(res.nuke && res.oneEach, 'a nuke flattens a tank, and each player starts with one nuke and one gas');
ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
await browser.close(); server.close(); process.exit(fails.length ? 1 : 0);

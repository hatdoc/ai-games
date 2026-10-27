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
  { // climbing: out of a steep crater, and along a carved tunnel
    startMatch({ mode: 'duel', map: 'hills', seed: 'climb' }); const c = G.tanks[0], cx = 700, top = groundTop(cx);
    carve(cx, top, 70); c.x = cx; c.y = top + 60; for (let i = 0; i < 120; i++) updateTank(c, 1 / 60); // at the bottom of a 70px crater
    const startY = c.y; let minY = c.y; for (let i = 0; i < 120; i++) { walk(c, 1, 1); minY = Math.min(minY, c.y); } out.climbOut = c.x > cx + 70 && minY < startY - 50;
    startMatch({ mode: 'duel', map: 'hills', seed: 'tunnel' }); const d = G.tanks[0], tx0 = 900, ty = groundTop(tx0) + 30;
    for (let x = tx0; x < tx0 + 160; x += 8) carve(x, ty, 14); // a 28px-high tunnel
    d.x = tx0 + 4; d.y = ty + 13; for (let i = 0; i < 90; i++) updateTank(d, 1 / 60); const dx0 = d.x;
    for (let i = 0; i < 400; i++) walk(d, 1, 1); out.tunnel = d.x > dx0 + 100 && !d.air;
  }
  out.kits = TANK_IDS.every((id) => { const t = mkTank({ cls: id }); return TANKS[id].kit.every(([w, n]) => t.ammo[widx(w)] === n) && t.ammo.filter((n) => n > 0).length === TANKS[id].kit.length && t.kit.length === 4; });
  const hv = mkTank({ cls: 'heavy' }), sn = mkTank({ cls: 'sniper' }), sc = mkTank({ cls: 'scout' }), br = mkTank({ cls: 'brawler' }), rk = mkTank({ cls: 'rookie' });
  out.stats = hv.maxhp > rk.maxhp && sc.fuel > rk.fuel && rk.fuel > hv.fuel && spdOf(sn) > spdOf(rk) && spdOf(rk) > spdOf(br) && hv.ammo[widx('nuke')] === 1 && rk.ammo[widx('gas')] === 1;
  startMatch({ mode: 'duel', map: 'hills', seed: 'cls', diff: 'hard', tank: 'sniper' }); const g3 = G; g3.tanks[0].ai = true; g3.tanks[0].aiS = { ph: 'think', tm: 0.5, plan: null, moves: 0, wantMove: false }; for (let i = 0; i < 60 * 900 && !g3.over; i++) update(1 / 60, 1 / 60); out.classMatch = g3.over;
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
ok(res.climbOut, 'a tank climbs out of a steep crater');
ok(res.tunnel, 'a tank drives through a carved tunnel');
ok(res.nuke, 'a nuke flattens a tank');
ok(res.kits && res.stats, 'every tank class has its own 4-weapon kit and distinct health, speed and range');
ok(res.classMatch, 'a match with a non-default class finishes');
ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
await browser.close(); server.close(); process.exit(fails.length ? 1 : 0);

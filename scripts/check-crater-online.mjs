// Online lockstep check for Crater Clash: `node scripts/check-crater-online.mjs`. Two pages play a whole match against each other through a fake NET
// (no Firebase, no WebRTC): messages are relayed between them like the real data channel does. After every turn the terrain, tanks and health must match.
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
const browser = await chromium.launch(), errors = [], q = [[], []];
const pages = await Promise.all([0, 1].map(async (i) => {
  const p = await browser.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  await p.route('**/*firestore.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[{}]' }));
  await p.route('**/api/time', (r) => r.fulfill({ status: 404, body: '' }));
  await p.route('**/firebasejs/**', (r) => r.abort()); // the real NET is replaced by a relay
  await p.exposeFunction('__send', (m) => { q[1 - i].push(m); });
  await p.addInitScript((host) => {
    window.requestAnimationFrame = () => 0; // we step the game by hand
    window.NET = { st: { on: true, host, open: true, code: 'TEST1' }, send: (m) => window.__send(m), leave: async () => {}, onmsg: null };
  }, i === 0);
  await p.goto(`http://localhost:${server.address().port}/crater-clash/`);
  await p.evaluate(() => { closeSheet(); wireNet(); });
  return p;
}));
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };
const flush = async () => { for (let k = 0; k < 4; k++) for (const i of [0, 1]) while (q[i].length) { const m = q[i].shift(); await pages[i].evaluate((m) => window.NET.onmsg(m), m); } };

// handshake: both announce themselves; the host picks the seed and map
await pages[0].evaluate(() => { S.tank = 'heavy'; S.map = 'islands'; });
await pages[1].evaluate(() => { S.tank = 'sniper'; S.map = 'abyss'; });
for (const p of pages) await p.evaluate(() => window.NET.onopen());
await flush();
const st = await Promise.all(pages.map((p) => p.evaluate(() => G && { mode: G.mode, me: G.me, map: G.map, seed: G.seed, cls: G.tanks.map((t) => t.cls).join(), remote: G.tanks.map((t) => t.remote).join() })));
ok(st[0] && st[1] && st[0].seed === st[1].seed && st[0].map === st[1].map, `both machines start the same match: ${JSON.stringify(st)}`);
ok(st[0].cls === 'heavy,sniper' && st[0].remote === 'false,true' && st[1].remote === 'true,false', 'each machine controls only its own tank');

const state = (p) => p.evaluate(() => { let h = 0; for (let i = 0; i < mask.length; i += 7) h = (h * 31 + mask[i]) | 0; return { turns: G.turns, over: G.over, st: G.state, h, tanks: G.tanks.map((t) => [Math.round(t.x), Math.round(t.y), Math.round(t.hp), t.poison, t.dead]).join('|'), wind: G.wind }; });
let synced = 0, turnsPlayed = 0;
for (let turn = 0; turn < 14; turn++) {
  const [a, b] = await Promise.all(pages.map(state)); if (a.over || b.over) break;
  const shooter = await pages[0].evaluate(() => (G.turn.remote ? 1 : 0)); // whose turn is it
  await pages[shooter].evaluate((turn) => { // the active player aims at the enemy with the bot's solver, using a different weapon each turn
    const t = G.turn, pl = aiPlan(Object.assign(Object.create(t), { ai: false })); t.f = pl.f; t.el = pl.el; t.pw = pl.pw;
    const have = t.kit.filter((i) => t.ammo[i] > 0); t.wi = have[turn % have.length]; fire(t);
  }, turn);
  for (let i = 0; i < 60 * 40; i++) { // step both machines a tick at a time, delivering messages in between
    await Promise.all(pages.map((p) => p.evaluate(() => { if (!G.over) update(1 / 60, 1 / 60); })));
    await flush();
    const s = await Promise.all(pages.map((p) => p.evaluate(() => [G.turns, G.state, G.over]))); if (s[0][0] === s[1][0] && s[0][1] === 'aim' && s[1][1] === 'aim' || s[0][2] && s[1][2]) break;
  }
  const [a2, b2] = await Promise.all(pages.map(state)); turnsPlayed++;
  if (a2.turns === b2.turns && a2.h === b2.h && a2.tanks === b2.tanks && a2.wind === b2.wind) synced++; else { console.log('desync', JSON.stringify(a2), JSON.stringify(b2)); break; }
}
ok(turnsPlayed >= 4 && synced === turnsPlayed, `terrain, tanks, health and wind match after every one of ${turnsPlayed} turns (${synced} in sync)`);
const done = await Promise.all(pages.map((p) => p.evaluate(() => ({ over: G.over, dead: G.tanks.map((t) => t.dead) }))));
ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
console.log('final', JSON.stringify(done));
await browser.close(); server.close(); process.exit(fails.length ? 1 : 0);

// Headless check for Goose Guard: `node scripts/check-goose-guard.mjs [--sweep]` (needs `npm i` for playwright). Exits non-zero on failure.
// Steps the sim by hand: the bot wins early stages, an idle player loses the barn, wins pay acorns and unlock the next stage,
// upgrades cost acorns, honk stuns, endless ends with a score. --sweep prints how far the bot gets with each upgrade level (for tuning).
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
await page.goto(`http://localhost:${server.address().port}/goose-guard/`);
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };

const r = await page.evaluate(() => {
  const out = {}, dt = 1 / 60;
  const run = (max) => { for (let i = 0; i < max * 60 && !gg.S.over; i++) gg.update(dt); return { over: gg.S.over, win: gg.S.win, t: Math.round(gg.S.t), barn: Math.round(gg.S.barn.hp / gg.S.barn.max * 100) }; };
  const all = (l) => ({ up: { hero: l, honk: l, grain: l, barn: l }, u: gg.UNITS.map(() => l) });

  gg.start(1, { bot: true }); out.s1 = run(400);
  gg.start(10); out.idle = run(900);

  // a real (non-bot) win pays out and unlocks stage 2
  localStorage.clear(); gg.save.stars = {}; gg.save.acorns = 0;
  gg.start(1); gg.S.tower.hp = 1; gg.S.rushed = true; gg.update(dt); gg.S.hero.x = gg.S.towerX - 50; gg.S.hero.cd = 0; gg.update(dt);
  out.win = { over: gg.S.over, win: gg.S.win };
  const res = gg.finish(); out.reward = { ...res, stars1: gg.save.stars[1], acorns: gg.save.acorns, saved: !!localStorage.getItem('gooseguard-save') };

  const a0 = gg.save.acorns, ok1 = gg.buy('up:grain'), a1 = gg.save.acorns;
  gg.save.acorns = 0; const ok2 = gg.buy('up:hero');
  out.buy = { ok1, spent: a0 - a1, lvl: gg.save.up.grain, ok2 };

  gg.start(1); gg.S.honkCd = 0; const f = gg.S.ents.length; gg.S.queue.push({ t: 0 }); gg.update(dt);
  const foe = gg.S.ents.find((e) => e.side === -1); foe.x = gg.S.hero.x + 60; foe.hp = foe.max = 1e4;
  out.honk = { fired: gg.honk(), stun: foe.stun > 0, again: gg.honk() };

  gg.start(1); out.summon = { cheap: gg.summon(0), locked: gg.summon(6), troops: gg.S.troops };

  gg.start(0, { bot: true, ...all(3), units: [0, 1, 2, 3, 4] }); out.endless = run(1500); out.endless.pts = gg.S.pts; out.endless.wave = gg.S.wave;
  return out;
});
ok(r.s1.win && r.s1.barn >= 70, `bot clears stage 1 with three stars (${JSON.stringify(r.s1)})`);
ok(r.idle.over && !r.idle.win, `doing nothing on stage 10 loses the barn (${JSON.stringify(r.idle)})`);
ok(r.win.over && r.win.win, `breaking the tower wins (${JSON.stringify(r.win)})`);
ok(r.reward.first && r.reward.stars1 === 3 && r.reward.acorns > 0 && r.reward.saved, `first win gives stars + acorns and saves (${JSON.stringify(r.reward)})`);
ok(r.buy.ok1 && r.buy.spent > 0 && r.buy.lvl === 2 && !r.buy.ok2, `upgrades cost acorns and need enough of them (${JSON.stringify(r.buy)})`);
ok(r.honk.fired && r.honk.stun && !r.honk.again, `honk stuns nearby weeds and then cools down (${JSON.stringify(r.honk)})`);
ok(r.summon.cheap && !r.summon.locked && r.summon.troops === 1, `stage 1 can send chicks but not locked troops (${JSON.stringify(r.summon)})`);
ok(r.endless.over && !r.endless.win && r.endless.pts > 0 && r.endless.wave > 2, `endless horde ends with a score (${JSON.stringify(r.endless)})`);

if (process.argv.includes('--sweep')) {
  // a player who upgrades about one level every 6 stages; up to 3 tries per stage
  const sweep = await page.evaluate(() => {
    const rows = [];
    for (let n = 1; n <= 60; n++) {
      const l = Math.min(10, 1 + Math.floor(n / 6.5)); let tries = 0, won = false, t = 0;
      while (!won && tries < 3) {
        tries++;
        gg.start(n, { bot: true, up: { hero: l, honk: l, grain: l, barn: l }, u: gg.UNITS.map(() => l), units: gg.UNITS.map((u, i) => i).filter((i) => gg.UNITS[i].unlock <= n) });
        for (let i = 0; i < 600 * 60 && !gg.S.over; i++) gg.update(1 / 60);
        won = gg.S.win; t = Math.round(gg.S.t);
      }
      rows.push(`${n}:lv${l}:${won ? (tries > 1 ? 'won on try ' + tries : 'ok') : 'LOST'}:${t}s`);
    }
    return rows;
  });
  console.log(sweep.join('  '));
}
ok(!errors.length, `no page errors ${errors.join(' | ')}`);
await browser.close(); server.close();
process.exit(fails.length ? 1 : 0);

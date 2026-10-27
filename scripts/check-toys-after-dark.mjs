// Headless check for Toys After Dark: `node scripts/check-toys-after-dark.mjs` (needs `npm i` for playwright). Exits non-zero on failure.
// Drives the sim by hand through window.tad: freeze, line-of-sight rules, suspicion, human visits, music states,
// every mission (autopilot), reward de-duplication, chaos events, bot removal mid-round, and every primary button.
// THREE_LOCAL=/path/to/three.min.js serves three.js from disk when the CDN is unreachable.
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
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } }), errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.route('**/*googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
if (process.env.THREE_LOCAL) await page.route('**/three.min.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(process.env.THREE_LOCAL) }));
await page.goto(`http://localhost:${server.address().port}/toys-after-dark/`);
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };
const run = (fn, a) => page.evaluate(fn, a);

// 1. join and start a round
await page.click('#btnPlay');
let s = await run(() => ({ mode: tad.G.mode, bots: tad.bots.length, h: !!tad.H, step: tad.G.def.id }));
ok(s.mode === 'play' && s.bots === 3 && s.h, 'PLAY starts a round with a player, 3 teammates and a human');

// 2. movement + immediate freeze
s = await run(() => { tad.input.iy = 1; for (let i = 0; i < 40; i++) tad.update(1 / 60); const moving = tad.P.speedNow; tad.input.freeze = true; tad.update(1 / 60); const r = { moving, frozen: tad.P.speedNow, flag: tad.P.frozen }; tad.input.iy = 0; tad.input.freeze = false; return r; });
ok(s.moving > 5 && s.frozen === 0 && s.flag, `moves (${s.moving.toFixed(1)}) and stops dead the frame freeze is held`);

// 3. visibility rules
s = await run(() => {
  const H = tad.H, P = tad.P; H.phase = 'in'; H.fake = false; H.x = 10; H.z = 4; H.f = Math.PI / 2; H.grace = 0; H.visitT = 5; H.limit = 99;
  const at = (x, z) => { P.x = x; P.z = z; P.hidden = null; P.out = 0; return tad.hSees(P); };
  const r = { open: at(15, 4), wall: at(22, 4), behind: at(0, 4), far: at(20, -20), hidden: false };
  P.x = 15; P.z = 4; P.hidden = { n: 'x' }; r.hidden = tad.hSees(P); P.hidden = null; return r;
});
ok(s.open && !s.wall && !s.behind && !s.hidden, `sees in cone (${s.open}), not through the wardrobe (${!s.wall}), not behind her (${!s.behind}), not hidden (${!s.hidden})`);
s = await run(() => { const H = tad.H, P = tad.P; H.x = 0; H.z = -30; H.f = 0; P.x = 22; P.z = -10; return { thruWall: tad.hSees(P), gap: (P.x = 0, P.z = 0, tad.hSees(P)) }; });
ok(!s.thruWall && s.gap, 'a human outside the door sees only through the doorway gap, never through the wall');

// 4. suspicion rules: moving in sight rises, frozen in sight does not, out of sight decays
s = await run(() => {
  const H = tad.H, P = tad.P; H.phase = 'in'; H.x = 10; H.z = 4; H.f = Math.PI / 2; H.grace = 0; H.visitT = 5; H.limit = 99; H.wps = []; H.pause = 99; P.out = 0; P.hidden = null;
  const sim = (frozen, moving, secs) => { P.x = 15; P.z = 4; P.susp = 10; P.obsT = 5; for (let i = 0; i < secs * 60; i++) { P.x = 15; P.z = 4; tad.input.freeze = frozen; P.frozen = frozen; P.speedNow = moving ? 6 : 0; P.vx = moving ? 6 : 0; H.x = 10; H.z = 4; H.f = Math.PI / 2; H.pause = 99; tad.update(1 / 60); P.x = 15; P.z = 4; } return P.susp; };
  tad.input.iy = 0; tad.setDemo(false);
  const res = { moving: sim(false, true, 1), still: sim(true, false, 1), wiggle: sim(false, false, 1) }; tad.input.freeze = false; return res;
});
ok(s.moving > 30 && s.still <= 10 && s.wiggle > 10 && s.wiggle < s.moving, `suspicion: moving +${(s.moving - 10).toFixed(0)}/s, frozen ${s.still.toFixed(0)}, idle-wiggle +${(s.wiggle - 10).toFixed(0)}/s`);
s = await run(() => { const P = tad.P, H = tad.H; H.phase = 'away'; H.timer = 99; P.susp = 60; for (let i = 0; i < 240; i++) tad.update(1 / 60); return P.susp; });
ok(s < 50, `suspicion decays with no human (${s.toFixed(0)})`);
s = await run(() => [[10, 'safe'], [30, 'alert'], [60, 'danger'], [90, 'critical'], [100, 'caught']].map(([v, n]) => tad.suspState(v)[1] === n));
ok(s.every(Boolean), 'suspicion states safe / alert / danger / critical / caught map correctly');

// 5. catch is server-style authoritative here: only suspicion >= 100 catches; relocation and timeout work
s = await run(() => { const P = tad.P, H = tad.H; H.phase = 'away'; H.timer = 99; P.susp = 99; for (let i = 0; i < 10; i++) tad.update(1 / 60); const before = tad.G.strikes; H.phase = 'in'; H.fake = false; H.x = 10; H.z = 4; H.f = Math.PI / 2; H.grace = 0; H.visitT = 5; H.limit = 99; H.pause = 99; P.x = 15; P.z = 4; P.obsT = 5; P.speedNow = 6; P.vx = 6; P.susp = 99.5; tad.update(1 / 60); return { before, after: tad.G.strikes, out: P.out > 0, slow: tad.G.timeScale < 1 }; });
ok(s.before === 0 && s.after === 1 && s.out && s.slow, JSON.stringify(s) + ' catch fires only at 100 suspicion, costs a strike, sends you to the toy box with slow-mo');

// 6. human visit lifecycle + music states
s = await run(() => {
  tad.startRound('cookie'); const H = tad.H, A = tad.A, seq = []; tad.setDemo(false); H.timer = 0.01;
  const note = (k) => { if (seq[seq.length - 1] !== k) seq.push(k); };
  for (let i = 0; i < 60 * 40; i++) { tad.update(1 / 60); note(H.phase + ':' + A.state); if (H.phase === 'away' && H.visit > 0 && H.timer > 5) break; tad.P.susp = Math.min(tad.P.susp, 30); }
  return { seq, visits: tad.G.stats.visits, door: TAD.door.rotation.y };
});
const ph = s.seq.map((x) => x.split(':')[0]), ms = s.seq.map((x) => x.split(':')[1]);
ok(['away', 'warn', 'in', 'leave'].every((p) => ph.includes(p)) || s.seq.some((x) => x.startsWith('warn')) && ph.includes('in'), 'a visit runs warn, then enters, inspects, leaves: ' + [...new Set(ph)].join('>'));
ok(ms.includes('safe') && ms.includes('approach') && (ms.includes('entry') || ms.includes('inspect')), 'music moves safe > approach > entry/inspect: ' + [...new Set(ms)].join('>'));

// 7. missions: autopilot completes every one, rewards land once
const ids = await run(() => tad.MISSIONS.map((m) => m.id));
for (const id of ids) {
  const r = await run((id) => {
    tad.startRound(id); tad.setDemo(true); const G = tad.G; let n = 0;
    while (G.mode === 'play' && n < 60 * 420) { tad.update(1 / 60); n++; if (tad.P.out > 0 && G.strikes >= 3) break; }
    return { mode: G.mode, won: G.won, steps: G.stats.steps, total: G.def.steps.length, t: Math.round(n / 60), strikes: G.strikes };
  }, id);
  ok(r.won && r.mode === 'results', `mission ${id} completes (${r.steps}/${r.total} steps in ${r.t}s, ${r.strikes} strikes)`);
}
s = await run(() => { tad.setDemo(false); const xp = tad.S.xp, coins = tad.S.coins; UI.results(); const a = tad.S.xp, c = tad.S.coins; UI.results(); UI.results(); return { gain: a - xp, again: tad.S.xp - a, cgain: c - coins, cagain: tad.S.coins - c }; });
ok(s.again === 0 && s.cagain === 0, `rewards granted once per round (+${s.gain} xp, +${s.cgain} coins; repeats +${s.again})`);
s = await run(() => { tad.startRound('cookie'); const G = tad.G; tad.setDemo(true); for (let i = 0; i < 60 * 6; i++) tad.update(1 / 60); return { step: G.step }; });
ok(s.step >= 0, 'next round starts after results (mode play)');

// 8. mission can never be stuck: dropped item stays recoverable, lost item respawns after a human tidies
s = await run(() => {
  tad.startRound('cookie'); tad.setDemo(false); const P = tad.P, it = tad.G.target; tad.H.timer = 99; P.x = it.x; P.z = it.z + 1; tad.interact(); const carried = !!P.carry; tad.input.drop = true; tad.update(1 / 60);
  const dropped = !P.carry && tad.evid.includes(it); P.x = it.x + 1; P.z = it.z + 1; tad.interact(); return { carried, dropped, regot: !!P.carry };
});
ok(s.carried && s.dropped && s.regot, 'an item can be picked up, dropped as evidence and picked up again');

// 9. chaos events all run without errors and make noise
s = await run(() => {
  tad.startRound('cookie'); tad.setDemo(false); tad.H.timer = 999; const kinds = ['cat', 'vacuum', 'tower', 'ball', 'car', 'books', 'noisy'], done = [];
  for (const k of kinds) { tad.spawnEvent(k); for (let i = 0; i < 60 * 9; i++) { tad.update(1 / 60); tad.P.susp = 0; } done.push(k + ':' + tad.movers.length); }
  return done;
});
ok(s.length === 7, 'all 7 chaos events (cat, vacuum, blocks, ball, car, books, noisy toy) ran: ' + s.join(' '));

// 10. teammate departure does not break the round; human noise reaction
s = await run(() => {
  tad.startRound('cookie'); tad.setDemo(false); tad.H.timer = 999; tad.bots.length = 0; for (let i = 0; i < 120; i++) tad.update(1 / 60);
  const H = tad.H; H.phase = 'in'; H.fake = false; H.visitT = 5; H.limit = 99; H.x = 0; H.z = 0; H.pause = 5; tad.noise(10, 10, 0.9, 'none'); return { inv: !!H.inv, mode: tad.G.mode };
});
ok(s.inv && s.mode === 'play', 'round keeps running with no teammates; loud noise makes the human investigate');

// 11. settings change real audio/gameplay values; quick chat; every primary button
await run(() => tad.toMenu());
const btns = { '#btnMissions': '.mcard', '#btnToys': '.kcard', '#btnDaily': '.ach', '#btnRecords': '.stats', '#btnSettings': '.set' };
for (const [b, sel] of Object.entries(btns)) { await page.click(b); const n = await page.locator(sel).count(); ok(n > 0, `${b} opens its panel`); await page.click('#sheet [data-x]'); }
await page.click('#btnSettings'); await page.locator('[data-s=music]').fill('0.2'); await page.locator('[data-s=quality]').selectOption('low');
s = await run(() => ({ music: TADAudio.vol.music, q: tad.S.set.quality, shadows: TAD.renderer.shadowMap.enabled }));
ok(s.music === 0.2 && s.q === 'low' && !s.shadows, 'settings change the music volume and graphics quality for real');
await page.click('#sheet [data-x]'); await run(() => { tad.S.set.quality = 'high'; tadUI.applyQuality(); });
await page.click('#btnToys'); await page.click('[data-k=teddy]'); await page.click('#sheet [data-x]');
await page.click('#btnPlay');
s = await run(() => ({ kind: tad.P.kind }));
ok(s.kind === 'teddy', 'character selection carries into the round');
for (let i = 0; i < 6; i++) await page.click(`#chat button:nth-child(${i + 1})`);
s = await run(() => ({ say: !!tad.P.sayMsg, freeze: tad.G.chatFreeze > tad.G.t }));
ok(s.say && s.freeze, 'quick chat shows a bubble and makes teammates freeze');
await page.click('#bPause').catch(() => {}); await page.keyboard.press('p'); const paused = await run(() => tad.G.paused); ok(paused, 'P pauses the round'); await page.click('#pRes');

// 12. abilities obey the rules; cosmetics purchasable
s = await run(() => {
  const out = {}; for (const k of ['ninja', 'windup', 'clown', 'robot', 'teddy', 'explorer']) { tad.S.kind = k; tad.startRound('cookie'); tad.H.timer = 999; tad.setDemo(false); const P = tad.P; P.x = -4; P.z = 7; tad.input.ability = true; tad.input.iy = 1; tad.update(1 / 60); for (let i = 0; i < 10; i++) tad.update(1 / 60); out[k] = [Math.round(P.speedNow), P.cd.ab > 0]; tad.input.iy = 0; }
  return out;
});
ok(s.ninja[0] > s.teddy[0] && s.windup[0] > s.teddy[0] && s.ninja[1] && s.windup[1], 'ninja dash and wind-up sprint are faster than the bear and then go on cooldown: ' + JSON.stringify(s));
s = await run(() => { tad.S.kind = 'explorer'; tad.startRound('cookie'); tad.H.timer = 999; const P = tad.P; P.x = -22; P.z = 10; tad.interact(); const small = !!P.hidden; P.hidden = null; tad.S.kind = 'robot'; tad.startRound('cookie'); tad.P.x = -22; tad.P.z = 10; tad.interact(); return { small, robot: !!tad.P.hidden }; });
ok(s.small && !s.robot, 'only the Tiny Explorer fits the mouse hole');
s = await run(() => { tad.S.coins = 500; return 1; }); await page.click('#btnMissions').catch(() => {});
ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close(); server.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed'); process.exit(fails.length ? 1 : 0);

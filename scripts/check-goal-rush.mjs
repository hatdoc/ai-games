// Headless check for Goal Rush: `node scripts/check-goal-rush.mjs` (needs `npm i` for playwright). Exits non-zero on failure.
// Steps the sim by hand: bot-vs-bot matches must finish with goals, every chaos event and ability must run, kicks must move the ball, a penalty shootout must end.
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
await page.goto(`http://localhost:${server.address().port}/goal-rush/`);
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };

const res = await page.evaluate(() => {
  const out = {}, { startMatch, update, kick } = gr;
  const run = (secs) => { for (let i = 0; i < secs * 60 && gr.M.state !== 'over'; i++) update(1 / 60); };
  // 1. bot vs bot matches finish and produce goals at each difficulty
  out.goals = {};
  for (const [name, d] of [['rookie', 0.45], ['pro', 0.85], ['legend', 1.2]]) {
    let total = 0, finished = 0;
    for (let m = 0; m < 3; m++) {
      startMatch({ mode: 'quick', size: 2, diff: d, chaos: true, demo: true, dur: 90 }); const M = gr.M; M.cfg.bg = false;
      for (let i = 0; i < 60 * 400 && M.state !== 'over'; i++) update(1 / 60);
      if (M.state === 'over') finished++; total += M.score[0] + M.score[1];
    }
    out.goals[name] = { finished, avg: total / 3 };
  }
  // 2. the human can kick: ball next to player, aim at it, click
  startMatch({ mode: 'quick', size: 1, diff: 0.5, chaos: false }); let M = gr.M; for (let i = 0; i < 200 && M.state !== 'play'; i++) update(1 / 60);
  const h = M.hum, b = M.balls[0]; h.x = 300; h.y = 270; b.x = 330; b.y = 270; b.vx = b.vy = 0;
  const kicked = kick(h, { dir: 0, charge: 0 }); out.kickSpeed = Math.hypot(b.vx, b.vy); out.kicked = kicked;
  b.x = 330; b.vx = b.vy = 0; kick(h, { dir: 0, charge: 1 }); out.powerSpeed = Math.hypot(b.vx, b.vy);
  // 3. every chaos event and every ability runs without throwing
  out.chaos = [];
  for (const id of ['giant', 'tiny', 'speed', 'lowg', 'banana', 'pinball', 'golden', 'double', 'meteor', 'reverse', 'invis']) {
    startMatch({ mode: 'quick', size: 2, diff: 1, chaos: true, demo: true, dur: 90 }); M = gr.M; M.cfg.bg = false; for (let i = 0; i < 200; i++) update(1 / 60);
    M.cur = id; M.curT = 5; for (let i = 0; i < 360; i++) update(1 / 60); out.chaos.push(id);
  }
  for (const id of ['rocket', 'magnet', 'shock', 'wall', 'tele', 'super', 'clone']) {
    startMatch({ mode: 'quick', size: 2, diff: 1, chaos: false, ab: id }); M = gr.M; for (let i = 0; i < 200; i++) update(1 / 60);
    M.hum.abCd = 0; M.hum.ab = id; M.hum.aim = { x: 600, y: 270 }; const used = (() => { const f = window.eval('useAbility'); return f(M.hum); })(); for (let i = 0; i < 120; i++) update(1 / 60); out['ab_' + id] = used;
  }
  // 4. rage: conceding starts rage on the conceding team; golden goal ends the match on the first goal
  startMatch({ mode: 'golden', size: 1, diff: 0.5, chaos: false }); M = gr.M; for (let i = 0; i < 200; i++) update(1 / 60);
  const bb = M.balls[0]; bb.last = { p: M.players[0], team: 0, kind: 'normal', sp: 800, x0: 500, y0: 270, t: M.clock, ownHalf: false }; bb.x = 905; bb.y = 270; bb.vx = 400; bb.vy = 0;
  for (let i = 0; i < 20 && M.state === 'play'; i++) update(1 / 60);
  out.goalState = M.state; out.score = M.score.slice(); out.rageTeam = M.rageTeam;
  for (let i = 0; i < 400 && M.state !== 'over'; i++) update(1 / 60); out.goldenOver = M.state;
  // 5. party mode runs with three balls
  startMatch({ mode: 'party', size: 2, diff: 1, chaos: true, demo: true, dur: 30 }); M = gr.M; M.cfg.bg = false; for (let i = 0; i < 60 * 40 && M.state !== 'over'; i++) update(1 / 60); out.party = M.state === 'over'; out.partyBalls = M.balls.length;
  return out;
});
for (const [k, v] of Object.entries(res.goals)) ok(v.finished === 3 && v.avg >= 0.7, `${k}: 3/3 bot matches finish, ${v.avg.toFixed(1)} goals per match`);
ok(res.kicked && res.kickSpeed > 600 && res.powerSpeed > res.kickSpeed * 1.4, `kick moves the ball (${res.kickSpeed | 0} normal, ${res.powerSpeed | 0} power)`);
ok(res.chaos.length === 11, 'all 11 chaos events run');
ok(['rocket', 'magnet', 'shock', 'wall', 'tele', 'super', 'clone'].every((a) => res['ab_' + a] !== false), 'all 7 abilities run');
ok(res.goalState === 'goal' && res.score[0] === 1 && res.rageTeam === 1, `goal detected, score ${res.score}, conceding team gets rage`);
ok(res.goldenOver === 'over', 'golden goal ends the match after the first goal');
ok(res.party && res.partyBalls === 3, 'party mode finishes with 3 balls');

// penalty shootout: scripted shots and dives until it ends
const pen = await page.evaluate(() => {
  gr.startPen(); const P = gr.PEN; let guard = 0;
  while (!P.over && guard++ < 20000) {
    if (P.phase === 'aim' && P.you) { P.pw = 0.7; P.target = null; P.phase = 'aim'; window.eval('IN').wx = 300 + Math.random() * 360; window.eval('IN').wy = 140 + Math.random() * 120; window.eval('penShoot')(); }
    if (!P.you && (P.phase === 'wait' || P.phase === 'flight') && !P.dive && Math.random() < 0.05) window.eval('penDive')(300 + Math.random() * 360, 150 + Math.random() * 110);
    window.eval('penUpdate')(1 / 60);
  }
  return { over: P.over, score: P.score, taken: P.taken };
});
ok(pen.over && pen.taken[0] >= 3, `penalty shootout ends (${pen.score.join('-')} after ${pen.taken.join('/')} kicks)`);
// UI flows: pause/resume, shop purchase, a full Chaos Cup run, share card
await page.evaluate(() => { localStorage.clear(); location.reload(); }); await page.waitForTimeout(500);
const ui = await page.evaluate(async () => {
  const out = {}, click = (sel) => document.querySelector(sel)?.click(), wait = (ms) => new Promise((r) => setTimeout(r, ms));
  click('[data-act=play]'); await wait(100); out.started = !!gr.M && !gr.M.bg && document.getElementById('home').hidden;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })); out.paused = !!gr.M.paused && !document.getElementById('sheet').hidden;
  click('[data-act=resume]'); out.resumed = !gr.M.paused && document.getElementById('sheet').hidden;
  click('#tPause'); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' }));
  window.eval('leaveMatch')(); out.home = !document.getElementById('home').hidden;
  const S = gr.S; S.coins = 1000; click('[data-act=shop]'); await wait(50);
  const before = S.coins; document.querySelector('[data-act=cos]').click(); out.bought = S.coins < before;
  click('[data-act=close]');
  // Chaos Cup: win every round by forcing the score
  S.cfg.mode = 'cup'; window.eval('startCup')(); let rounds = 0;
  for (let r = 0; r < 5; r++) {
    click('[data-act=cupgo]'); await wait(50); const M = gr.M; M.score = [3 + r, 0]; M.time = 0.01;
    for (let i = 0; i < 400 && M.state !== 'over'; i++) gr.update(1 / 60);
    for (let i = 0; i < 200 && !M.done; i++) gr.update(1 / 60);
    await wait(50); rounds++; if (r < 4) click('[data-act=cupnext]');
  }
  out.cups = S.st.cups; out.crown = !!S.own['hat:crown']; out.cupScore = window.eval('CUPRUN').score; out.rounds = rounds;
  const card = window.eval('drawCard')(window.eval('LASTM')); out.card = card.width + 'x' + card.height;
  return out;
});
ok(ui.started && ui.paused && ui.resumed && ui.home, 'play button starts, Esc pauses, Resume works, quit returns to the menu');
ok(ui.bought, 'shop buys an item with coins');
ok(ui.cups === 1 && ui.crown && ui.rounds === 5 && ui.cupScore > 15000, `chaos cup: 5 rounds cleared, crown unlocked (score ${ui.cupScore})`);
ok(ui.card === '1080x1920', 'share card renders');
ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close(); server.close(); process.exit(fails.length ? 1 : 0);

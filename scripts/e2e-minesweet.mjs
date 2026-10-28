// Browser checks for Minesweet: `node scripts/e2e-minesweet.mjs` (needs `npm i` for playwright). Exits non-zero on any failure.
// Plays real boards in Chromium (desktop, phone touch, landscape) through the page's own input handlers.
import { chromium, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..'), OUT = process.env.SHOTS || '/tmp';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, 'games', decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const BASE = `http://localhost:${server.address().port}/minesweet/`;
const browser = await chromium.launch();
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };
const writes = []; // anything the page tries to write to Firestore

async function open(opts = {}, hash = '') {
  const ctx = await browser.newContext(opts), page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && page.errors.push(m.text()));
  await page.route('**/*firestore.googleapis.com/**', (r) => { if (r.request().method() !== 'POST' || /commit|:write|PATCH/.test(r.request().url())) writes.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'application/json', body: '[{}]' }); });
  await page.route('**/api/time', (r) => r.fulfill({ status: 404, body: '' }));
  await page.goto(BASE + hash); await page.waitForTimeout(300);
  page.ctx = ctx; return page;
}
const closeHow = (p) => p.evaluate(() => { closeSheet(); });
// clear the current board the way a person would (the solver's deductions), after pretending `ms` milliseconds have passed
const solveAs = (p, ms) => p.evaluate((ms) => {
  const steps = MS.solve(R.G.board).steps; let first = true;
  for (const s of steps) {
    if (R.over) break;
    if (s.t === 'o' && R.G.st[s.i] === 0) { act(s.i, 'dig'); if (first) { first = false; R.t0 = performance.now() - ms; } }
    else if (s.t === 'f' && R.G.st[s.i] === 0) act(s.i, 'flag');
  }
  return R.G.status;
}, ms);
const sheetText = (p) => p.evaluate(() => document.querySelector('#sheetBody').innerText);
const waitSheet = (p, re) => p.waitForFunction((s) => new RegExp(s).test(document.querySelector('#sheetBody').innerText), re.source, { timeout: 4000 });

// ---------- desktop: home, classic, mouse input ----------
let p = await open({ viewport: { width: 1100, height: 800 } });
await closeHow(p);
ok((await p.textContent('#home')).includes('Daily Duel') && (await p.textContent('#home')).includes('Trap Your Friend'), 'home shows Daily Duel + Trap Your Friend, no login wall');
await p.click('[data-act=classic][data-lv=beginner]');
ok(await p.locator('#board .c').count() === 81, 'beginner board has 81 tiles');
await p.locator('#board .c').nth(40).click();
let st = await p.evaluate(() => ({ s: R.G.status, open: R.G.open, mine: R.G.board.mines[40] }));
ok(st.s === 'play' && st.open > 1 && !st.mine, 'first click is safe and opens an area');
const hidden = await p.evaluate(() => [...R.G.st].findIndex((s, i) => s === 0));
await p.locator('#board .c').nth(hidden).click({ button: 'right' });
ok(await p.evaluate((i) => R.G.st[i] === 2, hidden) && (await p.textContent('#mines')) === '9', 'right-click flags and the mine counter drops');
await p.locator('#board .c').nth(hidden).click({ button: 'right' });
ok(await p.evaluate((i) => R.G.st[i] === 0, hidden), 'right-click again removes the flag');
await p.waitForTimeout(250); const t1 = parseFloat(await p.textContent('#time')); ok(t1 > 0, `timer runs (${t1}s)`);
// a loss
const mine = await p.evaluate(() => [...R.G.board.mines].findIndex((m, i) => m && R.G.st[i] === 0));
await p.locator('#board .c').nth(mine).click(); await waitSheet(p, /bit back|Boom|ticklish|tile|Mines 1|tragic|pro/i);
ok(await p.evaluate(() => R.G.status === 'lost' && R.over), 'clicking a mine loses');
const frozen = await p.textContent('#time'); await p.locator('#board .c').nth(0).click({ force: true }).catch(() => {}); ok((await p.textContent('#time')) === frozen, 'timer stops after a loss and the board no longer reacts');
await p.screenshot({ path: `${OUT}/ms-lose.png` });
await p.evaluate(() => again()); ok(await p.evaluate(() => R.G.status === 'ready' && !R.G.board), 'new board after a loss (classic)');
// a win, ranked eligibility, guest prompt
await p.evaluate(() => { rgAuth.onSite = true; rgAuth.login = () => (window.__login = 1); });
await p.locator('#board .c').nth(40).click(); await p.evaluate(() => { R.t0 = performance.now() - 31000; });
await p.evaluate(() => { for (const s of MS.solve(R.G.board).steps) { if (R.over) break; if (s.t === 'o' && R.G.st[s.i] === 0) act(s.i, 'dig'); } });
await waitSheet(p, /Beginner cleared/);
let txt = await sheetText(p);
ok(/Nice run! Want to put your score on the leaderboard\?/.test(txt) && /Log in to Rank/.test(txt) && /Continue as Guest/.test(txt), 'guest sees the friendly rank prompt after their result');
ok(/31\.\d+s|3[01]\.\ds/.test(txt) && /personal best|New personal best/i.test(txt), 'result shows time and personal best');
ok(writes.length === 0, 'a guest never writes to the leaderboard');
await p.click('[data-act=login]'); ok(await p.evaluate(() => window.__login === 1), '"Log in to Rank" calls the site sign-in');
await p.click('[data-act=guest]'); ok(!/Log in to Rank/.test(await sheetText(p)), '"Continue as Guest" dismisses the prompt, result stays');
ok(await p.evaluate(() => MS.fromScore(S.best.beginner) < 40000), 'personal best saved locally');
await p.screenshot({ path: `${OUT}/ms-win.png` });
ok(p.errors.length === 0, 'no page errors on desktop (' + p.errors.join(' | ') + ')');
const deskReload = await p.evaluate(() => JSON.parse(localStorage.getItem('minesweet')).stats.won); ok(deskReload === 1, 'stats persisted in localStorage');
await p.ctx.close();

// ---------- Daily Duel: same board for everyone, streak, saved result ----------
const mk = async () => { const q = await open({ viewport: { width: 1000, height: 800 } }); await closeHow(q); return q; };
const d1 = await mk(), d2 = await mk();
const board = async (q) => { await q.click('[data-act=daily]'); return q.evaluate(() => ({ m: [...R.G.board.mines].join(''), seed: R.seed, day: R.day, mode: R.mode })); };
const b1 = await board(d1), b2 = await board(d2);
ok(b1.m === b2.m && b1.seed === b2.seed && b1.mode === 'daily', `daily board identical on two fresh devices (${b1.day})`);
ok(await d1.evaluate(() => R.G.status === 'ready' && R.G.open > 1), 'daily starts with its opening already visible, clock not started');
await solveAs(d1, 39400); await waitSheet(d1, /Daily Duel #\d+ cleared/);
txt = await sheetText(d1); ok(/39\.[0-9]s/.test(txt) && /🔥 1 day/.test(txt) && /Can you|Share result/.test(txt + 'Share result'), 'daily result: time, streak 1, share button');
ok(await d1.evaluate(() => S.ds.streak === 1 && S.daily[R.day].ms >= 39400), 'daily result + streak saved');
await d1.evaluate(() => home()); ok(/Cleared in 39/.test(await d1.textContent('#dSub')), 'home shows today as cleared');
await d1.click('[data-act=daily]'); ok(/Daily Duel #\d+ cleared/.test(await sheetText(d1)), 'opening Daily again shows the saved result (one scored try)');
await d1.evaluate(() => again()); ok(await d1.evaluate(() => R.replay && R.G.status === 'ready'), 'replay available but marked as replay');
// streak: pretend yesterday was cleared
await d1.evaluate(() => { const y = MS.prevDay(R.day); S.ds = { last: y, streak: 6, best: 6 }; delete S.daily[R.day]; });
await d1.evaluate(() => home()); await d1.click('[data-act=daily]'); await solveAs(d1, 50000); await waitSheet(d1, /cleared/);
ok(await d1.evaluate(() => S.ds.streak === 7 && !!S.ach.daily_legend), 'a 7th day in a row unlocks Daily Legend');
await d1.ctx.close(); await d2.ctx.close();

// ---------- Trap Your Friend -> Revenge, with cards ----------
const A = await mk();
await A.click('[data-act=trap]'); await A.click('[data-act=trapLv][data-lv=beginner]'); await A.fill('#nm', 'Sam');
await A.click('[data-act=trapCard][data-card=timeattack]'); await A.click('[data-act=trapCard][data-card=blackout]', { timeout: 500, force: true }).catch(() => {});
ok(await A.evaluate(() => window.__trap.card === 'timeattack'), 'only owned sabotage cards can be armed (blackout is not in the starter kit)');
await A.click('[data-act=trapGo]'); await solveAs(A, 60000); await waitSheet(A, /Trap is set/);
const linkA = (await A.textContent('.link')).trim(), hashA = new URL(linkA).hash;
ok(/^https:\/\/rank-game\.com\/games\/minesweet#c=b\.[a-z0-9]{8}\.6\d{4}\.\d\.ta\.1\./.test(linkA) && /n=Sam/.test(linkA), 'challenge link has board id, time, card and name: ' + linkA);
const minesA = await A.evaluate(() => [...R.G.board.mines].join(''));
const spent = await A.evaluate(() => ({ cd: S.cd.timeattack, has: MS.cardsOf(S).includes('timeattack') })); ok(spent.cd === 1, 'Time Attack went on cooldown after use');
// tampering
const bad = await open({ viewport: { width: 500, height: 800 } }, hashA.replace(/\.6\d{4}\./, '.1000.')); ok(/damaged/.test(await bad.textContent('#toast')) && (await bad.evaluate(() => !R)), 'an edited link is rejected, game still works');
await bad.ctx.close();
// the friend opens it (a phone, no account)
const B = await open({ ...devices['iPhone 13'] }, hashA);
ok(/Sam challenges you/.test(await sheetText(B)) && /1:0\d\.\d/.test(await sheetText(B)) && /Time Attack/.test(await sheetText(B)), 'friend sees who challenged, their time and the attached card before starting');
await B.screenshot({ path: `${OUT}/ms-accept.png` });
await B.click('[data-act=accept][data-shield="0"]');
const minesB = await B.evaluate(() => [...R.G.board.mines].join(''));
ok(minesA === minesB, 'friend gets the identical mine layout');
ok(await B.evaluate(() => R.penalty === 5000 && R.card === 'timeattack' && /\+5s/.test(document.querySelector('#pen').textContent)), 'Time Attack adds exactly 5s, visibly');
await solveAs(B, 40000); await waitSheet(B, /Revenge is sweet/);
txt = await sheetText(B); ok(/YOU BEAT YOUR FRIEND/.test(txt) && /Sam/.test(txt) && /incl\. \+5s/.test(txt), '40s + 5s penalty beats 60s: "YOU BEAT YOUR FRIEND!" with the penalty shown');
ok(await B.evaluate(() => !!S.ach.revenge_taken && !!S.ach.untouchable), 'Revenge Taken + Untouchable unlocked');
await B.screenshot({ path: `${OUT}/ms-beat.png` });
// revenge
await B.click('[data-act=revenge]'); ok(/Revenge round 2 against Sam/.test(await sheetText(B)), 'REVENGE opens a new challenge for the original player');
await B.fill('#nm', 'Bea'); await B.click('[data-act=trapGo]');
const seedB = await B.evaluate(() => R.seed); ok(await B.evaluate(() => R.round === 2 && R.mode === 'make') && seedB !== new URL(linkA).hash.split('.')[1], 'revenge is a new board, round 2');
await solveAs(B, 30000); await waitSheet(B, /Trap is set/);
const linkB = (await B.textContent('.link')).trim(); ok(/\.2\./.test(linkB) && /n=Bea/.test(linkB) && /to=Sam/.test(linkB), 'revenge link carries round 2, Bea, and the target Sam: ' + linkB);
await B.ctx.close();
// the original player receives the revenge
const A2 = await open({ viewport: { width: 1000, height: 800 } }, new URL(linkB).hash);
ok(/Bea challenges you/.test(await sheetText(A2)) && /Revenge · round 2/.test(await sheetText(A2)), 'Sam receives Bea\'s revenge as round 2');
await A2.click('[data-act=accept]'); await solveAs(A2, 45000); await waitSheet(A2, /So close/);
ok(/slower/.test(await sheetText(A2)) && !/BEAT YOUR FRIEND/.test(await sheetText(A2)), 'a slower run shows the friendly "one more go" message');
ok(await A2.evaluate(() => S.ach.revenge_taken === undefined), 'no Revenge Taken for losing the comparison');
await A2.screenshot({ path: `${OUT}/ms-slower.png` });
// tie rule + mistakes as tiebreak, checked on the real objects
ok(await A2.evaluate(() => MS.compare({ ms: 30000, mis: 0 }, { ms: 30000, mis: 0 }) === 0 && MS.compare({ ms: 30000, mis: 1 }, { ms: 30000, mis: 0 }) === 1), 'tie and mistake tiebreak');
await A2.ctx.close();

// ---------- sabotage effects + shield + reveal ----------
const mkLink = (q, card) => q.evaluate((card) => '#' + MS.encodeChallenge({ d: 'i', seed: 'sabo2026', ms: 70000, mis: 0, card, round: 1, name: 'Ana' }), card);
const S1 = await mk(); await S1.evaluate(() => { S.cards = ['shield', 'reveal']; save(); });
for (const card of ['blackout', 'confusion', 'trouble']) {
  const h = await mkLink(S1, card); await S1.goto(BASE + h); await S1.reload(); await S1.waitForTimeout(250);
  ok(new RegExp(`Sabotage attached: ${{ blackout: 'Blackout', confusion: 'Confusion', trouble: 'Double Trouble' }[card]}`).test(await sheetText(S1)), `${card}: shown before the game starts`);
  await S1.click('[data-act=accept][data-shield="0"]');
  const m0 = await S1.evaluate(() => [...R.G.board.mines].join(''));
  let seen = null;
  seen = await S1.evaluate((card) => {
    let hit = null;
    for (const s of MS.solve(R.G.board).steps) {
      if (R.over) break;
      if (s.t === 'o' && R.G.st[s.i] === 0) act(s.i, 'dig'); else if (s.t === 'f' && R.G.st[s.i] === 0) act(s.i, 'flag');
      if (card === 'blackout' && document.querySelector('#bwrap').classList.contains('dark')) { hit = { dark: 1, at: MS.progress(R.G), board: [...R.G.board.mines].join('') }; break; }
      if (card === 'confusion' && document.querySelector('#board').classList.contains('conf')) { hit = { conf: 1, at: MS.progress(R.G), text: [...document.querySelectorAll('#board .c.o[data-n]')].slice(0, 1).map((e) => getComputedStyle(e, '::after').content)[0] }; break; }
      if (card === 'trouble' && R.locked) { hit = { mini: !!document.querySelector('#mini'), at: MS.progress(R.G) }; break; }
    }
    return hit;
  }, card);
  ok(seen && seen.at >= { blackout: .3, confusion: .4, trouble: .5 }[card] && seen.at < .75, `${card} triggers at its planned point (${seen && seen.at.toFixed(2)})`);
  if (card === 'blackout') { ok(seen.board === m0, 'blackout leaves the mine layout untouched'); await S1.screenshot({ path: `${OUT}/ms-blackout.png` }); }
  if (card === 'confusion') { ok(seen.text === '"?"', 'confusion hides numbers behind ?'); await S1.screenshot({ path: `${OUT}/ms-confusion.png` }); }
  if (card === 'trouble') {
    await S1.screenshot({ path: `${OUT}/ms-trouble.png` });
    const steps = await S1.evaluate(() => MS.solve(MS.fairBoard({ w: 5, h: 5, m: 3, key: 't', name: 'Side board', tries: 200 }, R.seed + 'dt0')).steps);
    for (const s of steps) if (s.t === 'o') await S1.locator('#mini .c').nth(s.i).click();
    await S1.waitForTimeout(800); ok(await S1.evaluate(() => !R.locked && document.querySelector('#sheet').hidden), 'clearing the side board (by real clicks) returns to the main board');
    ok(await S1.evaluate((m) => [...R.G.board.mines].join('') === m, m0), 'main board unchanged after Double Trouble');
    await solveAs(S1, 50000); await waitSheet(S1, /Revenge|So close/);
  }
  if (card === 'blackout') await S1.waitForTimeout(4200); // lets the blackout lapse
  if (card === 'blackout') ok(await S1.evaluate(() => !document.querySelector('#bwrap').classList.contains('dark')), 'blackout ends by itself after 4s');
}
// shield + reveal
await S1.evaluate(() => { S.cards = ['shield', 'reveal']; S.ach = {}; save(); });
const h2 = await mkLink(S1, 'blackout'); await S1.goto(BASE + h2); await S1.reload(); await S1.waitForTimeout(250);
ok(/Use Shield/.test(await sheetText(S1)), 'a player holding a Shield is offered it');
await S1.click('[data-act=accept][data-shield="1"]');
ok(await S1.evaluate(() => R.card === null && R.penalty === 0 && !MS.cardsOf(S).includes('shield') && R.usedCards === 1), 'Shield blocks the sabotage and is used up');
const blocked = await S1.evaluate(() => { for (const s of MS.solve(R.G.board).steps) { if (R.over) break; if (s.t === 'o' && R.G.st[s.i] === 0) { act(s.i, 'dig'); if (MS.progress(R.G) > .8) break; } } return document.querySelector('#bwrap').classList.contains('dark'); });
ok(!blocked, 'no blackout ever fires once shielded');
await S1.click('#revealB'); ok(await S1.evaluate(() => R.penalty === 3000 && !MS.cardsOf(S).includes('reveal')), 'Reveal opens a safe tile for +3s and is spent');
await solveAs(S1, 50000); await waitSheet(S1, /Revenge|So close/); ok(await S1.evaluate(() => !S.ach.untouchable), 'using cards forfeits Untouchable');
ok(S1.errors.length === 0, 'no page errors across sabotage tests (' + S1.errors.join(' | ') + ')');
await S1.ctx.close();

// ---------- phone: touch tap, long-press flag, sizing, orientation ----------
const phone = await open({ ...devices['iPhone 13'] }); await closeHow(phone);
const noHScroll = (q) => q.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1);
ok(await noHScroll(phone), 'phone home has no horizontal scroll');
await phone.click('[data-act=classic][data-lv=beginner]');
let g = await phone.evaluate(() => { const r = document.querySelector('#board .c').getBoundingClientRect(), w = document.querySelector('#bwrap'); return { s: r.width, sw: w.scrollWidth, cw: w.clientWidth }; });
ok(g.s >= 30 && g.sw <= g.cw + 1, `beginner fits a phone with big tiles (${g.s}px, no scroll)`);
await phone.screenshot({ path: `${OUT}/ms-phone-beginner.png` });
const tapAt = async (q, i) => { const b = await q.locator('#board .c').nth(i).boundingBox(); await q.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
await tapAt(phone, 40); ok(await phone.evaluate(() => R.G.status === 'play' && R.G.open > 1), 'tap digs and opens an area');
const cdp = await phone.ctx.newCDPSession(phone);
const longPress = async (q, i, ms = 520) => { const b = await q.locator('#board .c').nth(i).boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await q.waitForTimeout(ms); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
const hid = await phone.evaluate(() => [...R.G.st].findIndex((s, i) => s === 0 && !R.G.board.mines[i]));
const hidM = await phone.evaluate(() => [...R.G.st].findIndex((s, i) => s === 0 && R.G.board.mines[i]));
await longPress(phone, hidM); ok(await phone.evaluate((i) => R.G.st[i] === 2 && R.G.mistakes === 0, hidM), 'long-press flags (and a correct flag is no mistake)');
ok(await phone.evaluate((i) => R.G.status === 'play', hidM), 'long-press did not also dig');
await longPress(phone, hid, 150); ok(await phone.evaluate((i) => R.G.st[i] === 1, hid), 'a quick tap (150ms) digs, not flags');
await phone.click('[data-tool=flag]'); const hid2 = await phone.evaluate(() => [...R.G.st].findIndex((s, i) => s === 0 && !R.G.board.mines[i]));
await tapAt(phone, hid2); ok(await phone.evaluate((i) => R.G.st[i] === 2 && R.G.mistakes === 1, hid2), 'Flag mode: tap flags; a flag on a safe tile counts as 1 mistake');
await tapAt(phone, hid2); ok(await phone.evaluate((i) => R.G.st[i] === 0, hid2), 'Flag mode: tapping a flag removes it');
const hid3 = await phone.evaluate(() => [...R.G.st].findIndex((s, i) => s === 0 && !R.G.board.mines[i]));
await longPress(phone, hid3); ok(await phone.evaluate((i) => R.G.st[i] === 1, hid3), 'Flag mode: long-press digs instead');
await phone.click('[data-tool=dig]');
await phone.evaluate(() => home()); await phone.click('[data-act=classic][data-lv=expert]');
g = await phone.evaluate(() => { const r = document.querySelector('#board .c').getBoundingClientRect(), w = document.querySelector('#bwrap'); return { s: r.width, sw: w.scrollWidth, cw: w.clientWidth, sh: w.scrollHeight, ch: w.clientHeight }; });
ok(g.s >= 30 && g.sw > g.cw && await noHScroll(phone), `expert on a phone: tiles stay ${g.s}px and the board scrolls inside its frame, not the page`);
const sc = await phone.evaluate(async () => { const w = document.querySelector('#bwrap'); w.scrollLeft = 200; await new Promise((r) => setTimeout(r, 50)); return w.scrollLeft; }); ok(sc > 100, 'expert board pans horizontally');
await phone.screenshot({ path: `${OUT}/ms-phone-expert.png` });
await phone.setViewportSize({ width: 844, height: 390 }); await phone.waitForTimeout(300);
g = await phone.evaluate(() => { const r = document.querySelector('#board .c').getBoundingClientRect(), w = document.querySelector('#bwrap').getBoundingClientRect(); return { s: r.width, wh: w.height, bottom: document.querySelector('.tools').getBoundingClientRect().bottom }; });
ok(g.s >= 28 && g.bottom <= 391 && await noHScroll(phone), `landscape phone: tools stay on screen (tile ${g.s}px, board ${Math.round(g.wh)}px tall)`);
await phone.screenshot({ path: `${OUT}/ms-phone-landscape.png` });
await phone.setViewportSize({ width: 320, height: 568 }); await phone.waitForTimeout(300); ok(await noHScroll(phone), 'small phone (320px): no horizontal page scroll');
await phone.screenshot({ path: `${OUT}/ms-phone-small.png` });
ok(phone.errors.length === 0, 'no page errors on phone (' + phone.errors.join(' | ') + ')');
await phone.ctx.close();
const tab = await open({ ...devices['iPad (gen 7) landscape'] }); await closeHow(tab); await tab.click('[data-act=classic][data-lv=expert]');
g = await tab.evaluate(() => { const w = document.querySelector('#bwrap'); return { sw: w.scrollWidth, cw: w.clientWidth, s: document.querySelector('#board .c').getBoundingClientRect().width }; });
ok(g.sw <= g.cw + 1 && g.s >= 30, `tablet: expert fits without scrolling (${g.s}px tiles)`); await tab.screenshot({ path: `${OUT}/ms-tablet.png` }); await tab.ctx.close();

// ---------- guest anywhere: nothing needed, nothing blocked ----------
ok(writes.length === 0, `no Firestore writes at all while playing as a guest (${writes.length})`);
await browser.close(); server.close();
console.log(fails.length ? `\n${fails.length} FAILED:\n- ${fails.join('\n- ')}` : '\nAll browser checks passed');
process.exit(fails.length ? 1 : 0);

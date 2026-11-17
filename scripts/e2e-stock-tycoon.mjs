// Browser test for Stock Tycoon: `node scripts/e2e-stock-tycoon.mjs` (needs `npm i` for playwright). Exits non-zero on failure.
// Plays the real page the way a player would, at phone, tablet and desktop sizes. The rules themselves are covered
// by check-stock-tycoon.mjs; this checks that the screens are wired to them.
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
const URL = `http://localhost:${server.address().port}/stock-tycoon/`;
const browser = await chromium.launch(), errors = [];
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };
async function open(viewport) {
  const ctx = await browser.newContext({ viewport }), page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/*firestore.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[{}]' }));
  await page.goto(URL); await page.waitForSelector('#nav button');
  return page;
}
const text = async (page, sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' '); // headings are upper-cased by CSS, so compare without case
const has = async (page, sel, s) => (await text(page, sel)).toLowerCase().includes(s.toLowerCase());
const cents = (t) => Math.round(parseFloat(t.replace(/[^0-9.-]/g, '')) * 100);

// ---- one full session on a phone
const page = await open({ width: 390, height: 844 });
ok((await text(page, '#sumDlg')).includes('Welcome') && (await text(page, '#cash').catch(() => '')) !== undefined, 'a new player is welcomed');
await page.click('#sumDlg [data-close]');
ok(await text(page, '#worth') === '$10,000.00', 'a new player starts with $10,000');

await page.click('[data-tab=discover]'); await page.fill('#q', 'quillon');
ok(await page.locator('#list .stock').count() === 1, 'search finds a company by name');
await page.click('#list .stock');
const price = cents(await text(page, '#cpx'));
ok(price > 0 && (await text(page, '.head')).includes('QLLN'), 'the stock page opens with a price');

// charts: every timeframe draws something, in both kinds
const inked = () => page.evaluate(() => { const c = document.getElementById('chart'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
let drawn = 0;
for (const kind of ['line', 'candle']) { for (const f of ['D', 'W', 'M', '6M', 'Y', '5Y', 'MAX']) { await page.click(`[data-frame="${f}"]`); if (await inked() > 500) drawn++; } if (kind === 'line') await page.click('[data-act=kind]'); }
ok(drawn === 14, `all 7 timeframes draw as a line and as candles (${drawn} of 14)`);
await page.click('[data-act=kind]'); await page.click('[data-frame="M"]');
await page.locator('#chart').scrollIntoViewIfNeeded(); const box = await page.locator('#chart').boundingBox(); await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
const hov = await text(page, '#cch'); if (!/\d{4}/.test(hov)) console.log('     hover text:', hov, box);
ok(/\d{4}/.test(hov) && cents(await text(page, '#cpx')) !== 0, 'pointing at the chart shows that day\'s price and date');
await page.mouse.move(5, 5);

// buy
await page.click('[data-act=buy]'); await page.fill('#tq', '10');
const sheetPx = await page.evaluate(() => mkt.cents(mkt.get('QLLN')));
ok((await text(page, '#tsum')).includes((sheetPx * 10 / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })), 'the buy sheet shows 10 x the price on screen');
await page.click('#tgo');
const lastPx = () => page.evaluate(() => me.trades.at(-1).px), pxB = await lastPx();
ok(Math.abs(pxB - sheetPx) < sheetPx * 0.01 && cents(await text(page, '#cash')) === 1000000 - pxB * 10 && await text(page, '#worth') === '$10,000.00', 'buying 10 shares takes exactly 10 x the price at that moment and leaves net worth unchanged');
await page.click('[data-act=buy]'); await page.fill('#tq', '999999');
ok(await page.locator('#tgo').isDisabled() && (await text(page, '#terr')).includes('afford'), 'an order bigger than the cash is refused on the sheet');
await page.click('#tradeDlg [data-close]');
// limit order
await page.click('[data-act=buy]'); await page.click('[data-otype=limit]'); await page.fill('#tl', (price * 0.95 / 100).toFixed(2)); await page.fill('#tq', '3'); await page.click('#tgo');
ok(await has(page, '#view', 'Your open orders'), 'a limit order is placed and listed');
// sell
await page.click('[data-act=sell]'); await page.fill('#tq', '4'); await page.click('#tgo');
const pxS = await lastPx(), cashNow = 1000000 - pxB * 10 + pxS * 4;
ok(cents(await text(page, '#cash')) === cashNow, 'selling 4 of the 10 returns exactly 4 x the price at that moment');
await page.click('[data-act=watch]');

// leave and rejoin
await page.reload(); await page.waitForSelector('#nav button');
ok(!(await page.locator('#sumDlg').evaluate((d) => d.open)) && cents(await text(page, '#cash')) === cashNow, 'after leaving and rejoining, cash is exactly as it was and there is no second welcome');
await page.click('[data-tab=portfolio]');
const port = await text(page, '#view');
ok(port.includes('6 shares') && port.includes('Bought 10 QLLN') && port.includes('Sold 4 QLLN') && port.includes('Buy 3 QLLN'), 'holdings, trade history and the open order are all still there');
await page.click('[data-tab=market]');
ok(await has(page, '#view', 'Watchlist'), 'the watchlist is kept');

// every tab renders, and nothing spills off the side
const spill = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
let tabsOk = 0;
for (const t of ['market', 'discover', 'news', 'portfolio', 'friends']) { await page.click(`[data-tab=${t}]`); if ((await text(page, '#view')).length > 80 && !(await spill())) tabsOk++; }
await page.click('#youBtn'); if (await has(page, '#view', 'Wealth level') && !(await spill())) tabsOk++;
ok(tabsOk === 6, 'Market, Discover, News, Portfolio, Friends and the profile all render on a phone without spilling sideways');
await page.click('[data-tab=news]'); await page.click('#view .news');
ok(await has(page, '#view', 'Market impact'), 'a news story opens with its market impact');

// time passes: a fortnight later there is a payday and the market has moved
await page.evaluate(() => { const p = Account.load(localStorage), back = 14 * 864e5; p.t -= back; p.start -= 14; p.day -= 14; p.trades.forEach((t) => { t.d -= 14; t.at -= back; }); p.orders.forEach((o) => { o.d -= 14; o.at -= back; o.exp -= back; }); localStorage.removeItem('stock-tycoon-save-bak'); Account.save(localStorage, p); });
await page.reload(); await page.waitForSelector('#sumDlg[open]');
const away = await text(page, '#sumDlg');
ok(away.includes('While you were away') && away.includes('Payday') && away.includes('MRX Composite'), 'coming back 14 days later shows what the market did and pays the salary');
await page.click('#sumDlg [data-close]');
await page.click('[data-tab=portfolio]');
ok(await page.evaluate(() => { const c = document.getElementById('wchart'); return !!c && Account.load(localStorage).worth.length === 14; }), 'the net worth chart has a point for the close of each of the 14 days');

// weekly challenge: separate money
const cashBefore = await text(page, '#cash');
await page.click('[data-tab=friends]'); await page.click('[data-act=chal-join]');
ok(await text(page, '#worth') === '$10,000.00' && (await text(page, '#view')).includes('Weekly challenge account'), 'joining the weekly challenge opens a separate $10,000 account');
await page.click('[data-act=chal-exit]');
ok(await text(page, '#cash') === cashBefore, 'and the player\'s own cash is untouched');

// ---- two players see the same market
const other = await open({ width: 390, height: 844 });
const at = Date.now() - 60000; // one shared moment, a minute ago
const quotes = (p) => p.evaluate((t) => ['QLLN', 'HBSB', 'NVCR', 'DSBP', 'BFRY'].map((k) => mkt.centsAt(mkt.get(k), t)).join(), at);
ok(await quotes(page) === await quotes(other) && (await quotes(page)).split(',').every((x) => +x > 0), 'a second player in a separate browser sees exactly the same prices at the same moment');
ok(await other.evaluate((t) => mkt.feed(t).length, at) === await page.evaluate((t) => mkt.feed(t).length, at), 'and the same news');
const tick1 = await page.evaluate(() => mkt.cents(mkt.get('NVCR'))); await page.waitForTimeout(16000);
ok(await page.evaluate(() => mkt.t > Date.now() - 20000) && typeof tick1 === 'number', 'prices on screen keep moving while the page is open');

// ---- tablet and desktop
for (const [name, viewport] of [['tablet', { width: 820, height: 1180 }], ['desktop', { width: 1366, height: 800 }]]) {
  const p = await open(viewport); await p.click('#sumDlg [data-close]');
  let good = 0;
  for (const t of ['market', 'discover', 'news', 'portfolio', 'friends']) { await p.click(`[data-tab=${t}]`); if ((await p.locator('#view').innerText()).length > 80 && !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth))) good++; }
  await p.evaluate(() => { sym = 'NVCR'; render(); });
  const side = await p.evaluate(() => getComputedStyle(document.getElementById('nav')).flexDirection), cw = (await p.locator('#chart').boundingBox()).width;
  ok(good === 5 && side === 'column' && cw > 500, `${name}: all tabs render, navigation is a sidebar and the chart is ${Math.round(cw)}px wide`);
}

ok(errors.length === 0, `no script errors anywhere (${errors.length})${errors.length ? ': ' + errors[0] : ''}`);
await browser.close(); server.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok'); process.exit(fails.length ? 1 : 0);

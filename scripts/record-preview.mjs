// Records a short gameplay clip for each game: games/<slug>/preview.webm + preview.jpg (poster).
//   node scripts/record-preview.mjs            → every game missing preview.webm
//   node scripts/record-preview.mjs snake ...  → just these (re-records)
// Needs `playwright` (npm i --no-save playwright && npx playwright install chromium ffmpeg).
// A bot in BOTS plays the game; anything else gets the generic random-input bot.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Playwright's own ffmpeg build (VP8/webm only) unless one is given or on PATH
const pwCache = process.platform === 'darwin' ? `${os.homedir()}/Library/Caches/ms-playwright` : `${os.homedir()}/.cache/ms-playwright`;
const pwFfmpeg = fs.existsSync(pwCache) && fs.readdirSync(pwCache).filter((d) => d.startsWith('ffmpeg-'))
  .flatMap((d) => fs.readdirSync(`${pwCache}/${d}`).filter((f) => f.startsWith('ffmpeg-')).map((f) => `${pwCache}/${d}/${f}`))[0];
const FFMPEG = process.env.FFMPEG || pwFfmpeg || 'ffmpeg';

// skip: seconds of play before the clip starts · len: clip length · poster: seconds into the clip for the jpg
const GENERIC = { skip: 6, len: 7, poster: 3, async play(page, until) {
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'KeyD', 'KeyS', 'KeyA', 'KeyW'];
  await page.keyboard.press('Enter');
  await page.mouse.click(480, 300);
  await page.keyboard.press('Space');
  while (Date.now() < until) {
    const k = keys[Math.random() * keys.length | 0];
    await page.keyboard.down(k);
    await page.mouse.click(200 + Math.random() * 560, 120 + Math.random() * 340).catch(() => {});
    await page.waitForTimeout(250 + Math.random() * 300);
    await page.keyboard.up(k);
    if (Math.random() < 0.3) await page.keyboard.press('Space');
  }
} };

const BOTS = {
  snake: { skip: 14, len: 6, poster: 3, crop: { x: 125, y: 45, width: 711, height: 400 }, async play(page) {
    await page.keyboard.press('ArrowRight');
    await page.evaluate(() => setInterval(() => { // greedy: head for the food, never into the tail
      if (!alive) return;
      const N = 20, [hx, hy] = snake[0];
      const wd = (a, b) => Math.min(Math.abs(a - b), N - Math.abs(a - b));
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter((d) => d[0] !== -dir[0] || d[1] !== -dir[1]).map((d) => {
        const nx = (hx + d[0] + N) % N, ny = (hy + d[1] + N) % N;
        const hit = snake.slice(0, -1).some(([x, y]) => x === nx && y === ny);
        return { d, s: hit ? 1e9 : wd(nx, food[0]) + wd(ny, food[1]) };
      }).sort((a, b) => a.s - b.s);
      turn(opts[0].d);
    }, 40));
  } },
  'stack-up': { skip: 12, len: 7, poster: 3.5, async play(page) {
    await page.keyboard.press('Space');
    await page.evaluate(() => { // mostly perfect drops, every 5th one a bit off
      let n = 0;
      setInterval(() => {
        if (state !== 'play' || !cur) return;
        const top = stack[stack.length - 1], off = n % 5 === 4 ? 10 : 0;
        if (Math.abs(cur.x - (top.x + off * cur.dir)) < 3) { n++; act(); }
      }, 8);
    });
  } },
  'neon-swarm': { skip: 19, len: 7, poster: 6.5, async play(page, until) { // circle the arena, dash now and then; clip catches the 25s SWARM
    await page.keyboard.press('Enter');
    for (let i = 0; Date.now() < until; i++) {
      const k = ['KeyD', 'KeyS', 'KeyA', 'KeyW'][i % 4];
      await page.keyboard.down(k);
      await page.waitForTimeout(450);
      if (i % 5 === 4) await page.keyboard.press('Space');
      await page.keyboard.up(k);
    }
  } },
  'demolition-rush': { skip: 2, len: 7, poster: 0.5, async play(page) {
    await page.click('#playBtn');
    await page.evaluate(() => setInterval(() => { // smash the leftmost columns, take the first upgrade card
      if (!document.getElementById('pick').hidden) return pickDelay <= 0 && document.getElementById('cards').children[0]?.click();
      if (state !== 'play') return;
      const cols = grid.map((col, c) => [col, c]).filter(([col]) => col.length);
      if (!cols.length) return;
      const [col, c] = cols[Math.floor(Math.random() * Math.min(3, cols.length))];
      const b = col.find((x) => !x.person);
      if (!b) return;
      const [x, y] = blockCenter(c, b);
      px = x; py = y; mouse = true; userHit(x, y);
    }, 75));
  } },
};

const ROOT = path.resolve(import.meta.dirname, '..');
const all = fs.readdirSync(`${ROOT}/games`).filter((s) => fs.existsSync(`${ROOT}/games/${s}/index.html`));
const slugs = process.argv.length > 2 ? process.argv.slice(2) : all.filter((s) => !fs.existsSync(`${ROOT}/games/${s}/preview.webm`));
if (!slugs.length) { console.log('All games have previews.'); process.exit(0); }

// Serve the repo like GitHub Pages does, so games can load ../leaderboard.js etc.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const BASE = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
for (const slug of slugs) {
  const bot = BOTS[slug] || GENERIC, out = `${ROOT}/games/${slug}`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-'));
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, recordVideo: { dir: tmp, size: { width: 960, height: 540 } } });
  const page = await ctx.newPage();
  const videoStart = Date.now();
  await page.goto(`${BASE}/games/${slug}/`);
  await page.waitForTimeout(800);
  const lead = (Date.now() - videoStart) / 1000, end = Date.now() + (bot.skip + bot.len + 0.5) * 1000;
  const playing = bot.play(page, end).catch(() => {}); // a game ending mid-bot is fine
  await page.waitForTimeout((bot.skip + bot.poster) * 1000);
  await page.screenshot({ path: `${out}/preview.jpg`, type: 'jpeg', quality: 80, clip: bot.crop });
  await page.waitForTimeout(Math.max(0, end - Date.now()));
  await playing;
  await ctx.close();
  const crop = bot.crop ? `crop=${bot.crop.width}:${bot.crop.height}:${bot.crop.x}:${bot.crop.y},` : '';
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-ss', String(lead + bot.skip), '-i', `${tmp}/${fs.readdirSync(tmp)[0]}`,
    '-t', String(bot.len), '-an', '-vf', `${crop}scale=640:360`, '-c:v', 'libvpx', '-b:v', '700k', '-crf', '10', `${out}/preview.webm`]);
  fs.rmSync(tmp, { recursive: true });
  console.log(`${slug}: preview.webm ${(fs.statSync(`${out}/preview.webm`).size / 1024) | 0} KB${BOTS[slug] ? '' : ' (generic bot)'}`);
}
await browser.close();
server.close();

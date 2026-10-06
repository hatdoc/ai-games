// Finds game folders (games/<slug>/index.html) not yet listed in the blog's
// data/games.json, asks Gemini for metadata, and commits the updated list to the
// blog repo. Re-running is safe: already-published slugs are skipped.
import fs from 'node:fs';

const { GEMINI_API_KEY, BLOG_REPO_TOKEN, BLOG_REPO, PAGES_URL } = process.env;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const BLOG_FILE = `https://api.github.com/repos/${BLOG_REPO}/contents/data/games.json`;
const gh = { Authorization: `Bearer ${BLOG_REPO_TOKEN}`, Accept: 'application/vnd.github+json' };

const file = await fetch(BLOG_FILE, { headers: gh }).then((r) => r.json());
if (!file.sha) throw new Error(`Can't read ${BLOG_REPO}/data/games.json: ${JSON.stringify(file)}`);
const games = JSON.parse(Buffer.from(file.content, 'base64').toString());

const known = new Set(games.map((g) => g.slug));
const newSlugs = fs
  .readdirSync('games')
  .filter((slug) => fs.existsSync(`games/${slug}/index.html`) && !known.has(slug));

// Gameplay clips (scripts/record-preview.mjs) are served from Pages next to each game
const media = (slug) => fs.existsSync(`games/${slug}/preview.webm`)
  ? { preview: new URL(`games/${slug}/preview.webm`, PAGES_URL).href, thumbnail: new URL(`games/${slug}/preview.jpg`, PAGES_URL).href }
  : { thumbnail: null };
const backfilled = games.filter((g) => !g.preview && media(g.slug).preview).map((g) => (Object.assign(g, media(g.slug)), g.slug));

if (newSlugs.length === 0 && backfilled.length === 0) {
  console.log('No new games or clips to publish.');
  process.exit(0);
}

async function describe(slug, html) {
  const prompt = `You write listings for a personal arcade of small browser games built with AI.
Read this game's source and return JSON with:
- title: a catchy name (max 5 words)
- description: 2-4 lively sentences — what the game is, how to play (controls), what makes it fun. No markdown.
- tags: 3-5 lowercase genre/mechanic tags (e.g. "arcade", "puzzle", "keyboard")
- emoji: one emoji that fits the game

Folder name: ${slug}
Source:
${html.slice(0, 40000)}`;

  const call = () => fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              description: { type: 'STRING' },
              tags: { type: 'ARRAY', items: { type: 'STRING' } },
              emoji: { type: 'STRING' },
            },
            required: ['title', 'description', 'tags', 'emoji'],
          },
        },
      }),
    }
  );
  // Gemini returns 429/503 when busy; retry with backoff (up to ~5 min total).
  let res = await call();
  for (let i = 1; i <= 6 && [429, 500, 503].includes(res.status); i++) {
    console.log(`Gemini busy (${res.status}), retrying in ${i * 15}s…`);
    await new Promise((r) => setTimeout(r, i * 15000));
    res = await call();
  }
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error for ${slug}: ${JSON.stringify(data)}`);
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

for (const slug of newSlugs) {
  // games/<slug>/meta.json (title, description, tags, emoji) wins; Gemini only writes listings for games without one
  const own = `games/${slug}/meta.json`;
  const meta = fs.existsSync(own) ? JSON.parse(fs.readFileSync(own, 'utf8')) : await describe(slug, fs.readFileSync(`games/${slug}/index.html`, 'utf8'));
  games.unshift({
    slug,
    ...meta,
    ...media(slug),
    gameUrl: new URL(`games/${slug}/`, PAGES_URL).href,
    createdAt: new Date().toISOString(),
    featured: false,
  });
  console.log(`+ ${slug}: ${meta.emoji} ${meta.title}`);
}

const res = await fetch(BLOG_FILE, {
  method: 'PUT',
  headers: gh,
  body: JSON.stringify({
    message: `games: publish ${[...newSlugs, ...backfilled.map((s) => `${s} clip`)].join(', ')}`,
    content: Buffer.from(JSON.stringify(games, null, 2) + '\n').toString('base64'),
    sha: file.sha,
  }),
});
if (!res.ok) throw new Error(`Commit to blog failed: ${res.status} ${await res.text()}`);
console.log(`Committed ${newSlugs.length} game(s), ${backfilled.length} clip(s) to ${BLOG_REPO}.`);

// Tell Bing/Yahoo/DuckDuckGo/Yandex about the new pages (IndexNow; Google reads the sitemap).
// Waits for Cloudflare to rebuild the blog first, so the URLs exist when crawlers come.
// The key is public by design: it's served at https://rank-game.com/<key>.txt.
const SITE = 'https://rank-game.com', INDEXNOW_KEY = '682daa34c992ff6e9dbecfe71623a490';
const urls = newSlugs.map((s) => `${SITE}/games/${s}`);
if (urls.length) {
  let live = false;
  for (let i = 0; i < 30 && !live; i++) { // up to ~10 minutes
    await new Promise((r) => setTimeout(r, 20000));
    live = (await fetch(urls[0], { method: 'HEAD' }).catch(() => ({}))).status === 200;
  }
  if (!live) console.log(`IndexNow skipped: ${urls[0]} not live yet.`);
  else {
    const ping = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: 'rank-game.com', key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: [...urls, `${SITE}/games`, SITE] }),
    });
    console.log(`IndexNow: ${ping.status} for ${urls.join(', ')}`); // a failed ping never fails the publish
  }
}

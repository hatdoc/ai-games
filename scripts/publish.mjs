// Finds game folders (games/<slug>/index.html) not yet listed in the blog's
// data/games.json, asks Gemini for metadata, and commits the updated list to the
// blog repo. Re-running is safe: already-published slugs are skipped.
import fs from 'node:fs';

const { GEMINI_API_KEY, BLOG_REPO_TOKEN, BLOG_REPO, PAGES_URL } = process.env;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BLOG_FILE = `https://api.github.com/repos/${BLOG_REPO}/contents/data/games.json`;
const gh = { Authorization: `Bearer ${BLOG_REPO_TOKEN}`, Accept: 'application/vnd.github+json' };

const file = await fetch(BLOG_FILE, { headers: gh }).then((r) => r.json());
if (!file.sha) throw new Error(`Can't read ${BLOG_REPO}/data/games.json: ${JSON.stringify(file)}`);
const games = JSON.parse(Buffer.from(file.content, 'base64').toString());

const known = new Set(games.map((g) => g.slug));
const newSlugs = fs
  .readdirSync('games')
  .filter((slug) => fs.existsSync(`games/${slug}/index.html`) && !known.has(slug));

if (newSlugs.length === 0) {
  console.log('No new games to publish.');
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

  const res = await fetch(
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
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error for ${slug}: ${JSON.stringify(data)}`);
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

for (const slug of newSlugs) {
  const meta = await describe(slug, fs.readFileSync(`games/${slug}/index.html`, 'utf8'));
  games.unshift({
    slug,
    ...meta,
    thumbnail: null,
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
    message: `games: publish ${newSlugs.join(', ')}`,
    content: Buffer.from(JSON.stringify(games, null, 2) + '\n').toString('base64'),
    sha: file.sha,
  }),
});
if (!res.ok) throw new Error(`Commit to blog failed: ${res.status} ${await res.text()}`);
console.log(`Committed ${newSlugs.length} game(s) to ${BLOG_REPO}.`);

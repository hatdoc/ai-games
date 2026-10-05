# ai-games

Browser games I build with AI. Each game is one folder: `games/<slug>/index.html`
(plus any assets next to it). The slug becomes the URL: `/games/<slug>` on the blog.

## Adding a game

```bash
mkdir games/space-dodge && cp ~/wherever/game.html games/space-dodge/index.html
git add . && git commit -m "add space-dodge" && git push
```

The **Publish games** Action then deploys to GitHub Pages and, for every slug not
yet on the blog, asks Gemini for a title/summary/tags/emoji and commits it to the
blog's `data/games.json`. Vercel redeploys the blog. Updating an existing game's
HTML just redeploys it; edit its text in the blog's `/admin`.

## One-time setup

1. Push this folder to a **public** repo named `ai-games`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Secrets and variables → Actions:
   - Secret `GEMINI_API_KEY`: from https://aistudio.google.com/apikey
   - Secret `BLOG_REPO_TOKEN`: fine-grained token, repo `personal-blog` only, **Contents: Read and write**
     (the same kind of token the blog uses; you can reuse it)
   - Variable `BLOG_REPO`: `your-username/personal-blog`
   - Variable `GEMINI_MODEL` (optional): defaults to `gemini-3.8-flash`
4. Actions → Publish games → **Run workflow** to publish what's already here.

## Sponsors (Demolition Rush)

`games/demolition-rush/sponsors.json` controls the rooftop sign on each building.
Add a sponsor (only with their permission) and push:

```json
{
  "contact": "https://personal-blog-phi-green.vercel.app/about",
  "sponsors": [
    { "name": "Jed's Cafe", "color": "#1f7a4d" }
  ]
}
```

Stage 1 shows the first sponsor, stage 2 the second, and so on (cycling). With no
sponsors, the sign shows "YOUR NAME HERE · Advertise". Signs are labeled SPONSORED because
paid ads must be disclosed (Korea's Labeling and Advertising Act, US FTC rules). `contact` can be a URL or an email address.

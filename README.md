# Web Arcade

A free, static browser-game arcade. Each game is a folder; a tiny build script turns the folders into a site with a homepage, one page per game, About / Contact / Privacy pages, a sitemap and `ads.txt`. No dependencies, so it deploys on Netlify's free tier.

## Add a game

1. Create `games/<your-game-name>/`
2. Put your game in it with an `index.html` as the entry point (any extra JS, images, sounds go in the same folder).
3. Add a `game.json` next to it:

```json
{
  "title": "My Game",
  "description": "One or two sentences about the game.",
  "category": "Puzzle",
  "icon": "🧩",
  "added": "2026-11-01",
  "instructions": ["How to play step one", "Step two"],
  "controls": ["Arrow keys to move", "Space to jump"]
}
```

4. Optional: add `thumbnail.png` (16:10, e.g. 640x400) in the folder to use it as the card image instead of the emoji.
5. `git add . && git commit -m "Add My Game" && git push`. Netlify rebuilds automatically.

Use relative paths for assets inside your game (`./sprite.png`, not `/sprite.png`).

## Edit site details

Open `site.config.json`:

- `name`, `tagline`: your arcade's name and slogan
- `url`: your live URL (use your Netlify URL now, your custom domain later). Used for the sitemap and canonical links.
- `email`, `owner`: shown on the Contact, About and Privacy pages
- `adsensePublisherId`: leave empty until AdSense approves you, then paste e.g. `ca-pub-1234567890123456`. The build adds the AdSense script to every page and generates `ads.txt`.
- `adSlotGameBottom` (optional): an ad unit ID from AdSense, shown under the game.

## Run locally

```
node build.mjs
npx serve dist
```

Open the address `serve` prints.

## Deploy: GitHub + Netlify

1. Create a new empty repo on github.com (for example `web-arcade`).
2. In this folder:
   ```
   git init
   git add .
   git commit -m "Initial arcade"
   git branch -M main
   git remote add origin https://github.com/<your-username>/web-arcade.git
   git push -u origin main
   ```
3. On netlify.com choose **Add new site > Import an existing project > GitHub**, pick the repo. Settings are read from `netlify.toml` (build command `node build.mjs`, publish directory `dist`). Click Deploy.
4. Copy your `https://<name>.netlify.app` URL into `site.config.json` as `url`, commit and push.

## Later: custom domain and AdSense

- Buy a domain and add it under Netlify > Domain management. Update `url` in `site.config.json`.
- Apply at adsense.google.com once you have around 10+ games or pages with real content. Paste your publisher ID into `site.config.json` after approval.
- Only publish games you made or have written permission to host.

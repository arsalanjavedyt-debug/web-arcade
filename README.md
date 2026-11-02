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

4. Optional: add `thumbnail.png` (16:10, e.g. 640×400) in the folder to use it as the card image instead of the emoji. See **Generating thumbnails** below.
5. `git add . && git commit -m "Add My Game" && git push`. Netlify rebuilds automatically.

Use relative paths for assets inside your game (`./sprite.png`, not `/sprite.png`).

## Edit site details

Open `site.config.json`:

| Field | Purpose |
|---|---|
| `name`, `tagline` | Your arcade's name and slogan |
| `url` | Your live URL (Netlify URL or custom domain). Used for the sitemap and canonical links. |
| `email`, `owner` | Shown on the Contact, About, and Privacy pages |
| `adsensePublisherId` | Leave empty until AdSense approves you, then paste e.g. `ca-pub-1234567890123456` |
| `adSlotGameBottom` | Optional AdSense ad unit ID shown under each game |
| `googleSiteVerification` | Paste your Google Search Console verification token here |
| `bingSiteVerification` | Paste your Bing Webmaster Tools verification token here |
| `twitterHandle` | Optional — your `@handle` for `twitter:site` tags |

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
3. On netlify.com choose **Add new site › Import an existing project › GitHub**, pick the repo. Settings are read from `netlify.toml` (build command `node build.mjs`, publish directory `dist`). Click Deploy.
4. Copy your `https://<name>.netlify.app` URL into `site.config.json` as `url`, commit and push.

## Games Included

1. **Neon Snake Deluxe** (`games/snake`): Cyberpunk retro arcade snake with powerups, combo multipliers, sound effects, and unlockable skins.
2. **Neon Slither Arena** (`games/slither`): Slither.io-inspired mass multiplayer survival game featuring 12 vibrant skins, glowing energy orbs, boost trails, minimap radar, smart AI snakes, and real-time Socket.IO multiplayer.

## Real-Time Multiplayer Server

Neon Slither Arena includes dual modes:
- **Single-Player Mode**: Runs client-side at 60 FPS with 20+ smart AI bots. Works anywhere (including static hosting on Netlify).
- **Multiplayer Online Mode**: Connects to the included Node.js + Express + Socket.IO server.

To run the multiplayer server locally:

```bash
# Start the full server on port 3000
npm start
# or
npm run multiplayer
```

Then open `http://localhost:3000` in multiple browser windows or phones connected to the same Wi-Fi network to play against real humans!

## Generating thumbnails

The build uses `games/<slug>/thumbnail.png` (640×400) as the card image and Open Graph image for each game. To auto-generate them with a headless browser:

```bash
# One-time setup (Playwright is only needed for thumbnails)
npm install -D playwright
npx playwright install chromium

# Generate thumbnails for all games that don't have one yet
node build.mjs            # build dist/ first
node scripts/make-thumbnails.mjs

# Rebuild and push with the new thumbnails
node build.mjs
git add games/
git commit -m "Add game thumbnails"
git push
```

The script skips any game that already has a `thumbnail.png`. Delete the file and re-run to regenerate it.

## After deploying — SEO checklist

Complete these steps **once** after your first live deploy:

### 1. Google Search Console
1. Go to [search.google.com/search-console](https://search.google.com/search-console) and click **Add property**.
2. Enter your full URL (e.g. `https://play-zone-arcade.netlify.app`).
3. Choose the **HTML tag** verification method. Copy the `content="..."` value from the meta tag shown.
4. Open `site.config.json` and paste it as `"googleSiteVerification": "<your-token>"`.
5. Run `node build.mjs`, commit, and push. Netlify will redeploy with the tag in every page.
6. Back in Search Console, click **Verify**.
7. Go to **Sitemaps** and submit: `https://play-zone-arcade.netlify.app/sitemap.xml`
8. Go to **URL Inspection** and request indexing for:
   - `https://play-zone-arcade.netlify.app/`
   - `https://play-zone-arcade.netlify.app/games/snake/`
   - (and each new game page you add)

### 2. Bing Webmaster Tools
1. Go to [bing.com/webmasters](https://www.bing.com/webmasters) and add your site.
2. Choose the **Meta tag** verification method. Copy the `content="..."` value.
3. Paste it as `"bingSiteVerification": "<your-token>"` in `site.config.json`.
4. Commit, push, verify in Bing, then submit the sitemap URL there too.

### 3. Social sharing preview
Test your Open Graph tags at [opengraph.xyz](https://www.opengraph.xyz) or [cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator). They should show your branded image and title.

## Later: custom domain and AdSense

- Buy a domain and add it under Netlify › Domain management. Update `url` in `site.config.json`.
- Apply at adsense.google.com once you have around 10+ games or pages with real content. Paste your publisher ID into `site.config.json` after approval.
- Only publish games you made or have written permission to host.

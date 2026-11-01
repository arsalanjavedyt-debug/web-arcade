// Static site generator for the arcade. No dependencies.
// Reads games/<slug>/game.json + index.html and writes everything to dist/.
import { readdir, readFile, writeFile, mkdir, cp, rm, access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const config = JSON.parse(await readFile(path.join(ROOT, 'site.config.json'), 'utf8'));
const SITE_URL = config.url.replace(/\/$/, '');

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const exists = async (p) => access(p).then(() => true, () => false);

// ---------- load games ----------
async function loadGames() {
  const dir = path.join(ROOT, 'games');
  if (!(await exists(dir))) return [];
  const games = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const folder = path.join(dir, entry.name);
    const metaPath = path.join(folder, 'game.json');
    if (!(await exists(metaPath)) || !(await exists(path.join(folder, 'index.html')))) {
      console.warn(`! skipping games/${entry.name} (needs game.json and index.html)`);
      continue;
    }
    const meta = JSON.parse(await readFile(metaPath, 'utf8'));
    games.push({
      slug: entry.name,
      title: meta.title || entry.name,
      description: meta.description || '',
      instructions: meta.instructions || [],
      controls: meta.controls || [],
      category: meta.category || 'Arcade',
      icon: meta.icon || '🎮',
      hasThumb: await exists(path.join(folder, 'thumbnail.png')),
      added: meta.added || '',
      folder,
    });
  }
  // newest first if dates are given, otherwise alphabetical
  games.sort((a, b) => (b.added || '').localeCompare(a.added || '') || a.title.localeCompare(b.title));
  return games;
}

// ---------- layout ----------
const adsenseTag = config.adsensePublisherId
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.adsensePublisherId)}" crossorigin="anonymous"></script>`
  : '';

function layout({ title, description, pathName, body }) {
  const fullTitle = pathName === '/' ? `${config.name} - ${config.tagline}` : `${title} | ${config.name}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE_URL}${pathName}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/style.css">
${adsenseTag}
</head>
<body>
<header class="site"><div class="wrap">
  <a class="brand" href="/">${esc(config.name)}</a>
  <nav><a href="/">Games</a><a href="/about/">About</a><a href="/contact/">Contact</a></nav>
</div></header>
<main><div class="wrap">
${body}
</div></main>
<footer class="site"><div class="wrap">
  <div><a href="/about/">About</a><a href="/privacy/">Privacy Policy</a><a href="/contact/">Contact</a></div>
  <div style="margin-top:8px">&copy; ${new Date().getFullYear()} ${esc(config.name)}</div>
</div></footer>
</body>
</html>`;
}

const adSlot = (id) =>
  config.adsensePublisherId && id
    ? `<div class="ad-slot"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(config.adsensePublisherId)}" data-ad-slot="${esc(id)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`
    : '';

function card(g) {
  const thumb = g.hasThumb
    ? `<img src="/play/${g.slug}/thumbnail.png" alt="${esc(g.title)}" loading="lazy">`
    : g.icon;
  return `<a class="card" href="/games/${g.slug}/">
  <div class="thumb">${thumb}</div>
  <div class="body"><h3>${esc(g.title)}</h3><p>${esc(g.description)}</p><span class="tag">${esc(g.category)}</span></div>
</a>`;
}

// ---------- pages ----------
function homePage(games) {
  const body = `
<section class="hero"><h1>${esc(config.name)}</h1><p>${esc(config.tagline)}</p></section>
<div class="grid">${games.map(card).join('\n')}</div>
${games.length === 0 ? '<p style="text-align:center;color:var(--muted)">No games yet. Add a folder inside <code>games/</code> and push.</p>' : ''}
<section class="block prose" style="margin:40px auto 0;text-align:center">
  <h2>Play free games online</h2>
  <p>${esc(config.name)} is a growing collection of free browser games that run on your phone, tablet or computer. There is nothing to install: pick a game, press play, and try to beat your best score.</p>
</section>`;
  return layout({ title: config.name, description: `${config.tagline} Play ${games.length} free games online.`, pathName: '/', body });
}

function gamePage(g, games) {
  const others = games.filter((x) => x.slug !== g.slug).slice(0, 4);
  const list = (arr) => `<ul>${arr.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  const body = `
<div class="crumbs"><a href="/">Games</a> &rsaquo; ${esc(g.title)}</div>
<h1 class="page">${esc(g.title)}</h1>
<p style="color:var(--muted);margin:0 0 16px">${esc(g.description)}</p>
<div class="player">
  <iframe id="game" src="/play/${g.slug}/" title="${esc(g.title)}" allow="fullscreen; gamepad" loading="eager"></iframe>
  <div class="bar"><span>${esc(g.category)} game</span><button class="btn" onclick="document.getElementById('game').requestFullscreen&&document.getElementById('game').requestFullscreen()">Fullscreen</button></div>
</div>
${adSlot(config.adSlotGameBottom)}
${g.instructions.length ? `<section class="block"><h2>How to play ${esc(g.title)}</h2>${list(g.instructions)}</section>` : ''}
${g.controls.length ? `<section class="block"><h2>Controls</h2>${list(g.controls)}</section>` : ''}
${others.length ? `<section class="block"><h2>More games</h2><div class="grid">${others.map(card).join('')}</div></section>` : ''}`;
  return layout({ title: `${g.title} - Play Free Online`, description: g.description, pathName: `/games/${g.slug}/`, body });
}

const staticPage = (title, pathName, description, inner) =>
  layout({ title, description, pathName, body: `<article class="prose"><h1>${esc(title)}</h1>${inner}</article>` });

const aboutPage = () =>
  staticPage('About', '/about/', `About ${config.name}`, `
<p>${esc(config.name)} is an independent collection of free browser games created by ${esc(config.owner)}. Every game here runs directly in your browser, works on desktop and mobile, and is free to play.</p>
<p>New games are added regularly. If you have feedback, a bug report or a game idea, we would love to hear from you on the <a href="/contact/">contact page</a>.</p>`);

const contactPage = () =>
  staticPage('Contact', '/contact/', `Contact ${config.name}`, `
<p>Questions, bug reports, or feedback about a game? Email us at <a href="mailto:${esc(config.email)}">${esc(config.email)}</a>.</p>
<p>We read every message and usually reply within a few days.</p>`);

const privacyPage = () =>
  staticPage('Privacy Policy', '/privacy/', `Privacy Policy for ${config.name}`, `
<p>Last updated: ${new Date().toISOString().slice(0, 10)}</p>
<p>${esc(config.name)} ("we", "us") respects your privacy. This policy explains what information is collected when you visit our website.</p>
<h2>Information we collect</h2>
<p>We do not ask you to create an account or submit personal information to play games. Like most websites, our hosting provider may record standard log data such as IP address, browser type and pages visited.</p>
<h2>Cookies and advertising</h2>
<p>We use Google AdSense to show ads. Google and its partners use cookies to serve ads based on your prior visits to this and other websites. You can opt out of personalised advertising by visiting <a href="https://www.google.com/settings/ads">Google Ads Settings</a>, or learn more at <a href="https://www.aboutads.info">aboutads.info</a>. Google's use of advertising cookies is described in the <a href="https://policies.google.com/technologies/ads">Google advertising policy</a>.</p>
<h2>Local storage</h2>
<p>Some games save your high score in your browser's local storage. This data stays on your device and is never sent to us.</p>
<h2>Children</h2>
<p>This site is not directed at children under 13 and we do not knowingly collect personal information from them.</p>
<h2>Changes</h2>
<p>We may update this policy from time to time. The latest version will always be on this page.</p>
<h2>Contact</h2>
<p>Questions about this policy? Email <a href="mailto:${esc(config.email)}">${esc(config.email)}</a>.</p>`);

const notFoundPage = () =>
  layout({ title: 'Page not found', description: 'Page not found', pathName: '/404.html',
    body: `<article class="prose"><h1>Page not found</h1><p>That page does not exist. <a href="/">Go back to the games</a>.</p></article>` });

// ---------- build ----------
async function write(rel, content) {
  const out = path.join(DIST, rel);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, content);
}

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

const games = await loadGames();

await cp(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });
for (const g of games) await cp(g.folder, path.join(DIST, 'play', g.slug), { recursive: true });

await write('index.html', homePage(games));
for (const g of games) await write(`games/${g.slug}/index.html`, gamePage(g, games));
await write('about/index.html', aboutPage());
await write('contact/index.html', contactPage());
await write('privacy/index.html', privacyPage());
await write('404.html', notFoundPage());

const urls = ['/', '/about/', '/contact/', '/privacy/', ...games.map((g) => `/games/${g.slug}/`)];
await write('sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

if (config.adsensePublisherId) {
  const pub = config.adsensePublisherId.replace(/^ca-/, '');
  await write('ads.txt', `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`);
}

console.log(`Built ${games.length} game(s) -> dist/`);

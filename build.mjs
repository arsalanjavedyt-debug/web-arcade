// Static site generator for the arcade. No dependencies.
// Reads games/<slug>/game.json + index.html and writes everything to dist/.
import { readdir, readFile, writeFile, mkdir, cp, rm, access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const config = JSON.parse(await readFile(path.join(ROOT, 'site.config.json'), 'utf8'));
const SITE_URL = config.url.replace(/\/$/, '');
const TODAY = new Date().toISOString().slice(0, 10);

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
      added: meta.added || TODAY,
      folder,
    });
  }
  games.sort((a, b) => (b.added || '').localeCompare(a.added || '') || a.title.localeCompare(b.title));
  return games;
}

// ---------- helpers ----------
const adsenseTag = config.adsensePublisherId
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.adsensePublisherId)}" crossorigin="anonymous"></script>`
  : '';

const adSlot = (id) =>
  config.adsensePublisherId && id
    ? `<div class="ad-slot"><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(config.adsensePublisherId)}" data-ad-slot="${esc(id)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>`
    : '';

function verificationTags() {
  let t = '';
  if (config.googleSiteVerification)
    t += `\n<meta name="google-site-verification" content="${esc(config.googleSiteVerification)}">`;
  if (config.bingSiteVerification)
    t += `\n<meta name="msvalidate.01" content="${esc(config.bingSiteVerification)}">`;
  return t;
}

function socialTags({ title, description, image, url, type = 'website' }) {
  const img = image || `${SITE_URL}/assets/og-default.png`;
  let t = `
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:site_name" content="${esc(config.name)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(img)}">`;
  if (config.twitterHandle)
    t += `\n<meta name="twitter:site" content="${esc(config.twitterHandle)}">`;
  return t;
}

function jsonLd(data) {
  return `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>`;
}

function websiteSchema() {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.name,
    url: SITE_URL,
    description: config.tagline,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  });
}

function videoGameSchema(g) {
  const base = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: g.title,
    description: g.description,
    url: `${SITE_URL}/games/${g.slug}/`,
    genre: g.category,
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    gamePlatform: 'Web browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock'
    },
    author: { '@type': 'Person', name: config.owner }
  };
  if (g.hasThumb) base.image = `${SITE_URL}/play/${g.slug}/thumbnail.png`;
  if (g.added) base.datePublished = g.added;
  return jsonLd(base);
}

function breadcrumbSchema(g) {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: g.title, item: `${SITE_URL}/games/${g.slug}/` }
    ]
  });
}

// ---------- layout ----------
function layout({ title, description, pathName, body, extraHead = '' }) {
  const fullTitle = pathName === '/' ? `${config.name} - ${config.tagline}` : `${title} | ${config.name}`;
  const navLinks = [['/', 'Games'], ['/about/', 'About'], ['/contact/', 'Contact']];
  const nav = navLinks.map(([href, label]) =>
    `<a href="${href}"${pathName === href ? ' class="active"' : ''}>${label}</a>`
  ).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#07080f">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">${verificationTags()}
<link rel="canonical" href="${SITE_URL}${pathName}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/assets/style.css">
${adsenseTag}${extraHead}
</head>
<body>
<header class="site"><div class="wrap">
  <a class="brand" href="/">${esc(config.name)}</a>
  <nav>${nav}</nav>
</div></header>
<main>
${body}
</main>
<footer class="site">
  <div class="wrap">
    <div>
      <div class="footer-brand">${esc(config.name)}</div>
      <p class="footer-tagline">${esc(config.tagline)}</p>
      <p class="footer-copy">&copy; ${new Date().getFullYear()} ${esc(config.name)}. All rights reserved.</p>
    </div>
    <div class="footer-col">
      <h4>Navigate</h4>
      <ul>
        <li><a href="/">All Games</a></li>
        <li><a href="/about/">About</a></li>
        <li><a href="/contact/">Contact</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Legal</h4>
      <ul>
        <li><a href="/privacy/">Privacy Policy</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    Free browser games &mdash; no download, no login, just play.
  </div>
</footer>
</body>
</html>`;
}

// ---------- cards ----------
function isNewGame(g) {
  if (!g.added) return false;
  return (Date.now() - new Date(g.added)) < 1000 * 60 * 60 * 24 * 30;
}

function card(g, forceNew = false) {
  const thumb = g.hasThumb
    ? `<img src="/play/${g.slug}/thumbnail.png" alt="${esc(g.title)} game screenshot" loading="lazy" width="640" height="400">`
    : `<span style="filter:drop-shadow(0 0 12px rgba(0,229,255,.5))">${g.icon}</span>`;
  const newBadge = (forceNew || isNewGame(g)) ? ' is-new' : '';
  return `<a class="card${newBadge}" href="/games/${g.slug}/">
  <div class="thumb">${thumb}</div>
  <div class="body">
    <h3>${esc(g.title)}</h3>
    <p>${esc(g.description)}</p>
    <div class="meta">
      <span class="tag">${esc(g.category)}</span>
      <span class="play-icon">&#9654;</span>
    </div>
  </div>
</a>`;
}

// ---------- pages ----------
function homePage(games) {
  const gameCount = games.length;
  const extraHead = `
${socialTags({
  title: `${config.name} - ${config.tagline}`,
  description: `${config.tagline} Play ${gameCount} free games online — no download, no login.`,
  url: `${SITE_URL}/`,
})}
${websiteSchema()}`;

  const body = `
<div class="wrap">
<section class="hero">
  <div class="hero-badge">Free Online Games</div>
  <h1>${esc(config.name)}</h1>
  <p>${esc(config.tagline)}</p>
  <div class="hero-actions">
    <a class="btn-primary" href="#games">Browse Games &#9654;</a>
    <a class="btn-ghost" href="/about/">Learn More</a>
  </div>
</section>

<div class="stats-bar">
  <div class="stat-item">
    <span class="stat-num">${gameCount}</span>
    <span class="stat-label">Games</span>
  </div>
  <div class="stat-item">
    <span class="stat-num">&#x221E;</span>
    <span class="stat-label">Always Free</span>
  </div>
  <div class="stat-item">
    <span class="stat-num">100%</span>
    <span class="stat-label">Browser-Based</span>
  </div>
</div>

<section id="games">
  <div class="section-head">
    <h2>All Games</h2>
    <span class="section-link">${gameCount} title${gameCount !== 1 ? 's' : ''} available</span>
  </div>
  <div class="grid">${games.map((g, i) => card(g, i === 0)).join('\n')}</div>
  ${gameCount === 0 ? '<p style="text-align:center;color:var(--muted)">No games yet. Add a folder inside <code>games/</code> and push.</p>' : ''}
</section>

<hr class="glow-line">

<section style="max-width:600px;margin:0 auto 60px;text-align:center">
  <h2 style="font-family:var(--font-head);font-size:1.7rem;font-weight:700;text-transform:uppercase;margin-bottom:12px">Play Free Games Online</h2>
  <p style="color:var(--muted)">${esc(config.name)} is a growing collection of free browser games that run on your phone, tablet or computer. There is nothing to install &mdash; pick a game, press play, and try to beat your best score.</p>
</section>
</div>`;

  return layout({
    title: config.name,
    description: `${config.tagline} Play ${gameCount} free games online — no download, no login.`,
    pathName: '/',
    body,
    extraHead,
  });
}

function gamePage(g, games) {
  // Related: same category first, then others, max 6
  const related = [
    ...games.filter(x => x.slug !== g.slug && x.category === g.category),
    ...games.filter(x => x.slug !== g.slug && x.category !== g.category),
  ].slice(0, 6);

  const listItems = (arr) => arr.map(i => `<li>${esc(i)}</li>`).join('');
  const ogImage = g.hasThumb
    ? `${SITE_URL}/play/${g.slug}/thumbnail.png`
    : `${SITE_URL}/assets/og-default.png`;

  const extraHead = `
${socialTags({
  title: `${g.title} - Play Free Online | ${config.name}`,
  description: g.description,
  image: ogImage,
  url: `${SITE_URL}/games/${g.slug}/`,
  type: 'website',
})}
${videoGameSchema(g)}
${breadcrumbSchema(g)}`;

  const body = `
<div class="wrap">
<div class="crumbs"><a href="/">Games</a> <span>&rsaquo;</span> ${esc(g.title)}</div>
<span class="game-category-pill">&#127918; ${esc(g.category)}</span>
<h1 class="page">${esc(g.title)}</h1>

<div class="game-layout">
  <div>
    <div class="player">
      <iframe id="game" src="/play/${g.slug}/" title="${esc(g.title)} — free online ${esc(g.category).toLowerCase()} game" allow="fullscreen; gamepad" loading="eager"></iframe>
      <div class="bar">
        <span>${esc(g.category)} Game</span>
        <button class="btn" onclick="document.getElementById('game').requestFullscreen&&document.getElementById('game').requestFullscreen()">&#x26F6; Fullscreen</button>
      </div>
    </div>
    ${adSlot(config.adSlotGameBottom)}
    ${g.instructions.length ? `<div class="block"><h2>How to play ${esc(g.title)}</h2><ul>${listItems(g.instructions)}</ul></div>` : ''}
  </div>

  <aside class="game-info">
    <div class="info-card">
      <h3>About</h3>
      <p style="color:var(--muted);font-size:.875rem;line-height:1.6">${esc(g.description)}</p>
    </div>
    ${g.controls.length ? `<div class="info-card"><h3>Controls</h3><ul>${listItems(g.controls)}</ul></div>` : ''}
    <div class="info-card">
      <h3>Details</h3>
      <ul>
        <li>Category: ${esc(g.category)}</li>
        <li>Platform: Browser (Any device)</li>
        <li>Price: Free</li>
        ${g.added ? `<li>Added: ${esc(g.added)}</li>` : ''}
      </ul>
    </div>
  </aside>
</div>

${related.length ? `<section><div class="section-head"><h2>More Games</h2></div><div class="grid">${related.map(x => card(x)).join('')}</div></section>` : ''}
</div>`;

  return layout({
    title: `${g.title} - Play Free Online`,
    description: g.description,
    pathName: `/games/${g.slug}/`,
    body,
    extraHead,
  });
}

// ---------- static pages ----------
const staticPage = (title, pathName, description, inner, extraHead = '') =>
  layout({ title, description, pathName, extraHead: `\n${socialTags({ title: `${title} | ${config.name}`, description, url: `${SITE_URL}${pathName}` })}${extraHead}`, body: `<div class="wrap"><article class="prose"><h1>${esc(title)}</h1>${inner}</article></div>` });

const aboutPage = () =>
  staticPage('About', '/about/', `About ${config.name}`, `
<p>${esc(config.name)} is an independent collection of free browser games created by ${esc(config.owner)}. Every game here runs directly in your browser, works on desktop and mobile, and is completely free to play.</p>
<p>New games are added regularly. If you have feedback, a bug report, or a game idea, we would love to hear from you on the <a href="/contact/">contact page</a>.</p>`);

const contactPage = () =>
  staticPage('Contact', '/contact/', `Contact ${config.name}`, `
<p>Questions, bug reports, or feedback about a game? Email us at <a href="mailto:${esc(config.email)}">${esc(config.email)}</a>.</p>
<p>We read every message and usually reply within a few days.</p>`);

const privacyPage = () =>
  staticPage('Privacy Policy', '/privacy/', `Privacy Policy for ${config.name}`, `
<p>Last updated: ${TODAY}</p>
<p>${esc(config.name)} ("we", "us") respects your privacy. This policy explains what information is collected when you visit our website.</p>
<h2>Information we collect</h2>
<p>We do not ask you to create an account or submit personal information to play games. Like most websites, our hosting provider may record standard log data such as IP address, browser type and pages visited.</p>
<h2>Cookies and advertising</h2>
<p>We use Google AdSense to show ads. Google and its partners use cookies to serve ads based on your prior visits to this and other websites. You can opt out of personalised advertising by visiting <a href="https://www.google.com/settings/ads">Google Ads Settings</a>, or learn more at <a href="https://www.aboutads.info">aboutads.info</a>.</p>
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
    body: `<div class="wrap" style="text-align:center;padding:80px 20px"><p style="font-family:var(--font-head);font-size:7rem;font-weight:700;color:var(--surface-2);line-height:1;margin:0">404</p><p style="color:var(--muted);margin:16px 0 24px;font-size:1.1rem">That page does not exist.</p><a class="btn-primary" href="/">&#8592; Back to Games</a></div>` });

// ---------- sitemap with lastmod ----------
function buildSitemap(games) {
  const pages = [
    { url: '/', date: TODAY },
    { url: '/about/', date: TODAY },
    { url: '/contact/', date: TODAY },
    { url: '/privacy/', date: TODAY },
    ...games.map(g => ({ url: `/games/${g.slug}/`, date: g.added || TODAY })),
  ];
  const urls = pages.map(p =>
    `  <url>\n    <loc>${SITE_URL}${p.url}</loc>\n    <lastmod>${p.date}</lastmod>\n    <changefreq>${p.url === '/' ? 'weekly' : 'monthly'}</changefreq>\n  </url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

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

await write('sitemap.xml', buildSitemap(games));
await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

if (config.adsensePublisherId) {
  const pub = config.adsensePublisherId.replace(/^ca-/, '');
  await write('ads.txt', `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`);
}

console.log(`Built ${games.length} game(s) -> dist/`);

// NEXORA PLAY — Master Static Site Generator & SEO Compiler
// Compiles 10 standalone game modules, platform shell, responsive UI, search,
// leaderboards, daily challenge, and multiplayer hubs into dist/.

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

// ---------- Load All 10 Games ----------
async function loadGames() {
  const dir = path.join(ROOT, 'games');
  if (!(await exists(dir))) return [];
  const games = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const folder = path.join(dir, entry.name);
    const metaPath = path.join(folder, 'game.json');
    if (!(await exists(metaPath)) || !(await exists(path.join(folder, 'index.html')))) {
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
      difficulty: meta.difficulty || 'Medium',
      duration: meta.duration || '3 min',
      icon: meta.icon || '🎮',
      isMultiplayer: !!meta.isMultiplayer,
      hasThumb: await exists(path.join(folder, 'thumbnail.png')),
      added: meta.added || TODAY,
      folder,
    });
  }
  // Sort: Multiplayer first, then alphabetical
  games.sort((a, b) => (b.isMultiplayer ? 1 : 0) - (a.isMultiplayer ? 1 : 0) || a.title.localeCompare(b.title));
  return games;
}

// ---------- Layout Template ----------
function layout({ title, description, pathName, body, schema = null }) {
  const fullTitle = pathName === '/' ? `${config.name} — ${config.tagline}` : `${title} | ${config.name}`;
  const ogImage = `${SITE_URL}/assets/logo.svg`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE_URL}${pathName}">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<meta name="theme-color" content="#08090D">

<!-- Open Graph / Social Media -->
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE_URL}${pathName}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${ogImage}">

<link rel="stylesheet" href="/assets/style.css">
${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ''}
</head>
<body>

<!-- Header -->
<header class="site"><div class="wrap">
  <a class="brand-link" href="/">
    <img src="/assets/logo.svg" alt="NEXORA PLAY" height="42">
  </a>

  <button class="menu-toggle" id="menu-toggle" aria-label="Toggle Navigation">☰</button>

  <nav class="main-nav" id="main-nav">
    <a href="/" class="${pathName === '/' ? 'active' : ''}">Home</a>
    <a href="/all-games/" class="${pathName === '/all-games/' ? 'active' : ''}">All Games</a>
    <a href="/multiplayer/" class="${pathName === '/multiplayer/' ? 'active' : ''}">⚡ Multiplayer</a>
    <a href="/leaderboard/" class="${pathName === '/leaderboard/' ? 'active' : ''}">🏆 Leaderboard</a>
    <a href="/daily-challenge/" class="${pathName === '/daily-challenge/' ? 'active' : ''}">🎯 Daily Challenge</a>
  </nav>

  <div class="nav-right">
    <!-- Sound settings button -->
    <button class="icon-btn" id="sound-btn" title="Sound Settings">🔊</button>

    <!-- Guest Profile Badge -->
    <div class="guest-badge" id="open-profile-btn" title="Guest Profile">
      <div class="guest-avatar" id="guest-badge-avatar">🎮</div>
      <span class="guest-name" id="guest-badge-name">Guest</span>
    </div>
  </div>
</div></header>

<!-- Main Body -->
<main>
${body}
</main>

<!-- Footer -->
<footer class="site"><div class="wrap">
  <div class="footer-top">
    <div class="footer-brand">
      <img src="/assets/logo.svg" alt="NEXORA PLAY" height="38">
      <p>PLAY INSTANTLY. COMPETE GLOBALLY.<br>The premier next-generation browser gaming platform featuring real-time multiplayer, zero downloads, and global leaderboards.</p>
    </div>
    <div class="footer-col">
      <h4>Platform</h4>
      <ul>
        <li><a href="/all-games/">All Games</a></li>
        <li><a href="/multiplayer/">Multiplayer Arena</a></li>
        <li><a href="/leaderboard/">Global Leaderboards</a></li>
        <li><a href="/daily-challenge/">Daily Challenges</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Categories</h4>
      <ul>
        <li><a href="/all-games/?cat=Multiplayer">Multiplayer Games</a></li>
        <li><a href="/all-games/?cat=Arcade">Arcade Games</a></li>
        <li><a href="/all-games/?cat=Puzzle">Puzzle Games</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Legal & Trust</h4>
      <ul>
        <li><a href="/about/">About Us</a></li>
        <li><a href="/contact/">Support & Contact</a></li>
        <li><a href="/privacy/">Privacy Policy</a></li>
        <li><a href="/terms/">Terms of Service</a></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <div>&copy; ${new Date().getFullYear()} NEXORA PLAY. All rights reserved.</div>
    <div>Engineered with high performance Web Audio & HTML5 Canvas.</div>
  </div>
</div></footer>

<!-- Profile Edit Modal -->
<div class="modal-backdrop" id="profile-modal">
  <div class="modal-box">
    <div class="modal-head">
      <h3>Player Identity</h3>
      <button class="close-btn" id="close-profile-btn">&times;</button>
    </div>
    <div class="form-group">
      <label>Choose Avatar Icon</label>
      <div class="avatar-selector">
        <div class="avatar-opt selected" data-avatar="🎮">🎮</div>
        <div class="avatar-opt" data-avatar="👾">👾</div>
        <div class="avatar-opt" data-avatar="🚀">🚀</div>
        <div class="avatar-opt" data-avatar="⚡">⚡</div>
        <div class="avatar-opt" data-avatar="🏎️">🏎️</div>
        <div class="avatar-opt" data-avatar="🧩">🧩</div>
        <div class="avatar-opt" data-avatar="🎯">🎯</div>
        <div class="avatar-opt" data-avatar="🐍">🐍</div>
        <div class="avatar-opt" data-avatar="🏆">🏆</div>
        <div class="avatar-opt" data-avatar="🎨">🎨</div>
        <div class="avatar-opt" data-avatar="🧱">🧱</div>
        <div class="avatar-opt" data-avatar="🧠">🧠</div>
      </div>
    </div>
    <div class="form-group">
      <label>Guest Display Name</label>
      <input type="text" id="profile-name-input" maxlength="16" placeholder="Enter player name">
    </div>
    <div style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">
      Guest identity is stored securely in local browser storage. No password or email needed.
    </div>
    <button class="btn btn-primary" id="save-profile-btn" style="width:100%;">SAVE PROFILE</button>
  </div>
</div>

<!-- Sound Settings Modal -->
<div class="modal-backdrop" id="sound-modal">
  <div class="modal-box">
    <div class="modal-head">
      <h3>Audio Settings</h3>
      <button class="close-btn" id="close-sound-btn">&times;</button>
    </div>
    <div class="form-group">
      <label>Master Volume</label>
      <input type="range" id="vol-master" min="0" max="1" step="0.05" value="0.8">
    </div>
    <div class="form-group">
      <label>Sound Effects (SFX)</label>
      <input type="range" id="vol-sfx" min="0" max="1" step="0.05" value="0.9">
    </div>
    <div class="form-group">
      <label>Music Volume</label>
      <input type="range" id="vol-music" min="0" max="1" step="0.05" value="0.5">
    </div>
    <button class="btn btn-secondary" id="mute-toggle-btn" style="width:100%; margin-top:10px;">Toggle Mute All</button>
  </div>
</div>

<!-- Global Client SDKs -->
<script src="/assets/sound.js"></script>
<script src="/assets/guest.js"></script>
<script>
  // Mobile Nav Toggle
  const mToggle = document.getElementById('menu-toggle');
  const mNav = document.getElementById('main-nav');
  if (mToggle && mNav) {
    mToggle.addEventListener('click', () => mNav.classList.toggle('open'));
  }

  // Sound Modal
  const soundBtn = document.getElementById('sound-btn');
  const soundModal = document.getElementById('sound-modal');
  const closeSound = document.getElementById('close-sound-btn');
  if (soundBtn && soundModal) {
    soundBtn.addEventListener('click', () => soundModal.classList.add('open'));
    closeSound.addEventListener('click', () => soundModal.classList.remove('open'));
    
    document.getElementById('vol-master').addEventListener('input', e => {
      if (window.NexoraSound) window.NexoraSound.setMaster(+e.target.value);
    });
    document.getElementById('vol-sfx').addEventListener('input', e => {
      if (window.NexoraSound) window.NexoraSound.setSfx(+e.target.value);
    });
    document.getElementById('vol-music').addEventListener('input', e => {
      if (window.NexoraSound) window.NexoraSound.setMusic(+e.target.value);
    });
    document.getElementById('mute-toggle-btn').addEventListener('click', () => {
      if (window.NexoraSound) {
        const isMuted = window.NexoraSound.toggleMute();
        soundBtn.textContent = isMuted ? '🔇' : '🔊';
      }
    });
  }
</script>
</body>
</html>`;
}

// ---------- Component: Game Card ----------
function gameCard(g) {
  const thumb = g.hasThumb
    ? `<img src="/play/${g.slug}/thumbnail.png" alt="${esc(g.title)}" loading="lazy">`
    : `<div style="font-size:52px; display:flex; align-items:center; justify-content:center; height:100%;">${g.icon}</div>`;

  const badgeClass = g.category === 'Multiplayer' ? 'badge-multiplayer' : (g.category === 'Puzzle' ? 'badge-puzzle' : 'badge-arcade');

  return `
<div class="game-card" data-category="${esc(g.category)}" data-title="${esc(g.title.toLowerCase())}">
  <a class="thumb-wrap" href="/games/${g.slug}/">
    ${thumb}
    <div class="badge-overlay">
      <span class="badge ${badgeClass}">${esc(g.category)}</span>
      ${g.isMultiplayer ? '<span class="badge badge-multiplayer">PvP Online</span>' : ''}
    </div>
    <div class="card-play-overlay">
      <div class="play-circle">▶</div>
    </div>
  </a>
  <div class="card-info">
    <h3>${esc(g.title)}</h3>
    <p>${esc(g.description)}</p>
    <div class="card-footer">
      <span class="card-meta-tag">⏱️ ${esc(g.duration)}</span>
      <span class="card-meta-tag">⚡ ${esc(g.difficulty)}</span>
      <a class="btn btn-sm btn-cyan" href="/games/${g.slug}/">PLAY</a>
    </div>
  </div>
</div>`;
}

// ---------- Page: Homepage ----------
function homePage(games) {
  const multiplayerGames = games.filter(g => g.category === 'Multiplayer');
  const arcadeGames = games.filter(g => g.category === 'Arcade');
  const puzzleGames = games.filter(g => g.category === 'Puzzle');

  const body = `
<div class="wrap">
  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-badge">⚡ NEXT-GEN BROWSER GAMING PLATFORM</div>
    <h1 class="hero-title">YOUR NEXT GAME<br><span class="gradient-text">STARTS HERE.</span></h1>
    <p class="hero-sub">Play 10 amazing games instantly with zero downloads. Challenge rivals in real-time multiplayer arenas and dominate the global leaderboards.</p>
    <div class="hero-actions">
      <a class="btn btn-cyan btn-lg" href="#trending">PLAY NOW ▶</a>
      <a class="btn btn-secondary btn-lg" href="/all-games/">EXPLORE ALL GAMES</a>
    </div>

    <!-- Feature Pillars -->
    <div class="features-strip">
      <div class="feature-pill">
        <div class="icon">⚡</div>
        <div><h4>Instant Play</h4><p>Zero downloads or installs</p></div>
      </div>
      <div class="feature-pill">
        <div class="icon">🌐</div>
        <div><h4>Real Multiplayer</h4><p>Public & private room codes</p></div>
      </div>
      <div class="feature-pill">
        <div class="icon">👤</div>
        <div><h4>Guest Identity</h4><p>No mandatory passwords</p></div>
      </div>
      <div class="feature-pill">
        <div class="icon">🏆</div>
        <div><h4>Global Ranks</h4><p>Server validated leaderboards</p></div>
      </div>
    </div>
  </section>

  <!-- Daily Challenge Section -->
  <div class="challenge-banner">
    <div class="challenge-content">
      <div class="challenge-tag">🔥 DAILY ACTIVE CHALLENGE</div>
      <h3 class="challenge-title">ORB GLUTTON IN SNAKE ARENA</h3>
      <p class="challenge-desc">Consume energy orbs and achieve an arena length of 60 to claim today's victory trophy and +150 bonus Player XP.</p>
      <div class="challenge-progress-bar">
        <div class="challenge-progress-fill" id="daily-progress-bar" style="width:0%;"></div>
      </div>
      <div class="challenge-stats">
        <span>Goal: <b id="daily-progress-text">0 / 60 (0%)</b></span>
        <span>Streak: <b id="daily-streak-val">0 Days</b></span>
        <span>Reward: <b>+150 XP</b></span>
      </div>
    </div>
    <a class="btn btn-primary btn-lg" href="/games/snake-arena/">PLAY CHALLENGE ▶</a>
  </div>

  <!-- Trending Games -->
  <section class="game-section" id="trending">
    <div class="section-head">
      <h2><span class="glow-dot"></span> Trending Games</h2>
      <a class="view-all" href="/all-games/">View All Games &rarr;</a>
    </div>
    <div class="games-grid">
      ${games.slice(0, 4).map(gameCard).join('\n')}
    </div>
  </section>

  <!-- Multiplayer Games -->
  <section class="game-section">
    <div class="section-head">
      <h2><span class="glow-dot" style="background:var(--neon-purple); box-shadow:0 0 10px var(--neon-purple);"></span> Real-Time Multiplayer Arenas</h2>
      <a class="view-all" href="/multiplayer/">Multiplayer Lobby &rarr;</a>
    </div>
    <div class="games-grid">
      ${multiplayerGames.map(gameCard).join('\n')}
    </div>
  </section>

  <!-- Arcade & Fast Action -->
  <section class="game-section">
    <div class="section-head">
      <h2><span class="glow-dot" style="background:var(--neon-green); box-shadow:0 0 10px var(--neon-green);"></span> Arcade & Action</h2>
      <a class="view-all" href="/all-games/?cat=Arcade">All Arcade &rarr;</a>
    </div>
    <div class="games-grid">
      ${arcadeGames.map(gameCard).join('\n')}
    </div>
  </section>

  <!-- Brain & Puzzles -->
  <section class="game-section">
    <div class="section-head">
      <h2><span class="glow-dot" style="background:var(--neon-yellow); box-shadow:0 0 10px var(--neon-yellow);"></span> Strategic Puzzles</h2>
      <a class="view-all" href="/all-games/?cat=Puzzle">All Puzzles &rarr;</a>
    </div>
    <div class="games-grid">
      ${puzzleGames.map(gameCard).join('\n')}
    </div>
  </section>

  <!-- Leaderboard Preview Section -->
  <section class="game-section">
    <div class="section-head">
      <h2><span class="glow-dot"></span> Champions Leaderboard</h2>
      <a class="view-all" href="/leaderboard/">Full Standings &rarr;</a>
    </div>
    <div class="leaderboard-table-wrap">
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Game</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="rank-badge rank-1">#1</span></td>
            <td><div class="player-cell"><span style="font-size:18px;">👑</span> <b>CyberViper99</b></div></td>
            <td>Snake Arena</td>
            <td class="player-score">2,840</td>
          </tr>
          <tr>
            <td><span class="rank-badge rank-2">#2</span></td>
            <td><div class="player-cell"><span style="font-size:18px;">⚡</span> <b>QuantumRider</b></div></td>
            <td>Neon Rush</td>
            <td class="player-score">1,960</td>
          </tr>
          <tr>
            <td><span class="rank-badge rank-3">#3</span></td>
            <td><div class="player-cell"><span style="font-size:18px;">🔥</span> <b>NeonApex</b></div></td>
            <td>Turbo Kart Battle</td>
            <td class="player-score">1,720</td>
          </tr>
          <tr>
            <td><span class="rank-badge">#4</span></td>
            <td><div class="player-cell"><span style="font-size:18px;">👾</span> <b>PixelPhantom</b></div></td>
            <td>Brick Blaster</td>
            <td class="player-score">1,480</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</div>`;

  return layout({
    title: 'Play Instantly. Compete Globally.',
    description: config.description,
    pathName: '/',
    body
  });
}

// ---------- Page: All Games Library ----------
function allGamesPage(games) {
  const body = `
<div class="wrap" style="padding-top: 36px; padding-bottom: 60px;">
  <div style="margin-bottom: 28px;">
    <h1 style="font-family:var(--font-display); font-size:36px; font-weight:900; margin-bottom:8px;">All Games Library</h1>
    <p style="color:var(--text-muted); font-size:15px;">Discover, search and play our complete catalog of 10 browser games.</p>
  </div>

  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
    <!-- Filter Bar -->
    <div class="filter-bar">
      <button class="filter-btn active" data-filter="all">All (10)</button>
      <button class="filter-btn" data-filter="Multiplayer">⚡ Multiplayer (4)</button>
      <button class="filter-btn" data-filter="Arcade">🕹️ Arcade (3)</button>
      <button class="filter-btn" data-filter="Puzzle">🧩 Puzzle (3)</button>
    </div>

    <!-- Real-time Search -->
    <div class="search-wrapper">
      <span class="search-icon">🔍</span>
      <input type="text" id="game-search" placeholder="Search games by name or genre...">
    </div>
  </div>

  <div class="games-grid" id="all-games-grid">
    ${games.map(gameCard).join('\n')}
  </div>
</div>

<script>
  // Instant Search & Category Filtering
  const searchInput = document.getElementById('game-search');
  const cards = document.querySelectorAll('.game-card');
  const filterBtns = document.querySelectorAll('.filter-btn');
  let activeFilter = 'all';

  function applyFilters() {
    const q = (searchInput.value || '').trim().toLowerCase();
    cards.forEach(card => {
      const title = card.dataset.title;
      const cat = card.dataset.category;
      const matchesSearch = title.includes(q);
      const matchesCat = activeFilter === 'all' || cat === activeFilter;
      card.style.display = (matchesSearch && matchesCat) ? 'flex' : 'none';
    });
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      applyFilters();
    });
  });

  // Check URL query param for category
  const params = new URLSearchParams(window.location.search);
  const catParam = params.get('cat');
  if (catParam) {
    const matchBtn = Array.from(filterBtns).find(b => b.dataset.filter === catParam);
    if (matchBtn) matchBtn.click();
  }
</script>`;

  return layout({
    title: 'All Games Catalog',
    description: 'Explore the full library of 10 free browser mini-games on NEXORA PLAY. Filter by multiplayer, arcade, and puzzle games.',
    pathName: '/all-games/',
    body
  });
}

// ---------- Page: Multiplayer Hub ----------
function multiplayerPage(games) {
  const mpGames = games.filter(g => g.isMultiplayer);

  const body = `
<div class="wrap multiplayer-hub">
  <div style="text-align:center; max-width:680px; margin: 0 auto 36px;">
    <div class="hero-badge">🌐 REAL-TIME NETWORKING</div>
    <h1 style="font-family:var(--font-display); font-size:42px; font-weight:900; margin-bottom:12px;">MULTIPLAYER ARENA</h1>
    <p style="color:var(--text-muted); font-size:16px;">Queue for public matchmaking or create private rooms to battle friends via shareable 6-digit room codes.</p>
  </div>

  <div class="mp-grid">
    <!-- Public Matchmaking Card -->
    <div class="mp-card featured">
      <div>
        <div class="card-icon">⚡</div>
        <h3>Public Matchmaking</h3>
        <p>Instant queue with online players globally. Jump straight into the arena with automatic match formation.</p>
      </div>
      <div>
        <div class="form-group">
          <label>Select Game Mode</label>
          <select id="mm-game-select">
            ${mpGames.map(g => `<option value="${g.slug}">${g.title}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-cyan" id="start-matchmaking-btn" style="width:100%;">FIND PUBLIC MATCH</button>
      </div>
    </div>

    <!-- Create Private Room Card -->
    <div class="mp-card">
      <div>
        <div class="card-icon">🗝️</div>
        <h3>Host Private Room</h3>
        <p>Create a dedicated private match with custom rules. Share your room code or instant link with friends.</p>
      </div>
      <div>
        <div class="form-group">
          <label>Select Game</label>
          <select id="create-room-game">
            ${mpGames.map(g => `<option value="${g.slug}">${g.title}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary" id="create-room-btn" style="width:100%;">GENERATE ROOM CODE</button>
      </div>
    </div>

    <!-- Join by Code Card -->
    <div class="mp-card">
      <div>
        <div class="card-icon">🚪</div>
        <h3>Join by Code</h3>
        <p>Enter a 6-character room invite code from a friend to immediately join their game session.</p>
      </div>
      <div>
        <input type="text" class="room-code-input" id="join-code-input" placeholder="NX-8241" maxlength="7">
        <button class="btn btn-green" id="join-room-btn" style="width:100%;">JOIN ROOM NOW</button>
      </div>
    </div>
  </div>

  <!-- Featured Multiplayer Games List -->
  <div style="margin-top:60px;">
    <h2 style="font-family:var(--font-display); font-size:24px; font-weight:800; margin-bottom:20px;">Supported Multiplayer Games</h2>
    <div class="games-grid">
      ${mpGames.map(gameCard).join('\n')}
    </div>
  </div>
</div>

<script src="/socket.io/socket.io.js" onerror="console.log('Socket.IO CDN fallback active')"></script>
<script src="/assets/multiplayer-client.js"></script>
<script>
  const mmBtn = document.getElementById('start-matchmaking-btn');
  const createBtn = document.getElementById('create-room-btn');
  const joinBtn = document.getElementById('join-room-btn');
  const codeInput = document.getElementById('join-code-input');

  if (mmBtn) {
    mmBtn.addEventListener('click', () => {
      const game = document.getElementById('mm-game-select').value;
      window.location.href = \`/games/\${game}/?mode=matchmaking\`;
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      const game = document.getElementById('create-room-game').value;
      const code = 'NX-' + Math.floor(1000 + Math.random() * 9000);
      window.location.href = \`/games/\${game}/?room=\${code}&host=true\`;
    });
  }

  if (joinBtn && codeInput) {
    joinBtn.addEventListener('click', () => {
      const code = codeInput.value.trim().toUpperCase();
      if (!code) return alert('Please enter a room code');
      window.location.href = \`/games/snake-arena/?room=\${code}\`;
    });
  }
</script>`;

  return layout({
    title: 'Multiplayer Arena & Matchmaking',
    description: 'Play online browser multiplayer games with public matchmaking, private rooms, and instant invite codes on NEXORA PLAY.',
    pathName: '/multiplayer/',
    body
  });
}

// ---------- Page: Leaderboard ----------
function leaderboardPage(games) {
  const body = `
<div class="wrap" style="padding-top: 36px; padding-bottom: 60px;">
  <div style="text-align:center; max-width:640px; margin: 0 auto 36px;">
    <h1 style="font-family:var(--font-display); font-size:40px; font-weight:900; margin-bottom:12px;">Global Hall of Fame</h1>
    <p style="color:var(--text-muted); font-size:15px;">Official server-validated rankings across all NEXORA PLAY titles.</p>
  </div>

  <div class="filter-bar" style="justify-content:center;">
    <button class="filter-btn active">Global All-Time</button>
    <button class="filter-btn">Snake Arena</button>
    <button class="filter-btn">Knockout Arena</button>
    <button class="filter-btn">Turbo Kart</button>
    <button class="filter-btn">Neon Rush</button>
    <button class="filter-btn">Brick Blaster</button>
  </div>

  <div class="leaderboard-table-wrap" style="max-width:920px; margin:0 auto;">
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Game</th>
          <th>Date</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="rank-badge rank-1">#1</span></td>
          <td><div class="player-cell"><span style="font-size:20px;">👑</span> <b>CyberViper99</b></div></td>
          <td>Snake Arena</td>
          <td style="color:var(--text-muted);">Today</td>
          <td class="player-score">2,840</td>
        </tr>
        <tr>
          <td><span class="rank-badge rank-2">#2</span></td>
          <td><div class="player-cell"><span style="font-size:20px;">⚡</span> <b>QuantumRider</b></div></td>
          <td>Neon Rush</td>
          <td style="color:var(--text-muted);">Today</td>
          <td class="player-score">1,960</td>
        </tr>
        <tr>
          <td><span class="rank-badge rank-3">#3</span></td>
          <td><div class="player-cell"><span style="font-size:20px;">🔥</span> <b>NeonApex</b></div></td>
          <td>Turbo Kart Battle</td>
          <td style="color:var(--text-muted);">Yesterday</td>
          <td class="player-score">1,720</td>
        </tr>
        <tr>
          <td><span class="rank-badge">#4</span></td>
          <td><div class="player-cell"><span style="font-size:20px;">👾</span> <b>PixelPhantom</b></div></td>
          <td>Brick Blaster</td>
          <td style="color:var(--text-muted);">2 days ago</td>
          <td class="player-score">1,480</td>
        </tr>
        <tr>
          <td><span class="rank-badge">#5</span></td>
          <td><div class="player-cell"><span style="font-size:20px;">🚀</span> <b>AstroKnight</b></div></td>
          <td>Perfect Stack</td>
          <td style="color:var(--text-muted);">3 days ago</td>
          <td class="player-score">1,310</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>`;

  return layout({
    title: 'Global Leaderboards & Standings',
    description: 'Track high scores, player ranks, and daily records across all 10 browser games on NEXORA PLAY.',
    pathName: '/leaderboard/',
    body
  });
}

// ---------- Page: Daily Challenge ----------
function dailyChallengePage() {
  const body = `
<div class="wrap" style="padding-top: 36px; padding-bottom: 60px;">
  <div style="text-align:center; max-width:640px; margin: 0 auto 36px;">
    <h1 style="font-family:var(--font-display); font-size:40px; font-weight:900; margin-bottom:12px;">Daily Challenge Rotation</h1>
    <p style="color:var(--text-muted); font-size:15px;">New objective unlocked every 24 hours. Complete today's mission to sustain your login streak and earn bonus Player XP.</p>
  </div>

  <div class="challenge-banner" style="max-width:880px; margin:0 auto 40px;">
    <div class="challenge-content">
      <div class="challenge-tag">🔥 TODAY'S MISSION</div>
      <h3 class="challenge-title">ORB GLUTTON IN SNAKE ARENA</h3>
      <p class="challenge-desc">Dominate the arena! Slither, consume glowing energy orbs, and achieve a length of 60 to claim your reward.</p>
      <div class="challenge-progress-bar">
        <div class="challenge-progress-fill" id="daily-progress-bar" style="width:0%;"></div>
      </div>
      <div class="challenge-stats">
        <span>Progress: <b id="daily-progress-text">0 / 60 (0%)</b></span>
        <span>Streak: <b id="daily-streak-val">0 Days</b></span>
        <span>Reward: <b>+150 XP</b></span>
      </div>
    </div>
    <a class="btn btn-primary btn-lg" href="/games/snake-arena/">PLAY CHALLENGE ▶</a>
  </div>
</div>`;

  return layout({
    title: 'Daily Challenge & Streaks',
    description: 'Complete rotating daily objectives across games on NEXORA PLAY to earn XP and build streaks.',
    pathName: '/daily-challenge/',
    body
  });
}

// ---------- Page: Dedicated Game Route ----------
function gamePage(g, allGames) {
  const related = allGames.filter(x => x.slug !== g.slug).slice(0, 4);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    'name': g.title,
    'description': g.description,
    'genre': [g.category, 'Browser Game', 'Free Online Game'],
    'playMode': g.isMultiplayer ? 'MultiPlayer' : 'SinglePlayer',
    'applicationCategory': 'Game',
    'operatingSystem': 'Any',
    'url': `${SITE_URL}/games/${g.slug}/`
  };

  const body = `
<div class="wrap game-view-container">
  <!-- Breadcrumbs -->
  <div class="game-breadcrumbs">
    <a href="/">Home</a> &rsaquo;
    <a href="/all-games/?cat=${esc(g.category)}">${esc(g.category)}</a> &rsaquo;
    <span>${esc(g.title)}</span>
  </div>

  <!-- Game Header Bar -->
  <div class="game-header-bar">
    <div>
      <h1>${esc(g.title)}</h1>
      <p style="color:var(--text-muted); font-size:14px; margin-top:4px;">${esc(g.description)}</p>
    </div>
    <div class="game-actions-bar">
      <button class="btn btn-sm btn-secondary" id="restart-game-btn">↻ Restart</button>
      <button class="btn btn-sm btn-cyan" id="fullscreen-btn">⛶ Fullscreen</button>
    </div>
  </div>

  <!-- Game Canvas Player Frame -->
  <div class="game-frame-box" id="game-frame-box">
    <iframe id="game-iframe" src="/play/${g.slug}/" title="${esc(g.title)}" allow="fullscreen; gamepad; autoplay" loading="eager"></iframe>
  </div>

  <!-- HUD Bar -->
  <div class="game-hud-bar">
    <div class="hud-info">
      <span class="hud-stat">Genre: <b>${esc(g.category)}</b></span>
      <span class="hud-stat">Difficulty: <b>${esc(g.difficulty)}</b></span>
      <span class="hud-stat">PVP Mode: <b>${g.isMultiplayer ? 'Online Multi' : 'Single Player'}</b></span>
    </div>
    <div class="hud-controls-list">
      <button class="btn btn-sm btn-secondary" id="fav-btn">❤️ Favorite</button>
      <button class="btn btn-sm btn-secondary" id="share-btn">🔗 Share</button>
    </div>
  </div>

  <!-- Details, Instructions & Controls -->
  <div class="game-details-grid">
    <div class="details-card">
      <h3>📖 Instructions</h3>
      <ul class="instructions-list">
        ${g.instructions.map(i => `<li>${esc(i)}</li>`).join('')}
      </ul>

      <h3 style="margin-top:24px;">🎮 Controls</h3>
      <div class="controls-badge-list">
        ${g.controls.map(c => `<div class="control-pill">${esc(c)}</div>`).join('')}
      </div>
    </div>

    <!-- Related Games -->
    <div class="details-card">
      <h3>🔥 Related Games</h3>
      <div style="display:flex; flex-direction:column; gap:14px;">
        ${related.map(r => `
          <a href="/games/${r.slug}/" style="display:flex; align-items:center; gap:12px; background:var(--bg-secondary); padding:10px; border-radius:8px; border:1px solid var(--border-subtle);">
            <div style="font-size:26px;">${r.icon}</div>
            <div>
              <h4 style="font-size:14px; color:#fff;">${esc(r.title)}</h4>
              <span style="font-size:11px; color:var(--text-muted);">${esc(r.category)}</span>
            </div>
          </a>
        `).join('')}
      </div>
    </div>
  </div>
</div>

<script>
  // Fullscreen
  const fsBtn = document.getElementById('fullscreen-btn');
  const frameBox = document.getElementById('game-frame-box');
  if (fsBtn && frameBox) {
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        frameBox.requestFullscreen().catch(err => alert('Fullscreen error: ' + err.message));
      } else {
        document.exitFullscreen();
      }
    });
  }

  // Restart frame
  const rBtn = document.getElementById('restart-game-btn');
  const iframe = document.getElementById('game-iframe');
  if (rBtn && iframe) {
    rBtn.addEventListener('click', () => {
      iframe.src = iframe.src;
    });
  }

  // Favorite button
  const favBtn = document.getElementById('fav-btn');
  if (favBtn && window.NexoraGuest) {
    const isFav = window.NexoraGuest.isFavorite('${g.slug}');
    if (isFav) favBtn.style.color = '#FF3366';
    favBtn.addEventListener('click', () => {
      const added = window.NexoraGuest.toggleFavorite('${g.slug}');
      favBtn.style.color = added ? '#FF3366' : 'var(--text-main)';
      window.NexoraGuest.showToast(added ? 'Added to favorites!' : 'Removed from favorites');
    });
  }

  // Share button
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href);
      if (window.NexoraGuest) window.NexoraGuest.showToast('Game link copied to clipboard!');
      else alert('Game link copied!');
    });
  }
</script>`;

  return layout({
    title: `${g.title} — Play Free Online`,
    description: g.description,
    pathName: `/games/${g.slug}/`,
    body,
    schema
  });
}

// ---------- Static Pages (About, Contact, Privacy, Terms) ----------
const staticPage = (title, pathName, description, inner) =>
  layout({
    title,
    description,
    pathName,
    body: `<div class="wrap" style="padding: 50px 0 80px; max-width:800px;"><article class="details-card" style="line-height:1.7;"><h1>${esc(title)}</h1><div style="margin-top:20px; color:var(--text-muted);">${inner}</div></article></div>`
  });

const aboutPage = () =>
  staticPage('About NEXORA PLAY', '/about/', `About NEXORA PLAY platform`, `
<p><strong>NEXORA PLAY</strong> is an elite next-generation browser gaming platform created to deliver commercial-grade instant play without friction, installations, or mandatory registrations.</p>
<p style="margin-top:14px;">Every game on our platform is custom-built with high-performance HTML5 Canvas physics, Web Audio API synthesis, and real-time multiplayer networking for desktop and mobile devices.</p>
<h3 style="color:#fff; margin-top:24px;">Our Mission</h3>
<p>Play instantly. Compete globally. We believe the future of gaming is universal, accessible, and community-driven.</p>`);

const contactPage = () =>
  staticPage('Contact & Support', '/contact/', `Contact NEXORA PLAY team`, `
<p>Have questions, bug reports, or feature ideas for NEXORA PLAY? Our team reads every message.</p>
<p style="margin-top:14px;">Email our developer support desk directly at: <a href="mailto:${esc(config.email)}" style="color:var(--neon-cyan);">${esc(config.email)}</a></p>
<p style="margin-top:14px;">We typically reply within 24-48 business hours.</p>`);

const privacyPage = () =>
  staticPage('Privacy Policy', '/privacy/', `NEXORA PLAY Privacy Policy`, `
<p>Last updated: ${TODAY}</p>
<p style="margin-top:12px;">NEXORA PLAY respects your privacy. We do not require account registration or store sensitive personal information. Guest identities, volume preferences, and personal high scores are maintained safely on your local device.</p>
<h3 style="color:#fff; margin-top:20px;">Data We Collect</h3>
<p>Standard web server access logs (such as IP addresses and browser agent headers) for DDoS protection and performance telemetry.</p>`);

const termsPage = () =>
  staticPage('Terms of Service', '/terms/', `NEXORA PLAY Terms of Service`, `
<p>Last updated: ${TODAY}</p>
<p style="margin-top:12px;">By playing on NEXORA PLAY, you agree to respectful online conduct in multiplayer rooms and fair competition on leaderboards. Unfair exploits, network manipulation, and abusive usernames are strictly prohibited.</p>`);

// ---------- Build Runner ----------
async function write(rel, content) {
  const out = path.join(DIST, rel);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, content);
}

console.log('Building NEXORA PLAY platform...');
await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

const games = await loadGames();
console.log(`Loaded ${games.length} games: ${games.map(g => g.slug).join(', ')}`);

// Copy assets & game modules
await cp(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });
for (const g of games) {
  await cp(g.folder, path.join(DIST, 'play', g.slug), { recursive: true });
}

// Generate Pages
await write('index.html', homePage(games));
await write('all-games/index.html', allGamesPage(games));
await write('multiplayer/index.html', multiplayerPage(games));
await write('leaderboard/index.html', leaderboardPage(games));
await write('daily-challenge/index.html', dailyChallengePage());

for (const g of games) {
  await write(`games/${g.slug}/index.html`, gamePage(g, games));
}

await write('about/index.html', aboutPage());
await write('contact/index.html', contactPage());
await write('privacy/index.html', privacyPage());
await write('terms/index.html', termsPage());

// Sitemap & Robots
const urls = [
  '/', '/all-games/', '/multiplayer/', '/leaderboard/', '/daily-challenge/',
  '/about/', '/contact/', '/privacy/', '/terms/',
  ...games.map(g => `/games/${g.slug}/`)
];

await write('sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}\n</urlset>\n`);

await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`✅ Build complete! ${games.length} games and all platform pages generated into dist/.`);

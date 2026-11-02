// NEXORA PLAY — Master Frontend Compiler & Static Generator
// Generates the complete premium gaming interface for NEXORA PLAY:
// - Navigation with Online Status Indicator & Guest Profile
// - Hero Section with CTA Actions & Feature Pillars
// - "JUMP INTO THE ACTION" Featured Showcase with prominent Hero Card
// - "EXPLORE THE ARCADE" Browse All Games with Category Chips & Real-time Search
// - "PLAY TOGETHER. WIN TOGETHER." Public Matchmaking & Private Rooms
// - "YOUR DAILY CHALLENGE" Rotation with Progress Tracker & Streak Counter
// - "THE TOP PLAYERS" Leaderboard Preview with Period Filters
// - Dedicated /all-games/ with Sort Dropdown & Empty States
// - Dedicated /multiplayer/, /leaderboard/, and /daily-challenge/ Pages
// - 10 Individual Game Pages with Controls, Fullscreen, and In-Page Multiplayer Lobbies

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
  // Order: Snake Arena first, then other MP, then Arcade, then Puzzle
  const priority = ['snake-arena', 'knockout-arena', 'turbo-kart', 'draw-guess', 'neon-rush', 'brick-blaster', 'perfect-stack', 'number-fusion', 'word-detective', 'memory-masters'];
  games.sort((a, b) => {
    const ia = priority.indexOf(a.slug);
    const ib = priority.indexOf(b.slug);
    if (ia !== -1 && ib !== -1) return ia - ib;
    return a.title.localeCompare(b.title);
  });
  return games;
}

// ---------- Master Shell Layout ----------
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

<!-- Open Graph / Twitter Card Meta -->
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

<!-- Modern Sticky Header -->
<header class="site"><div class="wrap">
  <a class="brand-link" href="/">
    <img src="/assets/logo.svg" alt="NEXORA PLAY" height="40">
  </a>

  <button class="menu-toggle" id="menu-toggle" aria-label="Toggle Mobile Menu">☰</button>

  <nav class="main-nav" id="main-nav">
    <a href="/" class="${pathName === '/' ? 'active' : ''}">Home</a>
    <a href="/all-games/" class="${pathName === '/all-games/' ? 'active' : ''}">All Games</a>
    <a href="/multiplayer/" class="${pathName === '/multiplayer/' ? 'active' : ''}">Multiplayer</a>
    <a href="/leaderboard/" class="${pathName === '/leaderboard/' ? 'active' : ''}">Leaderboards</a>
    <a href="/daily-challenge/" class="${pathName === '/daily-challenge/' ? 'active' : ''}">Daily Challenges</a>
  </nav>

  <div class="nav-right">
    <!-- Live Status Indicator -->
    <div title="NEXORA Network Online" style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:var(--text-secondary); margin-right:4px;">
      <span class="online-status-dot"></span>
      <span style="font-size:11px; font-family:var(--font-heading); letter-spacing:0.5px;">ONLINE</span>
    </div>

    <!-- Sound Toggle Button -->
    <button class="icon-btn" id="sound-btn" title="Sound Settings">🔊</button>

    <!-- Guest Profile Badge -->
    <div class="guest-badge" id="open-profile-btn" title="Edit Guest Profile">
      <div class="guest-avatar" id="guest-badge-avatar">🎮</div>
      <span class="guest-name" id="guest-badge-name">Guest</span>
    </div>
  </div>
</div></header>

<!-- Page Content -->
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
        <li><a href="/all-games/?cat=Multiplayer">Multiplayer</a></li>
        <li><a href="/all-games/?cat=Arcade">Arcade</a></li>
        <li><a href="/all-games/?cat=Puzzle">Puzzle</a></li>
        <li><a href="/all-games/?cat=Racing">Racing</a></li>
        <li><a href="/all-games/?cat=Party">Party</a></li>
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
      <h3>Guest Player Profile</h3>
      <button class="close-btn" id="close-profile-btn">&times;</button>
    </div>
    <div class="form-group-field">
      <label>Select Avatar Icon</label>
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
    <div class="form-group-field">
      <label>Display Name</label>
      <input type="text" id="profile-name-input" maxlength="16" placeholder="Enter player name">
    </div>
    <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">
      Your guest identity and stats are preserved locally in your browser. No password or email needed.
    </p>
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
    <div class="form-group-field">
      <label>Master Volume</label>
      <input type="range" id="vol-master" min="0" max="1" step="0.05" value="0.8">
    </div>
    <div class="form-group-field">
      <label>Sound Effects (SFX)</label>
      <input type="range" id="vol-sfx" min="0" max="1" step="0.05" value="0.9">
    </div>
    <div class="form-group-field">
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

// ---------- Component: Standard Game Card ----------
function gameCard(g) {
  const thumb = g.hasThumb
    ? `<img src="/play/${g.slug}/thumbnail.png" alt="${esc(g.title)}" loading="lazy">`
    : `<div style="font-size:48px; display:flex; align-items:center; justify-content:center; height:100%;">${g.icon}</div>`;

  const badgeClass = g.category === 'Multiplayer' ? 'badge-multiplayer' : (g.category === 'Puzzle' ? 'badge-puzzle' : 'badge-arcade');

  return `
<div class="game-card" data-category="${esc(g.category)}" data-title="${esc(g.title.toLowerCase())}">
  <a class="thumb-box" href="/games/${g.slug}/">
    ${thumb}
    <div class="badge-tag-wrap">
      <span class="badge ${badgeClass}">${esc(g.category)}</span>
      ${g.isMultiplayer ? '<span class="badge badge-multiplayer">Online</span>' : ''}
    </div>
    <div class="card-play-action-overlay">
      <div class="play-circle-btn">▶</div>
    </div>
  </a>
  <div class="card-body">
    <h3>${esc(g.title)}</h3>
    <p>${esc(g.description)}</p>
    <div class="card-foot">
      <span>⏱️ ${esc(g.duration)}</span>
      <span>⚡ ${esc(g.difficulty)}</span>
      <a class="btn btn-sm btn-cyan" href="/games/${g.slug}/">PLAY</a>
    </div>
  </div>
</div>`;
}

// ---------- Page: Homepage ("The Main Experience") ----------
function homePage(games) {
  const snakeArena = games.find(g => g.slug === 'snake-arena') || games[0];
  const sideFeatured = games.filter(g => ['knockout-arena', 'turbo-kart', 'draw-guess'].includes(g.slug));

  const body = `
<div class="wrap">
  <!-- B. Hero Section -->
  <section class="hero">
    <div class="hero-pill-badge">⚡ NEXT-GENERATION BROWSER GAMING</div>
    <h1 class="hero-title">YOUR NEXT GAME<br><span class="gradient-text">STARTS HERE.</span></h1>
    <p class="hero-sub">Jump into instant multiplayer battles, addictive arcade challenges, and brain-testing puzzles. No downloads. No registration. Just play.</p>
    <div class="hero-actions">
      <a class="btn btn-cyan btn-lg" href="#browse-arcade">EXPLORE GAMES ▶</a>
      <a class="btn btn-secondary btn-lg" href="#multiplayer-hub">PLAY MULTIPLAYER</a>
    </div>

    <!-- Feature Pillars -->
    <div class="hero-features-bar">
      <div class="hero-feature-item">
        <div class="icon-box">⚡</div>
        <div><h4>Instant Play</h4><p>Zero downloads or plugins</p></div>
      </div>
      <div class="hero-feature-item">
        <div class="icon-box">🌐</div>
        <div><h4>Real Multiplayer</h4><p>Public matchmaking & private codes</p></div>
      </div>
      <div class="hero-feature-item">
        <div class="icon-box">👤</div>
        <div><h4>Guest Identity</h4><p>Play instantly with local stats</p></div>
      </div>
      <div class="hero-feature-item">
        <div class="icon-box">🏆</div>
        <div><h4>Global Leaderboards</h4><p>Validated competitive scoring</p></div>
      </div>
    </div>
  </section>

  <!-- C. Featured Games ("JUMP INTO THE ACTION") -->
  <section class="featured-showcase-section">
    <div class="section-header-box">
      <div>
        <h2><span class="neon-glow-dot"></span> JUMP INTO THE ACTION</h2>
        <p class="subtitle">Your next obsession is one click away.</p>
      </div>
      <a class="btn btn-sm btn-secondary" href="/all-games/">View Complete Catalog &rarr;</a>
    </div>

    <div class="featured-grid-layout">
      <!-- Prominent Hero Card: Snake Arena -->
      <div class="hero-game-showcase-card">
        <div class="showcase-media-box">
          <img src="/play/snake-arena/thumbnail.png" alt="Snake Arena" loading="lazy">
          <div class="badge-tag-wrap">
            <span class="badge badge-multiplayer">Featured Arena</span>
            <span class="badge badge-arcade">⚡ 60 FPS</span>
          </div>
        </div>
        <div class="showcase-info-box">
          <div>
            <h3>${esc(snakeArena.title)}</h3>
            <p>${esc(snakeArena.description)}</p>
          </div>
          <div class="showcase-footer-row">
            <div style="font-size:13px; color:var(--text-muted); display:flex; gap:16px;">
              <span>Genre: <b style="color:var(--text-main);">Multiplayer PvP</b></span>
              <span>Controls: <b style="color:var(--accent-secondary);">Mouse & Touch</b></span>
            </div>
            <a class="btn btn-cyan btn-lg" href="/games/snake-arena/">PLAY ARENA NOW ▶</a>
          </div>
        </div>
      </div>

      <!-- Secondary Featured Mini Cards -->
      <div class="featured-side-stack">
        ${sideFeatured.map(g => `
          <div class="featured-mini-card">
            <div class="featured-mini-thumb">
              <img src="/play/${g.slug}/thumbnail.png" alt="${esc(g.title)}" loading="lazy">
            </div>
            <div class="featured-mini-info">
              <h4>${esc(g.title)}</h4>
              <p>${esc(g.description)}</p>
              <div style="margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
                <span class="badge badge-multiplayer" style="font-size:10px;">${esc(g.category)}</span>
                <a class="btn btn-sm btn-secondary" href="/games/${g.slug}/">Play</a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- D. Browse All Games ("EXPLORE THE ARCADE") -->
  <section class="game-section" id="browse-arcade" style="padding-top:20px;">
    <div class="section-header-box">
      <div>
        <h2><span class="neon-glow-dot"></span> EXPLORE THE ARCADE</h2>
        <p class="subtitle">Filter by genre or search our catalog of 10 browser games.</p>
      </div>

      <!-- Live Search Box -->
      <div class="search-input-box">
        <span class="search-prefix-icon">🔍</span>
        <input type="text" id="arcade-search-input" placeholder="Search your next game...">
      </div>
    </div>

    <!-- Category Chips Filter -->
    <div class="chips-bar" id="category-chips-bar" style="margin-bottom:24px;">
      <button class="chip-btn active" data-filter="all">All Games (10)</button>
      <button class="chip-btn" data-filter="Multiplayer">⚡ Multiplayer (4)</button>
      <button class="chip-btn" data-filter="Arcade">🕹️ Arcade (3)</button>
      <button class="chip-btn" data-filter="Puzzle">🧩 Puzzle (3)</button>
      <button class="chip-btn" data-filter="Racing">🏎️ Racing (1)</button>
      <button class="chip-btn" data-filter="Party">🎨 Party (1)</button>
    </div>

    <!-- Responsive Games Grid -->
    <div class="games-grid" id="browse-games-grid">
      ${games.map(gameCard).join('\n')}
    </div>
  </section>

  <!-- E. Multiplayer Section ("PLAY TOGETHER. WIN TOGETHER.") -->
  <section class="multiplayer-showcase-section" id="multiplayer-hub">
    <div class="section-header-box">
      <div>
        <h2><span class="neon-glow-dot" style="background:var(--accent-primary); box-shadow:0 0 10px var(--accent-primary);"></span> PLAY TOGETHER. WIN TOGETHER.</h2>
        <p class="subtitle">Real-time matchmaking and private game lobbies powered by Socket.IO.</p>
      </div>
      <a class="btn btn-sm btn-secondary" href="/multiplayer/">Multiplayer Hub &rarr;</a>
    </div>

    <div class="mp-panels-duo">
      <!-- Public Matchmaking Panel -->
      <div class="mp-interactive-panel primary-panel">
        <div>
          <div class="mp-panel-badge">⚡ PUBLIC MATCHMAKING</div>
          <h3>Find Players Globally</h3>
          <p>Queue up against active players online. Automatic matchmaking pairs you into instant live arena battles.</p>
          
          <div class="form-group-field">
            <label>Select Game Mode</label>
            <select id="home-mm-select">
              <option value="snake-arena">Snake Arena (PvP Survival)</option>
              <option value="knockout-arena">Knockout Arena (Physics Bumper)</option>
              <option value="turbo-kart">Turbo Kart Battle (Combat Racing)</option>
              <option value="draw-guess">Draw & Guess (Party Sketch)</option>
            </select>
          </div>
        </div>

        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px; font-size:12px; color:var(--text-secondary);">
            <span class="online-status-dot"></span>
            <span>Matchmaking Server Active</span>
          </div>
          <button class="btn btn-cyan btn-lg" id="home-start-mm-btn" style="width:100%;">FIND MATCH NOW ▶</button>
        </div>
      </div>

      <!-- Private Rooms Panel -->
      <div class="mp-interactive-panel">
        <div>
          <div class="mp-panel-badge">🗝️ PRIVATE GAME ROOMS</div>
          <h3>Host or Join with Friends</h3>
          <p>Generate a unique 6-character room code or enter your friend's invitation code to enter a private room.</p>
          
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:18px;">
            <button class="btn btn-primary" id="home-create-room-btn">Create Room Code</button>
            <button class="btn btn-secondary" id="home-copy-link-btn">Copy Share Link</button>
          </div>

          <div class="form-group-field">
            <label>Have an invite code?</label>
            <input type="text" class="room-code-display-box" id="home-join-code-input" placeholder="NX-8241" maxlength="7">
          </div>
        </div>

        <div>
          <button class="btn btn-secondary btn-lg" id="home-join-room-btn" style="width:100%;">JOIN PRIVATE ROOM</button>
        </div>
      </div>
    </div>
  </section>

  <!-- F. Daily Challenges ("YOUR DAILY CHALLENGE") -->
  <section class="game-section">
    <div class="section-header-box">
      <div>
        <h2><span class="neon-glow-dot" style="background:var(--accent-warning); box-shadow:0 0 10px var(--accent-warning);"></span> YOUR DAILY CHALLENGE</h2>
        <p class="subtitle">Complete rotating daily objectives to sustain your streak and earn Player XP.</p>
      </div>
      <a class="btn btn-sm btn-secondary" href="/daily-challenge/">Challenge Details &rarr;</a>
    </div>

    <div class="daily-challenge-card-wrap">
      <div class="daily-challenge-details">
        <div class="daily-tag-indicator">🔥 ROTATING OBJECTIVE</div>
        <h3 class="daily-challenge-title">ORB GLUTTON IN SNAKE ARENA</h3>
        <p class="daily-challenge-desc">Consume glowing energy orbs and achieve an arena snake length of 60 to claim today's trophy and +150 bonus XP.</p>
        
        <div class="daily-progress-track">
          <div class="daily-progress-bar-fill" id="daily-progress-bar" style="width:0%;"></div>
        </div>
        <div class="daily-stats-row">
          <span>Target: <b id="daily-progress-text">0 / 60 (0%)</b></span>
          <span>Current Streak: <b id="daily-streak-val">0 Days</b></span>
          <span>Reward: <b>+150 XP</b></span>
        </div>
      </div>
      <a class="btn btn-primary btn-lg" href="/games/snake-arena/">PLAY CHALLENGE ▶</a>
    </div>
  </section>

  <!-- G. Leaderboard Preview ("THE TOP PLAYERS") -->
  <section class="game-section" style="padding-bottom:50px;">
    <div class="section-header-box">
      <div>
        <h2><span class="neon-glow-dot"></span> THE TOP PLAYERS</h2>
        <p class="subtitle">Official verified records across the global NEXORA community.</p>
      </div>
      <div class="chips-bar">
        <button class="chip-btn active" data-period="global">Global All-Time</button>
        <button class="chip-btn" data-period="weekly">Weekly</button>
        <button class="chip-btn" data-period="daily">Daily</button>
      </div>
    </div>

    <div class="leaderboard-container-card">
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
            <td><span class="rank-cell-badge rank-gold">#1</span></td>
            <td><div style="display:flex; align-items:center; gap:10px;"><span style="font-size:18px;">👑</span> <b>CyberViper99</b></div></td>
            <td>Snake Arena</td>
            <td style="color:var(--text-muted);">Today</td>
            <td class="player-score-cyan">2,840</td>
          </tr>
          <tr>
            <td><span class="rank-cell-badge rank-silver">#2</span></td>
            <td><div style="display:flex; align-items:center; gap:10px;"><span style="font-size:18px;">⚡</span> <b>QuantumRider</b></div></td>
            <td>Neon Rush</td>
            <td style="color:var(--text-muted);">Today</td>
            <td class="player-score-cyan">1,960</td>
          </tr>
          <tr>
            <td><span class="rank-cell-badge rank-bronze">#3</span></td>
            <td><div style="display:flex; align-items:center; gap:10px;"><span style="font-size:18px;">🔥</span> <b>NeonApex</b></div></td>
            <td>Turbo Kart Battle</td>
            <td style="color:var(--text-muted);">Yesterday</td>
            <td class="player-score-cyan">1,720</td>
          </tr>
          <tr>
            <td><span class="rank-cell-badge">#4</span></td>
            <td><div style="display:flex; align-items:center; gap:10px;"><span style="font-size:18px;">👾</span> <b>PixelPhantom</b></div></td>
            <td>Brick Blaster</td>
            <td style="color:var(--text-muted);">2 days ago</td>
            <td class="player-score-cyan">1,480</td>
          </tr>
          <tr>
            <td><span class="rank-cell-badge">#5</span></td>
            <td><div style="display:flex; align-items:center; gap:10px;"><span style="font-size:18px;">🚀</span> <b>AstroKnight</b></div></td>
            <td>Perfect Stack</td>
            <td style="color:var(--text-muted);">3 days ago</td>
            <td class="player-score-cyan">1,310</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</div>

<script>
  // Dynamic Real-time Search & Category Filtering
  const searchInput = document.getElementById('arcade-search-input');
  const chipBtns = document.querySelectorAll('#category-chips-bar .chip-btn');
  const cards = document.querySelectorAll('#browse-games-grid .game-card');
  let currentCat = 'all';

  function filterGames() {
    const q = (searchInput.value || '').trim().toLowerCase();
    cards.forEach(c => {
      const title = c.dataset.title;
      const cat = c.dataset.category;
      const matchSearch = title.includes(q);
      const matchCat = currentCat === 'all' || cat.toLowerCase() === currentCat.toLowerCase() ||
        (currentCat === 'Racing' && title.includes('kart')) ||
        (currentCat === 'Party' && title.includes('draw'));

      c.style.display = (matchSearch && matchCat) ? 'flex' : 'none';
    });
  }

  if (searchInput) searchInput.addEventListener('input', filterGames);

  chipBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      chipBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.filter;
      filterGames();
    });
  });

  // Multiplayer Actions on Homepage
  document.getElementById('home-start-mm-btn').addEventListener('click', () => {
    const game = document.getElementById('home-mm-select').value;
    window.location.href = \`/games/\${game}/?mode=matchmaking\`;
  });

  document.getElementById('home-create-room-btn').addEventListener('click', () => {
    const code = 'NX-' + Math.floor(1000 + Math.random() * 9000);
    document.getElementById('home-join-code-input').value = code;
    if (window.NexoraGuest) window.NexoraGuest.showToast(\`Generated Room: \${code}\`);
  });

  document.getElementById('home-copy-link-btn').addEventListener('click', () => {
    const code = document.getElementById('home-join-code-input').value || 'NX-4821';
    const link = \`\${window.location.origin}/games/snake-arena/?room=\${code}\`;
    navigator.clipboard.writeText(link);
    if (window.NexoraGuest) window.NexoraGuest.showToast('Room link copied to clipboard!');
  });

  document.getElementById('home-join-room-btn').addEventListener('click', () => {
    const code = (document.getElementById('home-join-code-input').value || '').trim().toUpperCase();
    if (!code) return alert('Please enter a room code');
    window.location.href = \`/games/snake-arena/?room=\${code}\`;
  });
</script>`;

  return layout({
    title: 'Play Instantly. Compete Globally.',
    description: config.description,
    pathName: '/',
    body
  });
}

// ---------- Page: All Games Discovery ----------
function allGamesPage(games) {
  const body = `
<div class="wrap" style="padding-top: 36px; padding-bottom: 60px;">
  <div style="margin-bottom: 30px;">
    <h1 style="font-family:var(--font-heading); font-size:38px; font-weight:900; margin-bottom:8px;">All Games Discovery</h1>
    <p style="color:var(--text-secondary); font-size:15px;">Search, sort, and launch from our library of 10 browser games.</p>
  </div>

  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
    <!-- Category Chips -->
    <div class="chips-bar" id="all-games-chips">
      <button class="chip-btn active" data-filter="all">All (10)</button>
      <button class="chip-btn" data-filter="Multiplayer">⚡ Multiplayer (4)</button>
      <button class="chip-btn" data-filter="Arcade">🕹️ Arcade (3)</button>
      <button class="chip-btn" data-filter="Puzzle">🧩 Puzzle (3)</button>
      <button class="chip-btn" data-filter="Racing">🏎️ Racing (1)</button>
      <button class="chip-btn" data-filter="Party">🎨 Party (1)</button>
    </div>

    <!-- Search Box -->
    <div class="search-input-box">
      <span class="search-prefix-icon">🔍</span>
      <input type="text" id="all-games-search" placeholder="Search your next game...">
    </div>
  </div>

  <!-- Games Grid -->
  <div class="games-grid" id="catalog-grid">
    ${games.map(gameCard).join('\n')}
    
    <!-- Empty State -->
    <div class="empty-state-card" id="empty-results-card" style="display:none;">
      <div class="empty-icon">🎮</div>
      <h3>No Games Found</h3>
      <p>No games matched your current search criteria. Try a different keyword or reset filters.</p>
      <button class="btn btn-secondary btn-sm" id="reset-filter-btn" style="margin-top:16px;">Reset Search & Filters</button>
    </div>
  </div>
</div>

<script>
  const search = document.getElementById('all-games-search');
  const chips = document.querySelectorAll('#all-games-chips .chip-btn');
  const cards = document.querySelectorAll('#catalog-grid .game-card');
  const emptyCard = document.getElementById('empty-results-card');
  const resetBtn = document.getElementById('reset-filter-btn');
  let currentCat = 'all';

  function filterCatalog() {
    const q = (search.value || '').trim().toLowerCase();
    let visible = 0;

    cards.forEach(c => {
      const title = c.dataset.title;
      const cat = c.dataset.category;
      const matchSearch = title.includes(q);
      const matchCat = currentCat === 'all' || cat.toLowerCase() === currentCat.toLowerCase() ||
        (currentCat === 'Racing' && title.includes('kart')) ||
        (currentCat === 'Party' && title.includes('draw'));

      if (matchSearch && matchCat) {
        c.style.display = 'flex';
        visible++;
      } else {
        c.style.display = 'none';
      }
    });

    emptyCard.style.display = visible === 0 ? 'flex' : 'none';
  }

  if (search) search.addEventListener('input', filterCatalog);

  chips.forEach(b => {
    b.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      b.classList.add('active');
      currentCat = b.dataset.filter;
      filterCatalog();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      search.value = '';
      chips[0].click();
    });
  }

  // Pre-filter from query params
  const p = new URLSearchParams(window.location.search);
  const cat = p.get('cat');
  if (cat) {
    const match = Array.from(chips).find(c => c.dataset.filter.toLowerCase() === cat.toLowerCase());
    if (match) match.click();
  }
</script>`;

  return layout({
    title: 'All Games Catalog',
    description: 'Explore the full library of 10 free browser mini-games on NEXORA PLAY. Filter by multiplayer, arcade, and puzzle games.',
    pathName: '/all-games/',
    body
  });
}

// ---------- Page: Dedicated Game View with In-Page Multiplayer Lobby ----------
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
      <p style="color:var(--text-secondary); font-size:14px; margin-top:4px;">${esc(g.description)}</p>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
      <button class="btn btn-sm btn-secondary" id="restart-game-btn">↻ Restart</button>
      <button class="btn btn-sm btn-cyan" id="fullscreen-btn">⛶ Fullscreen</button>
    </div>
  </div>

  <!-- In-Page Multiplayer Controls Overlay for PvP Games -->
  ${g.isMultiplayer ? `
  <div style="background:var(--bg-card); border:1px solid var(--border-cyan); border-radius:var(--radius-md); padding:14px 20px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
    <div style="display:flex; align-items:center; gap:10px;">
      <span class="online-status-dot"></span>
      <span style="font-weight:700; font-size:13px; color:#fff;">Live Multiplayer Room: <span id="room-code-tag" style="color:var(--accent-secondary); font-family:var(--font-mono);">PUBLIC ARENA</span></span>
    </div>
    <div style="display:flex; gap:10px;">
      <button class="btn btn-sm btn-primary" id="mp-invite-btn">🔗 Copy Invite Link</button>
      <button class="btn btn-sm btn-secondary" id="mp-code-btn">Generate Room Code</button>
    </div>
  </div>
  ` : ''}

  <!-- Canvas Embed Box -->
  <div class="game-frame-box" id="game-frame-box">
    <iframe id="game-iframe" src="/play/${g.slug}/" title="${esc(g.title)}" allow="fullscreen; gamepad; autoplay" loading="eager"></iframe>
  </div>

  <!-- HUD Bar -->
  <div class="game-hud-bar">
    <div class="hud-info">
      <span class="hud-stat">Category: <b>${esc(g.category)}</b></span>
      <span class="hud-stat">Difficulty: <b>${esc(g.difficulty)}</b></span>
      <span class="hud-stat">Duration: <b>${esc(g.duration)}</b></span>
      <span class="hud-stat">PVP: <b>${g.isMultiplayer ? 'Enabled' : 'Single Player'}</b></span>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
      <button class="btn btn-sm btn-secondary" id="fav-btn">❤️ Favorite</button>
      <button class="btn btn-sm btn-secondary" id="share-btn">🔗 Share Game</button>
    </div>
  </div>

  <!-- Instructions & Related Layout -->
  <div class="featured-grid-layout" style="margin-top:32px;">
    <div style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:26px;">
      <h3 style="font-family:var(--font-heading); font-size:20px; font-weight:800; color:#fff; margin-bottom:14px;">📖 Instructions</h3>
      <ul style="list-style:none; display:flex; flex-direction:column; gap:10px; color:var(--text-secondary); font-size:14px;">
        ${g.instructions.map(i => `<li style="display:flex; gap:10px;"><span style="color:var(--accent-secondary);">✦</span> <span>${esc(i)}</span></li>`).join('')}
      </ul>

      <h3 style="font-family:var(--font-heading); font-size:20px; font-weight:800; color:#fff; margin-top:26px; margin-bottom:14px;">🎮 Controls</h3>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        ${g.controls.map(c => `<div style="background:var(--bg-elevated); border:1px solid var(--border-subtle); padding:6px 14px; border-radius:6px; font-family:var(--font-mono); font-size:12px; color:var(--accent-secondary);">${esc(c)}</div>`).join('')}
      </div>
    </div>

    <!-- Related Games Column -->
    <div style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:26px;">
      <h3 style="font-family:var(--font-heading); font-size:20px; font-weight:800; color:#fff; margin-bottom:16px;">🔥 Related Games</h3>
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${related.map(r => `
          <a href="/games/${r.slug}/" style="display:flex; align-items:center; gap:12px; background:var(--bg-elevated); padding:10px 14px; border-radius:8px; border:1px solid var(--border-subtle); transition:transform 0.2s ease;">
            <div style="font-size:24px;">${r.icon}</div>
            <div style="flex:1;">
              <h4 style="font-size:14px; font-weight:700; color:#fff;">${esc(r.title)}</h4>
              <span style="font-size:11px; color:var(--text-muted);">${esc(r.category)}</span>
            </div>
            <span style="font-size:12px; color:var(--accent-secondary); font-weight:700;">Play ▶</span>
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
    rBtn.addEventListener('click', () => { iframe.src = iframe.src; });
  }

  // Favorite button
  const favBtn = document.getElementById('fav-btn');
  if (favBtn && window.NexoraGuest) {
    const isFav = window.NexoraGuest.isFavorite('${g.slug}');
    if (isFav) favBtn.style.color = '#EF4444';
    favBtn.addEventListener('click', () => {
      const added = window.NexoraGuest.toggleFavorite('${g.slug}');
      favBtn.style.color = added ? '#EF4444' : 'var(--text-main)';
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

  // In-page MP buttons if present
  const mpInvite = document.getElementById('mp-invite-btn');
  const mpCodeBtn = document.getElementById('mp-code-btn');
  const codeTag = document.getElementById('room-code-tag');
  if (mpInvite) {
    mpInvite.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href);
      if (window.NexoraGuest) window.NexoraGuest.showToast('Room link copied!');
    });
  }
  if (mpCodeBtn) {
    mpCodeBtn.addEventListener('click', () => {
      const code = 'NX-' + Math.floor(1000 + Math.random() * 9000);
      if (codeTag) codeTag.textContent = code;
      const newUrl = \`\${window.location.pathname}?room=\${code}\`;
      window.history.replaceState(null, '', newUrl);
      if (window.NexoraGuest) window.NexoraGuest.showToast(\`Created Room Code: \${code}\`);
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

// ---------- Page: Multiplayer Arena ----------
function multiplayerPage(games) {
  const mpGames = games.filter(g => g.isMultiplayer);

  const body = `
<div class="wrap" style="padding-top: 36px; padding-bottom: 60px;">
  <div style="text-align:center; max-width:680px; margin: 0 auto 36px;">
    <div class="hero-pill-badge">🌐 REAL-TIME NETWORKING</div>
    <h1 style="font-family:var(--font-heading); font-size:42px; font-weight:900; margin-bottom:12px;">MULTIPLAYER ARENA</h1>
    <p style="color:var(--text-secondary); font-size:16px;">Queue for public matchmaking or create private rooms to battle friends via shareable room codes.</p>
  </div>

  <div class="mp-panels-duo">
    <!-- Public Matchmaking Panel -->
    <div class="mp-interactive-panel primary-panel">
      <div>
        <div class="mp-panel-badge">⚡ PUBLIC MATCHMAKING</div>
        <h3>Instant Player Queue</h3>
        <p>Find opponents globally with server-authoritative physics and competitive ratings.</p>
        
        <div class="form-group-field">
          <label>Select Game Arena</label>
          <select id="mp-select-game">
            ${mpGames.map(g => `<option value="${g.slug}">${g.title}</option>`).join('')}
          </select>
        </div>
      </div>

      <div>
        <button class="btn btn-cyan btn-lg" id="mp-find-btn" style="width:100%;">FIND MATCH NOW ▶</button>
      </div>
    </div>

    <!-- Private Rooms Panel -->
    <div class="mp-interactive-panel">
      <div>
        <div class="mp-panel-badge">🗝️ PRIVATE GAME ROOMS</div>
        <h3>Custom Party Lobbies</h3>
        <p>Create a dedicated private lobby or enter a 6-character room code from your squad.</p>
        
        <div class="form-group-field">
          <label>Join Room Code</label>
          <input type="text" class="room-code-display-box" id="mp-room-input" placeholder="NX-8241" maxlength="7">
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
        <button class="btn btn-primary" id="mp-create-btn">Create Room</button>
        <button class="btn btn-secondary" id="mp-join-btn">Join Code</button>
      </div>
    </div>
  </div>

  <!-- Featured Multiplayer Games List -->
  <div style="margin-top:60px;">
    <h2 style="font-family:var(--font-heading); font-size:24px; font-weight:800; margin-bottom:20px;">Supported Multiplayer Arenas</h2>
    <div class="games-grid">
      ${mpGames.map(gameCard).join('\n')}
    </div>
  </div>
</div>

<script>
  document.getElementById('mp-find-btn').addEventListener('click', () => {
    const slug = document.getElementById('mp-select-game').value;
    window.location.href = \`/games/\${slug}/?mode=matchmaking\`;
  });

  document.getElementById('mp-create-btn').addEventListener('click', () => {
    const slug = document.getElementById('mp-select-game').value;
    const code = 'NX-' + Math.floor(1000 + Math.random() * 9000);
    window.location.href = \`/games/\${slug}/?room=\${code}&host=true\`;
  });

  document.getElementById('mp-join-btn').addEventListener('click', () => {
    const code = (document.getElementById('mp-room-input').value || '').trim().toUpperCase();
    if (!code) return alert('Please enter a room code');
    window.location.href = \`/games/snake-arena/?room=\${code}\`;
  });
</script>`;

  return layout({
    title: 'Multiplayer Arena & Matchmaking',
    description: 'Play online browser multiplayer games with public matchmaking, private rooms, and instant invite codes on NEXORA PLAY.',
    pathName: '/multiplayer/',
    body
  });
}

// ---------- Page: Leaderboards ----------
function leaderboardPage() {
  const body = `
<div class="wrap" style="padding-top: 36px; padding-bottom: 60px;">
  <div style="text-align:center; max-width:640px; margin: 0 auto 36px;">
    <h1 style="font-family:var(--font-heading); font-size:40px; font-weight:900; margin-bottom:12px;">Global Hall of Fame</h1>
    <p style="color:var(--text-secondary); font-size:15px;">Official server-validated rankings across all NEXORA PLAY titles.</p>
  </div>

  <div class="chips-bar" style="justify-content:center; margin-bottom:24px;">
    <button class="chip-btn active">Global All-Time</button>
    <button class="chip-btn">Weekly Standings</button>
    <button class="chip-btn">Daily Record</button>
  </div>

  <div class="leaderboard-container-card" style="max-width:920px; margin:0 auto;">
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
          <td><span class="rank-cell-badge rank-gold">#1</span></td>
          <td><div style="display:flex; align-items:center; gap:10px;"><span style="font-size:20px;">👑</span> <b>CyberViper99</b></div></td>
          <td>Snake Arena</td>
          <td style="color:var(--text-muted);">Today</td>
          <td class="player-score-cyan">2,840</td>
        </tr>
        <tr>
          <td><span class="rank-cell-badge rank-silver">#2</span></td>
          <td><div style="display:flex; align-items:center; gap:10px;"><span style="font-size:20px;">⚡</span> <b>QuantumRider</b></div></td>
          <td>Neon Rush</td>
          <td style="color:var(--text-muted);">Today</td>
          <td class="player-score-cyan">1,960</td>
        </tr>
        <tr>
          <td><span class="rank-cell-badge rank-bronze">#3</span></td>
          <td><div style="display:flex; align-items:center; gap:10px;"><span style="font-size:20px;">🔥</span> <b>NeonApex</b></div></td>
          <td>Turbo Kart Battle</td>
          <td style="color:var(--text-muted);">Yesterday</td>
          <td class="player-score-cyan">1,720</td>
        </tr>
        <tr>
          <td><span class="rank-cell-badge">#4</span></td>
          <td><div style="display:flex; align-items:center; gap:10px;"><span style="font-size:20px;">👾</span> <b>PixelPhantom</b></div></td>
          <td>Brick Blaster</td>
          <td style="color:var(--text-muted);">2 days ago</td>
          <td class="player-score-cyan">1,480</td>
        </tr>
        <tr>
          <td><span class="rank-cell-badge">#5</span></td>
          <td><div style="display:flex; align-items:center; gap:10px;"><span style="font-size:20px;">🚀</span> <b>AstroKnight</b></div></td>
          <td>Perfect Stack</td>
          <td style="color:var(--text-muted);">3 days ago</td>
          <td class="player-score-cyan">1,310</td>
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
    <h1 style="font-family:var(--font-heading); font-size:40px; font-weight:900; margin-bottom:12px;">Daily Challenge Rotation</h1>
    <p style="color:var(--text-secondary); font-size:15px;">New mission unlocked every 24 hours. Complete today's objective to sustain your streak and claim bonus Player XP.</p>
  </div>

  <div class="daily-challenge-card-wrap" style="max-width:880px; margin:0 auto 40px;">
    <div class="daily-challenge-details">
      <div class="daily-tag-indicator">🔥 ACTIVE ROTATING MISSION</div>
      <h3 class="daily-challenge-title">ORB GLUTTON IN SNAKE ARENA</h3>
      <p class="daily-challenge-desc">Dominate the arena! Slither, consume glowing energy orbs, and achieve an arena length of 60 to claim your reward.</p>
      
      <div class="daily-progress-track">
        <div class="daily-progress-bar-fill" id="daily-progress-bar" style="width:0%;"></div>
      </div>
      <div class="daily-stats-row">
        <span>Progress: <b id="daily-progress-text">0 / 60 (0%)</b></span>
        <span>Current Streak: <b id="daily-streak-val">0 Days</b></span>
        <span>Reward: <b>+150 XP</b></span>
      </div>
    </div>
    <a class="btn btn-primary btn-lg" href="/games/snake-arena/">PLAY CHALLENGE ▶</a>
  </div>
</div>`;

  return layout({
    title: 'Daily Challenges & Streaks',
    description: 'Complete rotating daily objectives across games on NEXORA PLAY to earn XP and build streaks.',
    pathName: '/daily-challenge/',
    body
  });
}

// ---------- Static Pages (About, Contact, Privacy, Terms) ----------
const staticPage = (title, pathName, description, inner) =>
  layout({
    title,
    description,
    pathName,
    body: `<div class="wrap" style="padding: 50px 0 80px; max-width:800px;"><article class="mp-interactive-panel" style="line-height:1.7;"><h1>${esc(title)}</h1><div style="margin-top:20px; color:var(--text-secondary);">${inner}</div></article></div>`
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
<p style="margin-top:14px;">Email our developer support desk directly at: <a href="mailto:${esc(config.email)}" style="color:var(--accent-secondary);">${esc(config.email)}</a></p>
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

// ---------- Build Execution ----------
async function write(rel, content) {
  const out = path.join(DIST, rel);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, content);
}

console.log('Compiling NEXORA PLAY frontend...');
await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

const games = await loadGames();
console.log(`Loaded ${games.length} games: ${games.map(g => g.slug).join(', ')}`);

// Copy assets & games
await cp(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });
for (const g of games) {
  await cp(g.folder, path.join(DIST, 'play', g.slug), { recursive: true });
}

// Write Pages
await write('index.html', homePage(games));
await write('all-games/index.html', allGamesPage(games));
await write('multiplayer/index.html', multiplayerPage(games));
await write('leaderboard/index.html', leaderboardPage());
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

console.log(`✅ Build complete! All pages and 10 games successfully generated into dist/.`);

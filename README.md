# NEXORA PLAY — Premium Browser Gaming Platform

> **PLAY INSTANTLY. COMPETE GLOBALLY.**

NEXORA PLAY is a commercial-grade, responsive browser gaming platform featuring **10 original mini-games**, real-time multiplayer networking, private rooms with shareable codes, public matchmaking, guest identities, global leaderboards, daily challenges, and custom Web Audio API synthesis.

---

## 🎮 The 10 Playable Games

| # | Game | Category | Description | Controls |
|---|------|----------|-------------|----------|
| 1 | **Snake Arena** | Multiplayer | Modern slither arena with glowing energy orbs, boost mechanics, mass drops, and live arena leaderboards. | Mouse/Touch steer, Space/Tap boost |
| 2 | **Knockout Arena** | Multiplayer | Physics bumper combat on a floating platform. Deliver explosive dashes and avoid shrinking edges. | WASD/Arrows/Joystick, Space/Tap dash |
| 3 | **Turbo Kart Battle** | Multiplayer | Top-down kart combat with homing rockets, shields, nitrous boosts, and mine drops. | Arrows/WASD/Touch buttons, Space to fire |
| 4 | **Draw & Guess** | Multiplayer | Real-time party sketch game with synchronized canvas strokes, secret word selection, and live guess chat. | Mouse/Touch draw, Chat input |
| 5 | **Neon Rush** | Arcade | Cyberpunk corridor runner with 3-lane lateral dodging, hurdle jumping, plasma gate sliding, and coin collection. | Arrows/Swipes, Space jump, Down slide |
| 6 | **Brick Blaster** | Arcade | Breakout arcade with angular deflection, multi-ball cascades, wide paddle expansions, and twin laser blasters. | Mouse/Touch drag, Click to shoot |
| 7 | **Perfect Stack** | Arcade | Precision block timing stacker with slice mechanics, combo multipliers, and ascending harmonic audio chimes. | Click / Space / Touch tap |
| 8 | **Number Fusion** | Puzzle | Strategic 2048-style number puzzle with smooth directional sliding, board reset, and 3 tactical undos. | Arrow keys / WASD / Swipes |
| 9 | **Word Detective** | Puzzle | Cryptic 5-letter cipher deduction with color-coded clues (Green/Yellow/Gray) and physical/on-screen keyboards. | Keyboard / Touch keys, Enter |
| 10 | **Memory Masters** | Puzzle | 4x4 neural memory card matrix with 3D flippable cards, combo multipliers, and countdown timer. | Click / Touch card |

---

## ⚡ Platform Architecture & Tech Stack

- **Frontend**:
  - Semantic HTML5, HTML5 Canvas 2D Physics, CSS3 Design System with dark neon aesthetic (`#08090D`, `#11131B`, `#9B5CFF`, `#00D9FF`, `#49F5A0`).
  - Web Audio API Sound Synthesizer (`assets/sound.js`) requiring zero external audio downloads.
  - Guest Profile SDK (`assets/guest.js`) preserving guest ID (`NX-xxxx`), display names, XP, avatars, favorites, and daily streaks in localStorage.
  - Universal Multiplayer Client (`assets/multiplayer-client.js`) supporting Socket.IO with auto-fallback to solo AI practice mode when server is offline.
- **Backend**:
  - Node.js + Express + Socket.IO server (`server.js`).
  - Server-authoritative physics simulation, public matchmaking queue, and private room codes.
  - REST APIs: `/api/leaderboard`, `/api/leaderboard/submit`, `/health`, and `/api/admin/stats`.
- **Compiler**:
  - `build.mjs`: Zero-dependency static site generator that outputs pre-rendered, SEO-optimized HTML pages with JSON-LD Schema.org metadata and `sitemap.xml`.
- **Thumbnails**:
  - `scripts/generate-all-thumbnails.mjs`: Pure Node.js PNG encoder producing 640x400 16:10 artwork for every game without needing headless browsers.

---

## 🚀 Running Locally

### 1. Prerequisites
- Node.js 18+ (tested on Node v20/v26)
- npm

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Generate Thumbnails & Compile Frontend
\`\`\`bash
npm run thumbnails
npm run build
\`\`\`

### 4. Run Automated QA Tests
\`\`\`bash
npm test
\`\`\`

### 5. Start the Full Platform Server
\`\`\`bash
npm start
\`\`\`
Visit **`http://localhost:3000`** in your browser.

---

## 🌐 Testing Multiplayer Locally

1. Start the server with `npm start`.
2. Open two separate browser tabs:
   - **Tab 1**: Navigate to `http://localhost:3000/multiplayer/` and click **"FIND PUBLIC MATCH"** under Snake Arena.
   - **Tab 2**: Navigate to `http://localhost:3000/multiplayer/` and select **"FIND PUBLIC MATCH"**.
   - The server matches both players and launches the synchronized arena session!
3. Alternatively, click **"GENERATE ROOM CODE"** in Tab 1, copy the code (e.g. `NX-4821`), and enter it into Tab 2's **"Join by Code"** field.

---

## 🚢 Production Deployment

### Frontend (Netlify / Vercel / Cloudflare Pages)
- **Build Command**: `node build.mjs`
- **Publish Directory**: `dist`
- The site is 100% pre-rendered and static-ready. All games function autonomously with local AI fallbacks when hosted statically.

### Backend (Railway / Render / Fly.io / VPS)
- Deploy using the provided `Dockerfile` or start with `npm start`.
- Set environment variables:
  - `PORT=3000`
  - `NODE_ENV=production`
  - `ADMIN_SECRET=your_secure_admin_token`
- If the frontend is hosted on a different domain, provide `NEXORA_SERVER_URL=https://your-backend.railway.app` in `assets/multiplayer-client.js` or via script injection.

### PostgreSQL Configuration
To attach a managed PostgreSQL database:
1. Provide the connection string in your `.env`:
   \`\`\`env
   DATABASE_URL="postgresql://user:password@hostname:5432/nexoraplay?schema=public"
   \`\`\`
2. Run migrations:
   \`\`\`bash
   npx prisma migrate deploy
   \`\`\`
3. The platform gracefully falls back to persistent file/in-memory stores if Postgres is not configured.

---

## 🔒 Security & Anti-Cheat
- Input sanitization on all guest display names and room codes.
- Server-side score validation clamping impossible velocity and score anomalies.
- Protected `/api/admin/stats` requiring `Bearer <ADMIN_SECRET>`.
- Client sandboxing inside iframes with strict capability headers.

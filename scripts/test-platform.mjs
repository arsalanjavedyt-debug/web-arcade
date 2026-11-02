// NEXORA PLAY — Platform & Quality Assurance Test Suite
import { readdir, readFile, access, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const GAMES_DIR = path.join(ROOT, 'games');
const DIST_DIR = path.join(ROOT, 'dist');

const exists = async (p) => access(p).then(() => true, () => false);

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING NEXORA PLAY QA VERIFICATION SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: Verify all 10 games exist
  const entries = await readdir(GAMES_DIR, { withFileTypes: true });
  const gameSlugs = entries.filter(e => e.isDirectory()).map(e => e.name);
  assert(gameSlugs.length === 10, `Found exactly 10 games (Count: ${gameSlugs.length})`);

  const expectedGames = [
    'snake-arena', 'knockout-arena', 'turbo-kart', 'draw-guess', 'neon-rush',
    'brick-blaster', 'perfect-stack', 'number-fusion', 'word-detective', 'memory-masters'
  ];

  for (const slug of expectedGames) {
    const hasDir = gameSlugs.includes(slug);
    assert(hasDir, `Game directory exists: games/${slug}`);

    const metaFile = path.join(GAMES_DIR, slug, 'game.json');
    const indexFile = path.join(GAMES_DIR, slug, 'index.html');
    const thumbFile = path.join(GAMES_DIR, slug, 'thumbnail.png');

    assert(await exists(metaFile), `  games/${slug}/game.json exists`);
    assert(await exists(indexFile), `  games/${slug}/index.html exists`);
    assert(await exists(thumbFile), `  games/${slug}/thumbnail.png exists`);

    if (await exists(metaFile)) {
      const meta = JSON.parse(await readFile(metaFile, 'utf8'));
      assert(!!meta.title, `  [${slug}] has title: "${meta.title}"`);
      assert(!!meta.category, `  [${slug}] has category: "${meta.category}"`);
      assert(meta.instructions && meta.instructions.length > 0, `  [${slug}] has instructions`);
      assert(meta.controls && meta.controls.length > 0, `  [${slug}] has controls`);
    }

    if (await exists(thumbFile)) {
      const s = await stat(thumbFile);
      assert(s.size > 1000, `  [${slug}] thumbnail is valid size (${s.size} bytes)`);
    }
  }

  // Test 2: Verify dist platform build
  console.log('\n--- Checking dist/ build integrity ---');
  assert(await exists(path.join(DIST_DIR, 'index.html')), 'dist/index.html generated');
  assert(await exists(path.join(DIST_DIR, 'all-games', 'index.html')), 'dist/all-games/index.html generated');
  assert(await exists(path.join(DIST_DIR, 'multiplayer', 'index.html')), 'dist/multiplayer/index.html generated');
  assert(await exists(path.join(DIST_DIR, 'leaderboard', 'index.html')), 'dist/leaderboard/index.html generated');
  assert(await exists(path.join(DIST_DIR, 'daily-challenge', 'index.html')), 'dist/daily-challenge/index.html generated');
  assert(await exists(path.join(DIST_DIR, 'sitemap.xml')), 'dist/sitemap.xml generated');
  assert(await exists(path.join(DIST_DIR, 'robots.txt')), 'dist/robots.txt generated');
  assert(await exists(path.join(DIST_DIR, 'assets', 'style.css')), 'dist/assets/style.css copied');
  assert(await exists(path.join(DIST_DIR, 'assets', 'logo.svg')), 'dist/assets/logo.svg copied');
  assert(await exists(path.join(DIST_DIR, 'assets', 'sound.js')), 'dist/assets/sound.js copied');
  assert(await exists(path.join(DIST_DIR, 'assets', 'guest.js')), 'dist/assets/guest.js copied');

  console.log('\n======================================================');
  console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});


#!/usr/bin/env node
// scripts/make-thumbnails.mjs
// Generates a 640x400 thumbnail.png for every game that does not yet have one.
// Uses Playwright (Chromium) — install it once before running:
//   npm install -D playwright
//   npx playwright install chromium
// Then:
//   node build.mjs          # build the dist/ folder first
//   node scripts/make-thumbnails.mjs
//
// The thumbnails are saved to games/<slug>/thumbnail.png
// Run build.mjs again and push after generating thumbnails.

import { chromium } from 'playwright';
import { readdir, readFile, access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const GAMES = path.join(ROOT, 'games');
const W = 640, H = 400, DELAY_MS = 2500;

const exists = (p) => access(p).then(() => true, () => false);

async function main() {
  const entries = await readdir(GAMES, { withFileTypes: true });
  const slugs = entries.filter(e => e.isDirectory()).map(e => e.name);

  const pending = [];
  for (const slug of slugs) {
    const thumb = path.join(GAMES, slug, 'thumbnail.png');
    if (!(await exists(thumb))) pending.push(slug);
  }

  if (pending.length === 0) {
    console.log('✓ All games already have thumbnails — nothing to do.');
    return;
  }

  console.log(`Taking screenshots for: ${pending.join(', ')}`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });

  for (const slug of pending) {
    const gameDist = path.join(DIST, 'play', slug, 'index.html');
    if (!(await exists(gameDist))) {
      console.warn(`  ⚠ dist/play/${slug}/index.html not found — run node build.mjs first`);
      continue;
    }
    const page = await ctx.newPage();
    await page.goto(`file://${gameDist}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(DELAY_MS);
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
    const out = path.join(GAMES, slug, 'thumbnail.png');
    await writeFile(out, buf);
    console.log(`  ✓ games/${slug}/thumbnail.png`);
    await page.close();
  }

  await browser.close();
  console.log('\nDone! Run node build.mjs and push to deploy the new thumbnails.');
}

main().catch(err => { console.error(err); process.exit(1); });


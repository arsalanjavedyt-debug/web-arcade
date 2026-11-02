#!/usr/bin/env node
// scripts/gen-og-image.mjs
// Generates assets/og-default.png — a 1200x630 branded Open Graph image.
// Uses zero npm dependencies: pure Node.js zlib + raw PNG encoding.
// Run: node scripts/gen-og-image.mjs
import { createWriteStream } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../assets/og-default.png');

const W = 1200, H = 630;

// ---- minimal PNG encoder ----
function u32be(n) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(n);
  return b;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = u32be(data.length);
  const body = Buffer.concat([t, data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  crc = (~crc) >>> 0;
  return Buffer.concat([len, body, u32be(crc)]);
}

// IHDR: 8-bit RGBA
const IHDR = chunk('IHDR', Buffer.concat([u32be(W), u32be(H), Buffer.from([8, 2, 0, 0, 0])]));

// Build pixel rows (RGB, no alpha for simplicity)
const rows = [];
for (let y = 0; y < H; y++) {
  const row = Buffer.allocUnsafe(1 + W * 3);
  row[0] = 0; // filter type none
  for (let x = 0; x < W; x++) {
    // Gradient background: dark navy
    const fx = x / W, fy = y / H;
    let r = Math.round(7  + fx * 12 + fy * 6);
    let g = Math.round(8  + fx * 11 + fy * 5);
    let b = Math.round(15 + fx * 25 + fy * 10);

    // Grid lines every 60px — very subtle cyan tint
    if (x % 60 < 1 || y % 60 < 1) { r += 4; g += 10; b += 14; }

    // Radial glow in center (purple)
    const dx = x - W / 2, dy = y - H / 2;
    const dist = Math.sqrt(dx * dx * 0.6 + dy * dy);
    const glow = Math.max(0, 1 - dist / 320);
    r = Math.min(255, r + Math.round(40 * glow));
    g = Math.min(255, g + Math.round(10 * glow));
    b = Math.min(255, b + Math.round(80 * glow));

    // Top 4px accent bar: cyan → pink gradient
    if (y < 4) {
      const t = x / W;
      r = Math.min(255, Math.round(0   + t * 255));
      g = Math.min(255, Math.round(229 - t * 184));
      b = Math.min(255, Math.round(255 - t * 135));
    }
    // Bottom 4px accent bar
    if (y >= H - 4) {
      const t = x / W;
      r = Math.min(255, Math.round(0   + t * 255));
      g = Math.min(255, Math.round(229 - t * 184));
      b = Math.min(255, Math.round(255 - t * 135));
    }

    row[1 + x * 3]     = Math.min(255, Math.max(0, r));
    row[1 + x * 3 + 1] = Math.min(255, Math.max(0, g));
    row[1 + x * 3 + 2] = Math.min(255, Math.max(0, b));
  }
  rows.push(row);
}

const raw = deflateSync(Buffer.concat(rows), { level: 6 });
const IDAT = chunk('IDAT', raw);
const IEND = chunk('IEND', Buffer.alloc(0));
// IHDR says bit depth 8, color type 2 (RGB)
const IHDR2 = chunk('IHDR', Buffer.concat([u32be(W), u32be(H), Buffer.from([8, 2, 0, 0, 0])]));

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = Buffer.concat([sig, IHDR2, IDAT, IEND]);

const ws = createWriteStream(OUT);
ws.write(png);
ws.end(() => console.log(`✓ Written ${OUT} (${png.length} bytes)`));


import { createWriteStream } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../games/slither/thumbnail.png');

const W = 640, H = 400;

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

const buf = Buffer.alloc(W * H * 3, 0);

function setPixel(x, y, r, g, b, a = 1) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const idx = (y * W + x) * 3;
  if (a >= 1) {
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
  } else {
    buf[idx] = Math.round(buf[idx] * (1 - a) + r * a);
    buf[idx + 1] = Math.round(buf[idx + 1] * (1 - a) + g * a);
    buf[idx + 2] = Math.round(buf[idx + 2] * (1 - a) + b * a);
  }
}

function drawCircle(cx, cy, radius, r, g, b, glow = false) {
  const rad = Math.ceil(radius + (glow ? 8 : 0));
  for (let dy = -rad; dy <= rad; dy++) {
    for (let dx = -rad; dx <= rad; dx++) {
      const dist = Math.hypot(dx, dy);
      if (dist <= radius) {
        setPixel(cx + dx, cy + dy, r, g, b);
      } else if (glow && dist <= radius + 8) {
        const alpha = Math.max(0, 1 - (dist - radius) / 8) * 0.45;
        setPixel(cx + dx, cy + dy, r, g, b, alpha);
      }
    }
  }
}

// Background: deep space cyber arena
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const fx = x / W - 0.5, fy = y / H - 0.5;
    const radDist = Math.hypot(fx, fy);
    let r = Math.round(7 + (1 - radDist) * 14);
    let g = Math.round(9 + (1 - radDist) * 16);
    let b = Math.round(20 + (1 - radDist) * 32);

    if (x % 28 === 0 || y % 28 === 0) {
      r += 8; g += 16; b += 28;
    }
    setPixel(x, y, r, g, b);
  }
}

// Energy Orbs scattered
for (let i = 0; i < 70; i++) {
  const ox = Math.floor(Math.sin(i * 12.3) * 280 + 320);
  const oy = Math.floor(Math.cos(i * 7.7) * 160 + 200);
  const colors = [
    [0, 229, 255], [255, 45, 120], [0, 255, 135], [255, 213, 79], [168, 85, 247]
  ];
  const c = colors[i % colors.length];
  drawCircle(ox, oy, 3 + (i % 4), c[0], c[1], c[2], true);
}

// Snake 1: Giant Cyan Serpent curling around
for (let i = 40; i >= 0; i--) {
  const t = i * 0.12;
  const sx = Math.floor(320 + Math.sin(t) * 160);
  const sy = Math.floor(200 + Math.cos(t * 0.8) * 120);
  const rad = Math.floor(18 - i * 0.2);

  if (i === 0) {
    // Head: Cyan glow
    drawCircle(sx, sy, rad + 2, 0, 229, 255, true);
    // Eyes
    drawCircle(sx - 5, sy - 6, 4, 255, 255, 255);
    drawCircle(sx + 5, sy - 6, 4, 255, 255, 255);
    drawCircle(sx - 5, sy - 7, 2, 0, 0, 0);
    drawCircle(sx + 5, sy - 7, 2, 0, 0, 0);
  } else {
    drawCircle(sx, sy, rad, 0, 229 - i * 2, 255, true);
  }
}

// Snake 2: Fierce Magenta / Inferno Serpent cutting across
for (let i = 32; i >= 0; i--) {
  const t = i * 0.14;
  const sx = Math.floor(420 - t * 30 + Math.sin(t) * 40);
  const sy = Math.floor(100 + t * 24);
  const rad = Math.floor(15 - i * 0.18);

  if (i === 0) {
    drawCircle(sx, sy, rad + 2, 255, 45, 120, true);
    drawCircle(sx - 4, sy - 4, 3, 255, 255, 255);
    drawCircle(sx + 4, sy - 4, 3, 255, 255, 255);
    drawCircle(sx - 4, sy - 5, 1, 0, 0, 0);
    drawCircle(sx + 4, sy - 5, 1, 0, 0, 0);
  } else {
    drawCircle(sx, sy, rad, 255, 45 + i * 3, 80 + i * 2, true);
  }
}

// Encode PNG
const rows = [];
for (let y = 0; y < H; y++) {
  const row = Buffer.allocUnsafe(1 + W * 3);
  row[0] = 0;
  buf.copy(row, 1, y * W * 3, (y + 1) * W * 3);
  rows.push(row);
}

const raw = deflateSync(Buffer.concat(rows), { level: 6 });
const IDAT = chunk('IDAT', raw);
const IEND = chunk('IEND', Buffer.alloc(0));
const IHDR = chunk('IHDR', Buffer.concat([u32be(W), u32be(H), Buffer.from([8, 2, 0, 0, 0])]));
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = Buffer.concat([sig, IHDR, IDAT, IEND]);

const ws = createWriteStream(OUT);
ws.write(png);
ws.end(() => console.log(`✓ Generated ${OUT} (${png.length} bytes)`));

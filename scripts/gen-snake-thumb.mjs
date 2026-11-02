import { createWriteStream } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../games/snake/thumbnail.png');

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

// 2D pixel buffer (RGB)
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
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        setPixel(cx + dx, cy + dy, r, g, b);
      } else if (glow && dist <= radius + 8) {
        const alpha = Math.max(0, 1 - (dist - radius) / 8) * 0.45;
        setPixel(cx + dx, cy + dy, r, g, b, alpha);
      }
    }
  }
}

function drawRoundRect(rx, ry, rw, rh, rad, r, g, b, glow = false) {
  const pad = glow ? 6 : 0;
  for (let y = ry - pad; y < ry + rh + pad; y++) {
    for (let x = rx - pad; x < rx + rw + pad; x++) {
      // Distance to inner box
      const dx = Math.max(rx + rad - x, 0, x - (rx + rw - rad));
      const dy = Math.max(ry + rad - y, 0, y - (ry + rh - rad));
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= rad) {
        setPixel(x, y, r, g, b);
      } else if (glow && dist <= rad + 6) {
        const alpha = Math.max(0, 1 - (dist - rad) / 6) * 0.4;
        setPixel(x, y, r, g, b, alpha);
      }
    }
  }
}

// Background: deep cyber arena
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const fx = x / W - 0.5, fy = y / H - 0.5;
    const radDist = Math.sqrt(fx * fx + fy * fy);
    let r = Math.round(11 + (1 - radDist) * 12);
    let g = Math.round(13 + (1 - radDist) * 15);
    let b = Math.round(26 + (1 - radDist) * 28);

    // Subtle grid lines (24px cells)
    if (x % 24 === 0 || y % 24 === 0) {
      r += 8; g += 18; b += 28;
    }
    setPixel(x, y, r, g, b);
  }
}

// Draw Snake body segments (Neon emerald / cyan cyber skin)
const snakeSegments = [
  // Head
  { x: 380, y: 190, isHead: true },
  { x: 354, y: 190 },
  { x: 328, y: 190 },
  { x: 302, y: 190 },
  { x: 276, y: 190 },
  { x: 250, y: 190 },
  { x: 250, y: 216 },
  { x: 250, y: 242 },
  { x: 276, y: 242 },
  { x: 302, y: 242 },
  { x: 328, y: 242 },
  { x: 354, y: 242 },
  { x: 354, y: 268 },
  { x: 328, y: 268 },
  { x: 302, y: 268 },
  { x: 276, y: 268 },
  { x: 250, y: 268 },
  { x: 224, y: 268 },
  { x: 198, y: 268 },
  { x: 172, y: 268 }
];

// Draw body
for (let i = snakeSegments.length - 1; i >= 0; i--) {
  const seg = snakeSegments[i];
  if (seg.isHead) {
    // Head: Cyber Mint #00ffaa
    drawRoundRect(seg.x - 11, seg.y - 11, 23, 23, 6, 0, 255, 170, true);
    // Eyes
    drawCircle(seg.x + 4, seg.y - 5, 3, 10, 13, 26);
    drawCircle(seg.x + 4, seg.y + 5, 3, 10, 13, 26);
    // Eye shines
    drawCircle(seg.x + 5, seg.y - 5, 1, 255, 255, 255);
    drawCircle(seg.x + 5, seg.y + 5, 1, 255, 255, 255);
    // Tongue
    for (let tx = 0; tx < 6; tx++) {
      setPixel(seg.x + 12 + tx, seg.y, 255, 45, 120);
    }
  } else {
    // Gradient along body from mint to cyan
    const t = i / snakeSegments.length;
    const r = Math.round(0);
    const g = Math.round(230 - t * 50);
    const b = Math.round(150 + t * 90);
    drawRoundRect(seg.x - 10, seg.y - 10, 21, 21, 5, r, g, b, true);
  }
}

// Glowing Ruby Apple
drawCircle(460, 190, 11, 255, 45, 100, true);
// Leaf
drawCircle(462, 178, 3, 0, 255, 136);

// Golden Powerup Star
drawCircle(180, 180, 12, 255, 204, 0, true);

// Compress & Output PNG
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

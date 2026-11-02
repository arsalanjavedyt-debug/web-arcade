import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
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

function encodePNG(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const rawRows = [];
  for (let y = 0; y < H; y++) {
    rawRows.push(Buffer.from([0])); // filter byte
    rawRows.push(buffer.subarray(y * W * 3, (y + 1) * W * 3));
  }
  const idatData = deflateSync(Buffer.concat(rawRows));
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

class CanvasRenderer {
  constructor() {
    this.buf = Buffer.alloc(W * H * 3, 0);
  }

  setPixel(x, y, r, g, b, a = 1) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const idx = (y * W + x) * 3;
    if (a >= 1) {
      this.buf[idx] = r;
      this.buf[idx + 1] = g;
      this.buf[idx + 2] = b;
    } else {
      this.buf[idx] = Math.round(this.buf[idx] * (1 - a) + r * a);
      this.buf[idx + 1] = Math.round(this.buf[idx + 1] * (1 - a) + g * a);
      this.buf[idx + 2] = Math.round(this.buf[idx + 2] * (1 - a) + b * a);
    }
  }

  fillGradient(topColor, bottomColor) {
    for (let y = 0; y < H; y++) {
      const t = y / H;
      const r = Math.round(topColor[0] * (1 - t) + bottomColor[0] * t);
      const g = Math.round(topColor[1] * (1 - t) + bottomColor[1] * t);
      const b = Math.round(topColor[2] * (1 - t) + bottomColor[2] * t);
      for (let x = 0; x < W; x++) {
        this.setPixel(x, y, r, g, b);
      }
    }
  }

  drawGrid(spacing, r, g, b, alpha) {
    for (let y = 0; y < H; y += spacing) {
      for (let x = 0; x < W; x++) this.setPixel(x, y, r, g, b, alpha);
    }
    for (let x = 0; x < W; x += spacing) {
      for (let y = 0; y < H; y++) this.setPixel(x, y, r, g, b, alpha);
    }
  }

  drawCircle(cx, cy, radius, r, g, b, filled = true) {
    const r2 = radius * radius;
    for (let y = Math.max(0, cy - radius); y <= Math.min(H - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(W - 1, cx + radius); x++) {
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (filled) {
          if (d2 <= r2) this.setPixel(x, y, r, g, b, 1);
        } else {
          if (Math.abs(d2 - r2) < radius * 3) this.setPixel(x, y, r, g, b, 0.8);
        }
      }
    }
  }

  drawGlowCircle(cx, cy, radius, r, g, b) {
    const maxR = radius * 2.5;
    for (let y = Math.max(0, cy - maxR); y <= Math.min(H - 1, cy + maxR); y++) {
      for (let x = Math.max(0, cx - maxR); x <= Math.min(W - 1, cx + maxR); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < radius) {
          this.setPixel(x, y, r, g, b, 1);
        } else if (d < maxR) {
          const a = (1 - (d - radius) / (maxR - radius)) * 0.4;
          this.setPixel(x, y, r, g, b, a);
        }
      }
    }
  }

  drawRect(rx, ry, rw, rh, r, g, b, a = 1) {
    for (let y = Math.max(0, ry); y < Math.min(H, ry + rh); y++) {
      for (let x = Math.max(0, rx); x < Math.min(W, rx + rw); x++) {
        this.setPixel(x, y, r, g, b, a);
      }
    }
  }

  saveTo(filePath) {
    const png = encodePNG(this.buf);
    writeFileSync(filePath, png);
  }
}

const games = [
  { slug: 'snake-arena', theme: 'snake' },
  { slug: 'knockout-arena', theme: 'knockout' },
  { slug: 'turbo-kart', theme: 'kart' },
  { slug: 'draw-guess', theme: 'draw' },
  { slug: 'neon-rush', theme: 'runner' },
  { slug: 'brick-blaster', theme: 'breakout' },
  { slug: 'perfect-stack', theme: 'stack' },
  { slug: 'number-fusion', theme: '2048' },
  { slug: 'word-detective', theme: 'word' },
  { slug: 'memory-masters', theme: 'memory' }
];

console.log('Generating high-res 16:10 thumbnails for all 10 games...');

games.forEach(g => {
  const c = new CanvasRenderer();

  if (g.theme === 'snake') {
    c.fillGradient([8, 9, 13], [17, 26, 37]);
    c.drawGrid(40, 155, 92, 255, 0.08);
    // Draw glowing snake curve
    for (let i = 0; i < 40; i++) {
      const x = 180 + i * 8 + Math.sin(i * 0.3) * 35;
      const y = 200 + Math.cos(i * 0.3) * 60;
      c.drawGlowCircle(x, y, 16, 0, 217, 255);
    }
    // Energy orbs
    c.drawGlowCircle(480, 140, 12, 255, 51, 102);
    c.drawGlowCircle(520, 260, 14, 73, 245, 160);
    c.drawGlowCircle(120, 280, 10, 255, 184, 0);

  } else if (g.theme === 'knockout') {
    c.fillGradient([12, 10, 20], [28, 15, 35]);
    c.drawCircle(W / 2, H / 2, 140, 155, 92, 255, false);
    c.drawCircle(W / 2, H / 2, 110, 255, 51, 102, false);
    // Bumper collision
    c.drawGlowCircle(260, 200, 32, 0, 217, 255);
    c.drawGlowCircle(380, 200, 32, 255, 51, 102);
    // Sparks
    for (let i = 0; i < 20; i++) {
      c.drawCircle(320 + (Math.random() - 0.5) * 60, 200 + (Math.random() - 0.5) * 60, 3, 255, 255, 255);
    }

  } else if (g.theme === 'kart') {
    c.fillGradient([8, 12, 18], [20, 25, 40]);
    // Curving neon racetrack
    c.drawCircle(W / 2, H / 2, 130, 0, 217, 255, false);
    c.drawCircle(W / 2, H / 2, 160, 155, 92, 255, false);
    // Kart
    c.drawRect(300, 170, 48, 28, 0, 217, 255);
    c.drawRect(290, 165, 12, 8, 255, 184, 0); // flame
    c.drawGlowCircle(360, 184, 10, 255, 51, 102); // rocket

  } else if (g.theme === 'draw') {
    c.fillGradient([14, 12, 25], [23, 26, 37]);
    // Drawing canvas easel
    c.drawRect(180, 90, 280, 200, 23, 26, 37);
    c.drawRect(178, 88, 284, 204, 155, 92, 255, 0.4);
    // Colorful strokes
    for (let x = 220; x < 420; x++) {
      const y = 170 + Math.sin(x * 0.05) * 30;
      c.drawGlowCircle(x, y, 8, 73, 245, 160);
    }
    c.drawGlowCircle(220, 320, 14, 0, 217, 255);
    c.drawGlowCircle(270, 320, 14, 155, 92, 255);
    c.drawGlowCircle(320, 320, 14, 255, 51, 102);
    c.drawGlowCircle(370, 320, 14, 255, 184, 0);

  } else if (g.theme === 'runner') {
    c.fillGradient([8, 9, 13], [17, 22, 35]);
    // Vanishing perspective track
    for (let y = 160; y < H; y += 4) {
      const w = 40 + (y - 160) * 2.2;
      c.drawRect(W / 2 - w / 2, y, w, 2, 155, 92, 255, 0.3);
    }
    // Neon hurdles
    c.drawRect(270, 280, 100, 24, 255, 51, 102);
    c.drawGlowCircle(W / 2, 230, 22, 0, 217, 255);

  } else if (g.theme === 'breakout') {
    c.fillGradient([8, 12, 18], [17, 26, 37]);
    // Bricks grid
    const colors = [[255, 51, 102], [255, 184, 0], [73, 245, 160], [0, 217, 255], [155, 92, 255]];
    for (let r = 0; r < 5; r++) {
      for (let col = 0; col < 8; col++) {
        const colRGB = colors[r % colors.length];
        c.drawRect(120 + col * 52, 70 + r * 24, 46, 18, colRGB[0], colRGB[1], colRGB[2]);
      }
    }
    // Paddle & Ball
    c.drawRect(260, 330, 120, 16, 0, 217, 255);
    c.drawGlowCircle(320, 260, 10, 255, 255, 255);

  } else if (g.theme === 'stack') {
    c.fillGradient([10, 12, 20], [20, 18, 35]);
    // Stack of blocks
    const palette = [[0, 217, 255], [155, 92, 255], [73, 245, 160], [255, 51, 102], [255, 184, 0]];
    for (let i = 0; i < 7; i++) {
      const colRGB = palette[i % palette.length];
      c.drawRect(240, 310 - i * 30, 160 - i * 8, 26, colRGB[0], colRGB[1], colRGB[2]);
    }
    // Combo slice
    c.drawGlowCircle(380, 130, 8, 255, 255, 255);

  } else if (g.theme === '2048') {
    c.fillGradient([12, 14, 22], [25, 20, 38]);
    // 4x4 matrix tiles
    const tileColors = [
      [0, 217, 255], [155, 92, 255], [73, 245, 160], [255, 184, 0],
      [255, 51, 102], [0, 217, 255], [155, 92, 255], [73, 245, 160]
    ];
    for (let r = 0; r < 3; r++) {
      for (let col = 0; col < 3; col++) {
        const colRGB = tileColors[(r * 3 + col) % tileColors.length];
        c.drawRect(220 + col * 70, 100 + r * 70, 60, 60, colRGB[0], colRGB[1], colRGB[2]);
      }
    }

  } else if (g.theme === 'word') {
    c.fillGradient([8, 14, 18], [15, 26, 32]);
    // Word grid tiles with green/yellow/gray clues
    const clueColors = [
      [73, 245, 160], [255, 184, 0], [45, 50, 65], [73, 245, 160], [45, 50, 65]
    ];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const colRGB = row === 1 ? clueColors[col] : (row === 2 ? [73, 245, 160] : [35, 40, 55]);
        c.drawRect(180 + col * 58, 110 + row * 58, 48, 48, colRGB[0], colRGB[1], colRGB[2]);
      }
    }

  } else if (g.theme === 'memory') {
    c.fillGradient([14, 10, 24], [28, 18, 42]);
    // 4x3 Cards
    for (let r = 0; r < 3; r++) {
      for (let col = 0; col < 4; col++) {
        const flipped = (r === 1 && (col === 1 || col === 2));
        const color = flipped ? [0, 217, 255] : [155, 92, 255];
        c.drawRect(190 + col * 68, 95 + r * 70, 56, 56, color[0], color[1], color[2], flipped ? 0.9 : 0.4);
      }
    }
    c.drawGlowCircle(285, 192, 16, 73, 245, 160);
    c.drawGlowCircle(353, 192, 16, 73, 245, 160);
  }

  const outPath = path.join(ROOT, 'games', g.slug, 'thumbnail.png');
  c.saveTo(outPath);
  console.log(`Generated: games/${g.slug}/thumbnail.png`);
});

console.log('All 10 thumbnails successfully created.');


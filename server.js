// Real-Time Multiplayer Server for Neon Slither Arena
// Stack: Node.js + Express + Socket.IO
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Serve compiled arcade site & games
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/games/slither', express.static(path.join(__dirname, 'games/slither')));

// Arena Config
const ARENA_RADIUS = 2800;
const BASE_SPEED = 3.6;
const BOOST_SPEED = 7.0;
const TURN_RATE = 0.082;
const MAX_ORBS = 1200;

let orbs = [];
const players = new Map(); // socket.id -> Snake
const bots = new Map();

// Orb Generator
function initOrbs() {
  orbs = [];
  for (let i = 0; i < MAX_ORBS; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (ARENA_RADIUS - 100);
    orbs.push({
      id: i,
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      mass: 1,
      color: ['#00e5ff', '#ff2d78', '#00ff87', '#ffd54f', '#a855f7'][Math.floor(Math.random() * 5)]
    });
  }
}
initOrbs();

class ServerSnake {
  constructor(id, name, skin, isBot = false) {
    this.id = id;
    this.name = name || 'Serpent';
    this.skin = skin || 'cyan';
    this.isBot = isBot;
    this.x = (Math.random() - 0.5) * (ARENA_RADIUS * 1.4);
    this.y = (Math.random() - 0.5) * (ARENA_RADIUS * 1.4);
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;
    this.length = 22;
    this.radius = 11;
    this.isBoosting = false;
    this.isAlive = true;
    this.segments = [];
    for (let i = 0; i < this.length; i++) {
      this.segments.push({
        x: this.x - Math.cos(this.angle) * i * 8,
        y: this.y - Math.sin(this.angle) * i * 8
      });
    }
  }

  update() {
    if (!this.isAlive) return;

    // Turn towards target angle
    let diff = this.targetAngle - this.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.angle += Math.sign(diff) * Math.min(Math.abs(diff), TURN_RATE);

    const speed = this.isBoosting && this.length > 15 ? BOOST_SPEED : BASE_SPEED;
    this.x += Math.cos(this.angle) * speed;
    this.y += Math.sin(this.angle) * speed;

    this.radius = Math.min(26, 11 + Math.sqrt(this.length) * 0.45);

    // Boost burning
    if (this.isBoosting && this.length > 15) {
      if (Math.random() < 0.25) {
        this.length -= 0.15;
        const tail = this.segments[this.segments.length - 1];
        if (orbs.length < MAX_ORBS + 200) {
          orbs.push({
            id: Date.now() + Math.random(),
            x: tail.x + (Math.random() - 0.5) * 8,
            y: tail.y + (Math.random() - 0.5) * 8,
            mass: 1,
            color: '#00e5ff'
          });
        }
      }
    }

    // Constraint segments
    const spacing = 8 + this.radius * 0.22;
    this.segments[0] = { x: this.x, y: this.y };
    for (let i = 1; i < this.segments.length; i++) {
      const prev = this.segments[i - 1];
      const cur = this.segments[i];
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const dist = Math.hypot(dx, dy) || 1;
      cur.x = prev.x + (dx / dist) * spacing;
      cur.y = prev.y + (dy / dist) * spacing;
    }

    const targetCount = Math.floor(this.length);
    while (this.segments.length < targetCount) {
      const last = this.segments[this.segments.length - 1];
      this.segments.push({ x: last.x, y: last.y });
    }
    while (this.segments.length > targetCount && this.segments.length > 15) {
      this.segments.pop();
    }

    // Arena boundary check
    if (Math.hypot(this.x, this.y) >= ARENA_RADIUS - this.radius) {
      this.die();
    }
  }

  die() {
    if (!this.isAlive) return;
    this.isAlive = false;

    // Drop energy orbs
    const dropCount = Math.min(60, Math.floor(this.segments.length * 0.5));
    const step = Math.max(1, Math.floor(this.segments.length / dropCount));
    for (let i = 0; i < this.segments.length; i += step) {
      const seg = this.segments[i];
      orbs.push({
        id: Date.now() + Math.random(),
        x: seg.x + (Math.random() - 0.5) * 16,
        y: seg.y + (Math.random() - 0.5) * 16,
        mass: Math.floor(2 + Math.random() * 4),
        color: '#ff2d78'
      });
    }
  }
}

// Socket.IO Handling
io.on('connection', (socket) => {
  console.log(`[Player Connected] ${socket.id}`);

  socket.on('join', (data) => {
    const snake = new ServerSnake(socket.id, data.name || 'Serpent', data.skin || 'cyan', false);
    players.set(socket.id, snake);
    socket.emit('init', {
      id: socket.id,
      arenaRadius: ARENA_RADIUS,
      orbs: orbs.slice(0, 500)
    });
  });

  socket.on('input', (data) => {
    const snake = players.get(socket.id);
    if (snake && snake.isAlive) {
      if (typeof data.angle === 'number') snake.targetAngle = data.angle;
      snake.isBoosting = Boolean(data.isBoosting);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Player Disconnected] ${socket.id}`);
    const snake = players.get(socket.id);
    if (snake) {
      snake.die();
      players.delete(socket.id);
    }
  });
});

// Maintain AI Server Bots
const BOT_NAMES = ['Apex', 'Viper', 'NeonPulse', 'Phantom', 'Blitz', 'Titan', 'Drift', 'Nebula'];
function maintainBots() {
  const currentCount = players.size + bots.size;
  if (currentCount < 18) {
    const id = 'bot-' + Math.random();
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const bot = new ServerSnake(id, name, 'rainbow', true);
    bot.length = 25 + Math.floor(Math.random() * 50);
    bots.set(id, bot);
  }
}

// Main 30Hz Server Tick Loop
setInterval(() => {
  maintainBots();

  const allSnakes = [...players.values(), ...bots.values()];

  // Update positions
  for (const s of allSnakes) {
    if (s.isBot && s.isAlive) {
      if (Math.random() < 0.05) s.targetAngle += (Math.random() - 0.5) * 0.8;
      if (Math.hypot(s.x, s.y) > ARENA_RADIUS - 100) s.targetAngle = Math.atan2(-s.y, -s.x);
    }
    s.update();
  }

  // Head to Body Collisions
  for (const h of allSnakes) {
    if (!h.isAlive) continue;
    for (const b of allSnakes) {
      if (!b.isAlive) continue;
      const startIdx = (h === b) ? 8 : 0;
      for (let i = startIdx; i < b.segments.length; i++) {
        const seg = b.segments[i];
        if (Math.hypot(h.x - seg.x, h.y - seg.y) < h.radius + b.radius - 3) {
          h.die();
          if (!h.isBot) {
            io.to(h.id).emit('eliminated', { killer: b.name });
          }
          break;
        }
      }
      if (!h.isAlive) break;
    }
  }

  // Orb Eating
  for (const s of allSnakes) {
    if (!s.isAlive) continue;
    const eatDist = s.radius + 12;
    for (let i = orbs.length - 1; i >= 0; i--) {
      const orb = orbs[i];
      if (Math.hypot(orb.x - s.x, orb.y - s.y) < eatDist) {
        s.length += orb.mass * 0.18;
        orbs.splice(i, 1);
      }
    }
  }

  // Clean dead bots
  for (const [id, b] of bots.entries()) {
    if (!b.isAlive) bots.delete(id);
  }

  // Replenish orbs
  while (orbs.length < MAX_ORBS) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (ARENA_RADIUS - 100);
    orbs.push({
      id: Math.random(),
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      mass: 1,
      color: '#00e5ff'
    });
  }

  // Broadcast snapshot
  const snapshot = {
    snakes: allSnakes.filter(s => s.isAlive).map(s => ({
      id: s.id,
      name: s.name,
      skin: s.skin,
      x: Math.round(s.x),
      y: Math.round(s.y),
      angle: Number(s.angle.toFixed(2)),
      length: Math.round(s.length),
      radius: Math.round(s.radius),
      isBoosting: s.isBoosting,
      segments: s.segments.map(seg => ({ x: Math.round(seg.x), y: Math.round(seg.y) }))
    })),
    leaderboard: allSnakes
      .filter(s => s.isAlive)
      .sort((a, b) => b.length - a.length)
      .slice(0, 10)
      .map(s => ({ name: s.name, score: Math.round(s.length) }))
  };

  io.emit('state', snapshot);
}, 1000 / 30);

httpServer.listen(PORT, () => {
  console.log(`[Neon Slither Arena] Server running on http://localhost:${PORT}`);
});

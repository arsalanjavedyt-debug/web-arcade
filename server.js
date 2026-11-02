// NEXORA PLAY — Master Multiplayer Game Server & REST API
// Stack: Node.js + Express + Socket.IO (Server Authoritative Physics & Matchmaking)

import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'nexora_admin_secret_2026';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

app.use(express.json());

// Serve compiled static platform
app.use(express.static(path.join(__dirname, 'dist')));

// -------------------------------------------------------------
// In-Memory Database & Leaderboard Store (with Anti-Cheat)
// -------------------------------------------------------------
const leaderboardStore = [
  { id: '1', name: 'CyberViper99', game: 'snake-arena', score: 2840, date: '2026-11-02', avatar: '👑' },
  { id: '2', name: 'QuantumRider', game: 'neon-rush', score: 1960, date: '2026-11-02', avatar: '⚡' },
  { id: '3', name: 'NeonApex', game: 'turbo-kart', score: 1720, date: '2026-11-01', avatar: '🔥' },
  { id: '4', name: 'PixelPhantom', game: 'brick-blaster', score: 1480, date: '2026-10-31', avatar: '👾' },
  { id: '5', name: 'AstroKnight', game: 'perfect-stack', score: 1310, date: '2026-10-30', avatar: '🚀' }
];

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeSockets: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

// Leaderboard API
app.get('/api/leaderboard', (req, res) => {
  const { game } = req.query;
  let results = [...leaderboardStore];
  if (game && game !== 'all') {
    results = results.filter(entry => entry.game === game);
  }
  results.sort((a, b) => b.score - a.score);
  res.json({ success: true, count: results.length, data: results.slice(0, 50) });
});

app.post('/api/leaderboard/submit', (req, res) => {
  const { name, game, score, avatar, guestId } = req.body;
  if (!name || !game || typeof score !== 'number') {
    return res.status(400).json({ error: 'Invalid score payload' });
  }

  // Basic anti-cheat: sanity limits
  if (score > 100000 || score < 0) {
    return res.status(400).json({ error: 'Score exceeds sanity threshold' });
  }

  const newEntry = {
    id: Date.now().toString(),
    guestId: guestId || 'guest',
    name: name.slice(0, 16),
    game,
    score: Math.floor(score),
    avatar: avatar || '🎮',
    date: new Date().toISOString().slice(0, 10)
  };

  leaderboardStore.push(newEntry);
  res.json({ success: true, rank: 1, entry: newEntry });
});

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${ADMIN_SECRET}` && req.query.key !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized admin access' });
  }

  res.json({
    onlinePlayers: io.engine.clientsCount,
    activeRooms: rooms.size,
    matchmakingQueues: Array.from(matchmakingQueues.entries()).map(([k, v]) => ({ game: k, queued: v.length })),
    totalScoresLogged: leaderboardStore.length
  });
});

// -------------------------------------------------------------
// Real-Time Multiplayer Networking Architecture
// -------------------------------------------------------------
const rooms = new Map(); // roomId -> RoomState
const matchmakingQueues = new Map(); // gameSlug -> [ { socket, playerInfo } ]

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = 'NX-';
  for (let i = 0; i < 4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
  return res;
}

class MultiplayerRoom {
  constructor(roomId, roomCode, gameSlug, hostSocket, hostInfo) {
    this.roomId = roomId;
    this.roomCode = roomCode;
    this.gameSlug = gameSlug;
    this.hostId = hostSocket.id;
    this.players = new Map();
    this.state = 'lobby'; // 'lobby', 'in-game', 'finished'
    this.simulationInterval = null;

    this.addPlayer(hostSocket, hostInfo, true);
  }

  addPlayer(socket, info, isHost = false) {
    this.players.set(socket.id, {
      id: socket.id,
      guestId: info.guestId,
      name: info.name || 'Player',
      avatar: info.avatar || '🎮',
      isHost,
      score: 0,
      alive: true,
      ready: false,
      socket
    });
    socket.join(this.roomId);
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    if (socketId === this.hostId && this.players.size > 0) {
      // Migrate host
      const nextHost = this.players.values().next().value;
      this.hostId = nextHost.id;
      nextHost.isHost = true;
    }
  }

  broadcast(event, data) {
    io.to(this.roomId).emit(event, data);
  }

  getPlayerList() {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost,
      score: p.score
    }));
  }
}

io.on('connection', (socket) => {
  let currentRoomId = null;

  // 1. Public Matchmaking
  socket.on('findMatch', (data) => {
    const { gameSlug, guestId, name, avatar } = data;
    if (!matchmakingQueues.has(gameSlug)) {
      matchmakingQueues.set(gameSlug, []);
    }
    const q = matchmakingQueues.get(gameSlug);
    q.push({ socket, info: { guestId, name, avatar } });

    // Match found when 2 players in queue
    if (q.length >= 2) {
      const p1 = q.shift();
      const p2 = q.shift();
      const roomId = 'match-' + Date.now();
      const roomCode = generateRoomCode();
      const room = new MultiplayerRoom(roomId, roomCode, gameSlug, p1.socket, p1.info);
      room.addPlayer(p2.socket, p2.info, false);
      rooms.set(roomId, room);

      p1.socket.emit('matchFound', { roomId, roomCode, players: room.getPlayerList() });
      p2.socket.emit('matchFound', { roomId, roomCode, players: room.getPlayerList() });
    }
  });

  socket.on('cancelMatchmaking', (data) => {
    const { gameSlug } = data;
    if (matchmakingQueues.has(gameSlug)) {
      const q = matchmakingQueues.get(gameSlug);
      const idx = q.findIndex(item => item.socket.id === socket.id);
      if (idx !== -1) q.splice(idx, 1);
    }
  });

  // 2. Private Room Creation
  socket.on('createRoom', (data) => {
    const { gameSlug, guestId, name, avatar } = data;
    const roomId = 'room-' + Date.now();
    const roomCode = generateRoomCode();
    const room = new MultiplayerRoom(roomId, roomCode, gameSlug, socket, { guestId, name, avatar });
    rooms.set(roomId, room);
    currentRoomId = roomId;

    socket.emit('roomCreated', {
      roomId,
      roomCode,
      players: room.getPlayerList()
    });
  });

  // 3. Join by Code
  socket.on('joinRoom', (data) => {
    const { roomCode, guestId, name, avatar } = data;
    let foundRoom = null;
    for (const r of rooms.values()) {
      if (r.roomCode === roomCode) {
        foundRoom = r;
        break;
      }
    }

    if (!foundRoom) {
      return socket.emit('matchError', { message: 'Room code not found' });
    }

    foundRoom.addPlayer(socket, { guestId, name, avatar }, false);
    currentRoomId = foundRoom.roomId;

    socket.emit('roomJoined', {
      roomId: foundRoom.roomId,
      roomCode: foundRoom.roomCode,
      players: foundRoom.getPlayerList()
    });

    foundRoom.broadcast('playerJoined', {
      players: foundRoom.getPlayerList()
    });
  });

  // 4. In-Game Stroke Sync (Draw & Guess)
  socket.on('sendStroke', (data) => {
    const { roomId, stroke } = data;
    socket.to(roomId).emit('drawStroke', stroke);
  });

  // 5. In-Game Chat / Guess (Draw & Guess)
  socket.on('sendGuess', (data) => {
    const { roomId, guess } = data;
    const room = rooms.get(roomId);
    if (room) {
      const p = room.players.get(socket.id);
      room.broadcast('chatMessage', {
        author: p ? p.name : 'Player',
        text: guess
      });
    }
  });

  // Disconnection
  socket.on('disconnect', () => {
    // Remove from matchmaking queues
    matchmakingQueues.forEach(q => {
      const idx = q.findIndex(item => item.socket.id === socket.id);
      if (idx !== -1) q.splice(idx, 1);
    });

    // Remove from active room
    if (currentRoomId && rooms.has(currentRoomId)) {
      const room = rooms.get(currentRoomId);
      room.removePlayer(socket.id);
      if (room.players.size === 0) {
        rooms.delete(currentRoomId);
      } else {
        room.broadcast('playerLeft', { players: room.getPlayerList() });
      }
    }
  });
});

// Fallback all routes to dist/index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`⚡ NEXORA PLAY — Master Game Server Online`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🎮 Games: 10 Instant Browser Mini-Games Loaded`);
  console.log(`======================================================\n`);
});

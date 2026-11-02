// NEXORA PLAY — Universal Multiplayer Client SDK
// Supports public matchmaking, private room creation, room codes, invite URLs,
// socket events, ping monitoring, and clean fallback to local AI practice mode if offline.

class NexoraMultiplayerClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomId = null;
    this.roomCode = null;
    this.isHost = false;
    this.players = [];
    this.currentGame = null;
    this.matchmaking = false;
    this.callbacks = {};

    // Auto-detect backend URL: If hosted on separate origin, read from window.NEXORA_SERVER_URL or localhost
    this.serverUrl = window.NEXORA_SERVER_URL || (window.location.port === '3000' ? '' : 'http://localhost:3000');
    this.init();
  }

  on(event, callback) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(callback);
  }

  emitLocal(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }

  init() {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO not detected in global scope. Running in offline/AI mode.');
      return;
    }

    try {
      this.socket = io(this.serverUrl, {
        reconnectionAttempts: 4,
        timeout: 4000,
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this.emitLocal('connected', { socketId: this.socket.id });
      });

      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        this.emitLocal('disconnected', { reason });
      });

      this.socket.on('roomCreated', (data) => {
        this.roomId = data.roomId;
        this.roomCode = data.roomCode;
        this.isHost = true;
        this.players = data.players || [];
        this.emitLocal('roomCreated', data);
      });

      this.socket.on('roomJoined', (data) => {
        this.roomId = data.roomId;
        this.roomCode = data.roomCode;
        this.isHost = data.isHost || false;
        this.players = data.players || [];
        this.emitLocal('roomJoined', data);
      });

      this.socket.on('playerJoined', (data) => {
        this.players = data.players;
        this.emitLocal('playerJoined', data);
      });

      this.socket.on('playerLeft', (data) => {
        this.players = data.players;
        this.emitLocal('playerLeft', data);
      });

      this.socket.on('gameStartCountdown', (data) => {
        this.emitLocal('gameStartCountdown', data);
      });

      this.socket.on('gameStarted', (data) => {
        this.emitLocal('gameStarted', data);
      });

      this.socket.on('gameState', (data) => {
        this.emitLocal('gameState', data);
      });

      this.socket.on('drawStroke', (data) => {
        this.emitLocal('drawStroke', data);
      });

      this.socket.on('chatMessage', (data) => {
        this.emitLocal('chatMessage', data);
      });

      this.socket.on('matchError', (err) => {
        this.emitLocal('error', err);
      });

    } catch (e) {
      console.warn('Socket connection initialization error:', e);
    }
  }

  // --- Public Matchmaking ---
  startMatchmaking(gameSlug) {
    if (!this.connected) {
      this.emitLocal('matchFound', { roomId: 'local-practice', isOfflineAI: true });
      return;
    }
    const profile = window.NexoraGuest ? window.NexoraGuest.profile : { name: 'Player' };
    this.matchmaking = true;
    this.currentGame = gameSlug;
    this.socket.emit('findMatch', {
      gameSlug,
      guestId: profile.guestId,
      name: profile.name,
      avatar: profile.avatar
    });
  }

  cancelMatchmaking() {
    if (this.socket && this.matchmaking) {
      this.socket.emit('cancelMatchmaking', { gameSlug: this.currentGame });
      this.matchmaking = false;
    }
  }

  // --- Private Rooms ---
  createPrivateRoom(gameSlug) {
    if (!this.connected) {
      const offlineCode = 'NX-' + Math.floor(1000 + Math.random() * 9000);
      this.emitLocal('roomCreated', {
        roomId: 'offline-' + offlineCode,
        roomCode: offlineCode,
        isHost: true,
        isOfflineAI: true,
        players: [{ name: (window.NexoraGuest && window.NexoraGuest.profile.name) || 'Player', isHost: true }]
      });
      return;
    }
    const profile = window.NexoraGuest ? window.NexoraGuest.profile : { name: 'Player' };
    this.currentGame = gameSlug;
    this.socket.emit('createRoom', {
      gameSlug,
      guestId: profile.guestId,
      name: profile.name,
      avatar: profile.avatar
    });
  }

  joinPrivateRoom(roomCode) {
    if (!this.connected) {
      this.emitLocal('error', { message: 'Server is currently offline. You can practice in Solo AI mode!' });
      return;
    }
    const profile = window.NexoraGuest ? window.NexoraGuest.profile : { name: 'Player' };
    this.socket.emit('joinRoom', {
      roomCode: roomCode.trim().toUpperCase(),
      guestId: profile.guestId,
      name: profile.name,
      avatar: profile.avatar
    });
  }

  startGame() {
    if (this.socket && this.roomId && this.isHost) {
      this.socket.emit('startGame', { roomId: this.roomId });
    }
  }

  sendInput(inputData) {
    if (this.socket && this.roomId) {
      this.socket.emit('playerInput', { roomId: this.roomId, input: inputData });
    }
  }

  sendDrawing(drawData) {
    if (this.socket && this.roomId) {
      this.socket.emit('sendStroke', { roomId: this.roomId, stroke: drawData });
    }
  }

  sendGuess(text) {
    if (this.socket && this.roomId) {
      this.socket.emit('sendGuess', { roomId: this.roomId, guess: text });
    }
  }
}

window.NexoraMP = new NexoraMultiplayerClient();

// NEXORA PLAY — Guest Identity & Player State Manager
// Handles guest profiles, local stats, favorites, recent games, and daily challenge progression.

class GuestManager {
  constructor() {
    this.storageKey = 'nexora_guest_profile';
    this.statsKey = 'nexora_player_stats';
    this.favoritesKey = 'nexora_favorites';
    this.recentKey = 'nexora_recent_games';
    this.dailyKey = 'nexora_daily_challenge';

    this.profile = this.loadProfile();
    this.stats = this.loadStats();
    this.favorites = this.loadFavorites();
    this.recent = this.loadRecent();
    this.daily = this.loadDailyChallenge();

    this.initUI();
  }

  generateGuestId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = 'NX-';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  getRandomName() {
    const prefixes = ['Cyber', 'Neon', 'Vortex', 'Phantom', 'Quantum', 'Hyper', 'Shadow', 'Apex', 'Nova', 'Zero', 'Blaze', 'Cosmic'];
    const suffixes = ['Rider', 'Falcon', 'Strike', 'Runner', 'Gamer', 'Knight', 'Pilot', 'Viper', 'Ghost', 'Ace', 'Spark', 'Blade'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    const num = Math.floor(10 + Math.random() * 89);
    return `${p}${s}${num}`;
  }

  loadProfile() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    const newProfile = {
      guestId: this.generateGuestId(),
      name: this.getRandomName(),
      avatar: '🎮',
      level: 1,
      xp: 0,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(newProfile));
    return newProfile;
  }

  updateProfile(name, avatar) {
    if (name && name.trim().length >= 2) {
      this.profile.name = name.trim().slice(0, 16);
    }
    if (avatar) {
      this.profile.avatar = avatar;
    }
    localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
    this.renderBadge();
  }

  addXP(amount) {
    this.profile.xp += amount;
    // Every 250 XP = 1 Level
    const newLevel = 1 + Math.floor(this.profile.xp / 250);
    if (newLevel > this.profile.level) {
      this.profile.level = newLevel;
      if (window.NexoraSound) window.NexoraSound.playPowerup();
      this.showToast(`LEVEL UP! You are now Level ${newLevel}! 🔥`);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
    this.renderBadge();
  }

  loadStats() {
    const raw = localStorage.getItem(this.statsKey);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return {
      totalGamesPlayed: 0,
      highScores: {},
      achievements: []
    };
  }

  recordGameScore(gameSlug, score) {
    this.stats.totalGamesPlayed++;
    const currentHigh = this.stats.highScores[gameSlug] || 0;
    let isNewHigh = false;
    if (score > currentHigh) {
      this.stats.highScores[gameSlug] = score;
      isNewHigh = true;
    }
    localStorage.setItem(this.statsKey, JSON.stringify(this.stats));
    this.addXP(Math.max(10, Math.floor(score / 5)));
    this.updateDailyProgress(gameSlug, score);
    this.trackRecent(gameSlug);
    return isNewHigh;
  }

  loadFavorites() {
    const raw = localStorage.getItem(this.favoritesKey);
    return raw ? JSON.parse(raw) : [];
  }

  toggleFavorite(gameSlug) {
    const idx = this.favorites.indexOf(gameSlug);
    let added = false;
    if (idx >= 0) {
      this.favorites.splice(idx, 1);
    } else {
      this.favorites.push(gameSlug);
      added = true;
    }
    localStorage.setItem(this.favoritesKey, JSON.stringify(this.favorites));
    return added;
  }

  isFavorite(gameSlug) {
    return this.favorites.includes(gameSlug);
  }

  loadRecent() {
    const raw = localStorage.getItem(this.recentKey);
    return raw ? JSON.parse(raw) : [];
  }

  trackRecent(gameSlug) {
    this.recent = this.recent.filter(slug => slug !== gameSlug);
    this.recent.unshift(gameSlug);
    if (this.recent.length > 8) this.recent.pop();
    localStorage.setItem(this.recentKey, JSON.stringify(this.recent));
  }

  // --- Daily Challenge System ---
  loadDailyChallenge() {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(this.dailyKey);
    let state = null;
    if (raw) {
      try { state = JSON.parse(raw); } catch (e) {}
    }

    if (!state || state.date !== today) {
      // Determine today's challenge from day index
      const challenges = [
        { gameSlug: 'snake-arena', title: 'Orb Glutton', desc: 'Score at least 60 in Snake Arena', target: 60, xpReward: 150 },
        { gameSlug: 'knockout-arena', title: 'Platform Dominator', desc: 'Win 2 rounds or score 300 in Knockout Arena', target: 300, xpReward: 180 },
        { gameSlug: 'turbo-kart', title: 'Speed Demon', desc: 'Complete a race with score 500+ in Turbo Kart', target: 500, xpReward: 200 },
        { gameSlug: 'neon-rush', title: 'Infinite Runner', desc: 'Reach a distance of 400m in Neon Rush', target: 400, xpReward: 150 },
        { gameSlug: 'brick-blaster', title: 'Block Demolisher', desc: 'Score 1,000 points in Brick Blaster', target: 1000, xpReward: 175 },
        { gameSlug: 'perfect-stack', title: 'Master Architect', desc: 'Stack 15 blocks in Perfect Stack', target: 15, xpReward: 160 },
        { gameSlug: 'number-fusion', title: 'Fusion Expert', desc: 'Reach a tile value of 256 or score 800 in Number Fusion', target: 800, xpReward: 200 },
        { gameSlug: 'memory-masters', title: 'Card Mastermind', desc: 'Clear a memory board with score 200+', target: 200, xpReward: 150 },
        { gameSlug: 'word-detective', title: 'Cryptic Sleuth', desc: 'Solve today’s word in Word Detective', target: 100, xpReward: 180 }
      ];

      const dayNum = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const current = challenges[dayNum % challenges.length];

      state = {
        date: today,
        challenge: current,
        progress: 0,
        completed: false,
        streak: (state && state.streak && !state.completed) ? 0 : ((state && state.streak) || 0)
      };
      localStorage.setItem(this.dailyKey, JSON.stringify(state));
    }
    return state;
  }

  updateDailyProgress(gameSlug, score) {
    if (this.daily.completed) return;
    if (this.daily.challenge && this.daily.challenge.gameSlug === gameSlug) {
      this.daily.progress = Math.max(this.daily.progress, score);
      if (this.daily.progress >= this.daily.challenge.target) {
        this.daily.completed = true;
        this.daily.streak = (this.daily.streak || 0) + 1;
        this.addXP(this.daily.challenge.xpReward);
        if (window.NexoraSound) window.NexoraSound.playWin();
        this.showToast(`🏆 DAILY CHALLENGE COMPLETED! +${this.daily.challenge.xpReward} XP!`);
      }
      localStorage.setItem(this.dailyKey, JSON.stringify(this.daily));
      this.renderDailyUI();
    }
  }

  // UI Integration
  initUI() {
    document.addEventListener('DOMContentLoaded', () => {
      this.renderBadge();
      this.renderDailyUI();
      this.setupModal();
    });
  }

  renderBadge() {
    const badgeName = document.getElementById('guest-badge-name');
    const badgeAvatar = document.getElementById('guest-badge-avatar');
    if (badgeName) badgeName.textContent = this.profile.name;
    if (badgeAvatar) badgeAvatar.textContent = this.profile.avatar;
  }

  renderDailyUI() {
    const pBar = document.getElementById('daily-progress-bar');
    const pText = document.getElementById('daily-progress-text');
    const streakEl = document.getElementById('daily-streak-val');
    if (!this.daily || !this.daily.challenge) return;

    const percent = Math.min(100, Math.floor((this.daily.progress / this.daily.challenge.target) * 100));
    if (pBar) pBar.style.width = `${percent}%`;
    if (pText) pText.textContent = `${this.daily.progress} / ${this.daily.challenge.target} (${percent}%)`;
    if (streakEl) streakEl.textContent = `${this.daily.streak || 0} Days`;
  }

  setupModal() {
    const modal = document.getElementById('profile-modal');
    const openBtn = document.getElementById('open-profile-btn');
    const closeBtn = document.getElementById('close-profile-btn');
    const saveBtn = document.getElementById('save-profile-btn');
    const nameInput = document.getElementById('profile-name-input');

    if (!modal) return;

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        if (nameInput) nameInput.value = this.profile.name;
        modal.classList.add('open');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
      });
    }

    if (saveBtn && nameInput) {
      saveBtn.addEventListener('click', () => {
        const selectedAvatar = document.querySelector('.avatar-opt.selected');
        const av = selectedAvatar ? selectedAvatar.dataset.avatar : this.profile.avatar;
        this.updateProfile(nameInput.value, av);
        modal.classList.remove('open');
        this.showToast('Profile updated!');
      });
    }

    // Avatar selector option clicks
    document.querySelectorAll('.avatar-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
  }

  showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✨</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Global Singleton
window.NexoraGuest = new GuestManager();

// =============================================================
// db.js — Database terpusat (localStorage)
// Semua fungsi baca/tulis data ada di sini
// =============================================================

const DB = {
  // ── KEY NAMA ──────────────────────────────────────────────
  KEY_USERS      : "tb_users",
  KEY_LB         : "tb_leaderboard",
  KEY_SESSIONS   : "tb_sessions",
  KEY_GAME_CFG   : "tb_game_config",

  // ── INISIALISASI ──────────────────────────────────────────
  init() {
    // Akun admin bawaan
    if (!localStorage.getItem(this.KEY_USERS)) {
      const users = {
        admin: {
          password   : "admin123",
          role       : "admin",
          namaLengkap: "Administrator",
          email      : "admin@tukangbuah.id",
          bestScore  : 0,
          totalGames : 0,
          online     : false,
          lastSeen   : null,
          joinDate   : new Date().toISOString(),
        },
      };
      localStorage.setItem(this.KEY_USERS, JSON.stringify(users));
    }
    if (!localStorage.getItem(this.KEY_LB))
      localStorage.setItem(this.KEY_LB, JSON.stringify([]));

    // Konfigurasi game default (bisa diubah admin)
    if (!localStorage.getItem(this.KEY_GAME_CFG)) {
      localStorage.setItem(this.KEY_GAME_CFG, JSON.stringify({
        maxLevel         : 10,
        hpAwal           : 3,
        bonusTrigger     : 10,    // combo 10 → skor berganda
        bonusDurasiDetik : 8,     // durasi efek ganda skor (detik)
        skorPerLevel     : 20,    // naik level setiap N skor
        kesulitanDefault : "sedang",
      }));
    }
  },

  // ── USERS ─────────────────────────────────────────────────
  getUsers()        { return JSON.parse(localStorage.getItem(this.KEY_USERS) || "{}"); },
  saveUsers(u)      { localStorage.setItem(this.KEY_USERS, JSON.stringify(u)); },

  getUser(uname) {
    return this.getUsers()[uname] || null;
  },

  createUser(uname, data) {
    const users = this.getUsers();
    users[uname] = data;
    this.saveUsers(users);
  },

  updateUser(uname, patch) {
    const users = this.getUsers();
    if (!users[uname]) return;
    Object.assign(users[uname], patch);
    this.saveUsers(users);
  },

  deleteUser(uname) {
    const users = this.getUsers();
    delete users[uname];
    this.saveUsers(users);
    // Hapus dari leaderboard juga
    const lb = this.getLB().filter(e => e.username !== uname);
    this.saveLB(lb);
  },

  // ── LEADERBOARD ───────────────────────────────────────────
  getLB()     { return JSON.parse(localStorage.getItem(this.KEY_LB) || "[]"); },
  saveLB(lb)  { localStorage.setItem(this.KEY_LB, JSON.stringify(lb)); },

  submitScore(uname, score, level, difficulty) {
    const users = this.getUsers();
    if (users[uname]) {
      if (score > (users[uname].bestScore || 0)) {
        users[uname].bestScore  = score;
        users[uname].bestLevel  = level;
      }
      users[uname].totalGames = (users[uname].totalGames || 0) + 1;
      this.saveUsers(users);
    }

    const lb = this.getLB();
    const idx = lb.findIndex(e => e.username === uname);
    const entry = {
      username   : uname,
      namaLengkap: users[uname]?.namaLengkap || uname,
      score,
      level,
      difficulty,
      time       : new Date().toISOString(),
    };
    if (idx >= 0) {
      if (score > lb[idx].score) lb[idx] = entry;
    } else {
      lb.push(entry);
    }
    lb.sort((a, b) => b.score - a.score);
    this.saveLB(lb);
  },

  // ── KONFIGURASI GAME ──────────────────────────────────────
  getGameCfg()     { return JSON.parse(localStorage.getItem(this.KEY_GAME_CFG) || "{}"); },
  saveGameCfg(cfg) { localStorage.setItem(this.KEY_GAME_CFG, JSON.stringify(cfg)); },

  // ── STATISTIK RINGKASAN ───────────────────────────────────
  getStats() {
    const users = this.getUsers();
    const lb    = this.getLB();
    const all   = Object.entries(users).filter(([u]) => u !== "admin");
    return {
      totalUser  : all.length,
      onlineCount: all.filter(([,d]) => d.online).length,
      topScore   : lb.length ? lb[0].score : 0,
      topPlayer  : lb.length ? lb[0].namaLengkap || lb[0].username : "-",
      totalGames : all.reduce((s,[,d]) => s + (d.totalGames||0), 0),
    };
  },
};

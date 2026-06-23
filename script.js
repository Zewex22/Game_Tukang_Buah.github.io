// =============================================================
// TUKANG BUAH - Sistem Login, Admin, Leaderboard + Game
// =============================================================

// ==================== DATA & STORAGE ====================

// Inisialisasi data awal di localStorage jika belum ada
function initStorage() {
  // Akun admin bawaan
  if (!localStorage.getItem("tb_users")) {
    const users = {
      admin: {
        password: "admin123",
        role: "admin",
        bestScore: 0,
        totalGames: 0,
        online: false,
        lastSeen: null,
      },
    };
    localStorage.setItem("tb_users", JSON.stringify(users));
  }
  // Leaderboard global
  if (!localStorage.getItem("tb_leaderboard")) {
    localStorage.setItem("tb_leaderboard", JSON.stringify([]));
  }
}

function getUsers() {
  return JSON.parse(localStorage.getItem("tb_users") || "{}");
}
function saveUsers(users) {
  localStorage.setItem("tb_users", JSON.stringify(users));
}
function getLeaderboard() {
  return JSON.parse(localStorage.getItem("tb_leaderboard") || "[]");
}
function saveLeaderboard(lb) {
  localStorage.setItem("tb_leaderboard", JSON.stringify(lb));
}

// Simpan sesi pengguna aktif (username saja)
let currentUser = null;

// ==================== NAVIGASI HALAMAN ====================

function showPage(page) {
  document.getElementById("login-page").style.display = "none";
  document.getElementById("admin-page").style.display = "none";
  document.getElementById("gw").style.display = "none";

  if (page === "login") {
    document.getElementById("login-page").style.display = "flex";
  } else if (page === "admin") {
    document.getElementById("admin-page").style.display = "flex";
    renderAdminPage();
  } else if (page === "game") {
    document.getElementById("gw").style.display = "flex";
    // Tampilkan nama user di overlay
    document.getElementById("user-greeting").textContent = "Halo, " + currentUser + "! 👋";
    renderLeaderboard();
  }
}

// ==================== TAB LOGIN / DAFTAR ====================

function switchTab(tab) {
  document.getElementById("tab-login").className = "tab-btn" + (tab === "login" ? " active" : "");
  document.getElementById("tab-register").className = "tab-btn" + (tab === "register" ? " active" : "");
  document.getElementById("form-login").style.display = tab === "login" ? "flex" : "none";
  document.getElementById("form-register").style.display = tab === "register" ? "flex" : "none";
  document.getElementById("login-err").textContent = "";
  document.getElementById("reg-err").textContent = "";
}

// ==================== LOGIN ====================

function doLogin() {
  const username = document.getElementById("login-user").value.trim().toLowerCase();
  const password = document.getElementById("login-pass").value;
  const errEl = document.getElementById("login-err");

  if (!username || !password) {
    errEl.textContent = "Username dan password wajib diisi!";
    return;
  }

  const users = getUsers();
  if (!users[username]) {
    errEl.textContent = "Username tidak ditemukan.";
    return;
  }
  if (users[username].password !== password) {
    errEl.textContent = "Password salah.";
    return;
  }

  // Login sukses — tandai online
  currentUser = username;
  users[username].online = true;
  users[username].lastSeen = new Date().toISOString();
  saveUsers(users);

  // Arahkan berdasarkan role
  if (users[username].role === "admin") {
    showPage("admin");
  } else {
    showPage("game");
  }
}

// ==================== DAFTAR ====================

function doRegister() {
  const username = document.getElementById("reg-user").value.trim().toLowerCase();
  const password = document.getElementById("reg-pass").value;
  const errEl = document.getElementById("reg-err");

  if (!username || !password) {
    errEl.textContent = "Semua kolom wajib diisi!";
    return;
  }
  if (username.length < 3) {
    errEl.textContent = "Username minimal 3 karakter.";
    return;
  }
  if (password.length < 4) {
    errEl.textContent = "Password minimal 4 karakter.";
    return;
  }

  const users = getUsers();
  if (users[username]) {
    errEl.textContent = "Username sudah dipakai, pilih lain.";
    return;
  }

  // Buat akun baru
  users[username] = {
    password: password,
    role: "user",
    bestScore: 0,
    totalGames: 0,
    online: false,
    lastSeen: null,
  };
  saveUsers(users);

  errEl.style.color = "#4caf50";
  errEl.textContent = "Berhasil daftar! Silakan login.";
  setTimeout(() => {
    errEl.style.color = "#ff6b6b";
    errEl.textContent = "";
    switchTab("login");
    document.getElementById("login-user").value = username;
  }, 1200);
}

// ==================== LOGOUT ====================

function doLogout() {
  if (currentUser) {
    const users = getUsers();
    if (users[currentUser]) {
      users[currentUser].online = false;
      users[currentUser].lastSeen = new Date().toISOString();
      saveUsers(users);
    }
  }
  currentUser = null;
  gameRunning = false;
  // Reset form login
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
  document.getElementById("login-err").textContent = "";
  showPage("login");
}

// ==================== PANEL ADMIN ====================

function renderAdminPage() {
  const users = getUsers();
  const lb = getLeaderboard();

  // Hitung statistik
  const allUsers = Object.entries(users).filter(([u]) => u !== "admin");
  const onlineCount = allUsers.filter(([, d]) => d.online).length;
  const topScore = allUsers.reduce((max, [, d]) => Math.max(max, d.bestScore || 0), 0);

  document.getElementById("adm-total-user").textContent = allUsers.length;
  document.getElementById("adm-online-user").textContent = onlineCount;
  document.getElementById("adm-top-score").textContent = topScore;

  // Tabel pengguna
  const tbody = document.getElementById("adm-user-tbody");
  tbody.innerHTML = "";
  if (allUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#666;text-align:center;padding:12px">Belum ada pengguna</td></tr>';
  } else {
    allUsers.sort((a, b) => (b[1].bestScore || 0) - (a[1].bestScore || 0));
    allUsers.forEach(([uname, data], i) => {
      const isOnline = data.online;
      const lastSeen = data.lastSeen ? new Date(data.lastSeen).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";
      tbody.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${uname}</td>
          <td class="${isOnline ? "online" : "offline"}">
            <span class="${isOnline ? "badge-online" : "badge-offline"}"></span>
            ${isOnline ? "Online" : lastSeen}
          </td>
          <td>${data.bestScore || 0}</td>
          <td>${data.totalGames || 0}x</td>
        </tr>`;
    });
  }

  // Leaderboard admin
  const lbTbody = document.getElementById("adm-lb-tbody");
  lbTbody.innerHTML = "";
  const top10 = lb.slice(0, 10);
  if (top10.length === 0) {
    lbTbody.innerHTML = '<tr><td colspan="3" style="color:#666;text-align:center;padding:10px">Belum ada skor</td></tr>';
  } else {
    top10.forEach((entry, i) => {
      const rankClass = i === 0 ? "lb-rank-1" : i === 1 ? "lb-rank-2" : i === 2 ? "lb-rank-3" : "";
      lbTbody.innerHTML += `
        <tr>
          <td class="${rankClass}">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
          <td class="${rankClass}">${entry.username}</td>
          <td class="${rankClass}">${entry.score}</td>
        </tr>`;
    });
  }
}

// ==================== LEADERBOARD GAME ====================

// Simpan skor ke leaderboard global (hanya best score per user)
function submitScore(username, score) {
  const lb = getLeaderboard();
  const users = getUsers();

  // Update best score di data user
  if (users[username]) {
    if (score > (users[username].bestScore || 0)) {
      users[username].bestScore = score;
    }
    users[username].totalGames = (users[username].totalGames || 0) + 1;
    saveUsers(users);
  }

  // Update atau tambah di leaderboard global
  const existing = lb.findIndex((e) => e.username === username);
  if (existing >= 0) {
    if (score > lb[existing].score) {
      lb[existing].score = score;
      lb[existing].time = new Date().toISOString();
    }
  } else {
    lb.push({ username, score, time: new Date().toISOString() });
  }

  // Urutkan descending
  lb.sort((a, b) => b.score - a.score);
  saveLeaderboard(lb);
}

// Render leaderboard di overlay game
function renderLeaderboard() {
  const lb = getLeaderboard();
  const tbody = document.getElementById("lb-tbody");
  tbody.innerHTML = "";

  if (lb.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="color:#666;text-align:center;padding:8px">Belum ada skor</td></tr>';
  } else {
    lb.slice(0, 8).forEach((entry, i) => {
      const isMe = entry.username === currentUser;
      const rankClass = i === 0 ? "lb-rank-1" : i === 1 ? "lb-rank-2" : i === 2 ? "lb-rank-3" : "";
      tbody.innerHTML += `
        <tr class="${isMe ? "me" : ""}">
          <td class="${rankClass}">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
          <td class="${rankClass}">${entry.username}${isMe ? " ◀" : ""}</td>
          <td class="${rankClass}">${entry.score}</td>
        </tr>`;
    });
  }
}

// ==================== GAME ENGINE ====================

const canvas = document.getElementById("gc");
const ctx = canvas.getContext("2d");
const CW = 360,
  CH = 480,
  GROUND = CH - 24;

canvas.width = CW;
canvas.height = CH;

const resize = () => {
  const w = Math.min(window.innerWidth, 420);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${(w * CH) / CW}px`;
};
window.addEventListener("resize", resize);
resize();

let score = 0,
  hp = 3,
  level = 1,
  combo = 1,
  comboTimer = 0;
let gameRunning = false,
  frameCount = 0,
  lastTime = 0;
let player,
  items = [],
  keys = {},
  leftHeld = false,
  rightHeld = false,
  swipeStartX = null;

const FRUITS = [
  { em: "🍎", type: "fruit", pts: 1 },
  { em: "🍊", type: "fruit", pts: 1 },
  { em: "🍇", type: "fruit", pts: 2 },
  { em: "🍌", type: "fruit", pts: 1 },
  { em: "🍓", type: "fruit", pts: 1 },
  { em: "🍍", type: "fruit", pts: 3 },
];
const TRASH = [
  { em: "🥫", type: "trash", dmg: 1 },
  { em: "💀", type: "trash", dmg: 1 },
  { em: "🗑️", type: "trash", dmg: 1 },
];
const BONUS = [
  { em: "⭐", type: "bonus", pts: 5 },
  { em: "💎", type: "bonus", pts: 8 },
];

// Teks mengambang saat menangkap item
function spawnFloatText(x, y, text, color) {
  const scale = canvas.clientWidth / CW;
  const el = document.createElement("div");
  el.style.cssText = `position:absolute;left:${x * scale}px;top:${y * scale}px;transform:translate(-50%,-50%);font-family:monospace;font-size:14px;font-weight:bold;color:${color};pointer-events:none;transition:top 0.7s,opacity 0.7s;opacity:1;white-space:nowrap;`;
  el.textContent = text;
  document.getElementById("floats").appendChild(el);
  setTimeout(() => {
    el.style.top = `${(y - 50) * scale}px`;
    el.style.opacity = "0";
  }, 30);
  setTimeout(() => el.remove(), 800);
}

// Tampilkan teks combo
function showComboText() {
  if (combo < 2) return;
  const el = document.getElementById("combo-display");
  el.textContent = `COMBO x${combo}!`;
  el.style.opacity = "1";
  clearTimeout(window._ct);
  window._ct = setTimeout(() => (el.style.opacity = "0"), 800);
}

// Perbarui tampilan HUD
function updateHUD() {
  document.getElementById("sv").textContent = score;
  document.getElementById("lv").textContent = level;
  document.getElementById("cv").textContent = `x${combo}`;
  ["h1", "h2", "h3"].forEach((id, i) => {
    const el = document.getElementById(id);
    el.className = `heart ${i < hp ? "full" : "empty"}`;
    el.textContent = i < hp ? "♥" : "♡";
  });
}

// Gambar latar belakang
function drawBg() {
  ctx.fillStyle = "#0d0520";
  ctx.fillRect(0, 0, CW, CH);
  // Bintang bergerak
  for (let i = 0; i < 35; i++) {
    const sx = (i * 53 + frameCount * 0.15) % CW;
    const sy = (i * 37) % (CH - 80);
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(i + frameCount * 0.04) * 0.2})`;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  // Matahari
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(CW - 50, 44, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe44d";
  ctx.beginPath();
  ctx.arc(CW - 50, 44, 16, 0, Math.PI * 2);
  ctx.fill();
  // Tanah
  ctx.fillStyle = "#2a5c0a";
  ctx.fillRect(0, GROUND, CW, CH - GROUND);
  ctx.fillStyle = "#1e4508";
  for (let i = 0; i < CW; i += 18) ctx.fillRect(i, GROUND, 9, 2);
}

// Gambar karakter pemain
function drawPlayer() {
  const p = player;
  const bx = Math.round(p.x - p.w / 2),
    by = Math.round(GROUND - p.h);
  // Kaki
  ctx.fillStyle = "#111";
  ctx.fillRect(bx + 2, by + 36, (p.w - 8) / 2 + 2, 5);
  ctx.fillRect(bx + p.w / 2 + 1, by + 36, (p.w - 8) / 2 + 2, 5);
  // Celana
  ctx.fillStyle = "#784212";
  ctx.fillRect(bx + 3, by + 28, p.w - 6, 8);
  // Baju
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(bx + 3, by + 14, p.w - 6, 14);
  // Wajah
  ctx.fillStyle = "#F5CBA7";
  ctx.fillRect(bx + 5, by + 2, p.w - 10, 12);
  // Mata
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(p.facing > 0 ? bx + p.w - 10 : bx + 6, by + 5, 2, 2);
  // Topi
  ctx.fillStyle = "#F1C40F";
  ctx.fillRect(bx + 1, by, p.w - 2, 4);
  ctx.fillRect(bx + 4, by + 4, p.w - 8, 2);
  // Keranjang
  const bkx = p.facing > 0 ? bx + p.w - 6 : bx - 12;
  ctx.fillStyle = "#C8964A";
  ctx.fillRect(bkx, by + 14, 14, 12);
  ctx.fillStyle = "#8B5E3C";
  ctx.fillRect(bkx, by + 13, 14, 2);
  if (p.moving && Math.floor(frameCount / 8) % 2) {
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(bkx + 2, by + 16, 2, 2);
  }
}

// Gambar item jatuh
function drawItem(it) {
  ctx.font = `${it.size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(it.em, it.x, it.y);
  if (it.type === "bonus") {
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(it.x, it.y, it.size / 1.5 + Math.sin(frameCount * 0.15) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Deteksi tabrakan item dengan pemain
const collide = (it) => Math.abs(it.x - player.x) < player.w / 2 + it.size / 2.2 && Math.abs(it.y - (GROUND - player.h / 2)) < player.h / 2 + it.size / 2.5;

// Spawn item baru dari atas
function spawnItem() {
  const pool = [...FRUITS];
  if (level >= 2) pool.push(...TRASH);
  if (level >= 3) pool.push(...TRASH, { em: "💣", type: "bomb", dmg: 2 });
  if (Math.random() < 0.07) pool.push(...BONUS);
  const t = pool[Math.floor(Math.random() * pool.length)];
  items.push({
    ...t,
    x: 28 + Math.random() * (CW - 56),
    y: -24,
    speed: 1.5 + Math.random() * 0.8 + level * 0.35,
    size: t.type === "bonus" ? 22 : 24,
    wobble: Math.random() * Math.PI * 2,
    ws: (Math.random() - 0.5) * 0.06,
  });
}

// Loop utama game
function gameLoop(ts) {
  if (!gameRunning) return;
  const dt = Math.min((ts - lastTime) / 16.67, 3);
  lastTime = ts;
  frameCount++;

  // Gerak pemain
  const movL = leftHeld || keys["ArrowLeft"] || keys["a"] || keys["A"];
  const movR = rightHeld || keys["ArrowRight"] || keys["d"] || keys["D"];
  player.moving = movL || movR;
  if (movL) {
    player.x -= player.speed * dt;
    player.facing = -1;
  }
  if (movR) {
    player.x += player.speed * dt;
    player.facing = 1;
  }
  player.x = Math.max(player.w / 2 + 2, Math.min(CW - player.w / 2 - 2, player.x));

  // Timer combo
  comboTimer = Math.max(0, comboTimer - dt);
  if (comboTimer <= 0 && combo > 1) {
    combo = 1;
    updateHUD();
  }

  // Spawn item secara berkala
  if (frameCount % Math.round(Math.max(50 - level * 6, 20)) === 0) spawnItem();

  // Proses setiap item
  items = items.filter((it) => {
    it.wobble += it.ws;
    it.x += Math.sin(it.wobble) * 0.6;
    it.y += it.speed * dt;
    if (!collide(it)) return it.y < CH + 30;

    if (it.type === "fruit" || it.type === "bonus") {
      const pts = it.pts * combo;
      score += pts;
      combo = Math.min(combo + 1, 8);
      comboTimer = it.type === "bonus" ? 150 : 120;
      spawnFloatText(it.x, it.y - 20, `+${pts}${it.type === "bonus" ? " BONUS!" : ""}`, it.type === "bonus" ? "#FFD700" : "#2ecc71");
      showComboText();
    } else {
      hp = Math.max(0, hp - it.dmg);
      combo = 1;
      comboTimer = 0;
      spawnFloatText(it.x, it.y - 20, it.type === "bomb" ? `💥 -${it.dmg} HP` : "-1 HP", "#FF4444");
    }
    updateHUD();
    if (hp <= 0) endGame();
    return false;
  });

  // Naikkan level setiap 15 poin
  level = 1 + Math.floor(score / 15);

  drawBg();
  items.forEach(drawItem);
  drawPlayer();
  requestAnimationFrame(gameLoop);
}

// Mulai game baru
function startGame() {
  score = 0;
  hp = 3;
  level = 1;
  combo = 1;
  comboTimer = 0;
  items = [];
  frameCount = 0;
  player = { x: CW / 2, y: 0, w: 34, h: 40, speed: 5, facing: 1, moving: false };
  document.getElementById("overlay").style.display = "none";
  document.getElementById("fs-block").style.display = "none";
  document.getElementById("leaderboard-section").style.display = "none";
  gameRunning = true;
  lastTime = performance.now();
  updateHUD();
  requestAnimationFrame(gameLoop);
}

// Akhir game — simpan skor
function endGame() {
  gameRunning = false;

  // Simpan skor ke sistem
  if (currentUser) {
    submitScore(currentUser, score);
  }

  // Tampilkan overlay game over
  document.getElementById("overlay").style.display = "flex";
  document.getElementById("fs-block").style.display = "flex";
  document.getElementById("fs").textContent = score;

  // Cek apakah skor terbaik baru
  const users = getUsers();
  const myBest = currentUser && users[currentUser] ? users[currentUser].bestScore : 0;
  const bestLabel = document.getElementById("best-label");
  bestLabel.textContent = score >= myBest ? "🏆 Skor Terbaik Baru!" : `Best kamu: ${myBest}`;

  // Tampilkan leaderboard
  document.getElementById("leaderboard-section").style.display = "block";
  renderLeaderboard();

  const btn = document.getElementById("pbtn");
  btn.textContent = "▶ MAIN LAGI";
  btn.className = "red";
}

// ==================== INPUT KEYBOARD ====================

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (["ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
  // Enter untuk login/daftar
  if (e.key === "Enter") {
    const loginVisible = document.getElementById("login-page").style.display !== "none";
    if (loginVisible) {
      const isLogin = document.getElementById("form-login").style.display !== "none";
      if (isLogin) doLogin();
      else doRegister();
    }
  }
});
document.addEventListener("keyup", (e) => (keys[e.key] = false));

// ==================== KONTROL VIRTUAL (TOMBOL & SWIPE) ====================

// Ikat tombol kontrol virtual
const bindControl = (id, setFlag) => {
  const el = document.getElementById(id);
  ["touchstart", "mousedown"].forEach((ev) =>
    el.addEventListener(
      ev,
      (e) => {
        setFlag(true);
        e.preventDefault();
      },
      { passive: false },
    ),
  );
  ["touchend", "mouseup", "mouseleave"].forEach((ev) => el.addEventListener(ev, () => setFlag(false)));
};
bindControl("btn-left", (val) => (leftHeld = val));
bindControl("btn-right", (val) => (rightHeld = val));

// Kontrol geser (swipe) di canvas
canvas.addEventListener("touchstart", (e) => (swipeStartX = e.touches[0].clientX), { passive: true });
canvas.addEventListener(
  "touchmove",
  (e) => {
    if (swipeStartX === null) return;
    const dx = e.touches[0].clientX - swipeStartX;
    leftHeld = dx < -8;
    rightHeld = dx > 8;
    e.preventDefault();
  },
  { passive: false },
);
canvas.addEventListener("touchend", () => {
  leftHeld = rightHeld = false;
  swipeStartX = null;
});

// ==================== INIT APLIKASI ====================

initStorage();
updateHUD();
showPage("login");

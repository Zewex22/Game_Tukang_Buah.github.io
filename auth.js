// =============================================================
// auth.js — Sistem Autentikasi (Login / Daftar / Logout)
// Bergantung pada: db.js, ui.js
// =============================================================

let currentUser = null;   // username yang sedang login

// ── TAB FORM ─────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById("tab-login").className    = "tab-btn" + (tab === "login"    ? " active" : "");
  document.getElementById("tab-register").className = "tab-btn" + (tab === "register" ? " active" : "");
  document.getElementById("form-login").style.display    = tab === "login"    ? "flex" : "none";
  document.getElementById("form-register").style.display = tab === "register" ? "flex" : "none";
  document.getElementById("login-err").textContent = "";
  document.getElementById("reg-err").textContent   = "";
}

// ── LOGIN ─────────────────────────────────────────────────────
function doLogin() {
  const username = document.getElementById("login-user").value.trim().toLowerCase();
  const password = document.getElementById("login-pass").value;
  const errEl    = document.getElementById("login-err");

  if (!username || !password) { errEl.textContent = "Username dan password wajib diisi!"; return; }

  const user = DB.getUser(username);
  if (!user) { errEl.textContent = "Username tidak ditemukan."; return; }
  if (user.password !== password) { errEl.textContent = "Password salah."; return; }

  currentUser = username;
  DB.updateUser(username, { online: true, lastSeen: new Date().toISOString() });

  if (user.role === "admin") {
    showPage("admin");
  } else {
    showPage("game");
  }
}

// ── DAFTAR ────────────────────────────────────────────────────
function doRegister() {
  const username    = document.getElementById("reg-user").value.trim().toLowerCase();
  const password    = document.getElementById("reg-pass").value;
  const namaLengkap = document.getElementById("reg-nama").value.trim();
  const email       = document.getElementById("reg-email").value.trim().toLowerCase();
  const errEl       = document.getElementById("reg-err");

  // Validasi
  if (!username || !password || !namaLengkap || !email) {
    errEl.textContent = "Semua kolom wajib diisi!"; return;
  }
  if (username.length < 3)  { errEl.textContent = "Username minimal 3 karakter."; return; }
  if (password.length < 4)  { errEl.textContent = "Password minimal 4 karakter."; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = "Format email tidak valid."; return;
  }

  // Cek duplikat
  if (DB.getUser(username)) { errEl.textContent = "Username sudah dipakai."; return; }
  const usersObj = DB.getUsers();
  const emailTaken = Object.values(usersObj).some(u => u.email === email);
  if (emailTaken) { errEl.textContent = "Email sudah terdaftar."; return; }

  DB.createUser(username, {
    password, namaLengkap, email,
    role       : "user",
    bestScore  : 0,
    bestLevel  : 0,
    totalGames : 0,
    online     : false,
    lastSeen   : null,
    joinDate   : new Date().toISOString(),
  });

  errEl.style.color   = "#4caf50";
  errEl.textContent   = "✅ Berhasil daftar! Silakan login.";
  setTimeout(() => {
    errEl.style.color = "#ff6b6b";
    errEl.textContent = "";
    switchTab("login");
    document.getElementById("login-user").value = username;
  }, 1400);
}

// ── LOGOUT ────────────────────────────────────────────────────
function doLogout() {
  if (currentUser) {
    DB.updateUser(currentUser, { online: false, lastSeen: new Date().toISOString() });
  }
  currentUser = null;
  gameRunning = false;

  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
  document.getElementById("login-err").textContent = "";
  showPage("login");
}

// ── KEYBOARD ENTER SHORTCUT ──────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const lp = document.getElementById("login-page");
  if (!lp || lp.style.display === "none") return;
  const isLogin = document.getElementById("form-login").style.display !== "none";
  if (isLogin) doLogin(); else doRegister();
});

// =============================================================
// ui.js — Navigasi Halaman & Komponen UI
// Bergantung pada: db.js, auth.js, admin.js, game.js
// =============================================================

// ── NAVIGASI ─────────────────────────────────────────────────
function showPage(page) {
  document.getElementById("login-page").style.display = "none";
  document.getElementById("admin-page").style.display = "none";
  document.getElementById("gw").style.display         = "none";

  if (page === "login") {
    document.getElementById("login-page").style.display = "flex";
  } else if (page === "admin") {
    document.getElementById("admin-page").style.display = "flex";
    renderAdminPage();
  } else if (page === "game") {
    document.getElementById("gw").style.display = "flex";
    const user = DB.getUser(currentUser);
    document.getElementById("user-greeting").textContent =
      `Halo, ${user?.namaLengkap || currentUser}! 👋`;
    // Terapkan kesulitan default dari config
    const cfg = DB.getGameCfg();
    setDifficulty(cfg.kesulitanDefault || "sedang");
    renderLeaderboard();
    updateHUD();
  }
}

// ── POPUP ATURAN PERMAINAN ────────────────────────────────────
function showRules() {
  document.getElementById("rules-popup").style.display = "flex";
}
function closeRules() {
  document.getElementById("rules-popup").style.display = "none";
}
// Tutup popup jika klik di luar kotak
document.getElementById("rules-popup").addEventListener("click", function(e) {
  if (e.target === this) closeRules();
});

// ── INISIALISASI APP ─────────────────────────────────────────
function initApp() {
  DB.init();
  updateHUD();
  showPage("login");
}

// Jalankan setelah DOM siap
window.addEventListener("DOMContentLoaded", initApp);

// =============================================================
// admin.js — Panel Admin
// Bergantung pada: db.js, auth.js
// =============================================================

// ── RENDER HALAMAN ADMIN ─────────────────────────────────────
function renderAdminPage() {
  renderAdminStats();
  renderAdminUsers();
  renderAdminLB();
  renderAdminConfig();
}

// ── STATISTIK ────────────────────────────────────────────────
function renderAdminStats() {
  const st = DB.getStats();
  document.getElementById("adm-total-user").textContent  = st.totalUser;
  document.getElementById("adm-online-user").textContent = st.onlineCount;
  document.getElementById("adm-top-score").textContent   = st.topScore;
  document.getElementById("adm-total-games").textContent = st.totalGames;
  document.getElementById("adm-top-player").textContent  = st.topPlayer;
}

// ── TABEL PENGGUNA ────────────────────────────────────────────
function renderAdminUsers() {
  const users   = DB.getUsers();
  const allUsers = Object.entries(users).filter(([u]) => u !== "admin");
  allUsers.sort((a,b) => (b[1].bestScore||0) - (a[1].bestScore||0));

  const tbody = document.getElementById("adm-user-tbody");
  tbody.innerHTML = "";

  if (!allUsers.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:#666;text-align:center;padding:12px">Belum ada pengguna</td></tr>';
    return;
  }

  allUsers.forEach(([uname, d], i) => {
    const online   = d.online;
    const lastSeen = d.lastSeen
      ? new Date(d.lastSeen).toLocaleString("id-ID",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})
      : "-";
    const join = d.joinDate
      ? new Date(d.joinDate).toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric"})
      : "-";
    tbody.innerHTML += `
      <tr>
        <td>${i+1}</td>
        <td><b>${uname}</b><br><span style="color:#9b8fc0;font-size:10px">${d.namaLengkap||""}</span></td>
        <td style="font-size:10px;color:#aaa">${d.email||"-"}</td>
        <td class="${online?"online":"offline"}">
          <span class="${online?"badge-online":"badge-offline"}"></span>
          ${online?"Online":lastSeen}
        </td>
        <td>${d.bestScore||0}</td>
        <td>${d.totalGames||0}x</td>
        <td>
          <button class="adm-act-btn del" onclick="adminDeleteUser('${uname}')">🗑</button>
        </td>
      </tr>`;
  });
}

// ── LEADERBOARD ADMIN ─────────────────────────────────────────
function renderAdminLB() {
  const lb    = DB.getLB();
  const tbody = document.getElementById("adm-lb-tbody");
  tbody.innerHTML = "";

  if (!lb.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:#666;text-align:center;padding:10px">Belum ada skor</td></tr>';
    return;
  }
  lb.slice(0,15).forEach((e,i) => {
    const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1;
    const rc    = i===0?"lb-rank-1":i===1?"lb-rank-2":i===2?"lb-rank-3":"";
    const tgl   = e.time ? new Date(e.time).toLocaleDateString("id-ID") : "-";
    tbody.innerHTML += `
      <tr>
        <td class="${rc}">${medal}</td>
        <td class="${rc}">${e.namaLengkap||e.username}</td>
        <td class="${rc}">${e.username}</td>
        <td class="${rc}">${e.score}</td>
        <td class="${rc}">Lv.${e.level||1}</td>
        <td class="${rc}" style="font-size:10px">${tgl}</td>
      </tr>`;
  });
}

// ── KONFIGURASI GAME ──────────────────────────────────────────
function renderAdminConfig() {
  const cfg = DB.getGameCfg();
  document.getElementById("cfg-hp").value           = cfg.hpAwal           ?? 3;
  document.getElementById("cfg-bonus-trigger").value = cfg.bonusTrigger     ?? 10;
  document.getElementById("cfg-bonus-durasi").value  = cfg.bonusDurasiDetik ?? 8;
  document.getElementById("cfg-skor-level").value    = cfg.skorPerLevel     ?? 20;
  document.getElementById("cfg-kesulitan").value     = cfg.kesulitanDefault ?? "sedang";
}

function adminSaveConfig() {
  const cfg = DB.getGameCfg();
  cfg.hpAwal           = parseInt(document.getElementById("cfg-hp").value)            || 3;
  cfg.bonusTrigger     = parseInt(document.getElementById("cfg-bonus-trigger").value) || 10;
  cfg.bonusDurasiDetik = parseInt(document.getElementById("cfg-bonus-durasi").value)  || 8;
  cfg.skorPerLevel     = parseInt(document.getElementById("cfg-skor-level").value)    || 20;
  cfg.kesulitanDefault = document.getElementById("cfg-kesulitan").value               || "sedang";
  DB.saveGameCfg(cfg);
  showToast("✅ Konfigurasi game berhasil disimpan!");
}

// ── HAPUS PENGGUNA ────────────────────────────────────────────
function adminDeleteUser(uname) {
  if (!confirm(`Hapus akun "${uname}"? Skor juga akan dihapus.`)) return;
  DB.deleteUser(uname);
  renderAdminPage();
  showToast("🗑 Akun berhasil dihapus.");
}

// ── RESET LEADERBOARD ─────────────────────────────────────────
function adminResetLB() {
  if (!confirm("Reset seluruh papan skor? Tidak bisa dibatalkan.")) return;
  DB.saveLB([]);
  // Reset bestScore semua user
  const users = DB.getUsers();
  Object.keys(users).forEach(u => {
    if (u !== "admin") { users[u].bestScore = 0; users[u].bestLevel = 0; }
  });
  DB.saveUsers(users);
  renderAdminPage();
  showToast("🔄 Papan skor direset.");
}

// ── TOAST NOTIFIKASI ──────────────────────────────────────────
function showToast(msg) {
  let t = document.getElementById("adm-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "adm-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className   = "adm-toast show";
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.className = "adm-toast", 2500);
}

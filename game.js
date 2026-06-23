// =============================================================
// game.js — Engine Game Utama
// Bergantung pada: db.js, auth.js, ui.js
// =============================================================

// ── CANVAS SETUP ─────────────────────────────────────────────
const canvas = document.getElementById("gc");
const ctx    = canvas.getContext("2d");
const CW = 360, CH = 480, GROUND = CH - 24;
canvas.width = CW; canvas.height = CH;

const resize = () => {
  const w = Math.min(window.innerWidth, 420);
  canvas.style.width  = `${w}px`;
  canvas.style.height = `${(w * CH) / CW}px`;
};
window.addEventListener("resize", resize);
resize();

// ── TINGKAT KESULITAN ─────────────────────────────────────────
const DIFFICULTY = {
  mudah      : { baseSpeed: 1.0, speedMult: 0.25, spawnRate: 65, label:"MUDAH",      color:"#4caf50" },
  sedang     : { baseSpeed: 1.5, speedMult: 0.35, spawnRate: 50, label:"SEDANG",     color:"#ffe066" },
  sulit      : { baseSpeed: 2.2, speedMult: 0.50, spawnRate: 38, label:"SULIT",      color:"#ff9800" },
  sangat_sulit:{ baseSpeed: 3.0, speedMult: 0.65, spawnRate: 26, label:"SANGAT SULIT",color:"#ff4444" },
};

// ── ITEM POOL ─────────────────────────────────────────────────
const FRUITS = [
  { em:"🍎", type:"fruit", pts:1 },{ em:"🍊", type:"fruit", pts:1 },
  { em:"🍇", type:"fruit", pts:2 },{ em:"🍌", type:"fruit", pts:1 },
  { em:"🍓", type:"fruit", pts:1 },{ em:"🍍", type:"fruit", pts:3 },
  { em:"🍑", type:"fruit", pts:2 },{ em:"🥭", type:"fruit", pts:2 },
];
const TRASH = [
  { em:"🥫", type:"trash", dmg:1 },{ em:"💀", type:"trash", dmg:1 },
  { em:"🗑️", type:"trash", dmg:1 },{ em:"🧱", type:"trash", dmg:1 },
];
const SPECIALS = [
  { em:"⭐", type:"star",  pts:3, size:20 },
  { em:"💎", type:"gem",   pts:5, size:20 },
  { em:"💣", type:"bomb",  dmg:2, size:22 },
];

// ── STATE GAME ────────────────────────────────────────────────
let score      = 0;
let hp         = 3;
let level      = 1;
let combo      = 0;          // dimulai dari 0, ditampilkan sebagai 1X
let comboTimer = 0;
let bonusActive       = false;  // mode skor berganda aktif
let bonusTimer        = 0;      // sisa waktu bonus (frame)
let gameRunning       = false;
let frameCount        = 0;
let lastTime          = 0;
let selectedDifficulty = "sedang";

let player, items = {};
let keys = {}, leftHeld = false, rightHeld = false, swipeStartX = null;

// ── UTILITAS ──────────────────────────────────────────────────
function getDiff() { return DIFFICULTY[selectedDifficulty] || DIFFICULTY.sedang; }
function getCfg()  { return DB.getGameCfg(); }

// Teks mengambang
function spawnFloat(x, y, text, color = "#2ecc71") {
  const scale = canvas.clientWidth / CW;
  const el = document.createElement("div");
  el.style.cssText = `position:absolute;left:${x*scale}px;top:${y*scale}px;
    transform:translate(-50%,-50%);font-family:monospace;font-size:13px;
    font-weight:bold;color:${color};pointer-events:none;
    transition:top .7s,opacity .7s;opacity:1;white-space:nowrap;z-index:10;`;
  el.textContent = text;
  document.getElementById("floats").appendChild(el);
  setTimeout(() => { el.style.top=`${(y-55)*scale}px`; el.style.opacity="0"; }, 30);
  setTimeout(() => el.remove(), 850);
}

// ── HUD ───────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById("sv").textContent = score;
  document.getElementById("lv").textContent = `${level}/10`;
  document.getElementById("cv").textContent = `${combo+1}X`;

  // Warna combo
  const cv = document.getElementById("cv");
  cv.style.color = combo >= getCfg().bonusTrigger - 1
    ? "#ff4444" : combo >= 5 ? "#ffd700" : "#ffe066";

  // HP hati
  ["h1","h2","h3"].forEach((id,i) => {
    const el = document.getElementById(id);
    el.className = `heart ${i < hp ? "full" : "empty"}`;
    el.textContent = i < hp ? "♥" : "♡";
  });

  // Indikator bonus aktif
  const bonusBar = document.getElementById("bonus-bar");
  if (bonusActive) {
    bonusBar.style.display = "flex";
    const pct = (bonusTimer / (getCfg().bonusDurasiDetik * 60)) * 100;
    document.getElementById("bonus-fill").style.width = pct + "%";
  } else {
    bonusBar.style.display = "none";
  }

  // Bar progress level
  const cfg = getCfg();
  const levelStart = (level - 1) * cfg.skorPerLevel;
  const levelEnd   = level * cfg.skorPerLevel;
  const pct = Math.min(((score - levelStart) / cfg.skorPerLevel) * 100, 100);
  document.getElementById("level-fill").style.width = pct + "%";
}

// ── COMBO DISPLAY ─────────────────────────────────────────────
function showComboText() {
  const el = document.getElementById("combo-display");
  const c  = combo + 1;
  if (bonusActive) {
    el.textContent = `🔥 BONUS x${c}! SKOR GANDA!`;
    el.style.color = "#ff4444";
  } else {
    el.textContent = c >= 10 ? `⚡ SUPER COMBO x${c}!` : `COMBO x${c}!`;
    el.style.color = c >= 10 ? "#ff4444" : "#ffd700";
  }
  el.style.opacity = "1";
  clearTimeout(window._ct);
  window._ct = setTimeout(() => (el.style.opacity = "0"), 900);
}

// ── BACKGROUND ────────────────────────────────────────────────
function drawBg() {
  // Gradasi langit berubah sesuai level
  const lightness = Math.max(8, 20 - level);
  ctx.fillStyle = `hsl(260,60%,${lightness}%)`;
  ctx.fillRect(0, 0, CW, CH);

  // Bintang
  for (let i = 0; i < 40; i++) {
    const sx = (i * 57 + frameCount * 0.12) % CW;
    const sy = (i * 41) % (CH - 100);
    ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.sin(i + frameCount*.05)*.2})`;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }

  // Matahari / bulan (level tinggi → malam)
  if (level <= 5) {
    ctx.fillStyle = "#ffd700";
    ctx.beginPath(); ctx.arc(CW-48, 44, 22, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#ffe44d";
    ctx.beginPath(); ctx.arc(CW-48, 44, 15, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = "#ddeeff";
    ctx.beginPath(); ctx.arc(CW-48, 44, 18, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = `hsl(260,60%,${lightness+2}%)`;
    ctx.beginPath(); ctx.arc(CW-40, 38, 14, 0, Math.PI*2); ctx.fill();
  }

  // Overlay merah saat bonus aktif
  if (bonusActive) {
    ctx.fillStyle = `rgba(255,50,50,${0.04 + Math.sin(frameCount*.15)*.03})`;
    ctx.fillRect(0, 0, CW, CH);
  }

  // Tanah
  ctx.fillStyle = level >= 8 ? "#2a1a0a" : level >= 5 ? "#1a3a0a" : "#2a5c0a";
  ctx.fillRect(0, GROUND, CW, CH - GROUND);
  ctx.fillStyle = level >= 8 ? "#1a1005" : "#1e4508";
  for (let i = 0; i < CW; i += 18) ctx.fillRect(i, GROUND, 9, 2);
}

// ── PEMAIN ────────────────────────────────────────────────────
function drawPlayer() {
  const p  = player;
  const bx = Math.round(p.x - p.w/2);
  const by = Math.round(GROUND - p.h);

  // Bayangan
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(p.x, GROUND-1, p.w/2, 4, 0, 0, Math.PI*2); ctx.fill();

  // Kaki
  ctx.fillStyle = "#111";
  ctx.fillRect(bx+2,  by+36, (p.w-8)/2+2, 5);
  ctx.fillRect(bx+p.w/2+1, by+36, (p.w-8)/2+2, 5);

  // Celana
  ctx.fillStyle = "#784212";
  ctx.fillRect(bx+3, by+28, p.w-6, 8);

  // Baju
  ctx.fillStyle = bonusActive ? "#c0392b" : "#c0392b";
  if (bonusActive) {
    ctx.fillStyle = `hsl(${frameCount*4%360},80%,50%)`;
  }
  ctx.fillRect(bx+3, by+14, p.w-6, 14);

  // Wajah
  ctx.fillStyle = "#F5CBA7";
  ctx.fillRect(bx+5, by+2, p.w-10, 12);
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(p.facing>0 ? bx+p.w-10 : bx+6, by+5, 2, 2);

  // Topi
  ctx.fillStyle = "#F1C40F";
  ctx.fillRect(bx+1, by, p.w-2, 4);
  ctx.fillRect(bx+4, by+4, p.w-8, 2);

  // Keranjang
  const bkx = p.facing > 0 ? bx+p.w-6 : bx-12;
  ctx.fillStyle = "#C8964A";
  ctx.fillRect(bkx, by+14, 14, 12);
  ctx.fillStyle = "#8B5E3C";
  ctx.fillRect(bkx, by+13, 14, 2);
  if (p.moving && Math.floor(frameCount/8)%2) {
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(bkx+2, by+16, 2, 2);
  }
}

// ── ITEM ──────────────────────────────────────────────────────
function drawItem(it) {
  ctx.font = `${it.size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Efek glow pada item spesial
  if (it.type === "star" || it.type === "gem") {
    ctx.shadowColor = it.type === "gem" ? "#00cfff" : "#ffd700";
    ctx.shadowBlur  = 10 + Math.sin(frameCount*.15)*4;
  }
  ctx.fillText(it.em, it.x, it.y);
  ctx.shadowBlur = 0;

  // Lingkaran animasi item spesial
  if (it.type === "star" || it.type === "gem") {
    ctx.strokeStyle = it.type === "gem" ? "#00cfff" : "#ffd700";
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(it.x, it.y, it.size/1.4 + Math.sin(frameCount*.2)*2.5, 0, Math.PI*2);
    ctx.stroke();
  }
}

// ── TABRAKAN ─────────────────────────────────────────────────
function collide(it) {
  return (
    Math.abs(it.x - player.x) < player.w/2 + it.size/2.2 &&
    Math.abs(it.y - (GROUND - player.h/2)) < player.h/2 + it.size/2.5
  );
}

// ── SPAWN ITEM ────────────────────────────────────────────────
function spawnItem() {
  const diff = getDiff();
  const pool = [...FRUITS];
  if (level >= 2) pool.push(...TRASH);
  if (level >= 4) pool.push(...TRASH);            // lebih banyak sampah
  if (level >= 6) pool.push({ em:"💣", type:"bomb", dmg:2 });
  if (level >= 8) pool.push({ em:"💣", type:"bomb", dmg:2 },
                             { em:"💣", type:"bomb", dmg:2 });

  // Item spesial muncul makin sering di level tinggi
  const specialChance = 0.05 + level * 0.008;
  if (Math.random() < specialChance) pool.push(...SPECIALS);

  const t    = pool[Math.floor(Math.random() * pool.length)];
  const base = t.type === "bomb" ? diff.baseSpeed * 1.2 : diff.baseSpeed;
  items[Date.now() + Math.random()] = {
    ...t,
    x     : 28 + Math.random() * (CW - 56),
    y     : -28,
    speed : base + Math.random() * 0.6 + (level - 1) * diff.speedMult,
    size  : t.size || 24,
    wobble: Math.random() * Math.PI * 2,
    ws    : (Math.random() - 0.5) * 0.07,
  };
}

// ── GAME LOOP ─────────────────────────────────────────────────
function gameLoop(ts) {
  if (!gameRunning) return;
  const dt = Math.min((ts - lastTime) / 16.67, 3);
  lastTime  = ts;
  frameCount++;

  // Gerak pemain
  const movL = leftHeld  || keys["ArrowLeft"]  || keys["a"] || keys["A"];
  const movR = rightHeld || keys["ArrowRight"] || keys["d"] || keys["D"];
  player.moving = movL || movR;
  if (movL) { player.x -= player.speed * dt; player.facing = -1; }
  if (movR) { player.x += player.speed * dt; player.facing =  1; }
  player.x = Math.max(player.w/2+2, Math.min(CW-player.w/2-2, player.x));

  // Timer combo (reset jika idle)
  comboTimer = Math.max(0, comboTimer - dt);
  if (comboTimer <= 0 && combo > 0) { combo = 0; updateHUD(); }

  // Timer bonus skor ganda
  if (bonusActive) {
    bonusTimer = Math.max(0, bonusTimer - dt);
    if (bonusTimer <= 0) {
      bonusActive = false;
      spawnFloat(CW/2, CH/3, "⏰ BONUS BERAKHIR", "#ff9800");
    }
  }

  // Spawn item
  const cfg      = getCfg();
  const diff     = getDiff();
  const interval = Math.max(diff.spawnRate - level * 3, 14);
  if (frameCount % Math.round(interval) === 0) spawnItem();

  // Proses item
  const toDelete = [];
  Object.entries(items).forEach(([k, it]) => {
    it.wobble += it.ws;
    it.x      += Math.sin(it.wobble) * 0.5;
    it.y      += it.speed * dt;

    if (!collide(it)) {
      if (it.y >= CH + 30) toDelete.push(k);
      return;
    }

    // Tangkap!
    toDelete.push(k);
    const isFruit = it.type === "fruit" || it.type === "star" || it.type === "gem";

    if (isFruit) {
      combo++;
      comboTimer = 130;
      const mult    = bonusActive ? 2 : 1;
      const comboMult = Math.min(Math.floor(combo / 3) + 1, 5);
      const pts     = it.pts * comboMult * mult;
      score        += pts;

      // Cek apakah combo mencapai threshold → aktifkan bonus ganda
      if (combo >= cfg.bonusTrigger && !bonusActive) {
        bonusActive = true;
        bonusTimer  = cfg.bonusDurasiDetik * 60;
        spawnFloat(CW/2, CH/3-20, `🔥 COMBO ${combo}X! SKOR GANDA!`, "#ff4444");
      }

      const tag = bonusActive ? ` 🔥x${comboMult*2}` : (comboMult > 1 ? ` x${comboMult}` : "");
      spawnFloat(it.x, it.y-20, `+${pts}${tag}`,
        it.type === "gem" ? "#00cfff" : it.type === "star" ? "#ffd700" : "#2ecc71");
      showComboText();
    } else {
      // Sampah / bom
      hp    = Math.max(0, hp - it.dmg);
      combo = 0;
      comboTimer = 0;
      bonusActive = false;
      bonusTimer  = 0;
      spawnFloat(it.x, it.y-20,
        it.type === "bomb" ? `💥 -${it.dmg} HP!` : "💢 -1 HP", "#ff4444");
    }

    // Naikkan level (max 10)
    const newLevel = Math.min(1 + Math.floor(score / cfg.skorPerLevel), 10);
    if (newLevel > level) {
      level = newLevel;
      spawnFloat(CW/2, CH/2, `⬆ LEVEL ${level}!`, "#ffe066");
    }

    updateHUD();
    if (hp <= 0) { endGame(); return; }
  });

  toDelete.forEach(k => delete items[k]);

  drawBg();
  Object.values(items).forEach(drawItem);
  drawPlayer();
  requestAnimationFrame(gameLoop);
}

// ── MULAI GAME ────────────────────────────────────────────────
function startGame() {
  const cfg = getCfg();
  score      = 0; hp = cfg.hpAwal || 3;
  level      = 1; combo = 0; comboTimer = 0;
  bonusActive = false; bonusTimer = 0;
  items      = {}; frameCount = 0;
  player     = { x: CW/2, y:0, w:34, h:40, speed:5, facing:1, moving:false };

  document.getElementById("overlay").style.display       = "none";
  document.getElementById("fs-block").style.display      = "none";
  document.getElementById("leaderboard-section").style.display = "none";
  document.getElementById("difficulty-picker").style.display  = "none";

  gameRunning = true;
  lastTime    = performance.now();
  updateHUD();
  requestAnimationFrame(gameLoop);
}

// ── AKHIR GAME ────────────────────────────────────────────────
function endGame() {
  gameRunning = false;
  if (currentUser) DB.submitScore(currentUser, score, level, selectedDifficulty);

  document.getElementById("overlay").style.display  = "flex";
  document.getElementById("fs-block").style.display = "flex";
  document.getElementById("fs").textContent         = score;
  document.getElementById("fs-level").textContent   = `Level Tertinggi: ${level}/10`;

  const myBest = DB.getUser(currentUser)?.bestScore || 0;
  document.getElementById("best-label").textContent =
    score >= myBest ? "🏆 Rekor Terbaik Baru!" : `Best kamu: ${myBest}`;

  document.getElementById("leaderboard-section").style.display = "block";
  renderLeaderboard();

  const btn     = document.getElementById("pbtn");
  btn.textContent = "▶ MAIN LAGI";
  btn.className   = "red";
  document.getElementById("difficulty-picker").style.display = "flex";
}

// ── LEADERBOARD GAME ─────────────────────────────────────────
function renderLeaderboard() {
  const lb    = DB.getLB();
  const tbody = document.getElementById("lb-tbody");
  tbody.innerHTML = "";

  if (!lb.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:#666;text-align:center;padding:8px">Belum ada skor</td></tr>';
    return;
  }
  lb.slice(0,8).forEach((e,i) => {
    const isMe = e.username === currentUser;
    const rc   = i===0?"lb-rank-1":i===1?"lb-rank-2":i===2?"lb-rank-3":"";
    const med  = i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1;
    tbody.innerHTML += `
      <tr class="${isMe?"me":""}">
        <td class="${rc}">${med}</td>
        <td class="${rc}">${e.namaLengkap||e.username}${isMe?" ◀":""}</td>
        <td class="${rc}">${e.score}</td>
        <td class="${rc}">Lv.${e.level||1}</td>
      </tr>`;
  });
}

// ── PILIH KESULITAN ───────────────────────────────────────────
function setDifficulty(d) {
  selectedDifficulty = d;
  document.querySelectorAll(".diff-btn").forEach(b => {
    b.className = "diff-btn" + (b.dataset.d === d ? " active" : "");
    b.style.borderColor = b.dataset.d === d ? DIFFICULTY[d].color : "";
  });
}

// ── INPUT KEYBOARD ────────────────────────────────────────────
document.addEventListener("keydown", e => {
  keys[e.key] = true;
  if (["ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
});
document.addEventListener("keyup", e => { keys[e.key] = false; });

// ── TOMBOL VIRTUAL & SWIPE ────────────────────────────────────
function bindBtn(id, setFn) {
  const el = document.getElementById(id);
  ["touchstart","mousedown"].forEach(ev =>
    el.addEventListener(ev, e => { setFn(true); e.preventDefault(); }, { passive:false })
  );
  ["touchend","mouseup","mouseleave"].forEach(ev =>
    el.addEventListener(ev, () => setFn(false))
  );
}
bindBtn("btn-left",  v => leftHeld  = v);
bindBtn("btn-right", v => rightHeld = v);

canvas.addEventListener("touchstart", e => (swipeStartX = e.touches[0].clientX), { passive:true });
canvas.addEventListener("touchmove", e => {
  if (swipeStartX === null) return;
  const dx = e.touches[0].clientX - swipeStartX;
  leftHeld  = dx < -8;
  rightHeld = dx >  8;
  e.preventDefault();
}, { passive:false });
canvas.addEventListener("touchend", () => { leftHeld = rightHeld = false; swipeStartX = null; });

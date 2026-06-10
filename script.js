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
  lastTime = 0,
  bestScore = 0;
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

function showComboText() {
  if (combo < 2) return;
  const el = document.getElementById("combo-display");
  el.textContent = `COMBO x${combo}!`;
  el.style.opacity = "1";
  clearTimeout(window._ct);
  window._ct = setTimeout(() => (el.style.opacity = "0"), 800);
}

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

function drawBg() {
  ctx.fillStyle = "#0d0520";
  ctx.fillRect(0, 0, CW, CH);
  for (let i = 0; i < 35; i++) {
    const sx = (i * 53 + frameCount * 0.15) % CW;
    const sy = (i * 37) % (CH - 80);
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(i + frameCount * 0.04) * 0.2})`;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(CW - 50, 44, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe44d";
  ctx.beginPath();
  ctx.arc(CW - 50, 44, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a5c0a";
  ctx.fillRect(0, GROUND, CW, CH - GROUND);
  ctx.fillStyle = "#1e4508";
  for (let i = 0; i < CW; i += 18) ctx.fillRect(i, GROUND, 9, 2);
}

function drawPlayer() {
  const p = player;
  const bx = Math.round(p.x - p.w / 2),
    by = Math.round(GROUND - p.h);
  ctx.fillStyle = "#111";
  ctx.fillRect(bx + 2, by + 36, (p.w - 8) / 2 + 2, 5);
  ctx.fillRect(bx + p.w / 2 + 1, by + 36, (p.w - 8) / 2 + 2, 5);
  ctx.fillStyle = "#784212";
  ctx.fillRect(bx + 3, by + 28, p.w - 6, 8);
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(bx + 3, by + 14, p.w - 6, 14);
  ctx.fillStyle = "#F5CBA7";
  ctx.fillRect(bx + 5, by + 2, p.w - 10, 12);
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(p.facing > 0 ? bx + p.w - 10 : bx + 6, by + 5, 2, 2);
  ctx.fillStyle = "#F1C40F";
  ctx.fillRect(bx + 1, by, p.w - 2, 4);
  ctx.fillRect(bx + 4, by + 4, p.w - 8, 2);
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

const collide = (it) => Math.abs(it.x - player.x) < player.w / 2 + it.size / 2.2 && Math.abs(it.y - (GROUND - player.h / 2)) < player.h / 2 + it.size / 2.5;

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

function gameLoop(ts) {
  if (!gameRunning) return;
  const dt = Math.min((ts - lastTime) / 16.67, 3);
  lastTime = ts;
  frameCount++;

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

  comboTimer = Math.max(0, comboTimer - dt);
  if (comboTimer <= 0 && combo > 1) {
    combo = 1;
    updateHUD();
  }

  if (frameCount % Math.round(Math.max(50 - level * 6, 20)) === 0) spawnItem();

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

  level = 1 + Math.floor(score / 15);
  drawBg();
  items.forEach(drawItem);
  drawPlayer();
  requestAnimationFrame(gameLoop);
}

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
  gameRunning = true;
  lastTime = performance.now();
  updateHUD();
  requestAnimationFrame(gameLoop);
}

function endGame() {
  gameRunning = false;
  if (score > bestScore) bestScore = score;
  document.getElementById("overlay").style.display = "flex";
  document.getElementById("fs-block").style.display = "flex";
  document.getElementById("fs").textContent = score;
  const btn = document.getElementById("pbtn");
  btn.textContent = "▶ MAIN LAGI";
  btn.className = "red";
  const subs = document.getElementById("overlay").querySelectorAll(".sub");
  if (subs.length > 0) subs[subs.length - 1].textContent = `Best Score: ${bestScore}`;
}

// Input Keyboard
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (["ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
});
document.addEventListener("keyup", (e) => (keys[e.key] = false));

// Fungsi pembantu ikat kontrol Tombol Virtual (Mouse & Touch)
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

// Kontrol Geser (Swipe) di Canvas
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

updateHUD();

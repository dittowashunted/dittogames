import { getBest, setBestIfHigher } from '../storage.js';
import { iconFor } from '../icons.js';

const GRID = 20;
const CELL = 20;
const CANVAS_SIZE = GRID * CELL;
const BASE_TICK_MS = 140;
const MIN_TICK_MS = 75;

const DIR_MAP = {
  ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
};

function arrowSvg(rotation) {
  return `<svg viewBox="0 0 24 24" style="transform:rotate(${rotation}deg)" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
}

export function mount(container) {
  container.innerHTML = `
    <div class="game-page">
      <h1 class="game-page__title"><span class="game-page__title-icon">${iconFor('snake')}</span>Snake</h1>
      <div class="arcade-stage">
        <div class="arcade-hud">
          <div class="arcade-hud__item"><span class="arcade-hud__label">Score</span><span class="arcade-hud__value" id="snake-score">0</span></div>
          <div class="arcade-hud__item"><span class="arcade-hud__label">Best</span><span class="arcade-hud__value" id="snake-best">${getBest('snake')}</span></div>
        </div>
        <div class="arcade-canvas-wrap" id="snake-wrap" style="max-width:${CANVAS_SIZE}px;width:100%;">
          <canvas id="snake-canvas" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>
          <div class="arcade-overlay" id="snake-overlay">
            <h3>Snake</h3>
            <p class="text-dim">Eat the dots, avoid the walls and yourself.</p>
            <button class="btn btn--primary btn--lg" type="button" data-action="start">Play</button>
          </div>
        </div>
        <div class="dpad-desktop-hide">
          <div class="dpad" id="snake-dpad">
            <button class="dpad-up" type="button" data-dir="up" aria-label="Up">${arrowSvg(0)}</button>
            <button class="dpad-left" type="button" data-dir="left" aria-label="Left">${arrowSvg(270)}</button>
            <button class="dpad-right" type="button" data-dir="right" aria-label="Right">${arrowSvg(90)}</button>
            <button class="dpad-down" type="button" data-dir="down" aria-label="Down">${arrowSvg(180)}</button>
          </div>
        </div>
        <p class="touch-hint">Arrow keys / WASD, swipe on the board, or tap the pad.</p>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#snake-canvas');
  const ctx2d = canvas.getContext('2d');
  const scoreEl = container.querySelector('#snake-score');
  const bestEl = container.querySelector('#snake-best');
  const overlay = container.querySelector('#snake-overlay');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = CANVAS_SIZE * dpr;
  canvas.height = CANVAS_SIZE * dpr;
  ctx2d.scale(dpr, dpr);

  let snake, dir, nextDir, food, score, tickMs, timer, running, gameOver;

  function colors() {
    const s = getComputedStyle(document.documentElement);
    return {
      bg: s.getPropertyValue('--color-surface-2').trim(),
      bgAlt: s.getPropertyValue('--color-bg-alt').trim(),
      food: s.getPropertyValue('--color-danger').trim(),
      head: s.getPropertyValue('--color-primary').trim(),
      body: s.getPropertyValue('--color-secondary').trim(),
    };
  }

  function shade(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const clamp = (v) => Math.max(0, Math.min(255, v));
    const amt = Math.round(2.55 * percent);
    const r = clamp((num >> 16) + amt);
    const g = clamp(((num >> 8) & 0xff) + amt);
    const b = clamp((num & 0xff) + amt);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function roundRect(x, y, w, h, r) {
    ctx2d.beginPath();
    ctx2d.moveTo(x + r, y);
    ctx2d.arcTo(x + w, y, x + w, y + h, r);
    ctx2d.arcTo(x + w, y + h, x, y + h, r);
    ctx2d.arcTo(x, y + h, x, y, r);
    ctx2d.arcTo(x, y, x + w, y, r);
    ctx2d.closePath();
  }

  function placeFood() {
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
    food = pos;
  }

  function resetGame() {
    const mid = Math.floor(GRID / 2);
    snake = [{ x: mid - 1, y: mid }, { x: mid - 2, y: mid }, { x: mid - 3, y: mid }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    tickMs = BASE_TICK_MS;
    gameOver = false;
    placeFood();
    scoreEl.textContent = '0';
  }

  function draw() {
    const c = colors();

    // Checkerboard board so the play field reads as a designed surface, not a flat fill.
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        ctx2d.fillStyle = (gx + gy) % 2 === 0 ? c.bg : c.bgAlt;
        ctx2d.fillRect(gx * CELL, gy * CELL, CELL, CELL);
      }
    }

    // Food: glossy gradient orb with a soft glow instead of a flat square.
    const fx = food.x * CELL + CELL / 2;
    const fy = food.y * CELL + CELL / 2;
    const fr = CELL / 2 - 2.5;
    ctx2d.save();
    ctx2d.shadowColor = c.food;
    ctx2d.shadowBlur = 10;
    const grad = ctx2d.createRadialGradient(fx - fr * 0.35, fy - fr * 0.35, fr * 0.15, fx, fy, fr);
    grad.addColorStop(0, shade(c.food, 30));
    grad.addColorStop(1, c.food);
    ctx2d.fillStyle = grad;
    ctx2d.beginPath();
    ctx2d.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();

    // Snake: rounded, tapered, shaded segments drawn tail-first so the head sits on top.
    const last = snake.length - 1;
    for (let i = last; i >= 0; i--) {
      const seg = snake[i];
      const isHead = i === 0;
      const t = last > 0 ? i / last : 0;
      const inset = isHead ? 1 : 1 + t * 1.5;
      const x = seg.x * CELL + inset;
      const y = seg.y * CELL + inset;
      const w = CELL - inset * 2;
      const h = CELL - inset * 2;
      const scaleTone = i % 2 === 0 ? 4 : -4;
      ctx2d.fillStyle = isHead ? c.head : shade(c.body, scaleTone - t * 16);
      roundRect(x, y, w, h, isHead ? 7 : 5);
      ctx2d.fill();
      if (isHead) {
        ctx2d.fillStyle = 'rgba(255,255,255,0.18)';
        roundRect(x + 1.5, y + 1.5, w - 3, h * 0.42, 4);
        ctx2d.fill();

        const ex = dir.x !== 0 ? dir.x * (CELL * 0.16) : CELL * 0.16;
        const ey = dir.y !== 0 ? dir.y * (CELL * 0.16) : -CELL * 0.05;
        const perpX = dir.y !== 0 ? CELL * 0.16 : 0;
        const perpY = dir.x !== 0 ? CELL * 0.16 : 0;
        const cx = seg.x * CELL + CELL / 2;
        const cy = seg.y * CELL + CELL / 2;
        [[1, 1], [-1, -1]].forEach(([s1]) => {
          const eyeX = cx + ex + perpX * s1;
          const eyeY = cy + ey + perpY * s1;
          ctx2d.fillStyle = '#faf5ea';
          ctx2d.beginPath();
          ctx2d.arc(eyeX, eyeY, CELL * 0.11, 0, Math.PI * 2);
          ctx2d.fill();
          ctx2d.fillStyle = '#241d10';
          ctx2d.beginPath();
          ctx2d.arc(eyeX + dir.x * 1.2, eyeY + dir.y * 1.2, CELL * 0.055, 0, Math.PI * 2);
          ctx2d.fill();
        });
      }
    }
  }

  function scheduleTick() {
    clearInterval(timer);
    timer = setInterval(tick, tickMs);
  }

  function tick() {
    if (gameOver) return;
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const hitsWall = head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID;
    const hitsSelf = snake.some((s) => s.x === head.x && s.y === head.y);
    if (hitsWall || hitsSelf) {
      endGame();
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreEl.textContent = String(score);
      const nextTick = Math.max(MIN_TICK_MS, BASE_TICK_MS - Math.floor(score / 50) * 4);
      if (nextTick !== tickMs) {
        tickMs = nextTick;
        scheduleTick();
      }
      placeFood();
    } else {
      snake.pop();
    }
    draw();
  }

  function endGame() {
    gameOver = true;
    running = false;
    clearInterval(timer);
    const isNewBest = setBestIfHigher('snake', score);
    bestEl.textContent = String(getBest('snake'));
    overlay.innerHTML = `
      <h3>Game Over</h3>
      <p class="text-dim">Score: ${score}${isNewBest ? ' — New best! 🎉' : ''}</p>
      <button class="btn btn--primary btn--lg" type="button" data-action="start">Play Again</button>
    `;
    overlay.classList.remove('hidden');
  }

  function startGame() {
    resetGame();
    overlay.classList.add('hidden');
    running = true;
    draw();
    scheduleTick();
  }

  function trySetDir(nd) {
    if (!running || gameOver) return;
    if (nd.x === -dir.x && nd.y === -dir.y) return;
    nextDir = nd;
  }

  function onKeydown(e) {
    const nd = DIR_MAP[e.key];
    if (!nd) return;
    if (!running) {
      if (e.key === ' ' || e.key === 'Enter') startGame();
      return;
    }
    e.preventDefault();
    trySetDir(nd);
  }

  function onOverlayClick(e) {
    if (e.target.closest('[data-action="start"]')) startGame();
  }

  function onDpadClick(e) {
    const btn = e.target.closest('button[data-dir]');
    if (!btn) return;
    const map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    trySetDir(map[btn.dataset.dir]);
  }

  let touchStart = null;
  function onTouchStart(e) {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e) {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) trySetDir(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
    else trySetDir(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
  }

  function onVisibility() {
    if (document.hidden) {
      clearInterval(timer);
    } else if (running && !gameOver) {
      scheduleTick();
    }
  }

  window.addEventListener('keydown', onKeydown);
  document.addEventListener('visibilitychange', onVisibility);
  overlay.addEventListener('click', onOverlayClick);
  container.querySelector('#snake-dpad').addEventListener('click', onDpadClick);
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchend', onTouchEnd, { passive: true });

  resetGame();
  draw();

  return function cleanup() {
    clearInterval(timer);
    window.removeEventListener('keydown', onKeydown);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

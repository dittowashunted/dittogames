import { getBest, setBestIfHigher } from '../storage.js';

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
      <h1 class="game-page__title">🐍 Snake</h1>
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
      food: s.getPropertyValue('--color-danger').trim(),
      head: s.getPropertyValue('--color-primary').trim(),
      body: s.getPropertyValue('--color-secondary').trim(),
    };
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
    ctx2d.fillStyle = c.bg;
    ctx2d.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx2d.fillStyle = c.food;
    ctx2d.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);
    snake.forEach((seg, i) => {
      ctx2d.fillStyle = i === 0 ? c.head : c.body;
      ctx2d.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
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

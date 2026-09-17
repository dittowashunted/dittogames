import { getBest, setBestIfHigher } from '../storage.js';

const CANVAS_W = 360;
const CANVAS_H = 480;
const ROWS = 6;
const COLS = 8;
const BRICK_COLORS = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590'];
const SIDE_MARGIN = 8;
const BRICK_GAP = 4;
const BRICK_H = 16;
const TOP_OFFSET = 36;
const BRICK_W = (CANVAS_W - SIDE_MARGIN * 2 - BRICK_GAP * (COLS - 1)) / COLS;
const PADDLE_W = 70;
const PADDLE_H = 12;
const PADDLE_Y = CANVAS_H - 30;
const BALL_R = 7;
const BASE_BALL_SPEED = 230;
const PADDLE_KEY_SPEED = 360;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function mount(container) {
  container.innerHTML = `
    <div class="game-page">
      <h1 class="game-page__title">🧱 Breakout</h1>
      <div class="arcade-stage">
        <div class="arcade-hud">
          <div class="arcade-hud__item"><span class="arcade-hud__label">Score</span><span class="arcade-hud__value" id="bo-score">0</span></div>
          <div class="arcade-hud__item"><span class="arcade-hud__label">Lives</span><span class="arcade-hud__value" id="bo-lives">3</span></div>
          <div class="arcade-hud__item"><span class="arcade-hud__label">Level</span><span class="arcade-hud__value" id="bo-level">1</span></div>
          <div class="arcade-hud__item"><span class="arcade-hud__label">Best</span><span class="arcade-hud__value" id="bo-best">${getBest('breakout')}</span></div>
        </div>
        <div class="arcade-canvas-wrap breakout-canvas-wrap" style="max-width:${CANVAS_W}px;width:100%;">
          <canvas id="bo-canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
          <div class="arcade-overlay" id="bo-overlay">
            <h3>Breakout</h3>
            <p class="text-dim">Drag / arrow keys to move the paddle. Tap or press Space to launch.</p>
            <button class="btn btn--primary btn--lg" type="button" data-action="start">Play</button>
          </div>
        </div>
        <p class="touch-hint">Drag to move the paddle · tap the board to launch</p>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#bo-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = container.querySelector('#bo-score');
  const livesEl = container.querySelector('#bo-lives');
  const levelEl = container.querySelector('#bo-level');
  const bestEl = container.querySelector('#bo-best');
  const overlay = container.querySelector('#bo-overlay');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = CANVAS_W * dpr;
  canvas.height = CANVAS_H * dpr;
  ctx.scale(dpr, dpr);

  let bricks = [];
  let paddleX = (CANVAS_W - PADDLE_W) / 2;
  let ball = { x: 0, y: 0, vx: 0, vy: 0, speed: BASE_BALL_SPEED };
  let score = 0;
  let lives = 3;
  let level = 1;
  let state = 'ready'; // ready | playing | over
  let rafId = null;
  let lastTs = 0;
  let keyLeft = false;
  let keyRight = false;

  function buildBricks() {
    const arr = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        arr.push({
          alive: true,
          x: SIDE_MARGIN + c * (BRICK_W + BRICK_GAP),
          y: TOP_OFFSET + r * (BRICK_H + BRICK_GAP),
          color: BRICK_COLORS[r % BRICK_COLORS.length],
          points: (ROWS - r) * 10,
        });
      }
    }
    return arr;
  }

  function resetBallOnPaddle() {
    ball = { x: paddleX + PADDLE_W / 2, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0, speed: BASE_BALL_SPEED + (level - 1) * 18 };
    state = 'ready';
  }

  function newGame() {
    bricks = buildBricks();
    paddleX = (CANVAS_W - PADDLE_W) / 2;
    score = 0;
    lives = 3;
    level = 1;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    levelEl.textContent = '1';
    resetBallOnPaddle();
  }

  function launchBall() {
    if (state !== 'ready') return;
    const spread = Math.random() * 0.6 - 0.3;
    const angle = -Math.PI / 2 + spread;
    ball.vx = Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;
    state = 'playing';
    overlay.classList.add('hidden');
  }

  function flashOverlay(title, msg, ms) {
    overlay.innerHTML = `<h3>${title}</h3><p class="text-dim">${msg}</p>`;
    overlay.classList.remove('hidden');
    setTimeout(() => {
      if (state === 'ready') overlay.classList.add('hidden');
    }, ms);
  }

  function loseLife() {
    lives -= 1;
    livesEl.textContent = String(lives);
    if (lives <= 0) {
      gameOver();
    } else {
      resetBallOnPaddle();
      flashOverlay('Ball lost!', `${lives} ${lives === 1 ? 'life' : 'lives'} left — tap to continue`, 900);
    }
  }

  function levelComplete() {
    level += 1;
    levelEl.textContent = String(level);
    bricks = buildBricks();
    resetBallOnPaddle();
    flashOverlay(`Level ${level}!`, 'Get ready…', 1100);
  }

  function gameOver() {
    state = 'over';
    const isBest = setBestIfHigher('breakout', score);
    bestEl.textContent = String(getBest('breakout'));
    overlay.innerHTML = `
      <h3>Game Over</h3>
      <p class="text-dim">Score: ${score}${isBest ? ' — New best! 🎉' : ''}</p>
      <button class="btn btn--primary btn--lg" type="button" data-action="start">Play Again</button>
    `;
    overlay.classList.remove('hidden');
  }

  function update(dt) {
    if (keyLeft) paddleX -= PADDLE_KEY_SPEED * dt;
    if (keyRight) paddleX += PADDLE_KEY_SPEED * dt;
    paddleX = clamp(paddleX, 0, CANVAS_W - PADDLE_W);

    if (state === 'ready') {
      ball.x = paddleX + PADDLE_W / 2;
      return;
    }
    if (state !== 'playing') return;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x - BALL_R < 0) {
      ball.x = BALL_R;
      ball.vx *= -1;
    } else if (ball.x + BALL_R > CANVAS_W) {
      ball.x = CANVAS_W - BALL_R;
      ball.vx *= -1;
    }
    if (ball.y - BALL_R < 0) {
      ball.y = BALL_R;
      ball.vy *= -1;
    }

    if (
      ball.vy > 0 &&
      ball.y + BALL_R >= PADDLE_Y &&
      ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 8 &&
      ball.x >= paddleX - BALL_R &&
      ball.x <= paddleX + PADDLE_W + BALL_R
    ) {
      const hitPos = clamp((ball.x - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2), -1, 1);
      const angle = hitPos * (Math.PI / 3);
      const speed = Math.hypot(ball.vx, ball.vy);
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.abs(Math.cos(angle) * speed);
      ball.y = PADDLE_Y - BALL_R - 0.5;
    }

    for (const b of bricks) {
      if (!b.alive) continue;
      if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + BRICK_W && ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + BRICK_H) {
        b.alive = false;
        score += b.points;
        scoreEl.textContent = String(score);
        const overlapX = Math.min(ball.x + BALL_R - b.x, b.x + BRICK_W - (ball.x - BALL_R));
        const overlapY = Math.min(ball.y + BALL_R - b.y, b.y + BRICK_H - (ball.y - BALL_R));
        if (overlapX < overlapY) ball.vx *= -1;
        else ball.vy *= -1;
        break;
      }
    }

    if (bricks.every((b) => !b.alive)) {
      levelComplete();
      return;
    }

    if (ball.y - BALL_R > CANVAS_H) {
      loseLife();
    }
  }

  function draw() {
    const styles = getComputedStyle(document.documentElement);
    ctx.fillStyle = styles.getPropertyValue('--color-surface-2').trim();
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    bricks.forEach((b) => {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
    });

    ctx.fillStyle = styles.getPropertyValue('--color-primary').trim();
    ctx.fillRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = styles.getPropertyValue('--color-text').trim();
    ctx.fill();
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.033);
    lastTs = ts;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function clientXToCanvas(clientX) {
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * CANVAS_W;
  }

  function movePaddleTo(clientX) {
    paddleX = clamp(clientXToCanvas(clientX) - PADDLE_W / 2, 0, CANVAS_W - PADDLE_W);
  }

  function onMouseMove(e) {
    movePaddleTo(e.clientX);
  }
  function onTouchMove(e) {
    movePaddleTo(e.touches[0].clientX);
  }
  function onTouchStart(e) {
    movePaddleTo(e.touches[0].clientX);
    if (state === 'ready') launchBall();
  }
  function onMouseDown(e) {
    movePaddleTo(e.clientX);
    if (state === 'ready') launchBall();
  }

  function onKeydown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyLeft = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyRight = true;
    if (e.key === ' ') {
      e.preventDefault();
      if (state === 'ready') launchBall();
    }
  }
  function onKeyup(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyLeft = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyRight = false;
  }

  function onOverlayClick(e) {
    if (e.target.closest('[data-action="start"]')) {
      newGame();
      overlay.classList.add('hidden');
    }
  }

  function onVisibility() {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      lastTs = 0;
      rafId = requestAnimationFrame(loop);
    }
  }

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('touchmove', onTouchMove, { passive: true });
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('keyup', onKeyup);
  document.addEventListener('visibilitychange', onVisibility);
  overlay.addEventListener('click', onOverlayClick);

  newGame();
  rafId = requestAnimationFrame(loop);

  return function cleanup() {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('keyup', onKeyup);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

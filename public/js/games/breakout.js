import { getBest, setBestIfHigher } from '../storage.js';
import { mountSoloGame } from '../solo-shell.js';

const CANVAS_W = 430;
const CANVAS_H = 560;
const ENDLESS_ROWS = 6;
const ENDLESS_COLS = 8;
const BRICK_COLORS = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590'];

function shade(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const amt = Math.round(2.55 * percent);
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0xff) + amt);
  const b = clamp((num & 0xff) + amt);
  return `rgb(${r}, ${g}, ${b})`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
const SIDE_MARGIN = 8;
const BRICK_GAP = 4;
const BRICK_H = 19;
const TOP_OFFSET = 44;
const ENDLESS_PADDLE_W = 88;
const PADDLE_H = 14;
const PADDLE_Y = CANVAS_H - 30;
const BALL_R = 8;
const BASE_BALL_SPEED = 255;
const PADDLE_KEY_SPEED = 400;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function startBreakout(stageEl, api) {
  const levelMode = Boolean(api.config);
  const conf = api.config || {};

  // Level mode takes its whole layout from the curve; endless keeps the
  // classic 6x8 wall and grows its own difficulty as you clear screens.
  const rows = levelMode ? conf.rows : ENDLESS_ROWS;
  const cols = levelMode ? conf.cols : ENDLESS_COLS;
  const toughRows = levelMode ? conf.toughRows : 0;
  const startingLives = levelMode ? conf.lives : 3;
  const baseSpeed = levelMode ? conf.ballSpeed : BASE_BALL_SPEED;
  const paddleW = levelMode ? conf.paddleWidth : ENDLESS_PADDLE_W;
  const brickW = (CANVAS_W - SIDE_MARGIN * 2 - BRICK_GAP * (cols - 1)) / cols;

  stageEl.innerHTML = `
    <div class="arcade-stage">
      <div class="arcade-hud">
        <div class="arcade-hud__item"><span class="arcade-hud__label">Score</span><span class="arcade-hud__value" id="bo-score">0</span></div>
        <div class="arcade-hud__item"><span class="arcade-hud__label">Lives</span><span class="arcade-hud__value" id="bo-lives">${startingLives}</span></div>
        ${levelMode
          ? '<div class="arcade-hud__item"><span class="arcade-hud__label">Bricks</span><span class="arcade-hud__value" id="bo-bricks">0</span></div>'
          : `<div class="arcade-hud__item"><span class="arcade-hud__label">Level</span><span class="arcade-hud__value" id="bo-level">1</span></div>
             <div class="arcade-hud__item"><span class="arcade-hud__label">Best</span><span class="arcade-hud__value" id="bo-best">${getBest('breakout')}</span></div>`}
      </div>
      <div class="arcade-canvas-wrap breakout-canvas-wrap" style="max-width:${CANVAS_W}px;width:100%;">
        <canvas id="bo-canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
        <div class="arcade-overlay" id="bo-overlay">
          <h3>${levelMode ? `Level ${api.level}` : 'Breakout'}</h3>
          <p class="text-dim">Drag / arrow keys to move the paddle. Tap or press Space to launch.</p>
          <button class="btn btn--primary btn--lg" type="button" data-action="start">Play</button>
        </div>
      </div>
      <p class="touch-hint">Drag to move the paddle · tap the board to launch</p>
    </div>
  `;

  const canvas = stageEl.querySelector('#bo-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = stageEl.querySelector('#bo-score');
  const livesEl = stageEl.querySelector('#bo-lives');
  const levelEl = stageEl.querySelector('#bo-level');
  const bricksEl = stageEl.querySelector('#bo-bricks');
  const bestEl = stageEl.querySelector('#bo-best');
  const overlay = stageEl.querySelector('#bo-overlay');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = CANVAS_W * dpr;
  canvas.height = CANVAS_H * dpr;
  ctx.scale(dpr, dpr);

  let bricks = [];
  let paddleX = (CANVAS_W - paddleW) / 2;
  let ball = { x: 0, y: 0, vx: 0, vy: 0, speed: baseSpeed };
  let score = 0;
  let lives = startingLives;
  let level = 1;
  let state = 'ready'; // ready | playing | over
  let rafId = null;
  let lastTs = 0;
  let keyLeft = false;
  let keyRight = false;

  function buildBricks() {
    const arr = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Armoured bricks sit at the top, furthest from the paddle.
        const hp = r < toughRows ? 2 : 1;
        arr.push({
          alive: true,
          hp,
          maxHp: hp,
          x: SIDE_MARGIN + c * (brickW + BRICK_GAP),
          y: TOP_OFFSET + r * (BRICK_H + BRICK_GAP),
          color: BRICK_COLORS[r % BRICK_COLORS.length],
          points: (rows - r) * 10,
        });
      }
    }
    return arr;
  }

  function aliveCount() {
    return bricks.reduce((n, b) => n + (b.alive ? 1 : 0), 0);
  }

  function updateBrickCount() {
    if (bricksEl) bricksEl.textContent = String(aliveCount());
  }

  function resetBallOnPaddle() {
    ball = {
      x: paddleX + paddleW / 2,
      y: PADDLE_Y - BALL_R - 1,
      vx: 0,
      vy: 0,
      speed: levelMode ? baseSpeed : baseSpeed + (level - 1) * 18,
    };
    state = 'ready';
  }

  function newGame() {
    bricks = buildBricks();
    paddleX = (CANVAS_W - paddleW) / 2;
    score = 0;
    lives = startingLives;
    level = 1;
    scoreEl.textContent = '0';
    livesEl.textContent = String(lives);
    if (levelEl) levelEl.textContent = '1';
    updateBrickCount();
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
    livesEl.textContent = String(Math.max(0, lives));
    if (lives <= 0) {
      gameOver();
    } else {
      resetBallOnPaddle();
      flashOverlay('Ball lost!', `${lives} ${lives === 1 ? 'life' : 'lives'} left — tap to continue`, 900);
    }
  }

  function wallCleared() {
    if (levelMode) {
      state = 'over';
      api.complete(`Cleared every brick with ${lives} ${lives === 1 ? 'life' : 'lives'} left.`);
      return;
    }
    level += 1;
    levelEl.textContent = String(level);
    bricks = buildBricks();
    resetBallOnPaddle();
    flashOverlay(`Level ${level}!`, 'Get ready…', 1100);
  }

  function gameOver() {
    state = 'over';
    if (levelMode) {
      api.fail(`Out of lives with ${aliveCount()} ${aliveCount() === 1 ? 'brick' : 'bricks'} still standing.`);
      return;
    }
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
    paddleX = clamp(paddleX, 0, CANVAS_W - paddleW);

    if (state === 'ready') {
      ball.x = paddleX + paddleW / 2;
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
      ball.x <= paddleX + paddleW + BALL_R
    ) {
      const hitPos = clamp((ball.x - (paddleX + paddleW / 2)) / (paddleW / 2), -1, 1);
      const angle = hitPos * (Math.PI / 3);
      const speed = Math.hypot(ball.vx, ball.vy);
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.abs(Math.cos(angle) * speed);
      ball.y = PADDLE_Y - BALL_R - 0.5;
    }

    for (const b of bricks) {
      if (!b.alive) continue;
      if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + brickW && ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + BRICK_H) {
        b.hp -= 1;
        if (b.hp <= 0) {
          b.alive = false;
          score += b.points;
          updateBrickCount();
        } else {
          score += 5;
        }
        scoreEl.textContent = String(score);
        const overlapX = Math.min(ball.x + BALL_R - b.x, b.x + brickW - (ball.x - BALL_R));
        const overlapY = Math.min(ball.y + BALL_R - b.y, b.y + BRICK_H - (ball.y - BALL_R));
        if (overlapX < overlapY) ball.vx *= -1;
        else ball.vy *= -1;
        break;
      }
    }

    if (bricks.every((b) => !b.alive)) {
      wallCleared();
      return;
    }

    if (ball.y - BALL_R > CANVAS_H) {
      loseLife();
    }
  }

  function draw() {
    const styles = getComputedStyle(document.documentElement);
    const bgBase = styles.getPropertyValue('--color-surface-2').trim();
    const primary = styles.getPropertyValue('--color-primary').trim();

    const bgGrad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H * 0.3, 10, CANVAS_W / 2, CANVAS_H * 0.5, CANVAS_W);
    bgGrad.addColorStop(0, shade(bgBase, 3));
    bgGrad.addColorStop(1, shade(bgBase, -4));
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    bricks.forEach((b) => {
      if (!b.alive) return;
      const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + BRICK_H);
      grad.addColorStop(0, shade(b.color, 16));
      grad.addColorStop(1, shade(b.color, -12));
      ctx.fillStyle = grad;
      roundRectPath(ctx, b.x, b.y, brickW, BRICK_H, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      roundRectPath(ctx, b.x + 1, b.y + 1, brickW - 2, BRICK_H * 0.4, 2);
      ctx.fill();
      // Armoured bricks wear a dark band until the first hit knocks it off.
      if (b.hp > 1) {
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 2;
        roundRectPath(ctx, b.x + 3, b.y + 3, brickW - 6, BRICK_H - 6, 2);
        ctx.stroke();
      }
    });

    const paddleGrad = ctx.createLinearGradient(paddleX, PADDLE_Y, paddleX, PADDLE_Y + PADDLE_H);
    paddleGrad.addColorStop(0, shade(primary, 18));
    paddleGrad.addColorStop(1, shade(primary, -10));
    ctx.fillStyle = paddleGrad;
    roundRectPath(ctx, paddleX, PADDLE_Y, paddleW, PADDLE_H, PADDLE_H / 2);
    ctx.fill();

    const ballGrad = ctx.createRadialGradient(
      ball.x - BALL_R * 0.35, ball.y - BALL_R * 0.35, BALL_R * 0.1,
      ball.x, ball.y, BALL_R
    );
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.4, shade(primary, 25));
    ballGrad.addColorStop(1, shade(primary, -5));
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();
    ctx.restore();
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
    paddleX = clamp(clientXToCanvas(clientX) - paddleW / 2, 0, CANVAS_W - paddleW);
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
    state = 'over';
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('keyup', onKeyup);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

export function mount(container, meta) {
  return mountSoloGame(container, {
    gameId: 'breakout',
    gameName: 'Breakout',
    icon: (meta && meta.icon) || '🧱',
    endlessLabel: 'Endless',
    endlessDesc: 'Clear a wall, get a faster one — keep going until you run out of lives.',
    instructionsHtml: '<strong>Controls:</strong> Drag or use the arrow keys / A and D to move the paddle. Tap the board or press Space to launch. Dark-banded bricks take two hits.',
    start: startBreakout,
  });
}

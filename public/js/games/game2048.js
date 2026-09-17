import { getBest, setBestIfHigher } from '../storage.js';

const SIZE = 4;
const PAD = 10;
const GAP = 10;
const PALETTE = {
  2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f',
  64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
};

function tileStyle(value) {
  return { bg: PALETTE[value] || '#3c3a32', color: value <= 4 ? '#3b3554' : '#fdf6ee' };
}

function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function slideLine(line) {
  const filtered = line.filter((v) => v !== 0);
  const merged = [];
  let gained = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2;
      merged.push(val);
      gained += val;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i += 1;
    }
  }
  while (merged.length < line.length) merged.push(0);
  return { line: merged, gained };
}

function moveBoard(board, dir) {
  const newBoard = board.map((row) => row.slice());
  const reversed = dir === 'right' || dir === 'down';
  const vertical = dir === 'up' || dir === 'down';
  let changed = false;
  let scoreGain = 0;

  for (let i = 0; i < SIZE; i++) {
    let line = vertical ? newBoard.map((row) => row[i]) : newBoard[i].slice();
    const original = line.slice();
    if (reversed) line.reverse();
    const { line: slid, gained } = slideLine(line);
    scoreGain += gained;
    const finalLine = reversed ? slid.slice().reverse() : slid;
    if (!arraysEqual(finalLine, original)) changed = true;
    if (vertical) {
      for (let r = 0; r < SIZE; r++) newBoard[r][i] = finalLine[r];
    } else {
      newBoard[i] = finalLine;
    }
  }

  return { board: newBoard, changed, scoreGain };
}

function spawnTile(board) {
  const empties = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) empties.push([r, c]);
    }
  }
  if (!empties.length) return null;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
  return [r, c];
}

function canMove(board) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return true;
      if (c + 1 < SIZE && board[r][c] === board[r][c + 1]) return true;
      if (r + 1 < SIZE && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

export function mount(container) {
  container.innerHTML = `
    <div class="game-page">
      <h1 class="game-page__title">🧩 2048</h1>
      <div class="arcade-stage">
        <div class="arcade-hud">
          <div class="arcade-hud__item"><span class="arcade-hud__label">Score</span><span class="arcade-hud__value" id="g-score">0</span></div>
          <div class="arcade-hud__item"><span class="arcade-hud__label">Best</span><span class="arcade-hud__value" id="g-best">${getBest('2048')}</span></div>
        </div>
        <div class="g2048-wrap">
          <div class="g2048-board" id="g-board"></div>
          <div class="arcade-overlay hidden" id="g-overlay">
            <h3 id="g-overlay-title">Game Over</h3>
            <p class="text-dim" id="g-overlay-msg"></p>
            <div class="game-over-actions" id="g-overlay-actions"></div>
          </div>
        </div>
        <div class="flex justify-center mt-16">
          <button class="btn btn--secondary btn--sm" type="button" id="g-new">New Game</button>
        </div>
        <p class="touch-hint">Arrow keys / WASD, or swipe on the board.</p>
      </div>
    </div>
  `;

  const boardEl = container.querySelector('#g-board');
  const scoreEl = container.querySelector('#g-score');
  const bestEl = container.querySelector('#g-best');
  const overlay = container.querySelector('#g-overlay');
  const overlayTitle = container.querySelector('#g-overlay-title');
  const overlayMsg = container.querySelector('#g-overlay-msg');
  const overlayActions = container.querySelector('#g-overlay-actions');

  let board = emptyBoard();
  let score = 0;
  let hasWon = false;
  let locked = false;
  let cellSize = 0;

  function computeMetrics() {
    const size = boardEl.clientWidth;
    cellSize = (size - PAD * 2 - GAP * (SIZE - 1)) / SIZE;
  }

  function positionEl(el, r, c) {
    el.style.width = `${cellSize}px`;
    el.style.height = `${cellSize}px`;
    el.style.left = `${PAD + c * (cellSize + GAP)}px`;
    el.style.top = `${PAD + r * (cellSize + GAP)}px`;
  }

  function render(spawned) {
    boardEl.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const bg = document.createElement('div');
        bg.className = 'g2048-cell-bg';
        positionEl(bg, r, c);
        boardEl.appendChild(bg);
      }
    }
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const value = board[r][c];
        if (!value) continue;
        const tile = document.createElement('div');
        tile.className = 'g2048-tile';
        const { bg, color } = tileStyle(value);
        tile.style.background = bg;
        tile.style.color = color;
        tile.style.fontSize = value >= 1000 ? '1.3rem' : value >= 100 ? '1.5rem' : '1.8rem';
        tile.textContent = String(value);
        positionEl(tile, r, c);
        if (spawned && spawned[0] === r && spawned[1] === c) tile.dataset.spawn = '1';
        boardEl.appendChild(tile);
      }
    }
  }

  function showOverlay(title, msg, actionsHtml) {
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg;
    overlayActions.innerHTML = actionsHtml;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function newGame() {
    board = emptyBoard();
    score = 0;
    hasWon = false;
    locked = false;
    scoreEl.textContent = '0';
    spawnTile(board);
    spawnTile(board);
    hideOverlay();
    computeMetrics();
    render();
  }

  function attemptMove(dir) {
    if (locked) return;
    const result = moveBoard(board, dir);
    if (!result.changed) return;
    board = result.board;
    score += result.scoreGain;
    scoreEl.textContent = String(score);
    setBestIfHigher('2048', score);
    bestEl.textContent = String(getBest('2048'));
    const spawned = spawnTile(board);
    render(spawned);

    if (!hasWon && board.some((row) => row.includes(2048))) {
      hasWon = true;
      locked = true;
      showOverlay(
        '🎉 You reached 2048!',
        `Score: ${score}`,
        '<button class="btn btn--primary" type="button" data-action="continue">Keep Going</button><button class="btn btn--secondary" type="button" data-action="restart">New Game</button>'
      );
      return;
    }
    if (!canMove(board)) {
      locked = true;
      showOverlay('Game Over', `Final score: ${score}`, '<button class="btn btn--primary" type="button" data-action="restart">Try Again</button>');
    }
  }

  const KEY_DIR = {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
  };

  function onKeydown(e) {
    const dir = KEY_DIR[e.key];
    if (!dir) return;
    e.preventDefault();
    attemptMove(dir);
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
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) attemptMove(dx > 0 ? 'right' : 'left');
    else attemptMove(dy > 0 ? 'down' : 'up');
  }

  function onOverlayClick(e) {
    if (e.target.closest('[data-action="restart"]')) newGame();
    else if (e.target.closest('[data-action="continue"]')) {
      locked = false;
      hideOverlay();
    }
  }

  function onResize() {
    computeMetrics();
    render();
  }

  window.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', onResize);
  overlay.addEventListener('click', onOverlayClick);
  container.querySelector('#g-new').addEventListener('click', newGame);
  boardEl.addEventListener('touchstart', onTouchStart, { passive: true });
  boardEl.addEventListener('touchend', onTouchEnd, { passive: true });

  newGame();

  return function cleanup() {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);
  };
}

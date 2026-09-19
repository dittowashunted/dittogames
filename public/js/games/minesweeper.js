import { loadValue, saveValue } from '../storage.js';
import { showToast } from '../toast.js';
import { iconFor } from '../icons.js';

const DIFFS = {
  easy: { label: 'Easy', rows: 9, cols: 9, mines: 10 },
  medium: { label: 'Medium', rows: 16, cols: 16, mines: 40 },
  hard: { label: 'Hard', rows: 16, cols: 30, mines: 99 },
};

function bestKey(diff) {
  return `minesweeper:best:${diff}`;
}

function buildEmptyBoard(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, state: 'hidden', adjacent: 0, exploded: false }))
  );
}

function forEachNeighbor(rows, cols, r, c, fn) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) fn(nr, nc);
    }
  }
}

function placeMines(board, rows, cols, mineCount, safeR, safeC) {
  const forbidden = new Set();
  forbidden.add(`${safeR},${safeC}`);
  forEachNeighbor(rows, cols, safeR, safeC, (r, c) => forbidden.add(`${r},${c}`));

  let placed = 0;
  while (placed < mineCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (forbidden.has(`${r},${c}`) || board[r][c].mine) continue;
    board[r][c].mine = true;
    placed += 1;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      forEachNeighbor(rows, cols, r, c, (nr, nc) => {
        if (board[nr][nc].mine) count += 1;
      });
      board[r][c].adjacent = count;
    }
  }
}

function revealCell(board, rows, cols, startR, startC) {
  const stack = [[startR, startC]];
  while (stack.length) {
    const [r, c] = stack.pop();
    const cell = board[r][c];
    if (cell.state !== 'hidden') continue;
    cell.state = 'revealed';
    if (cell.adjacent === 0 && !cell.mine) {
      forEachNeighbor(rows, cols, r, c, (nr, nc) => {
        if (board[nr][nc].state === 'hidden') stack.push([nr, nc]);
      });
    }
  }
}

function cellContent(cell) {
  if (cell.state === 'flagged') return iconFor('flag');
  if (cell.state === 'hidden') return '';
  if (cell.mine) return iconFor('mine');
  return cell.adjacent > 0 ? String(cell.adjacent) : '';
}

function addLongPress(el, onLongPress) {
  let timer = null;
  let triggered = false;
  el.addEventListener(
    'touchstart',
    () => {
      triggered = false;
      timer = setTimeout(() => {
        triggered = true;
        onLongPress();
      }, 450);
    },
    { passive: true }
  );
  const cancel = () => clearTimeout(timer);
  el.addEventListener('touchmove', cancel, { passive: true });
  el.addEventListener('touchcancel', cancel);
  el.addEventListener('touchend', (e) => {
    cancel();
    if (triggered) e.preventDefault();
  });
}

export function mount(container) {
  container.innerHTML = `
    <div class="game-page game-page--wide">
      <h1 class="game-page__title"><span class="game-page__title-icon">${iconFor('minesweeper')}</span>Minesweeper</h1>
      <div class="diff-picker" id="ms-diff"></div>
      <div class="ms-toolbar">
        <div class="ms-counter" id="ms-mines">10</div>
        <button class="btn btn--secondary btn--sm" type="button" id="ms-new">New Game</button>
        <div class="ms-counter" id="ms-time">0s</div>
      </div>
      <div class="ms-grid-wrap">
        <div class="ms-grid" id="ms-grid"></div>
      </div>
      <div class="instructions">
        <strong>Controls:</strong> Tap/click to reveal a square. Right-click (desktop) or press-and-hold (mobile) to flag a suspected mine. Clear every safe square to win.
      </div>
    </div>
  `;

  const diffEl = container.querySelector('#ms-diff');
  const gridEl = container.querySelector('#ms-grid');
  const minesEl = container.querySelector('#ms-mines');
  const timeEl = container.querySelector('#ms-time');

  let difficulty = loadValue('minesweeper:difficulty', 'easy');
  let rows, cols, mineCount, board, cellEls;
  let started = false;
  let gameOver = false;
  let flagCount = 0;
  let seconds = 0;
  let timer = null;

  diffEl.innerHTML = Object.entries(DIFFS)
    .map(([key, d]) => `<button class="diff-btn" type="button" data-diff="${key}" aria-pressed="${key === difficulty}">${d.label}</button>`)
    .join('');

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      seconds += 1;
      timeEl.textContent = `${seconds}s`;
    }, 1000);
  }

  function updateCellVisual(r, c) {
    const cell = board[r][c];
    const btn = cellEls[r][c];
    btn.dataset.state = cell.state;
    if (cell.state === 'revealed' && cell.mine) btn.dataset.mine = '1';
    else delete btn.dataset.mine;
    if (cell.state === 'revealed' && !cell.mine && cell.adjacent > 0) btn.dataset.n = String(cell.adjacent);
    else delete btn.dataset.n;
    btn.style.outline = cell.exploded ? '2px solid #fff' : '';
    btn.innerHTML = cellContent(cell);
  }

  function updateAllVisuals() {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) updateCellVisual(r, c);
  }

  function buildGrid() {
    gridEl.style.gridTemplateColumns = `repeat(${cols}, 30px)`;
    gridEl.innerHTML = '';
    cellEls = [];
    for (let r = 0; r < rows; r++) {
      const rowEls = [];
      for (let c = 0; c < cols; c++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ms-cell';
        btn.dataset.state = 'hidden';
        btn.addEventListener('click', () => onCellClick(r, c));
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          onCellRightClick(r, c);
        });
        addLongPress(btn, () => onCellRightClick(r, c));
        gridEl.appendChild(btn);
        rowEls.push(btn);
      }
      cellEls.push(rowEls);
    }
  }

  function newGame() {
    const conf = DIFFS[difficulty];
    rows = conf.rows;
    cols = conf.cols;
    mineCount = conf.mines;
    board = buildEmptyBoard(rows, cols);
    flagCount = 0;
    started = false;
    gameOver = false;
    seconds = 0;
    stopTimer();
    timeEl.textContent = '0s';
    minesEl.textContent = String(mineCount);
    buildGrid();
  }

  function onCellClick(r, c) {
    if (gameOver) return;
    const cell = board[r][c];
    if (cell.state !== 'hidden') return;
    if (!started) {
      started = true;
      placeMines(board, rows, cols, mineCount, r, c);
      startTimer();
    }
    if (cell.mine) {
      loseGame(r, c);
      return;
    }
    revealCell(board, rows, cols, r, c);
    updateAllVisuals();
    checkWin();
  }

  function onCellRightClick(r, c) {
    if (gameOver) return;
    const cell = board[r][c];
    if (cell.state === 'revealed') return;
    if (cell.state === 'flagged') {
      cell.state = 'hidden';
      flagCount -= 1;
    } else {
      cell.state = 'flagged';
      flagCount += 1;
    }
    minesEl.textContent = String(mineCount - flagCount);
    updateCellVisual(r, c);
  }

  function checkWin() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!board[r][c].mine && board[r][c].state !== 'revealed') return;
      }
    }
    gameOver = true;
    stopTimer();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].mine) board[r][c].state = 'flagged';
      }
    }
    minesEl.textContent = '0';
    updateAllVisuals();
    const key = bestKey(difficulty);
    const current = loadValue(key, null);
    const isBest = current === null || seconds < current;
    if (isBest) saveValue(key, seconds);
    showToast(`Cleared in ${seconds}s!${isBest ? ' New best time! 🎉' : ''}`, 4000);
  }

  function loseGame(exR, exC) {
    gameOver = true;
    stopTimer();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].mine && board[r][c].state === 'hidden') board[r][c].state = 'revealed';
      }
    }
    board[exR][exC].exploded = true;
    updateAllVisuals();
    showToast('Boom! You hit a mine.', 3000);
  }

  diffEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-diff]');
    if (!btn) return;
    difficulty = btn.dataset.diff;
    saveValue('minesweeper:difficulty', difficulty);
    diffEl.querySelectorAll('.diff-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.diff === difficulty)));
    newGame();
  });

  container.querySelector('#ms-new').addEventListener('click', newGame);

  newGame();

  return function cleanup() {
    stopTimer();
  };
}

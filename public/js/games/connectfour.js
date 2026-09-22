import { mountVersusGame } from '../versus.js';
import * as rules from '../rules/connectfour.js';

const ROWS = 6;
const COLS = 7;

function dropArrowSvg() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v14M6 13l6 6 6-6"/></svg>';
}

function renderBoard(boardEl, ctx) {
  const { state, isMyTurn, room, sendMove } = ctx;
  const canPlay = room.status === 'active' && isMyTurn;

  const cols = document.createElement('div');
  cols.className = 'c4-cols';
  for (let c = 0; c < COLS; c++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'c4-col-btn';
    btn.innerHTML = dropArrowSvg();
    btn.disabled = !canPlay || state.heights[c] >= ROWS;
    btn.setAttribute('aria-label', `Drop in column ${c + 1}`);
    btn.addEventListener('click', () => sendMove({ col: c }));
    cols.appendChild(btn);
  }
  boardEl.appendChild(cols);

  const winSet = new Set((state.winningLine || []).map(([r, c]) => `${r},${c}`));
  const grid = document.createElement('div');
  grid.className = 'c4-board';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const mark = state.cells[r][c];
      const cell = document.createElement('div');
      cell.className = 'c4-cell';
      if (mark) cell.dataset.mark = String(mark);
      if (winSet.has(`${r},${c}`)) cell.style.outline = '3px solid var(--color-accent)';
      if (canPlay && state.heights[c] < ROWS) {
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', () => sendMove({ col: c }));
      }
      grid.appendChild(cell);
    }
  }
  boardEl.appendChild(grid);
}

export function mount(container, meta, params) {
  return mountVersusGame(container, {
    rules,
    gameId: 'connect-four',
    gameName: 'Connect Four',
    icon: (meta && meta.icon) || '🔴',
    lobbyBlurb: 'Drop discs and connect four in a row before your friend does.',
    instructionsHtml: '<strong>How to play:</strong> Tap a column to drop your disc. Connect four in a row — across, down, or diagonally — to win.',
    renderBoard,
    params,
  });
}

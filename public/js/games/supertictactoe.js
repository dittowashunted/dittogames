import { mountVersusGame } from '../versus.js';
import * as rules from '../rules/supertictactoe.js';

function renderBoard(boardEl, ctx) {
  const { state, isMyTurn, room, sendMove } = ctx;
  const canPlay = room.status === 'active' && isMyTurn;

  const wrap = document.createElement('div');
  wrap.className = 'sttt-board';

  for (let b = 0; b < 9; b++) {
    const sub = document.createElement('div');
    sub.className = 'sttt-sub';
    const subWinner = state.subWinners[b];
    const isLegalBoard = subWinner === null && (state.activeBoard === null || state.activeBoard === b);
    if (canPlay && isLegalBoard) sub.dataset.active = '1';
    if (subWinner) sub.dataset.won = subWinner;

    for (let c = 0; c < 9; c++) {
      const mark = state.boards[b][c];
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'sttt-sub-cell';
      cell.textContent = mark || '';
      if (mark) cell.dataset.mark = mark;
      cell.disabled = !!mark || !canPlay || !isLegalBoard;
      cell.addEventListener('click', () => sendMove({ board: b, cell: c }));
      sub.appendChild(cell);
    }

    if (subWinner) {
      const overlay = document.createElement('div');
      overlay.className = 'sttt-sub-overlay';
      overlay.dataset.mark = subWinner;
      overlay.textContent = subWinner === 'draw' ? '—' : subWinner;
      sub.appendChild(overlay);
    }

    wrap.appendChild(sub);
  }

  boardEl.appendChild(wrap);
}

export function mount(container, meta, params) {
  return mountVersusGame(container, {
    rules,
    gameId: 'super-tic-tac-toe',
    gameName: 'Super Tic Tac Toe',
    icon: (meta && meta.icon) || '🔳',
    lobbyBlurb: 'Nine boards in one. Win three mini-boards in a row to take the whole match.',
    instructionsHtml:
      '<strong>How to play:</strong> The square you pick sends your friend to that numbered mini-board next. Win a mini-board with three in a row to claim it (highlighted). Claim three mini-boards in a row to win. If you’re sent to a board that’s already decided, play anywhere you like.',
    renderBoard,
    params,
  });
}

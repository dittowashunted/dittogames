import { mountOnlineGame } from '../online-shell.js';

function renderBoard(boardEl, ctx) {
  const { state, isMyTurn, room, sendMove } = ctx;
  const canPlay = room.status === 'active' && isMyTurn;
  const winSet = new Set(state.winningLine || []);

  const wrap = document.createElement('div');
  wrap.className = 'ttt-board';

  state.board.forEach((mark, i) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'ttt-cell' + (winSet.has(i) ? ' win-cell' : '');
    cell.textContent = mark || '';
    if (mark) cell.dataset.mark = mark;
    cell.dataset.filled = mark ? '1' : '0';
    cell.disabled = !!mark || !canPlay;
    cell.addEventListener('click', () => sendMove({ index: i }));
    wrap.appendChild(cell);
  });

  boardEl.appendChild(wrap);
}

export function mount(container, meta, params) {
  return mountOnlineGame(container, {
    gameId: 'tic-tac-toe',
    gameName: 'Tic Tac Toe',
    icon: (meta && meta.icon) || '❌',
    lobbyBlurb: 'The classic 3-in-a-row game, played online with a friend.',
    instructionsHtml: '<strong>How to play:</strong> Take turns placing your mark in an empty square. Get three in a row — across, down, or diagonally — to win.',
    renderBoard,
    params,
  });
}

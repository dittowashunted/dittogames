import { mountOnlineGame } from '../online-shell.js';

function renderBoard(boardEl, ctx) {
  const { state, isMyTurn, room, sendMove, myIndex } = ctx;
  const canPlay = room.status === 'active' && isMyTurn;
  const { rows, cols, hLines, vLines, boxes, scores } = state;

  const available = Math.min(520, (boardEl.clientWidth || 480) - 8);
  const cellSize = Math.max(58, Math.floor(available / (cols - 1)));
  const pad = 18;
  const hit = 26;
  const width = (cols - 1) * cellSize + pad * 2;
  const height = (rows - 1) * cellSize + pad * 2;

  const wrap = document.createElement('div');
  wrap.className = 'dab-wrap';
  const board = document.createElement('div');
  board.className = 'dab-board';
  board.style.width = `${width}px`;
  board.style.height = `${height}px`;

  for (let br = 0; br < rows - 1; br++) {
    for (let bc = 0; bc < cols - 1; bc++) {
      const owner = boxes[br][bc];
      const box = document.createElement('div');
      box.className = 'dab-box';
      box.style.left = `${bc * cellSize + pad}px`;
      box.style.top = `${br * cellSize + pad}px`;
      box.style.width = `${cellSize}px`;
      box.style.height = `${cellSize}px`;
      if (owner !== null) box.dataset.owner = String(owner + 1);
      board.appendChild(box);
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const owner = hLines[r][c];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dab-line';
      btn.style.left = `${c * cellSize + pad}px`;
      btn.style.top = `${r * cellSize + pad - hit / 2}px`;
      btn.style.width = `${cellSize}px`;
      btn.style.height = `${hit}px`;
      btn.setAttribute('aria-label', `Horizontal line, row ${r + 1}`);
      if (owner !== null) {
        btn.dataset.owner = String(owner + 1);
        btn.disabled = true;
      } else {
        btn.disabled = !canPlay;
        btn.addEventListener('click', () => sendMove({ type: 'h', r, c }));
      }
      board.appendChild(btn);
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const owner = vLines[r][c];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dab-line';
      btn.style.left = `${c * cellSize + pad - hit / 2}px`;
      btn.style.top = `${r * cellSize + pad}px`;
      btn.style.width = `${hit}px`;
      btn.style.height = `${cellSize}px`;
      btn.setAttribute('aria-label', `Vertical line, column ${c + 1}`);
      if (owner !== null) {
        btn.dataset.owner = String(owner + 1);
        btn.disabled = true;
      } else {
        btn.disabled = !canPlay;
        btn.addEventListener('click', () => sendMove({ type: 'v', r, c }));
      }
      board.appendChild(btn);
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dot = document.createElement('div');
      dot.className = 'dab-dot';
      dot.style.left = `${c * cellSize + pad}px`;
      dot.style.top = `${r * cellSize + pad}px`;
      board.appendChild(dot);
    }
  }

  wrap.appendChild(board);
  boardEl.appendChild(wrap);

  const scoreLine = document.createElement('p');
  scoreLine.className = 'text-center text-dim mt-16';
  scoreLine.textContent = `Boxes claimed — you: ${scores[myIndex]} · friend: ${scores[1 - myIndex]}`;
  boardEl.appendChild(scoreLine);
}

export function mount(container, meta, params) {
  return mountOnlineGame(container, {
    gameId: 'dots-and-boxes',
    gameName: 'Dots and Boxes',
    icon: (meta && meta.icon) || '🔲',
    lobbyBlurb: 'Claim lines, complete boxes, and outsmart your friend for the most territory.',
    instructionsHtml: '<strong>How to play:</strong> Tap a line between two dots to claim it. Complete the fourth side of a box to claim that box and get an extra turn. Most boxes when the board fills up wins.',
    renderBoard,
    params,
  });
}

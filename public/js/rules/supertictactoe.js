// Browser-side mirror of netlify/functions/lib/games/supertictactoe.js.
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkLineWin(cells, mark) {
  return LINES.some((line) => line.every((i) => cells[i] === mark));
}

export const id = 'super-tic-tac-toe';
export const simultaneous = false;
export const META_LINES = LINES;

export function createInitialState() {
  return {
    boards: Array.from({ length: 9 }, () => Array(9).fill(null)),
    subWinners: Array(9).fill(null),
    activeBoard: null,
    metaWinningLine: null,
  };
}

export function firstTurn() {
  return 0;
}

export function legalMoves(state) {
  const moves = [];
  for (let board = 0; board < 9; board++) {
    if (state.subWinners[board] !== null) continue;
    if (state.activeBoard !== null && state.activeBoard !== board) continue;
    for (let cell = 0; cell < 9; cell++) {
      if (state.boards[board][cell] === null) moves.push({ board, cell });
    }
  }
  return moves;
}

export function applyMove(state, playerIndex, payload) {
  const board = payload && payload.board;
  const cell = payload && payload.cell;
  if (!Number.isInteger(board) || board < 0 || board > 8) throw new Error('Invalid board');
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) throw new Error('Invalid square');
  if (state.subWinners[board] !== null) throw new Error('That board is already decided');
  if (state.boards[board][cell] !== null) throw new Error('That square is already taken');
  if (state.activeBoard !== null && state.activeBoard !== board) {
    throw new Error('You must play in the highlighted board');
  }

  const mark = playerIndex === 0 ? 'X' : 'O';
  const boards = state.boards.map((b) => b.slice());
  boards[board][cell] = mark;

  const subWinners = state.subWinners.slice();
  if (checkLineWin(boards[board], mark)) {
    subWinners[board] = mark;
  } else if (boards[board].every((c) => c !== null)) {
    subWinners[board] = 'draw';
  }

  let metaWinningLine = null;
  for (const line of LINES) {
    const [a, b, c] = line;
    if (subWinners[a] && subWinners[a] !== 'draw' && subWinners[a] === subWinners[b] && subWinners[b] === subWinners[c]) {
      metaWinningLine = line;
      break;
    }
  }

  const nextActiveBoard = subWinners[cell] === null ? cell : null;
  const newState = { boards, subWinners, activeBoard: nextActiveBoard, metaWinningLine };

  if (metaWinningLine) {
    return { state: newState, turn: null, status: 'won', winner: playerIndex };
  }
  if (subWinners.every((w) => w !== null)) {
    return { state: newState, turn: null, status: 'draw', winner: 'draw' };
  }
  return { state: newState, turn: 1 - playerIndex, status: 'active', winner: null };
}

// Browser-side mirror of netlify/functions/lib/games/tictactoe.js.
// The two are kept in lockstep by scratch parity tests that replay identical
// move sequences through both and compare the resulting states.
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWin(board, mark) {
  for (const line of LINES) {
    if (line.every((i) => board[i] === mark)) return line;
  }
  return null;
}

export const id = 'tic-tac-toe';
export const simultaneous = false;

export function createInitialState() {
  return { board: Array(9).fill(null), winningLine: null };
}

export function firstTurn() {
  return 0;
}

export function legalMoves(state) {
  const moves = [];
  for (let i = 0; i < 9; i++) {
    if (state.board[i] === null) moves.push({ index: i });
  }
  return moves;
}

export function applyMove(state, playerIndex, payload) {
  const index = payload && payload.index;
  if (!Number.isInteger(index) || index < 0 || index > 8) {
    throw new Error('Invalid square');
  }
  if (state.board[index] !== null) {
    throw new Error('That square is already taken');
  }

  const mark = playerIndex === 0 ? 'X' : 'O';
  const board = state.board.slice();
  board[index] = mark;

  const winningLine = checkWin(board, mark);
  if (winningLine) {
    return { state: { board, winningLine }, turn: null, status: 'won', winner: playerIndex };
  }
  if (board.every((c) => c !== null)) {
    return { state: { board, winningLine: null }, turn: null, status: 'draw', winner: 'draw' };
  }
  return { state: { board, winningLine: null }, turn: 1 - playerIndex, status: 'active', winner: null };
}

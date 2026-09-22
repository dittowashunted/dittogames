// Browser-side mirror of netlify/functions/lib/games/connectfour.js.
const ROWS = 6;
const COLS = 7;
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function findWin(cells, row, col, mark) {
  for (const [dr, dc] of DIRECTIONS) {
    const line = [[row, col]];
    for (let dir = -1; dir <= 1; dir += 2) {
      let r = row + dr * dir;
      let c = col + dc * dir;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && cells[r][c] === mark) {
        line.push([r, c]);
        r += dr * dir;
        c += dc * dir;
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

export const id = 'connect-four';
export const simultaneous = false;
export const dimensions = { ROWS, COLS };

export function createInitialState() {
  return {
    cells: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    heights: Array(COLS).fill(0),
    winningLine: null,
    lastMove: null,
  };
}

export function firstTurn() {
  return 0;
}

export function legalMoves(state) {
  const moves = [];
  for (let col = 0; col < COLS; col++) {
    if (state.heights[col] < ROWS) moves.push({ col });
  }
  return moves;
}

export function applyMove(state, playerIndex, payload) {
  const col = payload && payload.col;
  if (!Number.isInteger(col) || col < 0 || col >= COLS) throw new Error('Invalid column');
  if (state.heights[col] >= ROWS) throw new Error('That column is full');

  const row = ROWS - 1 - state.heights[col];
  const mark = playerIndex === 0 ? 1 : 2;
  const cells = state.cells.map((r) => r.slice());
  cells[row][col] = mark;
  const heights = state.heights.slice();
  heights[col] += 1;

  const winningLine = findWin(cells, row, col, mark);
  const newState = { cells, heights, winningLine, lastMove: { row, col } };

  if (winningLine) {
    return { state: newState, turn: null, status: 'won', winner: playerIndex };
  }
  if (heights.every((h) => h >= ROWS)) {
    return { state: newState, turn: null, status: 'draw', winner: 'draw' };
  }
  return { state: newState, turn: 1 - playerIndex, status: 'active', winner: null };
}

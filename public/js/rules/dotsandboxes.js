// Browser-side mirror of netlify/functions/lib/games/dotsandboxes.js.
const ROWS = 5;
const COLS = 5;
const BOX_ROWS = ROWS - 1;
const BOX_COLS = COLS - 1;
const TOTAL_BOXES = BOX_ROWS * BOX_COLS;

function isBoxComplete(state, br, bc) {
  return (
    state.hLines[br][bc] !== null &&
    state.hLines[br + 1][bc] !== null &&
    state.vLines[br][bc] !== null &&
    state.vLines[br][bc + 1] !== null
  );
}

export const id = 'dots-and-boxes';
export const simultaneous = false;
export const dimensions = { ROWS, COLS, BOX_ROWS, BOX_COLS, TOTAL_BOXES };
export { isBoxComplete };

export function createInitialState() {
  return {
    rows: ROWS,
    cols: COLS,
    hLines: Array.from({ length: ROWS }, () => Array(COLS - 1).fill(null)),
    vLines: Array.from({ length: ROWS - 1 }, () => Array(COLS).fill(null)),
    boxes: Array.from({ length: BOX_ROWS }, () => Array(BOX_COLS).fill(null)),
    scores: [0, 0],
    lastLine: null,
  };
}

export function firstTurn() {
  return 0;
}

export function legalMoves(state) {
  const moves = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      if (state.hLines[r][c] === null) moves.push({ type: 'h', r, c });
    }
  }
  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS; c++) {
      if (state.vLines[r][c] === null) moves.push({ type: 'v', r, c });
    }
  }
  return moves;
}

// How many of a box's four sides are already claimed - the core signal the AI
// reasons about (3 means it's free for the taker, 2 means claiming a third
// side hands it to the opponent).
export function boxSideCount(state, br, bc) {
  let sides = 0;
  if (state.hLines[br][bc] !== null) sides += 1;
  if (state.hLines[br + 1][bc] !== null) sides += 1;
  if (state.vLines[br][bc] !== null) sides += 1;
  if (state.vLines[br][bc + 1] !== null) sides += 1;
  return sides;
}

export function boxesTouchedBy(move) {
  const { type, r, c } = move;
  const boxes = [];
  if (type === 'h') {
    if (r - 1 >= 0) boxes.push([r - 1, c]);
    if (r <= BOX_ROWS - 1) boxes.push([r, c]);
  } else {
    if (c - 1 >= 0) boxes.push([r, c - 1]);
    if (c <= BOX_COLS - 1) boxes.push([r, c]);
  }
  return boxes;
}

export function applyMove(state, playerIndex, payload) {
  const type = payload && payload.type;
  const r = payload && payload.r;
  const c = payload && payload.c;
  if (type !== 'h' && type !== 'v') throw new Error('Invalid line type');
  if (!Number.isInteger(r) || !Number.isInteger(c)) throw new Error('Invalid line');

  const hLines = state.hLines.map((row) => row.slice());
  const vLines = state.vLines.map((row) => row.slice());

  if (type === 'h') {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS - 1) throw new Error('Invalid line');
    if (hLines[r][c] !== null) throw new Error('That line is already claimed');
    hLines[r][c] = playerIndex;
  } else {
    if (r < 0 || r >= ROWS - 1 || c < 0 || c >= COLS) throw new Error('Invalid line');
    if (vLines[r][c] !== null) throw new Error('That line is already claimed');
    vLines[r][c] = playerIndex;
  }

  const workingState = { ...state, hLines, vLines };
  const boxes = state.boxes.map((row) => row.slice());
  const candidates = boxesTouchedBy({ type, r, c });

  let completed = 0;
  for (const [br, bc] of candidates) {
    if (boxes[br][bc] === null && isBoxComplete(workingState, br, bc)) {
      boxes[br][bc] = playerIndex;
      completed += 1;
    }
  }

  const scores = state.scores.slice();
  scores[playerIndex] += completed;

  const newState = { ...state, hLines, vLines, boxes, scores, lastLine: { type, r, c, owner: playerIndex } };
  const totalClaimed = scores[0] + scores[1];

  if (totalClaimed >= TOTAL_BOXES) {
    if (scores[0] === scores[1]) {
      return { state: newState, turn: null, status: 'draw', winner: 'draw' };
    }
    const winner = scores[0] > scores[1] ? 0 : 1;
    return { state: newState, turn: null, status: 'won', winner };
  }

  const nextTurn = completed > 0 ? playerIndex : 1 - playerIndex;
  return { state: newState, turn: nextTurn, status: 'active', winner: null };
}

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

module.exports = {
  id: 'tic-tac-toe',
  simultaneous: false,

  createInitialState() {
    return { board: Array(9).fill(null), winningLine: null };
  },

  firstTurn() {
    return 0;
  },

  applyMove(state, playerIndex, payload) {
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
  },
};

import * as ttt from '../rules/tictactoe.js';
import * as sttt from '../rules/supertictactoe.js';
import * as c4 from '../rules/connectfour.js';
import * as rps from '../rules/rps.js';
import * as dab from '../rules/dotsandboxes.js';
import { rankMoves, pickByLevel } from './search.js';

const MARKS = ['X', 'O'];

/* ---------------- Tic Tac Toe ---------------- */
// Nine squares, so it can be searched exhaustively - level 10 is unbeatable.
function tttEvaluate() {
  return 0;
}

function tttChoose(state, playerIndex, level) {
  const depth = level >= 8 ? 9 : Math.max(1, Math.round(level * 0.9));
  const scored = rankMoves(ttt, state, playerIndex, depth, tttEvaluate);
  return pickByLevel(scored, level);
}

/* ---------------- Connect Four ---------------- */
const C4_ROWS = 6;
const C4_COLS = 7;
const C4_LINES = (() => {
  const lines = [];
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      for (const [dr, dc] of dirs) {
        const cells = [];
        for (let i = 0; i < 4; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr < 0 || nr >= C4_ROWS || nc < 0 || nc >= C4_COLS) break;
          cells.push([nr, nc]);
        }
        if (cells.length === 4) lines.push(cells);
      }
    }
  }
  return lines;
})();

function c4Evaluate(state, playerIndex) {
  const me = playerIndex === 0 ? 1 : 2;
  const them = me === 1 ? 2 : 1;
  let score = 0;

  for (const line of C4_LINES) {
    let mine = 0;
    let theirs = 0;
    for (const [r, c] of line) {
      const v = state.cells[r][c];
      if (v === me) mine += 1;
      else if (v === them) theirs += 1;
    }
    if (mine && theirs) continue; // blocked, worth nothing to either side
    if (mine === 3) score += 60;
    else if (mine === 2) score += 8;
    else if (mine === 1) score += 1;
    if (theirs === 3) score -= 70; // weight defence slightly higher
    else if (theirs === 2) score -= 9;
    else if (theirs === 1) score -= 1;
  }

  // Holding the centre column is the single most valuable positional feature;
  // scoring just that column (rather than weighting all 42 cells) keeps the
  // evaluation cheap enough to search deeply.
  for (let r = 0; r < C4_ROWS; r++) {
    const v = state.cells[r][3];
    if (v === me) score += 6;
    else if (v === them) score -= 6;
  }
  return score;
}

const C4_ORDER = [3, 2, 4, 1, 5, 0, 6];
function c4OrderMoves(state, moves) {
  return moves.slice().sort((a, b) => C4_ORDER.indexOf(a.col) - C4_ORDER.indexOf(b.col));
}

function c4Choose(state, playerIndex, level) {
  // Depth 6 already plays a strong tactical game; going deeper cost far more
  // time than it added strength, and a move that takes ~a second feels laggy.
  const depth = Math.min(6, Math.max(1, Math.round(level * 0.7)));
  const scored = rankMoves(c4, state, playerIndex, depth, c4Evaluate, { orderMoves: c4OrderMoves, maxNodes: 18000 });
  return pickByLevel(scored, level);
}

/* ---------------- Super Tic Tac Toe ---------------- */
const SUB_WEIGHT = [1.4, 1, 1.4, 1, 1.75, 1, 1.4, 1, 1.4]; // centre and corners matter more

function scoreSmallBoard(cells, myMark, theirMark) {
  let score = 0;
  for (const line of sttt.META_LINES) {
    let mine = 0;
    let theirs = 0;
    for (const i of line) {
      if (cells[i] === myMark) mine += 1;
      else if (cells[i] === theirMark) theirs += 1;
    }
    if (mine && theirs) continue;
    if (mine === 2) score += 3;
    else if (mine === 1) score += 1;
    if (theirs === 2) score -= 3;
    else if (theirs === 1) score -= 1;
  }
  return score;
}

function sttEvaluate(state, playerIndex) {
  const myMark = MARKS[playerIndex];
  const theirMark = MARKS[1 - playerIndex];
  let score = 0;

  for (let b = 0; b < 9; b++) {
    const winner = state.subWinners[b];
    if (winner === myMark) score += 55 * SUB_WEIGHT[b];
    else if (winner === theirMark) score -= 55 * SUB_WEIGHT[b];
    else if (winner === null) score += scoreSmallBoard(state.boards[b], myMark, theirMark) * SUB_WEIGHT[b];
  }

  // Meta-level threats: two claimed boards on a line with the third still open.
  for (const line of sttt.META_LINES) {
    let mine = 0;
    let theirs = 0;
    let open = 0;
    for (const i of line) {
      const w = state.subWinners[i];
      if (w === myMark) mine += 1;
      else if (w === theirMark) theirs += 1;
      else if (w === null) open += 1;
    }
    if (open === 0) continue;
    if (mine === 2) score += 80;
    else if (mine === 1) score += 8;
    if (theirs === 2) score -= 90;
    else if (theirs === 1) score -= 8;
  }

  // Sending the opponent somewhere they can play anywhere is a real concession.
  if (state.activeBoard === null) score -= 12;
  return score;
}

function sttChoose(state, playerIndex, level) {
  const depth = level >= 9 ? 4 : level >= 6 ? 3 : level >= 3 ? 2 : 1;
  const scored = rankMoves(sttt, state, playerIndex, depth, sttEvaluate, { maxNodes: 70000 });
  return pickByLevel(scored, level);
}

/* ---------------- Dots and Boxes ---------------- */
// Search doesn't pay here (40 lines, long forced chains), but the classic
// heuristic does: take free boxes, never hand one over, and when forced to give
// something away, give away as little as possible.
function dabCountGiveaways(state, move) {
  let worst = 0;
  for (const [br, bc] of dab.boxesTouchedBy(move)) {
    const sides = dab.boxSideCount(state, br, bc);
    if (sides === 2) worst += 1; // claiming a third side opens this box
  }
  return worst;
}

function dabChainSize(state, move) {
  // Rough size of what the opponent could take if we play this move.
  const after = dab.applyMove(state, 0, move).state;
  let free = 0;
  for (let br = 0; br < state.rows - 1; br++) {
    for (let bc = 0; bc < state.cols - 1; bc++) {
      if (after.boxes[br][bc] === null && dab.boxSideCount(after, br, bc) === 3) free += 1;
    }
  }
  return free;
}

function dabChoose(state, playerIndex, level) {
  const moves = dab.legalMoves(state);
  if (!moves.length) return null;

  const scored = moves.map((move) => {
    let score = 0;
    let completes = 0;
    for (const [br, bc] of dab.boxesTouchedBy(move)) {
      if (state.boxes[br][bc] === null && dab.boxSideCount(state, br, bc) === 3) completes += 1;
    }
    if (completes > 0) {
      score += 1000 * completes; // free boxes, always worth taking
    } else {
      const giveaways = dabCountGiveaways(state, move);
      if (giveaways === 0) score += 300; // safe move
      else score -= 40 * giveaways + 10 * dabChainSize(state, move);
    }
    return { move, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return pickByLevel(scored, level);
}

/* ---------------- Rock Paper Scissors ---------------- */
// No tree to search - the edge comes from the fact that people are poor random
// number generators. Higher levels look further back for repeated patterns.
const RPS_BEATEN_BY = { rock: 'paper', paper: 'scissors', scissors: 'rock' };

function rpsPredict(history, playerIndex, level) {
  const mine = history.map((r) => (playerIndex === 0 ? r.p1 : r.p2));
  // Openings are the one moment with no data to go on, but rock is by far the
  // most common human first throw - worth exploiting once the AI is skilled.
  if (!mine.length) return level >= 5 ? 'rock' : null;

  const memory = Math.min(mine.length, 2 + Math.floor(level / 3));
  const recent = mine.slice(-memory);

  // Look for the last time the opponent's recent run appeared, and assume they
  // follow it the same way again.
  for (let len = Math.min(3, recent.length); len >= 1; len--) {
    const pattern = mine.slice(-len).join(',');
    for (let i = mine.length - len - 1; i >= 0; i--) {
      if (mine.slice(i, i + len).join(',') === pattern && mine[i + len]) {
        return mine[i + len];
      }
    }
  }

  // Otherwise counter their most frequent choice.
  const counts = { rock: 0, paper: 0, scissors: 0 };
  for (const choice of recent) counts[choice] += 1;
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
}

function rpsChoose(state, playerIndex, level) {
  const choices = rps.ALL_CHOICES;
  const randomPick = () => ({ choice: choices[Math.floor(Math.random() * choices.length)] });

  // Level 1 is pure chance; higher levels trust the prediction more often.
  const useRead = Math.random() < ((level - 1) / 9) * 0.95;
  if (!useRead) return randomPick();

  const predicted = rpsPredict(state.history || [], 1 - playerIndex, level);
  if (!predicted) return randomPick();
  return { choice: RPS_BEATEN_BY[predicted] };
}

/* ---------------- Registry ---------------- */
const BRAINS = {
  'tic-tac-toe': tttChoose,
  'super-tic-tac-toe': sttChoose,
  'connect-four': c4Choose,
  'rock-paper-scissors': rpsChoose,
  'dots-and-boxes': dabChoose,
};

export function hasAI(gameId) {
  return Boolean(BRAINS[gameId]);
}

export function chooseMove(gameId, state, playerIndex, level) {
  const brain = BRAINS[gameId];
  if (!brain) return null;
  return brain(state, playerIndex, Math.max(1, Math.min(10, level)));
}

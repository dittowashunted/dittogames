// Generic alpha-beta search driven entirely by a shared rule module, so the AI
// can never play by different rules than the server. Because it follows the
// `turn` each rule returns, games where a move can earn another turn (Dots and
// Boxes) are handled without any special casing.

export const WIN_SCORE = 100000;

function terminalScore(result, maximizingFor, depth) {
  if (result.status === 'draw') return 0;
  // Prefer faster wins and slower losses.
  return result.winner === maximizingFor ? WIN_SCORE - depth : -WIN_SCORE + depth;
}

function searchNode(rules, state, turn, maximizingFor, depth, alpha, beta, evaluate, budget) {
  if (depth === 0) return evaluate(state, maximizingFor);
  if (budget.nodes++ > budget.maxNodes) return evaluate(state, maximizingFor);

  const moves = rules.legalMoves(state, turn);
  if (!moves.length) return evaluate(state, maximizingFor);

  const maximizing = turn === maximizingFor;
  let best = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    let result;
    try {
      result = rules.applyMove(state, turn, move);
    } catch {
      continue;
    }

    let score;
    if (result.status !== 'active') {
      score = terminalScore(result, maximizingFor, depth);
    } else {
      score = searchNode(rules, result.state, result.turn, maximizingFor, depth - 1, alpha, beta, evaluate, budget);
    }

    if (maximizing) {
      if (score > best) best = score;
      if (best > alpha) alpha = best;
    } else {
      if (score < best) best = score;
      if (best < beta) beta = best;
    }
    if (alpha >= beta) break;
  }

  return best === Infinity || best === -Infinity ? evaluate(state, maximizingFor) : best;
}

/**
 * Scores every legal move for `playerIndex` and returns them sorted best-first.
 * Returning the whole ranked list (rather than just the best move) is what lets
 * difficulty levels pick deliberately weaker moves.
 */
export function rankMoves(rules, state, playerIndex, depth, evaluate, { maxNodes = 120000, orderMoves } = {}) {
  let moves = rules.legalMoves(state, playerIndex);
  if (orderMoves) moves = orderMoves(state, moves);

  const budget = { nodes: 0, maxNodes };
  const scored = [];

  for (const move of moves) {
    let result;
    try {
      result = rules.applyMove(state, playerIndex, move);
    } catch {
      continue;
    }

    let score;
    if (result.status !== 'active') {
      score = terminalScore(result, playerIndex, 0);
    } else {
      score = searchNode(rules, result.state, result.turn, playerIndex, depth - 1, -Infinity, Infinity, evaluate, budget);
    }
    scored.push({ move, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * Turns a ranked move list into an actual choice for a given skill level.
 * Level 1 plays almost at random; level 10 always takes the best move. In
 * between, the AI sometimes picks a worse (but still legal) option, which feels
 * more like a fallible opponent than simply searching less deeply.
 */
export function pickByLevel(scored, level, rng = Math.random) {
  if (!scored.length) return null;
  if (scored.length === 1) return scored[0].move;

  const blunderChance = Math.max(0, 0.72 - (level - 1) * 0.08);
  if (rng() < blunderChance) {
    // Weaker levels wander further down the ranked list.
    const spread = Math.max(1, Math.round(scored.length * (1 - (level - 1) / 9)));
    const index = Math.min(scored.length - 1, 1 + Math.floor(rng() * spread));
    return scored[index].move;
  }

  // Among equally-best moves, vary the choice so games aren't identical.
  const best = scored[0].score;
  const ties = scored.filter((s) => s.score === best);
  return ties[Math.floor(rng() * ties.length)].move;
}

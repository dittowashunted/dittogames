// Difficulty curves for the 250-level solo campaigns. Levels are generated from
// the level number rather than hand-authored, so they stay consistent, are
// cheap to tune, and every level is reachable and beatable.

export const MAX_LEVEL = 250;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------------- Snake ---------------- */
// Longer targets, a faster tick, and (after a gentle start) walls in the field.
function snakeLevel(level) {
  const targetFood = clamp(3 + Math.floor(level * 0.22), 3, 60);
  const tickMs = Math.round(clamp(170 - level * 0.46, 55, 170));
  const obstacles = level < 5 ? 0 : clamp(Math.floor((level - 4) * 0.17), 0, 38);
  return {
    targetFood,
    tickMs,
    obstacles,
    goal: `Eat ${targetFood} ${targetFood === 1 ? 'apple' : 'apples'}`,
  };
}

/* ---------------- 2048 ---------------- */
// The target tile climbs in bands; later levels also cap how many moves you get.
function g2048Level(level) {
  const bands = [
    [10, 64], [30, 128], [60, 256], [100, 512], [150, 1024], [200, 2048], [MAX_LEVEL, 4096],
  ];
  let targetTile = 64;
  for (const [upTo, tile] of bands) {
    if (level <= upTo) { targetTile = tile; break; }
  }
  // Each move spawns one tile worth 2 (90%) or 4 (10%), so a target tile needs
  // at least targetTile / 2.2 moves no matter how well you play. Limits are a
  // multiple of that floor, tightening with level but never becoming impossible.
  const minimumMoves = Math.ceil(targetTile / 2.2);
  const generosity = clamp(2.4 - level * 0.004, 1.35, 2.4);
  const moveLimit = level < 15 ? 0 : Math.round(minimumMoves * generosity);
  return {
    targetTile,
    moveLimit,
    goal: moveLimit
      ? `Reach ${targetTile} within ${moveLimit} moves`
      : `Reach the ${targetTile} tile`,
  };
}

/* ---------------- Breakout ---------------- */
// More bricks, tougher bricks, a faster ball and a narrower paddle.
function breakoutLevel(level) {
  const rows = clamp(2 + Math.floor(level / 11), 2, 9);
  const cols = clamp(7 + Math.floor(level / 45), 7, 11);
  const ballSpeed = Math.round(clamp(225 + level * 1.5, 225, 560));
  const paddleWidth = Math.round(clamp(104 - level * 0.24, 46, 104));
  const lives = level > 120 ? 2 : 3;
  // Rows (counted from the top) that need more than one hit.
  const toughRows = clamp(Math.floor((level - 8) / 22), 0, rows - 1);
  return {
    rows,
    cols,
    ballSpeed,
    paddleWidth,
    lives,
    toughRows,
    goal: 'Clear every brick',
  };
}

/* ---------------- Minesweeper ---------------- */
// A bigger field and a steadily denser minefield.
function minesweeperLevel(level) {
  const rows = clamp(6 + Math.floor(level / 13), 6, 20);
  const cols = clamp(6 + Math.floor(level / 10), 6, 26);
  const density = clamp(0.115 + level * 0.00062, 0.115, 0.27);
  const cells = rows * cols;
  const mines = clamp(Math.round(cells * density), 4, cells - 12);
  return {
    rows,
    cols,
    mines,
    goal: `Clear ${cells - mines} safe squares`,
  };
}

/* ---------------- Memory Match ---------------- */
// More pairs and a tightening clock.
function memoryLevel(level) {
  const pairs = clamp(3 + Math.floor(level * 0.062), 3, 18);
  const cols = pairs <= 6 ? 4 : pairs <= 12 ? 6 : 6;
  // Seconds allowed: generous early, brisk later, never impossible.
  const perPair = clamp(11 - level * 0.021, 4.2, 11);
  const timeLimit = Math.round(pairs * perPair) + 6;
  return {
    pairs,
    cols,
    timeLimit,
    goal: `Match ${pairs} pairs in ${timeLimit}s`,
  };
}

const CURVES = {
  snake: snakeLevel,
  '2048': g2048Level,
  breakout: breakoutLevel,
  minesweeper: minesweeperLevel,
  'memory-match': memoryLevel,
};

export function hasLevels(gameId) {
  return Boolean(CURVES[gameId]);
}

export function levelConfig(gameId, level) {
  const curve = CURVES[gameId];
  if (!curve) return null;
  return curve(clamp(Math.round(level), 1, MAX_LEVEL));
}

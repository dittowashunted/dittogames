const PREFIX = 'dittogames:';

// The records that make up "progress" - what an account syncs across devices.
const SCORE_GAMES = ['snake', '2048', 'breakout']; // higher is better
const TIME_GAMES = { 'memory-match': ['easy', 'medium', 'hard'], minesweeper: ['easy', 'medium', 'hard'] }; // lower is better

// Progression: highest AI difficulty beaten per versus game, and highest solo
// level reached per single-player game. Both are "higher is better", so they
// ride along in the scores bucket and sync with an account for free.
const VERSUS_GAMES = ['tic-tac-toe', 'super-tic-tac-toe', 'connect-four', 'rock-paper-scissors', 'dots-and-boxes'];
const LEVEL_GAMES = ['snake', '2048', 'breakout', 'minesweeper', 'memory-match'];
export const MAX_AI_LEVEL = 10;
export const MAX_SOLO_LEVEL = 250;

export function loadValue(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveValue(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode, quota) - fail silently */
  }
}

function notifyProgressChanged() {
  document.dispatchEvent(new CustomEvent('dittogames:progress'));
}

export function getBest(gameId) {
  return loadValue(`${gameId}:best`, 0);
}

export function setBestIfHigher(gameId, value) {
  if (value > getBest(gameId)) {
    saveValue(`${gameId}:best`, value);
    notifyProgressChanged();
    return true;
  }
  return false;
}

export function getBestTime(gameId, difficulty) {
  return loadValue(`${gameId}:best:${difficulty}`, null);
}

export function setBestTimeIfLower(gameId, difficulty, seconds) {
  const current = getBestTime(gameId, difficulty);
  if (current === null || seconds < current) {
    saveValue(`${gameId}:best:${difficulty}`, seconds);
    notifyProgressChanged();
    return true;
  }
  return false;
}

// Highest AI level unlocked for a versus game (level 1 is always available).
export function getAiProgress(gameId) {
  const value = loadValue(`ai:${gameId}`, 1);
  return Math.min(MAX_AI_LEVEL, Math.max(1, Number(value) || 1));
}

export function recordAiWin(gameId, level) {
  const unlocked = Math.min(MAX_AI_LEVEL, level + 1);
  if (unlocked > getAiProgress(gameId)) {
    saveValue(`ai:${gameId}`, unlocked);
    notifyProgressChanged();
    return true;
  }
  return false;
}

// Highest solo level unlocked for a single-player game.
export function getSoloProgress(gameId) {
  const value = loadValue(`level:${gameId}`, 1);
  return Math.min(MAX_SOLO_LEVEL, Math.max(1, Number(value) || 1));
}

export function recordSoloClear(gameId, level) {
  const unlocked = Math.min(MAX_SOLO_LEVEL, level + 1);
  if (unlocked > getSoloProgress(gameId)) {
    saveValue(`level:${gameId}`, unlocked);
    notifyProgressChanged();
    return true;
  }
  return false;
}

export function collectProgress() {
  const scores = {};
  for (const id of SCORE_GAMES) {
    const value = getBest(id);
    if (typeof value === 'number' && value > 0) scores[id] = value;
  }
  for (const id of VERSUS_GAMES) {
    const value = getAiProgress(id);
    if (value > 1) scores[`ai:${id}`] = value;
  }
  for (const id of LEVEL_GAMES) {
    const value = getSoloProgress(id);
    if (value > 1) scores[`level:${id}`] = value;
  }
  const times = {};
  for (const [game, difficulties] of Object.entries(TIME_GAMES)) {
    for (const difficulty of difficulties) {
      const value = getBestTime(game, difficulty);
      if (typeof value === 'number') times[`${game}:${difficulty}`] = value;
    }
  }
  return { scores, times };
}

export function applyProgress(progress) {
  if (!progress) return;
  for (const [id, value] of Object.entries(progress.scores || {})) {
    if (typeof value !== 'number') continue;
    if (SCORE_GAMES.includes(id)) {
      if (value > getBest(id)) saveValue(`${id}:best`, value);
      continue;
    }
    const versus = id.startsWith('ai:') && VERSUS_GAMES.includes(id.slice(3));
    const solo = id.startsWith('level:') && LEVEL_GAMES.includes(id.slice(6));
    if (versus && value > getAiProgress(id.slice(3))) saveValue(id, Math.min(MAX_AI_LEVEL, value));
    else if (solo && value > getSoloProgress(id.slice(6))) saveValue(id, Math.min(MAX_SOLO_LEVEL, value));
  }
  for (const [key, value] of Object.entries(progress.times || {})) {
    const [game, difficulty] = key.split(':');
    if (!TIME_GAMES[game] || !TIME_GAMES[game].includes(difficulty) || typeof value !== 'number') continue;
    const current = getBestTime(game, difficulty);
    if (current === null || value < current) saveValue(`${game}:best:${difficulty}`, value);
  }
}

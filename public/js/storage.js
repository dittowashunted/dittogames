const PREFIX = 'dittogames:';

// The records that make up "progress" - what an account syncs across devices.
const SCORE_GAMES = ['snake', '2048', 'breakout']; // higher is better
const TIME_GAMES = { 'memory-match': ['easy', 'medium', 'hard'], minesweeper: ['easy', 'medium', 'hard'] }; // lower is better

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

export function collectProgress() {
  const scores = {};
  for (const id of SCORE_GAMES) {
    const value = getBest(id);
    if (typeof value === 'number' && value > 0) scores[id] = value;
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
    if (!SCORE_GAMES.includes(id) || typeof value !== 'number') continue;
    if (value > getBest(id)) saveValue(`${id}:best`, value);
  }
  for (const [key, value] of Object.entries(progress.times || {})) {
    const [game, difficulty] = key.split(':');
    if (!TIME_GAMES[game] || !TIME_GAMES[game].includes(difficulty) || typeof value !== 'number') continue;
    const current = getBestTime(game, difficulty);
    if (current === null || value < current) saveValue(`${game}:best:${difficulty}`, value);
  }
}

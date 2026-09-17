const PREFIX = 'dittogames:';

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

export function getBest(gameId) {
  return loadValue(`${gameId}:best`, 0);
}

export function setBestIfHigher(gameId, value) {
  const current = getBest(gameId);
  if (value > current) {
    saveValue(`${gameId}:best`, value);
    return true;
  }
  return false;
}

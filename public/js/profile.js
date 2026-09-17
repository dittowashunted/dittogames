const KEY = 'dittogames:name';

export function getDisplayName() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setDisplayName(name) {
  try {
    localStorage.setItem(KEY, name.slice(0, 18));
  } catch {
    /* ignore */
  }
}

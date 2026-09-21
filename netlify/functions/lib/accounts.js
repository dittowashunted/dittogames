const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

const KEY_LENGTH = 64;
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;
const PROGRESS_KEY_RE = /^[a-z0-9:_-]{1,40}$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200;
const MAX_TOKENS = 5;
const MAX_PROGRESS_ENTRIES = 60;
const MAX_INPUT_ENTRIES = 500;
const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function validateCredentials(username, password) {
  const raw = String(username || '').trim();
  if (!USERNAME_RE.test(raw)) {
    return { error: 'Username must be 3-20 letters, numbers, hyphens or underscores.' };
  }
  const pass = String(password || '');
  if (pass.length < MIN_PASSWORD) return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  if (pass.length > MAX_PASSWORD) return { error: 'Password is too long.' };
  return { displayName: raw, username: raw.toLowerCase(), password: pass };
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || '').split(':');
  if (!salt || !expected) return false;
  const derived = await scrypt(password, salt, KEY_LENGTH);
  const expectedBuf = Buffer.from(expected, 'hex');
  if (expectedBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Only hashes are stored, so a leak of the user blob can't be replayed as a session.
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function addToken(user, token) {
  const hashed = hashToken(token);
  user.tokens = [hashed, ...(user.tokens || []).filter((t) => t !== hashed)].slice(0, MAX_TOKENS);
}

function hasToken(user, token) {
  if (!token) return false;
  const hashed = hashToken(token);
  return (user.tokens || []).some((stored) => {
    const a = Buffer.from(stored, 'utf8');
    const b = Buffer.from(hashed, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function isLockedOut(user) {
  return Boolean(user.lockedUntil && user.lockedUntil > Date.now());
}

function registerFailedAttempt(user) {
  user.failedAttempts = (user.failedAttempts || 0) + 1;
  if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    user.lockedUntil = Date.now() + LOCKOUT_MS;
    user.failedAttempts = 0;
  }
}

function clearFailedAttempts(user) {
  user.failedAttempts = 0;
  user.lockedUntil = 0;
}

function emptyProgress() {
  return { scores: {}, times: {} };
}

function sanitizeBucket(bucket) {
  const out = {};
  if (!bucket || typeof bucket !== 'object') return out;
  let seen = 0;
  for (const [key, value] of Object.entries(bucket)) {
    if (seen >= MAX_INPUT_ENTRIES) break;
    seen += 1;
    if (!PROGRESS_KEY_RE.test(key)) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) continue;
    out[key] = value;
  }
  return out;
}

// Applied to the merged result, so an account can never accumulate past the
// limit no matter how many requests it spreads its keys across. Existing
// records are inserted first and so survive truncation.
function capEntries(bucket) {
  const entries = Object.entries(bucket);
  if (entries.length <= MAX_PROGRESS_ENTRIES) return bucket;
  return Object.fromEntries(entries.slice(0, MAX_PROGRESS_ENTRIES));
}

/**
 * Best-of merge so playing on a second device never destroys a record:
 * scores keep the higher value, times keep the lower one.
 */
function mergeProgress(current, incoming) {
  const base = current && typeof current === 'object' ? current : emptyProgress();
  const add = incoming && typeof incoming === 'object' ? incoming : emptyProgress();

  const scores = { ...sanitizeBucket(base.scores) };
  for (const [key, value] of Object.entries(sanitizeBucket(add.scores))) {
    if (!(key in scores) || value > scores[key]) scores[key] = value;
  }

  const times = { ...sanitizeBucket(base.times) };
  for (const [key, value] of Object.entries(sanitizeBucket(add.times))) {
    if (!(key in times) || value < times[key]) times[key] = value;
  }

  return { scores: capEntries(scores), times: capEntries(times) };
}

function publicUser(user) {
  return {
    username: user.username,
    displayName: user.displayName || user.username,
    progress: user.progress || emptyProgress(),
  };
}

module.exports = {
  normalizeUsername,
  validateCredentials,
  hashPassword,
  verifyPassword,
  createToken,
  hashToken,
  addToken,
  hasToken,
  isLockedOut,
  registerFailedAttempt,
  clearFailedAttempts,
  emptyProgress,
  mergeProgress,
  publicUser,
};

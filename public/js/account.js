import { collectProgress, applyProgress } from './storage.js';
import { showToast } from './toast.js';
import { escapeHtml } from './util.js';

const BASE = '/.netlify/functions';
const SESSION_KEY = 'dittogames:account';
const SYNC_DELAY_MS = 1500;

let session = null;
let syncTimer = null;
let modalMode = 'login';

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(next) {
  session = next;
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  renderHeader();
}

async function post(path, body) {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function renderHeader() {
  const avatar = document.getElementById('account-avatar');
  const label = document.getElementById('account-label');
  if (!avatar || !label) return;
  if (session) {
    avatar.textContent = session.displayName.slice(0, 1);
    label.textContent = session.displayName;
  } else {
    avatar.textContent = '?';
    label.textContent = 'Sign in';
  }
}

function formatTime(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

function statsMarkup() {
  const progress = collectProgress();
  const rows = [];
  const scoreLabels = { snake: 'Snake', '2048': '2048', breakout: 'Breakout' };
  for (const [key, value] of Object.entries(progress.scores)) {
    rows.push(`<div class="account-stat"><span>${escapeHtml(scoreLabels[key] || key)} best</span><span>${value}</span></div>`);
  }
  const timeLabels = { 'memory-match': 'Memory Match', minesweeper: 'Minesweeper' };
  for (const [key, value] of Object.entries(progress.times)) {
    const [game, difficulty] = key.split(':');
    rows.push(
      `<div class="account-stat"><span>${escapeHtml(timeLabels[game] || game)} (${escapeHtml(difficulty)})</span><span>${formatTime(value)}</span></div>`
    );
  }
  if (!rows.length) {
    return '<p class="text-dim" style="font-size:0.88rem;">No records yet — play a solo game and your bests show up here.</p>';
  }
  return `<div class="account-stats">${rows.join('')}</div>`;
}

function closeModal() {
  const modal = document.getElementById('account-modal');
  modal.classList.add('hidden');
  modal.innerHTML = '';
  document.removeEventListener('keydown', onModalKeydown);
}

function onModalKeydown(e) {
  if (e.key === 'Escape') closeModal();
}

function openModal() {
  const modal = document.getElementById('account-modal');
  modal.classList.remove('hidden');
  document.addEventListener('keydown', onModalKeydown);
  renderModal();
}

function renderModal() {
  const modal = document.getElementById('account-modal');

  if (session) {
    modal.innerHTML = `
      <div class="modal__card">
        <h2 class="modal__title" id="account-modal-title">Signed in as ${escapeHtml(session.displayName)}</h2>
        <p class="modal__subtitle">Your best scores and times are saved to this account and follow you to any device.</p>
        ${statsMarkup()}
        <div class="modal__row">
          <button class="btn btn--secondary btn--sm" type="button" data-account="signout">Sign out</button>
          <button class="btn btn--primary btn--sm" type="button" data-account="close">Done</button>
        </div>
      </div>`;
    return;
  }

  const isLogin = modalMode === 'login';
  modal.innerHTML = `
    <div class="modal__card">
      <h2 class="modal__title" id="account-modal-title">${isLogin ? 'Welcome back' : 'Create an account'}</h2>
      <p class="modal__subtitle">
        ${isLogin
          ? 'Sign in to sync your best scores across devices.'
          : 'Optional — accounts only save your best scores and times. You can keep playing without one.'}
      </p>
      <form class="modal__form" data-account="form">
        <input class="text-input" type="text" name="username" placeholder="Username" autocomplete="username"
               maxlength="20" required value="">
        <input class="text-input" type="password" name="password" placeholder="Password"
               autocomplete="${isLogin ? 'current-password' : 'new-password'}" minlength="8" maxlength="200" required>
        <p class="modal__error" data-account="error"></p>
        <button class="btn btn--primary btn--block" type="submit" data-account="submit">
          ${isLogin ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <div class="modal__row">
        <button class="modal__link" type="button" data-account="toggle">
          ${isLogin ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
        <button class="btn btn--ghost btn--sm" type="button" data-account="close">Cancel</button>
      </div>
    </div>`;
  modal.querySelector('input[name="username"]').focus();
}

async function submitCredentials(form) {
  const errorEl = form.querySelector('[data-account="error"]');
  const submitBtn = form.querySelector('[data-account="submit"]');
  const username = form.username.value.trim();
  const password = form.password.value;

  errorEl.textContent = '';
  submitBtn.disabled = true;
  submitBtn.textContent = modalMode === 'login' ? 'Signing in…' : 'Creating…';

  try {
    const path = modalMode === 'login' ? 'account-login' : 'account-signup';
    const data = await post(path, { username, password, progress: collectProgress() });
    saveSession({ username: data.account.username, displayName: data.account.displayName, token: data.token });
    applyProgress(data.account.progress);
    closeModal();
    showToast(modalMode === 'login' ? `Welcome back, ${data.account.displayName}!` : 'Account created — progress will sync.');
  } catch (err) {
    errorEl.textContent = err.message;
    submitBtn.disabled = false;
    submitBtn.textContent = modalMode === 'login' ? 'Sign in' : 'Create account';
  }
}

async function pushProgress() {
  if (!session) return;
  try {
    const data = await post('account-progress', {
      username: session.username,
      token: session.token,
      progress: collectProgress(),
    });
    applyProgress(data.account.progress);
  } catch (err) {
    if (err.status === 403 || err.status === 404) {
      saveSession(null);
      showToast('Your session expired — sign in again to keep syncing.');
    }
  }
}

function scheduleSync() {
  if (!session) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushProgress, SYNC_DELAY_MS);
}

export function initAccountUI() {
  session = loadSession();
  renderHeader();

  document.getElementById('account-btn').addEventListener('click', openModal);

  document.getElementById('account-modal').addEventListener('click', (e) => {
    if (e.target.id === 'account-modal') {
      closeModal();
      return;
    }
    const action = e.target.closest('[data-account]');
    if (!action) return;
    const kind = action.dataset.account;
    if (kind === 'close') closeModal();
    else if (kind === 'toggle') {
      modalMode = modalMode === 'login' ? 'signup' : 'login';
      renderModal();
    } else if (kind === 'signout') {
      saveSession(null);
      closeModal();
      showToast('Signed out. Your records stay on this device.');
    }
  });

  document.getElementById('account-modal').addEventListener('submit', (e) => {
    const form = e.target.closest('[data-account="form"]');
    if (!form) return;
    e.preventDefault();
    submitCredentials(form);
  });

  document.addEventListener('dittogames:progress', scheduleSync);

  // Pull anything set on another device when the page opens.
  if (session) pushProgress();
}

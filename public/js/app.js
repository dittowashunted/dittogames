import { GAMES } from './games/registry.js';

const view = document.getElementById('view');
let activeCleanup = null;

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('dittogames:theme', theme); } catch {}
  } else {
    document.documentElement.removeAttribute('data-theme');
    try { localStorage.removeItem('dittogames:theme'); } catch {}
  }
}

function currentEffectiveTheme() {
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit) return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = currentEffectiveTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});

function gameCard(game) {
  const badgeLabel = game.mode === 'online' ? 'Play Online' : 'Solo';
  const badgeClass = game.mode === 'online' ? 'badge--online' : 'badge--solo';
  return `
    <a class="game-card" href="#/games/${game.id}">
      <div class="game-card__icon">${game.icon}</div>
      <h3 class="game-card__title">${game.name}</h3>
      <p class="game-card__desc">${game.desc}</p>
      <div class="game-card__footer">
        <span class="badge ${badgeClass}"><span class="badge__dot"></span>${badgeLabel}</span>
      </div>
    </a>`;
}

function renderHome(container) {
  const online = GAMES.filter((g) => g.mode === 'online');
  const solo = GAMES.filter((g) => g.mode === 'solo');
  container.innerHTML = `
    <section class="hero">
      <h1>Welcome to <span class="hero__accent">DittoGames</span></h1>
      <p>Free browser games, no sign-up. Play solo, or create a room and send the code to a friend.</p>
    </section>
    <h2 class="section-title">Play online with a friend</h2>
    <div class="game-grid">${online.map(gameCard).join('')}</div>
    <h2 class="section-title">Solo games</h2>
    <div class="game-grid">${solo.map(gameCard).join('')}</div>
  `;
}

function renderNotFound(container) {
  container.innerHTML = `
    <div class="not-found">
      <p>That page doesn't exist.</p>
      <p class="mt-16"><a class="btn btn--primary" href="#/">Back to all games</a></p>
    </div>`;
}

function gamePageShell() {
  return `
    <div class="game-page__header">
      <a class="back-link" href="#/">&larr; All games</a>
    </div>
    <div id="game-mount"></div>`;
}

async function loadGameRoute(gameId, params) {
  const meta = GAMES.find((g) => g.id === gameId);
  if (!meta) {
    renderNotFound(view);
    return;
  }
  document.title = `${meta.name} — DittoGames`;
  view.innerHTML = `<div class="game-loading">Loading ${meta.name}&hellip;</div>`;
  try {
    const mod = await meta.load();
    view.innerHTML = gamePageShell();
    const mountEl = document.getElementById('game-mount');
    const cleanup = mod.mount(mountEl, meta, params);
    activeCleanup = typeof cleanup === 'function' ? cleanup : null;
  } catch (err) {
    console.error('Failed to load game', meta.id, err);
    view.innerHTML = `
      <div class="error-state">
        <p>Something went wrong loading ${meta.name}.</p>
        <p class="mt-16"><a class="btn btn--secondary" href="#/">Back to all games</a></p>
      </div>`;
  }
}

async function router() {
  if (activeCleanup) {
    try { activeCleanup(); } catch (err) { console.error(err); }
    activeCleanup = null;
  }

  const raw = location.hash.replace(/^#\/?/, '');
  const [path, queryString] = raw.split('?');
  const [section, gameId] = path.split('/');
  const params = new URLSearchParams(queryString || '');

  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });

  if (!section) {
    document.title = 'DittoGames — play together, anywhere';
    renderHome(view);
    return;
  }

  if (section === 'games' && gameId) {
    await loadGameRoute(gameId, params);
    return;
  }

  document.title = 'DittoGames';
  renderNotFound(view);
}

window.addEventListener('hashchange', router);
router();

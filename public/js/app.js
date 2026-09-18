import { GAMES } from './games/registry.js';
import { POLLS } from './polls/registry.js';

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

const LOGO_MARK_SVG = `
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="16" fill="currentColor"/>
    <circle cx="22" cy="24" r="5.5" fill="#faf5ea"/>
    <circle cx="42" cy="24" r="5.5" fill="#faf5ea"/>
    <circle cx="22" cy="42" r="5.5" fill="#faf5ea"/>
    <circle cx="42" cy="42" r="5.5" fill="#faf5ea"/>
    <circle cx="32" cy="33" r="5.5" fill="#faf5ea"/>
  </svg>`;

function wordmark(word1, word2) {
  return `<h1 class="hero__wordmark"><a href="#/">${word1}<span class="hero__dot">${LOGO_MARK_SVG}</span><span class="hero__accent">${word2}</span></a></h1>`;
}

function cardArt(id) {
  return `<div class="card-art" style="background-image:url('/img/cards/${id}.jpg')"></div>`;
}

function gameCard(game, index) {
  const tile = `tile--${(index % 8) + 1}`;
  return `
    <a class="game-card ${tile}" href="#/games/${game.id}">
      ${cardArt(game.id)}
      <div class="game-card__icon">${game.icon}</div>
      <h3 class="game-card__title">${game.name}</h3>
      <p class="game-card__desc">${game.desc}</p>
    </a>`;
}

function hubCard({ id, title, tagline, emoji, theme, href }) {
  return `
    <a class="poll-card ${theme}" href="${href}">
      ${cardArt(id)}
      <span class="poll-card__emoji">${emoji}</span>
      <h3 class="poll-card__title">${title}</h3>
      <p class="poll-card__tagline">${tagline}</p>
    </a>`;
}

function renderMainHub(container) {
  container.innerHTML = `
    <section class="hero">
      ${wordmark('DITTO', 'GAMES')}
      <p>Browser games and quick polls. No sign-up, no ads.</p>
    </section>
    <div class="hub-grid">
      ${hubCard({
        id: 'games',
        title: 'Games',
        tagline: 'Ten browser games — play solo or with a friend.',
        emoji: '🎮',
        theme: 'poll-card--games-hub',
        href: '#/games',
      })}
      ${hubCard({
        id: 'polls',
        title: 'Polls',
        tagline: 'Pick from a real list. See what everyone picked.',
        emoji: '🗳️',
        theme: 'poll-card--polls-hub',
        href: '#/polls',
      })}
    </div>
  `;
}

function renderGamesHome(container) {
  const online = GAMES.filter((g) => g.mode === 'online');
  const solo = GAMES.filter((g) => g.mode === 'solo');
  container.innerHTML = `
    <section class="hero">
      ${wordmark('DITTO', 'GAMES')}
      <p>Ten browser games. No sign-up, no ads, no accounts. Just play.</p>
    </section>
    <h2 class="section-title">Play with a friend</h2>
    <div class="game-grid">${online.map(gameCard).join('')}</div>
    <h2 class="section-title">Solo</h2>
    <div class="game-grid">${solo.map(gameCard).join('')}</div>
  `;
}

function pollCard(poll) {
  return `
    <a class="poll-card ${poll.theme}" href="#/polls/${poll.id}">
      ${cardArt(poll.id)}
      <span class="poll-card__emoji">${poll.emoji}</span>
      <h3 class="poll-card__title">${poll.title}</h3>
      <p class="poll-card__tagline">${poll.tagline}</p>
    </a>`;
}

function renderPollsHome(container) {
  container.innerHTML = `
    <section class="hero poll-hero">
      ${wordmark('DITTO', 'POLLS')}
      <p>Pick from a real list. See what everyone else picked.</p>
    </section>
    <div class="poll-grid">${POLLS.map(pollCard).join('')}</div>
  `;
}

function renderNotFound(container) {
  container.innerHTML = `
    <div class="not-found">
      <p>That page doesn't exist.</p>
      <p class="mt-16"><a class="btn btn--primary" href="#/">Back home</a></p>
    </div>`;
}

function gamePageShell() {
  return `
    <div class="game-page__header">
      <a class="back-link" href="#/games">&larr; All games</a>
    </div>
    <div id="game-mount"></div>`;
}

function pollPageShell() {
  return `
    <div class="game-page__header">
      <a class="back-link" href="#/polls">&larr; All polls</a>
    </div>
    <div id="poll-mount"></div>`;
}

async function loadPollRoute(pollId) {
  const meta = POLLS.find((p) => p.id === pollId && p.status === 'live');
  if (!meta) {
    renderNotFound(view);
    return;
  }
  document.title = `${meta.title} — DittoPolls`;
  view.innerHTML = `<div class="game-loading">Loading ${meta.title}&hellip;</div>`;
  try {
    const mod = meta.type === 'choice' ? await import('./polls/choice-poll.js') : null;
    if (!mod) throw new Error(`Unknown poll type: ${meta.type}`);
    view.innerHTML = pollPageShell();
    const mountEl = document.getElementById('poll-mount');
    const cleanup = mod.mount(mountEl, meta);
    activeCleanup = typeof cleanup === 'function' ? cleanup : null;
  } catch (err) {
    console.error('Failed to load poll', meta.id, err);
    view.innerHTML = `
      <div class="error-state">
        <p>Something went wrong loading ${meta.title}.</p>
        <p class="mt-16"><a class="btn btn--secondary" href="#/polls">Back to all polls</a></p>
      </div>`;
  }
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
        <p class="mt-16"><a class="btn btn--secondary" href="#/games">Back to all games</a></p>
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
    document.title = 'DittoGames — games and polls';
    renderMainHub(view);
    return;
  }

  if (section === 'games' && !gameId) {
    document.title = 'DittoGames — all games';
    renderGamesHome(view);
    return;
  }

  if (section === 'games' && gameId) {
    await loadGameRoute(gameId, params);
    return;
  }

  if (section === 'polls' && !gameId) {
    document.title = 'DittoPolls — pick your favorites';
    renderPollsHome(view);
    return;
  }

  if (section === 'polls' && gameId) {
    await loadPollRoute(gameId);
    return;
  }

  document.title = 'DittoGames';
  renderNotFound(view);
}

window.addEventListener('hashchange', router);
router();

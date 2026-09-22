import { escapeHtml } from './util.js';
import { iconFor } from './icons.js';
import { levelConfig, MAX_LEVEL } from './levels.js';
import { getSoloProgress, recordSoloClear } from './storage.js';

/**
 * Wraps a single-player game with its 250-level campaign: a mode choice, a
 * level picker, the goal banner, and the win/lose panel. The game itself only
 * has to honour a level config and call complete() or fail().
 */
export function mountSoloGame(container, opts) {
  const {
    gameId,
    gameName,
    icon = '',
    start, // (stageEl, api) => cleanup
    endlessLabel = 'Endless',
    endlessDesc = 'No levels, no limits — just chase a high score.',
    instructionsHtml = '',
  } = opts;

  const titleIcon = iconFor(gameId)
    ? `<span class="game-page__title-icon">${iconFor(gameId)}</span>`
    : `${icon} `;

  let cleanupActive = null;
  let destroyed = false;
  let currentLevel = 1;

  function clearActive() {
    if (cleanupActive) {
      try { cleanupActive(); } catch (err) { console.error(err); }
      cleanupActive = null;
    }
    container.innerHTML = '';
  }

  function title() {
    return `<h1 class="game-page__title">${titleIcon}${escapeHtml(gameName)}</h1>`;
  }

  function showModes() {
    clearActive();
    if (destroyed) return;
    const reached = getSoloProgress(gameId);
    container.innerHTML = `
      ${title()}
      <div class="mode-picker">
        <button class="mode-card" type="button" data-solo="levels">
          <span class="mode-card__title">Level campaign</span>
          <span class="mode-card__desc">${MAX_LEVEL} levels, each harder than the last — you're on level ${reached}.</span>
        </button>
        <button class="mode-card" type="button" data-solo="endless">
          <span class="mode-card__title">${escapeHtml(endlessLabel)}</span>
          <span class="mode-card__desc">${escapeHtml(endlessDesc)}</span>
        </button>
      </div>
      ${instructionsHtml ? `<div class="instructions">${instructionsHtml}</div>` : ''}
    `;
  }

  function showLevels() {
    clearActive();
    if (destroyed) return;
    const reached = getSoloProgress(gameId);
    const cards = [];
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const locked = level > reached;
      const current = level === reached;
      cards.push(
        `<button class="level-chip${locked ? ' level-chip--locked' : ''}${current ? ' level-chip--current' : ''}" type="button" data-play="${level}" ${locked ? 'disabled' : ''}>${level}</button>`
      );
    }
    container.innerHTML = `
      ${title()}
      <div class="level-campaign">
        <p class="text-center text-dim">Cleared ${reached - 1} of ${MAX_LEVEL} levels.</p>
        <div class="level-chip-grid">${cards.join('')}</div>
        <div class="text-center mt-16">
          <button class="btn btn--primary" type="button" data-play="${reached}">Play level ${reached}</button>
          <button class="btn btn--ghost btn--sm" type="button" data-solo="modes">Back</button>
        </div>
      </div>
    `;
    const currentChip = container.querySelector('.level-chip--current');
    if (currentChip) currentChip.scrollIntoView({ block: 'center' });
  }

  function endPanel({ won, level, detail }) {
    const nextLevel = Math.min(MAX_LEVEL, level + 1);
    const isLast = level >= MAX_LEVEL;
    return `
      <div class="game-over-panel">
        <div class="game-over-panel__title">${won ? '🎉 Level ' + level + ' complete!' : '💥 Level ' + level + ' failed'}</div>
        ${detail ? `<p class="text-dim">${escapeHtml(detail)}</p>` : ''}
        <div class="game-over-actions">
          ${won && !isLast ? `<button class="btn btn--primary" type="button" data-play="${nextLevel}">Next level</button>` : ''}
          ${won && isLast ? '<p class="text-dim">That was the last level. Nothing left to prove.</p>' : ''}
          <button class="btn btn--secondary" type="button" data-play="${level}">${won ? 'Replay' : 'Try again'}</button>
          <button class="btn btn--ghost" type="button" data-solo="levels">All levels</button>
        </div>
      </div>`;
  }

  function playLevel(level) {
    clearActive();
    if (destroyed) return;
    currentLevel = level;
    const config = levelConfig(gameId, level);

    container.innerHTML = `
      ${title()}
      <div class="level-bar">
        <span class="level-bar__num">Level ${level}</span>
        <span class="level-bar__goal">${escapeHtml(config.goal)}</span>
        <button class="btn btn--ghost btn--sm" type="button" data-solo="levels">Levels</button>
      </div>
      <div class="solo-stage"></div>
      ${instructionsHtml ? `<div class="instructions">${instructionsHtml}</div>` : ''}
    `;

    const stageEl = container.querySelector('.solo-stage');
    let settled = false;

    const api = {
      level,
      config,
      complete(detail) {
        if (settled || destroyed) return;
        settled = true;
        recordSoloClear(gameId, level);
        stageEl.insertAdjacentHTML('afterend', endPanel({ won: true, level, detail }));
      },
      fail(detail) {
        if (settled || destroyed) return;
        settled = true;
        stageEl.insertAdjacentHTML('afterend', endPanel({ won: false, level, detail }));
      },
    };

    cleanupActive = start(stageEl, api) || null;
  }

  function playEndless() {
    clearActive();
    if (destroyed) return;
    container.innerHTML = `
      ${title()}
      <div class="level-bar">
        <span class="level-bar__num">${escapeHtml(endlessLabel)}</span>
        <span class="level-bar__goal">No level goal — play as long as you can.</span>
        <button class="btn btn--ghost btn--sm" type="button" data-solo="modes">Modes</button>
      </div>
      <div class="solo-stage"></div>
      ${instructionsHtml ? `<div class="instructions">${instructionsHtml}</div>` : ''}
    `;
    const stageEl = container.querySelector('.solo-stage');
    cleanupActive = start(stageEl, { level: null, config: null, complete() {}, fail() {} }) || null;
  }

  container.addEventListener('click', (event) => {
    const play = event.target.closest('[data-play]');
    if (play && !play.disabled) {
      playLevel(Number(play.dataset.play));
      return;
    }
    const solo = event.target.closest('[data-solo]');
    if (!solo) return;
    if (solo.dataset.solo === 'levels') showLevels();
    else if (solo.dataset.solo === 'endless') playEndless();
    else showModes();
  });

  showModes();

  return function cleanup() {
    destroyed = true;
    clearActive();
  };
}

import { escapeHtml } from './util.js';
import { iconFor } from './icons.js';
import { mountOnlineGame } from './online-shell.js';
import { mountLocalMatch } from './local-shell.js';
import { getAiProgress, MAX_AI_LEVEL } from './storage.js';

const LEVEL_BLURBS = [
  'Barely paying attention.',
  'Learning the ropes.',
  'Spots the obvious.',
  'Blocks simple threats.',
  'Plays a steady game.',
  'Thinks a few moves ahead.',
  'Punishes mistakes.',
  'Rarely slips up.',
  'Reads you well.',
  'Plays to win.',
];

/**
 * Wraps a versus game with its three ways to play: online against a friend,
 * two people on one device, or the built-in AI. Each mode hands the same
 * renderBoard to whichever engine drives it.
 */
export function mountVersusGame(container, opts) {
  const { gameId, gameName, icon, params = new URLSearchParams() } = opts;
  const titleIcon = iconFor(gameId)
    ? `<span class="game-page__title-icon">${iconFor(gameId)}</span>`
    : `${icon} `;

  let cleanupActive = null;
  let destroyed = false;

  function clearActive() {
    if (cleanupActive) {
      try { cleanupActive(); } catch (err) { console.error(err); }
      cleanupActive = null;
    }
    container.innerHTML = '';
  }

  function showModes() {
    clearActive();
    if (destroyed) return;
    const unlocked = getAiProgress(gameId);
    container.innerHTML = `
      <h1 class="game-page__title">${titleIcon}${escapeHtml(gameName)}</h1>
      <div class="mode-picker">
        <button class="mode-card" type="button" data-mode="ai">
          <span class="mode-card__title">Vs computer</span>
          <span class="mode-card__desc">10 difficulty levels — you're on level ${unlocked} of ${MAX_AI_LEVEL}.</span>
        </button>
        <button class="mode-card" type="button" data-mode="pass">
          <span class="mode-card__title">Two players, one device</span>
          <span class="mode-card__desc">Pass it back and forth — no code, no internet needed.</span>
        </button>
        <button class="mode-card" type="button" data-mode="online">
          <span class="mode-card__title">Online with a friend</span>
          <span class="mode-card__desc">Create a room and send them the code.</span>
        </button>
      </div>
      ${opts.instructionsHtml ? `<div class="instructions">${opts.instructionsHtml}</div>` : ''}
    `;
  }

  function showLevels() {
    clearActive();
    if (destroyed) return;
    const unlocked = getAiProgress(gameId);
    const buttons = [];
    for (let level = 1; level <= MAX_AI_LEVEL; level++) {
      const locked = level > unlocked;
      buttons.push(`
        <button class="level-card${locked ? ' level-card--locked' : ''}" type="button"
                data-level="${level}" ${locked ? 'disabled' : ''}>
          <span class="level-card__num">${level}</span>
          <span class="level-card__desc">${locked ? 'Locked' : escapeHtml(LEVEL_BLURBS[level - 1])}</span>
        </button>`);
    }
    container.innerHTML = `
      <h1 class="game-page__title">${titleIcon}${escapeHtml(gameName)}</h1>
      <p class="text-center text-dim">Beat a level to unlock the next one.</p>
      <div class="level-grid">${buttons.join('')}</div>
      <div class="text-center mt-16">
        <button class="btn btn--ghost btn--sm" type="button" data-back="modes">Back</button>
      </div>
    `;
  }

  function startLocal(mode, aiLevel) {
    clearActive();
    if (destroyed) return;
    cleanupActive = mountLocalMatch(container, {
      ...opts,
      titleIcon,
      mode,
      aiLevel,
      onExit: mode === 'ai' ? showLevels : showModes,
    });
  }

  function startOnline() {
    clearActive();
    if (destroyed) return;
    cleanupActive = mountOnlineGame(container, opts);
  }

  container.addEventListener('click', (event) => {
    const mode = event.target.closest('[data-mode]');
    if (mode) {
      if (mode.dataset.mode === 'online') startOnline();
      else if (mode.dataset.mode === 'pass') startLocal('pass');
      else showLevels();
      return;
    }
    const level = event.target.closest('[data-level]');
    if (level && !level.disabled) {
      startLocal('ai', Number(level.dataset.level));
      return;
    }
    const back = event.target.closest('[data-back]');
    if (back) showModes();
  });

  // An invite link should drop straight into the online game.
  if (params.get('join')) startOnline();
  else showModes();

  return function cleanup() {
    destroyed = true;
    clearActive();
  };
}

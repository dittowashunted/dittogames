import { loadValue, saveValue, getBestTime, setBestTimeIfLower } from '../storage.js';
import { showToast } from '../toast.js';
import { iconFor, MEMORY_SYMBOLS } from '../icons.js';
import { mountSoloGame } from '../solo-shell.js';

const DIFFICULTIES = {
  easy: { label: 'Easy', cols: 4, pairs: 6 },
  medium: { label: 'Medium', cols: 4, pairs: 8 },
  hard: { label: 'Hard', cols: 6, pairs: 12 },
};

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startMemory(stageEl, api) {
  const levelMode = Boolean(api.config);

  stageEl.innerHTML = `
    ${levelMode ? '' : '<div class="diff-picker" id="mm-diff"></div>'}
    <div class="memory-toolbar">
      <div class="arcade-hud__item"><span class="arcade-hud__label">Moves</span><span class="arcade-hud__value" id="mm-moves">0</span></div>
      <div class="arcade-hud__item"><span class="arcade-hud__label">${levelMode ? 'Time left' : 'Time'}</span><span class="arcade-hud__value" id="mm-time">0:00</span></div>
      <div class="arcade-hud__item"><span class="arcade-hud__label">${levelMode ? 'Pairs' : 'Best'}</span><span class="arcade-hud__value" id="mm-best">\u2014</span></div>
    </div>
    <div class="memory-grid" id="mm-grid"></div>
    <div class="text-center mt-16">
      <button class="btn btn--secondary btn--sm" type="button" id="mm-new">${levelMode ? 'Restart' : 'New Game'}</button>
    </div>
  `;

  const diffEl = stageEl.querySelector('#mm-diff');
  const gridEl = stageEl.querySelector('#mm-grid');
  const movesEl = stageEl.querySelector('#mm-moves');
  const timeEl = stageEl.querySelector('#mm-time');
  const bestEl = stageEl.querySelector('#mm-best');

  let difficulty = loadValue('memory-match:difficulty', 'medium');
  let cards = [];
  let flipped = [];
  let matchedCount = 0;
  let moves = 0;
  let seconds = 0;
  let timer = null;
  let locked = false;
  let started = false;
  let finished = false;

  function conf() {
    const c = levelMode ? api.config : DIFFICULTIES[difficulty];
    // A board can't hold more pairs than there are distinct symbols, and a
    // board that repeats one could never be fully matched.
    return c.pairs > MEMORY_SYMBOLS.length ? { ...c, pairs: MEMORY_SYMBOLS.length } : c;
  }

  if (diffEl) {
    diffEl.innerHTML = Object.entries(DIFFICULTIES)
      .map(([key, d]) => `<button class="diff-btn" type="button" data-diff="${key}" aria-pressed="${key === difficulty}">${d.label}</button>`)
      .join('');
  }

  function updateSideStat() {
    if (levelMode) {
      bestEl.textContent = `${matchedCount}/${conf().pairs}`;
      return;
    }
    const best = getBestTime('memory-match', difficulty);
    bestEl.textContent = best === null ? '\u2014' : formatTime(best);
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      seconds += 1;
      if (levelMode) {
        const left = conf().timeLimit - seconds;
        timeEl.textContent = formatTime(Math.max(0, left));
        if (left <= 0) {
          stopTimer();
          finished = true;
          locked = true;
          api.fail(`Ran out of time with ${matchedCount} of ${conf().pairs} pairs matched.`);
        }
        return;
      }
      timeEl.textContent = formatTime(seconds);
    }, 1000);
  }

  function newGame() {
    stopTimer();
    const c = conf();
    const symbols = shuffle(MEMORY_SYMBOLS).slice(0, c.pairs);
    cards = shuffle([...symbols, ...symbols]).map((symbol, i) => ({ id: i, symbol, flipped: false, matched: false }));
    flipped = [];
    matchedCount = 0;
    moves = 0;
    seconds = 0;
    locked = false;
    started = false;
    finished = false;
    movesEl.textContent = '0';
    timeEl.textContent = levelMode ? formatTime(c.timeLimit) : '0:00';
    updateSideStat();
    gridEl.style.gridTemplateColumns = `repeat(${c.cols}, 1fr)`;
    renderCards();
  }

  function renderCards() {
    gridEl.innerHTML = '';
    cards.forEach((card) => {
      const el = document.createElement('div');
      el.className = 'memory-card' + (card.flipped || card.matched ? (card.matched ? ' matched' : ' flipped') : '');
      el.innerHTML = `
        <div class="memory-card__face memory-card__face--back"><span class="memory-card__mark">?</span></div>
        <div class="memory-card__face memory-card__face--front">${iconFor(card.symbol)}</div>
      `;
      el.addEventListener('click', () => flipCard(card.id));
      gridEl.appendChild(el);
    });
  }

  function flipCard(id) {
    if (locked || finished) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;

    if (!started) {
      started = true;
      startTimer();
    }

    card.flipped = true;
    flipped.push(card);
    renderCards();

    if (flipped.length === 2) {
      moves += 1;
      movesEl.textContent = String(moves);
      locked = true;
      const [a, b] = flipped;
      if (a.symbol === b.symbol) {
        setTimeout(() => {
          if (finished) return;
          a.matched = true;
          b.matched = true;
          matchedCount += 1;
          flipped = [];
          locked = false;
          renderCards();
          updateSideStat();
          if (matchedCount === conf().pairs) {
            stopTimer();
            finished = true;
            if (levelMode) {
              api.complete(`Solved in ${moves} moves with ${Math.max(0, conf().timeLimit - seconds)}s to spare.`);
              return;
            }
            const isBest = setBestTimeIfLower('memory-match', difficulty, seconds);
            updateSideStat();
            showToast(`Solved in ${moves} moves, ${formatTime(seconds)}!${isBest ? ' New best time! \uD83C\uDF89' : ''}`, 4000);
          }
        }, 450);
      } else {
        setTimeout(() => {
          if (finished) return;
          a.flipped = false;
          b.flipped = false;
          flipped = [];
          locked = false;
          renderCards();
        }, 700);
      }
    }
  }

  if (diffEl) {
    diffEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-diff]');
      if (!btn) return;
      difficulty = btn.dataset.diff;
      saveValue('memory-match:difficulty', difficulty);
      diffEl.querySelectorAll('.diff-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.diff === difficulty)));
      newGame();
    });
  }

  stageEl.querySelector('#mm-new').addEventListener('click', newGame);

  newGame();

  return function cleanup() {
    stopTimer();
    finished = true;
  };
}

export function mount(container, meta) {
  return mountSoloGame(container, {
    gameId: 'memory-match',
    gameName: 'Memory Match',
    icon: (meta && meta.icon) || '\uD83E\uDDE0',
    endlessLabel: 'Classic',
    endlessDesc: 'Pick a size and chase your best time.',
    instructionsHtml: '<strong>How to play:</strong> Flip two cards at a time and remember what you saw. Match every pair to finish.',
    start: startMemory,
  });
}

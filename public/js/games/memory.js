import { loadValue, saveValue } from '../storage.js';
import { showToast } from '../toast.js';
import { iconFor } from '../icons.js';

const SYMBOLS = [
  'sym-star', 'sym-heart', 'sym-bolt', 'sym-moon', 'sym-sun', 'sym-leaf',
  'sym-diamond', 'sym-cloud', 'sym-anchor', 'sym-camera', 'favorite-album', 'best-video-game',
];

const DIFFICULTIES = {
  easy: { label: 'Easy', cols: 4, pairs: 6 },
  medium: { label: 'Medium', cols: 4, pairs: 8 },
  hard: { label: 'Hard', cols: 6, pairs: 12 },
};

function bestKey(diff) {
  return `memory-match:best:${diff}`;
}

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

export function mount(container) {
  container.innerHTML = `
    <div class="game-page">
      <h1 class="game-page__title"><span class="game-page__title-icon">${iconFor('memory-match')}</span>Memory Match</h1>
      <div class="diff-picker" id="mm-diff"></div>
      <div class="memory-toolbar">
        <div class="arcade-hud__item"><span class="arcade-hud__label">Moves</span><span class="arcade-hud__value" id="mm-moves">0</span></div>
        <div class="arcade-hud__item"><span class="arcade-hud__label">Time</span><span class="arcade-hud__value" id="mm-time">0:00</span></div>
        <div class="arcade-hud__item"><span class="arcade-hud__label">Best</span><span class="arcade-hud__value" id="mm-best">—</span></div>
      </div>
      <div class="memory-grid" id="mm-grid"></div>
      <div class="text-center mt-16">
        <button class="btn btn--secondary btn--sm" type="button" id="mm-new">New Game</button>
      </div>
    </div>
  `;

  const diffEl = container.querySelector('#mm-diff');
  const gridEl = container.querySelector('#mm-grid');
  const movesEl = container.querySelector('#mm-moves');
  const timeEl = container.querySelector('#mm-time');
  const bestEl = container.querySelector('#mm-best');

  let difficulty = loadValue('memory-match:difficulty', 'medium');
  let cards = [];
  let flipped = [];
  let matchedCount = 0;
  let moves = 0;
  let seconds = 0;
  let timer = null;
  let locked = false;
  let started = false;

  diffEl.innerHTML = Object.entries(DIFFICULTIES)
    .map(([key, d]) => `<button class="diff-btn" type="button" data-diff="${key}" aria-pressed="${key === difficulty}">${d.label}</button>`)
    .join('');

  function updateBestDisplay() {
    const best = loadValue(bestKey(difficulty), null);
    bestEl.textContent = best === null ? '—' : formatTime(best);
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      seconds += 1;
      timeEl.textContent = formatTime(seconds);
    }, 1000);
  }

  function newGame() {
    stopTimer();
    const conf = DIFFICULTIES[difficulty];
    const symbols = shuffle(SYMBOLS).slice(0, conf.pairs);
    cards = shuffle([...symbols, ...symbols]).map((symbol, i) => ({ id: i, symbol, flipped: false, matched: false }));
    flipped = [];
    matchedCount = 0;
    moves = 0;
    seconds = 0;
    locked = false;
    started = false;
    movesEl.textContent = '0';
    timeEl.textContent = '0:00';
    updateBestDisplay();
    gridEl.style.gridTemplateColumns = `repeat(${conf.cols}, 1fr)`;
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
    if (locked) return;
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
          a.matched = true;
          b.matched = true;
          matchedCount += 1;
          flipped = [];
          locked = false;
          renderCards();
          if (matchedCount === DIFFICULTIES[difficulty].pairs) {
            stopTimer();
            const isBest = (() => {
              const current = loadValue(bestKey(difficulty), null);
              if (current === null || seconds < current) {
                saveValue(bestKey(difficulty), seconds);
                return true;
              }
              return false;
            })();
            updateBestDisplay();
            showToast(`Solved in ${moves} moves, ${formatTime(seconds)}!${isBest ? ' New best time! 🎉' : ''}`, 4000);
          }
        }, 450);
      } else {
        setTimeout(() => {
          a.flipped = false;
          b.flipped = false;
          flipped = [];
          locked = false;
          renderCards();
        }, 700);
      }
    }
  }

  diffEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-diff]');
    if (!btn) return;
    difficulty = btn.dataset.diff;
    saveValue('memory-match:difficulty', difficulty);
    diffEl.querySelectorAll('.diff-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.diff === difficulty)));
    newGame();
  });

  container.querySelector('#mm-new').addEventListener('click', newGame);

  newGame();

  return function cleanup() {
    stopTimer();
  };
}

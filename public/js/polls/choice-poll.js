import { escapeHtml } from '../util.js';
import { showToast } from '../toast.js';
import { fetchPollOptions, fetchPollResults, submitVote } from './poll-client.js';
import { getVoterId, getMyVote, setMyVote } from './voter.js';

const RESULTS_LIMIT = 20;

function formatPct(count, total) {
  if (!total) return '0%';
  const pct = (count / total) * 100;
  return `${pct >= 10 ? Math.round(pct) : pct.toFixed(1)}%`;
}

function pctValue(count, total) {
  return total ? (count / total) * 100 : 0;
}

export function mount(container, meta) {
  const pollId = meta.id;
  const voterId = getVoterId();
  let destroyed = false;

  let poll = null; // { id, title, tagline, options }
  const optionsById = new Map();
  let stats = { total: 0, results: [], yourVote: null };
  let tab = getMyVote(pollId) ? 'results' : 'vote';
  let search = '';
  let voting = false;

  container.innerHTML = '<div class="game-loading">Loading poll&hellip;</div>';

  let els = null;

  function buildShell() {
    container.innerHTML = `
      <div class="poll-page">
        <div class="poll-page__head">
          <h1 class="poll-page__title">${escapeHtml(poll.title)}</h1>
          <p class="poll-page__tagline">${escapeHtml(poll.tagline)}</p>
        </div>
        <div class="poll-tabs" role="tablist">
          <button class="poll-tab" type="button" data-tab="vote" role="tab">Vote</button>
          <button class="poll-tab" type="button" data-tab="results" role="tab">
            Results <span class="poll-tab__count" data-el="tab-count"></span>
          </button>
        </div>
        <div class="poll-panel" data-panel="vote">
          <input class="text-input poll-search" type="search" autocomplete="off" spellcheck="false"
            placeholder="Search ${poll.options.length} albums or artists&hellip;" data-el="search" />
          <p class="poll-panel__hint" data-el="shown-hint"></p>
          <div class="option-panel"><div class="option-grid" data-el="option-grid"></div></div>
        </div>
        <div class="poll-panel" data-panel="results">
          <div data-el="results-content"></div>
        </div>
      </div>`;

    els = {
      tabs: container.querySelectorAll('.poll-tab'),
      tabCount: container.querySelector('[data-el="tab-count"]'),
      panelVote: container.querySelector('[data-panel="vote"]'),
      panelResults: container.querySelector('[data-panel="results"]'),
      search: container.querySelector('[data-el="search"]'),
      shownHint: container.querySelector('[data-el="shown-hint"]'),
      optionGrid: container.querySelector('[data-el="option-grid"]'),
      resultsContent: container.querySelector('[data-el="results-content"]'),
    };

    els.tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        tab = btn.dataset.tab;
        renderTabs();
      });
    });

    els.search.addEventListener('input', () => {
      search = els.search.value;
      renderOptionGrid();
    });

    els.optionGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.option-card');
      if (!card || voting) return;
      vote(card.dataset.optionId);
    });

    container.addEventListener('click', (e) => {
      const changeBtn = e.target.closest('[data-action="change-vote"]');
      if (changeBtn) {
        tab = 'vote';
        renderTabs();
        els.search.focus();
      }
    });
  }

  function renderTabs() {
    els.tabs.forEach((btn) => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('poll-tab--active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    els.panelVote.hidden = tab !== 'vote';
    els.panelResults.hidden = tab !== 'results';
    if (tab === 'vote') renderOptionGrid();
    if (tab === 'results') renderResults();
  }

  function matchesSearch(option, query) {
    if (!query) return true;
    const haystack = `${option.artist} ${option.title}`.toLowerCase();
    return haystack.includes(query);
  }

  function renderOptionGrid() {
    const query = search.trim().toLowerCase();
    const matches = poll.options.filter((o) => matchesSearch(o, query));

    els.shownHint.textContent = query
      ? `Showing ${matches.length} of ${poll.options.length} albums`
      : `Tap an album to vote — ${poll.options.length} total`;

    if (!matches.length) {
      els.optionGrid.innerHTML = '<p class="option-empty">No albums match your search.</p>';
      return;
    }

    els.optionGrid.innerHTML = matches
      .map((o) => {
        const selected = stats.yourVote === o.id;
        return `
          <button type="button" class="option-card${selected ? ' option-card--selected' : ''}"
            data-option-id="${escapeHtml(o.id)}" ${voting ? 'disabled' : ''}>
            ${selected ? '<span class="option-card__badge">Your pick</span>' : ''}
            <span class="option-card__title">${escapeHtml(o.title)}</span>
            <span class="option-card__meta">${escapeHtml(o.artist)} &middot; ${o.year}</span>
          </button>`;
      })
      .join('');
  }

  function renderResults() {
    els.tabCount.textContent = `(${stats.total})`;

    if (!stats.total) {
      els.resultsContent.innerHTML = `
        <div class="results-empty">
          <p>No votes yet — be the first to pick an album!</p>
          <button class="btn btn--primary mt-16" type="button" data-action="change-vote">Vote now</button>
        </div>`;
      return;
    }

    const top = stats.results.slice(0, RESULTS_LIMIT);
    const yourVoteInTop = stats.yourVote && top.some((r) => r.optionId === stats.yourVote);
    const yourRank = stats.yourVote ? stats.results.findIndex((r) => r.optionId === stats.yourVote) + 1 : 0;
    const yourVoteOption = stats.yourVote ? optionsById.get(stats.yourVote) : null;
    const yourVoteCount = stats.yourVote ? stats.results.find((r) => r.optionId === stats.yourVote)?.count ?? 0 : 0;

    const banner = yourVoteOption
      ? `
        <div class="poll-your-pick">
          <div>
            <span class="poll-your-pick__label">Your pick</span>
            <strong>${escapeHtml(yourVoteOption.title)}</strong> &mdash; ${escapeHtml(yourVoteOption.artist)}
            <span class="text-dim">(#${yourRank} with ${yourVoteCount} vote${yourVoteCount === 1 ? '' : 's'})</span>
          </div>
          <button class="btn btn--secondary btn--sm" type="button" data-action="change-vote">Change vote</button>
        </div>`
      : `
        <div class="poll-your-pick poll-your-pick--empty">
          <span>You haven&rsquo;t voted yet.</span>
          <button class="btn btn--primary btn--sm" type="button" data-action="change-vote">Vote now</button>
        </div>`;

    const rows = top
      .map((r, i) => {
        const option = optionsById.get(r.optionId);
        if (!option) return '';
        const mine = r.optionId === stats.yourVote;
        const pct = pctValue(r.count, stats.total);
        return `
          <div class="result-row${mine ? ' result-row--mine' : ''}">
            <div class="result-row__bar" style="width:${pct}%"></div>
            <div class="result-row__content">
              <span class="result-row__rank">${i + 1}</span>
              <span class="result-row__main">
                <span class="result-row__title">${escapeHtml(option.title)}</span>
                <span class="result-row__artist">${escapeHtml(option.artist)}</span>
              </span>
              <span class="result-row__stats">
                <strong>${formatPct(r.count, stats.total)}</strong>
                <span class="text-dim">${r.count} vote${r.count === 1 ? '' : 's'}</span>
              </span>
            </div>
          </div>`;
      })
      .join('');

    const outsideNote =
      stats.yourVote && !yourVoteInTop
        ? `<p class="poll-panel__hint mt-16">Your pick is ranked #${yourRank}, outside the top ${RESULTS_LIMIT}.</p>`
        : '';

    els.resultsContent.innerHTML = `
      ${banner}
      <p class="poll-total"><strong>${stats.total}</strong> total vote${stats.total === 1 ? '' : 's'}</p>
      <div class="results-list">${rows}</div>
      ${outsideNote}`;
  }

  async function vote(optionId) {
    if (voting) return;
    voting = true;
    renderOptionGrid();
    try {
      const result = await submitVote(pollId, optionId, voterId);
      stats = result;
      setMyVote(pollId, optionId);
      const option = optionsById.get(optionId);
      showToast(`Voted for ${option ? option.title : 'your pick'}!`);
      tab = 'results';
      renderTabs();
    } catch (err) {
      console.error('poll vote failed', err);
      showToast('Could not record your vote. Please try again.');
    } finally {
      voting = false;
      if (tab === 'vote') renderOptionGrid();
    }
  }

  async function init() {
    try {
      const [options, results] = await Promise.all([
        fetchPollOptions(pollId),
        fetchPollResults(pollId, voterId),
      ]);
      if (destroyed) return;
      poll = options;
      poll.options.forEach((o) => optionsById.set(o.id, o));
      stats = results;
      if (results.yourVote) setMyVote(pollId, results.yourVote);
      else if (getMyVote(pollId) && !results.yourVote) tab = 'vote';

      buildShell();
      renderTabs();
    } catch (err) {
      if (destroyed) return;
      console.error('Failed to load poll', pollId, err);
      container.innerHTML = `
        <div class="error-state">
          <p>Could not load this poll.</p>
          <p class="mt-16"><a class="btn btn--secondary" href="#/polls">Back to all polls</a></p>
        </div>`;
    }
  }

  init();

  return () => {
    destroyed = true;
  };
}

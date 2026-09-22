import { escapeHtml } from './util.js';
import { showToast } from './toast.js';
import { chooseMove } from './ai/index.js';
import { recordAiWin, MAX_AI_LEVEL } from './storage.js';

const AI_THINK_MS = 420;

function outcomeHeadline(winner, myIndex, mode, names) {
  if (winner === 'draw') return { emoji: '🤝', text: "It's a draw!" };
  if (mode === 'ai') {
    return winner === 0
      ? { emoji: '🎉', text: 'You beat the computer!' }
      : { emoji: '🤖', text: 'The computer got you.' };
  }
  return { emoji: '🎉', text: `${names[winner]} wins!` };
}

/**
 * Runs a match entirely in the browser - either against the built-in AI or two
 * people sharing one device. It hands each game's existing renderBoard the same
 * shape the online shell does, so boards need no changes to work offline.
 */
export function mountLocalMatch(container, opts) {
  const {
    gameId,
    gameName,
    titleIcon = '',
    rules,
    mode, // 'ai' | 'pass'
    aiLevel = 1,
    renderBoard,
    instructionsHtml = '',
    simultaneous = false,
    statusForActive = null,
    onExit,
  } = opts;

  const names = mode === 'ai' ? ['You', `Computer · Lv ${aiLevel}`] : ['Player 1', 'Player 2'];

  let state = rules.createInitialState();
  let turn = rules.firstTurn();
  let status = 'active';
  let winner = null;
  let destroyed = false;
  let aiTimer = null;
  // Pass-and-play on a simultaneous game needs a privacy gate between picks.
  let secretSeat = 0;
  let awaitingHandover = false;
  let unlockedMessage = '';

  function humanSeats() {
    return mode === 'ai' ? [0] : [0, 1];
  }

  function perspective() {
    if (mode === 'ai') return 0;
    if (simultaneous) return secretSeat;
    return turn === null ? 0 : turn;
  }

  function statusLine() {
    if (status !== 'active') {
      const outcome = outcomeHeadline(winner, perspective(), mode, names);
      const kind = winner === 'draw' ? 'draw' : (mode === 'ai' ? (winner === 0 ? 'win' : 'lose') : 'win');
      return { text: outcome.text, kind };
    }
    if (awaitingHandover) return { text: `Pass the device to ${names[secretSeat]}`, kind: 'wait' };
    if (simultaneous) {
      if (statusForActive) {
        const fakeRoom = { state: viewState(), status, turn, players: [] };
        return statusForActive(fakeRoom, perspective(), names[1 - perspective()]);
      }
      return { text: 'Make your move', kind: 'you' };
    }
    if (mode === 'ai' && turn === 1) return { text: 'Computer is thinking…', kind: 'wait' };
    return { text: mode === 'ai' ? 'Your turn' : `${names[turn]}'s turn`, kind: 'you' };
  }

  function viewState() {
    return rules.sanitizeForPlayer ? rules.sanitizeForPlayer(state, perspective()) : state;
  }

  function playerPill(index) {
    const active = status === 'active' && (simultaneous ? index === perspective() : turn === index);
    const cls = index === 0 ? 'player-pill--p1' : 'player-pill--p2';
    return `<span class="player-pill ${cls}${active ? ' player-pill--active' : ''}"><span class="player-pill__dot"></span>${escapeHtml(names[index])}</span>`;
  }

  function render() {
    if (destroyed) return;
    const line = statusLine();
    const finished = status !== 'active';
    const outcome = finished ? outcomeHeadline(winner, perspective(), mode, names) : null;

    container.innerHTML = `
      <h1 class="game-page__title">${titleIcon}${escapeHtml(gameName)}</h1>
      <div class="scoreboard">
        ${playerPill(0)}
        <span class="scoreboard__vs">vs</span>
        ${playerPill(1)}
      </div>
      <div class="status-bar status-bar--${line.kind}">${line.text}</div>
      ${awaitingHandover ? `
        <div class="handover">
          <p class="text-dim">${escapeHtml(names[1 - secretSeat])} has locked in their pick.</p>
          <button class="btn btn--primary btn--lg" type="button" data-local="handover">I'm ${escapeHtml(names[secretSeat])} — ready</button>
        </div>` : '<div class="board-slot"></div>'}
      ${!finished && !awaitingHandover ? `<div class="text-center mt-16"><button class="btn btn--ghost btn--sm" type="button" data-local="exit">Leave game</button></div>` : ''}
      ${finished ? `
        <div class="game-over-panel">
          <div class="game-over-panel__title">${outcome.emoji} ${escapeHtml(outcome.text)}</div>
          ${unlockedMessage ? `<p class="text-dim">${escapeHtml(unlockedMessage)}</p>` : ''}
          <div class="game-over-actions">
            <button class="btn btn--primary" type="button" data-local="rematch">Play again</button>
            <button class="btn btn--secondary" type="button" data-local="exit">Back to modes</button>
          </div>
        </div>` : ''}
      ${instructionsHtml ? `<div class="instructions">${instructionsHtml}</div>` : ''}
    `;

    if (awaitingHandover) return;

    const boardEl = container.querySelector('.board-slot');
    const seat = perspective();
    const canAct = status === 'active' && (
      simultaneous ? humanSeats().includes(seat) : humanSeats().includes(turn) && turn === seat
    );

    renderBoard(boardEl, {
      room: { status, turn, winner, players: names.map((n, i) => ({ id: `local-${i}`, name: n, index: i })), state: viewState() },
      state: viewState(),
      myIndex: seat,
      isMyTurn: canAct,
      simultaneous,
      sendMove: (payload) => submit(seat, payload),
    });
  }

  function finish(result) {
    status = result.status;
    winner = result.winner;
    turn = null;
    if (mode === 'ai' && winner === 0) {
      const unlocked = recordAiWin(gameId, aiLevel);
      if (unlocked && aiLevel < MAX_AI_LEVEL) unlockedMessage = `Level ${aiLevel + 1} unlocked!`;
      else if (aiLevel >= MAX_AI_LEVEL) unlockedMessage = 'You beat the hardest level.';
    }
  }

  function submit(seat, payload) {
    if (destroyed || status !== 'active') return;
    let result;
    try {
      result = rules.applyMove(state, seat, payload);
    } catch (err) {
      showToast(err.message || 'That move is not allowed');
      return;
    }

    state = result.state;
    if (result.status !== 'active') {
      finish(result);
      render();
      return;
    }
    turn = result.turn;

    if (simultaneous && mode === 'pass') {
      // Hide the board until the other player has taken the device.
      const otherSeat = 1 - seat;
      if (state.picks && state.picks[otherSeat] === null) {
        secretSeat = otherSeat;
        awaitingHandover = true;
        render();
        return;
      }
      secretSeat = 0;
    }

    render();
    scheduleAI();
  }

  function aiShouldMove() {
    if (mode !== 'ai' || status !== 'active') return false;
    if (simultaneous) return state.picks && state.picks[1] === null;
    return turn === 1;
  }

  function scheduleAI() {
    if (!aiShouldMove()) return;
    clearTimeout(aiTimer);
    aiTimer = setTimeout(() => {
      if (destroyed || !aiShouldMove()) return;
      const move = chooseMove(gameId, state, 1, aiLevel);
      if (!move) return;
      let result;
      try {
        result = rules.applyMove(state, 1, move);
      } catch {
        return;
      }
      state = result.state;
      if (result.status !== 'active') {
        finish(result);
        render();
        return;
      }
      turn = result.turn;
      render();
      scheduleAI(); // a move that earns another turn (Dots and Boxes) chains here
    }, AI_THINK_MS);
  }

  function restart() {
    clearTimeout(aiTimer);
    state = rules.createInitialState();
    turn = rules.firstTurn();
    status = 'active';
    winner = null;
    secretSeat = 0;
    awaitingHandover = false;
    unlockedMessage = '';
    render();
    scheduleAI();
  }

  container.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-local]');
    if (!btn) return;
    const action = btn.dataset.local;
    if (action === 'exit') onExit?.();
    else if (action === 'rematch') restart();
    else if (action === 'handover') {
      awaitingHandover = false;
      render();
    }
  });

  render();
  scheduleAI();

  return function cleanup() {
    destroyed = true;
    clearTimeout(aiTimer);
  };
}

import { RoomClient } from './room-client.js';
import { escapeHtml } from './util.js';
import { showToast } from './toast.js';
import { getDisplayName, setDisplayName } from './profile.js';
import { iconFor } from './icons.js';

function outcomeHeadline(room, myIndex) {
  if (room.winner === 'draw') return { emoji: '🤝', text: "It's a draw!" };
  const opponentIndex = 1 - myIndex;
  if (room.winner === myIndex) {
    if (room.forfeitedBy === opponentIndex) return { emoji: '🏳️', text: 'Your friend left — you win!' };
    return { emoji: '🎉', text: 'You won!' };
  }
  if (room.forfeitedBy === myIndex) return { emoji: '🏳️', text: 'You left that match.' };
  return { emoji: '😅', text: 'You lost this one.' };
}

function defaultStatus(room, myIndex, opponentName) {
  if (room.status === 'finished') {
    const outcome = outcomeHeadline(room, myIndex);
    const kind = room.winner === 'draw' ? 'draw' : room.winner === myIndex ? 'win' : 'lose';
    return { text: outcome.text, kind };
  }
  if (room.turn === myIndex) return { text: 'Your turn', kind: 'you' };
  if (room.turn === 1 - myIndex) return { text: `Waiting for ${escapeHtml(opponentName)}…`, kind: 'wait' };
  return { text: 'Make your move', kind: 'wait' };
}

function playerPill(room, index, myIndex) {
  const p = room.players.find((pl) => pl.index === index);
  const isActive = room.status === 'active' && room.turn === index;
  const name = p ? escapeHtml(p.name) + (index === myIndex ? ' (you)' : '') : 'Waiting…';
  const cls = index === 0 ? 'player-pill--p1' : 'player-pill--p2';
  return `<span class="player-pill ${cls}${isActive ? ' player-pill--active' : ''}"><span class="player-pill__dot"></span>${name}</span>`;
}

export function mountOnlineGame(container, opts) {
  const {
    gameId,
    gameName,
    icon,
    lobbyBlurb,
    instructionsHtml = '',
    simultaneous = false,
    statusForActive = null, // (room, myIndex, opponentName) => { text, kind }
    renderBoard, // (boardEl, ctx) => void
    params = new URLSearchParams(),
  } = opts;

  const client = new RoomClient(gameId);
  const titleIcon = iconFor(gameId)
    ? `<span class="game-page__title-icon">${iconFor(gameId)}</span>`
    : `${icon} `;
  let destroyed = false;
  let phase = 'loading'; // loading | lobby | waiting | play
  let lastError = '';
  let lastRenderKey = null;
  let joinPrefill = (params.get('join') || '').toUpperCase().slice(0, 5);

  function opponentName(room, myIndex) {
    const opp = room.players.find((p) => p.index === 1 - myIndex);
    return opp ? opp.name : 'your friend';
  }

  function inviteLink() {
    return `${location.origin}${location.pathname}#/games/${gameId}?join=${client.code}`;
  }

  function renderLobby() {
    const name = escapeHtml(getDisplayName());
    container.innerHTML = `
      <h1 class="game-page__title">${titleIcon}${escapeHtml(gameName)}</h1>
      <div class="lobby">
        <p class="text-dim">${lobbyBlurb}</p>
        <div class="lobby__name">
          <label class="sr-only" for="player-name">Your name</label>
          <input id="player-name" class="text-input" type="text" placeholder="Your name (optional)" maxlength="18" value="${name}" />
        </div>
        ${lastError ? `<p style="color:var(--color-danger);font-weight:600;font-size:0.85rem;">${escapeHtml(lastError)}</p>` : ''}
        <div class="lobby__choices">
          <div class="lobby-card">
            <h3>Create a room</h3>
            <p>Get a code to send to a friend.</p>
            <button class="btn btn--primary btn--block" data-action="create" type="button">Create Room</button>
          </div>
          <div class="lobby-card">
            <h3>Join a room</h3>
            <p>Enter the code your friend sent you.</p>
            <form class="join-form" data-form="join">
              <input class="text-input code-input" name="code" maxlength="5" placeholder="ABCDE" autocomplete="off" autocapitalize="characters" value="${escapeHtml(joinPrefill)}" />
              <button class="btn btn--secondary btn--block" type="submit">Join Room</button>
            </form>
          </div>
        </div>
      </div>
      ${instructionsHtml ? `<div class="instructions">${instructionsHtml}</div>` : ''}
    `;
    const codeInput = container.querySelector('.code-input');
    if (codeInput) {
      codeInput.addEventListener('input', () => {
        codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      });
    }
  }

  function renderWaiting() {
    const room = client.room;
    container.innerHTML = `
      <h1 class="game-page__title">${titleIcon}${escapeHtml(gameName)}</h1>
      <div class="lobby">
        <p>Send this code to a friend:</p>
        <div class="room-code-box">
          <div class="room-code">${escapeHtml(room.code)}</div>
          <div class="room-code-actions">
            <button class="btn btn--secondary btn--sm" data-action="copy-code" type="button">Copy code</button>
            <button class="btn btn--secondary btn--sm" data-action="copy-link" type="button">Copy invite link</button>
            <button class="btn btn--secondary btn--sm hidden" data-action="share" type="button">Share</button>
          </div>
        </div>
        <div class="flex items-center gap-8 mt-16">
          <div class="spinner"></div>
          <span class="text-dim waiting-dots">Waiting for your friend to join</span>
        </div>
        <button class="btn btn--ghost btn--sm mt-16" data-action="cancel" type="button">Cancel</button>
      </div>
    `;
    if (navigator.share) {
      container.querySelector('[data-action="share"]').classList.remove('hidden');
    }
  }

  function renderPlay() {
    const room = client.room;
    const myIndex = client.myIndex;
    const status = room.status === 'active' && simultaneous && statusForActive
      ? statusForActive(room, myIndex, opponentName(room, myIndex))
      : defaultStatus(room, myIndex, opponentName(room, myIndex));

    const finished = room.status === 'finished';
    const iVoted = !!(room.rematchVotes && room.rematchVotes[myIndex]);
    const theyVoted = !!(room.rematchVotes && room.rematchVotes[1 - myIndex]);
    const rematchLabel = iVoted ? 'Waiting for opponent…' : theyVoted ? 'Friend wants a rematch — Accept' : 'Rematch';

    container.innerHTML = `
      <h1 class="game-page__title">${titleIcon}${escapeHtml(gameName)}</h1>
      <div class="scoreboard">
        ${playerPill(room, 0, myIndex)}
        <span class="scoreboard__vs">vs</span>
        ${playerPill(room, 1, myIndex)}
      </div>
      <div class="status-bar status-bar--${status.kind}">${status.text}</div>
      <div class="board-slot"></div>
      ${!finished ? `<div class="text-center mt-16"><button class="btn btn--ghost btn--sm" data-action="forfeit" type="button">Leave game</button></div>` : ''}
      ${finished ? `
        <div class="game-over-panel">
          <div class="game-over-panel__title">${outcomeHeadline(room, myIndex).emoji} ${escapeHtml(outcomeHeadline(room, myIndex).text)}</div>
          <div class="game-over-actions">
            <button class="btn btn--primary" data-action="rematch" type="button" ${iVoted ? 'disabled' : ''}>${rematchLabel}</button>
            <button class="btn btn--secondary" data-action="exit" type="button">Back to lobby</button>
          </div>
        </div>` : ''}
      ${instructionsHtml ? `<div class="instructions">${instructionsHtml}</div>` : ''}
    `;

    const boardEl = container.querySelector('.board-slot');
    const ctx = {
      room,
      state: room.state,
      myIndex,
      isMyTurn: room.status === 'active' && room.turn === myIndex,
      simultaneous,
      sendMove(payload) {
        return client.sendAction('move', payload).catch((err) => {
          showToast(err.message || 'That move was rejected');
          client.poll().catch(() => {});
        });
      },
    };
    renderBoard(boardEl, ctx);
  }

  function render() {
    if (destroyed) return;
    if (phase === 'lobby') return renderLobby();
    if (phase === 'waiting') return renderWaiting();
    if (phase === 'play') return renderPlay();
    container.innerHTML = `<div class="game-loading">Connecting&hellip;</div>`;
  }

  function onRoomUpdate(evt) {
    const room = evt.detail;
    const key = `${room.status}:${room.version}`;
    if (key === lastRenderKey) return;
    lastRenderKey = key;
    phase = room.status === 'waiting' ? 'waiting' : 'play';
    lastError = '';
    render();
  }

  client.addEventListener('update', onRoomUpdate);
  client.addEventListener('closed', () => {
    if (destroyed) return;
    lastError = 'That room is no longer available. Start a new one below.';
    phase = 'lobby';
    lastRenderKey = null;
    render();
  });

  function returnToLobby() {
    client.leaveRoom();
    client.forgetRoom();
    lastRenderKey = null;
    phase = 'lobby';
    render();
  }

  async function handleCreate() {
    const nameInput = container.querySelector('#player-name');
    const name = nameInput ? nameInput.value.trim() : '';
    if (name) setDisplayName(name);
    try {
      lastError = '';
      await client.create(name);
    } catch (err) {
      lastError = err.message || 'Could not create a room right now.';
      render();
    }
  }

  async function handleJoin(code) {
    const nameInput = container.querySelector('#player-name');
    const name = nameInput ? nameInput.value.trim() : '';
    if (name) setDisplayName(name);
    if (!code) {
      lastError = 'Enter a room code first.';
      render();
      return;
    }
    try {
      lastError = '';
      await client.join(code, name);
    } catch (err) {
      lastError = err.message || 'Could not join that room.';
      joinPrefill = code;
      render();
    }
  }

  container.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'create') handleCreate();
    else if (action === 'cancel') returnToLobby();
    else if (action === 'exit') returnToLobby();
    else if (action === 'copy-code') {
      navigator.clipboard?.writeText(client.code).then(() => showToast('Code copied!'));
    } else if (action === 'copy-link') {
      navigator.clipboard?.writeText(inviteLink()).then(() => showToast('Invite link copied!'));
    } else if (action === 'share') {
      navigator.share?.({ title: 'DittoGames', text: `Play ${gameName} with me on DittoGames! Code: ${client.code}`, url: inviteLink() }).catch(() => {});
    } else if (action === 'rematch') {
      client.sendAction('rematch').catch((err) => showToast(err.message || 'Could not start a rematch'));
    } else if (action === 'forfeit') {
      if (confirm('Leave this game? Your friend will win by forfeit.')) {
        client.sendAction('leave').catch((err) => showToast(err.message || 'Could not leave the game'));
      }
    }
  });

  container.addEventListener('submit', (event) => {
    const form = event.target.closest('form[data-form="join"]');
    if (!form) return;
    event.preventDefault();
    const code = new FormData(form).get('code')?.toString().trim().toUpperCase() || '';
    handleJoin(code);
  });

  (async function init() {
    const saved = client.loadSaved();
    const deepLinkJoin = params.get('join');
    if (saved) {
      try {
        await client.resume(saved);
        return;
      } catch {
        // fall through to lobby / deep link below
      }
    }
    if (deepLinkJoin) {
      phase = 'lobby';
      render();
      handleJoin(deepLinkJoin.toUpperCase().slice(0, 5));
      return;
    }
    phase = 'lobby';
    render();
  })();

  return function cleanup() {
    destroyed = true;
    client.destroy();
  };
}

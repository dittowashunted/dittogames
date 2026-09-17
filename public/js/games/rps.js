import { mountOnlineGame } from '../online-shell.js';

const EMOJI = { rock: '✊', paper: '✋', scissors: '✌️' };
const CHOICES = ['rock', 'paper', 'scissors'];

function statusForActive(room, myIndex, opponentName) {
  const state = room.state;
  const iPicked = state.picks[myIndex] !== null;
  const theyPicked = state.opponentLockedIn;
  if (iPicked) return { text: `Waiting for ${opponentName}…`, kind: 'wait' };
  if (theyPicked) return { text: `${opponentName} has chosen — your move!`, kind: 'you' };
  return { text: 'Choose rock, paper, or scissors', kind: 'you' };
}

function slotEmoji(state, myIndex, picked, wantMine) {
  if (picked) return '✅';
  if (state.lastRound) {
    const mine = myIndex === 0 ? state.lastRound.p1 : state.lastRound.p2;
    const theirs = myIndex === 0 ? state.lastRound.p2 : state.lastRound.p1;
    return EMOJI[wantMine ? mine : theirs];
  }
  return '❔';
}

function renderBoard(boardEl, ctx) {
  const { state, room, myIndex, sendMove } = ctx;
  const canPick = room.status === 'active' && state.picks[myIndex] === null;

  const wrap = document.createElement('div');

  const meta = document.createElement('p');
  meta.className = 'text-center text-dim';
  meta.textContent = `Round ${state.round} · First to ${state.matchTarget} wins the match`;
  wrap.appendChild(meta);

  const arena = document.createElement('div');
  arena.className = 'rps-arena';

  const mySlot = document.createElement('div');
  mySlot.className = 'rps-slot';
  mySlot.textContent = slotEmoji(state, myIndex, state.picks[myIndex] !== null, true);

  const vs = document.createElement('div');
  vs.className = 'rps-vs';
  vs.textContent = `${state.wins[myIndex]} : ${state.wins[1 - myIndex]}`;

  const oppSlot = document.createElement('div');
  oppSlot.className = 'rps-slot';
  oppSlot.textContent = slotEmoji(state, myIndex, state.opponentLockedIn, false);

  arena.append(mySlot, vs, oppSlot);
  wrap.appendChild(arena);

  const choices = document.createElement('div');
  choices.className = 'rps-choices';
  CHOICES.forEach((choice) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rps-choice';
    btn.textContent = EMOJI[choice];
    btn.setAttribute('aria-label', choice);
    if (state.picks[myIndex] === choice) btn.dataset.picked = '1';
    btn.disabled = !canPick;
    btn.addEventListener('click', () => sendMove({ choice }));
    choices.appendChild(btn);
  });
  wrap.appendChild(choices);

  if (state.history.length) {
    const hist = document.createElement('div');
    hist.className = 'rps-round-history';
    state.history.slice(-10).forEach((round) => {
      const chip = document.createElement('span');
      chip.className = 'rps-round-chip';
      const result = round.winner === 'draw' ? 'draw' : round.winner === myIndex ? 'win' : 'lose';
      chip.dataset.result = result;
      chip.textContent = result === 'draw' ? '=' : result === 'win' ? 'W' : 'L';
      hist.appendChild(chip);
    });
    wrap.appendChild(hist);
  }

  boardEl.appendChild(wrap);
}

export function mount(container, meta, params) {
  return mountOnlineGame(container, {
    gameId: 'rock-paper-scissors',
    gameName: 'Rock Paper Scissors',
    icon: (meta && meta.icon) || '✊',
    lobbyBlurb: 'Best-of-5 showdown. Lock in your move — reveal happens once you both have.',
    instructionsHtml: '<strong>How to play:</strong> Pick rock, paper, or scissors each round. Your friend can’t see your pick until you both lock one in. First to 3 round wins takes the match.',
    simultaneous: true,
    statusForActive,
    renderBoard,
    params,
  });
}

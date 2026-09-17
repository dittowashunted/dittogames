const CHOICES = ['rock', 'paper', 'scissors'];
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const MATCH_TARGET = 3; // first to 3 round wins takes the match

module.exports = {
  id: 'rock-paper-scissors',
  simultaneous: true,

  createInitialState() {
    return {
      picks: [null, null],
      round: 1,
      wins: [0, 0],
      matchTarget: MATCH_TARGET,
      lastRound: null,
      history: [],
    };
  },

  firstTurn() {
    return null;
  },

  applyMove(state, playerIndex, payload) {
    const choice = payload && payload.choice;
    if (!CHOICES.includes(choice)) throw new Error('Invalid choice');
    if (state.picks[playerIndex] !== null) throw new Error('You already locked in this round');

    const picks = state.picks.slice();
    picks[playerIndex] = choice;

    if (picks[0] === null || picks[1] === null) {
      return { state: { ...state, picks }, turn: null, status: 'active', winner: null };
    }

    let roundWinner = 'draw';
    if (picks[0] !== picks[1]) {
      roundWinner = BEATS[picks[0]] === picks[1] ? 0 : 1;
    }

    const wins = state.wins.slice();
    if (roundWinner === 0 || roundWinner === 1) wins[roundWinner] += 1;

    const lastRound = { p1: picks[0], p2: picks[1], winner: roundWinner };
    const history = [...state.history, lastRound];

    const newState = {
      picks: [null, null],
      round: state.round + 1,
      wins,
      matchTarget: state.matchTarget,
      lastRound,
      history,
    };

    if (wins[0] >= state.matchTarget) {
      return { state: newState, turn: null, status: 'won', winner: 0 };
    }
    if (wins[1] >= state.matchTarget) {
      return { state: newState, turn: null, status: 'won', winner: 1 };
    }
    return { state: newState, turn: null, status: 'active', winner: null };
  },

  sanitizeForPlayer(state, playerIndex) {
    const opponentIndex = 1 - playerIndex;
    const picks = [null, null];
    picks[playerIndex] = state.picks[playerIndex];
    return {
      ...state,
      picks,
      opponentLockedIn: state.picks[opponentIndex] !== null,
    };
  },
};

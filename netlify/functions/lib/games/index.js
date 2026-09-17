const ticTacToe = require('./tictactoe');
const superTicTacToe = require('./supertictactoe');
const connectFour = require('./connectfour');
const rps = require('./rps');
const dotsAndBoxes = require('./dotsandboxes');

const GAMES = {
  'tic-tac-toe': ticTacToe,
  'super-tic-tac-toe': superTicTacToe,
  'connect-four': connectFour,
  'rock-paper-scissors': rps,
  'dots-and-boxes': dotsAndBoxes,
};

function getGameEngine(gameId) {
  return GAMES[gameId] || null;
}

module.exports = { getGameEngine };

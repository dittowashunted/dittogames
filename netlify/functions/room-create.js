const { connectLambda } = require('@netlify/blobs');
const { getRoom, putRoom } = require('./lib/store');
const { generateRoomCode, generateId } = require('./lib/ids');
const { getGameEngine } = require('./lib/games');
const { sanitizeRoom, sanitizeName } = require('./lib/room');
const { json, badRequest, parseBody, serverError } = require('./lib/http');

exports.handler = async (event) => {
  if (event.blobs) connectLambda(event);
  if (event.httpMethod !== 'POST') return badRequest('Use POST');

  const body = parseBody(event);
  if (!body) return badRequest('Invalid JSON body');

  const engine = getGameEngine(body.gameId);
  if (!engine) return badRequest('Unknown game');

  const now = Date.now();
  const playerId = generateId();
  const token = generateId();
  const playerName = sanitizeName(body.name, 'Player 1');

  let code = null;
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateRoomCode();
      const existing = await getRoom(candidate);
      if (!existing) {
        code = candidate;
        break;
      }
    }
    if (!code) return serverError('Could not allocate a room code, please try again');

    const room = {
      code,
      gameId: body.gameId,
      status: 'waiting',
      players: [{ id: playerId, token, name: playerName, joinedAt: now }],
      state: engine.createInitialState(),
      turn: null,
      winner: null,
      version: 1,
      rematchVotes: [false, false],
      createdAt: now,
      updatedAt: now,
    };

    await putRoom(room);

    return json(200, { playerId, token, room: sanitizeRoom(room, engine, 0) });
  } catch (err) {
    console.error('room-create failed', err);
    return serverError();
  }
};

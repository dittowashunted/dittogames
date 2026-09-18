const { connectLambda } = require('@netlify/blobs');
const { getRoom, putRoom, deleteRoom } = require('./lib/store');
const { getGameEngine } = require('./lib/games');
const { isExpired, findPlayer, sanitizeRoom } = require('./lib/room');
const { json, badRequest, notFound, forbidden, gone, conflict, parseBody, serverError } = require('./lib/http');

exports.handler = async (event) => {
  if (event.blobs) connectLambda(event);
  if (event.httpMethod !== 'POST') return badRequest('Use POST');

  const body = parseBody(event);
  if (!body) return badRequest('Invalid JSON body');

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const { playerId, token, type, payload } = body;
  if (!code || !playerId || !token || !type) return badRequest('Missing required fields');

  try {
    const room = await getRoom(code);
    if (!room) return notFound();
    if (isExpired(room)) return gone();

    const { index, error } = findPlayer(room, playerId, token);
    if (error === 'not_found') return notFound('You are not a player in this room');
    if (error === 'bad_token') return forbidden('Invalid credentials for this room');

    const engine = getGameEngine(room.gameId);
    if (!engine) return serverError('Unknown game for this room');

    const now = Date.now();

    if (type === 'move') {
      if (room.status !== 'active') return conflict('This game is not active');
      if (!engine.simultaneous && room.turn !== index) return conflict('Not your turn');

      let result;
      try {
        result = engine.applyMove(room.state, index, payload);
      } catch (moveErr) {
        return badRequest(moveErr.message || 'Invalid move');
      }

      room.state = result.state;
      if (result.status === 'active') {
        room.turn = result.turn;
      } else {
        room.status = 'finished';
        room.winner = result.winner;
        room.turn = null;
        room.rematchVotes = [false, false];
      }
      room.version += 1;
      room.updatedAt = now;
      await putRoom(room);
      return json(200, sanitizeRoom(room, engine, index));
    }

    if (type === 'rematch') {
      if (room.players.length < 2) return conflict('Waiting for an opponent to join');
      if (room.status !== 'finished') return conflict('The current game is still in progress');

      room.rematchVotes[index] = true;
      if (room.rematchVotes.every(Boolean)) {
        room.matchCount = (room.matchCount || 0) + 1;
        room.state = engine.createInitialState();
        room.status = 'active';
        room.winner = null;
        const startIndex = room.matchCount % 2 === 0 ? 0 : 1;
        room.turn = engine.simultaneous ? null : startIndex;
        room.rematchVotes = [false, false];
      }
      room.version += 1;
      room.updatedAt = now;
      await putRoom(room);
      return json(200, sanitizeRoom(room, engine, index));
    }

    if (type === 'leave') {
      if (room.status === 'waiting') {
        await deleteRoom(code);
        return json(200, { left: true, roomClosed: true });
      }
      if (room.status === 'active') {
        room.status = 'finished';
        room.winner = 1 - index;
        room.turn = null;
        room.forfeitedBy = index;
        room.rematchVotes = [false, false];
      }
      room.version += 1;
      room.updatedAt = now;
      await putRoom(room);
      return json(200, sanitizeRoom(room, engine, index));
    }

    return badRequest('Unknown action type');
  } catch (err) {
    console.error('room-action failed', err);
    return serverError();
  }
};

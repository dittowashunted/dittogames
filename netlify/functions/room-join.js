const { connectLambda } = require('@netlify/blobs');
const { getRoom, putRoom } = require('./lib/store');
const { generateId } = require('./lib/ids');
const { getGameEngine } = require('./lib/games');
const { isExpired, sanitizeRoom, sanitizeName } = require('./lib/room');
const { json, badRequest, notFound, gone, conflict, parseBody, serverError } = require('./lib/http');

exports.handler = async (event) => {
  if (event.blobs) connectLambda(event);
  if (event.httpMethod !== 'POST') return badRequest('Use POST');

  const body = parseBody(event);
  if (!body) return badRequest('Invalid JSON body');

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!code) return badRequest('Missing room code');

  try {
    const room = await getRoom(code);
    if (!room) return notFound('No room with that code');
    if (isExpired(room)) return gone();

    const engine = getGameEngine(room.gameId);
    if (!engine) return serverError('Unknown game for this room');

    if (room.status !== 'waiting') return conflict('That room has already started');
    if (room.players.length >= 2) return conflict('That room is full');

    const playerId = generateId();
    const token = generateId();
    const playerName = sanitizeName(body.name, 'Player 2');
    const now = Date.now();

    room.players.push({ id: playerId, token, name: playerName, joinedAt: now });
    room.status = 'active';
    room.turn = engine.firstTurn();
    room.version += 1;
    room.updatedAt = now;

    await putRoom(room);

    return json(200, { playerId, token, room: sanitizeRoom(room, engine, 1) });
  } catch (err) {
    console.error('room-join failed', err);
    return serverError();
  }
};
